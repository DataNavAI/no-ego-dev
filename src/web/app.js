import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { listModelProviders } from '../model-providers.js';

const BODY_LIMIT_BYTES = 16 * 1024;
const SESSION_TTL_MS = 60 * 60 * 1000;
const MUTATION_LIMIT_PER_MINUTE = 30;
const DEFAULT_MAX_ACTIVE_SESSIONS = 10_000;
const JOB_OUTPUT_LIMIT_BYTES = 32 * 1024;
const TERMINAL_JOB_STATUSES = new Set(['succeeded', 'failed', 'cancelled', 'blocked']);
const JOB_TRANSITIONS = Object.freeze({
  queued: new Set(['running', 'succeeded', 'failed', 'cancelled', 'blocked']),
  running: new Set(['succeeded', 'failed', 'cancelled', 'blocked']),
  succeeded: new Set(),
  failed: new Set(),
  cancelled: new Set(),
  blocked: new Set(),
});
const STATIC_FILES = Object.freeze({
  '/': { path: new URL('./public/index.html', import.meta.url), type: 'text/html; charset=utf-8' },
  '/app.js': { path: new URL('./public/app.js', import.meta.url), type: 'text/javascript; charset=utf-8' },
  '/styles.css': { path: new URL('./public/styles.css', import.meta.url), type: 'text/css; charset=utf-8' },
});

class HttpError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function token(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

function securityHeaders(contentType) {
  return {
    'Content-Type': contentType,
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  };
}

function sendJson(response, status, value, headers = {}) {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    ...securityHeaders('application/json; charset=utf-8'),
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
    ...headers,
  });
  response.end(body);
}

function parseCookies(request) {
  const cookies = new Map();
  for (const item of (request.headers.cookie || '').split(';')) {
    const index = item.indexOf('=');
    if (index > 0) cookies.set(item.slice(0, index).trim(), item.slice(index + 1).trim());
  }
  return cookies;
}

async function readJson(request) {
  const declaredLength = Number(request.headers['content-length'] || 0);
  if (declaredLength > BODY_LIMIT_BYTES) {
    request.resume();
    throw new HttpError(413, 'request_too_large');
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > BODY_LIMIT_BYTES) throw new HttpError(413, 'request_too_large');
    chunks.push(chunk);
  }
  try {
    return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
  } catch {
    throw new HttpError(400, 'invalid_json');
  }
}

function safeIdentity(value) {
  if (!value || typeof value.userId !== 'string' || !/^[A-Za-z0-9._:@-]{1,128}$/.test(value.userId)) {
    throw new HttpError(401, 'authentication_required');
  }
  return {
    userId: value.userId,
    displayName: typeof value.displayName === 'string' ? value.displayName.slice(0, 80) : 'NED owner',
  };
}

function safeExternalId(value, source) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
    throw new Error(`${source} returned an invalid identity`);
  }
  return value;
}

function validatePublicOrigin(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('Browser server requires a canonical origin');
  }
  if (parsed.origin !== value) throw new Error('Browser server requires a canonical origin');
  const loopback = parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost' || parsed.hostname === '[::1]';
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && loopback)) {
    throw new Error('Browser server requires HTTPS or loopback HTTP');
  }
  return parsed.origin;
}

function safeJob(value, fallbackOperation) {
  if (!value || typeof value.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value.id)) {
    throw new Error('Job service returned an invalid job identity');
  }
  const statuses = new Set(['queued', 'running', 'succeeded', 'failed', 'cancelled', 'blocked']);
  if (!statuses.has(value.status)) throw new Error('Job service returned an invalid status');
  if (value.operation !== fallbackOperation) throw new Error('Job service returned an invalid operation');
  const job = {
    id: value.id,
    operation: value.operation,
    status: value.status,
  };
  if (job.operation === 'send_first_request' && job.status === 'succeeded') {
    if (typeof value.output !== 'string' || Buffer.byteLength(value.output) > JOB_OUTPUT_LIMIT_BYTES) {
      throw new Error('Job service returned an invalid first-request output');
    }
    job.output = value.output;
  }
  return job;
}

export function createBrowserServer({
  publicOrigin,
  authenticate,
  secretVault,
  computeConnector,
  jobService,
  now = () => Date.now(),
  maxActiveSessions = DEFAULT_MAX_ACTIVE_SESSIONS,
} = {}) {
  if (!publicOrigin || !authenticate || !secretVault?.put || !secretVault?.delete || !computeConnector?.connect || !jobService?.create || !jobService?.get || !jobService?.cancel) {
    throw new Error('Browser server requires origin, identity, secret-vault, compute, and job adapters');
  }
  publicOrigin = validatePublicOrigin(publicOrigin);
  if (!Number.isInteger(maxActiveSessions) || maxActiveSessions < 1 || maxActiveSessions > 100_000) {
    throw new Error('Browser server requires a bounded active-session capacity');
  }

  const sessions = new Map();
  const jobs = new Map();
  const idempotency = new Map();

  async function deleteSecret(ownerId, id) {
    const receipt = await secretVault.delete({ ownerId, id });
    if (receipt?.id !== id || receipt?.status !== 'deleted') throw new Error('Secret vault did not verify deletion');
  }

  async function revokeModelConnection(session) {
    if (!session.modelConnectionId) return;
    const id = session.modelConnectionId;
    await deleteSecret(session.userId, id);
    session.modelConnectionId = null;
  }

  async function removeSession(sessionId) {
    const session = sessions.get(sessionId);
    if (session) await revokeModelConnection(session);
    sessions.delete(sessionId);
    const prefix = `${sessionId}:`;
    for (const key of jobs.keys()) if (key.startsWith(prefix)) jobs.delete(key);
    for (const key of idempotency.keys()) if (key.startsWith(prefix)) idempotency.delete(key);
  }

  async function pruneExpiredSessions() {
    const timestamp = now();
    for (const [sessionId, session] of sessions) {
      if (session.expiresAt <= timestamp) await removeSession(sessionId);
    }
  }

  function requireOrigin(request) {
    if (request.headers.origin !== publicOrigin) throw new HttpError(403, 'origin_rejected');
  }

  async function requireSession(request) {
    const sessionId = parseCookies(request).get('__Host-ned_session') || parseCookies(request).get('ned_session');
    const session = sessionId ? sessions.get(sessionId) : null;
    if (!session || session.expiresAt <= now()) {
      if (sessionId) await removeSession(sessionId);
      throw new HttpError(401, 'authentication_required');
    }
    return session;
  }

  function protectMutation(request, session) {
    requireOrigin(request);
    if (request.headers['x-csrf-token'] !== session.csrfToken) throw new HttpError(403, 'csrf_rejected');
    const minute = Math.floor(now() / 60_000);
    if (session.mutationMinute !== minute) {
      session.mutationMinute = minute;
      session.mutationCount = 0;
    }
    session.mutationCount += 1;
    if (session.mutationCount > MUTATION_LIMIT_PER_MINUTE) throw new HttpError(429, 'rate_limited');
  }

  function publicJob(record) {
    return {
      id: record.id,
      operation: record.operation,
      status: record.status,
      ...(record.output === undefined ? {} : { output: record.output }),
    };
  }

  async function finalizeTransition(session, record, next) {
    if (record.operation === 'create_ned') {
      if (next.status === 'succeeded') session.nedReady = true;
      if (['failed', 'cancelled', 'blocked'].includes(next.status)) {
        await revokeModelConnection(session);
        session.nedReady = false;
      }
    }
    if (record.operation === 'resume_ned' && next.status === 'succeeded') session.nedReady = true;
    if (record.operation === 'destroy_ned' && next.status === 'succeeded') {
      await revokeModelConnection(session);
      session.computeConnectionId = null;
      session.nedReady = false;
      session.lifecycle = 'destroyed';
    }
  }

  async function reconcileJob(session, record) {
    const next = safeJob(await jobService.get({
      jobId: record.id,
      ownerId: session.userId,
      sessionId: session.id,
    }), record.operation);
    if (next.id !== record.id) throw new Error('Job service changed job identity');
    if (next.status === record.status) return record;
    if (!JOB_TRANSITIONS[record.status]?.has(next.status)) throw new Error('Job service returned an illegal state transition');
    if (TERMINAL_JOB_STATUSES.has(next.status)) await finalizeTransition(session, record, next);
    Object.assign(record, next);
    return record;
  }

  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, publicOrigin);
      if (url.pathname.startsWith('/api/') && url.search !== '') {
        throw new HttpError(400, 'query_not_allowed');
      }
      const staticFile = request.method === 'GET' ? STATIC_FILES[url.pathname] : null;
      if (staticFile) {
        const body = await readFile(staticFile.path);
        response.writeHead(200, {
          ...securityHeaders(staticFile.type),
          'Cache-Control': url.pathname === '/' ? 'no-store' : 'public, max-age=300',
          'Content-Length': body.length,
        });
        response.end(body);
        return;
      }

      if (request.method === 'GET' && url.pathname === '/healthz') {
        sendJson(response, 200, { ok: true });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/session') {
        requireOrigin(request);
        const body = await readJson(request);
        if (Object.keys(body).length !== 0) throw new HttpError(400, 'unexpected_session_field');
        await pruneExpiredSessions();
        if (sessions.size >= maxActiveSessions) throw new HttpError(503, 'session_capacity_reached');
        const identity = safeIdentity(await authenticate(request));
        const id = token();
        const session = {
          id,
          ...identity,
          csrfToken: token(),
          expiresAt: now() + SESSION_TTL_MS,
          mutationMinute: Math.floor(now() / 60_000),
          mutationCount: 0,
          computeConnectionId: null,
          modelConnectionId: null,
          nedReady: false,
          lifecycle: 'active',
        };
        sessions.set(id, session);
        const secure = publicOrigin.startsWith('https:') ? '; Secure' : '';
        const cookieName = secure ? '__Host-ned_session' : 'ned_session';
        sendJson(response, 201, {
          user: { displayName: session.displayName },
          csrfToken: session.csrfToken,
        }, {
          'Set-Cookie': `${cookieName}=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600${secure}`,
        });
        return;
      }

      const session = await requireSession(request);

      if (request.method === 'GET' && url.pathname === '/api/session') {
        let record = session.lastJobId ? jobs.get(`${session.id}:${session.lastJobId}`) : null;
        if (record) record = await reconcileJob(session, record);
        sendJson(response, 200, {
          user: { displayName: session.displayName },
          csrfToken: session.csrfToken,
          connections: {
            compute: Boolean(session.computeConnectionId),
            model: Boolean(session.modelConnectionId),
          },
          nedReady: session.nedReady,
          job: record ? publicJob(record) : null,
        });
        return;
      }

      if (request.method === 'DELETE' && url.pathname === '/api/session') {
        protectMutation(request, session);
        const body = await readJson(request);
        if (Object.keys(body).length !== 0) throw new HttpError(400, 'unexpected_session_field');
        await removeSession(session.id);
        const secure = publicOrigin.startsWith('https:') ? '; Secure' : '';
        const cookieName = secure ? '__Host-ned_session' : 'ned_session';
        response.writeHead(204, {
          ...securityHeaders('application/json; charset=utf-8'),
          'Cache-Control': 'no-store',
          'Set-Cookie': `${cookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`,
        });
        response.end();
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/model-providers') {
        sendJson(response, 200, { providers: listModelProviders() });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/compute-connections') {
        protectMutation(request, session);
        if (session.lifecycle === 'destroyed') throw new HttpError(409, 'session_cleaned_up');
        const body = await readJson(request);
        if (body.providerId !== 'daytona' || Object.keys(body).some((key) => key !== 'providerId')) {
          throw new HttpError(400, 'unsupported_compute_connection');
        }
        const result = await computeConnector.connect({ ownerId: session.userId, providerId: 'daytona' });
        const connectionId = safeExternalId(result?.id, 'Compute connector');
        session.computeConnectionId = connectionId;
        sendJson(response, 201, { id: connectionId, providerId: 'daytona', status: 'connected' });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/model-connections') {
        protectMutation(request, session);
        if (session.lifecycle === 'destroyed') throw new HttpError(409, 'session_cleaned_up');
        const body = await readJson(request);
        const provider = listModelProviders().find(({ id }) => id === body.providerId);
        if (!provider) throw new HttpError(400, 'unsupported_model_provider');
        if (body.method !== 'api-key') throw new HttpError(400, 'unsupported_connection_method');
        if (provider.delegatedAuthorization.status === 'available') {
          throw new HttpError(409, 'delegated_authorization_required');
        }
        if (typeof body.credential !== 'string' || body.credential.length < 8) {
          throw new HttpError(400, 'invalid_model_credential');
        }
        if (Object.keys(body).some((key) => !['providerId', 'method', 'credential'].includes(key))) {
          throw new HttpError(400, 'unexpected_connection_field');
        }
        const secret = await secretVault.put({
          ownerId: session.userId,
          providerId: body.providerId,
          method: body.method,
          value: body.credential,
        });
        const rawConnectionId = secret?.id;
        let connectionId;
        try {
          connectionId = safeExternalId(rawConnectionId, 'Secret vault');
        } catch (error) {
          if (typeof rawConnectionId === 'string') await deleteSecret(session.userId, rawConnectionId);
          throw error;
        }
        const supersededId = session.modelConnectionId;
        if (supersededId) {
          try {
            await deleteSecret(session.userId, supersededId);
          } catch (error) {
            await deleteSecret(session.userId, connectionId);
            throw error;
          }
        }
        session.modelConnectionId = connectionId;
        sendJson(response, 201, {
          id: connectionId,
          providerId: body.providerId,
          method: body.method,
          status: 'connected',
        });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/jobs') {
        protectMutation(request, session);
        const body = await readJson(request);
        if (!/^[A-Za-z0-9_-]{8,128}$/.test(body.idempotencyKey || '')) {
          throw new HttpError(400, 'unsupported_job');
        }
        const idempotencyId = `${session.id}:${body.operation}:${body.idempotencyKey}`;
        if (idempotency.has(idempotencyId)) {
          sendJson(response, 202, await idempotency.get(idempotencyId));
          return;
        }
        if (session.lifecycle === 'destroyed') throw new HttpError(409, 'session_cleaned_up');
        let activeRecord = session.lastJobId ? jobs.get(`${session.id}:${session.lastJobId}`) : null;
        if (activeRecord && ['queued', 'running'].includes(activeRecord.status)) {
          activeRecord = await reconcileJob(session, activeRecord);
          if (['queued', 'running'].includes(activeRecord.status)) throw new HttpError(409, 'job_in_progress');
        }
        if (body.operation === 'create_ned') {
          if (Object.keys(body).some((key) => !['operation', 'idempotencyKey'].includes(key))) {
            throw new HttpError(400, 'unexpected_job_field');
          }
          if (!session.computeConnectionId || !session.modelConnectionId) {
            throw new HttpError(409, 'connections_required');
          }
          if (session.nedReady) throw new HttpError(409, 'ned_already_ready');
        } else if (body.operation === 'send_first_request') {
          if (Object.keys(body).some((key) => !['operation', 'idempotencyKey', 'prompt'].includes(key))) {
            throw new HttpError(400, 'unexpected_job_field');
          }
          if (typeof body.prompt !== 'string' || body.prompt.trim().length === 0 || body.prompt.length > 4000) {
            throw new HttpError(400, 'invalid_first_request');
          }
          if (!session.nedReady) throw new HttpError(409, 'ned_not_ready');
        } else if (body.operation === 'resume_ned' || body.operation === 'destroy_ned') {
          if (Object.keys(body).some((key) => !['operation', 'idempotencyKey'].includes(key))) {
            throw new HttpError(400, 'unexpected_job_field');
          }
          if (!session.nedReady) throw new HttpError(409, 'ned_not_ready');
        } else {
          throw new HttpError(400, 'unsupported_job');
        }
        const jobPromise = Promise.resolve(jobService.create({
          operation: body.operation,
          ownerId: session.userId,
          sessionId: session.id,
          idempotencyKey: body.idempotencyKey,
          computeConnectionId: session.computeConnectionId,
          modelConnectionId: session.modelConnectionId,
          ...(body.operation === 'send_first_request' ? { prompt: body.prompt } : {}),
        })).then((value) => safeJob(value, body.operation));
        idempotency.set(idempotencyId, jobPromise);
        let job;
        try {
          job = await jobPromise;
        } catch (error) {
          idempotency.delete(idempotencyId);
          throw error;
        }
        const record = { ...job, ownerId: session.userId, sessionId: session.id };
        if (TERMINAL_JOB_STATUSES.has(record.status)) await finalizeTransition(session, record, record);
        jobs.set(`${session.id}:${job.id}`, record);
        session.lastJobId = job.id;
        sendJson(response, 202, publicJob(record));
        return;
      }

      const jobMatch = url.pathname.match(/^\/api\/jobs\/([A-Za-z0-9_-]{1,128})$/);
      if (request.method === 'GET' && jobMatch) {
        let record = jobs.get(`${session.id}:${jobMatch[1]}`);
        if (!record || record.sessionId !== session.id || record.ownerId !== session.userId) {
          throw new HttpError(404, 'job_not_found');
        }
        record = await reconcileJob(session, record);
        sendJson(response, 200, publicJob(record));
        return;
      }
      if (request.method === 'DELETE' && jobMatch) {
        protectMutation(request, session);
        const body = await readJson(request);
        if (Object.keys(body).length !== 0) throw new HttpError(400, 'unexpected_job_field');
        let record = jobs.get(`${session.id}:${jobMatch[1]}`);
        if (!record || record.sessionId !== session.id || record.ownerId !== session.userId) {
          throw new HttpError(404, 'job_not_found');
        }
        record = await reconcileJob(session, record);
        if (!['queued', 'running'].includes(record.status)) throw new HttpError(409, 'job_not_cancellable');
        const cancelled = safeJob(await jobService.cancel({
          jobId: record.id,
          ownerId: session.userId,
          sessionId: session.id,
          compensate: record.operation === 'create_ned',
        }), record.operation);
        if (cancelled.id !== record.id || cancelled.status !== 'cancelled') {
          throw new Error('Job service did not verify cancellation');
        }
        await finalizeTransition(session, record, cancelled);
        Object.assign(record, cancelled);
        sendJson(response, 200, publicJob(record));
        return;
      }

      throw new HttpError(404, 'not_found');
    } catch (error) {
      if (!request.complete) request.resume();
      if (error instanceof HttpError) {
        sendJson(response, error.status, { error: error.code });
        return;
      }
      sendJson(response, 500, { error: 'internal_error' });
    }
  });
}
