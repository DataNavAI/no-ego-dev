import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Daytona } from '@daytona/sdk';

import { createModelConnection } from '../../src/model-providers.js';
import { createDaytonaProvider as createProvider } from '../../src/providers/daytona.js';
import { NED_PLAN } from '../../src/plan.js';

function codexConnection(value = 'synthetic-codex-access') {
  return createModelConnection({ providerId: 'openai-codex', method: 'oauth-device-code', value });
}

function createDaytonaProvider(options = {}) {
  return createProvider({ runtimeTelegramTokenFactory: () => '123456789:' + 'A'.repeat(35), ...options });
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
        if (command.includes('gateway run --replace')) {
          observed.gatewaySession = { command, env, timeout };
          return { exitCode: 0, result: '' };
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
  assert(observed.execute.command.indexOf('apt-get install') < observed.execute.command.indexOf('curl --fail'));
  assert.match(observed.execute.command, /curl --fail --show-error --location --retry 5 --retry-all-errors --retry-delay 2 --connect-timeout 20 --max-time 180/);
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
  assert.match(observed.gatewaySession.command, /hermes --profile ned gateway run --replace/);
  assert.match(observed.gatewaySession.command, /nohup/);
  assert.equal(observed.gatewaySession.env.TELEGRAM_BOT_TOKEN, '123456789:' + 'A'.repeat(35));
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

test('Daytona doctor retries transient post-bootstrap inference readiness', async () => {
  let inferenceAttempts = 0;
  const waits = [];
  const sandbox = {
    state: 'started',
    fs: {
      async downloadFile() {
        return Buffer.from('NED_STATUS_TELEGRAM=true\nNED_STATUS_CONNECTED=true\nNED_STATUS_DISCONNECTED=false\nNED_DIAG_TOKEN_PRESENT=true\nNED_DIAG_TOKEN_SHAPE=true\nNED_DIAG_API_HTTP=200\n');
      },
    },
    process: {
      async executeCommand(command) {
        if (command.includes('gateway status')) return { exitCode: 0, result: '' };
        inferenceAttempts += 1;
        return inferenceAttempts === 1
          ? { exitCode: 1, result: 'starting' }
          : { exitCode: 0, result: 'ready' };
      },
    },
  };
  class FakeDaytona {
    constructor() { this.secret = {}; }
    async get() { return sandbox; }
  }
  const provider = createDaytonaProvider({
    apiKey: 'contract-only',
    DaytonaClass: FakeDaytona,
    sleep: async (milliseconds) => { waits.push(milliseconds); },
  });

  const health = await provider.doctor({ id: 'sandbox-123' }, NED_PLAN);

  assert.equal(health.ok, true);
  assert.equal(inferenceAttempts, 2);
  assert.deepEqual(waits, [5_000]);
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
      async executeCommand(command, cwd, env) {
        if (command.includes('gateway status')) {
          observed.checks += 1;
          return { exitCode: gatewayReady ? 0 : 7, result: `NED_GATEWAY_STATE=${gatewayReady ? 'running' : 'starting'}\nNED_TELEGRAM_STATE=${gatewayReady ? 'connected' : 'disconnected'}\nNED_READY=${gatewayReady ? 'True' : 'False'}` };
        }
        if (command.includes('gateway run --replace')) {
          observed.gatewayCommands.push({ command, env });
          gatewayReady = true;
          return { exitCode: 0, result: '' };
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
  assert.equal(observed.gatewayCommands.length, 1);
  assert.match(observed.gatewayCommands[0].command, /hermes --profile ned gateway run --replace/);
  assert.match(observed.gatewayCommands[0].command, /nohup/);
  assert.equal(observed.gatewayCommands[0].env.TELEGRAM_BOT_TOKEN, '123456789:' + 'A'.repeat(35));
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
    id: 'sandbox-123', nedSecretId: 'secret-1',
  });

  assert.deepEqual(calls, [
    ['sandbox-readback', 'sandbox-123'],
    ['sandbox-delete', 300, true],
    ['secret-delete', 'secret-1'],
    ['secret-readback', 'secret-1'],
    ['sandbox-readback', 'sandbox-123'],
  ]);
  assert.deepEqual(receipt, {
    workspaceAbsent: true, secretAbsent: true,
  });
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
