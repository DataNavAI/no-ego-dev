import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('COM serves approved artifacts only behind a random capability', async t => {
  const module = await import('../../src/com/server.js').catch(() => ({}));
  assert.equal(typeof module.startCom, 'function', 'COM server must exist');
  const root = await mkdtemp(join(tmpdir(), 'ned-com-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, 'hello.md'), '# Hello');
  const app = await module.startCom({ root, local: true, port: 0, state: join(root, '.receipt.json') });
  t.after(() => app.close());
  assert.match(app.receipt.capability, /^[a-f0-9]{64}$/);
  assert.equal((await fetch(app.receipt.localOrigin + '/api/artifacts')).status, 404);
  const response = await fetch(app.url + 'api/artifacts');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.deepEqual((await response.json()).artifacts.map(a => a.path), ['hello.md']);
});
