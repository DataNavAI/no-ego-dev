import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runLauncher } from '../../src/launcher.js';

test('launcher delegates all arguments once without credential lookup or retry', async () => {
  for (const command of ['--version', 'task', 'com', 'chat', 'doctor', 'repair', 'reset', 'pair', 'destroy']) {
    let captured, calls = 0;
    const env = { HOME: '/tmp/synthetic-home', NED_DATABASE_URL: '/tmp/synthetic.sqlite' };
    assert.equal(await runLauncher([command, '--help'], {
      env, generation: '/tmp/synthetic-generation', exists: () => true,
      readCredential: async () => assert.fail('credential lookup must not run'),
      promptCredential: async () => assert.fail('credential prompt must not run'),
      spawn: (node, args, options) => { calls++; captured = { node, args, options }; return { status: 2 }; },
    }), 2);
    assert.equal(calls, 1);
    assert.deepEqual(captured.args, ['/tmp/synthetic-generation/app/bin/ned.js', command, '--help']);
    assert.deepEqual(captured.options.env, env);
  }
});

test('launcher validates installation before spawning and preserves real child exit status', async (t) => {
  await assert.rejects(runLauncher([], { env: {} }), /HOME must be set/);
  await assert.rejects(runLauncher([], { env: { HOME: '/synthetic' }, exists: () => false }), /installation is missing/);
  await assert.rejects(runLauncher([], { env: { HOME: '/synthetic' }, exists: path => !path.endsWith('/ned.js') }), /installation is incomplete/);
  const root = await mkdtemp(join(tmpdir(), 'ned-launcher-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'app', 'bin'), { recursive: true });
  await writeFile(join(root, 'app', 'bin', 'ned.js'), 'process.exit(17);');
  assert.equal(await runLauncher(['task'], { env: { HOME: root }, generation: root }), 17);
});
