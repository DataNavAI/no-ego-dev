import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runCli } from '../../src/cli.js';
import { createModelConnection } from '../../src/model-providers.js';

function telegramConnection() {
  let token = `123456789:${'A'.repeat(35)}`;
  return {
    botUsername: 'ned_integration_bot',
    botUrl: 'https://t.me/ned_integration_bot',
    consumeToken() {
      const value = token;
      token = '';
      return value;
    },
    toJSON() { return { botUsername: this.botUsername, botUrl: this.botUrl }; },
  };
}

test('ned create completes the mocked Daytona and Telegram journey with verbose stages', async () => {
  const stdout = [];
  const stderr = [];
  const calls = [];
  const modelConnection = createModelConnection({
    providerId: 'openai-codex',
    method: 'oauth-device-code',
    value: 'synthetic-model-access',
  });
  const app = {
    async verifyAuthorization() { calls.push('daytona.verifyAuthorization'); },
    async create({ modelConnection: model, telegramConnection: telegram }) {
      calls.push(['daytona.create', model.providerId, telegram.botUsername]);
      return { ready: true };
    },
  };
  const exitCode = await runCli(['create', '--verbose'], {
    log: (message) => stdout.push(message),
    error: (message) => stderr.push(message),
  }, {
    env: { DAYTONA_API_KEY: 'synthetic-daytona-key' },
    appFactory: async ({ verbose, log }) => {
      assert.equal(verbose, true);
      log('mock: Daytona provider initialized');
      calls.push('daytona.factory');
      return app;
    },
    getModelConnection: async () => {
      calls.push('chatgpt.authorize');
      return modelConnection;
    },
    getTelegramConnection: async () => {
      calls.push('telegram.validate');
      return telegramConnection();
    },
    telemetry: { async capture() {} },
  });

  assert.equal(exitCode, 0, stderr.join('\n'));
  assert.deepEqual(calls, [
    'daytona.factory',
    'daytona.verifyAuthorization',
    'chatgpt.authorize',
    'telegram.validate',
    ['daytona.create', 'openai-codex', 'ned_integration_bot'],
  ]);
  assert.equal(stderr.length, 0);
  const output = stdout.join('\n');
  for (const stage of [
    'create: initializing Daytona provider',
    'create: validating Daytona authorization',
    'create: Daytona authorization accepted',
    'create: authorizing ChatGPT',
    'create: ChatGPT authorization accepted',
    'create: starting Telegram bot setup',
    'create: Telegram bot validated as @ned_integration_bot',
    'create: provisioning Daytona workspace and gateway',
    'create: workspace health verified and local state persisted',
  ]) assert.match(output, new RegExp(stage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.equal(output.includes('synthetic-daytona-key'), false);
  assert.equal(output.includes('synthetic-model-access'), false);
});
