import { test } from 'node:test';
import { fixture, assert, complete } from './helpers.js';
test('TC-006: explicit user-action blockers and recovery with remaining dependencies', async (t) => {
  const f = await fixture(t),
    s = await f.service(),
    a = await s.createItem('task', { title: 'Access' });
  await s.blockTask(a.id, { reason: 'Connect GitHub', service: 'github' });
  assert.deepEqual((await s.getItem(a.id)).blocker, {
    reason: 'Connect GitHub',
    service: 'github',
    requiresUserAction: true,
  });
  const count = (await s.getActivity(a.id)).length;
  await s.blockTask(a.id, { reason: 'Connect GitHub', service: 'github' });
  assert.equal((await s.getActivity(a.id)).length, count);
  await assert.rejects(s.startTask(a.id), (e) => e.code === 'not_ready');
  await assert.rejects(s.completeTask(a.id), (e) => e.code === 'invalid_transition');
  await s.unblockTask(a.id);
  assert.equal((await s.getItem(a.id)).status, 'ready');
  await assert.rejects(s.unblockTask(a.id), (e) => e.code === 'invalid_transition');
  await s.startTask(a.id);
  await s.blockTask(a.id, { reason: 'Human review' });
  assert.equal((await s.getItem(a.id)).blocker.requiresUserAction, false);
  assert.equal((await s.getItem(a.id)).blocker.service, null);
  await s.unblockTask(a.id);
  assert.equal((await s.getItem(a.id)).status, 'working');
  await s.startTask(a.id);
  await s.completeTask(a.id);
  await assert.rejects(
    s.blockTask(a.id, { reason: 'late' }),
    (e) => e.code === 'invalid_transition',
  );
  const b = await s.createItem('issue', { title: 'B' }),
    pr = await s.createItem('task', { title: 'Prerequisite' });
  await s.addDependency(b.id, pr.id);
  await s.blockTask(b.id, { reason: 'Connect', service: 'github' });
  await s.unblockTask(b.id);
  assert.equal((await s.getItem(b.id)).status, 'blocked');
  await complete(s, pr.id);
  assert.equal((await s.getItem(b.id)).status, 'ready');
  for (const fields of [
    { reason: '' },
    { reason: ' ' },
    { reason: 'x'.repeat(20001) },
    { reason: 'X', service: '' },
    { reason: 'X', service: 's'.repeat(101) },
    { on: pr.id, reason: 'mixed' },
  ])
    await assert.rejects(s.blockTask(b.id, fields), (e) => e.code === 'invalid_blocker');
  assert.equal(
    (await f.cli(['task', 'block', b.id, '--on', pr.id, '--reason', 'mixed', '--json'])).code,
    2,
  );
});
