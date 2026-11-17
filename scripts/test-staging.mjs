import { readFile, stat } from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { suitePlan } from './test-suites.mjs';

export async function checkStagingPage(page, target) {
  const base = new URL(target);
  page.setDefaultTimeout(30000);
  const response = await page.goto(base.href, { waitUntil: 'domcontentloaded', timeout: 45000 });
  assert.equal(response.status(), 200, 'Staging shell must load without an authentication redirect.');
  assert.equal(new URL(page.url()).origin, base.origin);
  await page.locator('#chat-message:not([disabled])').waitFor({ state: 'visible' });
  await page.locator('#chat-message').click();
  const health = await page.evaluate(async url => {
    const response = await fetch(url);
    return { status: response.status, body: await response.json() };
  }, new URL('api/health', base).href);
  assert.equal(health.status, 200);
  assert.equal(health.body.service, 'nedcom');
  assert.equal(health.body.status, 'ok');
}

async function main(target) {
  suitePlan('large', ['--url', target]);
  const headers = {};
  if (process.env.NED_TEST_STAGING_AUTH_FILE) {
    const filename = process.env.NED_TEST_STAGING_AUTH_FILE;
    const info = await stat(filename);
    if (info.mode & 0o077) throw new Error('Staging authorization file must be private (chmod 600).');
    const authorization = (await readFile(filename, 'utf8')).trim();
    if (!/^(Basic|Bearer) [A-Za-z0-9+/=._~-]+$/.test(authorization)) throw new Error('Invalid staging authorization file.');
    headers.Authorization = authorization;
  }
  let browser, interrupted = false;
  const stop = () => { interrupted = true; void browser?.close(); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  try {
    browser = await chromium.launch({ headless: true, channel: 'chromium' });
    if (interrupted) throw new Error('Interrupted.');
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const base = new URL(target);
    await context.route('**/*', async route => {
      const request = route.request();
      if (new URL(request.url()).origin !== base.origin || !['GET', 'HEAD'].includes(request.method())) return route.abort();
      await route.continue({ headers: { ...request.headers(), ...headers } });
    });
    const page = await context.newPage();
    await checkStagingPage(page, base.href);
    if (interrupted) throw new Error('Interrupted.');
    console.log('Staging browser shell/composer and live backend health: PASS. No messages submitted; full live-model conversations are not covered.');
  } catch {
    console.error('Staging smoke failed. Check the explicit staging URL, private authorization file, deployed UI/backend and Chromium setup. No conversation content or credentials are logged.');
    process.exitCode = 1;
  } finally {
    await browser?.close();
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main(process.argv[2]);
