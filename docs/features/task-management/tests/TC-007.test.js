import { test } from 'node:test';
import { fixture, assert, complete } from './helpers.js';
test('TC-007: nested progress, aggregate precedence, empty and corrupt hierarchies', async (t) => {
  const f = await fixture(t),
    s = await f.service(),
    g = await s.createItem('goal', { title: 'G' }),
    sub = await s.createItem('subgoal', { title: 'S', parentId: g.id });
  const a = await s.createItem('task', { title: 'A', parentId: sub.id }),
    b = await s.createItem('issue', { title: 'B', parentId: sub.id });
  assert.equal((await s.getGoalProgress(g.id)).percent, 0);
  await complete(s, a.id);
  assert.deepEqual(await s.getGoalProgress(g.id), { completed: 1, total: 2, percent: 50 });
  assert.equal((await s.getTree()).find((i) => i.id === g.id).status, 'planned');
  await s.startTask(b.id);
  const c = await s.createItem('task', { title: 'C', parentId: sub.id });
  await s.blockTask(c.id, { reason: 'wait' });
  let tree = (await s.getTree()).find((i) => i.id === g.id);
  assert.equal(tree.status, 'working');
  assert.equal(tree.progress.percent, 33);
  await s.completeTask(b.id);
  assert.equal((await s.getTree()).find((i) => i.id === g.id).status, 'blocked');
  await s.unblockTask(c.id);
  await complete(s, c.id);
  tree = (await s.getTree()).find((i) => i.id === g.id);
  assert.equal(tree.status, 'done');
  assert.equal(tree.progress.percent, 100);
  assert.equal(tree.storedStatus, 'planned');
  assert.equal((await s.getItem(g.id)).status, 'planned');
  const empty = await s.createItem('goal', { title: 'Empty' });
  assert.equal((await s.getGoalProgress(empty.id)).percent, 0);
  await s.completeTask(empty.id);
  assert.equal((await s.getGoalProgress(empty.id)).percent, 100);
  await s.blockTask(g.id, { reason: 'User approval' });
  assert.equal((await s.getTree()).find((i) => i.id === g.id).status, 'blocked');
  await s.unblockTask(g.id);
  const rootTask = await s.createItem('task', { title: 'Standalone' });
  assert.ok((await s.getTree()).some((i) => i.id === rootTask.id));
  const status = await s.getStatus();
  assert.equal(status.counts.done, 3);
  assert.equal(status.counts.ready, 1);
  assert.ok(!status.goals.some((i) => i.id === rootTask.id));
  await assert.rejects(s.getGoalProgress(rootTask.id), (e) => e.code === 'invalid_goal');
  const d = f.database();
  d.connection.pragma('foreign_keys=OFF');
  d.connection
    .prepare('UPDATE ned_work_items SET parent_id=? WHERE id=?')
    .run('ned-missing', rootTask.id);
  d.connection.pragma('foreign_keys=ON');
  await assert.rejects(s.getTree(), (e) => e.code === 'invalid_hierarchy');
  d.connection.prepare('UPDATE ned_work_items SET parent_id=NULL WHERE id=?').run(rootTask.id);
  d.connection.prepare('UPDATE ned_work_items SET parent_id=? WHERE id=?').run(sub.id, g.id);
  await assert.rejects(s.getTree(), (e) => e.code === 'invalid_hierarchy');
  await assert.rejects(s.getItems(), (e) => e.code === 'invalid_hierarchy');
});
