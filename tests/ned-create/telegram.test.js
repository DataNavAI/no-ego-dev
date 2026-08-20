import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chmod, mkdtemp, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  BOTFATHER_URL,
  TELEGRAM_DOCS_URL,
  acquireTelegramConnection,
  redactTelegramText,
} from '../../src/telegram.js';

function runtimeToken() {
  return ['123456789', ':', 'A'.repeat(35)].join('');
}

function okGetMe(username = 'ned_disposable_bot') {
  return {
    ok: true,
    status: 200,
    async json() {
      return { ok: true, result: { id: 1, is_bot: true, username } };
    },
  };
}

test('hidden Telegram token reader fails closed when controlling-TTY echo suppression cannot be established', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ned-telegram-no-echo-'));
  const stty = join(root, 'stty');
  const moduleUrl = pathToFileURL(resolve('src/telegram.js')).href;
  await writeFile(stty, '#!/bin/sh\nexit 1\n');
  await chmod(stty, 0o755);

  const childProgram = `
    import { readHiddenTelegramToken } from ${JSON.stringify(moduleUrl)};
    try {
      await readHiddenTelegramToken();
      console.log('RESULT:accepted');
    } catch (error) {
      console.log('ERROR:' + error.message);
    }
  `;
  const ptyRunner = `
import os, pty, select, sys
pid, fd = pty.fork()
if pid == 0:
    os.execvpe(${JSON.stringify(process.execPath)}, ${JSON.stringify([process.execPath, '--input-type=module', '-e', childProgram])}, os.environ)
output = b''
sent = False
while True:
    ready, _, _ = select.select([fd], [], [], 1)
    if ready:
        try:
            data = os.read(fd, 4096)
        except OSError:
            break
        if not data:
            break
        output += data
        if not sent and b'input hidden' in output:
            os.write(fd, b'not-a-real-token\\n')
            sent = True
    else:
        _, status = os.waitpid(pid, os.WNOHANG)
        if status:
            break
_, status = os.waitpid(pid, 0)
sys.stdout.buffer.write(output)
sys.exit(os.waitstatus_to_exitcode(status))
`;
  const child = spawnSync('python3', ['-c', ptyRunner], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${root}:${process.env.PATH}` },
  });

  assert.equal(child.status, 0, child.stderr);
  assert.match(child.stdout, /ERROR:Telegram setup needs an interactive TTY/);
  assert.doesNotMatch(child.stdout, /RESULT:accepted/);
});

test('hidden Telegram token reader accepts input through a controlling TTY after echo is suppressed', () => {
  const moduleUrl = pathToFileURL(resolve('src/telegram.js')).href;
  const childProgram = `
    import { readHiddenTelegramToken } from ${JSON.stringify(moduleUrl)};
    try {
      console.log('RESULT:' + await readHiddenTelegramToken());
    } catch (error) {
      console.log('ERROR:' + error.message);
    }
  `;
  const ptyRunner = `
import os, pty, select, sys
pid, fd = pty.fork()
if pid == 0:
    os.execvpe(${JSON.stringify(process.execPath)}, ${JSON.stringify([process.execPath, '--input-type=module', '-e', childProgram])}, os.environ)
output = b''
sent = False
while True:
    ready, _, _ = select.select([fd], [], [], 1)
    if ready:
        try:
            data = os.read(fd, 4096)
        except OSError:
            break
        if not data:
            break
        output += data
        if not sent and b'input hidden' in output:
            os.write(fd, b'not-a-real-token\\n')
            sent = True
    else:
        _, status = os.waitpid(pid, os.WNOHANG)
        if status:
            break
_, status = os.waitpid(pid, 0)
sys.stdout.buffer.write(output)
sys.exit(os.waitstatus_to_exitcode(status))
`;
  const child = spawnSync('python3', ['-c', ptyRunner], { encoding: 'utf8' });

  assert.equal(child.status, 0, child.stderr);
  assert.match(child.stdout, /RESULT:not-a-real-token/);
  assert.doesNotMatch(child.stdout, /ERROR:/);
});

test('Telegram setup never opens BotFather, prints numbered actions, and prompts exactly through hidden input', async () => {
  const logs = [];
  const prompts = [];
  const token = runtimeToken();
  let requested;

  const connection = await acquireTelegramConnection({
    log: (line) => logs.push(line),
    readStoredToken: async () => null,
    promptHidden: async (prompt) => { prompts.push(prompt); return token; },
    fetchImpl: async (url, options) => { requested = { url, options }; return okGetMe(); },
  });

  assert.deepEqual(prompts, ['Paste the Telegram bot token (input hidden): ']);
  assert.match(logs.join('\n'), /Telegram requires you to create a bot through its official @BotFather; NED cannot accept BotFather legal or ownership actions for you\./);
  assert.match(logs.join('\n'), /1\. Open BotFather/);
  assert.match(logs.join('\n'), /2\. Send \/newbot/);
  assert.match(logs.join('\n'), /3\. Choose a display name/);
  assert.match(logs.join('\n'), /4\. Choose a unique username ending in bot/);
  assert.match(logs.join('\n'), /5\. Copy the token/);
  assert.equal(logs.join('\n').includes(token), false);
  assert.equal(requested.url, `https://api.telegram.org/bot${token}/getMe`);
  assert.equal(requested.options.method, 'GET');
  assert.equal(connection.botUsername, 'ned_disposable_bot');
  assert.equal(connection.botUrl, 'https://t.me/ned_disposable_bot');
  assert.equal(JSON.stringify(connection).includes(token), false);
  assert.equal(connection.consumeToken(), token);
  assert.throws(() => connection.consumeToken(), /already consumed/);
});

test('stored macOS Keychain token is validated in-process without BotFather prompts or token output', async () => {
  const token = runtimeToken();
  const logs = [];
  let promptCalled = false;
  const connection = await acquireTelegramConnection({
    log: (message) => logs.push(message),
    readStoredToken: async () => token,
    openExternal: async () => assert.fail('stored token must not open BotFather'),
    promptHidden: async () => { promptCalled = true; return ''; },
    fetchImpl: async () => ({
      ok: true,
      async json() { return { ok: true, result: { is_bot: true, username: 'ned_disposable_bot' } }; },
    }),
  });

  assert.equal(promptCalled, false);
  assert.equal(connection.botUrl, 'https://t.me/ned_disposable_bot');
  assert.equal(logs.join('\n').includes(token), false);
  assert.equal(logs.length, 0);
});

test('Telegram getMe rejects invalid or revoked credentials with recovery copy and never repeats provider data', async () => {
  const token = runtimeToken();
  await assert.rejects(
    () => acquireTelegramConnection({
      log() {},
      readStoredToken: async () => null,
      openExternal: async () => {},
      promptHidden: async () => token,
      fetchImpl: async () => ({
        ok: false,
        status: 401,
        async json() { return { ok: false, description: `Unauthorized ${token}` }; },
      }),
    }),
    (error) => error.message.includes('invalid or revoked')
      && error.message.includes(TELEGRAM_DOCS_URL)
      && !error.message.includes(token),
  );
});

test('Telegram validation redacts token-in-path network failures and hostile bot identity data', async () => {
  const token = runtimeToken();
  await assert.rejects(
    () => acquireTelegramConnection({
      log() {},
      readStoredToken: async () => null,
      openExternal: async () => {},
      promptHidden: async () => token,
      fetchImpl: async (url) => { throw new Error(`request failed: ${url}`); },
    }),
    (error) => /could not validate/.test(error.message)
      && error.message.includes(TELEGRAM_DOCS_URL)
      && !error.message.includes(token),
  );

  await assert.rejects(
    () => acquireTelegramConnection({
      log() {},
      readStoredToken: async () => null,
      openExternal: async () => {},
      promptHidden: async () => token,
      fetchImpl: async () => okGetMe(`bad name ${token}`),
    }),
    (error) => /invalid bot identity/.test(error.message) && !error.message.includes(token),
  );

  assert.equal(redactTelegramText(`https://api.telegram.org/bot${token}/getMe ${token}`), '[REDACTED]');
});

test('Telegram setup handles hidden-input cancellation and validation timeout without provisioning', async () => {
  await assert.rejects(
    () => acquireTelegramConnection({
      log() {},
      readStoredToken: async () => null,
      openExternal: async () => {},
      promptHidden: async () => '',
      fetchImpl: async () => assert.fail('empty token must not call Telegram'),
    }),
    (error) => /cancelled/.test(error.message) && error.message.includes(TELEGRAM_DOCS_URL),
  );

  const token = runtimeToken();
  await assert.rejects(
    () => acquireTelegramConnection({
      log() {},
      readStoredToken: async () => null,
      openExternal: async () => {},
      promptHidden: async () => token,
      timeoutMs: 5,
      fetchImpl: async (_url, { signal }) => new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
      }),
    }),
    (error) => /timed out/.test(error.message) && !error.message.includes(token),
  );
});
