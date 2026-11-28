import {loadApiCredential} from '../apps/core/src/auth.js';
import {spawn} from 'node:child_process';
import {mkdtemp, rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createIdentityProviders, IdentityError, providers} from './identity-providers.js';
import {containerAwsIdentityAllowed, createIdentityStore, identityStatus, nativeIdentityAllowed, requireConnection} from './identity-store.js';

const usage = [
  'Usage: ned identity connect <github|aws|godaddy> --url <private-loopback-COM-origin>',
  '       ned identity connect <github|aws> (Hub-registered standalone container)',
  '       ned identity status [github|aws|godaddy]',
  '       ned identity exec <github|aws> -- <gh|aws> <arguments>',
  '       ned identity domain',
].join('\n');
const programs = {github: 'gh', aws: 'aws'};
const blockedAwsCommands = new Set(['configure', 'login', 'logout', 'sso', 'sso-oidc']);
const awsAuthorityFlags = ['profile', 'endpoint-url', 'no-verify-ssl', 'ca-bundle', 'no-sign-request', 'debug', 'cli-auto-prompt'];

function unsafeFlag(provider, arg) {
  if (provider === 'github') return /^(?:--(?:hostname|header|verbose)(?:=|$)|-H)/.test(arg);
  const flag = /^--([^=]+)/.exec(arg)?.[1];
  return flag && awsAuthorityFlags.some(blocked => blocked.startsWith(flag));
}

function localOrigin(value) {
  const match = /^http:\/\/127\.0\.0\.1:([1-9]\d{0,4})\/?$/.exec(value);
  if (!match || Number(match[1]) > 65535) throw new IdentityError('invalid_url', 'Use the private 127.0.0.1 URL printed by ned com.');
  return `http://127.0.0.1:${match[1]}`;
}

async function requestConnection(provider, url, request, credentials, receipt) {
  const origin = localOrigin(url);
  const response = await request(`${origin}/api/v1/identity/${provider}/request`, {
    method: 'POST', headers: {Origin: origin, Authorization: 'Bearer ' + loadApiCredential(credentials), 'X-NED-Identity': '1'}, redirect: 'error',
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new IdentityError('com_unavailable', 'Open a private native NEDCOM instance and try again.');
  if (receipt) {
    const result = await response.json();
    const id = result.request?.id;
    const expires = result.request?.expiresAt;
    if (result.provider !== provider || typeof id !== 'string' || !/^[a-f0-9-]{36}$/.test(id) || !Number.isSafeInteger(expires))
      throw new IdentityError('com_unavailable', 'NED could not verify the authorization request.');
    return {success:true,action:'request_provider_auth',provider,request_id:id,expires_at:new Date(expires).toISOString()};
  }
  return {provider, status: 'requested', settings: origin};
}

async function execute(provider, command, args, {store, adapters, clock, launch, env}) {
  if (command !== programs[provider] || !args.length || !/^[a-z][a-z0-9-]*$/.test(args[0]) || (provider === 'aws' && blockedAwsCommands.has(args[0]))
    || (provider === 'github' && (args[0] !== 'api' || !/^[a-zA-Z0-9_][a-zA-Z0-9_./?%=&+-]*$/.test(args[1] || '')))
    || args.some(arg => unsafeFlag(provider, arg))) {
    throw new IdentityError('unsupported_command', 'Use a supported gh or aws command for the connected provider.');
  }
  const connection = requireConnection(store, provider, clock);
  const auth = provider === 'github' ? {GH_TOKEN: connection.token} : await adapters.awsCredentials(connection);
  const home = await mkdtemp(join(tmpdir(), 'ned-identity-'));
  try {
    return await new Promise((resolve, reject) => {
      const child = launch(command, args, {
        stdio: 'inherit',
        env: {
          HOME: home, USERPROFILE: home, PATH: env.PATH, LANG: env.LANG || 'C.UTF-8',
          XDG_CONFIG_HOME: home, GH_CONFIG_DIR: home, GH_HOST: 'github.com', GH_PROMPT_DISABLED: '1',
          AWS_CONFIG_FILE: join(home, 'config'), AWS_SHARED_CREDENTIALS_FILE: join(home, 'credentials'),
          AWS_EC2_METADATA_DISABLED: 'true', AWS_PAGER: '', AWS_CLI_AUTO_PROMPT: 'off',
          ...auth,
        },
      });
      child.once('error', reject);
      child.once('close', code => resolve(code ?? 1));
    });
  } finally {await rm(home, {recursive: true, force: true});}
}

export async function runIdentityCli(args, io, dependencies = {}) {
  const receipt = args[0] === 'connect' && args.at(-1) === '--receipt';
  if (receipt) args = args.slice(0,-1);
  const [action, provider, separator, command, ...rest] = args;
  const clock = dependencies.identityOptions?.clock || Date.now;
  const request = dependencies.identityOptions?.fetch || fetch;
  try {
    if (args.length === 0 || (args.length === 1 && ['--help', '-h'].includes(action))) {
      io.log(usage);
      return 0;
    }
    const container = containerAwsIdentityAllowed(dependencies.env);
    const allowedProviders = container ? ['aws','github'] : providers;
    if (container && action === 'connect' && allowedProviders.includes(provider) && args.length === 2) {
      io.log(JSON.stringify(await requestConnection(provider, 'http://127.0.0.1:8787', request, dependencies, receipt)));
      return 0;
    }
    if (!container && !nativeIdentityAllowed(dependencies.env))
      throw new IdentityError('identity_disabled', 'Provider connections are unavailable in this NED environment.');
    if (action === 'connect' && !container && args.length === 4 && allowedProviders.includes(provider) && separator === '--url') {
      io.log(JSON.stringify(await requestConnection(provider, command, request, dependencies, receipt)));
      return 0;
    }
    if (action === 'status' && args.length <= 2 && (!provider || allowedProviders.includes(provider))) {
      const store = createIdentityStore(dependencies.home, dependencies.env);
      io.log(JSON.stringify({connections: (provider ? [provider] : allowedProviders).map(name => ({
        provider: name, ...identityStatus(store.get(name), clock),
      }))}));
      return 0;
    }
    const domain = !container && action === 'domain' && args.length === 1;
    const exec = action === 'exec' && allowedProviders.includes(provider) && provider !== 'godaddy' && separator === '--';
    if (domain || exec) {
      const store = createIdentityStore(dependencies.home, dependencies.env);
      const adapters = createIdentityProviders(dependencies.identityOptions);
      if (domain) {
        io.log(JSON.stringify(await adapters.domain(requireConnection(store, 'godaddy', clock))));
        return 0;
      }
      return await execute(provider, command, rest, {store, adapters, clock,
        launch: dependencies.identityOptions?.spawn || spawn, env: process.env});
    }
    io.error(usage);
    return 2;
  } catch (error) {
    io.error(error instanceof IdentityError ? error.message : 'Provider connection is unavailable. Check NEDCOM or reconnect in Settings.');
    return 1;
  }
}
