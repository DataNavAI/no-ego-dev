import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {EventEmitter} from 'node:events';
import {createCommunicatorServer, fetch as authenticatedFetch} from '../../ned-api/tests/auth-client.js';
import {exposeNedApiPath} from '../../../../apps/core/src/api-paths.js';
import {runCli} from '../../../../src/cli.js';

const secrets = ['mock-gh-credential', 'mock-private-device', 'mock-aws-session', 'mock-role-secret', 'mock-godaddy-token'];
const aws = {startUrl: 'https://example.awsapps.com/start', region: 'us-west-2', account: '123456789012', role: 'Observer'};
const codes = {user_code: 'TEST-CODE', interval: 5, expires_in: 900, device_code: secrets[1], verification_uri: 'https://github.com/login/device'};

async function setup(t) {
  const home = await mkdtemp(join(tmpdir(), 'ned-identity-test-'));
  t.after(() => rm(home, {recursive: true, force: true}));
  let now = 1_000_000;
  let login = 'test-owner';
  let releaseDomain;
  let pollCount = 0;
  const providerHttp = async (url, options) => {
    assert.equal(options.redirect, 'error');
    if (url.endsWith('/login/device/code')) {
      assert.equal(options.body.get('client_id'), 'Iv1_testapp');
      return Response.json(codes);
    }
    if (url.endsWith('/login/oauth/access_token')) {
      pollCount++;
      return Response.json({access_token: secrets[0], expires_in: 3600});
    }
    if (url === 'https://api.github.com/user') {
      assert.equal(options.headers.Authorization, 'Bearer ' + secrets[0]);
      return Response.json({login, id: 12});
    }
    if (url.endsWith('/client/register')) return Response.json({clientId: 'test-client', clientSecret: 'mock-app-registration'});
    if (url.endsWith('/device_authorization')) {
      assert.equal(JSON.parse(options.body).startUrl, aws.startUrl);
      return Response.json({deviceCode: secrets[1], userCode: 'TEST-CODE',
        verificationUri: 'https://device.sso.us-west-2.amazonaws.com/', expiresIn: 400});
    }
    if (url.endsWith('/token')) return Response.json({accessToken: secrets[2], expiresIn: 3600});
    if (url.startsWith('https://portal.sso.us-west-2.amazonaws.com/federation/credentials?')) {
      const params = new URL(url).searchParams;
      if (params.get('role_name') !== aws.role || params.get('account_id') !== aws.account) return Response.json({}, {status: 403});
      assert.equal(options.headers['x-amz-sso_bearer_token'], secrets[2]);
      return Response.json({roleCredentials: {
        accessKeyId: 'mock-role-id', secretAccessKey: secrets[3], sessionToken: 'mock-role-session', expiration: now + 1000,
      }});
    }
    if (url === 'https://api.godaddy.com/v3/domains/domain-names/example.test') {
      if (releaseDomain) await releaseDomain;
      if (options.headers.Authorization !== 'Bearer ' + secrets[4]) return Response.json({}, {status: 401});
      return Response.json({domain: 'example.test'});
    }
    return Response.json({}, {status: 404});
  };
  const spawned = [];
  const identityOptions = {
    fetch: providerHttp, githubClientId: 'Iv1_testapp', clock: () => now,
    spawn(command, args, options) {
      spawned.push({command, args, env: options.env});
      const child = new EventEmitter();
      queueMicrotask(() => child.emit('close', 0));
      return child;
    },
  };
  async function makeApp(options) {
    const app = createCommunicatorServer({home, databasePath: join(home, 'test.sqlite'), identityOptions, ...options});
    await app.listen();
    t.after(() => app.close());
    return app;
  }
  const app = await makeApp();
  const observed = new Map();
  async function api(path = '', {payload, origin = app.url, extra, target = app} = {}) {
    const [, name, action] = path.split('/');
    const key = target.url + '/' + name;
    const previous = observed.get(key);
    const id = action === 'disconnect' ? previous?.connectionId : previous?.request?.id;
    const response = await authenticatedFetch(target.url + '/api/v1/identity' + path, {
      method: path ? 'POST' : 'GET',
      headers: {Origin: origin, 'X-NED-Identity': '1', ...(id && {'X-NED-Identity-Id': id}), ...(payload && {'Content-Type': 'application/json'}), ...extra},
      ...(payload && {body: JSON.stringify(payload)}),
    });
    const raw = await response.text();
    assert.equal(response.headers.get('cache-control'), 'no-store');
    for (const secret of secrets) assert.ok(!raw.includes(secret));
    const body = JSON.parse(raw);
    if (response.ok && body.provider) observed.set(key, body);
    if (response.ok && body.connections) {
      for (const connection of body.connections) observed.set(target.url + '/' + connection.provider, connection);
    }
    return {status: response.status, body};
  }
  async function cli(args, options) {
    const output = [];
    const code = await runCli(['identity', ...args], {log: text => output.push(text), error: text => output.push(text)},
      {home, identityOptions: {...identityOptions, fetch: String(args[0]) === 'connect' ? fetch : providerHttp}, ...options});
    const raw = output.join('\n');
    for (const secret of secrets) assert.ok(!raw.includes(secret));
    return {code, raw};
  }
  return {home, app, api, cli, makeApp, spawned, pollCount: () => pollCount, advance: value => {now += value;},
    changeLogin: value => {login = value;}, holdDomain: gate => {releaseDomain = gate;}};
}

test('TC-001: CLI requests, COM verifies three providers, and isolated use requires explicit confirmation', async t => {
  const f = await setup(t);
  for (const [provider, payload, expectation] of [
    ['github', {login: 'test-owner'}, {login: 'test-owner', id: 12}],
    ['aws', aws, {account: aws.account, role: aws.role, region: aws.region}],
    ['godaddy', {domain: 'Example.TEST', token: secrets[4]}, {domain: 'example.test'}],
  ]) {
    const request = await f.cli(['connect', provider, '--url', f.app.url]);
    assert.deepEqual(JSON.parse(request.raw), {provider, status: 'requested', settings: f.app.url});
    await f.api();
    assert.equal((await f.api(`/${provider}/confirm`)).status, 409);
    const started = await f.api(`/${provider}/start`, {payload});
    assert.equal(started.status, 200);
    assert.equal(started.body.request.state, provider === 'godaddy' ? 'confirm' : 'sign_in');
    if (provider !== 'godaddy') {
      const early = await f.api(`/${provider}/poll`);
      assert.equal(early.body.request.state, 'sign_in');
      f.advance(5000);
      const poll = await f.api(`/${provider}/poll`);
      assert.deepEqual(poll.body.request.identity, expectation);
    }
    assert.equal(JSON.parse((await f.cli(['status', provider])).raw).connections[0].status, 'disconnected');
    const confirmed = await f.api(`/${provider}/confirm`);
    assert.equal(confirmed.body.request, null);
    assert.deepEqual(confirmed.body.identity, expectation);
  }
  const secretsPage = await authenticatedFetch(f.app.url + '/api/v1/secrets', {headers: {'X-NED-Secrets': '1'}});
  assert.deepEqual(await secretsPage.json(), {secrets: []});
  assert.equal(f.pollCount(), 1);
  assert.equal((await f.cli(['exec', 'github', '--', 'gh', 'api', 'user'])).code, 0);
  assert.equal((await f.cli(['exec', 'aws', '--', 'aws', 'sts', 'get-caller-identity'])).code, 0);
  assert.equal(f.spawned[0].env.GH_TOKEN, secrets[0]);
  assert.equal(f.spawned[0].env.AWS_SESSION_TOKEN, undefined);
  assert.equal(f.spawned[1].env.GH_TOKEN, undefined);
  assert.equal(f.spawned[1].env.AWS_SECRET_ACCESS_KEY, secrets[3]);
  assert.deepEqual(JSON.parse((await f.cli(['domain'])).raw), {domain: 'example.test'});
  assert.equal((await f.cli(['exec', 'github', '--', 'gh', 'auth', 'token'])).code, 1);
  for (const flag of ['--endpoint-url=https://example.test', '--endp=https://example.test', '--deb', '--ca-bundle=/tmp/ca']) {
    assert.equal((await f.cli(['exec', 'aws', '--', 'aws', 'sts', 'get-caller-identity', flag])).code, 1);
  }
  assert.equal((await f.cli(['exec', 'github', '--', 'gh', 'api', 'user', '--verbose'])).code, 1);
  assert.equal(f.spawned.length, 2);
  const stage = await f.makeApp({env: {HERMES_PROFILE: 'ned-staging'}});
  assert.equal((await f.api('', {target: stage, origin: stage.url})).body.error.code, 'identity_disabled');
  assert.equal((await f.cli(['status', 'github'], {env: {HERMES_PROFILE: 'ned-staging'}})).code, 1);
  assert.equal((await f.cli(['domain'], {env: {HERMES_PROFILE: 'ned-staging'}})).code, 1);
  const restart = await f.makeApp();
  assert.deepEqual((await f.api('', {target: restart, origin: restart.url})).body.connections.map(c => c.status),
    ['connected', 'connected', 'connected']);
  const other = await setup(t);
  assert.equal(JSON.parse((await other.cli(['status', 'github'])).raw).connections[0].status, 'disconnected');
  f.advance(3_600_001);
  assert.equal((await f.cli(['exec', 'aws', '--', 'aws', 'sts', 'get-caller-identity'])).code, 1);
  await f.api('/godaddy/disconnect');
  assert.equal((await f.cli(['domain'])).code, 1);
});

test('TC-001: malformed requests, changed identities, expiry and late provider replies fail closed', async t => {
  const f = await setup(t);
  const anonymous = await fetch(f.app.url + '/api/v1/identity/github/request', {
    method: 'POST', headers: {Origin: f.app.url, 'X-NED-Identity': '1'},
  });
  assert.equal(anonymous.status, 401);
  for (const path of ['/api/identity', '/api/v1/identity/github/request', '/api/v1/%69dentity']) {
    assert.equal(exposeNedApiPath(path), false);
  }
  const publicMode = await f.makeApp({secretsEnabled: false});
  const container = await f.makeApp({identityEnabled: false});
  const stagingEnv = {HERMES_PROFILE: 'ned-staging'};
  const isolatedStaging = await f.makeApp({env: stagingEnv});
  for (const app of [publicMode, container, isolatedStaging]) {
    assert.equal((await f.api('/github/request', {target: app, origin: app.url})).body.error.code, 'identity_disabled');
  }
  assert.equal((await f.api('/github/request', {origin: 'https://outside.test'})).status, 403);
  assert.equal((await f.api('/github/request', {extra: {'Sec-Fetch-Site': 'cross-site'}})).status, 403);
  assert.equal((await f.api('/unknown/request')).status, 404);
  assert.equal((await f.cli(['connect', 'github', '--url', 'https://outside.test'])).code, 1);
  const first = await f.api('/github/request');
  assert.deepEqual(await f.api('/github/request'), first);
  await f.api('/github/start', {payload: {login: 'test-owner'}});
  f.advance(5000);
  f.changeLogin('different-owner');
  assert.equal((await f.api('/github/poll')).status, 422);
  assert.equal((await f.api('/github/confirm')).status, 409);
  await f.api('/github/request');
  f.advance(600_001);
  assert.equal((await f.api('/github/start', {payload: {login: 'test-owner'}})).status, 409);

  await f.api('/godaddy/request');
  assert.equal((await f.api('/godaddy/start', {payload: {domain: 'example.test', token: 'wrong'}})).status, 422);
  assert.equal((await f.api('/godaddy/confirm')).status, 409);
  await f.api('/godaddy/request');
  let ready, release;
  const seen = new Promise(resolve => {ready = resolve;});
  const gate = new Promise(resolve => {release = resolve;});
  f.holdDomain({then(resolve) {ready(); return gate.then(resolve);}});
  const verify = f.api('/godaddy/start', {payload: {domain: 'example.test', token: secrets[4]}});
  await seen;
  await f.api('/godaddy/cancel');
  release();
  assert.equal((await verify).status, 409);
  assert.equal((await f.api('/godaddy/confirm')).status, 409);
  assert.equal((await f.cli(['domain'])).code, 1);
});

test('TC-001: a stale tab or a second COM process cannot replace or disconnect a newer grant', async t => {
  const f = await setup(t);
  const second = await f.makeApp();
  const context = {target: second, origin: second.url};
  const validity = {payload: {domain: 'example.test', token: secrets[4]}};
  const stale = await f.api('/godaddy/request');
  await f.api('/godaddy/cancel');
  await f.api('/godaddy/request');
  await f.api('/godaddy/start', validity);
  const oldRequest = {'X-NED-Identity-Id': stale.body.request.id};
  assert.equal((await f.api('/godaddy/confirm', {extra: oldRequest})).status, 409);

  await f.api('/godaddy/request', context);
  await f.api('/godaddy/start', {...context, ...validity});
  const saved = await f.api('/godaddy/confirm');
  assert.equal(saved.status, 200);
  assert.equal((await f.api('/godaddy/confirm', context)).status, 409);
  assert.equal((await f.api('', context)).body.connections.find(c => c.provider === 'godaddy').connectionId, saved.body.connectionId);

  await f.api('/godaddy/request', context);
  await f.api('/godaddy/start', {...context, ...validity});
  const replacement = await f.api('/godaddy/confirm', context);
  assert.notEqual(replacement.body.connectionId, saved.body.connectionId);
  assert.equal((await f.api('/godaddy/disconnect')).status, 409);
  assert.equal((await f.cli(['domain'])).code, 0);
});
