import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  listModelProviders,
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
