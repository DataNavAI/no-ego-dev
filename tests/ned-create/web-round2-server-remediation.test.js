import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createBrowserServer } from '../../src/web/app.js';

const ORIGIN = 'http://127.0.0.1';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function memoryLifecycleStore() {
  const records = new Map();
  return {
    records,
    async loadAll() { return structuredClone([...records.values()]); },
    async save(record) { records.set(record.id, structuredClone(record)); },
    async delete(sessionId) { records.delete(sessionId); },
  };
}

async function start({ lifecycleStore, now = () => Date.now(), jobService: suppliedJobs, secretVault: suppliedVault } = {}) {
  const jobs = new Map();
  const calls = { create: [], get: [], cancel: [], delete: [] };
  let secretPresent = true;
  let sequence = 0;
  const jobService = suppliedJobs || {
    async create(value) {
      calls.create.push(value);
      const job = { id: `job-${++sequence}`, operation: value.operation, status: 'queued' };
      jobs.set(job.id, job);
      return job;
    },
    async get({ jobId }) {
      calls.get.push(jobId);
      return jobs.get(jobId);
    },
    async cancel(value) {
      calls.cancel.push(value);
      const job = { ...jobs.get(value.jobId), status: 'cancelled' };
      jobs.set(job.id, job);
      return job;
    },
  };
  const secretVault = suppliedVault || {
    async put() { secretPresent = true; return { id: 'secret-1' }; },
    async delete(value) {
      calls.delete.push(value);
      secretPresent = false;
      return { id: value.id, status: 'deleted' };
    },
  };
  const server = createBrowserServer({
    publicOrigin: ORIGIN,
    authenticate: async () => ({ userId: 'round2-owner' }),
    secretVault,
    computeConnector: { async connect() { return { id: 'compute-1' }; } },
    jobService,
    lifecycleStore,
    now,
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    server, jobs, calls, jobService,
    hasSecret: () => secretPresent,
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
  return { Origin: ORIGIN, Cookie: auth.cookie, 'X-CSRF-Token': auth.csrfToken, 'Content-Type': 'application/json' };
}

async function connect(context, auth) {
  assert.equal((await fetch(`${context.baseUrl}/api/compute-connections`, {
    method: 'POST', headers: headers(auth), body: JSON.stringify({ providerId: 'daytona' }),
  })).status, 201);
  assert.equal((await fetch(`${context.baseUrl}/api/model-connections`, {
    method: 'POST', headers: headers(auth),
    body: JSON.stringify({ providerId: 'openai', method: 'api-key', credential: 'runtime-only-secret' }),
  })).status, 201);
}

async function submit(context, auth, operation, key, extra = {}) {
  const response = await fetch(`${context.baseUrl}/api/jobs`, {
    method: 'POST', headers: headers(auth), body: JSON.stringify({ operation, idempotencyKey: key, ...extra }),
  });
  return { response, body: await response.json() };
}

async function makeReady(context, auth) {
  const created = await submit(context, auth, 'create_ned', 'create-ready-key');
  assert.equal(created.response.status, 202);
  context.jobs.set(created.body.id, { ...created.body, status: 'succeeded' });
  const response = await fetch(`${context.baseUrl}/api/jobs/${created.body.id}`, { headers: { Cookie: auth.cookie } });
  assert.equal(response.status, 200);
}

test('distinct create keys are single-flight and retain exactly one active intent', async () => {
  const gate = deferred();
  let createCalls = 0;
  const lifecycleStore = memoryLifecycleStore();
  const context = await start({
    lifecycleStore,
    jobService: {
      async create(value) { createCalls += 1; await gate.promise; return { id: 'create-winner', operation: value.operation, status: 'queued' }; },
      async get() { return { id: 'create-winner', operation: 'create_ned', status: 'queued' }; },
      async cancel() { return { id: 'create-winner', operation: 'create_ned', status: 'cancelled' }; },
    },
  });
  try {
    const auth = await signIn(context);
    await connect(context, auth);
    const first = submit(context, auth, 'create_ned', 'distinct-create-a');
    while (createCalls === 0) await new Promise((resolve) => setImmediate(resolve));
    const reserved = [...lifecycleStore.records.values()][0].activeIntent;
    assert.equal(reserved.operation, 'create_ned');
    assert.equal(reserved.submission.idempotencyKey, 'distinct-create-a');
    assert.equal(JSON.stringify(reserved).includes('runtime-only-secret'), false);
    const second = submit(context, auth, 'create_ned', 'distinct-create-b');
    await new Promise((resolve) => setTimeout(resolve, 25));
    gate.resolve();
    const results = await Promise.all([first, second]);
    assert.deepEqual(results.map(({ response }) => response.status), [202, 409]);
    assert.deepEqual(results[1].body, { error: 'job_in_progress' });
    assert.equal(createCalls, 1);
    const session = await fetch(`${context.baseUrl}/api/session`, { headers: { Cookie: auth.cookie } }).then((r) => r.json());
    assert.deepEqual(session.job, { id: 'create-winner', operation: 'create_ned', status: 'queued' });
  } finally { await context.close(); }
});

for (const firstOperation of ['send_first_request', 'resume_ned']) {
  test(`${firstOperation} and destroy admission are single-flight`, async () => {
    const gate = deferred();
    let activeCalls = 0;
    const authoritative = new Map();
    const context = await start({
      jobService: {
        async create(value) {
          if (value.operation === 'create_ned') {
            const job = { id: 'ready-job', operation: value.operation, status: 'succeeded' };
            authoritative.set(job.id, job);
            return job;
          }
          activeCalls += 1;
          await gate.promise;
          const job = { id: `${value.operation}-winner`, operation: value.operation, status: 'queued' };
          authoritative.set(job.id, job);
          return job;
        },
        async get({ jobId }) { return authoritative.get(jobId); },
        async cancel() { assert.fail('cancel must not run'); },
      },
    });
    try {
      const auth = await signIn(context);
      await connect(context, auth);
      await makeReady(context, auth);
      const first = submit(context, auth, firstOperation, `${firstOperation}-race`,
        firstOperation === 'send_first_request' ? { prompt: 'Ship safely.' } : {});
      while (activeCalls === 0) await new Promise((resolve) => setImmediate(resolve));
      const destroy = submit(context, auth, 'destroy_ned', 'destroy-race-key');
      gate.resolve();
      const results = await Promise.all([first, destroy]);
      assert.deepEqual(results.map(({ response }) => response.status), [202, 409]);
      assert.deepEqual(results[1].body, { error: 'job_in_progress' });
      assert.equal(activeCalls, 1);
    } finally { await context.close(); }
  });
}

test('cancellation owns admission until verified compensation and preserves cancelled intent', async () => {
  const cancelGate = deferred();
  let cancelCalls = 0;
  let createCalls = 0;
  let authoritativeStatus = 'queued';
  const context = await start({
    jobService: {
      async create(value) { createCalls += 1; authoritativeStatus = 'queued'; return { id: 'cancel-race-job', operation: value.operation, status: authoritativeStatus }; },
      async get() { return { id: 'cancel-race-job', operation: 'create_ned', status: authoritativeStatus }; },
      async cancel() {
        cancelCalls += 1;
        await cancelGate.promise;
        authoritativeStatus = 'cancelled';
        return { id: 'cancel-race-job', operation: 'create_ned', status: authoritativeStatus };
      },
    },
  });
  try {
    const auth = await signIn(context);
    await connect(context, auth);
    const created = await submit(context, auth, 'create_ned', 'cancel-admission-create');
    const cancellation = fetch(`${context.baseUrl}/api/jobs/${created.body.id}`, { method: 'DELETE', headers: headers(auth), body: '{}' });
    while (cancelCalls === 0) await new Promise((resolve) => setImmediate(resolve));
    const racedCreate = submit(context, auth, 'create_ned', 'cancel-admission-raced');
    cancelGate.resolve();
    const [cancelResponse, raced] = await Promise.all([cancellation, racedCreate]);
    assert.equal(cancelResponse.status, 200);
    assert.equal(raced.response.status, 409);
    assert.deepEqual(raced.body, { error: 'connections_required' });
    assert.equal(createCalls, 1);
    assert.equal(cancelCalls, 1);
    const session = await fetch(`${context.baseUrl}/api/session`, { headers: { Cookie: auth.cookie } }).then((r) => r.json());
    assert.deepEqual(session.job, { id: 'cancel-race-job', operation: 'create_ned', status: 'cancelled' });
  } finally { await context.close(); }
});

test('cleaned sessions reject same and fresh keys for every operation before receipt replay', async () => {
  const context = await start({
    jobService: {
      async create(value) {
        return {
          id: `${value.operation}-terminal`, operation: value.operation, status: 'succeeded',
          ...(value.operation === 'send_first_request' ? { output: 'bounded' } : {}),
        };
      },
      async get({ jobId }) {
        const operation = jobId.replace('-terminal', '');
        return { id: jobId, operation, status: 'succeeded', ...(operation === 'send_first_request' ? { output: 'bounded' } : {}) };
      },
      async cancel() { assert.fail('cancel must not run'); },
    },
  });
  try {
    const auth = await signIn(context);
    await connect(context, auth);
    const requests = [
      ['create_ned', 'same-create-key', {}],
      ['send_first_request', 'same-request-key', { prompt: 'hello' }],
      ['resume_ned', 'same-resume-key', {}],
      ['destroy_ned', 'same-destroy-key', {}],
    ];
    for (const [operation, key, extra] of requests) {
      const result = await submit(context, auth, operation, key, extra);
      assert.equal(result.response.status, 202, operation);
    }
    for (const [operation, sameKey, extra] of requests) {
      for (const key of [sameKey, `fresh-${operation}-key`]) {
        const result = await submit(context, auth, operation, key, extra);
        assert.equal(result.response.status, 409, `${operation}:${key}`);
        assert.deepEqual(result.body, { error: 'session_cleaned_up' });
      }
    }
  } finally { await context.close(); }
});

test('abandonment compensates queued and running create before deleting session state', async () => {
  for (const status of ['queued', 'running']) {
    const context = await start();
    try {
      const auth = await signIn(context);
      await connect(context, auth);
      const created = await submit(context, auth, 'create_ned', `abandon-${status}`);
      context.jobs.set(created.body.id, { ...created.body, status });
      const response = await fetch(`${context.baseUrl}/api/session`, { method: 'DELETE', headers: headers(auth), body: '{}' });
      assert.equal(response.status, 204, status);
      assert.equal(context.calls.cancel.length, 1, status);
      assert.equal(context.calls.cancel[0].compensate, true);
      assert.equal(context.hasSecret(), false);
      const readback = await fetch(`${context.baseUrl}/api/session`, { headers: { Cookie: auth.cookie } });
      assert.equal(readback.status, 401);
      assert.equal((await readback.text()).includes('secret-1'), false);
      assert.equal((await fetch(`${context.baseUrl}/api/jobs/${created.body.id}`, { headers: { Cookie: auth.cookie } })).status, 401);
    } finally { await context.close(); }
  }
});

test('cleanup failure is durable, blocks readback, and restart retry verifies compensation and revocation', async () => {
  const lifecycleStore = memoryLifecycleStore();
  let cancelFails = true;
  let deleteFails = true;
  const authoritative = new Map();
  const calls = { cancel: 0, deletes: 0 };
  const jobService = {
    async create(value) {
      const job = { id: 'restart-job', operation: value.operation, status: 'running' };
      authoritative.set(job.id, job);
      return job;
    },
    async get({ jobId }) { return authoritative.get(jobId); },
    async cancel({ jobId }) {
      calls.cancel += 1;
      if (cancelFails) throw new Error('compensation unavailable');
      const job = { ...authoritative.get(jobId), status: 'cancelled' };
      authoritative.set(jobId, job);
      return job;
    },
  };
  const secretVault = {
    async put() { return { id: 'restart-secret' }; },
    async delete({ id }) {
      calls.deletes += 1;
      if (deleteFails) throw new Error('revocation unavailable');
      return { id, status: 'deleted' };
    },
  };
  let context = await start({ lifecycleStore, jobService, secretVault });
  const auth = await signIn(context);
  await connect(context, auth);
  await submit(context, auth, 'create_ned', 'restart-create-key');
  let response = await fetch(`${context.baseUrl}/api/session`, { method: 'DELETE', headers: headers(auth), body: '{}' });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'cleanup_pending' });
  assert.equal(lifecycleStore.records.size, 1);
  assert.equal((await fetch(`${context.baseUrl}/api/session`, { headers: { Cookie: auth.cookie } })).status, 409);
  await context.close();

  cancelFails = false;
  context = await start({ lifecycleStore, jobService, secretVault });
  response = await fetch(`${context.baseUrl}/api/session`, { method: 'DELETE', headers: headers(auth), body: '{}' });
  assert.equal(response.status, 503);
  assert.equal(lifecycleStore.records.size, 1);
  assert.equal(calls.cancel >= 2, true);
  await context.close();

  deleteFails = false;
  context = await start({ lifecycleStore, jobService, secretVault });
  response = await fetch(`${context.baseUrl}/api/session`, { method: 'DELETE', headers: headers(auth), body: '{}' });
  assert.equal(response.status, 204);
  assert.equal(lifecycleStore.records.size, 0);
  assert.equal((await fetch(`${context.baseUrl}/api/session`, { headers: { Cookie: auth.cookie } })).status, 401);
  await context.close();
});

test('restart recovers a reserved create by the same idempotency envelope before compensation', async () => {
  const lifecycleStore = memoryLifecycleStore();
  const authoritative = new Map();
  const calls = { create: [], cancel: [] };
  const jobService = {
    async create(value) {
      calls.create.push(value);
      const job = { id: 'recovered-reservation-job', operation: value.operation, status: 'queued' };
      authoritative.set(job.id, job);
      return job;
    },
    async get({ jobId }) { return authoritative.get(jobId); },
    async cancel(value) {
      calls.cancel.push(value);
      const job = { ...authoritative.get(value.jobId), status: 'cancelled' };
      authoritative.set(job.id, job);
      return job;
    },
  };
  let context = await start({ lifecycleStore, jobService });
  const auth = await signIn(context);
  await connect(context, auth);
  const snapshot = [...lifecycleStore.records.values()][0];
  snapshot.activeIntent = {
    operation: 'create_ned',
    idempotencyId: `${snapshot.id}:create_ned:recover-reservation-key`,
    submission: {
      operation: 'create_ned', ownerId: snapshot.userId, sessionId: snapshot.id,
      idempotencyKey: 'recover-reservation-key', computeConnectionId: snapshot.computeConnectionId,
      modelConnectionId: snapshot.modelConnectionId,
    },
  };
  snapshot.jobs = [];
  snapshot.idempotency = [];
  delete snapshot.lastJobId;
  await lifecycleStore.save(snapshot);
  await context.close();

  context = await start({ lifecycleStore, jobService });
  try {
    const response = await fetch(`${context.baseUrl}/api/session`, { method: 'DELETE', headers: headers(auth), body: '{}' });
    assert.equal(response.status, 204);
    assert.equal(calls.create.length, 1);
    assert.equal(calls.create[0].idempotencyKey, 'recover-reservation-key');
    assert.equal(calls.cancel.length, 1);
    assert.equal(calls.cancel[0].compensate, true);
    assert.equal(lifecycleStore.records.size, 0);
  } finally { await context.close(); }
});

test('production-style expiry sweeper compensates active creates without traffic and retries failures', async () => {
  let clock = 10_000;
  let cancelFails = true;
  const lifecycleStore = memoryLifecycleStore();
  const authoritative = new Map();
  let cancellations = 0;
  const context = await start({
    lifecycleStore,
    now: () => clock,
    jobService: {
      async create(value) {
        const job = { id: 'expiry-job', operation: value.operation, status: 'queued' };
        authoritative.set(job.id, job);
        return job;
      },
      async get({ jobId }) { return authoritative.get(jobId); },
      async cancel({ jobId }) {
        cancellations += 1;
        if (cancelFails) throw new Error('temporary cleanup failure');
        const job = { ...authoritative.get(jobId), status: 'cancelled' };
        authoritative.set(jobId, job);
        return job;
      },
    },
  });
  try {
    const auth = await signIn(context);
    await connect(context, auth);
    await submit(context, auth, 'create_ned', 'expiry-create-key');
    clock += 3_600_001;
    const first = await context.server.sweepExpiredSessions();
    assert.deepEqual(first, { examined: 1, cleaned: 0, pending: 1 });
    assert.equal(lifecycleStore.records.size, 1);
    cancelFails = false;
    const retry = await context.server.sweepExpiredSessions();
    assert.deepEqual(retry, { examined: 1, cleaned: 1, pending: 0 });
    assert.equal(cancellations, 2);
    assert.equal(lifecycleStore.records.size, 0);
    assert.equal((await fetch(`${context.baseUrl}/api/session`, { headers: { Cookie: auth.cookie } })).status, 401);
  } finally { await context.close(); }
});

test('expiry sweeper compensates a running create and leaves zero session or secret readback', async () => {
  let clock = 5_000;
  const authoritative = new Map();
  const lifecycleStore = memoryLifecycleStore();
  const context = await start({
    lifecycleStore,
    now: () => clock,
    jobService: {
      async create(value) {
        const job = { id: 'running-expiry-job', operation: value.operation, status: 'running' };
        authoritative.set(job.id, job);
        return job;
      },
      async get({ jobId }) { return authoritative.get(jobId); },
      async cancel({ jobId, compensate }) {
        assert.equal(compensate, true);
        const job = { ...authoritative.get(jobId), status: 'cancelled' };
        authoritative.set(jobId, job);
        return job;
      },
    },
  });
  try {
    const auth = await signIn(context);
    await connect(context, auth);
    await submit(context, auth, 'create_ned', 'running-expiry-key');
    clock += 3_600_001;
    assert.deepEqual(await context.server.sweepExpiredSessions(), { examined: 1, cleaned: 1, pending: 0 });
    assert.equal(context.hasSecret(), false);
    assert.equal(lifecycleStore.records.size, 0);
    assert.equal((await fetch(`${context.baseUrl}/api/session`, { headers: { Cookie: auth.cookie } })).status, 401);
  } finally { await context.close(); }
});

function persistedSession(operation, key) {
  const id = `restart-${operation}`;
  return {
    id,
    userId: 'round2-owner',
    displayName: 'Round 2 owner',
    csrfToken: `csrf-${operation}`,
    expiresAt: Date.now() + 3_600_000,
    mutationMinute: Math.floor(Date.now() / 60_000),
    mutationCount: 0,
    computeConnectionId: 'compute-1',
    modelConnectionId: 'model-1',
    nedReady: operation !== 'create_ned',
    lifecycle: 'active',
    activeIntent: {
      operation,
      idempotencyId: `${id}:${operation}:${key}`,
      jobId: `reserved-${operation}`,
      submission: {
        operation,
        ownerId: 'round2-owner',
        sessionId: id,
        idempotencyKey: key,
        computeConnectionId: 'compute-1',
        modelConnectionId: 'model-1',
      },
    },
    jobs: [],
    idempotency: [],
  };
}

function persistedAuth(operation) {
  return { cookie: `ned_session=restart-${operation}`, csrfToken: `csrf-${operation}` };
}

test('restart recovers every persisted active intent before admitting same or different keys without replaying inference', async () => {
  for (const operation of ['create_ned', 'send_first_request', 'resume_ned', 'destroy_ned']) {
    const key = `${operation}-reserved-key`;
    const lifecycleStore = memoryLifecycleStore();
    await lifecycleStore.save(persistedSession(operation, key));
    const authoritative = new Map();
    let adapterCalls = 0;
    let sideEffects = 0;
    const jobService = {
      async create(value) {
        adapterCalls += 1;
        assert.notEqual(operation, 'send_first_request', 'restart must not replay inference without a retained prompt');
        const effectKey = `${value.operation}:${value.idempotencyKey}`;
        if (!authoritative.has(effectKey)) {
          sideEffects += 1;
          authoritative.set(effectKey, { id: `recovered-${operation}`, operation, status: 'queued' });
        }
        return authoritative.get(effectKey);
      },
      async get({ jobId }) {
        return [...authoritative.values()].find(({ id }) => id === jobId);
      },
      async cancel() { assert.fail('cancel must not run'); },
    };
    const context = await start({ lifecycleStore, jobService });
    const auth = persistedAuth(operation);
    try {
      const restoredResponse = await fetch(`${context.baseUrl}/api/session`, { headers: { Cookie: auth.cookie } });
      const restored = await restoredResponse.json();
      assert.equal(restoredResponse.status, 200, operation);
      assert.deepEqual(restored.job, operation === 'send_first_request'
        ? { id: `reserved-${operation}`, operation, status: 'blocked' }
        : { id: `recovered-${operation}`, operation, status: 'queued' }, operation);

      const same = await submit(context, auth, operation, key,
        operation === 'send_first_request' ? { prompt: 'Never persist or replay me.' } : {});
      assert.equal(same.response.status, 202, `${operation}:same`);
      assert.deepEqual(same.body, restored.job, `${operation}:same`);

      const different = await submit(context, auth, operation, `${operation}-different-key`,
        operation === 'send_first_request' ? { prompt: 'A different request.' } : {});
      assert.equal(different.response.status, 409, `${operation}:different`);
      assert.deepEqual(different.body, { error: 'job_in_progress' }, `${operation}:different`);
      assert.equal(adapterCalls, operation === 'send_first_request' ? 0 : 1, `${operation}:adapter calls`);
      assert.equal(sideEffects, operation === 'send_first_request' ? 0 : 1, `${operation}:side effects`);

      const snapshotText = JSON.stringify([...lifecycleStore.records.values()][0]);
      assert.equal(snapshotText.includes('Never persist or replay me.'), false, `${operation}:prompt privacy`);
      assert.equal(snapshotText.includes('A different request.'), false, `${operation}:different prompt privacy`);
    } finally { await context.close(); }
  }
});

test('restart preserves durable job and receipt identity for every typed operation and exact-key first-request output readback', async () => {
  for (const operation of ['create_ned', 'send_first_request', 'resume_ned', 'destroy_ned']) {
    const key = `${operation}-completed-key`;
    const lifecycleStore = memoryLifecycleStore();
    const session = persistedSession(operation, key);
    session.activeIntent = null;
    await lifecycleStore.save(session);
    const jobsByKey = new Map();
    let adapterCalls = 0;
    let sideEffects = 0;
    const jobService = {
      async create(value) {
        adapterCalls += 1;
        const effectKey = `${value.operation}:${value.idempotencyKey}`;
        if (!jobsByKey.has(effectKey)) {
          sideEffects += 1;
          jobsByKey.set(effectKey, {
            id: `${operation}-job-${sideEffects}`,
            operation,
            status: operation === 'send_first_request' ? 'succeeded' : 'queued',
            ...(operation === 'send_first_request' ? { output: `exact-output-${sideEffects}` } : {}),
          });
        }
        return jobsByKey.get(effectKey);
      },
      async get({ jobId }) {
        return [...jobsByKey.values()].find(({ id }) => id === jobId);
      },
      async cancel() { assert.fail('cancel must not run'); },
    };
    const auth = persistedAuth(operation);
    let context = await start({ lifecycleStore, jobService });
    const first = await submit(context, auth, operation, key,
      operation === 'send_first_request' ? { prompt: 'Private first prompt.' } : {});
    assert.equal(first.response.status, 202, `${operation}:first`);
    await context.close();

    const durable = [...lifecycleStore.records.values()][0];
    assert.equal(durable.jobs.length, 1, `${operation}:durable job`);
    assert.equal(durable.idempotency.length, 1, `${operation}:durable receipt`);
    assert.equal(JSON.stringify(durable).includes('Private first prompt.'), false, `${operation}:no prompt persistence`);
    assert.equal(JSON.stringify(durable).includes('exact-output-1'), false, `${operation}:no output persistence`);

    context = await start({ lifecycleStore, jobService });
    try {
      const restored = await fetch(`${context.baseUrl}/api/session`, { headers: { Cookie: auth.cookie } }).then((r) => r.json());
      const same = await submit(context, auth, operation, key,
        operation === 'send_first_request' ? { prompt: 'Private first prompt.' } : {});
      assert.equal(same.response.status, 202, `${operation}:same status`);
      assert.equal(same.body.id, first.body.id, `${operation}:same job identity`);
      assert.deepEqual(same.body, restored.job, `${operation}:authoritative readback`);
      if (operation === 'send_first_request') {
        assert.equal(same.body.output, 'exact-output-1');
        const different = await submit(context, auth, operation, `${operation}-different-key`, { prompt: 'New private prompt.' });
        assert.equal(different.response.status, 202);
        assert.equal(adapterCalls, 2, 'a different request is one new inference, not an exact-key replay');
        assert.equal(sideEffects, 2);
      } else {
        const different = await submit(context, auth, operation, `${operation}-different-key`);
        assert.equal(different.response.status, 409, `${operation}:different status`);
        assert.equal(adapterCalls, 1, `${operation}:no duplicate adapter submission`);
        assert.equal(sideEffects, 1, `${operation}:one side effect`);
      }
    } finally { await context.close(); }
  }
});
