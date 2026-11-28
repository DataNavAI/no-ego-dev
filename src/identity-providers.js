import {IdentityError} from './identity-errors.js';
import {createGithubCliAuth} from './github-cli-auth.js';
export {IdentityError} from './identity-errors.js';
const deviceGrant = 'urn:ietf:params:oauth:grant-type:device_code';
const awsRegion = /^[a-z]{2}(?:-[a-z]+)+-[1-9][0-9]?$/;
const awsPortals = [
  /^https:\/\/[a-z0-9-]{1,63}\.awsapps\.com\/start\/?$/,
  /^https:\/\/ssoins-[a-z0-9]{1,48}\.portal\.[a-z0-9-]{1,30}\.app\.aws\/?$/,
  /^https:\/\/ssoins-[a-z0-9]{1,48}\.[a-z0-9-]{1,30}\.portal\.amazonaws\.com\/?$/,
];
const domainName = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,62}$/;
export const providers = ['github', 'aws', 'godaddy'];


function requireInput(condition, message) {
  if (!condition) throw new IdentityError('invalid_input', message);
}

function verified(condition) {
  if (!condition) throw new IdentityError('verification_failed', 'The provider could not verify the selected identity.', 422);
}

function providerExpiry(seconds, clock) {
  verified(Number.isSafeInteger(seconds) && seconds > 0 && seconds <= 31_536_000);
  return clock() + seconds * 1000;
}

function retryInterval(seconds = 5) {
  verified(Number.isSafeInteger(seconds) && seconds > 0 && seconds <= 120);
  return seconds * 1000;
}

function bearer(token) {
  return {Authorization: `Bearer ${token}`};
}

function tokenString(value) {
  return typeof value === 'string' && /^[!-~]{1,8192}$/.test(value);
}

export function createIdentityProviders({fetch: request = fetch, clock = Date.now, githubClientId = process.env.NED_GITHUB_APP_CLIENT_ID,home,env=process.env,githubCliFactory=createGithubCliAuth} = {}) {
  let githubCli;
  const cli=()=>githubCli??=githubCliFactory({home,env,clock});
  async function json(url, {headers, body, form} = {}) {
    const response = await request(url, {
      method: body || form ? 'POST' : 'GET',
      headers: {Accept: 'application/json', ...(body && {'Content-Type': 'application/json'}), ...headers},
      body: body ? JSON.stringify(body) : form ? new URLSearchParams(form) : undefined,
      redirect: 'error',
      signal: AbortSignal.timeout(4000),
    });
    const data = await response.json();
    return {ok: response.ok, data};
  }

  function device(input, allowed, limit) {
    const {url, userCode, deviceCode, interval, expiresIn} = input;
    verified(allowed(url) && typeof userCode === 'string' && /^[A-Za-z0-9 -]{4,24}$/.test(userCode) && tokenString(deviceCode));
    return {
      url, userCode, deviceCode, interval: retryInterval(interval),
      expiresAt: Math.min(limit, providerExpiry(expiresIn, clock)),
    };
  }

  function wait(data) {
    const error = data.error;
    if (error === 'authorization_pending') return 'pending';
    if (error === 'slow_down') return 'slow';
    if (error === 'access_denied') throw new IdentityError('denied', 'Authorization was declined.', 422);
    if (error === 'expired_token') throw new IdentityError('expired', 'The sign-in code expired. Start again.', 410);
    return null;
  }

  async function githubStart(input, limit, context={}) {
    requireInput(typeof input.login === 'string' && /^[a-z0-9](?:[a-z0-9-]{0,38})$/i.test(input.login), 'Enter the GitHub username you want NED to use.');
    if(!githubClientId)return cli().start(input,limit,context.requestId);
    if (!githubClientId || !/^[a-zA-Z0-9_]{4,100}$/.test(githubClientId))
      throw new IdentityError('not_configured', 'Configure a device-enabled GitHub App client ID on this NED instance.', 503);
    const {ok, data} = await json('https://github.com/login/device/code', {form: {client_id: githubClientId}});
    verified(ok);
    return {
      ...device({url: data.verification_uri, userCode: data.user_code, deviceCode: data.device_code,
        interval: data.interval, expiresIn: data.expires_in}, url => url === 'https://github.com/login/device', limit),
      login: input.login,
    };
  }

  async function githubPoll(state) {
    if(state.method==='gh-cli')return cli().poll(state);
    const {ok, data} = await json('https://github.com/login/oauth/access_token', {
      form: {client_id: githubClientId, device_code: state.deviceCode, grant_type: deviceGrant},
    });
    const pending = wait(data);
    if (pending) return pending;
    verified(ok && tokenString(data.access_token) && Number.isSafeInteger(data.expires_in));
    const user = await json('https://api.github.com/user', {headers: bearer(data.access_token)});
    verified(user.ok && typeof user.data.login === 'string' && user.data.login.toLowerCase() === state.login.toLowerCase()
      && Number.isSafeInteger(user.data.id) && user.data.id > 0);
    return {
      identity: {login: user.data.login, id: user.data.id},
      expiresAt: providerExpiry(data.expires_in, clock),
      token: data.access_token,
    };
  }

  function awsHosts(region) {
    return {oidc: `https://oidc.${region}.amazonaws.com`, portal: `https://portal.sso.${region}.amazonaws.com`};
  }

  async function awsStart(input, limit) {
    const {region, startUrl, account, role} = input;
    requireInput(typeof region === 'string' && awsRegion.test(region) && !region.startsWith('cn-')
      && !region.startsWith('us-gov-') && !region.startsWith('us-iso'), 'Enter the commercial AWS Identity Center region.');
    requireInput(typeof startUrl === 'string' && awsPortals.some(pattern => pattern.test(startUrl)),
      'Enter the official AWS IAM Identity Center access portal URL.');
    requireInput(typeof account === 'string' && /^\d{12}$/.test(account)
      && typeof role === 'string' && /^[A-Za-z0-9_+=,.@-]{1,64}$/.test(role), 'Enter the assigned AWS account ID and role name.');
    const {oidc} = awsHosts(region);
    const registration = await json(oidc + '/client/register', {body: {
      clientName: 'NED', clientType: 'public', scopes: ['sso:account:access'], grantTypes: [deviceGrant],
    }});
    const {clientId, clientSecret} = registration.data;
    verified(registration.ok && tokenString(clientId) && tokenString(clientSecret));
    const {ok, data} = await json(oidc + '/device_authorization', {body: {clientId, clientSecret, startUrl}});
    verified(ok);
    const allowed = url => typeof url === 'string' && [
      `https://device.sso.${region}.amazonaws.com`, `https://device.sso.${region}.api.aws`, startUrl.replace(/\/$/, ''),
    ].includes(url.replace(/\/$/, ''));
    return {
      ...device({url: data.verificationUri, userCode: data.userCode, deviceCode: data.deviceCode,
        interval: data.interval, expiresIn: data.expiresIn}, allowed, limit),
      clientId, clientSecret, region, account, role,
    };
  }

  async function awsCredentials({token, identity: {account, role, region}}) {
    const url = awsHosts(region).portal + '/federation/credentials?' + new URLSearchParams({account_id: account, role_name: role});
    const {ok, data} = await json(url, {headers: {'x-amz-sso_bearer_token': token}});
    const c = data.roleCredentials;
    verified(ok && c && [c.accessKeyId, c.secretAccessKey, c.sessionToken].every(tokenString)
      && Number.isSafeInteger(c.expiration) && c.expiration > clock());
    return {AWS_ACCESS_KEY_ID: c.accessKeyId, AWS_SECRET_ACCESS_KEY: c.secretAccessKey,
      AWS_SESSION_TOKEN: c.sessionToken, AWS_REGION: region, AWS_DEFAULT_REGION: region};
  }

  async function awsPoll(state) {
    const {clientId, clientSecret, deviceCode, region, account, role} = state;
    const {ok, data} = await json(awsHosts(region).oidc + '/token', {body: {clientId, clientSecret, deviceCode, grantType: deviceGrant}});
    const pending = wait(data);
    if (pending) return pending;
    verified(ok && tokenString(data.accessToken));
    const connection = {identity: {account, role, region}, expiresAt: providerExpiry(data.expiresIn, clock), token: data.accessToken};
    await awsCredentials(connection);
    return connection;
  }

  async function domain(connection) {
    const {identity: {domain}, token} = connection;
    const result = await json(`https://api.godaddy.com/v3/domains/domain-names/${encodeURIComponent(domain)}`, {headers: bearer(token)});
    verified(result.ok && typeof result.data.domain === 'string' && result.data.domain.toLowerCase() === domain);
    return {domain};
  }

  async function godaddy(input) {
    const name = typeof input.domain === 'string' ? input.domain.trim().toLowerCase() : '';
    requireInput(domainName.test(name) && tokenString(input.token), 'Enter the managed domain and a scoped GoDaddy personal access token.');
    const connection = {identity: {domain: name}, token: input.token, expiresAt: null};
    await domain(connection);
    return connection;
  }

  return {start: {github: githubStart, aws: awsStart, godaddy}, poll: {github: githubPoll, aws: awsPoll}, awsCredentials, domain,cancel:(provider,id)=>{if(provider==='github')githubCli?.cancel(id);},isBusy:()=>githubCli?.isBusy()===true,initialize:()=>!githubClientId?cli().initialize():Promise.resolve(),close:()=>githubCli?.close()};
}
