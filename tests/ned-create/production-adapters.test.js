import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import {
  createCognitoIdentityAdapter,
  createDynamoLifecycleStore,
  createSecretsManagerVault,
  loadProductionConfig,
} from '../../src/web/production-adapters.js';
import { createBrowserServer } from '../../src/web/app.js';

test('production config fails closed unless identity persistence secrets sweeper quotas monitoring and provider adapters are configured', () => {
  assert.throws(() => loadProductionConfig({}), /missing NED_PUBLIC_ORIGIN/);
  const env = {
    NED_PUBLIC_ORIGIN: 'https://staging.example.com',
    NED_STAGE: 'staging',
    AWS_REGION: 'us-east-1',
    NED_COGNITO_USER_POOL_ID: 'us-east-1_pool',
    NED_COGNITO_CLIENT_ID: 'client',
    NED_LIFECYCLE_TABLE: 'noegodev-ned-staging-lifecycle',
    NED_SECRET_PREFIX: 'noegodev-ned-staging/model',
    NED_KMS_KEY_ARN: 'arn:aws:kms:us-east-1:123456789012:key/example',
    NED_SWEEP_INTERVAL_MS: '60000',
    NED_MAX_ACTIVE_SESSIONS: '10',
    NED_MAX_JOBS_PER_DAY: '20',
    NED_METRIC_NAMESPACE: 'NoEgoDev/NedCreateStaging',
    NED_DAYTONA_SECRET_ARN: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:daytona',
    NED_ALLOWED_MODEL_PROVIDERS: 'openai,anthropic,gemini',
    DEPLOYMENT_REVISION: 'a'.repeat(40),
  };
  assert.equal(loadProductionConfig(env).maxJobsPerDay, 20);
  assert.deepEqual(loadProductionConfig(env).allowedModelProviders, ['openai', 'anthropic', 'gemini']);
  for (const name of ['NED_COGNITO_USER_POOL_ID', 'NED_LIFECYCLE_TABLE', 'NED_KMS_KEY_ARN', 'NED_METRIC_NAMESPACE', 'NED_DAYTONA_SECRET_ARN']) {
    const invalid = { ...env }; delete invalid[name];
    assert.throws(() => loadProductionConfig(invalid), new RegExp(`missing ${name}`));
  }
});

test('Dynamo lifecycle store persists owner-scoped snapshots and TTL without secret fields', async () => {
  const calls = [];
  const client = { async send(command) { calls.push(command.input); return command.input.ExclusiveStartKey ? { Items: [] } : { Items: [] }; } };
  const store = createDynamoLifecycleStore({ client, tableName: 'lifecycle', now: () => 1_000 });
  await store.save({ id: 'session-1', userId: 'owner-1', expiresAt: 61_000, lifecycle: 'active' });
  assert.equal(calls[0].TableName, 'lifecycle');
  assert.equal(calls[0].Item.pk, 'SESSION#session-1');
  assert.equal(calls[0].Item.ttl, 361);
  assert.equal(JSON.stringify(calls[0]).includes('credential'), false);
  await store.delete('session-1');
  assert.equal(calls[1].Key.pk, 'SESSION#session-1');
});

test('Secrets Manager vault stores credentials under KMS with owner tags and verifies owner before deletion', async () => {
  const calls = [];
  const client = { async send(command) {
    calls.push(command.input);
    if (command.constructor.name === 'CreateSecretCommand') return { ARN: 'arn:secret:model-1', Name: command.input.Name };
    if (command.constructor.name === 'DescribeSecretCommand') return { Tags: [{ Key: 'ned-owner', Value: calls[0].Tags[0].Value }] };
    if (command.constructor.name === 'DeleteSecretCommand') return { ARN: command.input.SecretId };
    return {};
  } };
  const vault = createSecretsManagerVault({ client, prefix: 'noegodev-ned-staging/model', kmsKeyId: 'arn:kms:key' });
  const receipt = await vault.put({ ownerId: 'owner-1', providerId: 'openai', method: 'api-key', value: 'top-secret-value' });
  assert.match(receipt.id, /^arn:secret:/);
  assert.equal(calls[0].KmsKeyId, 'arn:kms:key');
  assert.equal(calls[0].SecretString, 'top-secret-value');
  assert.equal(calls[0].Name.startsWith('noegodev-ned-staging/model/'), true);
  await vault.delete({ ownerId: 'owner-1', id: receipt.id });
  assert.equal(calls.at(-1).ForceDeleteWithoutRecovery, true);
});

test('Cognito identity adapter accepts only bounded email/password POST credentials and verifies the returned ID token', async () => {
  const calls = [];
  const client = { async send(command) { calls.push(command.input); return { AuthenticationResult: { IdToken: 'signed-id-token' } }; } };
  const verifier = { async verify(token) { assert.equal(token, 'signed-id-token'); return { sub: 'user-sub', email: 'owner@example.com' }; } };
  const authenticate = createCognitoIdentityAdapter({ client, verifier, clientId: 'client-id' });
  assert.deepEqual(await authenticate(null, { email: 'owner@example.com', password: 'correct horse battery staple' }), {
    userId: 'user-sub', displayName: 'owner@example.com',
  });
  assert.equal(calls[0].AuthFlow, 'USER_PASSWORD_AUTH');
  assert.throws(() => authenticate(null, { email: 'owner@example.com', password: 'short', extra: true }), /invalid_login/);
});

test('production session passes login credentials directly to identity and never persists them', async () => {
  const origin = 'https://staging.example.com';
  const snapshots = [];
  let received;
  const server = createBrowserServer({
    publicOrigin: origin,
    authenticate: async (_request, body) => { received = structuredClone(body); return { userId: 'owner-sub', displayName: body.email }; },
    lifecycleStore: {
      async loadAll() { return []; },
      async save(snapshot) { snapshots.push(structuredClone(snapshot)); },
      async delete() {},
    },
    expirySweepIntervalMs: 60_000,
    cleanupAlert() {},
    secretVault: { async put() { return { id: 'model-1' }; }, async delete({ id }) { return { id, status: 'deleted' }; } },
    computeConnector: { async connect() { return { id: 'compute-1' }; } },
    jobService: {
      async create({ operation }) { return { id: 'job-1', operation, status: 'queued' }; },
      async get({ jobId }) { return { id: jobId, operation: 'create_ned', status: 'queued' }; },
      async cancel({ jobId }) { return { id: jobId, operation: 'create_ned', status: 'cancelled' }; },
    },
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/session`, {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@example.com', password: 'correct horse battery staple' }),
    });
    assert.equal(response.status, 201);
    assert.deepEqual(received, { email: 'owner@example.com', password: 'correct horse battery staple' });
    assert.equal(JSON.stringify(snapshots).includes('correct horse'), false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('browser login collects Cognito email and password without browser persistence', async () => {
  const html = await readFile(new URL('../../src/web/public/index.html', import.meta.url), 'utf8');
  const runtime = await readFile(new URL('../../src/web/public/app.js', import.meta.url), 'utf8');
  assert.match(html, /id="login-email"[^>]+autocomplete="username"/);
  assert.match(html, /id="login-password"[^>]+autocomplete="current-password"/);
  assert.match(runtime, /email:\s*document\.getElementById\('login-email'\)\.value/);
  assert.match(runtime, /password:\s*passwordInput\.value/);
  assert.doesNotMatch(runtime, /localStorage|sessionStorage/);
});
