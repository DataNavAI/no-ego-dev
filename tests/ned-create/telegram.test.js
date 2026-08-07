import assert from 'node:assert/strict';
import { test } from 'node:test';

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

test('Telegram setup opens BotFather when possible, prints numbered actions, and prompts exactly through hidden input', async () => {
  const logs = [];
  const opened = [];
  const prompts = [];
  const token = runtimeToken();
  let requested;

  const connection = await acquireTelegramConnection({
    log: (line) => logs.push(line),
    openExternal: async (url) => opened.push(url),
    promptHidden: async (prompt) => { prompts.push(prompt); return token; },
    fetchImpl: async (url, options) => { requested = { url, options }; return okGetMe(); },
  });

  assert.deepEqual(opened, [BOTFATHER_URL]);
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
