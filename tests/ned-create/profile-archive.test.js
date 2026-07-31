import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { createProfileArchive } from '../../src/profile-archive.js';

test('profile archive contains the distribution but excludes runtime state and repository metadata', async () => {
  const archive = await createProfileArchive();
  const directory = await mkdtemp(path.join(os.tmpdir(), 'ned-profile-'));
  const archivePath = path.join(directory, 'profile.tgz');
  await writeFile(archivePath, archive);
  const listed = spawnSync('tar', ['-tzf', archivePath], { encoding: 'utf8' });

  assert.equal(listed.status, 0, listed.stderr);
  const entries = listed.stdout.split('\n');
  assert.ok(entries.includes('distribution.yaml'));
  assert.ok(entries.includes('SOUL.md'));
  assert.ok(entries.includes('config.yaml'));
  assert.ok(entries.some((entry) => entry.startsWith('skills/coder/')));
  assert.ok(entries.includes('skills/identity-for-agent/SKILL.md'));
  assert.ok(entries.includes('skills/identity-for-agent/EVAL.yaml'));
  assert.ok(entries.includes('skills/identity-for-agent/evaldata/README.md'));
  assert.ok(entries.includes('skills/identity-for-agent/references/profile-credential-policy.yaml'));
  assert.ok(entries.includes('skills/identity-for-agent/scripts/ifa_profile_guard.py'));
  assert.ok(entries.some((entry) => entry.startsWith('eval_runner/')));
  assert.ok(entries.includes('evaldata/ned-create/EVAL.yaml'));
  assert.equal(entries.some((entry) => entry.startsWith('.git/')), false);
  assert.equal(entries.includes('.env'), false);
  assert.equal(entries.includes('auth.json'), false);
  assert.equal(entries.some((entry) => entry.includes('__pycache__') || entry.endsWith('.pyc')), false);
});
