import { mkdtemp, mkdir, cp, writeFile, symlink, rm, readFile, readdir, lstat, chmod } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
export { assert, writeFile, readFile, rm };
const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
// Immutable source archives are read-only. Every copy here is owned mutable
// scratch state; preserve executable bits while restoring only owner access.
async function writableScratchCopy(src, dest, options = {}) {
  await cp(src, dest, options);
  async function restoreOwnerAccess(entry) {
    const stat = await lstat(entry);
    if (stat.isSymbolicLink()) return;
    await chmod(entry, (stat.mode & 0o777) | (stat.isDirectory() ? 0o700 : 0o200));
    if (stat.isDirectory())
      for (const name of await readdir(entry)) await restoreOwnerAccess(path.join(entry, name));
  }
  await restoreOwnerAccess(dest);
}
export async function fixture(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ned-hook '));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(path.join(dir, 'bin'));
  await mkdir(path.join(dir, 'scripts'));
  await writableScratchCopy(path.join(source, '.githooks'), path.join(dir, '.githooks'), { recursive: true });
  for (const file of ['pre-commit.mjs', 'install-git-hooks.mjs'])
    await writableScratchCopy(path.join(source, 'scripts', file), path.join(dir, 'scripts', file));
  const gitPath = spawnSync('/bin/sh', ['-c', 'command -v git'], { encoding: 'utf8' }).stdout.trim();
  await symlink(gitPath, path.join(dir, 'bin/git'));
  await symlink(process.execPath, path.join(dir, 'bin/node'));
  await writeFile(path.join(dir, 'bin/python'), `#!${process.execPath}\nprocess.exit(process.env.HOOK_FAIL==='python'?1:0);\n`, { mode: 0o755 });
  await writeFile(path.join(dir, 'bin/npm'), `#!${process.execPath}
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const script=process.argv[3];
fs.appendFileSync('.calls',script+'\\n');
if(process.env.GIT_INDEX_FILE||process.env.GIT_DIR||process.env.GIT_WORK_TREE)process.exit(32);
if(process.env.HOOK_FAIL==='signal')process.kill(process.pid,'SIGTERM');
if(process.env.HOOK_FAIL===script)process.exit(7);
if(script==='test:all'&&process.env.HOOK_MUTATE){
 fs.writeFileSync('README.md','check mutation\\n');
 if(process.env.HOOK_MUTATE==='index'){
  const result=spawnSync('git',['add','README.md']);if(result.status!==0)process.exit(8);
 }
}
`, { mode: 0o755 });
  await writeFile(path.join(dir, 'package.json'), '{"type":"module"}\n');
  await writeFile(path.join(dir, '.gitignore'), 'bin/\n.calls\n');
  await writeFile(path.join(dir, 'README.md'), 'baseline\n');
  const env = { ...process.env, PATH: path.join(dir, 'bin'), GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
  for (const key of ['GIT_DIR', 'GIT_INDEX_FILE', 'GIT_WORK_TREE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']) delete env[key];
  const run = (args, extra = {}) => spawnSync('git', args, { cwd: dir, env: { ...env, ...extra }, encoding: 'utf8', timeout: 15000 });
  for (const args of [['init'], ['config', 'user.name', 'Synthetic'], ['config', 'user.email', 'synthetic@example.test'], ['add', '.'], ['-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', 'commit', '-m', 'baseline']]) {
    const r = run(args); assert.equal(r.status, 0, r.stderr);
  }
  await writeFile(path.join(dir, 'README.md'), 'candidate\n');
  assert.equal(run(['add', 'README.md']).status, 0);
  const install = () => spawnSync(process.execPath, ['scripts/install-git-hooks.mjs'], { cwd: dir, env, encoding: 'utf8' });
  const commit = (extra = {}) => run(['-c', 'commit.gpgsign=false', 'commit', '-m', 'candidate'], extra);
  const calls = async () => (await readFile(path.join(dir, '.calls'), 'utf8').catch(() => '')).trim().split('\n').filter(Boolean);
  return { dir, env, run, install, commit, calls, head: () => run(['rev-parse', 'HEAD']).stdout.trim() };
}
