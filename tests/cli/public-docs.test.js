import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createBrowserServer } from '../../src/web/app.js';
const ROUTES = ['/docs/v1/quickstart/'];

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
        assert.match(body, /<pre><code>ned --help<\/code><\/pre>/);
      }

      for (const match of body.matchAll(/(?:href|src)="(\/[^"]+)"/g)) links.add(match[1]);
      assert.doesNotMatch(body, /\d{5,20}:[A-Za-z0-9_-]{30,}/);
    }
    for (const retiredRoute of ['/docs/v1/telegram/', '/docs/v1/credentials/']) {
      const response = await fetch(`${context.baseUrl}${retiredRoute}`);
      assert.equal(response.status, 401, retiredRoute);
      assert.match(response.headers.get('content-type'), /^application\/json/);
      assert.doesNotMatch(await response.text(), /BotFather|Sandbox|<html/i);
    }
    for (const link of links) {
      const response = await fetch(`${context.baseUrl}${link}`);
      assert.equal(response.status, 200, link);
    }
  } finally {
    await context.close();
  }
});
