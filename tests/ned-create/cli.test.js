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

test('CLI help lists every supported lifecycle command', async () => {
  const stdout = [];
  const stderr = [];
  const exitCode = await runCli(['--help'], {
    log: (message) => stdout.push(message),
    error: (message) => stderr.push(message),
  });

  assert.equal(exitCode, 0);
  assert.equal(stderr.length, 0);
  const help = stdout.join('\n');
  assert.match(help, /version 0\.2\.1/);
  for (const command of ['create', 'chat', 'doctor', 'repair', 'destroy']) {
    assert.match(help, new RegExp(`ned ${command}`));
  }
});

test('CLI reports the installed version without requiring credentials', () => {
  for (const args of [['--version'], ['version']]) {
    const result = runNed(args, { DAYTONA_API_KEY: '' });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), '0.2.1');
    assert.equal(result.stderr, '');
  }
});

test('ned create dry-run asks no questions and selects the complete opinionated plan', () => {
  const result = runNed(['create', '--dry-run', '--json']);

  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.deepEqual(output, {
    action: 'create',
    dryRun: true,
    provider: 'daytona',
    region: 'auto',
    resources: { cpu: 2, memory: 4, disk: 10 },
    image: 'ubuntu:24.04',
    modelProvider: 'openai-codex',
    hermesVersion: 'v2026.7.20',
    profile: 'ned',
    autoStopMinutes: 0,
    autoArchiveMinutes: 10080,
    questionsAsked: 0,
  });
  assert.equal(result.stderr, '');
});

test('v1 CLI keeps optional providers out of the default ChatGPT OAuth journey', async () => {
  const dryRun = runNed(['create', '--dry-run', '--json', '--model-provider', 'anthropic']);
  assert.equal(dryRun.status, 2);
  assert.equal(dryRun.stdout, '');
  assert.match(dryRun.stderr, /defaults to ChatGPT OAuth/);

  const stdout = [];
  const stderr = [];
  const exitCode = await runCli(['create', '--model-provider', 'gemini'], {
    log: (message) => stdout.push(message),
    error: (message) => stderr.push(message),
  }, {
    env: { DAYTONA_API_KEY: 'daytona-test-value', GEMINI_API_KEY: 'gemini-test-value' },
    appFactory: async () => { throw new Error('must reject before provisioning'); },
  });
  assert.equal(exitCode, 2);
  assert.equal(stdout.length, 0);
  assert.match(stderr.join('\n'), /defaults to ChatGPT OAuth/);
});

test('create provisions, bootstraps, verifies, and persists only non-secret workspace state', async () => {
  const calls = [];
  const provider = {
    async createWorkspace(plan, credentials) {
      calls.push(['create', plan, credentials]);
      return {
        id: 'sandbox-123', name: 'ned-product-partner',
        nedSecretName: 'ned_model_test', nedSecretId: 'secret-1',
        telegramBotUsername: 'ned_disposable_bot', telegramBotUrl: 'https://t.me/ned_disposable_bot',
      };
    },
    async bootstrap(workspace, plan) {
      calls.push(['bootstrap', workspace.id, plan.profile]);
      return { hermesVersion: plan.hermesVersion };
    },
    async doctor(workspace) {
      calls.push(['doctor', workspace.id]);
      return { ok: true, checks: ['hermes', 'ned-profile'] };
    },
    async destroy() {
      assert.fail('destroy should not be called on a successful create');
    },
  };
  let savedState;
  const stateStore = {
    async load() { return null; },
    async save(state) { savedState = state; },
  };
  const progress = [];
  const app = createNedApp({ provider, stateStore, progress: (message) => progress.push(message) });

  const result = await app.create({ modelConnection: codexConnection(), telegramConnection: telegramConnection() });

  assert.equal(result.ready, true);
  assert.deepEqual(progress, [
    'Working: reserving your private Daytona workspace…',
    'Working: installing NED skills and starting your Telegram gateway…',
    'Working: checking the Telegram gateway connection…',
    'Working: saving your workspace for recovery…',
  ]);
  assert.deepEqual(calls.map(([name]) => name), ['create', 'bootstrap', 'doctor']);
  assert.deepEqual(calls[0][1], NED_PLAN);
  assert.deepEqual(savedState, {
    schemaVersion: 2,
    provider: 'daytona',
    workspaceId: 'sandbox-123',
    workspaceName: 'ned-product-partner',
    profile: 'ned',
    hermesVersion: 'v2026.7.20',
    secretName: 'ned_model_test',
    secretId: 'secret-1',
    telegramBotUsername: 'ned_disposable_bot',
    telegramBotUrl: 'https://t.me/ned_disposable_bot',
    modelProvider: 'openai-codex',
  });
  const serializedState = JSON.stringify(savedState);
  assert.equal(serializedState.includes('openrouter-secret'), false);
  assert.equal(serializedState.includes('daytona-secret'), false);
});

test('create destroys an unready workspace and never saves state', async () => {
  const destroyed = [];
  const provider = {
    async createWorkspace() { return { id: 'sandbox-broken', name: 'broken' }; },
    async bootstrap() { throw new Error('install failed'); },
    async doctor() { assert.fail('doctor should not run after install failure'); },
    async destroy(workspace) { destroyed.push(workspace.id); },
  };
  const stateStore = {
    async load() { return null; },
    async save() { assert.fail('failed workspace must not be persisted'); },
  };
  const app = createNedApp({ provider, stateStore });

  await assert.rejects(() => app.create({}), /install failed/);
  assert.deepEqual(destroyed, ['sandbox-broken']);
});

test('create preserves both setup and cleanup failures with recoverable orphan state', async () => {
  let recoveryState;
  const provider = {
    async createWorkspace() {
      return {
        id: 'sandbox-broken',
        name: 'ned-product-partner',
        nedSecretId: 'secret-orphan',
        nedSecretName: 'ned_openrouter_orphan',
      };
    },
    async bootstrap() { throw new Error('install failed'); },
    async destroy() { throw new Error('cleanup failed'); },
  };
  const app = createNedApp({
    provider,
    stateStore: {
      async load() { return null; },
      async save(state) { recoveryState = state; },
    },
  });

  await assert.rejects(
    () => app.create({}),
    (error) => error instanceof AggregateError
      && /install failed/.test(error.message)
      && error.errors.some((nested) => /cleanup failed/.test(nested.message)),
  );
  assert.equal(recoveryState.workspaceId, 'sandbox-broken');
  assert.equal(recoveryState.secretId, 'secret-orphan');
  assert.equal(recoveryState.cleanupPending, true);
});

test('create persists provider recovery metadata when provisioning cleanup fails before a workspace exists', async () => {
  let saved;
  const provisioningError = new AggregateError(
    [new Error('sandbox create failed'), new Error('secret delete failed')],
    'provisioning and cleanup failed',
  );
  provisioningError.recoveryState = {
    workspaceId: null,
    workspaceName: null,
    secretId: 'secret-recovery',
    secretName: 'ned_openrouter_recovery',
  };
  const app = createNedApp({
    provider: { async createWorkspace() { throw provisioningError; } },
    stateStore: {
      async load() { return null; },
      async save(state) { saved = state; },
    },
  });

  await assert.rejects(() => app.create({}), /provisioning and cleanup failed/);
  assert.equal(saved.secretId, 'secret-recovery');
  assert.equal(saved.cleanupPending, true);
});

test('create directs a pending orphan through destroy before retrying', async () => {
  const app = createNedApp({
    provider: { async createWorkspace() { assert.fail('must clean up first'); } },
    stateStore: { async load() { return { cleanupPending: true, secretId: 'secret-recovery' }; } },
  });
  await assert.rejects(() => app.create({}), /ned destroy --yes/);
});

test('create fails closed before provisioning when Daytona already has a managed workspace without local ownership state', async () => {
  const app = createNedApp({
    provider: {
      async listManagedWorkspaces() {
        return [{ id: 'sandbox-orphan', name: 'ned-product-partner', state: 'stopped' }];
      },
      async createWorkspace() { assert.fail('must reconcile remote ownership before create'); },
    },
    stateStore: { async load() { return null; } },
  });
  await assert.rejects(
    () => app.create({}),
    /managed Daytona workspace already exists.*sandbox-orphan.*reconcile/i,
  );
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

test('CLI create uses a Hermes-compatible ChatGPT OAuth connection without printing secrets', async () => {
  const stdout = [];
  const stderr = [];
  let receivedCredentials;
  const exitCode = await runCli(['create'], {
    log: (message) => stdout.push(message),
    error: (message) => stderr.push(message),
  }, {
    env: { DAYTONA_API_KEY: 'daytona-secret' },
    getModelConnection: async () => codexConnection('codex-secret'),
    getTelegramConnection: async () => telegramConnection(),
    appFactory: async () => ({
      async create(credentials) {
        receivedCredentials = credentials;
        return { ready: true, workspace: { workspaceId: 'sandbox-123' } };
      },
    }),
  });

  assert.equal(exitCode, 0);
  assert.equal(receivedCredentials.modelConnection.providerId, 'openai-codex');
  assert.equal(receivedCredentials.modelConnection.method, 'oauth-device-code');
  assert.equal(JSON.stringify(receivedCredentials).includes('codex-secret'), false);
  assert.equal(receivedCredentials.modelConnection.consumeCredential(), 'codex-secret');
  const combined = [...stdout, ...stderr].join('\n');
  assert.match(combined, /Your product partner is ready/);
  assert.match(combined, /1\. Open https:\/\/t\.me\/ned_disposable_bot/);
  assert.match(combined, /2\. Tap Start/);
  assert.match(combined, /3\. Send hello/);
  assert.match(combined, /4\. If the bot sends a pairing code, run: ned pair <code>/);
  assert.match(combined, /https:\/\/ned\.datanav\.app\/docs\/v1\/quickstart\//);
  assert.equal(combined.includes('daytona-secret'), false);
  assert.equal(combined.includes('codex-secret'), false);
});

test('CLI create passes verbose diagnostics through without exposing credentials', async () => {
  let factoryOptions;
  const diagnostics = [];
  const stderr = [];
  const exitCode = await runCli(['create', '--verbose'], { log() {}, error: (message) => stderr.push(message) }, {
    env: { DAYTONA_API_KEY: 'daytona-secret' },
    getModelConnection: async () => codexConnection('codex-secret'),
    getTelegramConnection: async () => telegramConnection(),
    appFactory: async (options) => {
      factoryOptions = options;
      return { async create() { throw new Error('Invalid credentials'); } };
    },
  });
  assert.equal(exitCode, 1);
  assert.equal(factoryOptions.verbose, true);
  assert.equal(typeof factoryOptions.log, 'function');
  factoryOptions.log('stage=create');
  diagnostics.push('stage=create');
  assert.deepEqual(diagnostics, ['stage=create']);
});
test('CLI reports rejected Daytona credentials before prompting for model or Telegram access', async () => {
  const stderr = [];
  let modelPrompted = false;
  let telegramPrompted = false;
  const exitCode = await runCli(['create'], { log() {}, error: (message) => stderr.push(message) }, {
    env: { DAYTONA_API_KEY: 'sandbox-only-key' },
    getModelConnection: async () => { modelPrompted = true; return codexConnection(); },
    getTelegramConnection: async () => { telegramPrompted = true; return telegramConnection(); },
    appFactory: async () => ({
      async verifyAuthorization() {
        throw new Error('Daytona API key was rejected (HTTP 403). Create a Personal Access Key at https://app.daytona.io/dashboard/keys with write:sandboxes, delete:sandboxes, and manage:secrets permissions. A Sandbox-only key cannot run ned create.');
      },
    }),
  });

  assert.equal(exitCode, 1);
  assert.equal(modelPrompted, false);
  assert.equal(telegramPrompted, false);
  assert.match(stderr.join('\\n'), /Personal Access Key/);
  assert.match(stderr.join('\\n'), /write:sandboxes, delete:sandboxes, and manage:secrets/);
  assert.match(stderr.join('\\n'), /Sandbox-only key cannot run ned create/);
});

test('CLI create invokes exactly one ChatGPT OAuth resolver when no credential is injected', async () => {
  let oauthCalls = 0;
  let credentials;
  const exitCode = await runCli(['create'], { log() {}, error: assert.fail }, {
    env: { DAYTONA_API_KEY: 'daytona-secret' },
    getModelConnection: async () => { oauthCalls += 1; return codexConnection('oauth-codex-access'); },
    getTelegramConnection: async () => telegramConnection(),
    appFactory: async () => ({
      async create(value) { credentials = value; return { ready: true }; },
    }),
  });

  assert.equal(exitCode, 0);
  assert.equal(oauthCalls, 1);
  assert.equal(credentials.modelConnection.providerId, 'openai-codex');
  assert.equal(credentials.modelConnection.method, 'oauth-device-code');
  assert.equal(credentials.modelConnection.consumeCredential(), 'oauth-codex-access');
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

test('CLI refuses Telegram tokens through argv before authentication or provisioning', async () => {
  const stderr = [];
  const token = telegramConnection().consumeToken();
  const exitCode = await runCli(['create', '--telegram-token', token], {
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
  const exitCode = await runCli(['create'], {
    log() {},
    error: (message) => stderr.push(message),
  }, {
    env: { DAYTONA_API_KEY: 'provider-test-value' },
    getModelConnection: async () => codexConnection(),
    getTelegramConnection: async () => telegramConnection(),
    appFactory: async () => ({
      async create() { throw new Error(`hostile provider error ${token}`); },
    }),
  });

  assert.equal(exitCode, 1);
  assert.equal(stderr.join('\n').includes(token), false);
  assert.match(stderr.join('\n'), /\[REDACTED\]/);
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
