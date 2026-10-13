import { test } from 'node:test';
import { rename, symlink } from 'node:fs/promises';
import path from 'node:path';
import { fixture, assert, complete } from './helpers.js';
test('TC-008: process persistence, event shape and project-isolated operations', async (t) => {
  const f = await fixture(t),
    s = await f.service(),
    g = await s.createItem('goal', { title: 'G' }),
    sub = await s.createItem('subgoal', { title: 'S', parentId: g.id }),
    a = await s.createItem('task', { title: 'A', parentId: sub.id }),
    b = await s.createItem('issue', { title: 'B', parentId: sub.id, discoveredFrom: a.id });
  await complete(s, a.id);
  await s.addDependency(b.id, a.id);
  await s.blockTask(b.id, { reason: 'wait' });
  await s.unblockTask(b.id);
  await complete(s, b.id);
  const before = await s.getItem(b.id),
    history = await s.getActivity(b.id);
  assert.deepEqual(
    history.map((i) => i.type),
    ['created', 'dependency_added', 'blocked', 'unblocked', 'claimed', 'completed'],
  );
  for (const e of history) {
    assert.ok(e.id);
    assert.equal(e.itemId, b.id);
    assert.equal(e.actor, 'agent:first');
    assert.ok(e.createdAt);
    assert.ok('previousValue' in e);
    assert.ok('value' in e);
  }
  assert.equal(history.at(-1).previousValue.status, 'working');
  assert.equal(history.at(-1).value.status, 'done');
  s.close();
  const reopened = await f.service();
  assert.deepEqual(await reopened.getItem(b.id), before);
  assert.deepEqual(await reopened.getActivity(b.id), history);
  const cli = f.processCli(['task', 'get', b.id, '--json']);
  assert.equal(cli.status, 0, cli.stderr);
  assert.deepEqual(JSON.parse(cli.stdout), before);
  for (let n = 0; n < 3; n++) {
    await reopened.getItems();
    await reopened.getTree();
    await reopened.getStatus();
    await reopened.getActivity(b.id);
  }
  assert.deepEqual(await reopened.getActivity(b.id), history);
  const q = await f.service({ project: f.other });
  assert.deepEqual(await q.getItems(), []);
  for (const op of [
    () => q.getItem(b.id),
    () => q.getActivity(b.id),
    () => q.getChildren(b.id),
    () => q.startTask(b.id),
    () => q.completeTask(b.id),
    () => q.blockTask(b.id, { reason: 'foreign' }),
    () => q.unblockTask(b.id),
  ])
    await assert.rejects(op(), (e) => e.code === 'not_found');
  const own = await q.createItem('task', { title: 'Q' });
  await assert.rejects(q.addDependency(own.id, a.id), (e) => e.code === 'not_found');
  await assert.rejects(
    q.createItem('issue', { title: 'Q', discoveredFrom: a.id }),
    (e) => e.code === 'not_found',
  );
  await assert.rejects(
    q.createItem('task', { title: 'Q', parentId: g.id }),
    (e) => e.code === 'not_found',
  );
  assert.deepEqual(
    (await reopened.getChildren(g.id)).map((i) => i.id),
    [sub.id],
  );
  assert.equal((await reopened.getTree())[0].children[0].children.length, 2);
  const d = f.database();
  d.setFeatureValue('another', 'state', { ok: true });
  await q.initialize();
  assert.deepEqual(d.getFeatureValue('another', 'state'), { ok: true });
  const alias = path.join(f.directory, 'alias');
  await symlink(f.project, alias, 'dir');
  const aliasService = await f.service({ project: alias });
  assert.equal(aliasService.project.id, reopened.project.id);
  const moved = path.join(f.directory, 'moved');
  await rename(f.project, moved);
  const newService = await f.service({ project: moved }, false);
  assert.notEqual(newService.project.id, reopened.project.id);
  await assert.rejects(newService.getItems(), (e) => e.code === 'not_initialized');
  await newService.initialize();
  assert.deepEqual(await newService.getItems(), []);
});
