const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');

const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const base = process.env.PROTOTYPE_URL || 'http://127.0.0.1:4173';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: chrome });
  for (const file of ['guided', 'focused', 'lobby']) {
    for (const viewport of [{ width: 320, height: 844 }, { width: 390, height: 844 }, { width: 1440, height: 900 }]) {
      const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
      await page.goto(`${base}/${file}.html`, { waitUntil: 'networkidle' });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false, `${file} ${viewport.width}px overflow`);
      const controlHeights = await page.locator('button:visible').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().height));
      assert.equal(controlHeights.every(height => height >= 44), true, `${file} ${viewport.width}px control height`);
      await page.close();
    }
  }

  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await page.goto(`${base}/guided.html`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Sign in to continue' }).click();
  assert.equal(await page.evaluate(() => document.activeElement?.tagName), 'H2', 'focus moves to auth heading');
  assert.equal(await page.getByRole('button', { name: 'Create my NED' }).isDisabled(), true);
  await page.getByRole('button', { name: 'Connect NED compute' }).click();
  assert.equal(await page.getByRole('button', { name: 'Create my NED' }).isDisabled(), true);
  await page.getByRole('button', { name: 'Connect OpenRouter' }).click();
  assert.equal(await page.getByRole('button', { name: 'Create my NED' }).isEnabled(), true);
  await page.getByRole('button', { name: 'Create my NED' }).click();
  assert.equal(await page.evaluate(() => document.activeElement?.tagName), 'H2', 'focus moves to progress heading');
  await page.getByRole('button', { name: 'Preview ready' }).click();
  assert.equal(await page.locator('.answer').count(), 0, 'no answer before send');
  await page.getByLabel('Request').fill('Build a useful MVP');
  await page.getByRole('button', { name: 'Send to NED' }).click();
  await page.getByText('Request completed').waitFor();
  await page.goto(`${base}/guided.html?state=destroy`, { waitUntil: 'networkidle' });
  const deleteButton = page.getByRole('button', { name: 'Delete NED permanently' });
  assert.equal(await deleteButton.isDisabled(), true);
  await page.getByRole('checkbox').check();
  assert.equal(await deleteButton.isEnabled(), true);
  await deleteButton.click();
  await page.getByText('NED deleted. Your provider connections are still active.').waitFor();
  await browser.close();
  console.log('prototype verification PASS: responsive, focus, auth gating, first request, and deletion gating');
})().catch(error => { console.error(error); process.exit(1); });
