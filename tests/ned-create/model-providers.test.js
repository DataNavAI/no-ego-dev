import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createModelConnection,
  listModelProviders,
  selectModelCredential,
} from '../../src/model-providers.js';

test('public model-provider contract is provider-neutral and exposes truthful browser authorization availability', () => {
  const providers = listModelProviders();

  assert.deepEqual(providers.map(({ id }) => id), ['openai-codex', 'openai', 'anthropic', 'gemini', 'openrouter']);
  assert.deepEqual(providers.map(({ label }) => label), ['ChatGPT', 'OpenAI', 'Anthropic', 'Gemini', 'OpenRouter']);
  const codex = providers.find(({ id }) => id === 'openai-codex');
  assert.equal(codex.delegatedAuthorization.method, 'oauth-device-code');
  assert.equal(codex.apiKeyFallback.status, 'disabled_when_delegated');
  const openRouter = providers.find(({ id }) => id === 'openrouter');
  assert.equal(openRouter.delegatedAuthorization.status, 'available');
  assert.equal(openRouter.apiKeyFallback.status, 'disabled_when_delegated');
  for (const id of ['openai', 'anthropic', 'gemini']) {
    const provider = providers.find((candidate) => candidate.id === id);
    assert.equal(provider.delegatedAuthorization.status, 'unavailable_for_api');
    assert.equal(provider.apiKeyFallback.status, 'available');
  }
  const serialized = JSON.stringify(providers);
  assert.doesNotMatch(serialized, /API_KEY|api\.openai\.com|api\.anthropic\.com|openrouter\.ai/);
});

test('model credential selection accepts provider-specific environment names without preferring OpenRouter', () => {
  assert.deepEqual(selectModelCredential({ providerId: 'openai', env: { OPENAI_API_KEY: 'openai-test-value' } }), {
    providerId: 'openai',
    method: 'api-key',
    value: 'openai-test-value',
  });
  assert.deepEqual(selectModelCredential({ providerId: 'anthropic', env: { ANTHROPIC_API_KEY: 'anthropic-test-value' } }), {
    providerId: 'anthropic',
    method: 'api-key',
    value: 'anthropic-test-value',
  });
  assert.deepEqual(selectModelCredential({ providerId: 'gemini', env: { GOOGLE_API_KEY: 'google-test-value' } }), {
    providerId: 'gemini',
    method: 'api-key',
    value: 'google-test-value',
  });
  assert.deepEqual(selectModelCredential({ providerId: 'gemini', env: { GEMINI_API_KEY: 'gemini-test-value' } }), {
    providerId: 'gemini',
    method: 'api-key',
    value: 'gemini-test-value',
  });
  assert.equal(selectModelCredential({ providerId: 'openrouter', env: {} }), null);
});

test('model connection serializes only non-secret metadata and allows one-time credential consumption', () => {
  const connection = createModelConnection({
    providerId: 'openai',
    method: 'api-key',
    value: 'openai-private-value',
  });

  assert.deepEqual(JSON.parse(JSON.stringify(connection)), {
    providerId: 'openai',
    method: 'api-key',
    sandboxEnvironmentVariable: 'OPENAI_API_KEY',
    allowedHosts: ['api.openai.com'],
    hermesProvider: 'openai-api',
  });
  assert.equal(JSON.stringify(connection).includes('openai-private-value'), false);
  assert.equal(connection.consumeCredential(), 'openai-private-value');
  assert.throws(() => connection.consumeCredential(), /already consumed/);
});

test('unsupported providers and empty credentials fail closed', () => {
  assert.throws(() => selectModelCredential({ providerId: 'other', env: {} }), /Unsupported model provider/);
  assert.throws(
    () => createModelConnection({ providerId: 'openai', method: 'api-key', value: '' }),
    /credential is required/,
  );
  assert.throws(
    () => createModelConnection({ providerId: 'openai', method: 'oauth-pkce', value: 'value' }),
    /not available for browser API authorization/,
  );
});
