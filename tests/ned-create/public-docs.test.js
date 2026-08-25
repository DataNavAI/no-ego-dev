import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createBrowserServer } from '../../src/web/app.js';
import {
  CREDENTIALS_DOCS_URL,
  QUICKSTART_DOCS_URL,
  TELEGRAM_DOCS_URL,
} from '../../src/telegram.js';

const ROUTES = [
  '/docs/v1/quickstart/',
  '/docs/v1/telegram/',
  '/docs/v1/credentials/',
];

async function startDocsServer() {
  const server = createBrowserServer({
    publicOrigin: 'http://127.0.0.1',
    authenticate: async () => ({ userId: 'docs-check' }),
    secretVault: { async put() {}, async delete() {} },
    computeConnector: { async connect() {} },
    jobService: { async create() {}, async get() {}, async cancel() {} },
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

test('clean local HTTP validation serves every stable V1 page and all internal links', async () => {
  const context = await startDocsServer();
  try {
    const links = new Set(['/docs.css']);
    for (const route of ROUTES) {
      const response = await fetch(`${context.baseUrl}${route}`);
      assert.equal(response.status, 200, route);
      assert.match(response.headers.get('content-type'), /^text\/html/);
      const body = await response.text();
      assert.match(body, /<h1>/);
      if (route === '/docs/v1/quickstart/') {
        assert.match(body, /curl -fsSL https:\/\/raw\.githubusercontent\.com\/DataNavAI\/no-ego-dev\/main\/scripts\/install\.sh \| bash/);
        assert.match(body, /<pre><code>ned create<\/code><\/pre>/);
      }
      if (route === '/docs/v1/telegram/') {
        assert.match(body, /Telegram requires you to create a bot through its official @BotFather/);
        assert.match(body, /Paste the Telegram bot token \(input hidden\):/);
      }
      for (const match of body.matchAll(/(?:href|src)="(\/[^"]+)"/g)) links.add(match[1]);
      assert.doesNotMatch(body, /\d{5,20}:[A-Za-z0-9_-]{30,}/);
    }
    for (const link of links) {
      const response = await fetch(`${context.baseUrl}${link}`);
      assert.equal(response.status, 200, link);
    }
  } finally {
    await context.close();
  }
});

test('served V1 quickstart separates installation from Daytona provisioning', async () => {
  const context = await startDocsServer();
  try {
    const response = await fetch(`${context.baseUrl}/docs/v1/quickstart/`);
    assert.equal(response.status, 200);
    const body = await response.text();

    assert.match(body, /curl -fsSL https:\/\/raw\.githubusercontent\.com\/DataNavAI\/no-ego-dev\/main\/scripts\/install\.sh \| bash/);
    assert.match(body, /does not provision a workspace; after installation, run <code>ned create<\/code>/);
    assert.match(body, /<h2>2\. Create your Daytona Sandbox<\/h2>/);
    assert.match(body, /<pre><code>ned create<\/code><\/pre>/);
    assert.match(body, /Daytona-only CLI/);
    assert.match(body, /always-on by default \(<code>auto-stop=0<\/code>\)/);
    assert.doesNotMatch(body, /One local command creates a private persistent Daytona Sandbox/);
    assert.doesNotMatch(body, /b850f8cdf167b5f6f9ce7c79d0a2415ac9fe182c/);
  } finally {
    await context.close();
  }
});

test('CLI recovery URLs use the stable public V1 documentation contract', () => {
  assert.equal(QUICKSTART_DOCS_URL, 'https://ned.datanav.app/docs/v1/quickstart/');
  assert.equal(TELEGRAM_DOCS_URL, 'https://ned.datanav.app/docs/v1/telegram/');
  assert.equal(CREDENTIALS_DOCS_URL, 'https://ned.datanav.app/docs/v1/credentials/');
  assert.deepEqual(ROUTES.map((route) => `https://ned.datanav.app${route}`), [
    'https://ned.datanav.app/docs/v1/quickstart/',
    'https://ned.datanav.app/docs/v1/telegram/',
    'https://ned.datanav.app/docs/v1/credentials/',
  ]);
});
