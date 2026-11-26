import test from 'node:test';
import assert from 'node:assert/strict';
import {runCli} from '../../../../src/cli.js';
import {browserChat, expect} from '../../communicator/tests/browser-chat-fixture.js';
import {mockProvider} from './mock-provider.js';

test('TC-005: a chat request opens provider authorization and retry reads the protected resource', async t => {
  const provider = await mockProvider(t);
  assert.equal((await fetch(provider.resourceUrl)).status, 401);
  const prompt = 'Read my registered domain using GoDaddy.';
  const identityOptions = {fetch: provider.fetch};
  const agentCalls = [];
  async function cli(home, args, options = {}) {
    const output = [];
    const code = await runCli(['identity', ...args], {log: value => output.push(value), error: value => output.push(value)},
      {home, ...options});
    agentCalls.push({command: args[0], code});
    return {code, output: output.join('\n')};
  }
  const fixture = await browserChat(t, {identityOptions, async onTurn({input, home, origin}) {
    if (input !== prompt) return 'An assistant may mention connecting GoDaddy.';
    const read = await cli(home, ['domain'], {identityOptions});
    if (read.code === 0) return 'Registered domain: ' + JSON.parse(read.output).domain;
    const request = await cli(home, ['connect', 'godaddy', '--url', origin]);
    assert.equal(request.code, 0);
    return 'GoDaddy authorization is required.';
  }});
  const {page, draft, turns} = fixture;
  await fixture.ready();
  async function send(text, number) {
    await draft.fill(text);
    await draft.press('Enter');
    await expect.poll(() => turns.length).toBe(number);
    turns.at(-1).finish();
    await expect(page.getByRole('button', {name: 'Send message', exact: true})).toBeVisible();
  }

  const chatAuth = page.getByRole('group', {name: 'Provider authentication'});
  await send('Tell me about provider authorization.', 1);
  await expect(page.getByRole('region', {name: 'Conversation'})).toContainText('An assistant may mention');
  await expect(chatAuth).toBeHidden();
  await send(prompt, 2);
  await expect(chatAuth.getByRole('button', {name: 'Connect GoDaddy'})).toBeVisible();
  assert.deepEqual(provider.reads, [401]);
  assert.deepEqual(agentCalls, [{command: 'domain', code: 1}, {command: 'connect', code: 0}]);
  await chatAuth.getByRole('button', {name: 'Connect GoDaddy'}).click();
  const settings = page.locator('[data-provider=godaddy]');
  await expect(settings.getByLabel('Managed domain')).toBeVisible();
  await page.context().route('https://developer.godaddy.com/en/docs/api-users/auth', route =>
    route.fulfill({status: 302, headers: {location: provider.authorizationUrl}}));
  const mockPageWaiting = page.context().waitForEvent('page');
  await settings.getByRole('link', {name: 'Create a scoped GoDaddy token'}).click();
  const mockPage = await mockPageWaiting;
  await mockPage.getByRole('button', {name: 'Allow domain read'}).click();
  const token = await mockPage.getByLabel('Access token').textContent();
  assert.equal(token, provider.token);
  await mockPage.close();
  await settings.getByLabel('Managed domain').fill(provider.domain);
  await settings.getByLabel('GoDaddy personal access token').fill(token);
  await settings.getByRole('button', {name: 'Verify domain access'}).click();
  await expect(settings).toContainText('Verified ' + provider.domain);
  assert.deepEqual(provider.reads, [401, 200]);
  assert.equal((await cli(fixture.home, ['domain'], {identityOptions})).code, 1);
  await settings.getByRole('button', {name: 'Confirm connection'}).click();
  await expect(settings).toContainText('Connected as ' + provider.domain);
  await expect(chatAuth).toBeHidden();
  await send(prompt, 3);
  const conversation = page.getByRole('region', {name: 'Conversation'});
  await expect(conversation).toContainText('Registered domain: ' + provider.domain);
  await expect(conversation).not.toContainText(token);
  assert.deepEqual(provider.reads, [401, 200, 200]);
  assert.equal(agentCalls.at(-1).code, 0);
  assert.ok(!JSON.stringify(fixture.messages).includes(token));
  assert.deepEqual(fixture.errors, []);
});
