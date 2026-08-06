const { chromium } = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');

const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const base = process.env.PROTOTYPE_URL || 'http://127.0.0.1:4173';
const out = process.env.CAPTURE_OUT || '/tmp/ned-issue23-capture/screens';

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: chrome });
  const variants = [['UI-01', 'guided'], ['UI-02', 'focused'], ['UI-03', 'lobby']];
  const sizes = [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]];
  for (const [id, file] of variants) for (const [device, viewport] of sizes) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1, isMobile: device === 'mobile', reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/${file}.html?state=storyboard`, { waitUntil: 'networkidle' });
    const count = await page.locator('.screen').count();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    if (count !== 7 || overflow || errors.length) throw new Error(`${id} ${device}: screens=${count}, overflow=${overflow}, errors=${errors.join('; ')}`);
    const target = path.join(out, `${id.toLowerCase()}-${device}.png`);
    await page.screenshot({ path: target, fullPage: true });
    console.log(`${id} ${device}: 7 screens, horizontalOverflow=false, ${target}`);
    await page.close();
  }
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
