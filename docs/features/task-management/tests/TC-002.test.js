import { test } from 'node:test';
import { fixture, assert, complete } from './helpers.js';
test('TC-002: hierarchy, reads and creation boundaries', async (t) => {
  const f = await fixture(t),
    s = await f.service();
  const g = await s.createItem('goal', { title: ' Login ' }),
    sub = await s.createItem('subgoal', { title: 'Security', parentId: g.id });
  const a = await s.createItem('task', {
    title: 'OAuth',
    parentId: sub.id,
    priority: 1,
    description: 'Synthetic callback',
  });
  assert.equal(g.title, 'Login');
  assert.equal(a.goalId, g.id);
  assert.equal(a.parentId, sub.id);
  assert.equal(a.priority, 1);
  assert.equal(a.description, 'Synthetic callback');
  assert.equal(a.assignee, null);
  assert.equal(a.createdBy, 'agent:first');
  assert.ok(a.createdAt);
  assert.deepEqual(a.dependencies, []);
  assert.deepEqual(
    (await s.getChildren(g.id)).map((i) => i.id),
    [sub.id],
  );
  assert.deepEqual(
    (await s.getChildren(sub.id)).map((i) => i.id),
    [a.id],
  );
  for (const noun of ['goal', 'subgoal', 'task', 'issue']) {
    const out = await f.cli([noun, 'list', '--json']);
    assert.equal(out.code, 0);
    assert.ok(JSON.parse(out.stdout[0]).every((i) => i.type === noun));
  }
  assert.equal((await f.cli(['goal', 'get', a.id, '--json'])).code, 2);
  const invalid = [
    ['subgoal', { title: 'orphan' }, 'parent_required'],
    ['task', { title: '', parentId: g.id }, 'invalid_item'],
    ['task', { title: '   ' }, 'invalid_item'],
    ['task', { title: 123 }, 'invalid_item'],
    ['task', { title: 'a'.repeat(501) }, 'invalid_item'],
    ['task', { title: 'X', description: 42 }, 'invalid_description'],
    ['task', { title: 'X', description: 'd'.repeat(20001) }, 'invalid_description'],
    ['other', { title: 'X' }, 'invalid_item'],
    ['task', { title: 'X', parentId: 'ned-missing' }, 'not_found'],
    ['task', { title: 'X', parentId: a.id }, 'invalid_parent'],
  ];
  for (const priority of [-1, 5, 1.5, NaN])
    invalid.push(['task', { title: 'X', priority }, 'invalid_priority']);
  const before = (await s.getItems()).length;
  for (const [type, fields, code] of invalid)
    await assert.rejects(s.createItem(type, fields), (e) => e.code === code);
  assert.equal((await s.getItems()).length, before);
  const limit = await s.createItem('task', {
    title: 'a'.repeat(500),
    description: 'd'.repeat(20000),
    priority: 0,
  });
  assert.equal(limit.title.length, 500);
  assert.equal(limit.description.length, 20000);
  const q = await f.service({ project: f.other });
  const foreign = await q.createItem('goal', { title: 'Foreign' });
  await assert.rejects(
    s.createItem('task', { title: 'X', parentId: foreign.id }),
    (e) => e.code === 'not_found',
  );
  await complete(s, a.id);
  await s.completeTask(sub.id);
  await s.completeTask(g.id);
  await assert.rejects(
    s.createItem('task', { title: 'X', parentId: g.id }),
    (e) => e.code === 'invalid_parent',
  );
});

test('TC-002: attach tasks directly to milestone goals through CLI', async (t) => {
  const f = await fixture(t), s = await f.service();
  const goal = await s.createItem('goal', { title: 'Ship sign-in' });
  const out = await f.cli(['task', 'create', 'OAuth', '--goal', goal.id, '--json']);
  assert.equal(out.code, 0);
  const task = JSON.parse(out.stdout[0]);
  assert.equal(task.parentId, goal.id);
  assert.equal(task.goalId, goal.id);
  const before = (await s.getItems()).length;
  for (const args of [
    ['task', 'create', 'X', '--goal', ''],
    ['task', 'create', 'X', '--goal', task.id],
    ['task', 'create', 'X', '--goal', 'missing'],
    ['task', 'create', 'X', '--goal', goal.id, '--parent', goal.id],
    ['goal', 'create', 'X', '--goal', goal.id],
    ['task', 'list', '--goal', goal.id],
  ]) assert.equal((await f.cli([...args, '--json'])).code, 2);
  assert.equal((await s.getItems()).length, before);
  await s.startTask(task.id);
  await s.completeTask(task.id);
  await s.completeTask(goal.id);
  assert.equal((await f.cli(['task', 'create', 'Late', '--goal', goal.id, '--json'])).code, 2);
});
