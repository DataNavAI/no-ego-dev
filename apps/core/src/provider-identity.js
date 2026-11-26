import {randomUUID} from 'node:crypto';
import {createIdentityProviders, IdentityError, providers} from '../../../src/identity-providers.js';
import {createIdentityStore, identityStatus} from '../../../src/identity-store.js';
import {SecretError} from '../../../src/secrets.js';

const tenMinutes = 600_000;

async function body(req, keys) {
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || ''))
    throw new IdentityError('invalid_body', 'Use a JSON request.', 415);
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 12_288) throw new IdentityError('too_large', 'The identity request is too large.', 413);
    chunks.push(chunk);
  }
  try {
    const data = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(Buffer.concat(chunks)));
    if (!data || Array.isArray(data) || keys.length !== Object.keys(data).length
      || !keys.every(key => Object.hasOwn(data, key) && typeof data[key] === 'string')) throw new Error();
    return data;
  } catch {
    throw new IdentityError('invalid_body', 'The identity request was invalid.');
  }
}

const fields = {
  github: ['login'],
  aws: ['startUrl', 'region', 'account', 'role'],
  godaddy: ['domain', 'token'],
};

export function createIdentityHandler({home, env, enabled, fetch, clock = Date.now, githubClientId} = {}) {
  const pending = new Map();
  function end(provider) {
    clearTimeout(pending.get(provider)?.timer);
    pending.delete(provider);
  }
  const adapters = createIdentityProviders({fetch, clock, githubClientId});

  function details(provider, store) {
    const attempt = pending.get(provider);
    if (attempt && attempt.expiresAt <= clock()) end(provider);
    const active = pending.get(provider);
    const device = active?.device;
    const record = store.get(provider);
    return {
      provider,
      ...identityStatus(record, clock),
      connectionId: record?.id ?? null,
      request: active ? {
        id: active.id,
        state: active.candidate ? 'confirm' : device ? 'sign_in' : 'requested',
        expiresAt: active.expiresAt,
        ...(device && !active.candidate ? {url: device.url, code: device.userCode} : {}),
        ...(active.candidate ? {identity: active.candidate.identity} : {}),
      } : null,
    };
  }

  function checkActive(provider, attempt) {
    if (pending.get(provider) !== attempt || attempt.expiresAt <= clock()) {
      throw new IdentityError('restart_required', 'The request ended. Start a new connection.', 409);
    }
  }

  async function progress(provider, attempt, operation) {
    if (attempt.busy) return;
    attempt.busy = true;
    try {
      await operation();
      checkActive(provider, attempt);
    } catch (error) {
      if (pending.get(provider) === attempt) end(provider);
      throw error;
    } finally {
      attempt.busy = false;
    }
  }

  const handle = async (req, send, origin) => {
    const fail = (status, code, message) => send(status, {error: {code, message}});
    if (!enabled) return fail(403, 'identity_disabled', 'Provider connections require private native NEDCOM.');
    if (req.headers['x-ned-identity'] !== '1' || req.headers['sec-fetch-site'] === 'cross-site'
      || (req.method !== 'GET' && req.headers.origin !== origin))
      return fail(403, 'forbidden', 'Access forbidden.');
    const list = req.method === 'GET' && req.url === '/api/identity';
    const match = /^\/api\/identity\/(github|aws|godaddy)\/(request|start|poll|confirm|cancel|disconnect)$/.exec(req.url);
    if (!list && !(match && req.method === 'POST')) return fail(404, 'not_found', 'Identity action is unavailable.');
    const [, provider, action] = match || [];
    if (action !== 'start' && (req.headers['transfer-encoding'] || Number(req.headers['content-length'] || 0) > 0))
      return fail(400, 'invalid_body', 'This action does not accept a body.');

    try {
      const store = createIdentityStore(home, env);
      if (list) return send(200, {connections: providers.map(name => details(name, store))});
      details(provider, store);
      const current = pending.get(provider);
      const observedId = req.headers['x-ned-identity-id'];
      if (!['request', 'disconnect'].includes(action) && (!current || observedId !== current.id)) {
        throw new IdentityError('restart_required', 'This connection request changed. Refresh Settings.', 409);
      }
      if (action === 'request' && !current) {
        const attempt = {id: randomUUID(), expiresAt: clock() + tenMinutes, previous: store.get(provider)};
        attempt.timer = setTimeout(() => {
          if (pending.get(provider) === attempt) end(provider);
        }, tenMinutes).unref();
        pending.set(provider, attempt);
      } else if (action === 'disconnect') {
        const record = store.get(provider);
        if (!record || observedId !== record.id)
          throw new IdentityError('changed', 'The saved connection changed. Refresh Settings.', 409);
        store.remove(provider, record);
        end(provider);
      } else if (action === 'cancel') {
        end(provider);
      } else if (action !== 'request') {
        if (action === 'start') {
          const input = await body(req, fields[provider]);
          checkActive(provider, current);
          if (!current.device && !current.candidate) {
            await progress(provider, current, async () => {
              const result = await adapters.start[provider](input, current.expiresAt);
              if (provider === 'godaddy') current.candidate = result;
              else {
                current.device = result;
                current.expiresAt = result.expiresAt;
                current.nextPoll = clock() + result.interval;
              }
            });
          }
        } else if (action === 'poll' && current.device && !current.candidate && clock() >= current.nextPoll) {
          await progress(provider, current, async () => {
            const result = await adapters.poll[provider](current.device);
            if (result === 'slow') current.device.interval += 5000;
            current.nextPoll = clock() + current.device.interval;
            if (typeof result === 'object') current.candidate = result;
          });
        } else if (action === 'confirm') {
          if (!current.candidate || current.busy || identityStatus(current.candidate, clock).status !== 'connected')
            throw new IdentityError('not_verified', 'Verify the selected identity before confirming it.', 409);
          checkActive(provider, current);
          try {store.save(provider, {...current.candidate, id: randomUUID()}, current.previous);}
          finally {end(provider);}
        }
      }
      return send(200, details(provider, store));
    } catch (error) {
      if (error instanceof IdentityError) return fail(error.status, error.code, error.message);
      if (error instanceof SecretError && error.code === 'changed') return fail(409, error.code, error.message);
      return fail(503, 'identity_unavailable', 'Provider connections are unavailable. Check private storage or try again.');
    }
  };
  handle.isBusy = () => pending.size > 0;
  handle.close = () => providers.forEach(end);
  return handle;
}
