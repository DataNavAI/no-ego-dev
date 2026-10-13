import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createNedApp } from '../../src/app.js';
import { runCli } from '../../src/cli.js';
import { createModelConnection } from '../../src/model-providers.js';
import { NED_PLAN } from '../../src/plan.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function codexConnection(value = 'synthetic-codex-access') {
  return createModelConnection({ providerId: 'openai-codex', method: 'oauth-device-code', value });
}

function telegramConnection() {
  let value = ['123456789', ':', 'A'.repeat(35)].join('');
  return {
    botUsername: 'ned_disposable_bot',
    botUrl: 'https://t.me/ned_disposable_bot',
    consumeToken() { const token = value; value = ''; return token; },
    toJSON() { return { botUsername: this.botUsername, botUrl: this.botUrl }; },
  };
}

function runNed(args, env = {}) {
  return spawnSync(process.execPath, ['bin/ned.js', ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { PATH: process.env.PATH, HOME: process.env.HOME, ...env },
  });
}

test('CLI reports the installed version without requiring credentials', () => {
  for (const args of [['--version'], ['version']]) {
    const result = runNed(args, { DAYTONA_API_KEY: '' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), '0.2.1');
    assert.equal(result.stderr, '');
  }
});

test('chat refreshes the exact remote model credential, wakes the saved workspace, and returns the NED response', async () => {
  const calls = [];
  const state = {
    workspaceId: 'sandbox-123', profile: 'ned', modelProvider: 'openai-codex',
    secretId: 'secret-1', secretName: 'ned_model_openai_codex_test',
  };
  const provider = {
    async updateModelCredential(saved, connection) { calls.push(['refresh', saved.secretId, connection.providerId]); },
    async start(workspaceId) { calls.push(['start', workspaceId]); },
    async chat(workspaceId, profile, prompt) {
      calls.push(['chat', workspaceId, profile, prompt]);
      return 'Shipped the smallest working slice.';
    },
  };
  const app = createNedApp({
    provider,
    stateStore: { async load() { return state; } },
  });

  const response = await app.chat('Build the smallest useful product.', codexConnection());

  assert.equal(response, 'Shipped the smallest working slice.');
  assert.deepEqual(calls, [
    ['refresh', 'secret-1', 'openai-codex'],
    ['start', 'sandbox-123'],
    ['chat', 'sandbox-123', 'ned', 'Build the smallest useful product.'],
  ]);
});

test('CLI chat accepts the product request as arguments and prints only NED output', async () => {
  const stdout = [];
  let prompt;
  const exitCode = await runCli(['chat', 'Build', 'a', 'real', 'product'], {
    log: (message) => stdout.push(message),
    error: assert.fail,
  }, {
    env: { DAYTONA_API_KEY: 'daytona-secret' },
    getModelConnection: async () => codexConnection(),
    getTelegramConnection: async () => telegramConnection(),
    appFactory: async () => ({
      async chat(value) { prompt = value; return 'Working product delivered.'; },
    }),
  });

  assert.equal(exitCode, 0);
  assert.equal(prompt, 'Build a real product');
  assert.deepEqual(stdout, ['Working product delivered.']);
});

test('doctor wakes and verifies the saved NED workspace', async () => {
  const calls = [];
  const state = {
    workspaceId: 'sandbox-123', profile: 'ned', modelProvider: 'openai-codex',
    secretId: 'secret-1', secretName: 'ned_model_openai_codex_test',
  };
  const provider = {
    async updateModelCredential(saved, connection) { calls.push(['refresh', saved.secretId, connection.providerId]); },
    async start(id) { calls.push(['start', id]); },
    async doctor(workspace, plan) {
      calls.push(['doctor', workspace.id, plan.profile]);
      return { ok: true, checks: ['sandbox', 'hermes', 'ned-profile'] };
    },
  };
  const app = createNedApp({ provider, stateStore: { async load() { return state; } } });

  const health = await app.doctor(codexConnection());

  assert.equal(health.ok, true);
  assert.deepEqual(calls, [
    ['refresh', 'secret-1', 'openai-codex'],
    ['start', 'sandbox-123'],
    ['doctor', 'sandbox-123', 'ned'],
  ]);
});

test('reset reinstalls and verifies NED without replacing the workspace', async () => {
  const calls = [];
  const state = {
    workspaceId: 'sandbox-123', workspaceName: 'ned-product-partner', modelProvider: 'openai-codex',
    secretId: 'secret-1', secretName: 'ned_model_openai_codex_test',
  };
  const provider = {
    async updateModelCredential(saved, connection) { calls.push(['refresh', saved.secretId, connection.providerId]); },
    async start(id) { calls.push(['start', id]); },
    async bootstrap(workspace) { calls.push(['bootstrap', workspace.id]); },
    async doctor(workspace) { calls.push(['doctor', workspace.id]); return { ok: true }; },
  };
  const stateStore = {
    async load() { return state; },
    async save() { assert.fail('reset must preserve local workspace identity'); },
  };
  const app = createNedApp({ provider, stateStore });

  const result = await app.reset(codexConnection());

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [
    ['refresh', 'secret-1', 'openai-codex'],
    ['start', 'sandbox-123'],
    ['bootstrap', 'sandbox-123'],
    ['doctor', 'sandbox-123'],
  ]);
});

test('CLI pairing approves exactly one Hermes Telegram owner code in the saved workspace', async () => {
  const calls = [];
  const stdout = [];
  const exitCode = await runCli(['pair', 'ABCD2345'], {
    log: (message) => stdout.push(message),
    error: assert.fail,
  }, {
    env: { DAYTONA_API_KEY: 'provider-test-value' },
    getTelegramConnection: async () => telegramConnection(),
    appFactory: async () => ({
      async verifyAuthorization() { calls.push('verify'); },
      async pair(code) { calls.push(code); return { approved: true }; },
    }),
  });

  assert.equal(exitCode, 0);
  assert.deepEqual(calls, ['verify', 'ABCD2345']);
  assert.match(stdout.join('\n'), /approved.*send hello again/i);
});

test('CLI pairing validates Daytona authorization before asking for an existing bot token', async () => {
  const stderr = [];
  let telegramPrompted = false;
  const exitCode = await runCli(['pair', 'ABCD2345'], {
    log: assert.fail,
    error: (message) => stderr.push(message),
  }, {
    env: { DAYTONA_API_KEY: 'rejected-key' },
    getTelegramConnection: async () => { telegramPrompted = true; return telegramConnection(); },
    appFactory: async () => ({
      async verifyAuthorization() {
        throw new Error('Daytona API key was rejected (HTTP 401). Create a Personal Access Key.');
      },
      async pair() { assert.fail('must reject before pairing'); },
    }),
  });

  assert.equal(exitCode, 1);
  assert.equal(telegramPrompted, false);
  assert.match(stderr.join('\n'), /Daytona API key was rejected.*HTTP 401/);
});

test('destroy deletes the remote workspace and its scoped secret before clearing local state', async () => {
  const calls = [];
  const stateStore = {
    async load() {
      return {
        workspaceId: 'sandbox-123', secretName: 'ned_model_test', secretId: 'secret-1',
      };
    },
    async clear() { calls.push(['clear']); },
  };
  const provider = {
    async destroy(workspace) {
      calls.push(['destroy', workspace.id, workspace.secretId]);
      return { workspaceAbsent: true, secretAbsent: true };
    },
  };
  const app = createNedApp({ provider, stateStore });

  await app.destroy();

  assert.deepEqual(calls, [['destroy', 'sandbox-123', 'secret-1'], ['clear']]);
});

test('destroy preserves local recovery state until the provider proves workspace and secret absence', async () => {
  const calls = [];
  const app = createNedApp({
    provider: {
      async destroy() {
        return { workspaceAbsent: true, secretAbsent: false };
      },
    },
    stateStore: {
      async load() { return { workspaceId: 'sandbox-123', secretId: 'secret-1' }; },
      async clear() { calls.push('clear'); },
    },
  });

  await assert.rejects(() => app.destroy(), /did not prove workspace and model secret absence/);
  assert.deepEqual(calls, []);
});

test('destroy succeeds idempotently when local state is already clear', async () => {
  const app = createNedApp({
    provider: { async destroy() { assert.fail('no remote delete without state'); } },
    stateStore: { async load() { return null; }, async clear() { assert.fail('already clear'); } },
  });
  assert.deepEqual(await app.destroy(), { destroyed: false, alreadyDeleted: true });
});

test('CLI dispatches doctor, repair, legacy reset, and explicit destroy without infrastructure questions', async () => {
  const calls = [];
  const io = { log() {}, error: assert.fail };
  const dependencies = {
    env: { DAYTONA_API_KEY: 'daytona-secret' },
    getModelConnection: async () => codexConnection(),
    getTelegramConnection: async () => telegramConnection(),
    appFactory: async () => ({
      async doctor() { calls.push('doctor'); return { ok: true, checks: ['sandbox', 'hermes', 'ned-profile'] }; },
      async reset() { calls.push('reset'); return { ok: true }; },
      async destroy() { calls.push('destroy'); },
    }),
  };

  assert.equal(await runCli(['doctor'], io, dependencies), 0);
  assert.equal(await runCli(['repair'], io, dependencies), 0);
  assert.equal(await runCli(['reset'], io, dependencies), 0);
  assert.equal(await runCli(['destroy', '--yes'], io, dependencies), 0);
  assert.deepEqual(calls, ['doctor', 'reset', 'reset', 'destroy']);
});

test('CLI refuses Telegram tokens through argv before authentication', async () => {
  const stderr = [];
  const token = telegramConnection().consumeToken();
  const exitCode = await runCli(['chat', 'hello', '--telegram-token', token], {
    log: assert.fail,
    error: (message) => stderr.push(message),
  }, {
    env: { DAYTONA_API_KEY: 'provider-test-value' },
    getModelConnection: async () => assert.fail('argv secret must reject first'),
    getTelegramConnection: async () => assert.fail('argv secret must reject first'),
    appFactory: async () => assert.fail('argv secret must reject first'),
  });

  assert.equal(exitCode, 2);
  assert.equal(stderr.join('\n').includes(token), false);
  assert.match(stderr.join('\n'), /never accepts Telegram tokens through argv/);
});


test('CLI redacts Telegram token-shaped provider errors before output', async () => {
  const stderr = [];
  const token = telegramConnection().consumeToken();
  const exitCode = await runCli(['chat', 'hello'], {
    log() {},
    error: (message) => stderr.push(message),
  }, {
    env: { DAYTONA_API_KEY: 'provider-test-value' },
    getModelConnection: async () => codexConnection(),
    getTelegramConnection: async () => telegramConnection(),
    appFactory: async () => ({
      async chat() { throw new Error(`hostile provider error ${token}`); },
    }),
  });

  assert.equal(exitCode, 1);
  assert.equal(stderr.join('\n').includes(token), false);
  assert.match(stderr.join('\n'), /\[REDACTED\]/);
});


test('unknown command fails without authorization, remote operations, or telemetry', async () => {
  for (const flags of [[], ['--dry-run', '--json']]) {
    const output = [];
    const code = await runCli(['unsupported-command', ...flags], { log: assert.fail, error: (line) => output.push(line) }, {
      env: {}, appFactory: async () => assert.fail('must not provision'),
      getModelConnection: async () => assert.fail('must not authorize'),
      telemetry: { capture: async () => assert.fail('must not emit lifecycle events') },
    });
    assert.equal(code, 2);
    assert.match(output.join('\n'), /Usage:/);
    assert.equal(output.join('\n').includes('unsupported-command|'), false);
  }
  const help = [];
  assert.equal(await runCli(['--help'], { log: (line) => help.push(line), error: assert.fail }), 0);
  for (const command of ['chat', 'doctor', 'pair', 'repair', 'destroy', 'telemetry']) assert.ok(help.join('\n').includes(`ned ${command}`));
});
