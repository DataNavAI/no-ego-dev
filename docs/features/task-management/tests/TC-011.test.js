import { test } from 'node:test';
import { cp, mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fixture, assert, spawnSync, root, complete } from './helpers.js';
import { createProfileArchive } from '../../../../src/profile-archive.js';
test('TC-011: package/profile manifests exclude runtime SQLite data and spec test fixtures', async (t) => {
  const f = await fixture(t);
  const copy = path.join(f.directory, 'package');
  await mkdir(copy);
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  for (const name of new Set([
    ...pkg.files.filter((name) => !name.startsWith('!')),
    'package.json',
    '.npmignore',
  ])) {
    try {
      await cp(path.join(root, name), path.join(copy, name), { recursive: true });
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
  }
  await mkdir(path.join(copy, 'src/nested'), { recursive: true });
  await mkdir(path.join(copy, 'src/.beads'), { recursive: true });
  for (const name of [
    'runtime.sqlite',
    'runtime.sqlite-wal',
    'runtime.sqlite-shm',
    'runtime.sqlite-journal',
    'runtime.db',
    'runtime.db-wal',
    'runtime.db-journal',
  ])
    await writeFile(path.join(copy, 'src/nested', name), 'synthetic');
  await writeFile(path.join(copy, 'src/.beads', 'state.json'), '{}');
  const packed = spawnSync('npm', ['pack', '--dry-run', '--json'], { cwd: copy, encoding: 'utf8' });
  assert.equal(packed.status, 0, packed.stderr);
  const files = JSON.parse(packed.stdout)[0].files.map((i) => i.path);
  for (const file of [
    'src/database.js',
    'src/tasks.js',
    'docs/tasks.md',
    'docs/features/task-management/SPEC.md',
  ])
    assert.ok(files.includes(file), file);
  assert.ok(!files.some((file) => /\.sqlite|\.db(?:-|$)|\.beads\//.test(file)));
  assert.ok(!files.some((file) => file.startsWith('docs/features/task-management/tests/')));
  const archive = await createProfileArchive();
  const filename = path.join(f.directory, 'profile.tgz');
  await writeFile(filename, archive);
  const listed = spawnSync('tar', ['-tzf', filename], { encoding: 'utf8' });
  assert.equal(listed.status, 0, listed.stderr);
  assert.ok(listed.stdout.includes('docs/features/task-management/SPEC.md'));
  assert.ok(!listed.stdout.includes('task-management/tests/'));
  assert.ok(!listed.stdout.includes('.sqlite'));
  const s = await f.service({ env: { PATH: '/no-beads' } }),
    a = await s.createItem('task', { title: 'No Beads' });
  await complete(s, a.id);
  assert.equal((await s.getItem(a.id)).status, 'done');
  assert.equal(f.processCli(['ready', '--json'], { PATH: '/no-beads' }).status, 0);
});
