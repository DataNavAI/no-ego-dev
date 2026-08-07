import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createBrowserServer } from '../../src/web/app.js';

function adapters(overrides = {}) {
  return {
    authenticate: async () => ({ userId: 'security-owner' }),
    secretVault: {
      async put() { return { id: 'model-1' }; },
      async delete({ id }) { return { id, status: 'deleted' }; },
    },
    computeConnector: { async connect() { return { id: 'compute-1' }; } },
    jobService: {
      async create({ operation }) { return { id: 'job-1', operation, status: 'queued' }; },
      async get({ jobId }) { return { id: jobId, operation: 'create_ned', status: 'queued' }; },
      async cancel({ jobId }) { return { id: jobId, operation: 'create_ned', status: 'cancelled' }; },
    },
    ...overrides,
  };
}

async function listen(server) {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${server.address().port}`;
}

async function close(server) {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

test('browser server accepts only canonical HTTPS or loopback HTTP public origins', () => {
  assert.throws(
    () => createBrowserServer({ publicOrigin: 'http://example.com', ...adapters() }),
    /HTTPS or loopback HTTP/,
  );
  assert.throws(
    () => createBrowserServer({ publicOrigin: 'https://example.com/setup?mode=test', ...adapters() }),
    /canonical origin/,
  );
  assert.doesNotThrow(() => createBrowserServer({ publicOrigin: 'https://example.com', ...adapters() }));
  assert.doesNotThrow(() => createBrowserServer({ publicOrigin: 'http://127.0.0.1:4173', ...adapters() }));
});

test('expired sessions are pruned and active session storage is strictly bounded', async () => {
  let currentTime = 1_000;
  const origin = 'http://127.0.0.1';
  const server = createBrowserServer({
    publicOrigin: origin,
    now: () => currentTime,
    maxActiveSessions: 2,
    ...adapters(),
  });
  const baseUrl = await listen(server);
  const signIn = () => fetch(`${baseUrl}/api/session`, {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{}',
  });
  try {
    assert.equal((await signIn()).status, 201);
    assert.equal((await signIn()).status, 201);
    const full = await signIn();
    assert.equal(full.status, 503);
    assert.deepEqual(await full.json(), { error: 'session_capacity_reached' });

    currentTime += 60 * 60 * 1000 + 1;
    assert.equal((await signIn()).status, 201);
  } finally { await close(server); }
});

test('untrusted adapter identifiers fail closed before entering session state or responses', async () => {
  const origin = 'http://127.0.0.1';
  const server = createBrowserServer({
    publicOrigin: origin,
    ...adapters({
      computeConnector: { async connect() { return { id: 'unsafe\ncompute' }; } },
    }),
  });
  const baseUrl = await listen(server);
  try {
    const signIn = await fetch(`${baseUrl}/api/session`, {
      method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{}',
    });
    const session = await signIn.json();
    const response = await fetch(`${baseUrl}/api/compute-connections`, {
      method: 'POST',
      headers: {
        Origin: origin,
        Cookie: signIn.headers.get('set-cookie').split(';', 1)[0],
        'X-CSRF-Token': session.csrfToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ providerId: 'daytona' }),
    });
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: 'internal_error' });
  } finally { await close(server); }
});
