import { test } from 'node:test';
import { fixture, assert, worker } from './helpers.js';
test('TC-004: independent-process race and transactional ownership', async (t) => {
  const f = await fixture(t),
    s = await f.service(),
    a = await s.createItem('task', { title: 'Race' });
  await assert.rejects(s.completeTask(a.id), (e) => e.code === 'not_claimed');
  const results = await Promise.all(
    ['agent:one', 'agent:two'].map((actor) =>
      worker(['claim', f.databaseUrl, f.project, actor, a.id]),
    ),
  );
  assert.equal(results.filter((r) => r.code === 0).length, 1);
  assert.equal(results.filter((r) => r.code === 2).length, 1);
  const entry = await s.getItem(a.id),
    win = await f.service({ actor: entry.assignee }),
    lose = await f.service({ actor: entry.assignee === 'agent:one' ? 'agent:two' : 'agent:one' });
  const history = (await s.getActivity(a.id)).length;
  await win.startTask(a.id);
  assert.equal((await s.getActivity(a.id)).length, history);
  for (const operation of [
    () => lose.startTask(a.id),
    () => lose.completeTask(a.id),
    () => lose.blockTask(a.id, { reason: 'No' }),
    () => lose.unblockTask(a.id),
  ])
    await assert.rejects(operation(), (e) => e.code === 'not_owner');
  assert.equal((await s.getItem(a.id)).status, 'working');
  await win.completeTask(a.id, 'Verified');
  const events = await s.getActivity(a.id);
  await win.completeTask(a.id);
  assert.equal((await s.getActivity(a.id)).length, events.length);
  assert.equal(events.at(-1).actor, entry.assignee);
  await assert.rejects(win.startTask(a.id), (e) => e.code === 'not_ready');
  await assert.rejects(lose.completeTask(a.id), (e) => e.code === 'not_owner');
  const goal = await s.createItem('goal', { title: 'G' });
  await assert.rejects(s.startTask(goal.id), (e) => e.code === 'not_ready');
  const blocked = await s.createItem('task', { title: 'B' });
  await s.blockTask(blocked.id, { reason: 'wait' });
  await assert.rejects(s.startTask(blocked.id), (e) => e.code === 'not_ready');
  const second = await f.service({ actor: 'agent:other' }),
    next = await s.createItem('task', { title: 'Connections' });
  const claims = await Promise.allSettled([s.startTask(next.id), second.startTask(next.id)]);
  assert.equal(claims.filter((r) => r.status === 'fulfilled').length, 1);
});
