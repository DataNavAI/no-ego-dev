import assert from 'node:assert/strict';
import { chmod, lstat, mkdtemp, mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  CHATGPT_DEVICE_URL,
  authorizeOpenAICodex,
  resolveSafeHermesCodexCredential,
} from '../../src/auth/openai-codex.js';

function jwtWithExpiry(exp) {
  const body = Buffer.from(JSON.stringify({ exp })).toString('base64url');
  return `header.${body}.signature`;
}

function authStore(accessToken, refreshToken = 'synthetic-refresh-token') {
  return {
    version: 1,
    active_provider: 'openai-codex',
    providers: {
      'openai-codex': {
        tokens: { access_token: accessToken, refresh_token: refreshToken },
        auth_mode: 'chatgpt',
      },
    },
  };
}

async function secureStore(root, payload) {
  await mkdir(root, { recursive: true, mode: 0o700 });
  await chmod(root, 0o700);
  const file = path.join(root, 'auth.json');
  await writeFile(file, `${JSON.stringify(payload)}\n`, { mode: 0o600 });
  await chmod(file, 0o600);
  return file;
}

function jsonResponse(status, payload) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get() { return null; } },
    async json() { return payload; },
  };
}

test('ChatGPT device authorization exposes no callback listener or loopback attack surface', async () => {
  const source = await readFile(new URL('../../src/auth/openai-codex.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /createServer|\.listen\(|127\.0\.0\.1|callback_url/);
  assert.match(source, /https:\/\/auth\.openai\.com\/codex\/device/);
});

test('secure current Hermes OAuth credential is reused without browser login or copying the refresh token', async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'ned-codex-reuse-'));
  const hermesHome = path.join(home, '.hermes', 'profiles', 'current');
  const access = jwtWithExpiry(Math.floor(Date.now() / 1000) + 3600);
  await secureStore(hermesHome, authStore(access));

  const result = await authorizeOpenAICodex({
    home,
    env: { HERMES_HOME: hermesHome },
    openBrowser: async () => assert.fail('browser must not open'),
    fetchImpl: async () => assert.fail('network must not run'),
  });

  assert.equal(result.providerId, 'openai-codex');
  assert.equal(result.method, 'oauth-device-code');
  assert.equal(result.source, 'existing-hermes-oauth');
  assert.equal(result.consumeCredential(), access);
  assert.equal(JSON.stringify(result).includes('synthetic-refresh-token'), false);
});

test('profile discovery reuses exactly one safe Hermes OAuth credential and rejects ambiguity', async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'ned-codex-discovery-'));
  const access = jwtWithExpiry(Math.floor(Date.now() / 1000) + 3600);
  await secureStore(path.join(home, '.hermes', 'profiles', 'only'), authStore(access));
  const selected = await resolveSafeHermesCodexCredential({ home, env: {} });
  assert.equal(selected.accessToken, access);

  await secureStore(path.join(home, '.hermes', 'profiles', 'second'), authStore(jwtWithExpiry(Math.floor(Date.now() / 1000) + 7200)));
  assert.equal(await resolveSafeHermesCodexCredential({ home, env: {} }), null);
});

test('unsafe or symlinked auth stores are never reused', async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'ned-codex-unsafe-'));
  const unsafe = path.join(home, 'unsafe');
  const access = jwtWithExpiry(Math.floor(Date.now() / 1000) + 3600);
  const file = await secureStore(unsafe, authStore(access));
  await chmod(file, 0o644);
  await assert.rejects(
    () => resolveSafeHermesCodexCredential({ home, env: { HERMES_HOME: unsafe } }),
    /owner-only|unsafe/i,
  );

  const real = path.join(home, 'real');
  await secureStore(real, authStore(access));
  const linked = path.join(home, 'linked');
  await symlink(real, linked);
  await assert.rejects(
    () => resolveSafeHermesCodexCredential({ home, env: { HERMES_HOME: linked } }),
    /symlink|unsafe/i,
  );
});

test('new login opens only the fixed ChatGPT device URL and ignores hostile response URLs', async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'ned-codex-login-'));
  const hermesHome = path.join(home, '.hermes', 'profiles', 'ned-local');
  const opened = [];
  const output = [];
  const requests = [];
  const access = jwtWithExpiry(Math.floor(Date.now() / 1000) + 3600);
  const responses = [
    jsonResponse(200, {
      user_code: 'ABCD-EFGH',
      device_auth_id: 'synthetic-device-id',
      interval: 0,
      verification_uri: 'https://attacker.invalid/callback?credential=leak',
    }),
    jsonResponse(200, { authorization_code: 'synthetic-auth-code', code_verifier: 'synthetic-verifier' }),
    jsonResponse(200, { access_token: access, refresh_token: 'synthetic-new-refresh' }),
  ];
  const result = await authorizeOpenAICodex({
    home,
    env: { HERMES_HOME: hermesHome },
    fetchImpl: async (url, options) => {
      requests.push({ url, body: options?.body });
      return responses.shift();
    },
    openBrowser: async (url) => opened.push(url),
    io: { log: (value) => output.push(String(value)) },
    sleep: async () => {},
    timeoutMs: 1000,
  });

  assert.deepEqual(opened, [CHATGPT_DEVICE_URL]);
  assert.equal(opened[0].includes('?'), false);
  assert.equal(output.join('\n').includes('attacker.invalid'), false);
  assert.equal(output.join('\n').includes('synthetic-auth-code'), false);
  assert.equal(output.join('\n').includes('synthetic-verifier'), false);
  assert.equal(requests.every(({ url }) => !url.includes('?')), true);
  assert.equal(result.consumeCredential(), access);

  const persisted = JSON.parse(await readFile(path.join(hermesHome, 'auth.json'), 'utf8'));
  assert.equal(persisted.providers['openai-codex'].tokens.access_token, access);
  assert.equal(persisted.providers['openai-codex'].tokens.refresh_token, 'synthetic-new-refresh');
  assert.equal((await lstat(path.join(hermesHome, 'auth.json'))).mode & 0o777, 0o600);
});

test('cancel and timeout persist no partial OAuth state and a restart can succeed', async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'ned-codex-restart-'));
  const hermesHome = path.join(home, '.hermes', 'profiles', 'ned-local');
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    () => authorizeOpenAICodex({
      home,
      env: { HERMES_HOME: hermesHome },
      signal: controller.signal,
      fetchImpl: async () => assert.fail('cancelled login must not call network'),
      openBrowser: async () => {},
    }),
    /cancel/i,
  );
  await assert.rejects(readFile(path.join(hermesHome, 'auth.json')), /ENOENT/);

  let now = 0;
  const pending = [
    jsonResponse(200, { user_code: 'WAIT-CODE', device_auth_id: 'wait-id', interval: 0 }),
    jsonResponse(403, {}),
  ];
  await assert.rejects(
    () => authorizeOpenAICodex({
      home,
      env: { HERMES_HOME: hermesHome },
      fetchImpl: async () => pending.shift() || jsonResponse(403, {}),
      openBrowser: async () => {},
      io: { log() {} },
      now: () => now,
      sleep: async () => { now += 1001; },
      timeoutMs: 1000,
    }),
    /timed out/i,
  );
  await assert.rejects(readFile(path.join(hermesHome, 'auth.json')), /ENOENT/);

  const access = jwtWithExpiry(Math.floor(Date.now() / 1000) + 3600);
  const complete = [
    jsonResponse(200, { user_code: 'GOOD-CODE', device_auth_id: 'good-id', interval: 0 }),
    jsonResponse(200, { authorization_code: 'good-auth', code_verifier: 'good-verifier' }),
    jsonResponse(200, { access_token: access, refresh_token: 'good-refresh' }),
  ];
  const result = await authorizeOpenAICodex({
    home,
    env: { HERMES_HOME: hermesHome },
    fetchImpl: async () => complete.shift(),
    openBrowser: async () => {},
    io: { log() {} },
    sleep: async () => {},
    timeoutMs: 1000,
  });
  assert.equal(result.consumeCredential(), access);
});

test('expired Hermes credential with rejected refresh asks the user to reauthorize and replaces it only after device login succeeds', async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'ned-codex-reauth-'));
  const hermesHome = path.join(home, '.hermes', 'profiles', 'current');
  const oldAccess = jwtWithExpiry(Math.floor(Date.now() / 1000) - 1);
  const newAccess = jwtWithExpiry(Math.floor(Date.now() / 1000) + 3600);
  await secureStore(hermesHome, authStore(oldAccess, 'rejected-refresh'));
  const opened = [];
  const output = [];
  const responses = [
    jsonResponse(401, {}),
    jsonResponse(200, { user_code: 'REAUTH-CODE', device_auth_id: 'reauth-id', interval: 0 }),
    jsonResponse(200, { authorization_code: 'reauth-code', code_verifier: 'reauth-verifier' }),
    jsonResponse(200, { access_token: newAccess, refresh_token: 'replacement-refresh' }),
  ];

  const result = await authorizeOpenAICodex({
    home,
    env: { HERMES_HOME: hermesHome },
    fetchImpl: async () => responses.shift(),
    openBrowser: async (url) => opened.push(url),
    io: { log: (value) => output.push(String(value)) },
    sleep: async () => {},
    timeoutMs: 1000,
  });

  assert.equal(result.source, 'reauthenticated-hermes-oauth');
  assert.equal(result.consumeCredential(), newAccess);
  assert.deepEqual(opened, [CHATGPT_DEVICE_URL]);
  assert.match(output.join('\n'), /reauthoriz/i);
  const persisted = JSON.parse(await readFile(path.join(hermesHome, 'auth.json'), 'utf8'));
  assert.equal(persisted.providers['openai-codex'].tokens.access_token, newAccess);
  assert.equal(persisted.providers['openai-codex'].tokens.refresh_token, 'replacement-refresh');
});

test('expiring reused credential refreshes through the official contract and atomically preserves rotation', async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'ned-codex-refresh-'));
  const hermesHome = path.join(home, '.hermes', 'profiles', 'current');
  const oldAccess = jwtWithExpiry(Math.floor(Date.now() / 1000) - 1);
  const newAccess = jwtWithExpiry(Math.floor(Date.now() / 1000) + 3600);
  await secureStore(hermesHome, authStore(oldAccess, 'old-refresh'));
  const result = await authorizeOpenAICodex({
    home,
    env: { HERMES_HOME: hermesHome },
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://auth.openai.com/oauth/token');
      assert.match(String(options.body), /grant_type=refresh_token/);
      return jsonResponse(200, { access_token: newAccess, refresh_token: 'rotated-refresh' });
    },
    openBrowser: async () => assert.fail('refresh must not open browser'),
  });
  assert.equal(result.consumeCredential(), newAccess);
  const persisted = JSON.parse(await readFile(path.join(hermesHome, 'auth.json'), 'utf8'));
  assert.equal(persisted.providers['openai-codex'].tokens.access_token, newAccess);
  assert.equal(persisted.providers['openai-codex'].tokens.refresh_token, 'rotated-refresh');
});
