import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createCognitoIdentityAdapter,
  createDynamoLifecycleStore,
  createSecretsManagerVault,
  loadProductionConfig,
} from '../../src/web/production-adapters.js';

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
    NED_MODEL_PROVIDER: 'openai',
    NED_MODEL_SECRET_ARN: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:model',
    DEPLOYMENT_REVISION: 'a'.repeat(40),
  };
  assert.equal(loadProductionConfig(env).maxJobsPerDay, 20);
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
