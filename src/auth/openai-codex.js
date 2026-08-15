import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import {
  chmod,
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export const CHATGPT_DEVICE_URL = 'https://auth.openai.com/codex/device';
const DEVICE_CODE_URL = 'https://auth.openai.com/api/accounts/deviceauth/usercode';
const DEVICE_TOKEN_URL = 'https://auth.openai.com/api/accounts/deviceauth/token';
const OAUTH_TOKEN_URL = 'https://auth.openai.com/oauth/token';
const CODEX_CLIENT_ID = 'app_EMoamEEZ73f0CkXaXp7hrann';
const CODEX_BASE_URL = 'https://chatgpt.com/backend-api/codex';
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;
const REFRESH_SKEW_SECONDS = 45 * 60;

function abortError() {
  const error = new Error('ChatGPT authorization cancelled.');
  error.name = 'AbortError';
  return error;
}

function ensureNotAborted(signal) {
  if (signal?.aborted) throw abortError();
}

function decodeExpiry(accessToken) {
  try {
    const parts = String(accessToken).split('.');
    if (parts.length !== 3) return null;
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return Number.isFinite(claims.exp) ? Number(claims.exp) : null;
  } catch {
    return null;
  }
}

function tokenNeedsRefresh(accessToken, nowMs) {
  const expiry = decodeExpiry(accessToken);
  if (expiry === null) return false;
  return expiry <= (Math.floor(nowMs / 1000) + REFRESH_SKEW_SECONDS);
}

async function assertSafeStorePath(storePath, { allowMissing = false, trustedRoot = os.homedir() } = {}) {
  const absolute = path.resolve(storePath);
  const root = path.resolve(trustedRoot);
  if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) {
    throw new Error('Hermes OAuth store is unsafe: auth.json must stay inside the user home directory.');
  }
  let fileInfo;
  try {
    fileInfo = await lstat(absolute);
  } catch (error) {
    if (allowMissing && error?.code === 'ENOENT') return null;
    throw error;
  }
  if (fileInfo.isSymbolicLink() || !fileInfo.isFile()) {
    throw new Error('Hermes OAuth store is unsafe: auth.json must be a regular non-symlink file.');
  }
  if (typeof process.getuid === 'function' && fileInfo.uid !== process.getuid()) {
    throw new Error('Hermes OAuth store is unsafe: auth.json is not owned by the current user.');
  }
  if ((fileInfo.mode & 0o077) !== 0) {
    throw new Error('Hermes OAuth store is unsafe: auth.json must be owner-only.');
  }

  let current = path.dirname(absolute);
  while (true) {
    const info = await lstat(current);
    if (info.isSymbolicLink() || !info.isDirectory()) {
      throw new Error('Hermes OAuth store is unsafe: a parent path is a symlink or not a directory.');
    }
    if (typeof process.getuid === 'function' && info.uid !== process.getuid()) {
      throw new Error('Hermes OAuth store is unsafe: a parent directory is not user-owned.');
    }
    if ((info.mode & 0o022) !== 0) {
      throw new Error('Hermes OAuth store is unsafe: a parent directory is group/world writable.');
    }
    if (current === root) break;
    current = path.dirname(current);
  }
  return fileInfo;
}

function selectCredential(payload) {
  const singleton = payload?.providers?.['openai-codex']?.tokens;
  if (typeof singleton?.access_token === 'string' && singleton.access_token
      && typeof singleton?.refresh_token === 'string' && singleton.refresh_token) {
    return {
      kind: 'singleton',
      accessToken: singleton.access_token,
      refreshToken: singleton.refresh_token,
    };
  }

  const entries = payload?.credential_pool?.['openai-codex'];
  if (!Array.isArray(entries)) return null;
  const usable = entries.filter((entry) => entry
    && typeof entry.access_token === 'string' && entry.access_token
    && typeof entry.refresh_token === 'string' && entry.refresh_token
    && entry.last_status !== 'exhausted'
    && ['device_code', 'manual:device_code'].includes(entry.source));
  if (usable.length !== 1) return null;
  return {
    kind: 'pool',
    entryId: usable[0].id,
    accessToken: usable[0].access_token,
    refreshToken: usable[0].refresh_token,
  };
}

function defaultStorePath({ home, env }) {
  if (typeof env.HERMES_HOME === 'string' && env.HERMES_HOME.trim()) {
    return path.resolve(env.HERMES_HOME, 'auth.json');
  }
  return path.join(home, '.hermes', 'auth.json');
}

function loginStorePath({ home, env }) {
  if (typeof env.HERMES_HOME === 'string' && env.HERMES_HOME.trim()) {
    return path.resolve(env.HERMES_HOME, 'auth.json');
  }
  return path.join(home, '.hermes', 'profiles', 'ned-local', 'auth.json');
}

async function readSafeCredentialCandidate(storePath, home) {
  const info = await assertSafeStorePath(storePath, { allowMissing: true, trustedRoot: home });
  if (!info) return null;
  const originalText = await readFile(storePath, 'utf8');
  let payload;
  try {
    payload = JSON.parse(originalText);
  } catch {
    throw new Error('Hermes OAuth store is unsafe: auth.json is not valid JSON.');
  }
  const selected = selectCredential(payload);
  if (!selected) return null;
  return { storePath, originalText, payload, ...selected };
}

export async function resolveSafeHermesCodexCredential({
  home = os.homedir(),
  env = process.env,
} = {}) {
  if (typeof env.HERMES_HOME === 'string' && env.HERMES_HOME.trim()) {
    return readSafeCredentialCandidate(defaultStorePath({ home, env }), home);
  }

  const dedicated = path.join(home, '.hermes', 'profiles', 'ned-local', 'auth.json');
  try {
    const selected = await readSafeCredentialCandidate(dedicated, home);
    if (selected) return selected;
  } catch {
    // A discovered unsafe store is never reused; another safe unambiguous profile may still be used.
  }

  const candidates = [path.join(home, '.hermes', 'auth.json')];
  const profilesRoot = path.join(home, '.hermes', 'profiles');
  try {
    const entries = await readdir(profilesRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name !== 'ned-local' && entry.isDirectory() && !entry.isSymbolicLink()) {
        candidates.push(path.join(profilesRoot, entry.name, 'auth.json'));
      }
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  const matches = [];
  for (const storePath of candidates) {
    try {
      const selected = await readSafeCredentialCandidate(storePath, home);
      if (selected) matches.push(selected);
    } catch {
      // Discovery is fail-closed for this candidate. Explicit HERMES_HOME errors are surfaced above.
    }
  }
  return matches.length === 1 ? matches[0] : null;
}

async function acquireNedAuthLock(storePath, { now = Date.now, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  const lockPath = `${storePath}.ned.lock`;
  const deadline = now() + 15_000;
  while (true) {
    try {
      const handle = await open(lockPath, 'wx', 0o600);
      return async () => {
        await handle.close();
        await rm(lockPath, { force: true });
      };
    } catch (error) {
      if (error?.code !== 'EEXIST' || now() >= deadline) {
        throw new Error('Hermes OAuth store is busy; retry after the other authorization process exits.');
      }
      await sleep(50);
    }
  }
}

async function writeAuthStore(storePath, payload, { expectedText = null } = {}) {
  const directory = path.dirname(storePath);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
  if (expectedText !== null) {
    const current = await readFile(storePath, 'utf8');
    if (current !== expectedText) {
      throw new Error('Hermes OAuth store changed concurrently; no credential update was written.');
    }
  }
  const temporary = path.join(directory, `.auth.json.ned-${process.pid}-${randomUUID()}`);
  const handle = await open(temporary, 'wx', 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  await chmod(temporary, 0o600);
  await rename(temporary, storePath);
}

function applyTokens(payload, selected, tokens) {
  const next = structuredClone(payload);
  if (selected.kind === 'singleton') {
    const previousAccess = selected.accessToken;
    const provider = next.providers['openai-codex'];
    provider.tokens = { access_token: tokens.accessToken, refresh_token: tokens.refreshToken };
    provider.auth_mode = 'chatgpt';
    provider.last_refresh = new Date().toISOString();
    const pool = next.credential_pool?.['openai-codex'];
    if (Array.isArray(pool)) {
      for (const entry of pool) {
        if (entry?.access_token === previousAccess && ['device_code', 'manual:device_code'].includes(entry.source)) {
          entry.access_token = tokens.accessToken;
          entry.refresh_token = tokens.refreshToken;
          entry.last_status = null;
          entry.last_error_code = null;
          entry.last_error_reason = null;
          entry.last_error_message = null;
          entry.last_error_reset_at = null;
        }
      }
    }
  } else {
    const pool = next.credential_pool?.['openai-codex'] || [];
    const entry = pool.find((candidate) => candidate?.id === selected.entryId)
      || pool.find((candidate) => candidate?.access_token === selected.accessToken);
    if (!entry) throw new Error('Selected Hermes OAuth pool entry disappeared.');
    entry.access_token = tokens.accessToken;
    entry.refresh_token = tokens.refreshToken;
    entry.last_status = null;
    entry.last_error_code = null;
    entry.last_error_reason = null;
    entry.last_error_message = null;
    entry.last_error_reset_at = null;
  }
  return next;
}

async function parseJsonResponse(response, context) {
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`${context} returned invalid JSON.`);
  }
  return payload;
}

async function refreshCredential(selected, { fetchImpl, signal }) {
  ensureNotAborted(signal);
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: selected.refreshToken,
    client_id: CODEX_CLIENT_ID,
  });
  const response = await fetchImpl(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal,
  });
  if (response.status !== 200) {
    throw new Error(`ChatGPT OAuth refresh failed with status ${response.status}; authorize again.`);
  }
  const payload = await parseJsonResponse(response, 'ChatGPT OAuth refresh');
  if (typeof payload.access_token !== 'string' || !payload.access_token) {
    throw new Error('ChatGPT OAuth refresh did not return an access token.');
  }
  return {
    accessToken: payload.access_token,
    refreshToken: typeof payload.refresh_token === 'string' && payload.refresh_token
      ? payload.refresh_token : selected.refreshToken,
  };
}

async function runDeviceLogin({
  fetchImpl,
  openBrowser,
  io,
  signal,
  timeoutMs,
  now,
  sleep,
}) {
  ensureNotAborted(signal);
  const response = await fetchImpl(DEVICE_CODE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: CODEX_CLIENT_ID }),
    signal,
  });
  if (response.status !== 200) throw new Error(`ChatGPT device authorization failed with status ${response.status}.`);
  const device = await parseJsonResponse(response, 'ChatGPT device authorization');
  if (typeof device.user_code !== 'string' || !device.user_code
      || typeof device.device_auth_id !== 'string' || !device.device_auth_id) {
    throw new Error('ChatGPT device authorization response was incomplete.');
  }

  io.log('ChatGPT OAuth connects NED to your model provider without asking you to paste an API key. Open the official device page and enter the displayed code to authorize access:');
  io.log('Continue with ChatGPT:');
  io.log(`  ${CHATGPT_DEVICE_URL}`);
  io.log(`  Enter code: ${device.user_code}`);
  await openBrowser(CHATGPT_DEVICE_URL);

  const deadline = now() + timeoutMs;
  const intervalMs = Math.max(3000, Number(device.interval || 5) * 1000);
  let authorization;
  while (now() < deadline) {
    ensureNotAborted(signal);
    await sleep(intervalMs);
    ensureNotAborted(signal);
    if (now() >= deadline) break;
    const poll = await fetchImpl(DEVICE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ device_auth_id: device.device_auth_id, user_code: device.user_code }),
      signal,
    });
    if (poll.status === 200) {
      authorization = await parseJsonResponse(poll, 'ChatGPT device authorization poll');
      break;
    }
    if (![403, 404].includes(poll.status)) {
      throw new Error(`ChatGPT device authorization polling failed with status ${poll.status}.`);
    }
  }
  if (!authorization) throw new Error('ChatGPT authorization timed out; rerun ned create to restart safely.');
  if (typeof authorization.authorization_code !== 'string' || !authorization.authorization_code
      || typeof authorization.code_verifier !== 'string' || !authorization.code_verifier) {
    throw new Error('ChatGPT device authorization exchange data was incomplete.');
  }

  const tokenResponse = await fetchImpl(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: authorization.authorization_code,
      redirect_uri: 'https://auth.openai.com/deviceauth/callback',
      client_id: CODEX_CLIENT_ID,
      code_verifier: authorization.code_verifier,
    }),
    signal,
  });
  if (tokenResponse.status !== 200) throw new Error(`ChatGPT token exchange failed with status ${tokenResponse.status}.`);
  const tokenPayload = await parseJsonResponse(tokenResponse, 'ChatGPT token exchange');
  if (typeof tokenPayload.access_token !== 'string' || !tokenPayload.access_token
      || typeof tokenPayload.refresh_token !== 'string' || !tokenPayload.refresh_token) {
    throw new Error('ChatGPT token exchange did not return a refreshable credential.');
  }
  return { accessToken: tokenPayload.access_token, refreshToken: tokenPayload.refresh_token };
}

function modelConnection(accessToken, source) {
  let credential = accessToken;
  const publicMetadata = Object.freeze({
    providerId: 'openai-codex',
    method: 'oauth-device-code',
    source,
    sandboxEnvironmentVariable: 'NED_OPENAI_CODEX_ACCESS_TOKEN',
    allowedHosts: ['chatgpt.com'],
    hermesProvider: 'openai-codex',
  });
  return Object.freeze({
    ...publicMetadata,
    consumeCredential() {
      if (credential === null) throw new Error('ChatGPT OAuth credential was already consumed.');
      const value = credential;
      credential = null;
      return value;
    },
    toJSON() { return publicMetadata; },
  });
}

async function defaultOpenBrowser(url) {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  const child = spawn(command, args, { detached: true, stdio: 'ignore' });
  child.on('error', () => {});
  child.unref();
}

export async function authorizeOpenAICodex({
  home = os.homedir(),
  env = process.env,
  fetchImpl = globalThis.fetch,
  openBrowser = defaultOpenBrowser,
  io = console,
  signal,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  now = Date.now,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('ChatGPT authorization requires fetch support.');
  ensureNotAborted(signal);
  const existing = await resolveSafeHermesCodexCredential({ home, env });
  if (existing) {
    if (!tokenNeedsRefresh(existing.accessToken, now())) {
      return modelConnection(existing.accessToken, 'existing-hermes-oauth');
    }
    const release = await acquireNedAuthLock(existing.storePath, { now, sleep });
    try {
      const refreshed = await refreshCredential(existing, { fetchImpl, signal });
      const next = applyTokens(existing.payload, existing, refreshed);
      await writeAuthStore(existing.storePath, next, { expectedText: existing.originalText });
      return modelConnection(refreshed.accessToken, 'refreshed-hermes-oauth');
    } finally {
      await release();
    }
  }

  const storePath = loginStorePath({ home, env });
  const release = await acquireNedAuthLock(storePath, { now, sleep }).catch(async (error) => {
    await mkdir(path.dirname(storePath), { recursive: true, mode: 0o700 });
    return acquireNedAuthLock(storePath, { now, sleep }).catch(() => { throw error; });
  });
  try {
    const tokens = await runDeviceLogin({ fetchImpl, openBrowser, io, signal, timeoutMs, now, sleep });
    const payload = {
      version: 1,
      active_provider: 'openai-codex',
      providers: {
        'openai-codex': {
          tokens: { access_token: tokens.accessToken, refresh_token: tokens.refreshToken },
          last_refresh: new Date().toISOString(),
          auth_mode: 'chatgpt',
        },
      },
      credential_pool: {
        'openai-codex': [{
          id: `ned-${randomUUID().replaceAll('-', '').slice(0, 12)}`,
          label: 'NED ChatGPT OAuth',
          auth_type: 'oauth',
          source: 'device_code',
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          base_url: CODEX_BASE_URL,
          last_status: null,
        }],
      },
    };
    await writeAuthStore(storePath, payload);
    return modelConnection(tokens.accessToken, 'new-hermes-oauth');
  } finally {
    await release();
  }
}
