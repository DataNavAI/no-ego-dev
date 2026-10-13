import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DaytonaClient } from '../../../../src/providers/daytona-client.js';
import { fixture, json } from './helpers.js';

test('TC-002: denied access, redirects, terminal states and stalled transitions reject without replay', { timeout: 5000 }, async (t) => {
  assert.throws(() => new DaytonaClient({ apiKey: '' }), /key is required/);
  for (const status of [401, 403, 302]) {
    await t.test(`HTTP ${status}`, async (t) => {
      let base;
      const f = await fixture(t, ({ res, url }) => {
        if (url.pathname === '/leak') throw new Error('redirect must not be followed');
        res.writeHead(status, { Location: `${base}/leak` }); res.end('{}');
      });
      base = f.url;
      await assert.rejects(new DaytonaClient({ apiKey: 'synthetic', apiUrl: base }).get('a'), (e) => e.response?.status === status);
      assert.equal(f.requests.length, 1);
    });
  }
  for (const state of ['error', 'build_failed', 'starting', 'deleting', 'read-error']) {
    await t.test(state, async (t) => {
      const f = await fixture(t, ({ res, req, requests }) => {
        if (req.method === 'POST' || req.method === 'DELETE') return json(res, { id: 'a', state });
        if (state === 'read-error' && requests.length > 2) return json(res, {}, 500);
        json(res, { id: 'a', state: 'stopped' });
      });
      const a = await new DaytonaClient({ apiKey: 'synthetic', apiUrl: f.url, pollIntervalMs: 2 }).get('a');
      await assert.rejects(state === 'deleting' ? a.delete(0.03, true) : a.start(0.03), state === 'read-error' ? (e) => e.response?.status === 500 : /entered|timed out|timeout/i);
      assert.equal(f.requests.filter((r) => ['POST', 'DELETE'].includes(r.method)).length, 1);
      assert.ok(f.requests.every((r) => !r.url.pathname.includes('/toolbox')));
      const count = f.requests.length;
      await assert.rejects(a.start(-1), /non-negative/);
      await assert.rejects(a.delete(NaN), /non-negative/);
      assert.equal(f.requests.length, count);
    });
  }
});
