import assert from 'node:assert/strict';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { buildLaunchEnvironment, defaultReadCredential, needsDaytona, readHiddenDaytonaKey, runLauncher } from '../../src/launcher.js';

function runHiddenDaytonaKeyPty(env = process.env) {
  const moduleUrl = pathToFileURL(resolve('src/launcher.js')).href;
  const childProgram = `
    import { readHiddenDaytonaKey } from ${JSON.stringify(moduleUrl)};
    try {
      const value = await readHiddenDaytonaKey();
      console.log(value === 'DAYTONA_PTY_FIXTURE' ? 'RESULT:accepted' : 'RESULT:wrong');
    } catch (error) {
      console.log('ERROR:' + error.message);
    }
  `;
  const ptyRunner = `
import fcntl, os, pty, select, sys, termios, time
master, slave = pty.openpty()
pid = os.fork()
if pid == 0:
    os.setsid()
    fcntl.ioctl(slave, termios.TIOCSCTTY, 0)
    os.dup2(slave, 0)
    os.dup2(slave, 1)
    os.dup2(slave, 2)
    os.execvpe(${JSON.stringify(process.execPath)}, ${JSON.stringify([process.execPath, '--input-type=module', '-e', childProgram])}, os.environ)
output = b''
sent = False
echo_at_prompt = None
deadline = time.monotonic() + 10
while time.monotonic() < deadline:
    ready, _, _ = select.select([master], [], [], 0.1)
    if ready:
        try: data = os.read(master, 4096)
        except OSError: break
        if not data: break
        output += data
        if not sent and b'input hidden' in output:
            echo_at_prompt = bool(termios.tcgetattr(master)[3] & termios.ECHO)
            os.write(master, b'DAYTONA_PTY_FIXTURE\\n')
            sent = True
    done, status = os.waitpid(pid, os.WNOHANG)
    if done: break
else:
    os.kill(pid, 9)
    _, status = os.waitpid(pid, 0)
echo_after_exit = bool(termios.tcgetattr(master)[3] & termios.ECHO)
sys.stdout.buffer.write(output)
print('ECHO_AT_PROMPT:' + ('none' if echo_at_prompt is None else str(int(echo_at_prompt))))
print('ECHO_AFTER_EXIT:' + str(int(echo_after_exit)))
sys.exit(os.waitstatus_to_exitcode(status))
`;
  return spawnSync('python3', ['-c', ptyRunner], { encoding: 'utf8', env });
}


test('Daytona replacement-key prompt uses the controlling TTY, suppresses echo, and restores it', () => {
  const child = runHiddenDaytonaKeyPty();
  assert.equal(child.status, 0, child.stderr);
  assert.match(child.stdout, /RESULT:accepted/);
  assert.doesNotMatch(child.stdout, /DAYTONA_PTY_FIXTURE|ERROR:/);
  assert.match(child.stdout, /ECHO_AT_PROMPT:0/);
  assert.match(child.stdout, /ECHO_AFTER_EXIT:1/);
});

test('Daytona replacement-key prompt fails closed before prompting when echo suppression fails', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ned-daytona-no-echo-'));
  const stty = join(root, 'stty');
  await writeFile(stty, '#!/bin/sh\nexit 1\n');
  await chmod(stty, 0o755);
  const child = runHiddenDaytonaKeyPty({ ...process.env, PATH: `${root}:${process.env.PATH}` });
  assert.equal(child.status, 0, child.stderr);
  assert.match(child.stdout, /ERROR:NED: interactive terminal with hidden input is required/);
  assert.doesNotMatch(child.stdout, /input hidden|DAYTONA_PTY_FIXTURE|RESULT:/);
  assert.match(child.stdout, /ECHO_AT_PROMPT:none/);
  assert.match(child.stdout, /ECHO_AFTER_EXIT:1/);
  await rm(root, { recursive: true, force: true });
});

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
