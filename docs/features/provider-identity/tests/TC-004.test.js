import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium, expect} from 'playwright/test';
import {createCommunicatorServer} from '../../../../src/communicator/server.js';
import {loadApiCredential} from '../../../../apps/core/src/auth.js';
import {runCli} from '../../../../src/cli.js';
import {configuredModelSetup} from '../../communicator/tests/model-fixture.js';

test('TC-004: mobile Connections dialog presents CLI request, confirms identity, and clears sensitive inputs', async t => {
  const home = await mkdtemp(join(tmpdir(), 'ned-identity-browser-'));
  let now = 1_000_000;
  const apps = [];
  let browser;
  t.after(async () => {
    await browser?.close();
    await Promise.all(apps.map(app => app.close()));
    await rm(home, {recursive: true, force: true});
  });
  const identityOptions = {githubClientId: 'Iv1_testapp', clock: () => now, async fetch(url, options) {
    if (url.endsWith('/login/device/code')) return Response.json({expires_in: 900, interval: 5, user_code: 'TEST-CODE',
      verification_uri: 'https://github.com/login/device', device_code: 'synthetic-device-code'});
    if (url.endsWith('/login/oauth/access_token')) return Response.json({access_token: 'synthetic-identity-token', expires_in: 600});
    if (url === 'https://api.github.com/user') return Response.json({login: 'test-owner', id: 1});
    if (url.endsWith('/domain-names/example.test') && options.headers.Authorization === 'Bearer synthetic-domain-token')
      return Response.json({domain: 'example.test'});
    return Response.json({}, {status: 401});
  }};
  async function start(options) {
    const app = createCommunicatorServer({home, databasePath: join(home, 'test.sqlite'), modelSetup: configuredModelSetup(), identityOptions, ...options});
    apps.push(app);
    return app.listen();
  }
  const url = await start();
  const output = [];
  assert.equal(await runCli(['identity', 'connect', 'github', '--url', url],
    {log: value => output.push(value), error: value => output.push(value)}, {home}), 0);
  assert.equal(JSON.parse(output[0]).status, 'requested');
  browser = await chromium.launch({headless: true});
  const page = await browser.newPage({viewport: {width: 390, height: 844}});
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));

  async function settings(origin) {
    await page.goto(origin);
    await page.locator('#access-token').fill(loadApiCredential({home}));
    await page.locator('#access-submit').click();
    await expect(page.locator('#app-shell')).toBeVisible();
  }
  await settings(url);
  await page.locator('#chat-tools-toggle').click();await page.locator('#connections-toggle').click();
  const github = page.locator('[data-provider=github]');
  const godaddy = page.locator('[data-provider=godaddy]');
  await github.getByLabel('GitHub username').fill('test-owner');
  await github.getByRole('button', {name: 'Get sign-in code'}).click();
  await expect(github.getByRole('link', {name: 'Open GitHub sign-in'})).toHaveAttribute('href', 'https://github.com/login/device');
  now += 5000;
  await github.getByRole('button', {name: 'Check approval'}).click();
  await expect(github).toContainText('Verified test-owner');
  await github.getByRole('button', {name: 'Confirm connection'}).click();
  await expect(github).toContainText('Connected as test-owner');
  await github.getByRole('button', {name: 'Change connection'}).click();
  await github.getByRole('button', {name: 'Cancel connection'}).click();
  await expect(github).toContainText('Connected as test-owner');

  await godaddy.getByRole('button', {name: 'Connect', exact: true}).click();
  await godaddy.getByLabel('Managed domain').fill('example.test');
  await godaddy.getByLabel('GoDaddy personal access token').fill('synthetic-domain-token');
  await godaddy.getByRole('button', {name: 'Verify domain access'}).click();
  await expect(godaddy).toContainText('Verified example.test');
  await expect(godaddy.locator('input[type=password]')).toHaveCount(0);
  await godaddy.getByRole('button', {name: 'Cancel connection'}).click();
  await expect(godaddy).toContainText('Disconnected');
  assert.equal(await page.locator('html').evaluate(element => element.scrollWidth), 390);

  await github.getByRole('button', {name: 'Disconnect', exact: true}).click();
  await github.getByRole('button', {name: 'Disconnect from NED'}).click();
  await expect(github).toContainText('Disconnected');
  await page.setViewportSize({width: 1280, height: 844});
  await settings(await start({identityEnabled: false}));
  await page.locator('#chat-tools-toggle').click();await page.locator('#connections-toggle').click();
  await expect(page.locator('#provider-connections')).toBeHidden();
  await expect(page.locator('#provider-manager-note')).toHaveText('Provider connections are unavailable on this instance.');
  assert.deepEqual(failures, []);
});
