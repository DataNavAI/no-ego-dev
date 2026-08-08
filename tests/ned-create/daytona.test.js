import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Daytona } from '@daytona/sdk';

import { createModelConnection } from '../../src/model-providers.js';
import { createDaytonaProvider } from '../../src/providers/daytona.js';
import { NED_PLAN } from '../../src/plan.js';

function codexConnection(value = 'synthetic-codex-access') {
  return createModelConnection({ providerId: 'openai-codex', method: 'oauth-device-code', value });
}

function telegramConnection() {
  let value = ['123456789', ':', 'A'.repeat(35)].join('');
  return {
    botUsername: 'ned_disposable_bot',
    botUrl: 'https://t.me/ned_disposable_bot',
    consumeToken() { const token = value; value = ''; return token; },
  };
}

test('installed Daytona SDK exposes the SecretService contract used for cleanup', () => {
  const client = new Daytona({ apiKey: 'contract-shape-only' });
  assert.equal(typeof client.secret.create, 'function');
  assert.equal(typeof client.secret.delete, 'function');
  assert.equal(typeof client.deleteSecret, 'undefined');
});

test('Daytona provider creates the fixed private persistent sandbox with separate egress-scoped model and Telegram secrets', async () => {
  const observed = {};
  class FakeDaytona {
    constructor(config) {
      observed.config = config;
      this.secret = {
        create: async (params) => {
          observed.secrets ||= [];
          observed.secrets.push(params);
          return { id: `secret-${observed.secrets.length}`, name: params.name };
        },
      };
    }

    async create(params) {
      observed.create = params;
      return { id: 'sandbox-123', name: params.name };
    }
  }
  const provider = createDaytonaProvider({
    apiKey: 'provider-test-value',
    DaytonaClass: FakeDaytona,
    secretNameFactory: () => 'ned_model_openai_codex_test',
    telegramSecretNameFactory: () => 'ned_telegram_test',
    createAttemptIdFactory: () => 'attempt123',
  });

  const workspace = await provider.createWorkspace(NED_PLAN, {
    modelConnection: codexConnection(),
    telegramConnection: telegramConnection(),
  });

  assert.equal(workspace.id, 'sandbox-123');
  assert.equal(workspace.name, 'ned-product-partner');
  assert.equal(workspace.nedSecretName, 'ned_model_openai_codex_test');
  assert.equal(workspace.nedSecretId, 'secret-1');
  assert.equal(workspace.telegramSecretName, 'ned_telegram_test');
  assert.equal(workspace.telegramSecretId, 'secret-2');
  assert.equal(workspace.createAttemptId, 'attempt123');
  assert.equal(workspace.telegramBotUsername, 'ned_disposable_bot');
  assert.deepEqual(observed.config, { apiKey: 'provider-test-value', });
  assert.deepEqual(observed.secrets.map(({ name, description, hosts }) => ({ name, description, hosts })), [
    {
      name: 'ned_model_openai_codex_test',
      description: 'ChatGPT access for NED',
      hosts: ['chatgpt.com'],
    },
    {
      name: 'ned_telegram_test',
      description: 'Telegram bot access for NED',
      hosts: ['api.telegram.org'],
    },
  ]);
  assert.deepEqual(observed.create, {
    name: 'ned-product-partner',
    image: 'ubuntu:24.04',
    language: 'typescript',
    public: false,
    ephemeral: false,
    resources: { cpu: 2, memory: 4, disk: 10 },
    autoStopInterval: 15,
    autoArchiveInterval: 10080,
    autoDeleteInterval: -1,
    labels: { app: 'ned', managedBy: 'ned-cli', createAttempt: 'attempt123' },
    secrets: {
      NED_OPENAI_CODEX_ACCESS_TOKEN: 'ned_model_openai_codex_test',
      TELEGRAM_BOT_TOKEN: 'ned_telegram_test',
    },
  });
});

test('Daytona refreshes the exact owned OAuth Secret without changing its identity or host scope', async () => {
  const observed = {};
  const sandbox = {
    state: 'stopped',
    async start(timeout) { observed.start = timeout; this.state = 'started'; },
    process: {
      async executeCommand(command, cwd, env, timeout) {
        observed.sync = { command, cwd, env, timeout };
        return { exitCode: 0, result: '' };
      },
    },
  };
  class FakeDaytona {
    constructor() {
      this.secret = {
        async update(id, params) {
          observed.update = { id, params };
          return { id, name: 'ned_model_openai_codex_test' };
        },
      };
    }
    async get(id) { observed.get = id; return sandbox; }
  }
  const provider = createDaytonaProvider({ apiKey: 'synthetic-test-value', DaytonaClass: FakeDaytona });
  await provider.updateModelCredential({
    secretId: 'secret-1',
    secretName: 'ned_model_openai_codex_test',
    modelProvider: 'openai-codex',
    workspaceId: 'sandbox-123',
    profile: 'ned',
  }, codexConnection('refreshed-codex-access'));

  assert.deepEqual(observed.update, {
    id: 'secret-1',
    params: { value: 'refreshed-codex-access', hosts: ['chatgpt.com'] },
  });
  assert.equal(observed.get, 'sandbox-123');
  assert.equal(observed.start, 300);
  assert.match(observed.sync.command, /NED_OPENAI_CODEX_ACCESS_TOKEN/);
  assert.match(observed.sync.command, /auth\.json/);
  assert.doesNotMatch(observed.sync.command, /refreshed-codex-access/);
  assert.equal(observed.sync.timeout, 120);
});

test('Daytona provider uploads the bundled profile and installs pinned Hermes before health checks', async () => {
  const observed = {};
  const sandbox = {
    id: 'sandbox-123',
    name: 'ned-product-partner',
    fs: {
      async uploadFile(content, destination) { observed.upload = { content, destination }; },
      async downloadFile(path) {
        assert.equal(path, '/tmp/ned-gateway-status.txt');
        return Buffer.from(observed.gatewaySession
          ? 'NED_STATUS_TELEGRAM=true\nNED_STATUS_CONNECTED=true\nNED_STATUS_DISCONNECTED=false\nNED_DIAG_TOKEN_PRESENT=true\nNED_DIAG_TOKEN_SHAPE=true\nNED_DIAG_API_HTTP=200\n'
          : 'NED_STATUS_TELEGRAM=true\nNED_STATUS_CONNECTED=false\nNED_STATUS_DISCONNECTED=true\nNED_DIAG_TOKEN_PRESENT=true\nNED_DIAG_TOKEN_SHAPE=true\nNED_DIAG_API_HTTP=200\n');
      },
    },
    process: {
      async executeCommand(command, cwd, env, timeout) {
        if (command.includes('gateway status')) {
          observed.gatewayChecks = (observed.gatewayChecks || 0) + 1;
          return { exitCode: observed.gatewaySession ? 0 : 7, result: `NED_GATEWAY_STATE=${observed.gatewaySession ? 'running' : 'starting'}\nNED_TELEGRAM_STATE=${observed.gatewaySession ? 'connected' : 'disconnected'}\nNED_READY=${observed.gatewaySession ? 'True' : 'False'}` };
        }
        observed.execute = { command, cwd, env, timeout };
        return { exitCode: 0, result: 'installed' };
      },
      async createSession(id) { observed.createdSession = id; },
      async executeSessionCommand(id, request, timeout) {
        observed.gatewaySession = { id, request, timeout };
        return { cmdId: 'gateway-command' };
      },
    },
  };
  class FakeDaytona {
    constructor() { this.secret = {}; }
    async get(id) { assert.equal(id, 'sandbox-123'); return sandbox; }
  }
  const archive = Buffer.from('profile-archive');
  const provider = createDaytonaProvider({
    apiKey: 'daytona-secret',
    DaytonaClass: FakeDaytona,
    profileArchive: async () => archive,
    sleep: async () => {},
  });

  const result = await provider.bootstrap({ id: 'sandbox-123' }, NED_PLAN);

  assert.deepEqual(observed.upload, { content: archive, destination: '/tmp/ned-profile.tgz' });
  assert.match(observed.execute.command, /apt-get install -y --no-install-recommends ca-certificates curl python3 tar xz-utils/);
  assert(observed.execute.command.indexOf('apt-get install') < observed.execute.command.indexOf('curl -fsSL'));
  assert.match(observed.execute.command, /3ef6bbd201263d354fd83ec55b3c306ded2eb72a/);
  assert.match(observed.execute.command, /c5ba7e89627577fab914514736ecfb3359b66956ca00199bfef616ca35953cb9/);
  assert.match(observed.execute.command, /sha256sum.*hermes-install\.sh|shasum -a 256.*hermes-install\.sh/);
  assert.match(observed.execute.command, /Hermes installer checksum mismatch/);
  assert.match(observed.execute.command, /--non-interactive/);
  assert.match(observed.execute.command, /hermes profile install \/tmp\/ned-profile --name ned --force --yes/);
  assert.doesNotMatch(observed.execute.command, /hermes profile update/);
  assert.match(observed.execute.command, /hermes --profile ned config set model\.provider openai-codex/);
  assert.match(observed.execute.command, /hermes --profile ned config set model\.default gpt-5\.6-sol/);
  assert.match(observed.execute.command, /os\.environ\["NED_OPENAI_CODEX_ACCESS_TOKEN"\]/);
  assert.doesNotMatch(observed.execute.command, /synthetic-codex-access/);
  assert.match(observed.execute.command, /display\.platforms\.telegram\.notifications important/);
  assert.equal(observed.createdSession, 'ned-telegram-gateway');
  assert.equal(observed.gatewaySession.id, 'ned-telegram-gateway');
  assert.equal(observed.gatewaySession.request.runAsync, true);
  assert.equal(observed.gatewaySession.request.suppressInputEcho, true);
  assert.match(observed.gatewaySession.request.command, /hermes --profile ned gateway run --replace/);
  assert.match(observed.gatewaySession.request.command, /export HERMES_HOME=\"\$HOME\/\.hermes\"/);
  assert.equal(observed.execute.timeout, 900);
  assert.deepEqual(result, { hermesVersion: 'v2026.7.20' });
});

test('Daytona doctor verifies the exact remote Hermes profile', async () => {
  const commands = [];
  const sandbox = {
    state: 'started',
    fs: {
      async downloadFile(path, timeout) {
        assert.equal(path, '/tmp/ned-gateway-status.txt');
        assert.equal(timeout, 30);
        return Buffer.from('NED_STATUS_TELEGRAM=true\nNED_STATUS_CONNECTED=true\nNED_STATUS_DISCONNECTED=false\nNED_DIAG_TOKEN_PRESENT=true\nNED_DIAG_TOKEN_SHAPE=true\nNED_DIAG_API_HTTP=200\n');
      },
    },
    process: {
      async executeCommand(command) {
        commands.push(command);
        return { exitCode: 0, result: 'Hermes Agent v0.19.0\nname: no-ego-dev\nready' };
      },
    },
  };
  class FakeDaytona {
    constructor() { this.secret = {}; }
    async get(id) { assert.equal(id, 'sandbox-123'); return sandbox; }
  }
  const provider = createDaytonaProvider({ apiKey: 'daytona-secret', DaytonaClass: FakeDaytona });

  const health = await provider.doctor({ id: 'sandbox-123' }, NED_PLAN);

  assert.equal(health.ok, true);
  assert.deepEqual(health.checks, ['sandbox', 'hermes', 'ned-profile', 'inference', 'telegram-gateway']);
  assert.match(commands.at(-1), /hermes --version/);
  assert.match(commands.at(-1), /hermes profile info ned/);
  assert.match(commands.at(-1), /hermes --profile ned -z 'Reply with exactly: ready'/);
});

test('Daytona health fails closed when the remote filesystem status contract is unavailable', async () => {
  const sandbox = {
    state: 'started',
    process: {
      async executeCommand(command) {
        if (command.includes('gateway status')) return { exitCode: 0, result: 'Telegram: connected' };
        return { exitCode: 0, result: 'ready' };
      },
    },
  };
  class FakeDaytona {
    constructor() { this.secret = {}; }
    async get() { return sandbox; }
  }
  const provider = createDaytonaProvider({ apiKey: 'provi...ue', DaytonaClass: FakeDaytona });
  const health = await provider.doctor({ id: 'sandbox-123' }, NED_PLAN);
  assert.equal(health.ok, false);
  assert.deepEqual(health.checks, ['sandbox', 'hermes', 'ned-profile', 'inference']);
});

test('Daytona chat starts a suspended workspace and shell-quotes the one-shot prompt', async () => {
  const observed = { starts: 0 };
  const sandbox = {
    state: 'stopped',
    fs: {
      async downloadFile(path) {
        assert.equal(path, '/tmp/ned-gateway-status.txt');
        return Buffer.from('NED_STATUS_TELEGRAM=true\nNED_STATUS_CONNECTED=true\nNED_STATUS_DISCONNECTED=false\nNED_DIAG_TOKEN_PRESENT=true\nNED_DIAG_TOKEN_SHAPE=true\nNED_DIAG_API_HTTP=200\n');
      },
    },
    async start() { observed.starts += 1; this.state = 'started'; },
    process: {
      async executeCommand(command) {
        observed.command = command;
        return { exitCode: 0, result: 'NED response' };
      },
    },
  };
  class FakeDaytona {
    constructor() { this.secret = {}; }
    async get() { return sandbox; }
  }
  const provider = createDaytonaProvider({ apiKey: 'daytona-secret', DaytonaClass: FakeDaytona });

  await provider.start('sandbox-123');
  const response = await provider.chat('sandbox-123', 'ned', "Ship user's product");

  assert.equal(observed.starts, 1);
  assert.equal(response, 'NED response');
  assert.match(observed.command, /hermes --profile ned -z 'Ship user'"'"'s product'/);
});

test('Daytona restart recreates the exact polling gateway session without webhook or token leakage', async () => {
  const observed = { started: 0, sessions: [], gatewayCommands: [], checks: 0 };
  let gatewayReady = false;
  const sandbox = {
    state: 'stopped',
    fs: {
      async downloadFile(path) {
        assert.equal(path, '/tmp/ned-gateway-status.txt');
        return Buffer.from(gatewayReady
          ? 'NED_STATUS_TELEGRAM=true\nNED_STATUS_CONNECTED=true\nNED_STATUS_DISCONNECTED=false\nNED_DIAG_TOKEN_PRESENT=true\nNED_DIAG_TOKEN_SHAPE=true\nNED_DIAG_API_HTTP=200\n'
          : 'NED_STATUS_TELEGRAM=true\nNED_STATUS_CONNECTED=false\nNED_STATUS_DISCONNECTED=true\nNED_DIAG_TOKEN_PRESENT=true\nNED_DIAG_TOKEN_SHAPE=true\nNED_DIAG_API_HTTP=200\n');
      },
    },
    async start(timeout) { observed.started += 1; assert.equal(timeout, 300); this.state = 'started'; },
    process: {
      async executeCommand(command) {
        if (command.includes('gateway status')) {
          observed.checks += 1;
          return { exitCode: gatewayReady ? 0 : 7, result: `NED_GATEWAY_STATE=${gatewayReady ? 'running' : 'starting'}\nNED_TELEGRAM_STATE=${gatewayReady ? 'connected' : 'disconnected'}\nNED_READY=${gatewayReady ? 'True' : 'False'}` };
        }
        return { exitCode: 0, result: 'Approved!' };
      },
      async createSession(id) { observed.sessions.push(id); },
      async executeSessionCommand(id, request) {
        observed.gatewayCommands.push([id, request]);
        gatewayReady = true;
        return { cmdId: 'gateway-1' };
      },
    },
  };
  class FakeDaytona {
    constructor() { this.secret = {}; }
    async get(id) { assert.equal(id, 'sandbox-123'); return sandbox; }
  }
  const provider = createDaytonaProvider({
    apiKey: 'provider-test-value', DaytonaClass: FakeDaytona, sleep: async () => {},
  });

  await provider.start('sandbox-123', 'ned');

  assert.equal(observed.started, 1);
  assert.deepEqual(observed.sessions, ['ned-telegram-gateway']);
  assert.equal(observed.gatewayCommands.length, 1);
  assert.match(observed.gatewayCommands[0][1].command, /hermes --profile ned gateway run --replace/);
  assert.match(observed.gatewayCommands[0][1].command, /export HERMES_HOME=\"\$HOME\/\.hermes\"/);
  assert.equal(observed.gatewayCommands[0][1].runAsync, true);
  assert.doesNotMatch(observed.gatewayCommands[0][1].command, /webhook|TELEGRAM_BOT_TOKEN|bot\d+:/i);
  assert.equal(observed.checks >= 2, true);
});

test('Daytona pairing uses the exact pinned Hermes approval contract after gateway verification', async () => {
  const commands = [];
  const sandbox = {
    state: 'started',
    fs: {
      async downloadFile(path) {
        assert.equal(path, '/tmp/ned-gateway-status.txt');
        return Buffer.from('NED_STATUS_TELEGRAM=true\nNED_STATUS_CONNECTED=true\nNED_STATUS_DISCONNECTED=false\nNED_DIAG_TOKEN_PRESENT=true\nNED_DIAG_TOKEN_SHAPE=true\nNED_DIAG_API_HTTP=200\n');
      },
    },
    process: {
      async executeCommand(command) {
        commands.push(command);
        if (command.includes('gateway status')) return { exitCode: 0, result: 'NED_GATEWAY_STATE=running\nNED_TELEGRAM_STATE=connected\nNED_READY=True' };
        return { exitCode: 0, result: 'Approved!' };
      },
    },
  };
  class FakeDaytona {
    constructor() { this.secret = {}; }
    async get() { return sandbox; }
  }
  const provider = createDaytonaProvider({ apiKey: 'provider-test-value', DaytonaClass: FakeDaytona });

  assert.deepEqual(await provider.pair('sandbox-123', 'ned', 'ABCD2345'), { approved: true });
  assert.match(commands.at(-1), /hermes --profile ned pairing approve telegram ABCD2345/);
});

test('Daytona destroy waits for deletion and proves exact workspace and both secrets absent by readback', async () => {
  const calls = [];
  let workspaceDeleted = false;
  const deletedSecrets = new Set();
  const sandbox = {
    async delete(timeout, wait) { calls.push(['sandbox-delete', timeout, wait]); workspaceDeleted = true; },
  };
  class FakeDaytona {
    constructor() {
      this.secret = {
        delete: async (id) => { calls.push(['secret-delete', id]); deletedSecrets.add(id); },
        get: async (id) => {
          calls.push(['secret-readback', id]);
          if (deletedSecrets.has(id)) { const error = new Error('not found'); error.status = 404; throw error; }
          return { id };
        },
      };
    }
    async get(id) {
      calls.push(['sandbox-readback', id]);
      if (workspaceDeleted) { const error = new Error('not found'); error.status = 404; throw error; }
      return sandbox;
    }
  }
  const provider = createDaytonaProvider({ apiKey: 'provider-test-value', DaytonaClass: FakeDaytona });

  const receipt = await provider.destroy({
    id: 'sandbox-123', nedSecretId: 'secret-1', telegramSecretId: 'secret-2',
  });

  assert.deepEqual(calls, [
    ['sandbox-readback', 'sandbox-123'],
    ['sandbox-delete', 300, true],
    ['secret-delete', 'secret-1'],
    ['secret-readback', 'secret-1'],
    ['secret-delete', 'secret-2'],
    ['secret-readback', 'secret-2'],
    ['sandbox-readback', 'sandbox-123'],
  ]);
  assert.deepEqual(receipt, {
    workspaceAbsent: true, secretAbsent: true, telegramSecretAbsent: true,
  });
});

test('Daytona provider lists only NED-managed sandboxes for create preflight', async () => {
  class FakeDaytona {
    constructor() { this.secret = {}; }
    async *list(query) {
      assert.deepEqual(query, { labels: { app: 'ned', managedBy: 'ned-cli' } });
      yield { id: 'sandbox-1', name: 'ned-product-partner', state: 'stopped' };
    }
  }
  const provider = createDaytonaProvider({ apiKey: 'daytona-test', DaytonaClass: FakeDaytona });
  assert.deepEqual(await provider.listManagedWorkspaces(), [
    { id: 'sandbox-1', name: 'ned-product-partner', state: 'stopped' },
  ]);
});

test('Daytona destroy is recoverable when the workspace was already removed', async () => {
  const calls = [];
  class FakeDaytona {
    constructor() {
      this.secret = {
        delete: async (id) => calls.push(id),
        get: async () => { const error = new Error('not found'); error.status = 404; throw error; },
      };
    }
    async get() { const error = new Error('not found'); error.status = 404; throw error; }
  }
  const provider = createDaytonaProvider({ apiKey: 'daytona-secret', DaytonaClass: FakeDaytona });

  await provider.destroy({ id: 'sandbox-missing', secretId: 'secret-1' });

  assert.deepEqual(calls, ['secret-1']);
});

test('Daytona create removes its unique secret when sandbox creation fails', async () => {
  const calls = [];
  class FakeDaytona {
    constructor() {
      this.secret = {
        async create() {
          const id = calls.some(([kind]) => kind === 'created') ? 'telegram-orphan' : 'model-orphan';
          calls.push(['created', id]);
          return { id };
        },
        async delete(id) { calls.push(['delete', id]); },
        async get(id) {
          calls.push(['readback', id]);
          const error = new Error('not found');
          error.status = 404;
          throw error;
        },
      };
    }
    async create() { throw new Error('sandbox create failed'); }
  }
  const provider = createDaytonaProvider({
    apiKey: 'daytona-only',
    DaytonaClass: FakeDaytona,
    secretNameFactory: () => 'ned_model_openai_codex_cleanup',
  });

  await assert.rejects(
    () => provider.createWorkspace(NED_PLAN, {
      modelConnection: codexConnection(), telegramConnection: telegramConnection(),
    }),
    /sandbox create failed/,
  );
  assert.deepEqual(calls, [
    ['created', 'model-orphan'],
    ['created', 'telegram-orphan'],
    ['delete', 'telegram-orphan'],
    ['readback', 'telegram-orphan'],
    ['delete', 'model-orphan'],
    ['readback', 'model-orphan'],
  ]);
});

test('Daytona create reconciles and deletes an accepted sandbox when the create response is lost', async () => {
  const calls = [];
  let secretCount = 0;
  let sandboxPresent = false;
  const sandbox = {
    id: 'accepted-sandbox',
    name: 'ned-product-partner',
    async delete(timeout, wait) {
      calls.push(['sandbox-delete', timeout, wait]);
      sandboxPresent = false;
    },
  };
  class FakeDaytona {
    constructor() {
      this.secret = {
        async create() { secretCount += 1; return { id: `secret-${secretCount}` }; },
        async delete(id) { calls.push(['secret-delete', id]); },
        async get(id) {
          calls.push(['secret-readback', id]);
          const error = new Error('not found');
          error.status = 404;
          throw error;
        },
      };
    }
    async create(params) {
      calls.push(['create-labels', params.labels]);
      sandboxPresent = true;
      throw new Error('create response lost');
    }
    async *list(query) {
      calls.push(['reconcile-list', query]);
      if (sandboxPresent) yield sandbox;
    }
    async get(id) {
      calls.push(['sandbox-readback', id]);
      if (sandboxPresent) return sandbox;
      const error = new Error('not found');
      error.status = 404;
      throw error;
    }
  }
  const provider = createDaytonaProvider({
    apiKey: 'provider-test-value',
    DaytonaClass: FakeDaytona,
    createAttemptIdFactory: () => 'attempt123',
    secretNameFactory: () => 'ned_model_openai_codex_accepted',
    telegramSecretNameFactory: () => 'ned_telegram_accepted',
  });

  await assert.rejects(
    () => provider.createWorkspace(NED_PLAN, {
      modelConnection: codexConnection(), telegramConnection: telegramConnection(),
    }),
    /create response lost/,
  );
  assert.deepEqual(calls, [
    ['create-labels', { app: 'ned', managedBy: 'ned-cli', createAttempt: 'attempt123' }],
    ['reconcile-list', { labels: { app: 'ned', managedBy: 'ned-cli', createAttempt: 'attempt123' } }],
    ['sandbox-delete', 300, true],
    ['sandbox-readback', 'accepted-sandbox'],
    ['secret-delete', 'secret-2'],
    ['secret-readback', 'secret-2'],
    ['secret-delete', 'secret-1'],
    ['secret-readback', 'secret-1'],
  ]);
});

test('Daytona create records recovery state when secret delete resolves but readback still finds it', async () => {
  class FakeDaytona {
    constructor() {
      this.secret = {
        async create() { return { id: 'secret-still-present' }; },
        async delete() {},
        async get(id) { return { id }; },
      };
    }
    async create() { throw new Error('sandbox create failed'); }
  }
  const provider = createDaytonaProvider({
    apiKey: 'daytona-only',
    DaytonaClass: FakeDaytona,
    secretNameFactory: () => 'ned_model_openai_codex_stillpresent',
  });

  await assert.rejects(
    () => provider.createWorkspace(NED_PLAN, {
      modelConnection: codexConnection(), telegramConnection: telegramConnection(),
    }),
    (error) => error instanceof AggregateError
      && /readback did not prove absence/.test(error.message)
      && error.recoveryState.secretId === 'secret-still-present'
      && error.recoveryState.secretName === 'ned_model_openai_codex_stillpresent',
  );
});

test('Daytona create exposes non-secret recovery metadata when secret cleanup also fails', async () => {
  class FakeDaytona {
    constructor() {
      this.secret = {
        async create() { return { id: 'secret-recovery' }; },
        async delete() { throw new Error('secret delete failed'); },
      };
    }
    async create() { throw new Error('sandbox create failed'); }
  }
  const provider = createDaytonaProvider({
    apiKey: 'daytona-secret',
    DaytonaClass: FakeDaytona,
    secretNameFactory: () => 'ned_model_openai_codex_recovery',
  });

  await assert.rejects(
    () => provider.createWorkspace(NED_PLAN, {
      modelConnection: codexConnection(), telegramConnection: telegramConnection(),
    }),
    (error) => error instanceof AggregateError
      && error.recoveryState.secretId === 'secret-recovery'
      && error.recoveryState.secretName === 'ned_model_openai_codex_recovery',
  );
});
