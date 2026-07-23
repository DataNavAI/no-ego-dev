import assert from 'node:assert/strict';
import { test } from 'node:test';

import { authorizeOpenRouter } from '../../src/auth/openrouter.js';

test('OpenRouter authorization uses loopback PKCE and exchanges the callback code without exposing the key', async () => {
  let exchanged;
  const fetchImpl = async (url, options) => {
    assert.equal(url, 'https://openrouter.ai/api/v1/auth/keys');
    exchanged = JSON.parse(options.body);
    return { ok: true, async json() { return { key: 'sk-or-oauth' }; } };
  };
  const openBrowser = async (authUrl) => {
    const url = new URL(authUrl);
    assert.equal(url.origin + url.pathname, 'https://openrouter.ai/auth');
    assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
    assert.ok(url.searchParams.get('code_challenge'));
    assert.equal(url.searchParams.has('state'), false);
    const callback = new URL(url.searchParams.get('callback_url'));
    assert.match(callback.pathname, /^\/callback\/[A-Za-z0-9_-]{20,}$/);
    const unrelated = await fetch(`${callback.origin}/callback/not-the-token?code=attacker`);
    assert.equal(unrelated.status, 404);
    const wrongMethod = await fetch(callback, { method: 'POST' });
    assert.equal(wrongMethod.status, 405);
    callback.searchParams.set('code', 'authorization-code');
    const response = await fetch(callback);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  };

  const key = await authorizeOpenRouter({ openBrowser, fetchImpl, timeoutMs: 2_000 });

  assert.equal(key, 'sk-or-oauth');
  assert.equal(exchanged.code, 'authorization-code');
  assert.equal(exchanged.code_challenge_method, 'S256');
  assert.ok(exchanged.code_verifier);
});
