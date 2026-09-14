import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { readDaytonaCredential } from '../../src/daytona-credential.js';

async function withCredentialRoot(mode, callback) {
  const parent = await mkdtemp(join(tmpdir(), 'ned-runtime-credential-'));
  const root = join(parent, 'secrets');
  const credentialPath = join(root, 'daytona_api_key');
  await mkdir(root, { mode: 0o700 });
  await chmod(root, 0o700);
  await writeFile(credentialPath, 'synthetic-runtime-daytona-key\n', { mode });
  await chmod(credentialPath, mode);
  try {
    await callback({ root, credentialPath });
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
}

test('owner-only runtime credential file is the sole accepted credential channel', async () => {
  await withCredentialRoot(0o600, ({ root, credentialPath }) => {
    assert.equal(readDaytonaCredential({ credentialRoot: root, credentialPath }), 'synthetic-runtime-daytona-key');
  });
});

test('runtime credential reader fails closed for a non-owner-only file', async () => {
  await withCredentialRoot(0o644, ({ root, credentialPath }) => {
    assert.throws(
      () => readDaytonaCredential({ credentialRoot: root, credentialPath }),
      /owner-only runtime credential file/i,
    );
  });
});
