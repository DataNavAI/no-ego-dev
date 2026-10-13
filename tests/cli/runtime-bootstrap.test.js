import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createNedPlan } from '../../src/plan.js';
import { createDaytonaProvider as createProvider } from '../../src/providers/daytona.js';

function createDaytonaProvider(options = {}) {
  return createProvider({ runtimeTelegramTokenFactory: () => '123456789:' + 'A'.repeat(35), ...options });
}

test('runtime plan selects an allowlisted direct model provider without changing compute defaults', () => {
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
