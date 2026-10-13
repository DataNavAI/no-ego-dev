import { test } from 'node:test';
import { cp, mkdir, writeFile, readFile, lstat, chmod, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fixture, assert, spawnSync, root } from './helpers.js';
import { createProfileArchive } from '../../../../src/profile-archive.js';
// These package copies are mutable test-owned fixtures, even when the
// authoritative source is immutable. Restore owner access only, retaining exec.
async function writablePackageFixture(entry) {
  const stat = await lstat(entry);
  if (stat.isSymbolicLink()) return;
  await chmod(entry, (stat.mode & 0o777) | (stat.isDirectory() ? 0o700 : 0o600));
  if (stat.isDirectory())
    for (const name of await readdir(entry)) await writablePackageFixture(path.join(entry, name));
}
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
      await writablePackageFixture(path.join(copy, name));
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
  // One distribution contract shared by npm and profile packaging.
  const entries = listed.stdout.split('\n');
  for (const manifest of [files, entries]) {
    for (const required of [
      'distribution.yaml', 'SOUL.md', 'AGENTS.md', 'config.yaml',
      'skills/identity-for-agent/SKILL.md', 'skills/identity-for-agent/EVAL.yaml',
      'skills/identity-for-agent/evaldata/README.md',
      'skills/identity-for-agent/references/profile-credential-policy.yaml',
      'skills/identity-for-agent/scripts/ifa_profile_guard.py',
      'docs/tasks.md', 'docs/features/task-management/SPEC.md',
      'docs/cli/INSTALL.md', 'docs/cli/CREDENTIALS.md',
      'docs/cli/TELEMETRY_PRIVACY.md', 'docs/browser/README.md',
    ]) assert.ok(manifest.includes(required), required);
    assert.ok(manifest.some((file) => file.startsWith('eval_runner/')));
    assert.ok(manifest.some((file) => file.startsWith('skills/coder/')));
    for (const excluded of ['.env', 'auth.json'])
      assert.ok(!manifest.includes(excluded), excluded);
    assert.ok(!manifest.some((file) => /^(?:node_modules|\.git)\//.test(file)));
    assert.ok(!manifest.some((file) => file.includes('__pycache__') || file.endsWith('.pyc')));
    assert.ok(!manifest.some((file) => /^docs\/features\/[^/]+\/tests\//.test(file)));
  }
  assert.ok(files.includes('scripts/install.sh'));
});
