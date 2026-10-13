import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createDevelopmentServer } from '../../src/web/dev-server.js';

test('development browser server fails closed without explicit local-only mode', () => {
  assert.throws(
    () => createDevelopmentServer({ env: {}, port: 4173 }),
    /NED_WEB_DEV_MODE=1/,
  );
});

test('development browser server binds only to loopback and never provisions real resources', async () => {
  const instance = createDevelopmentServer({ env: { NED_WEB_DEV_MODE: '1' }, port: 0 });
  try {
    await instance.listen();
    assert.equal(instance.server.address().address, '127.0.0.1');
    const response = await fetch(`http://127.0.0.1:${instance.server.address().port}/healthz`);
    assert.deepEqual(await response.json(), { ok: true });
    assert.equal(instance.mode, 'development-simulation');
  } finally {
    await instance.close();
  }
});
