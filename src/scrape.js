import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import { mkdir, writeFile } from 'node:fs/promises';

chromium.use(stealth());

const [url, ...flags] = process.argv.slice(2);
if (!url) {
  console.error('Usage: npm run scrape -- <url> [--selector "css"] [--headful]');
  process.exit(1);
}
const selectorIdx = flags.indexOf('--selector');
const selector = selectorIdx >= 0 ? flags[selectorIdx + 1] : null;
const headless = !flags.includes('--headful');

const browser = await chromium.launch({
  headless,
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
try {
  const context = await browser.newContext({
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
    viewport: { width: 1366, height: 768 },
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  if (selector) await page.waitForSelector(selector, { timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  const data = {
    url: page.url(),
    title: await page.title(),
    text: selector ? await page.locator(selector).allInnerTexts() : null,
    html: await page.content(),
  };

  await mkdir('output', { recursive: true });
  await writeFile('output/result.json', JSON.stringify(data, null, 2));
  await page.screenshot({ path: 'output/page.png', fullPage: true });
  console.log(`OK: ${data.title} -> output/result.json`);
} finally {
  await browser.close();
}
