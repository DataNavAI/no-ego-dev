import assert from 'node:assert/strict';
import { mkdtemp, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { createFileStateStore } from '../../src/state.js';

test('file state persists non-secret workspace metadata with owner-only permissions', async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'ned-state-'));
  const store = createFileStateStore({ home });
  const state = { schemaVersion: 1, provider: 'daytona', workspaceId: 'sandbox-123' };

  await store.save(state);

  assert.deepEqual(await store.load(), state);
  const info = await stat(path.join(home, '.ned', 'state.json'));
  assert.equal(info.mode & 0o777, 0o600);
});
