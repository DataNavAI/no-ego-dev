import assert from 'node:assert/strict';
import { test } from 'node:test';

import { runCli } from '../../src/cli.js';
import { createModelConnection } from '../../src/model-providers.js';
import { createNedPlan } from '../../src/plan.js';
import { createDaytonaProvider as createProvider } from '../../src/providers/daytona.js';

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

test('create plan selects an allowlisted direct model provider without changing compute defaults', () => {
  assert.deepEqual(createNedPlan({ modelProvider: 'openai' }), {
    provider: 'daytona',
    region: 'auto',
    resources: { cpu: 2, memory: 4, disk: 10 },
    image: 'ubuntu:24.04',
    modelProvider: 'openai',
    hermesModelProvider: 'openai-api',
    model: 'gpt-5.4',
    hermesVersion: 'v2026.7.20',
    profile: 'ned',
    autoStopMinutes: 0,
    autoArchiveMinutes: 10080,
  });
});

test('Daytona provider injects the selected direct provider through its own egress allowlist', async () => {
  const observed = {};
  class FakeDaytona {
    constructor() {
      this.secret = {
        create: async (params) => {
          observed.secrets ||= [];
          observed.secrets.push(params);
          return { id: `secret-${observed.secrets.length}` };
        },
      };
    }
    async create(params) { observed.create = params; return { id: 'sandbox-openai', name: params.name }; }
  }
  const provider = createDaytonaProvider({
    apiKey: 'daytona-test-value',
    DaytonaClass: FakeDaytona,
    secretNameFactory: (providerId) => `ned_model_${providerId}_test`,
  });
  const modelConnection = createModelConnection({
    providerId: 'openai', method: 'api-key', value: 'openai-test-value',
  });

  const workspace = await provider.createWorkspace(createNedPlan({ modelProvider: 'openai' }), {
    modelConnection, telegramConnection: telegramConnection(),
  });

  assert.equal(workspace.modelProvider, 'openai');
  assert.equal(workspace.nedSecretName, 'ned_model_openai_test');
  assert.deepEqual(observed.secrets[0], {
    name: 'ned_model_openai_test',
    value: 'openai-test-value',
    description: 'OpenAI access for NED',
    hosts: ['api.openai.com'],
  });
  assert.deepEqual(observed.create.secrets, {
    OPENAI_API_KEY: 'ned_model_openai_test',
  });
});

test('Daytona bootstrap configures the selected Hermes provider and model', async () => {
  let command;
  let gatewayStarted = false;
  const sandbox = {
    fs: {
      async uploadFile() {},
      async downloadFile(path) {
        assert.equal(path, '/tmp/ned-gateway-status.txt');
        return Buffer.from(gatewayStarted
          ? 'NED_STATUS_TELEGRAM=true\nNED_STATUS_CONNECTED=true\nNED_STATUS_DISCONNECTED=false\nNED_DIAG_TOKEN_PRESENT=true\nNED_DIAG_TOKEN_SHAPE=true\nNED_DIAG_API_HTTP=200\n'
          : 'NED_STATUS_TELEGRAM=true\nNED_STATUS_CONNECTED=false\nNED_STATUS_DISCONNECTED=true\nNED_DIAG_TOKEN_PRESENT=true\nNED_DIAG_TOKEN_SHAPE=true\nNED_DIAG_API_HTTP=200\n');
      },
    },
    process: {
      async executeCommand(value, cwd, env) {
        if (value.includes('gateway status')) return { exitCode: 0 };
        if (value.includes('gateway run --replace')) { gatewayStarted = true; return { exitCode: 0 }; }
        command = value;
        return { exitCode: 0 };
      },
      async createSession() {},
      async executeSessionCommand() { gatewayStarted = true; return { cmdId: 'gateway' }; },
    },
  };
  class FakeDaytona {
    constructor() { this.secret = {}; }
    async get() { return sandbox; }
  }
  const provider = createDaytonaProvider({
    apiKey: 'daytona-test-value', DaytonaClass: FakeDaytona,
    profileArchive: async () => Buffer.from('archive'), sleep: async () => {},
  });

  await provider.bootstrap({ id: 'sandbox-openai' }, createNedPlan({ modelProvider: 'openai' }));

  assert.match(command, /config set model\.provider openai-api/);
  assert.match(command, /config set model\.default gpt-5\.4/);
  assert.doesNotMatch(command, /config set model\.provider openrouter/);
});
