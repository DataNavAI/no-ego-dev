import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createBrowserServer } from '../../src/web/app.js';

const ORIGIN = 'http://127.0.0.1';

async function start(overrides = {}) {
  const secrets = [];
  const computeCalls = [];
  const jobCalls = [];
  const server = createBrowserServer({
    publicOrigin: ORIGIN,
    authenticate: async () => ({ userId: 'user-1', displayName: 'Test owner' }),
    secretVault: {
      async put(value) { secrets.push(value); return { id: `model-${secrets.length}` }; },
      async delete({ id }) {
        const index = Number(id.split('-').at(-1)) - 1;
        if (index >= 0) secrets.splice(index, 1);
        return { id, status: 'deleted' };
      },
    },
    computeConnector: {
      async connect(value) { computeCalls.push(value); return { id: 'compute-1', providerId: 'daytona' }; },
    },
    jobService: {
      async create(value) { jobCalls.push(value); return { id: 'job-1', status: 'queued', operation: value.operation }; },
      async get({ jobId }) { return { id: jobId, status: 'queued', operation: 'create_ned' }; },
      async cancel(value) { jobCalls.push({ cancel: value }); return { id: value.jobId, status: 'cancelled', operation: 'create_ned' }; },
    },
    ...overrides,
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  return {
    baseUrl, secrets, computeCalls, jobCalls,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

async function json(response) {
  const value = await response.json();
  return { response, value };
}

async function signIn(context) {
  const { response, value } = await json(await fetch(`${context.baseUrl}/api/session`, {
    method: 'POST',
    headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
    body: '{}',
  }));
  assert.equal(response.status, 201);
  const cookie = response.headers.get('set-cookie').split(';', 1)[0];
  return { cookie, csrfToken: value.csrfToken };
}

function authorizedHeaders(auth) {
  return {
    Origin: ORIGIN,
    Cookie: auth.cookie,
    'X-CSRF-Token': auth.csrfToken,
    'Content-Type': 'application/json',
  };
}

test('browser shell renders the five-action provider-neutral onboarding journey with security headers', async () => {
  const context = await start();
  try {
    const response = await fetch(`${context.baseUrl}/`);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-security-policy'), /default-src 'self'/);
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    for (const action of ['sign-in', 'connect-compute', 'connect-model', 'create-ned', 'first-request', 'resume-ned', 'destroy-ned']) {
      assert.match(html, new RegExp(`data-action="${action}"`));
    }
    for (const provider of ['OpenAI', 'Anthropic', 'Gemini', 'OpenRouter']) assert.match(html, new RegExp(provider));
    const client = await fetch(`${context.baseUrl}/app.js`).then((result) => result.text());
    assert.match(client, /operation: 'send_first_request'/);
    assert.match(client, /operation: 'resume_ned'/);
    assert.match(client, /operation: 'destroy_ned'/);
    assert.match(client, /async function waitForJob/);
    assert.match(client, /api\(`\/api\/jobs\/\$\{encodeURIComponent\(job\.id\)\}`\)/);
    assert.match(client, /output\.textContent = job\.output/);
    assert.doesNotMatch(`${html}\n${client}`, /localStorage|sessionStorage|innerHTML|querySelector\([^)]*api[_-]?key/i);
  } finally { await context.close(); }
});

test('session and model-provider APIs require origin, session, and CSRF protection', async () => {
  const context = await start();
  try {
    const anonymous = await fetch(`${context.baseUrl}/api/model-providers`);
    assert.equal(anonymous.status, 401);

    const badOrigin = await fetch(`${context.baseUrl}/api/session`, {
      method: 'POST', headers: { Origin: 'https://attacker.invalid', 'Content-Type': 'application/json' }, body: '{}',
    });
    assert.equal(badOrigin.status, 403);

    const auth = await signIn(context);
    const missingCsrf = await fetch(`${context.baseUrl}/api/model-connections`, {
      method: 'POST', headers: { Origin: ORIGIN, Cookie: auth.cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: 'openai', method: 'api-key', credential: 'private-test-value' }),
    });
    assert.equal(missingCsrf.status, 403);
  } finally { await context.close(); }
});

test('secure model connection stores a direct-provider credential once and never returns it', async () => {
  const context = await start();
  try {
    const auth = await signIn(context);
    const { response, value } = await json(await fetch(`${context.baseUrl}/api/model-connections`, {
      method: 'POST', headers: authorizedHeaders(auth),
      body: JSON.stringify({ providerId: 'openai', method: 'api-key', credential: 'private-test-value' }),
    }));

    assert.equal(response.status, 201);
    assert.deepEqual(value, { id: 'model-1', providerId: 'openai', method: 'api-key', status: 'connected' });
    assert.equal(JSON.stringify(value).includes('private-test-value'), false);
    assert.equal(context.secrets.length, 1);
    assert.deepEqual(context.secrets[0], {
      ownerId: 'user-1', providerId: 'openai', method: 'api-key', value: 'private-test-value',
    });

    const openRouterKeyFallback = await fetch(`${context.baseUrl}/api/model-connections`, {
      method: 'POST', headers: authorizedHeaders(auth),
      body: JSON.stringify({ providerId: 'openrouter', method: 'api-key', credential: 'private-test-value' }),
    });
    assert.equal(openRouterKeyFallback.status, 409);
    assert.equal((await openRouterKeyFallback.text()).includes('private-test-value'), false);
  } finally { await context.close(); }
});

test('compute connection is separate and create jobs are typed, session-bound, idempotent, and cancellable', async () => {
  const context = await start();
  try {
    const auth = await signIn(context);
    const compute = await fetch(`${context.baseUrl}/api/compute-connections`, {
      method: 'POST', headers: authorizedHeaders(auth), body: JSON.stringify({ providerId: 'daytona' }),
    });
    assert.equal(compute.status, 201);
    await fetch(`${context.baseUrl}/api/model-connections`, {
      method: 'POST', headers: authorizedHeaders(auth),
      body: JSON.stringify({ providerId: 'gemini', method: 'api-key', credential: 'private-test-value' }),
    });

    const createBody = JSON.stringify({ operation: 'create_ned', idempotencyKey: 'create-journey-1' });
    const first = await json(await fetch(`${context.baseUrl}/api/jobs`, {
      method: 'POST', headers: authorizedHeaders(auth), body: createBody,
    }));
    const repeated = await json(await fetch(`${context.baseUrl}/api/jobs`, {
      method: 'POST', headers: authorizedHeaders(auth), body: createBody,
    }));
    assert.equal(first.response.status, 202);
    assert.deepEqual(repeated.value, first.value);

    const resumedSession = await json(await fetch(`${context.baseUrl}/api/session`, {
      headers: { Cookie: auth.cookie },
    }));
    assert.equal(resumedSession.response.status, 200);
    assert.deepEqual(resumedSession.value, {
      user: { displayName: 'Test owner' },
      csrfToken: auth.csrfToken,
      connections: { compute: true, model: true },
      nedReady: false,
      job: { id: 'job-1', operation: 'create_ned', status: 'queued' },
    });
    assert.equal(JSON.stringify(resumedSession.value).includes(auth.cookie), false);

    const resumedJob = await json(await fetch(`${context.baseUrl}/api/jobs/job-1`, {
      headers: { Cookie: auth.cookie },
    }));
    assert.deepEqual(resumedJob.value, { id: 'job-1', operation: 'create_ned', status: 'queued' });

    assert.equal(context.jobCalls.filter((call) => !call.cancel).length, 1);
    assert.equal(typeof context.jobCalls[0].sessionId, 'string');
    assert.deepEqual({ ...context.jobCalls[0], sessionId: '<session-bound>' }, {
      operation: 'create_ned', ownerId: 'user-1', sessionId: '<session-bound>',
      idempotencyKey: 'create-journey-1', computeConnectionId: 'compute-1', modelConnectionId: 'model-1',
    });

    const genericCommand = await fetch(`${context.baseUrl}/api/jobs`, {
      method: 'POST', headers: authorizedHeaders(auth),
      body: JSON.stringify({ operation: 'run_command', command: 'whoami', idempotencyKey: 'bad-1' }),
    });
    assert.equal(genericCommand.status, 400);

    const cancelled = await json(await fetch(`${context.baseUrl}/api/jobs/job-1`, {
      method: 'DELETE', headers: authorizedHeaders(auth),
    }));
    assert.equal(cancelled.value.status, 'cancelled');
    assert.equal(context.jobCalls.at(-1).cancel.ownerId, 'user-1');
  } finally { await context.close(); }
});

test('mutating browser requests are rate-limited per authenticated session', async () => {
  const context = await start();
  try {
    const auth = await signIn(context);
    let response;
    for (let index = 0; index < 31; index += 1) {
      response = await fetch(`${context.baseUrl}/api/compute-connections`, {
        method: 'POST', headers: authorizedHeaders(auth), body: JSON.stringify({ providerId: 'daytona' }),
      });
    }
    assert.equal(response.status, 429);
    assert.equal(context.computeCalls.length, 30);
  } finally { await context.close(); }
});

test('jobs cannot be read or cancelled across sessions and oversized bodies fail before parsing', async () => {
  const context = await start();
  try {
    const owner = await signIn(context);
    await fetch(`${context.baseUrl}/api/compute-connections`, {
      method: 'POST', headers: authorizedHeaders(owner), body: JSON.stringify({ providerId: 'daytona' }),
    });
    await fetch(`${context.baseUrl}/api/model-connections`, {
      method: 'POST', headers: authorizedHeaders(owner),
      body: JSON.stringify({ providerId: 'anthropic', method: 'api-key', credential: 'private-test-value' }),
    });
    await fetch(`${context.baseUrl}/api/jobs`, {
      method: 'POST', headers: authorizedHeaders(owner),
      body: JSON.stringify({ operation: 'create_ned', idempotencyKey: 'owner-create-1' }),
    });

    const other = await signIn(context);
    const crossSession = await fetch(`${context.baseUrl}/api/jobs/job-1`, {
      method: 'DELETE', headers: authorizedHeaders(other),
    });
    assert.equal(crossSession.status, 404);

    const oversized = await fetch(`${context.baseUrl}/api/model-connections`, {
      method: 'POST', headers: authorizedHeaders(owner),
      body: JSON.stringify({ providerId: 'openai', method: 'api-key', credential: 'x'.repeat(20_000) }),
    });
    assert.equal(oversized.status, 413);
    assert.equal(context.secrets.length, 1);
  } finally { await context.close(); }
});
