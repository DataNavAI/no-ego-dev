import assert from 'node:assert/strict';
import { test } from 'node:test';

import { runCli } from '../../src/cli.js';
import { createModelConnection } from '../../src/model-providers.js';
import { createNedPlan } from '../../src/plan.js';
import { createDaytonaProvider } from '../../src/providers/daytona.js';

test('create plan selects an allowlisted direct model provider without changing compute defaults', () => {
  assert.deepEqual(createNedPlan({ modelProvider: 'openai' }), {
    provider: 'daytona',
    region: 'auto',
    resources: { cpu: 2, memory: 4, disk: 20 },
    image: 'ubuntu:24.04',
    modelProvider: 'openai',
    hermesModelProvider: 'openai-api',
    model: 'gpt-5.4',
    hermesVersion: 'v2026.7.20',
    profile: 'ned',
    autoStopMinutes: 15,
    autoArchiveMinutes: 10080,
  });
});

test('CLI create selects OpenAI explicitly and passes a non-serializing model connection', async () => {
  let credentials;
  const output = [];
  const exitCode = await runCli(['create', '--model-provider', 'openai'], {
    log: (message) => output.push(message),
    error: assert.fail,
  }, {
    env: { DAYTONA_API_KEY: 'daytona-test-value', OPENAI_API_KEY: 'openai-test-value' },
    getOpenRouterKey: async () => assert.fail('OpenRouter OAuth must not run for OpenAI'),
    appFactory: async () => ({
      async create(value) { credentials = value; return { ready: true }; },
    }),
  });

  assert.equal(exitCode, 0);
  assert.equal(credentials.modelConnection.providerId, 'openai');
  assert.equal(credentials.modelConnection.method, 'api-key');
  assert.equal(JSON.stringify(credentials).includes('openai-test-value'), false);
  assert.equal(credentials.modelConnection.consumeCredential(), 'openai-test-value');
  assert.match(output.join('\n'), /OpenAI/);
  assert.doesNotMatch(output.join('\n'), /Opening OpenRouter/);
});

test('CLI create fails closed when the selected direct provider has no authorization', async () => {
  const errors = [];
  const exitCode = await runCli(['create', '--model-provider', 'anthropic'], {
    log() {},
    error: (message) => errors.push(message),
  }, {
    env: { DAYTONA_API_KEY: 'daytona-test-value' },
    appFactory: async () => assert.fail('create must not start without model authorization'),
  });

  assert.equal(exitCode, 2);
  assert.match(errors.join('\n'), /Anthropic authorization required/);
  assert.match(errors.join('\n'), /secure model-provider connection/);
});

test('Daytona provider injects the selected direct provider through its own egress allowlist', async () => {
  const observed = {};
  class FakeDaytona {
    constructor() {
      this.secret = {
        create: async (params) => { observed.secret = params; return { id: 'secret-openai' }; },
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

  const workspace = await provider.createWorkspace(createNedPlan({ modelProvider: 'openai' }), { modelConnection });

  assert.equal(workspace.modelProvider, 'openai');
  assert.equal(workspace.nedSecretName, 'ned_model_openai_test');
  assert.deepEqual(observed.secret, {
    name: 'ned_model_openai_test',
    value: 'openai-test-value',
    description: 'OpenAI access for NED',
    hosts: ['api.openai.com'],
  });
  assert.deepEqual(observed.create.secrets, { OPENAI_API_KEY: 'ned_model_openai_test' });
});

test('Daytona bootstrap configures the selected Hermes provider and model', async () => {
  let command;
  const sandbox = {
    fs: { async uploadFile() {} },
    process: { async executeCommand(value) { command = value; return { exitCode: 0 }; } },
  };
  class FakeDaytona {
    constructor() { this.secret = {}; }
    async get() { return sandbox; }
  }
  const provider = createDaytonaProvider({
    apiKey: 'daytona-test-value', DaytonaClass: FakeDaytona, profileArchive: async () => Buffer.from('archive'),
  });

  await provider.bootstrap({ id: 'sandbox-openai' }, createNedPlan({ modelProvider: 'openai' }));

  assert.match(command, /config set model\.provider openai-api/);
  assert.match(command, /config set model\.default gpt-5\.4/);
  assert.doesNotMatch(command, /config set model\.provider openrouter/);
});
