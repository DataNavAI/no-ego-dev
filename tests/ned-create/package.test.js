import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('published npm package contains the NED distribution and excludes runtime secrets', () => {
  const result = spawnSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  const manifest = JSON.parse(result.stdout)[0];
  const files = manifest.files.map((entry) => entry.path);

  for (const required of ['distribution.yaml', 'SOUL.md', 'AGENTS.md', 'config.yaml', 'scripts/install.sh']) {
    assert.ok(files.includes(required), `${required} missing from npm package`);
  }
  assert.ok(files.some((file) => file.startsWith('skills/coder/')));
  assert.ok(files.includes('skills/identity-for-agent/SKILL.md'));
  assert.ok(files.includes('skills/identity-for-agent/EVAL.yaml'));
  assert.ok(files.includes('skills/identity-for-agent/evaldata/README.md'));
  assert.ok(files.includes('skills/identity-for-agent/references/profile-credential-policy.yaml'));
  assert.ok(files.includes('skills/identity-for-agent/scripts/ifa_profile_guard.py'));
  assert.ok(files.some((file) => file.startsWith('eval_runner/')));
  assert.ok(files.includes('evaldata/ned-create/EVAL.yaml'));
  assert.equal(files.includes('.env'), false);
  assert.equal(files.includes('auth.json'), false);
  assert.equal(files.some((file) => file.startsWith('node_modules/')), false);
  assert.equal(files.some((file) => file.startsWith('.git/')), false);
  assert.equal(files.some((file) => file.includes('__pycache__') || file.endsWith('.pyc')), false);
});
