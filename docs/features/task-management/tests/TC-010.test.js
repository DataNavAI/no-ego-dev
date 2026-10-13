import { test } from 'node:test';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { once } from 'node:events';
import {
  fixture,
  assert,
  openNedDatabase,
  createTaskService,
  runCli,
  spawn,
  root,
} from './helpers.js';
test('TC-010: database failure, schema guards, lock bounds and crash rollback', async (t) => {
  const f = await fixture(t),
    s = await f.service(),
    a = await s.createItem('task', { title: 'Committed' }),
    d = f.database();
  const corrupted = path.join(f.directory, 'corrupt.sqlite');
  await writeFile(corrupted, 'synthetic-non-sqlite-private-input');
  assert.throws(
    () => openNedDatabase({ databaseUrl: corrupted }),
    (e) => e.code === 'database_failed' && !e.message.includes(f.directory),
  );
  assert.throws(
    () => openNedDatabase({ databaseUrl: f.project }),
    (e) => e.code === 'database_failed',
  );
  const errors = [];
  const code = await runCli(
    ['task', 'list', '--project', f.project, '--database', corrupted, '--json'],
    { log: () => assert.fail('No success output'), error: (v) => errors.push(JSON.parse(v)) },
    { env: {} },
  );
  assert.equal(code, 1);
  assert.equal(errors[0].error, 'database_failed');
  assert.ok(!errors[0].message.includes(f.directory));
  const direct = await createTaskService({ ...f.options, database: d });
  const itemsBefore = (await s.getItems()).length,
    eventsBefore = (await s.getActivity(a.id)).length;
  d.connection.exec(
    "CREATE TRIGGER abort_events BEFORE INSERT ON ned_task_events BEGIN SELECT RAISE(ABORT,'private-input'); END",
  );
  await assert.rejects(
    s.createItem('task', { title: 'Rollback' }),
    (e) => e.code === 'database_failed' && !e.message.includes('private-input'),
  );
  await assert.rejects(s.startTask(a.id), (e) => e.code === 'database_failed');
  assert.equal((await s.getItems()).length, itemsBefore);
  assert.equal((await s.getItem(a.id)).status, 'ready');
  assert.equal((await s.getActivity(a.id)).length, eventsBefore);
  d.connection.exec('DROP TRIGGER abort_events');
  const bounded = f.database({ timeout: 30 });
  const busy = await createTaskService({ ...f.options, database: bounded });
  d.connection.exec('BEGIN IMMEDIATE');
  const started = Date.now();
  try {
    await assert.rejects(busy.startTask(a.id), (e) => e.code === 'database_failed');
    assert.ok(Date.now() - started < 1000);
  } finally {
    d.connection.exec('ROLLBACK');
  }
  assert.equal(d.connection.pragma('busy_timeout', { simple: true }), 5000);
  const child = spawn(
    process.execPath,
    [
      path.join(root, 'docs/features/task-management/tests/worker.js'),
      'crash',
      f.databaseUrl,
      f.project,
      'agent:crash',
      a.id,
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  t.after(() => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  });
  let timer;
  await new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(Error('Crash worker did not open transaction')), 5000);
    child.stdout.once('data', (chunk) => {
      if (String(chunk).includes('transaction-open')) resolve();
      else reject(Error('Unexpected worker output'));
    });
    child.once('error', reject);
    child.once('exit', () => reject(Error('Crash worker exited early')));
  }).finally(() => clearTimeout(timer));
  const exited = once(child, 'exit');
  child.kill('SIGKILL');
  await exited;
  assert.equal((await s.getItem(a.id)).title, 'Committed');
  assert.equal(d.getFeatureValue('crash', 'partial'), null);
  assert.equal((await s.getActivity(a.id)).length, eventsBefore);
  await s.startTask(a.id); // simulate response lost after commit: reconnect/read rather than retry creation
  const reopened = await f.service();
  assert.equal((await reopened.getItem(a.id)).status, 'working');
  assert.equal((await reopened.getActivity(a.id)).at(-1).type, 'claimed');
  d.connection.prepare('UPDATE ned_work_items SET blocker=? WHERE id=?').run('{invalid', a.id);
  await assert.rejects(
    s.getItems(),
    (e) => e.code === 'database_failed' && !e.message.includes('invalid'),
  );
  d.connection.prepare('UPDATE ned_work_items SET blocker=NULL WHERE id=?').run(a.id);
  d.connection.prepare('UPDATE ned_schema SET version=2 WHERE id=1').run();
  assert.throws(
    () => openNedDatabase({ databaseUrl: f.databaseUrl }),
    (e) => e.code === 'unsupported_schema',
  );
  assert.equal(d.connection.prepare('SELECT version FROM ned_schema').get().version, 2);
  assert.equal(
    d.connection.prepare('SELECT title FROM ned_work_items WHERE id=?').get(a.id).title,
    'Committed',
  );
  d.connection.prepare('UPDATE ned_schema SET version=1 WHERE id=1').run();
  const readOnly = f.database();
  readOnly.connection.pragma('query_only=ON');
  const readonlyService = await createTaskService({ ...f.options, database: readOnly });
  await assert.rejects(
    readonlyService.createItem('task', { title: 'Not allowed' }),
    (e) => e.code === 'database_failed',
  );
  assert.equal((await s.getItems()).length, itemsBefore);
  d.close();
  await assert.rejects(direct.getItems(), (e) => e.code === 'database_failed');
});
