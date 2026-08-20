import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

test('spawned create errors stream before exit without exposing child credentials', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ned-launcher-stderr-'));
  const appEntry = join(root, 'app', 'bin', 'ned.js');
  const telegramToken = `123456789:${'A'.repeat(35)}`;
  const daytonaKey = 'synthetic-daytona-api-key-for-stderr-redaction';
  await mkdir(join(root, 'app', 'bin'), { recursive: true });
  await writeFile(appEntry, [
    "process.stderr.write('NED create failed: normal child error\\n');",
    'setTimeout(() => {',
    `  process.stderr.write('request https://api.telegram.org/bot${telegramToken}/getMe\\n');`,
    "  process.stderr.write(`DAYTONA_API_KEY=${process.env.DAYTONA_API_KEY}\\n`);",
    '  setTimeout(() => process.exit(17), 200);',
    '}, 50);',
  ].join('\n'));

  const originalWrite = process.stderr.write;
  let emitted = '';
  let sawNormal;
  let launcherSettled = false;
  process.stderr.write = (chunk) => {
    emitted += String(chunk);
    if (emitted.includes('NED create failed: normal child error')) sawNormal?.();
    return true;
  };
  try {
    const normalOutput = new Promise((resolve) => { sawNormal = resolve; });
    const launcher = runLauncher(['create'], {
      env: { HOME: root },
      generation: root,
      exists: () => true,
      readCredential: async () => daytonaKey,
    }).finally(() => { launcherSettled = true; });
    await Promise.race([
      normalOutput,
      new Promise((_, reject) => setTimeout(() => reject(new Error('normal child stderr did not stream')), 1_000)),
    ]);
    assert.equal(launcherSettled, false, 'normal child stderr must stream before child exit');
    assert.equal(await launcher, 17);
    assert.match(emitted, /NED create failed: normal child error/);
    assert.equal(/api\.telegram\.org\/bot/i.test(emitted), false, 'Telegram Bot API URL must be redacted');
    assert.equal(emitted.includes(telegramToken), false, 'Telegram token must be redacted');
    assert.equal(emitted.includes(daytonaKey), false, 'Daytona API key must be redacted');
  } finally {
    process.stderr.write = originalWrite;
    await rm(root, { recursive: true, force: true });
  }
});
