import { test } from 'node:test';
import { fixture, assert, complete } from './helpers.js';
test('TC-003: discovered issue provenance independent of parent and dependency', async (t) => {
  const f = await fixture(t),
    s = await f.service();
  const g = await s.createItem('goal', { title: 'Goal' }),
    a = await s.createItem('task', { title: 'Source', parentId: g.id });
  const b = await s.createItem('issue', {
      title: 'Regression',
      parentId: g.id,
      discoveredFrom: a.id,
    }),
    standalone = await s.createItem('issue', { title: 'Independent', discoveredFrom: a.id });
  assert.equal(b.status, 'ready');
  assert.equal(b.discoveredFrom, a.id);
  assert.deepEqual(b.dependencies, []);
  assert.equal(standalone.parentId, null);
  assert.equal(standalone.discoveredFrom, a.id);
  await s.addDependency(b.id, a.id);
  assert.equal((await s.getItem(b.id)).status, 'blocked');
  await complete(s, a.id);
  assert.equal((await s.getItem(b.id)).status, 'ready');
  assert.equal((await s.getItem(b.id)).discoveredFrom, a.id);
  const count = (await s.getItems()).length;
  await assert.rejects(
    s.createItem('issue', { title: 'X', discoveredFrom: 'ned-missing' }),
    (e) => e.code === 'not_found',
  );
  const q = await f.service({ project: f.other }),
    foreign = await q.createItem('task', { title: 'Foreign' });
  await assert.rejects(
    s.createItem('issue', { title: 'X', discoveredFrom: foreign.id }),
    (e) => e.code === 'not_found',
  );
  await assert.rejects(
    s.createItem('task', { title: 'X', discoveredFrom: a.id }),
    (e) => e.code === 'invalid_provenance',
  );
  assert.equal((await f.cli(['task', 'create', 'X', '--discovered-from', a.id, '--json'])).code, 2);
  assert.equal((await s.getItems()).length, count);
  const restarted = await f.service();
  assert.equal((await restarted.getItem(b.id)).discoveredFrom, a.id);
  assert.equal((await s.getActivity(b.id))[0].value.discoveredFrom, a.id);
});
