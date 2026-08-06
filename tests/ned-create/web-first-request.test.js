import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createBrowserServer } from '../../src/web/app.js';

const ORIGIN = 'http://127.0.0.1';

async function start() {
  const calls = [];
  const server = createBrowserServer({
    publicOrigin: ORIGIN,
    authenticate: async () => ({ userId: 'first-request-owner' }),
    secretVault: { async put() { return { id: 'model-1' }; } },
    computeConnector: { async connect() { return { id: 'compute-1' }; } },
    jobService: {
      async create(value) {
        calls.push(value);
        if (value.operation === 'create_ned') {
          return { id: 'create-job', operation: value.operation, status: 'succeeded' };
        }
        return {
          id: 'request-job', operation: value.operation, status: 'succeeded',
          output: `NED received: ${value.prompt}`,
        };
      },
      async cancel({ jobId }) { return { id: jobId, operation: 'create_ned', status: 'cancelled' }; },
    },
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    calls,
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

async function signIn(context) {
  const response = await fetch(`${context.baseUrl}/api/session`, {
    method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json' }, body: '{}',
  });
  const body = await response.json();
  return {
    cookie: response.headers.get('set-cookie').split(';', 1)[0],
    csrfToken: body.csrfToken,
  };
}

function headers(auth) {
  return {
    Origin: ORIGIN,
    Cookie: auth.cookie,
    'X-CSRF-Token': auth.csrfToken,
    'Content-Type': 'application/json',
  };
}

async function connectAndCreate(context, auth) {
  await fetch(`${context.baseUrl}/api/compute-connections`, {
    method: 'POST', headers: headers(auth), body: JSON.stringify({ providerId: 'daytona' }),
  });
  await fetch(`${context.baseUrl}/api/model-connections`, {
    method: 'POST', headers: headers(auth),
    body: JSON.stringify({ providerId: 'openai', method: 'api-key', credential: 'generated-runtime-value' }),
  });
  return fetch(`${context.baseUrl}/api/jobs`, {
    method: 'POST', headers: headers(auth),
    body: JSON.stringify({ operation: 'create_ned', idempotencyKey: 'create-ready-1' }),
  });
}

test('first request is a typed, bounded, session-owned operation available only after create succeeds', async () => {
  const context = await start();
  try {
    const auth = await signIn(context);
    const tooEarly = await fetch(`${context.baseUrl}/api/jobs`, {
      method: 'POST', headers: headers(auth),
      body: JSON.stringify({ operation: 'send_first_request', prompt: 'Help me plan.', idempotencyKey: 'request-early-1' }),
    });
    assert.equal(tooEarly.status, 409);

    const create = await connectAndCreate(context, auth);
    assert.equal(create.status, 202);
    assert.equal((await create.json()).status, 'succeeded');

    const requestBody = JSON.stringify({
      operation: 'send_first_request', prompt: 'Help me plan a launch.', idempotencyKey: 'first-request-1',
    });
    const first = await fetch(`${context.baseUrl}/api/jobs`, {
      method: 'POST', headers: headers(auth), body: requestBody,
    });
    const repeated = await fetch(`${context.baseUrl}/api/jobs`, {
      method: 'POST', headers: headers(auth), body: requestBody,
    });
    const firstValue = await first.json();
    assert.equal(first.status, 202);
    assert.deepEqual(firstValue, {
      id: 'request-job', operation: 'send_first_request', status: 'succeeded',
      output: 'NED received: Help me plan a launch.',
    });
    assert.deepEqual(await repeated.json(), firstValue);
    assert.equal(context.calls.filter(({ operation }) => operation === 'send_first_request').length, 1);
    assert.equal(context.calls.at(-1).ownerId, 'first-request-owner');
    assert.equal(context.calls.at(-1).prompt, 'Help me plan a launch.');

    const resumed = await fetch(`${context.baseUrl}/api/session`, { headers: { Cookie: auth.cookie } });
    const resumedValue = await resumed.json();
    assert.equal(resumedValue.nedReady, true);
    assert.equal(resumedValue.job.operation, 'send_first_request');
    assert.equal(resumedValue.job.output, 'NED received: Help me plan a launch.');
  } finally { await context.close(); }
});

test('first request rejects empty, oversized, and unexpected payload fields without job execution', async () => {
  const context = await start();
  try {
    const auth = await signIn(context);
    await connectAndCreate(context, auth);
    const baseline = context.calls.length;
    const invalidKey = (kind) => ['invalid', kind, '1'].join('-');
    for (const body of [
      { operation: 'send_first_request', prompt: '', idempotencyKey: invalidKey('empty') },
      { operation: 'send_first_request', prompt: 'x'.repeat(4001), idempotencyKey: invalidKey('large') },
      { operation: 'send_first_request', prompt: 'Hello', command: 'whoami', idempotencyKey: invalidKey('extra') },
    ]) {
      const response = await fetch(`${context.baseUrl}/api/jobs`, {
        method: 'POST', headers: headers(auth), body: JSON.stringify(body),
      });
      assert.equal(response.status, 400);
    }
    assert.equal(context.calls.length, baseline);
  } finally { await context.close(); }
});
