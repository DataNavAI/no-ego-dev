import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createTaskService } from '../../src/tasks.js';
import { runCli } from '../../src/cli.js';

test('task CLI validates flags before contacting its backend and emits structured errors', async () => {
  for (const args of [['ready', '--parent', 'id'], ['task', 'create', '--priority'], ['task', 'get'], ['task', 'block', 'ned-1', '--on', 'ned-2', '--reason', 'both']]) {
    const errors = [];
    const code = await runCli([...args, '--json'], { log: assert.fail, error: (line) => errors.push(JSON.parse(line)) }, {
      taskServiceFactory: async () => assert.fail('validation must precede backend access'),
    });
    assert.equal(code, 2);
    assert.equal(errors[0].error, 'invalid_command');
  }
});

test('task commands avoid cloud authorization and preserve title arguments as data', async () => {
  const output = [];
  const title = 'Fix $(touch /tmp/no-shell)';
  const code = await runCli(['issue', 'create', title, '--discovered-from', 'ned-1', '--actor', 'agent:worker', '--json'], {
    log: (line) => output.push(JSON.parse(line)), error: assert.fail,
  }, {
    appFactory: async () => assert.fail('must not require Daytona'),
    taskServiceFactory: async (options) => {
      assert.equal(options.actor, 'agent:worker');
      return { async createItem(type, fields) { assert.equal(type, 'issue'); assert.equal(fields.discoveredFrom, 'ned-1'); return { title: fields.title }; } };
    },
  });
  assert.equal(code, 0);
  assert.equal(output[0].title, title);
});

test('project storage stays outside the repository and inherited Beads routing is removed', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ned-tasks-unit-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const project = path.join(root, 'project');
  await mkdir(project);
  const calls = [];
  const runner = async (file, args, options) => {
    calls.push({ file, args, options });
    if (args[0] === 'init') {
      await mkdir(options.env.BEADS_DIR, { recursive: true });
      await writeFile(path.join(options.env.BEADS_DIR, 'metadata.json'), '{}');
      return { stdout: 'Initialized!' };
    }
    return { stdout: '[]' };
  };
  const service = await createTaskService({ project, home: root, runner,
    env: { PATH: '/bin', BEADS_DIR: '/wrong', BEADS_DB: '/wrong', BD_LAST_TOUCHED_FALLBACK: '1' } });
  await assert.rejects(service.getItems(), (error) => error.code === 'not_initialized');
  await service.initialize();
  await service.getItems();
  assert.ok(calls[0].options.cwd.startsWith(path.join(root, '.ned/tasks')));
  assert.notEqual(calls[0].options.env.BEADS_DIR, '/wrong');
  assert.equal(calls[0].options.env.BEADS_DB, undefined);
  assert.equal(calls[0].options.env.BD_LAST_TOUCHED_FALLBACK, '0');
  assert.ok(calls[0].args.includes('--skip-agents'));
  assert.equal(await runCli(['task', 'get', '--bad'], { log: assert.fail, error() {} }, { taskServiceFactory: () => service }), 2);
});

test('domain readiness, provenance, and nested progress do not count hierarchy as blockers', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ned-tasks-domain-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const rows = [
    { id: 'ned-1', title: 'Goal', issue_type: 'epic', status: 'open', priority: 2, metadata: { nedType: 'goal' } },
    { id: 'ned-2', title: 'Subgoal', issue_type: 'epic', status: 'open', priority: 2, parent: 'ned-1', metadata: { nedType: 'subgoal' } },
    { id: 'ned-3', title: 'Task', status: 'closed', priority: 2, parent: 'ned-2' },
    { id: 'ned-4', title: 'Issue', issue_type: 'bug', status: 'open', priority: 2, parent: 'ned-2', dependencies: [
      { type: 'blocks', depends_on_id: 'ned-3' }, { type: 'discovered-from', depends_on_id: 'ned-3' },
    ] },
  ];
  const runner = async (_, args, options) => {
    if (args[0] === 'init') {
      await mkdir(options.env.BEADS_DIR, { recursive: true });
      await writeFile(path.join(options.env.BEADS_DIR, 'metadata.json'), '{}');
      return { stdout: '' };
    }
    return { stdout: JSON.stringify(args[0] === 'list' ? rows : [{ id: 'ned-4' }]) };
  };
  const service = await createTaskService({ project: root, home: root, runner });
  await service.initialize();
  const ready = await service.getReadyTasks();
  assert.deepEqual(ready.map((item) => item.id), ['ned-4']);
  assert.equal(ready[0].discoveredFrom, 'ned-3');
  assert.equal(ready[0].goalId, 'ned-1');
  assert.deepEqual(await service.getGoalProgress('ned-1'), { completed: 1, total: 2, percent: 50 });
  await assert.rejects(service.getItem('--all'), (e) => e.code === 'invalid_id');
  await assert.rejects(service.createItem('subgoal', { title: 'Orphan' }), (e) => e.code === 'parent_required');
});

test('missing backend has an actionable error and raw subprocess details are not exposed', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ned-tasks-errors-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const missing = await createTaskService({ project: root, home: root, runner: async () => {
    throw Object.assign(new Error('private arguments'), { code: 'ENOENT' });
  } });
  await assert.rejects(missing.initialize(), (e) => e.code === 'beads_missing' && e.message.includes('Install Beads'));
  const failed = await createTaskService({ project: root, home: root, runner: async () => {
    throw Object.assign(new Error('private arguments'), { stderr: 'credential-value', code: 1 });
  } });
  await assert.rejects(failed.initialize(), (e) => e.code === 'backend_failed' && !e.message.includes('private') && !e.message.includes('credential-value'));
});

test('real Beads lifecycle: hierarchy, dependencies, provenance, claims, blockers and persistence', {
  skip: !process.env.NED_TEST_BEADS,
}, async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ned-tasks-real-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const project = path.join(root, 'project');
  const other = path.join(root, 'other');
  await mkdir(project); await mkdir(other);
  const options = { project, home: root, executable: process.env.NED_TEST_BEADS, actor: 'agent:first' };
  const service = await createTaskService(options);
  await service.initialize();
  const goal = await service.createItem('goal', { title: 'Login' });
  const sub = await service.createItem('subgoal', { title: 'Security', parentId: goal.id });
  const a = await service.createItem('task', { title: 'Implement', parentId: sub.id });
  const b = await service.createItem('issue', { title: 'Regression', parentId: sub.id, discoveredFrom: a.id });
  await service.addDependency(b.id, a.id);
  assert.equal((await service.getItem(b.id)).status, 'blocked');
  await assert.rejects(service.addDependency(a.id, b.id));
  await assert.rejects(service.startTask(b.id), (e) => e.code === 'not_ready');
  const second = await createTaskService({ ...options, actor: 'agent:second' });
  const claims = await Promise.allSettled([service.startTask(a.id), second.startTask(a.id)]);
  assert.equal(claims.filter((r) => r.status === 'fulfilled').length, 1);
  const winner = (await service.getItem(a.id)).assignee === 'agent:first' ? service : second;
  await winner.completeTask(a.id, 'Verified');
  assert.equal((await service.getItem(b.id)).status, 'ready');
  assert.equal((await service.getItem(b.id)).discoveredFrom, a.id);
  await service.blockTask(b.id, { reason: 'GitHub connection required', service: 'github' });
  assert.equal((await service.getItem(b.id)).blocker.requiresUserAction, true);
  await assert.rejects(service.completeTask(b.id), (e) => e.code === 'invalid_transition');
  await service.unblockTask(b.id);
  await service.startTask(b.id); await service.completeTask(b.id, 'Tests passed');
  assert.equal((await service.getGoalProgress(goal.id)).percent, 100);
  assert.equal((await service.getTree())[0].status, 'done');
  const restarted = await createTaskService(options);
  assert.equal((await restarted.getItem(b.id)).status, 'done');
  assert.ok((await restarted.getActivity(b.id)).length > 0);
  const isolated = await createTaskService({ ...options, project: other });
  await isolated.initialize();
  assert.deepEqual(await isolated.getItems(), []);
});
