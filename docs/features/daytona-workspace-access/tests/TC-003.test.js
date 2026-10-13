import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DaytonaClient } from '../../../../src/providers/daytona-client.js';
import { fixture, json } from './helpers.js';

test('TC-003: pagination preserves filters and cleanup uses exact Secret and confirmed workspace absence', { timeout: 5000 }, async (t) => {
  let deleted = false;
  const f = await fixture(t, ({ req, res, url, body }) => {
    if (url.pathname === '/sandbox') return json(res, { items: [{ id: url.searchParams.has('cursor') ? 'b' : 'a', state: 'started' }], nextCursor: url.searchParams.has('cursor') ? null : 'page-2' });
    if (url.pathname === '/secret/paginated') return json(res, { items: [{ id: 's', name: 'owned' }], total: 1 });
    if (url.pathname === '/secret/s') {
      if (req.method === 'PATCH') return json(res, { id: 's', name: 'owned', ...JSON.parse(body) });
      if (req.method === 'DELETE') { res.end(); return; }
      return json(res, { id: 's', name: 'owned' });
    }
    if (url.pathname === '/sandbox/a') {
      if (req.method === 'DELETE') { deleted = true; return json(res, { id: 'a', state: 'deleting' }); }
      return json(res, { id: 'a', state: 'started' }, deleted ? 404 : 200);
    }
    json(res, {}, 500);
  });
  const client = new DaytonaClient({ apiKey: 'synthetic', apiUrl: f.url });
  const ids = [];
  for await (const sandbox of client.list({ labels: { app: 'ned', createAttempt: 'synthetic-attempt' } })) ids.push(sandbox.id);
  assert.deepEqual(ids, ['a', 'b']);
  const pages = f.requests.filter((r) => r.url.pathname === '/sandbox');
  assert.deepEqual(pages.map((r) => r.url.searchParams.get('labels')), Array(2).fill(JSON.stringify({ app: 'ned', createAttempt: 'synthetic-attempt' })));
  assert.equal(pages[1].url.searchParams.get('cursor'), 'page-2');
  assert.equal((await client.secret.list()).items[0].id, 's');
  assert.equal((await client.secret.get('s')).id, 's');
  const params = { value: 'synthetic-credential', hosts: ['chatgpt.com'] };
  assert.deepEqual(await client.secret.update('s', params), { id: 's', name: 'owned', ...params });
  await client.secret.delete('s');
  const a = await client.get('a');
  await a.delete(1, true);
  assert.equal(a.state, 'destroyed');
  const deletion = f.requests.findIndex((r) => r.method === 'DELETE' && r.url.pathname === '/sandbox/a');
  assert.equal(f.requests[deletion + 1].method, 'GET');
  assert.equal(f.requests[deletion + 1].url.pathname, '/sandbox/a');
  assert.deepEqual(f.requests.filter((r) => r.url.pathname === '/secret/s').map((r) => r.method), ['GET', 'PATCH', 'DELETE']);
  const repeated = await fixture(t, ({ res }) => json(res, { items: [], nextCursor: 'same' }));
  const loop = new DaytonaClient({ apiKey: 'synthetic', apiUrl: repeated.url });
  await assert.rejects(async () => { for await (const item of loop.list()) assert.fail(item.id); }, /repeated pagination cursor/);
  assert.equal(repeated.requests.length, 2);
});
