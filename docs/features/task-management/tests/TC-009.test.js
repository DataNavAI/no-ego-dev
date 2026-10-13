import { test } from 'node:test';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fixture, assert, runCli } from './helpers.js';
test('TC-009: strict CLI validation, streams, literal data and resource cleanup', async (t) => {
  const f = await fixture(t),
    s = await f.service();
  const invalid = [
    ['ready', '--parent', 'id'],
    ['task', 'create', '--priority'],
    ['task', 'get'],
    ['task', 'wat', 'id'],
    ['task', 'list', 'extra'],
    ['goal', 'init'],
    ['task', 'create', 'X', '--priority', ' '],
    ['task', 'create', 'X', '--priority', '1.5'],
    ['task', 'create', 'X', '--unknown', 'a'],
    ['task', 'create', 'X', '--priority', '1', '--priority', '2'],
    ['task', 'block', 'ned-1', '--on', 'ned-2', '--reason', 'mixed'],
  ];
  for (const args of invalid) {
    const logs = [],
      errors = [];
    let calls = 0;
    const code = await runCli(
      [...args, '--json'],
      { log: (v) => logs.push(v), error: (v) => errors.push(v) },
      {
        taskServiceFactory: async () => {
          calls++;
          throw Error('must not reach backend');
        },
      },
    );
    assert.equal(code, 2);
    assert.deepEqual(logs, []);
    assert.equal(JSON.parse(errors[0]).error, 'invalid_command');
    assert.equal(calls, 0);
  }
  const sentinel = path.join(f.directory, 'shell-sentinel');
  const title = `Fix $(touch ${sentinel}); DROP TABLE ned_work_items;`;
  const created = await f.cli(['issue', 'create', title, '--json'], {
    appFactory: async () => assert.fail('No Daytona'),
  });
  assert.equal(created.code, 0);
  assert.deepEqual(created.stderr, []);
  const a = JSON.parse(created.stdout[0]);
  assert.equal(a.title, title);
  await assert.rejects(stat(sentinel), (e) => e.code === 'ENOENT');
  const process = f.processCli(['task', 'get', a.id, '--json'], { PATH: '/nonexistent' });
  assert.equal(process.status, 0, process.stderr);
  assert.equal(JSON.parse(process.stdout).title, title);
  const readable = await f.cli(['task', 'get', a.id]);
  assert.equal(readable.code, 0);
  assert.ok(readable.stdout[0].includes(title));
  for (const args of [
    ['task', 'get', '--all'],
    ['task', 'get', 'ned-missing'],
    ['goal', 'get', a.id],
    ['task', 'start', a.id, '--actor', 'bad'],
  ]) {
    const res = await f.cli([...args, '--json']);
    assert.equal(res.code, 2);
    assert.deepEqual(res.stdout, []);
    assert.ok(JSON.parse(res.stderr[0]).error);
  }
  assert.equal((await s.getItems()).length, 1);
  let closed = 0;
  for (const fail of [false, true]) {
    const code = await runCli(
      ['task', 'list', '--json'],
      { log() {}, error() {} },
      {
        taskServiceFactory: async () => ({
          getItems: async () => {
            if (fail) throw Object.assign(new Error('bounded'), { code: 'database_failed' });
            return [];
          },
          close() {
            closed++;
          },
        }),
      },
    );
    assert.equal(code, fail ? 1 : 0);
  }
  assert.equal(closed, 2);
  assert.equal((await f.cli(['status', '--json'])).code, 0);
  assert.equal((await f.cli(['tree'])).code, 0);
});
