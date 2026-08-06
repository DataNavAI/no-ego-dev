import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createBrowserServer } from '../../src/web/app.js';

const ORIGIN = 'http://127.0.0.1';

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

test('concurrent duplicate create submissions execute one job-service call', async () => {
  let creates = 0;
  const server = createBrowserServer({
    publicOrigin: ORIGIN,
    authenticate: async () => ({ userId: 'concurrent-owner' }),
    secretVault: { async put() { return { id: 'model-1' }; } },
    computeConnector: { async connect() { return { id: 'compute-1' }; } },
    jobService: {
      async create({ operation }) {
        creates += 1;
        await delay(30);
        return { id: 'job-1', status: 'queued', operation };
      },
      async cancel({ jobId }) { return { id: jobId, status: 'cancelled', operation: 'create_ned' }; },
    },
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    const signIn = await fetch(`${baseUrl}/api/session`, {
      method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json' }, body: '{}',
    });
    const session = await signIn.json();
    const headers = {
      Origin: ORIGIN,
      Cookie: signIn.headers.get('set-cookie').split(';', 1)[0],
      'X-CSRF-Token': session.csrfToken,
      'Content-Type': 'application/json',
    };
    await fetch(`${baseUrl}/api/compute-connections`, {
      method: 'POST', headers, body: JSON.stringify({ providerId: 'daytona' }),
    });
    await fetch(`${baseUrl}/api/model-connections`, {
      method: 'POST', headers,
      body: JSON.stringify({ providerId: 'openai', method: 'api-key', credential: 'generated-runtime-value' }),
    });
    const body = JSON.stringify({ operation: 'create_ned', idempotencyKey: 'same-create-request' });

    const responses = await Promise.all([
      fetch(`${baseUrl}/api/jobs`, { method: 'POST', headers, body }),
      fetch(`${baseUrl}/api/jobs`, { method: 'POST', headers, body }),
    ]);

    assert.deepEqual(responses.map(({ status }) => status), [202, 202]);
    assert.equal(creates, 1);
    assert.deepEqual(await responses[0].json(), await responses[1].json());
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
