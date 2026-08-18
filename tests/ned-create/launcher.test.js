import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildLaunchEnvironment, defaultReadCredential, needsDaytona, runLauncher } from '../../src/launcher.js';

test('version and help never require Daytona authorization', () => {
  assert.equal(needsDaytona(['--version']), false);
  assert.equal(needsDaytona(['version']), false);
  assert.equal(needsDaytona(['--help']), false);
  assert.equal(needsDaytona(['create', '--dry-run']), false);
  assert.equal(needsDaytona(['create']), true);
  assert.equal(needsDaytona(['chat', 'hello']), true);
});

test('launcher passes credentials only through the child environment', () => {
  const env = buildLaunchEnvironment({ baseEnv: { PATH: '/bin' }, token: 'secret-token' });
  assert.equal(env.DAYTONA_API_KEY, 'secret-token');
  assert.equal(env.PATH, '/bin');
});

test('version delegates directly to the Node CLI without credential lookup', async () => {
  let captured;
  const status = await runLauncher(['--version'], {
    env: { HOME: '/tmp/test-home' },
    generation: '/tmp/test-generation',
    exists: () => true,
    spawn: (command, args, options) => {
      captured = { command, args, options };
      return { status: 0 };
    },
    readCredential: async () => { throw new Error('credential lookup must not run'); },
  });
  assert.equal(status, 0);
  assert.equal(captured.args.at(-1), '--version');
  assert.equal(captured.options.env.DAYTONA_API_KEY, undefined);
});

test('an explicitly exported Daytona key takes precedence over stored credentials', async () => {
  assert.equal(
    await defaultReadCredential('/tmp/test-home', { DAYTONA_API_KEY: ' explicit-key ' }),
    'explicit-key',
  );
});
