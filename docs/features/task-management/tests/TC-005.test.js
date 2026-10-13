import { test } from 'node:test';
import { fixture, assert, complete } from './helpers.js';
test('TC-005: readiness, idempotent edges, cycles and goal completion', async (t) => {
  const f = await fixture(t),
    s = await f.service(),
    g = await s.createItem('goal', { title: 'G' });
  const a = await s.createItem('task', { title: 'A', parentId: g.id }),
    b = await s.createItem('task', { title: 'B', parentId: g.id }),
    c = await s.createItem('task', { title: 'C', parentId: g.id });
  await s.addDependency(b.id, a.id);
  const events = (await s.getActivity(b.id)).length;
  await s.addDependency(b.id, a.id);
  assert.equal((await s.getActivity(b.id)).length, events);
  assert.deepEqual(await s.getDependencies(b.id), [a.id]);
  assert.ok(!(await s.getReadyTasks()).some((i) => i.id === b.id));
  await assert.rejects(s.startTask(b.id), (e) => e.code === 'not_ready');
  await assert.rejects(s.unblockTask(b.id), (e) => e.code === 'invalid_transition');
  for (const [id, dep] of [
    [a.id, a.id],
    [a.id, b.id],
  ])
    await assert.rejects(s.addDependency(id, dep), (e) => e.code === 'dependency_cycle');
  await s.addDependency(c.id, b.id);
  await assert.rejects(s.addDependency(a.id, c.id), (e) => e.code === 'dependency_cycle');
  assert.deepEqual(await s.getDependencies(a.id), []);
  await assert.rejects(s.addDependency(a.id, 'ned-missing'), (e) => e.code === 'not_found');
  const q = await f.service({ project: f.other }),
    foreign = await q.createItem('task', { title: 'Q' });
  await assert.rejects(s.addDependency(a.id, foreign.id), (e) => e.code === 'not_found');
  await assert.rejects(s.completeTask(g.id), (e) => e.code === 'unfinished_children');
  await complete(s, a.id);
  assert.equal((await s.getItem(b.id)).status, 'ready');
  assert.notEqual((await s.getItem(b.id)).status, 'done');
  await assert.rejects(s.addDependency(a.id, b.id), (e) => e.code === 'invalid_transition');
  await complete(s, b.id);
  await complete(s, c.id);
  await s.completeTask(g.id);
  assert.equal((await s.getItem(g.id)).status, 'done');
  const g2 = await s.createItem('goal', { title: 'G2' }),
    pr = await s.createItem('task', { title: 'Prerequisite' });
  await s.addDependency(g2.id, pr.id);
  await assert.rejects(s.completeTask(g2.id), (e) => e.code === 'invalid_transition');
  await complete(s, pr.id);
  await s.completeTask(g2.id);
});
