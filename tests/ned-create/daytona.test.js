import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Daytona } from '@daytona/sdk';

import { createDaytonaProvider } from '../../src/providers/daytona.js';
import { NED_PLAN } from '../../src/plan.js';

test('installed Daytona SDK exposes the SecretService contract used for cleanup', () => {
  const client = new Daytona({ apiKey: 'contract-shape-only' });
  assert.equal(typeof client.secret.create, 'function');
  assert.equal(typeof client.secret.delete, 'function');
  assert.equal(typeof client.deleteSecret, 'undefined');
});

test('Daytona provider creates the fixed private persistent sandbox with an egress-scoped OpenRouter secret', async () => {
  const observed = {};
  class FakeDaytona {
    constructor(config) {
      observed.config = config;
      this.secret = {
        create: async (params) => {
          observed.secret = params;
          return { id: 'secret-1', name: params.name };
        },
      };
    }

    async create(params) {
      observed.create = params;
      return { id: 'sandbox-123', name: params.name };
    }
  }
  const provider = createDaytonaProvider({
    apiKey: 'daytona-secret',
    DaytonaClass: FakeDaytona,
    secretNameFactory: () => 'ned_openrouter_test',
  });

  const workspace = await provider.createWorkspace(NED_PLAN, { openRouterApiKey: 'openrouter-secret' });

  assert.equal(workspace.id, 'sandbox-123');
  assert.equal(workspace.name, 'ned-product-partner');
  assert.equal(workspace.nedSecretName, 'ned_openrouter_test');
  assert.equal(workspace.nedSecretId, 'secret-1');
  assert.deepEqual(observed.config, { apiKey: 'daytona-secret' });
  assert.deepEqual(observed.secret, {
    name: 'ned_openrouter_test',
    value: 'openrouter-secret',
    description: 'OpenRouter access for NED',
    hosts: ['openrouter.ai'],
  });
  assert.deepEqual(observed.create, {
    name: 'ned-product-partner',
    image: 'ubuntu:24.04',
    language: 'typescript',
    public: false,
    ephemeral: false,
    resources: { cpu: 2, memory: 4, disk: 20 },
    autoStopInterval: 15,
    autoArchiveInterval: 10080,
    autoDeleteInterval: -1,
    labels: { app: 'ned', managedBy: 'ned-cli' },
    secrets: { OPENROUTER_API_KEY: 'ned_openrouter_test' },
  });
});

test('Daytona provider uploads the bundled profile and installs pinned Hermes before health checks', async () => {
  const observed = {};
  const sandbox = {
    id: 'sandbox-123',
    name: 'ned-product-partner',
    fs: {
      async uploadFile(content, destination) { observed.upload = { content, destination }; },
    },
    process: {
      async executeCommand(command, cwd, env, timeout) {
        observed.execute = { command, cwd, env, timeout };
        return { exitCode: 0, result: 'installed' };
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
  });

  const result = await provider.bootstrap({ id: 'sandbox-123' }, NED_PLAN);

  assert.deepEqual(observed.upload, { content: archive, destination: '/tmp/ned-profile.tgz' });
  assert.match(observed.execute.command, /3ef6bbd201263d354fd83ec55b3c306ded2eb72a/);
  assert.match(observed.execute.command, /c5ba7e89627577fab914514736ecfb3359b66956ca00199bfef616ca35953cb9/);
  assert.match(observed.execute.command, /sha256sum.*hermes-install\.sh|shasum -a 256.*hermes-install\.sh/);
  assert.match(observed.execute.command, /Hermes installer checksum mismatch/);
  assert.match(observed.execute.command, /--non-interactive/);
  assert.match(observed.execute.command, /hermes profile install \/tmp\/ned-profile --name ned --force --yes/);
  assert.doesNotMatch(observed.execute.command, /hermes profile update/);
  assert.match(observed.execute.command, /hermes --profile ned config set model\.provider openrouter/);
  assert.match(observed.execute.command, /hermes --profile ned config set model\.default openai\/gpt-5\.5/);
  assert.equal(observed.execute.timeout, 900);
  assert.deepEqual(result, { hermesVersion: 'v2026.7.20' });
});

test('Daytona doctor verifies the exact remote Hermes profile', async () => {
  const commands = [];
  const sandbox = {
    state: 'started',
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
  assert.deepEqual(health.checks, ['sandbox', 'hermes', 'ned-profile', 'inference']);
  assert.match(commands[0], /hermes --version/);
  assert.match(commands[0], /hermes profile info ned/);
  assert.match(commands[0], /hermes --profile ned -z 'Reply with exactly: ready'/);
});

test('Daytona chat starts a suspended workspace and shell-quotes the one-shot prompt', async () => {
  const observed = { starts: 0 };
  const sandbox = {
    state: 'stopped',
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

test('Daytona destroy waits for deletion and proves workspace and secret absence by readback', async () => {
  const calls = [];
  let workspaceDeleted = false;
  let secretDeleted = false;
  const sandbox = {
    async delete(timeout, wait) { calls.push(['sandbox-delete', timeout, wait]); workspaceDeleted = true; },
  };
  class FakeDaytona {
    constructor() {
      this.secret = {
        delete: async (id) => { calls.push(['secret-delete', id]); secretDeleted = true; },
        get: async (id) => {
          calls.push(['secret-readback', id]);
          if (secretDeleted) { const error = new Error('not found'); error.status = 404; throw error; }
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
  const provider = createDaytonaProvider({ apiKey: 'daytona-test', DaytonaClass: FakeDaytona });

  const receipt = await provider.destroy({ id: 'sandbox-123', nedSecretId: 'secret-1' });

  assert.deepEqual(calls, [
    ['sandbox-readback', 'sandbox-123'],
    ['sandbox-delete', 300, true],
    ['secret-delete', 'secret-1'],
    ['sandbox-readback', 'sandbox-123'],
    ['secret-readback', 'secret-1'],
  ]);
  assert.deepEqual(receipt, { workspaceAbsent: true, secretAbsent: true });
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
        async create() { return { id: 'secret-orphan' }; },
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
    secretNameFactory: () => 'ned_openrouter_cleanup',
  });

  await assert.rejects(
    () => provider.createWorkspace(NED_PLAN, { openRouterApiKey: 'openrouter-secret' }),
    /sandbox create failed/,
  );
  assert.deepEqual(calls, [
    ['delete', 'secret-orphan'],
    ['readback', 'secret-orphan'],
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
    secretNameFactory: () => 'ned_openrouter_stillpresent',
  });

  await assert.rejects(
    () => provider.createWorkspace(NED_PLAN, { openRouterApiKey: 'openrouter-secret' }),
    (error) => error instanceof AggregateError
      && /readback did not prove absence/.test(error.message)
      && error.recoveryState.secretId === 'secret-still-present'
      && error.recoveryState.secretName === 'ned_openrouter_stillpresent',
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
    secretNameFactory: () => 'ned_openrouter_recovery',
  });

  await assert.rejects(
    () => provider.createWorkspace(NED_PLAN, { openRouterApiKey: 'openrouter-secret' }),
    (error) => error instanceof AggregateError
      && error.recoveryState.secretId === 'secret-recovery'
      && error.recoveryState.secretName === 'ned_openrouter_recovery',
  );
});
