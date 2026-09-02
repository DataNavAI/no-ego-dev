import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import {
  CENTRAL_TELEMETRY,
  DURATION_BUCKETS,
  TELEMETRY_EVENTS,
  createFileTelemetry,
} from '../../src/telemetry.js';
import { runCli } from '../../src/cli.js';

async function temporaryHome() {
  return mkdtemp(path.join(os.tmpdir(), 'ned-telemetry-test-'));
}

test('telemetry is off by default and enable requires explicit complete consent', async () => {
  const home = await temporaryHome();
  const telemetry = createFileTelemetry({ home, fetch: async () => assert.fail('default-off telemetry must not send') });

  assert.deepEqual(await telemetry.status(), { enabled: false });
  await assert.rejects(
    () => telemetry.enable({ host: 'https://us.i.posthog.com', projectKey: 'phc_public' }),
    /privacy policy/i,
  );
  await assert.rejects(
    () => telemetry.enable({ host: 'https://us.i.posthog.com', projectKey: 'phc_public', privacyPolicy: 'https://example.com/privacy' }),
    /affirmative consent/i,
  );
});

test('centralized telemetry defaults require only explicit consent', async () => {
  const home = await temporaryHome();
  const telemetry = createFileTelemetry({ home, fetch: async () => ({ ok: true }) });

  const status = await telemetry.enable({ consent: true });
  assert.equal(status.enabled, true);
  assert.equal(status.host, CENTRAL_TELEMETRY.host);
  assert.equal(status.privacyPolicy, CENTRAL_TELEMETRY.privacyPolicy);
});

test('enable creates a random installation identity and disable preserves it without sending', async () => {
  const home = await temporaryHome();
  const requests = [];
  const telemetry = createFileTelemetry({ home, fetch: async (...args) => requests.push(args) });

  const enabled = await telemetry.enable({
    host: 'https://us.i.posthog.com',
    projectKey: 'phc_public_ingest_key',
    privacyPolicy: 'https://example.com/privacy',
    consent: true,
  });
  assert.equal(enabled.enabled, true);
  assert.match(enabled.installationId, /^[0-9a-f-]{36}$/);

  await telemetry.disable();
  const disabled = await telemetry.status();
  assert.equal(disabled.enabled, false);
  assert.equal(disabled.installationId, enabled.installationId);
  await telemetry.capture('cli_chat_completed', { durationMs: 1200, resultClass: 'success' });
  assert.equal(requests.length, 0);
});

test('delete removes all local telemetry identity and configuration', async () => {
  const home = await temporaryHome();
  const telemetry = createFileTelemetry({ home, fetch: async () => ({ ok: true }) });
  const first = await telemetry.enable({
    host: 'https://eu.i.posthog.com', projectKey: 'phc_public',
    privacyPolicy: 'https://example.com/privacy', consent: true,
  });

  await telemetry.delete();
  assert.deepEqual(await telemetry.status(), { enabled: false });
  const second = await telemetry.enable({
    host: 'https://eu.i.posthog.com', projectKey: 'phc_public',
    privacyPolicy: 'https://example.com/privacy', consent: true,
  });
  assert.notEqual(second.installationId, first.installationId);
});

test('capture sends only the versioned allowlist and buckets duration', async () => {
  const home = await temporaryHome();
  const requests = [];
  const telemetry = createFileTelemetry({
    home,
    cliVersion: '9.8.7',
    platform: 'darwin',
    fetch: async (url, options) => { requests.push({ url, options }); return { ok: true }; },
  });
  await telemetry.enable({
    host: 'https://us.i.posthog.com/', projectKey: 'phc_public',
    privacyPolicy: 'https://example.com/privacy', consent: true,
  });

  await telemetry.capture('cli_chat_completed', {
    durationMs: 73_000,
    resultClass: 'success',
    prompt: 'private prompt',
    workspaceId: 'sandbox-secret',
    repository: 'private/repo',
    path: '/Users/alice/private',
  });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://us.i.posthog.com/capture/');
  const body = JSON.parse(requests[0].options.body);
  assert.equal(body.api_key, 'phc_public');
  assert.equal(body.event, 'cli_chat_completed');
  assert.deepEqual(Object.keys(body.properties).sort(), [
    'cli_version', 'distinct_id', 'duration_bucket', 'os_family', 'result_class', 'schema_version',
  ]);
  assert.equal(body.properties.duration_bucket, DURATION_BUCKETS.underFiveMinutes);
  assert.equal(JSON.stringify(body).includes('private prompt'), false);
  assert.equal(JSON.stringify(body).includes('sandbox-secret'), false);
});

test('unknown events and result classes are rejected without network access', async () => {
  const home = await temporaryHome();
  let calls = 0;
  const telemetry = createFileTelemetry({ home, fetch: async () => { calls += 1; } });
  await telemetry.enable({
    host: 'https://us.i.posthog.com', projectKey: 'phc_public',
    privacyPolicy: 'https://example.com/privacy', consent: true,
  });

  await assert.rejects(() => telemetry.capture('prompt_recorded', {}), /event/i);
  await assert.rejects(
    () => telemetry.capture(TELEMETRY_EVENTS.chatCompleted, { resultClass: 'secret-error-message' }),
    /result class/i,
  );
  assert.equal(calls, 0);
});

test('delivery is bounded and failure-safe', async () => {
  const home = await temporaryHome();
  const telemetry = createFileTelemetry({
    home,
    timeoutMs: 10,
    fetch: async (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')));
    }),
  });
  await telemetry.enable({
    host: 'https://us.i.posthog.com', projectKey: 'phc_public',
    privacyPolicy: 'https://example.com/privacy', consent: true,
  });

  const started = Date.now();
  assert.equal(await telemetry.capture('cli_create_completed', { durationMs: 5, resultClass: 'success' }), false);
  assert.ok(Date.now() - started < 500);
});

test('telemetry CLI supports status, explicit enable, disable, and delete', async () => {
  const calls = [];
  const telemetry = {
    async status() { calls.push(['status']); return { enabled: false }; },
    async enable(options) { calls.push(['enable', options]); return { enabled: true }; },
    async disable() { calls.push(['disable']); },
    async delete() { calls.push(['delete']); },
  };
  const output = [];
  const io = { log: (message) => output.push(message), error: assert.fail };
  const deps = { telemetry };

  assert.equal(await runCli(['telemetry', 'status'], io, deps), 0);
  assert.equal(await runCli(['telemetry', 'enable', '--yes', '--host', 'https://us.i.posthog.com', '--project-key', 'phc_public', '--privacy-policy', 'https://example.com/privacy'], io, deps), 0);
  assert.equal(await runCli(['telemetry', 'disable'], io, deps), 0);
  assert.equal(await runCli(['telemetry', 'delete'], io, deps), 0);
  assert.deepEqual(calls[1], ['enable', {
    consent: true,
    host: 'https://us.i.posthog.com',
    projectKey: 'phc_public',
    privacyPolicy: 'https://example.com/privacy',
  }]);
});

test('CLI emits lifecycle events at activation and primary journey completion boundaries', async () => {
  const events = [];
  const telemetry = { capture: async (event, properties) => events.push([event, properties.resultClass]) };
  const io = { log() {}, error() {} };
  const dependencies = {
    env: { DAYTONA_API_KEY: 'daytona-public-test' },
    readDaytonaCredential: () => 'synthetic-test-runtime-credential',
    getModelConnection: async () => ({ providerId: 'openai-codex', method: 'oauth-device-code' }),
    getTelegramConnection: async () => ({ botUsername: 'ned_disposable_bot', botUrl: 'https://t.me/ned_disposable_bot' }),
    telemetry,
    appFactory: async () => ({
      async create() { return { ready: true }; },
      async chat() { return 'done'; },
      async doctor() { return { ok: true, checks: [] }; },
      async reset() { return { ok: true }; },
      async destroy() {},
    }),
  };

  await runCli(['create'], io, dependencies);
  await runCli(['chat', 'do not collect me'], io, dependencies);
  await runCli(['doctor'], io, dependencies);
  await runCli(['reset'], io, dependencies);
  await runCli(['destroy', '--yes'], io, dependencies);

  assert.deepEqual(events.map(([event]) => event), [
    'cli_create_started', 'cli_create_completed', 'cli_chat_completed',
    'cli_doctor_completed', 'cli_reset_completed', 'cli_destroy_completed',
  ]);
  assert.equal(JSON.stringify(events).includes('do not collect me'), false);
});

test('CLI telemetry delivery is detached from product completion', async () => {
  const telemetry = { capture: async () => new Promise(() => {}) };
  const command = runCli(['chat', 'private prompt'], { log() {}, error: assert.fail }, {
    env: { DAYTONA_API_KEY: 'test' },
    readDaytonaCredential: () => 'synthetic-test-runtime-credential',
    getModelConnection: async () => ({ providerId: 'openai-codex', method: 'oauth-device-code' }),
    getTelegramConnection: async () => ({ botUsername: 'ned_disposable_bot', botUrl: 'https://t.me/ned_disposable_bot' }),
    telemetry,
    appFactory: async () => ({ async chat() { return 'done'; } }),
  });

  const result = await Promise.race([
    command,
    new Promise((resolve) => setTimeout(() => resolve('timed-out'), 100)),
  ]);
  assert.equal(result, 0);
});

test('CLI emits create and chat failure classes without error messages', async () => {
  const events = [];
  const telemetry = { capture: async (event, properties) => events.push([event, properties]) };
  const dependencies = {
    env: { DAYTONA_API_KEY: 'test' },
    readDaytonaCredential: () => 'synthetic-test-runtime-credential',
    getModelConnection: async () => ({ providerId: 'openai-codex', method: 'oauth-device-code' }),
    getTelegramConnection: async () => ({ botUsername: 'ned_disposable_bot', botUrl: 'https://t.me/ned_disposable_bot' }),
    telemetry,
    appFactory: async () => ({
      async create() { throw new Error('workspace private-name failed'); },
      async chat() { throw new Error('prompt contents leaked'); },
    }),
  };
  const io = { log() {}, error() {} };

  await runCli(['create'], io, dependencies);
  await runCli(['chat', 'private prompt'], io, dependencies);

  assert.deepEqual(events.map(([event, properties]) => [event, properties.resultClass]), [
    ['cli_create_started', 'started'], ['cli_create_failed', 'operation_error'],
    ['cli_chat_failed', 'operation_error'],
  ]);
  const serialized = JSON.stringify(events);
  assert.equal(serialized.includes('workspace private-name'), false);
  assert.equal(serialized.includes('private prompt'), false);
});
