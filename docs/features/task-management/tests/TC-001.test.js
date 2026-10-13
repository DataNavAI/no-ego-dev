import { test } from 'node:test';
import { writeFile, readFile, symlink, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fixture, assert, createTaskService, openNedDatabase, spawnSync, root } from './helpers.js';
import { resolveDatabasePath } from '../../../../src/database.js';
test('TC-001: explicit setup, canonical identities and shared database configuration', async (t) => {
  const f = await fixture(t);
  const sentinel = path.join(f.project, 'AGENTS.md');
  await writeFile(sentinel, 'sentinel');
  const s = await f.service({}, false);
  await assert.rejects(s.getItems(), (e) => e.code === 'not_initialized');
  const d = f.database();
  d.setFeatureValue('another-feature', 'config', { enabled: true });
  const first = await s.initialize(),
    a = await s.createItem('task', { title: 'Persist' });
  assert.deepEqual(await s.initialize(), first);
  assert.equal((await s.getItem(a.id)).title, 'Persist');
  assert.deepEqual(d.getFeatureValue('another-feature', 'config'), { enabled: true });
  assert.equal(await readFile(sentinel, 'utf8'), 'sentinel');
  await assert.rejects(stat(path.join(f.project, '.beads')), (e) => e.code === 'ENOENT');
  await assert.rejects(stat(path.join(f.project, '.git')), (e) => e.code === 'ENOENT');
  const alias = path.join(f.directory, 'alias');
  await symlink(f.project, alias, 'dir');
  const aliased = await f.service({ project: alias });
  assert.equal(aliased.project.id, s.project.id);
  const other = await f.service({ project: f.other });
  assert.notEqual(other.project.id, s.project.id);
  assert.deepEqual(await other.getItems(), []);
  assert.equal(resolveDatabasePath({ home: f.home, env: {} }), f.databaseUrl);
  assert.equal(
    resolveDatabasePath({ home: f.home, env: { NED_DATABASE_URL: '/env.sqlite' } }),
    '/env.sqlite',
  );
  assert.equal(
    resolveDatabasePath({
      databaseUrl: pathToFileURL(f.databaseUrl).href,
      env: { NED_DATABASE_URL: '/env.sqlite' },
    }),
    f.databaseUrl,
  );
  const envService = await f.service({
    databaseUrl: undefined,
    env: { NED_DATABASE_URL: f.databaseUrl, BEADS_DIR: '/wrong', BD_DB: '/wrong' },
    actor: 'human:owner',
  });
  assert.equal((await envService.createItem('task', { title: 'Human' })).createdBy, 'human:owner');
  for (const actor of ['bad', 'agent:', 'human:bad name', `agent:${'a'.repeat(101)}`])
    await assert.rejects(
      createTaskService({ ...f.options, actor }),
      (e) => e.code === 'invalid_actor',
    );
  for (const project of [sentinel, path.join(f.directory, 'missing')])
    await assert.rejects(
      createTaskService({ ...f.options, project }),
      (e) => e.code === 'invalid_project',
    );
  for (const databaseUrl of [
    '',
    'postgres://private-secret@host/db',
    'file://remote/test',
    'file:/tmp/x?mode=rw',
  ])
    assert.throws(
      () => openNedDatabase({ databaseUrl }),
      (e) => e.code === 'invalid_database' && !e.message.includes('private-secret'),
    );
  const cwd = spawnSync(
    process.execPath,
    [path.join(root, 'bin/ned.js'), 'task', 'list', '--database', f.databaseUrl, '--json'],
    { cwd: f.project, env: { ...process.env, HOME: f.home }, encoding: 'utf8' },
  );
  assert.equal(cwd.status, 0, cwd.stderr);
  assert.equal(JSON.parse(cwd.stdout).length, 2);
  const defaultActor = spawnSync(
    process.execPath,
    [
      path.join(root, 'bin/ned.js'),
      'task',
      'create',
      'Default actor',
      '--database',
      f.databaseUrl,
      '--json',
    ],
    { cwd: f.project, env: { ...process.env, HOME: f.home }, encoding: 'utf8' },
  );
  assert.equal(defaultActor.status, 0, defaultActor.stderr);
  assert.ok(JSON.parse(defaultActor.stdout).createdBy.startsWith('human:'));
  const mode = (await stat(f.databaseUrl)).mode & 0o777;
  if (process.platform !== 'win32') assert.equal(mode, 0o600);
});
