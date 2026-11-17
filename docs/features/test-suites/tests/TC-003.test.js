import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { checkStagingPage } from '../../../../scripts/test-staging.mjs';

test('TC-003: real browser staging smoke requires both deployed composer and correct backend health', { timeout: 45000 }, async t => {
  const browser = await chromium.launch({ headless: true, channel: 'chromium' });
  t.after(() => browser.close());
  for (const variant of ['healthy', 'unauthorized', 'wrong-backend']) await t.test(variant, async () => {
    const page = await browser.newPage();
    let mutations = 0;
    await page.route('https://staging.ned.datanav.app/**', async route => {
      if (route.request().method() !== 'GET') mutations++;
      const health = route.request().url().endsWith('/api/health');
      await route.fulfill({ status: variant === 'unauthorized' ? 401 : 200,
        contentType: health ? 'application/json' : 'text/html',
        body: health ? JSON.stringify({ status: 'ok', service: variant === 'wrong-backend' ? 'other' : 'nedcom' }) : '<textarea id="chat-message"></textarea>' });
    });
    try {
      if (variant === 'healthy') await checkStagingPage(page, 'https://staging.ned.datanav.app/');
      else await assert.rejects(checkStagingPage(page, 'https://staging.ned.datanav.app/'), variant === 'unauthorized' ? /200/ : /nedcom/);
      assert.equal(mutations, 0);
    } finally { await page.close(); }
  });
});
