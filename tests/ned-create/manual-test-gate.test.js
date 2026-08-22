import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cp, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const verifierPath = path.join(repositoryRoot, 'scripts/verify-manual-test-result.mjs');

function git(directory, args) {
  return execFileSync('git', args, { cwd: directory, encoding: 'utf8' }).trim();
}

test('manual test gate rejects evidence for a prior code commit when the PR candidate is newer', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'ned-manual-test-gate-'));
  t.after(() => rm(directory, { recursive: true, force: true }));

  await mkdir(path.join(directory, '.github'), { recursive: true });
  await mkdir(path.join(directory, 'scripts'), { recursive: true });
  await cp(verifierPath, path.join(directory, 'scripts/verify-manual-test-result.mjs'));
  await writeFile(path.join(directory, 'app.js'), 'export const version = 1;\n');
  git(directory, ['init', '--quiet']);
  git(directory, ['config', 'user.email', 'test@example.invalid']);
  git(directory, ['config', 'user.name', 'Manual test gate test']);
  git(directory, ['add', '.']);
  git(directory, ['commit', '--quiet', '-m', 'base']);
  const baseSha = git(directory, ['rev-parse', 'HEAD']);

  await writeFile(path.join(directory, 'app.js'), 'export const version = 2;\n');
  git(directory, ['add', 'app.js']);
  git(directory, ['commit', '--quiet', '-m', 'code change']);
  const codeChangeSha = git(directory, ['rev-parse', 'HEAD']);

  await writeFile(path.join(directory, '.github/manual-test-result.json'), JSON.stringify({
    candidate_sha: codeChangeSha,
    result: 'pass',
    tested_at: '2026-08-22T00:00:00Z',
    environment: 'isolated regression fixture',
    commands: ['node --test'],
    observations: 'The code change was manually tested.',
  }, null, 2));
  git(directory, ['add', '.github/manual-test-result.json']);
  git(directory, ['commit', '--quiet', '-m', 'record manual evidence']);
  const headSha = git(directory, ['rev-parse', 'HEAD']);

  const result = spawnSync(process.execPath, ['scripts/verify-manual-test-result.mjs'], {
    cwd: directory,
    encoding: 'utf8',
    env: { ...process.env, MANUAL_TEST_BASE_SHA: baseSha, MANUAL_TEST_HEAD_SHA: headSha },
  });

  assert.notEqual(result.status, 0, `expected stale evidence to be rejected, got stdout: ${result.stdout}`);
  assert.match(result.stderr, /candidate_sha .* does not match exact candidate SHA/);
});
