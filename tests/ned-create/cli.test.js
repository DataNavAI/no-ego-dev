import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createNedApp } from '../../src/app.js';
import { runCli } from '../../src/cli.js';
import { NED_PLAN } from '../../src/plan.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

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
  for (const command of ['create', 'chat', 'doctor', 'reset', 'destroy']) {
    assert.match(help, new RegExp(`ned ${command}`));
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
    resources: { cpu: 2, memory: 4, disk: 20 },
    image: 'ubuntu:24.04',
    modelProvider: 'openrouter',
    hermesVersion: 'v2026.7.20',
    profile: 'ned',
    autoStopMinutes: 15,
    autoArchiveMinutes: 10080,
    questionsAsked: 0,
  });
  assert.equal(result.stderr, '');
});

test('create provisions, bootstraps, verifies, and persists only non-secret workspace state', async () => {
  const calls = [];
  const provider = {
    async createWorkspace(plan, credentials) {
      calls.push(['create', plan, credentials]);
      return { id: 'sandbox-123', name: 'ned-product-partner', nedSecretName: 'ned_openrouter_test', nedSecretId: 'secret-1' };
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
  const app = createNedApp({ provider, stateStore });

  const result = await app.create({ daytonaApiKey: 'daytona-secret', openRouterApiKey: 'openrouter-secret' });

  assert.equal(result.ready, true);
  assert.deepEqual(calls.map(([name]) => name), ['create', 'bootstrap', 'doctor']);
  assert.deepEqual(calls[0][1], NED_PLAN);
  assert.deepEqual(savedState, {
    schemaVersion: 1,
    provider: 'daytona',
    workspaceId: 'sandbox-123',
    workspaceName: 'ned-product-partner',
    profile: 'ned',
    hermesVersion: 'v2026.7.20',
    secretName: 'ned_openrouter_test',
    secretId: 'secret-1',
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

test('chat wakes the saved workspace and returns the NED response', async () => {
  const calls = [];
  const state = { workspaceId: 'sandbox-123', profile: 'ned' };
  const provider = {
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

  const response = await app.chat('Build the smallest useful product.');

  assert.equal(response, 'Shipped the smallest working slice.');
  assert.deepEqual(calls, [
    ['start', 'sandbox-123'],
    ['chat', 'sandbox-123', 'ned', 'Build the smallest useful product.'],
  ]);
});

test('CLI create uses shell credentials without asking questions or printing secrets', async () => {
  const stdout = [];
  const stderr = [];
  let receivedCredentials;
  const exitCode = await runCli(['create'], {
    log: (message) => stdout.push(message),
    error: (message) => stderr.push(message),
  }, {
    env: {
      DAYTONA_API_KEY: 'daytona-secret',
      OPENROUTER_API_KEY: 'openrouter-secret',
    },
    appFactory: async () => ({
      async create(credentials) {
        receivedCredentials = credentials;
        return { ready: true, workspace: { workspaceId: 'sandbox-123' } };
      },
    }),
  });

  assert.equal(exitCode, 0);
  assert.equal(receivedCredentials.modelConnection.providerId, 'openrouter');
  assert.equal(receivedCredentials.modelConnection.method, 'api-key');
  assert.equal(JSON.stringify(receivedCredentials).includes('openrouter-secret'), false);
  assert.equal(receivedCredentials.modelConnection.consumeCredential(), 'openrouter-secret');
  const combined = [...stdout, ...stderr].join('\n');
  assert.match(combined, /Your product partner is ready/);
  assert.equal(combined.includes('daytona-secret'), false);
  assert.equal(combined.includes('openrouter-secret'), false);
});

test('CLI create uses OpenRouter PKCE when no OpenRouter key is in the shell', async () => {
  let oauthCalls = 0;
  let credentials;
  const exitCode = await runCli(['create'], { log() {}, error: assert.fail }, {
    env: { DAYTONA_API_KEY: 'daytona-secret' },
    getOpenRouterKey: async () => { oauthCalls += 1; return 'oauth-openrouter-key'; },
    appFactory: async () => ({
      async create(value) { credentials = value; return { ready: true }; },
    }),
  });

  assert.equal(exitCode, 0);
  assert.equal(oauthCalls, 1);
  assert.equal(credentials.modelConnection.providerId, 'openrouter');
  assert.equal(credentials.modelConnection.method, 'oauth-pkce');
  assert.equal(credentials.modelConnection.consumeCredential(), 'oauth-openrouter-key');
});

test('CLI chat accepts the product request as arguments and prints only NED output', async () => {
  const stdout = [];
  let prompt;
  const exitCode = await runCli(['chat', 'Build', 'a', 'real', 'product'], {
    log: (message) => stdout.push(message),
    error: assert.fail,
  }, {
    env: { DAYTONA_API_KEY: 'daytona-secret' },
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
  const state = { workspaceId: 'sandbox-123', profile: 'ned' };
  const provider = {
    async start(id) { calls.push(['start', id]); },
    async doctor(workspace, plan) {
      calls.push(['doctor', workspace.id, plan.profile]);
      return { ok: true, checks: ['sandbox', 'hermes', 'ned-profile'] };
    },
  };
  const app = createNedApp({ provider, stateStore: { async load() { return state; } } });

  const health = await app.doctor();

  assert.equal(health.ok, true);
  assert.deepEqual(calls, [['start', 'sandbox-123'], ['doctor', 'sandbox-123', 'ned']]);
});

test('reset reinstalls and verifies NED without replacing the workspace', async () => {
  const calls = [];
  const state = { workspaceId: 'sandbox-123', workspaceName: 'ned-product-partner' };
  const provider = {
    async start(id) { calls.push(['start', id]); },
    async bootstrap(workspace) { calls.push(['bootstrap', workspace.id]); },
    async doctor(workspace) { calls.push(['doctor', workspace.id]); return { ok: true }; },
  };
  const stateStore = {
    async load() { return state; },
    async save() { assert.fail('reset must preserve local workspace identity'); },
  };
  const app = createNedApp({ provider, stateStore });

  const result = await app.reset();

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [
    ['start', 'sandbox-123'],
    ['bootstrap', 'sandbox-123'],
    ['doctor', 'sandbox-123'],
  ]);
});

test('destroy deletes the remote workspace and its scoped secret before clearing local state', async () => {
  const calls = [];
  const stateStore = {
    async load() { return { workspaceId: 'sandbox-123', secretName: 'ned_openrouter_test', secretId: 'secret-1' }; },
    async clear() { calls.push(['clear']); },
  };
  const provider = {
    async destroy(workspace) { calls.push(['destroy', workspace.id, workspace.secretId]); },
  };
  const app = createNedApp({ provider, stateStore });

  await app.destroy();

  assert.deepEqual(calls, [['destroy', 'sandbox-123', 'secret-1'], ['clear']]);
});

test('destroy succeeds idempotently when local state is already clear', async () => {
  const app = createNedApp({
    provider: { async destroy() { assert.fail('no remote delete without state'); } },
    stateStore: { async load() { return null; }, async clear() { assert.fail('already clear'); } },
  });
  assert.deepEqual(await app.destroy(), { destroyed: false, alreadyDeleted: true });
});

test('CLI dispatches doctor, reset, and explicit destroy without infrastructure questions', async () => {
  const calls = [];
  const io = { log() {}, error: assert.fail };
  const dependencies = {
    env: { DAYTONA_API_KEY: 'daytona-secret' },
    appFactory: async () => ({
      async doctor() { calls.push('doctor'); return { ok: true, checks: ['sandbox', 'hermes', 'ned-profile'] }; },
      async reset() { calls.push('reset'); return { ok: true }; },
      async destroy() { calls.push('destroy'); },
    }),
  };

  assert.equal(await runCli(['doctor'], io, dependencies), 0);
  assert.equal(await runCli(['reset'], io, dependencies), 0);
  assert.equal(await runCli(['destroy', '--yes'], io, dependencies), 0);
  assert.deepEqual(calls, ['doctor', 'reset', 'destroy']);
});
