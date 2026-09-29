import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import { mkdir, writeFile } from 'node:fs/promises';

chromium.use(stealth());

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith('--'));
const headless = !args.includes('--headful');
if (!url) {
  console.error('Usage: npm run product -- <ozon product url> [--headful]');
  process.exit(1);
}

// Runs in the page: collects data from JSON-LD, then falls back to meta tags.
export function extract() {
  const meta = (p) =>
    document.querySelector(`meta[property="${p}"], meta[name="${p}"]`)?.content || null;

  let product = null;
  for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const j = JSON.parse(s.textContent);
      const items = Array.isArray(j) ? j : j['@graph'] || [j];
      product = items.find((i) => i && i['@type'] === 'Product') || product;
    } catch {}
  }
  const offer = Array.isArray(product?.offers) ? product.offers[0] : product?.offers;
  const image = Array.isArray(product?.image) ? product.image[0] : product?.image;

  return {
    name: product?.name || meta('og:title') || document.querySelector('h1')?.innerText || null,
    price: offer?.price ?? meta('product:price:amount') ?? null,
    currency: offer?.priceCurrency ?? meta('product:price:currency') ?? null,
    description: product?.description || meta('og:description') || meta('description'),
    image: image || meta('og:image'),
  };
}

const browser = await chromium.launch({
  headless,
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--disable-blink-features=AutomationControlled'],
});
try {
  const context = await browser.newContext({
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow',
    viewport: { width: 1366, height: 768 },
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

  const data = await page.evaluate(extract);
  const title = await page.title();
  const blocked = /доступ ограничен|antibot|challenge/i.test(title) || (!data.name && !data.price);
  if (blocked) {
    await mkdir('output', { recursive: true });
    await page.screenshot({ path: 'output/blocked.png' });
    console.error(`Не удалось получить данные (страница: "${title}"). Вероятно, антибот-защита.`);
    console.error('Скриншот: output/blocked.png. Попробуйте --headful, российский IP или прокси.');
    process.exitCode = 2;
  } else {
    const result = { url: page.url(), ...data };
    await mkdir('output', { recursive: true });
    await writeFile('output/product.json', JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  }
} finally {
  await browser.close();
}
