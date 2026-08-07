import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { createBrowserServer } from '../../src/web/app.js';

const ORIGIN = 'http://127.0.0.1';

async function start(overrides = {}) {
  const secretRecords = new Map();
  const calls = { authenticate: 0, compute: 0, create: [], get: [], cancel: [], put: [], delete: [] };
  let secretSequence = 0;
  const authoritativeJobs = new Map();
  const server = createBrowserServer({
    publicOrigin: ORIGIN,
    authenticate: async () => { calls.authenticate += 1; return { userId: 'round1-owner' }; },
    secretVault: {
      async put(value) {
        calls.put.push(value);
        const id = `model-${++secretSequence}`;
        secretRecords.set(id, value.ownerId);
        return { id };
      },
      async delete(value) {
        calls.delete.push(value);
        assert.equal(secretRecords.get(value.id), value.ownerId);
        secretRecords.delete(value.id);
        return { id: value.id, status: 'deleted' };
      },
    },
    computeConnector: {
      async connect() { calls.compute += 1; return { id: 'compute-1' }; },
    },
    jobService: {
      async create(value) {
        calls.create.push(value);
        const id = `${value.operation}-${calls.create.length}`;
        const job = { id, operation: value.operation, status: 'queued' };
        authoritativeJobs.set(id, job);
        return job;
      },
      async get(value) {
        calls.get.push(value);
        return authoritativeJobs.get(value.jobId);
      },
      async cancel(value) {
        calls.cancel.push(value);
        const current = authoritativeJobs.get(value.jobId);
        const cancelled = { ...current, status: 'cancelled' };
        authoritativeJobs.set(value.jobId, cancelled);
        return cancelled;
      },
    },
    ...overrides,
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    server,
    calls,
    secretRecords,
    authoritativeJobs,
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

async function signIn(context) {
  const response = await fetch(`${context.baseUrl}/api/session`, {
    method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json' }, body: '{}',
  });
  assert.equal(response.status, 201);
  const body = await response.json();
  return { cookie: response.headers.get('set-cookie').split(';', 1)[0], csrfToken: body.csrfToken };
}

function headers(auth) {
  return {
    Origin: ORIGIN,
    Cookie: auth.cookie,
    'X-CSRF-Token': auth.csrfToken,
    'Content-Type': 'application/json',
  };
}

async function connect(context, auth) {
  assert.equal((await fetch(`${context.baseUrl}/api/compute-connections`, {
    method: 'POST', headers: headers(auth), body: JSON.stringify({ providerId: 'daytona' }),
  })).status, 201);
  assert.equal((await fetch(`${context.baseUrl}/api/model-connections`, {
    method: 'POST', headers: headers(auth),
    body: JSON.stringify({ providerId: 'openai', method: 'api-key', credential: 'generated-runtime-value' }),
  })).status, 201);
}

async function createJob(context, auth, operation, suffix, extra = {}) {
  const response = await fetch(`${context.baseUrl}/api/jobs`, {
    method: 'POST', headers: headers(auth),
    body: JSON.stringify({ operation, idempotencyKey: `${operation}-${suffix}`, ...extra }),
  });
  return { response, body: await response.json() };
}

async function getJob(context, auth, id) {
  const response = await fetch(`${context.baseUrl}/api/jobs/${id}`, { headers: { Cookie: auth.cookie } });
  return { response, body: await response.json() };
}

test('authoritative async jobs progress across GET and refresh, then typed resume and destroy complete', async () => {
  const context = await start();
  try {
    const auth = await signIn(context);
    await connect(context, auth);
    const created = await createJob(context, auth, 'create_ned', 'async-1');
    assert.equal(created.response.status, 202);
    assert.equal(created.body.status, 'queued');

    context.authoritativeJobs.set(created.body.id, { ...created.body, status: 'running' });
    assert.equal((await getJob(context, auth, created.body.id)).body.status, 'running');
    context.authoritativeJobs.set(created.body.id, { ...created.body, status: 'succeeded' });
    assert.equal((await getJob(context, auth, created.body.id)).body.status, 'succeeded');

    const refreshed = await fetch(`${context.baseUrl}/api/session`, { headers: { Cookie: auth.cookie } }).then((r) => r.json());
    assert.equal(refreshed.nedReady, true);
    assert.equal(refreshed.job.status, 'succeeded');

    const resumed = await createJob(context, auth, 'resume_ned', 'async-1');
    assert.equal(resumed.response.status, 202);
    context.authoritativeJobs.set(resumed.body.id, { ...resumed.body, status: 'succeeded' });
    assert.equal((await getJob(context, auth, resumed.body.id)).body.status, 'succeeded');

    const destroyed = await createJob(context, auth, 'destroy_ned', 'async-1');
    assert.equal(destroyed.response.status, 202);
    context.authoritativeJobs.set(destroyed.body.id, { ...destroyed.body, status: 'succeeded' });
    assert.equal((await getJob(context, auth, destroyed.body.id)).body.status, 'succeeded');
    const cleaned = await fetch(`${context.baseUrl}/api/session`, { headers: { Cookie: auth.cookie } }).then((r) => r.json());
    assert.equal(cleaned.nedReady, false);
    assert.deepEqual(cleaned.connections, { compute: false, model: false });
    const rejected = await createJob(context, auth, 'create_ned', 'after-cleanup');
    assert.equal(rejected.response.status, 409);
    assert.deepEqual(rejected.body, { error: 'session_cleaned_up' });
    assert.equal(context.secretRecords.size, 0);
  } finally { await context.close(); }
});

test('cancellation refreshes authority and rejects a create that already succeeded', async () => {
  const context = await start();
  try {
    const auth = await signIn(context);
    await connect(context, auth);
    const created = await createJob(context, auth, 'create_ned', 'cancel-race');
    context.authoritativeJobs.set(created.body.id, { ...created.body, status: 'succeeded' });

    const cancellation = await fetch(`${context.baseUrl}/api/jobs/${created.body.id}`, {
      method: 'DELETE', headers: headers(auth), body: '{}',
    });
    assert.equal(cancellation.status, 409);
    assert.deepEqual(await cancellation.json(), { error: 'job_not_cancellable' });
    assert.equal(context.calls.cancel.length, 0);

    const session = await fetch(`${context.baseUrl}/api/session`, { headers: { Cookie: auth.cookie } }).then((r) => r.json());
    assert.equal(session.nedReady, true);
    assert.equal(session.job.status, 'succeeded');
    const request = await createJob(context, auth, 'send_first_request', 'after-race', { prompt: 'Continue safely.' });
    assert.equal(request.response.status, 202);
  } finally { await context.close(); }
});

test('owner-scoped secret lifecycle compensates invalid writes, supersedes, and abandons without orphans', async () => {
  const records = new Map();
  let sequence = 0;
  const deletes = [];
  const context = await start({
    secretVault: {
      async put({ ownerId, value }) {
        const id = value === 'invalid-receipt-value' ? 'unsafe\nreceipt' : `owned-${++sequence}`;
        records.set(id, ownerId);
        return { id };
      },
      async delete({ ownerId, id }) {
        deletes.push({ ownerId, id });
        assert.equal(records.get(id), ownerId);
        records.delete(id);
        return { id, status: 'deleted' };
      },
    },
  });
  try {
    const auth = await signIn(context);
    const invalid = await fetch(`${context.baseUrl}/api/model-connections`, {
      method: 'POST', headers: headers(auth),
      body: JSON.stringify({ providerId: 'openai', method: 'api-key', credential: 'invalid-receipt-value' }),
    });
    assert.equal(invalid.status, 500);
    assert.equal(records.size, 0);

    for (const credential of ['first-valid-value', 'second-valid-value']) {
      assert.equal((await fetch(`${context.baseUrl}/api/model-connections`, {
        method: 'POST', headers: headers(auth),
        body: JSON.stringify({ providerId: 'openai', method: 'api-key', credential }),
      })).status, 201);
    }
    assert.equal(records.size, 1);
    assert.ok(deletes.every(({ ownerId }) => ownerId === 'round1-owner'));

    const abandoned = await fetch(`${context.baseUrl}/api/session`, {
      method: 'DELETE', headers: headers(auth), body: '{}',
    });
    assert.equal(abandoned.status, 204);
    assert.equal(records.size, 0);
  } finally { await context.close(); }
});

test('every API endpoint rejects query strings before auth, body, or adapters', async () => {
  const context = await start();
  try {
    const requests = [
      ['POST', '/api/session?credential=sentinel'],
      ['GET', '/api/session?credential=sentinel'],
      ['DELETE', '/api/session?credential=sentinel'],
      ['GET', '/api/model-providers?credential=sentinel'],
      ['POST', '/api/compute-connections?credential=sentinel'],
      ['POST', '/api/model-connections?credential=sentinel'],
      ['POST', '/api/jobs?prompt=sentinel'],
      ['GET', '/api/jobs/job-1?prompt=sentinel'],
      ['DELETE', '/api/jobs/job-1?prompt=sentinel'],
    ];
    for (const [method, path] of requests) {
      const response = await fetch(`${context.baseUrl}${path}`, {
        method,
        headers: { Origin: 'https://attacker.invalid', 'Content-Type': 'application/json' },
        ...(['POST', 'DELETE'].includes(method) ? { body: '{not-json' } : {}),
      });
      assert.equal(response.status, 400, `${method} ${path}`);
      assert.deepEqual(await response.json(), { error: 'query_not_allowed' });
    }
    assert.deepEqual(context.calls, {
      authenticate: 0, compute: 0, create: [], get: [], cancel: [], put: [], delete: [],
    });
  } finally { await context.close(); }
});

test('versioned governing contracts make the Daytona CLI lifecycle authoritative and park browser work', async () => {
  const paths = ['PRD.md', 'TECH_SPEC.md', 'CUJ.md'];
  const documents = await Promise.all(paths.map((name) => readFile(new URL(`../../docs/ned-create/${name}`, import.meta.url), 'utf8')));
  for (const [index, document] of documents.entries()) {
    assert.match(document, /Contract version: 3\.0/, paths[index]);
    assert.match(document, /Daytona/i, paths[index]);
    assert.match(document, /CLI/i, paths[index]);
    assert.match(document, /browser/i, paths[index]);
    assert.match(document, /parked|future scope/i, paths[index]);
    assert.match(document, /AWS/i, paths[index]);
  }
  const combined = documents.join('\n');
  for (const command of ['create', 'chat', 'doctor', 'repair', 'destroy']) {
    assert.match(combined, new RegExp(`\\b${command}\\b`));
  }
  for (const required of [
    /OpenRouter/, /PKCE/, /private[^\n]+persistent[^\n]+Sandbox/i,
    /checksum/i, /direct[^\n]+readback/i, /zero[^\n-]+resource/i,
    /no generic arbitrary-command API/i,
  ]) assert.match(combined, required);
});

test('illegal regressions and overlapping lifecycle operations fail closed', async () => {
  const context = await start();
  try {
    const auth = await signIn(context);
    await connect(context, auth);
    const created = await createJob(context, auth, 'create_ned', 'transition-1');
    context.authoritativeJobs.set(created.body.id, { ...created.body, status: 'running' });
    assert.equal((await getJob(context, auth, created.body.id)).body.status, 'running');

    const overlap = await createJob(context, auth, 'create_ned', 'transition-2');
    assert.equal(overlap.response.status, 409);
    assert.deepEqual(overlap.body, { error: 'job_in_progress' });
    assert.equal(context.calls.create.length, 1);

    context.authoritativeJobs.set(created.body.id, { ...created.body, status: 'queued' });
    const regression = await getJob(context, auth, created.body.id);
    assert.equal(regression.response.status, 500);
    assert.deepEqual(regression.body, { error: 'internal_error' });
  } finally { await context.close(); }
});

test('cancel, failed retry, and expiry revoke owner secrets with zero orphans', async () => {
  let clock = 1_000;
  let sequence = 0;
  const records = new Map();
  const deletes = [];
  const context = await start({
    now: () => clock,
    secretVault: {
      async put({ ownerId }) {
        const id = `secret-${++sequence}`;
        records.set(id, ownerId);
        return { id };
      },
      async delete({ ownerId, id }) {
        assert.equal(records.get(id), ownerId);
        records.delete(id);
        deletes.push({ ownerId, id });
        return { id, status: 'deleted' };
      },
    },
  });
  try {
    const auth = await signIn(context);
    await connect(context, auth);
    const first = await createJob(context, auth, 'create_ned', 'cancel-cleanup');
    const cancelled = await fetch(`${context.baseUrl}/api/jobs/${first.body.id}`, {
      method: 'DELETE', headers: headers(auth), body: '{}',
    });
    assert.equal(cancelled.status, 200);
    assert.equal(records.size, 0);

    await connect(context, auth);
    const retry = await createJob(context, auth, 'create_ned', 'failed-retry');
    context.authoritativeJobs.set(retry.body.id, { ...retry.body, status: 'failed' });
    assert.equal((await getJob(context, auth, retry.body.id)).body.status, 'failed');
    assert.equal(records.size, 0);

    await connect(context, auth);
    assert.equal(records.size, 1);
    clock += 3_600_001;
    const expired = await fetch(`${context.baseUrl}/api/session`, { headers: headers(auth) });
    assert.equal(expired.status, 401);
    assert.equal(records.size, 0);
    assert.equal(deletes.length, 3);
    assert.ok(deletes.every(({ ownerId }) => ownerId === 'round1-owner'));
  } finally { await context.close(); }
});
