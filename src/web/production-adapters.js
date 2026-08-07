import { createHash, randomUUID } from 'node:crypto';

import { DeleteCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import {
  CreateSecretCommand,
  DeleteSecretCommand,
  DescribeSecretCommand,
} from '@aws-sdk/client-secrets-manager';
import { InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';

const SECRET_FIELD = /(?:credential|password|prompt|output|secret(?:string|value)?|token)/i;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}$/;
const SHA = /^[a-f0-9]{40}$/;

function required(env, name) {
  const value = env[name];
  if (typeof value !== 'string' || value.length === 0) throw new Error(`Production configuration missing ${name}`);
  return value;
}

function boundedInteger(env, name, minimum, maximum) {
  const value = Number(required(env, name));
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`Production configuration has invalid ${name}`);
  }
  return value;
}

export function loadProductionConfig(env = process.env) {
  const publicOrigin = required(env, 'NED_PUBLIC_ORIGIN');
  const parsedOrigin = new URL(publicOrigin);
  if (parsedOrigin.origin !== publicOrigin || parsedOrigin.protocol !== 'https:') {
    throw new Error('Production configuration requires canonical HTTPS NED_PUBLIC_ORIGIN');
  }
  const stage = required(env, 'NED_STAGE');
  if (stage !== 'staging') throw new Error('This candidate permits staging only');
  const deploymentRevision = required(env, 'DEPLOYMENT_REVISION');
  if (!SHA.test(deploymentRevision)) throw new Error('Production configuration requires an immutable deployment revision');
  const modelProvider = required(env, 'NED_MODEL_PROVIDER');
  if (!['openai', 'anthropic', 'gemini', 'openrouter'].includes(modelProvider)) {
    throw new Error('Production configuration has unsupported NED_MODEL_PROVIDER');
  }
  return Object.freeze({
    publicOrigin,
    stage,
    region: required(env, 'AWS_REGION'),
    userPoolId: required(env, 'NED_COGNITO_USER_POOL_ID'),
    cognitoClientId: required(env, 'NED_COGNITO_CLIENT_ID'),
    lifecycleTable: required(env, 'NED_LIFECYCLE_TABLE'),
    secretPrefix: required(env, 'NED_SECRET_PREFIX'),
    kmsKeyArn: required(env, 'NED_KMS_KEY_ARN'),
    sweepIntervalMs: boundedInteger(env, 'NED_SWEEP_INTERVAL_MS', 1_000, 60_000),
    maxActiveSessions: boundedInteger(env, 'NED_MAX_ACTIVE_SESSIONS', 1, 1_000),
    maxJobsPerDay: boundedInteger(env, 'NED_MAX_JOBS_PER_DAY', 1, 1_000),
    metricNamespace: required(env, 'NED_METRIC_NAMESPACE'),
    daytonaSecretArn: required(env, 'NED_DAYTONA_SECRET_ARN'),
    modelProvider,
    modelSecretArn: required(env, 'NED_MODEL_SECRET_ARN'),
    deploymentRevision,
  });
}

function assertNoSecretFields(value, path = 'snapshot') {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_FIELD.test(key) && child !== undefined && child !== null) {
      throw new Error(`Lifecycle snapshot contains prohibited field at ${path}.${key}`);
    }
    assertNoSecretFields(child, `${path}.${key}`);
  }
}

export function createDynamoLifecycleStore({ client, tableName, now = () => Date.now() } = {}) {
  if (!client?.send || !tableName) throw new Error('Dynamo lifecycle store requires client and table');
  return Object.freeze({
    async loadAll() {
      const snapshots = [];
      let ExclusiveStartKey;
      do {
        const response = await client.send(new ScanCommand({
          TableName: tableName,
          ConsistentRead: true,
          FilterExpression: 'begins_with(pk, :prefix)',
          ExpressionAttributeValues: { ':prefix': 'SESSION#' },
          ...(ExclusiveStartKey ? { ExclusiveStartKey } : {}),
        }));
        for (const raw of response.Items || []) {
          if (raw.snapshot && typeof raw.snapshot === 'object') snapshots.push(raw.snapshot);
        }
        ExclusiveStartKey = response.LastEvaluatedKey;
      } while (ExclusiveStartKey);
      return snapshots;
    },
    async save(snapshot) {
      if (!snapshot || typeof snapshot.id !== 'string' || typeof snapshot.userId !== 'string') {
        throw new Error('Lifecycle snapshot requires session and owner identity');
      }
      assertNoSecretFields(snapshot);
      const expiresAt = Number(snapshot.expiresAt);
      if (!Number.isFinite(expiresAt)) throw new Error('Lifecycle snapshot requires expiry');
      const item = {
        pk: `SESSION#${snapshot.id}`,
        ownerId: snapshot.userId,
        recordType: 'session',
        snapshot: structuredClone(snapshot),
        updatedAt: Math.floor(now() / 1_000),
        ttl: Math.floor(expiresAt / 1_000) + 300,
      };
      await client.send(new PutCommand({
        TableName: tableName,
        Item: item,
      }));
    },
    async delete(id) {
      if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new Error('Invalid lifecycle session identity');
      await client.send(new DeleteCommand({ TableName: tableName, Key: { pk: `SESSION#${id}` } }));
    },
  });
}

function ownerTag(ownerId) {
  return createHash('sha256').update(ownerId).digest('hex');
}

export function createSecretsManagerVault({ client, prefix, kmsKeyId } = {}) {
  if (!client?.send || !/^[A-Za-z0-9/_+=.@-]{1,400}$/.test(prefix || '') || !kmsKeyId) {
    throw new Error('Secrets Manager vault requires client, safe prefix, and KMS key');
  }
  return Object.freeze({
    async put({ ownerId, providerId, method, value }) {
      if (typeof ownerId !== 'string' || !/^[a-z0-9-]{2,32}$/.test(providerId || '') || method !== 'api-key') {
        throw new Error('Secret vault rejected metadata');
      }
      if (typeof value !== 'string' || value.length < 8 || value.length > 16_384) throw new Error('Secret vault rejected value');
      const name = `${prefix}/${providerId}/${randomUUID()}`;
      const response = await client.send(new CreateSecretCommand({
        Name: name,
        KmsKeyId: kmsKeyId,
        SecretString: value,
        Description: `NED ${providerId} staging connection`,
        Tags: [
          { Key: 'ned-owner', Value: ownerTag(ownerId) },
          { Key: 'Project', Value: 'noegodev-ned' },
          { Key: 'Environment', Value: 'staging' },
        ],
      }));
      if (typeof response.ARN !== 'string') throw new Error('Secrets Manager returned invalid receipt');
      return { id: response.ARN };
    },
    async delete({ ownerId, id }) {
      if (typeof id !== 'string' || !id.startsWith('arn:')) throw new Error('Secret vault rejected identity');
      const described = await client.send(new DescribeSecretCommand({ SecretId: id }));
      const actualOwner = (described.Tags || []).find(({ Key }) => Key === 'ned-owner')?.Value;
      if (actualOwner !== ownerTag(ownerId)) throw new Error('Secret vault owner mismatch');
      await client.send(new DeleteSecretCommand({ SecretId: id, ForceDeleteWithoutRecovery: true }));
      return { id, status: 'deleted' };
    },
  });
}

export function createCognitoIdentityAdapter({ client, verifier, clientId } = {}) {
  if (!client?.send || !verifier?.verify || !clientId) throw new Error('Cognito identity adapter requires client, verifier, and app client');
  return function authenticate(_request, body) {
    if (!body || Object.keys(body).sort().join(',') !== 'email,password' || !EMAIL.test(body.email || '')
      || typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 256) {
      throw new Error('invalid_login');
    }
    return (async () => {
      const response = await client.send(new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: clientId,
        AuthParameters: { USERNAME: body.email, PASSWORD: body.password },
      }));
      const idToken = response.AuthenticationResult?.IdToken;
      if (typeof idToken !== 'string') throw new Error('authentication_failed');
      const claims = await verifier.verify(idToken);
      if (typeof claims.sub !== 'string' || !EMAIL.test(claims.email || '')) throw new Error('authentication_failed');
      return { userId: claims.sub, displayName: claims.email };
    })();
  };
}
