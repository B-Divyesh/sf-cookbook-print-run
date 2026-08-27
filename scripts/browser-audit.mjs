import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';

const base = process.env.AUDIT_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => consoleErrors.push(error.message));

async function assertA11y(path) {
  await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact));
  if (blocking.length) throw new Error(`Accessibility violations on ${path}: ${blocking.map((item) => item.id).join(', ')}`);
  return results.violations.length;
}

await page.goto(base, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
if (await page.locator('h1').count() !== 1) throw new Error('Expected exactly one h1');
if (await page.locator('main').count() !== 1) throw new Error('Expected one main landmark');
if (await page.locator('img:not([alt])').count()) throw new Error('Found image without alt text');

await page.getByRole('button', { name: 'Try 3 sample recipes' }).click();
await page.locator('.recipe-row').first().waitFor();
if (await page.locator('.recipe-row').count() !== 3) throw new Error('Sample workflow did not load three recipes');
if (await page.locator('.print-sheet').count() !== 4) throw new Error('Packet should contain cover plus three recipe sheets');

const firstServings = page.locator('.recipe-row').first().getByLabel('Serves');
await firstServings.fill('8');
await firstServings.blur();
if (!await page.locator('.recipe-sheet').first().getByText('4 cans chickpeas, drained').isVisible()) throw new Error('Serving scaling was not reflected in the packet');

const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
if (!noOverflow) throw new Error('The 390px layout has horizontal overflow');

const homeAxe = await new AxeBuilder({ page }).analyze();
const homeBlocking = homeAxe.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact));
if (homeBlocking.length) throw new Error(`Accessibility violations on configured home: ${homeBlocking.map((item) => item.id).join(', ')}`);
await page.screenshot({ path: '/tmp/dinner-binder-mobile.png', fullPage: true });
await page.emulateMedia({ media: 'print' });
if (!await page.locator('#print-packet').isVisible()) throw new Error('Packet disappeared in print media');
if (await page.locator('.site-header').isVisible()) throw new Error('App chrome remains visible in print media');
await page.emulateMedia({ media: 'screen' });

const privacyViolations = await assertA11y('/privacy');
const termsViolations = await assertA11y('/terms');
await page.goto(base, { waitUntil: 'networkidle' });
await page.evaluate(() => navigator.serviceWorker.ready);
await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
await page.reload({ waitUntil: 'networkidle' });
await context.setOffline(true);
await page.reload({ waitUntil: 'domcontentloaded' });
if (!await page.getByRole('heading', { level: 1 }).isVisible()) throw new Error(`App shell did not load offline (${page.url()} · ${(await page.locator('body').innerText()).slice(0, 120)})`);
if (!await page.getByText('Offline now — edits are safe').isVisible()) throw new Error('Offline state was not announced');
await context.setOffline(false);
if (consoleErrors.length) throw new Error(`Console errors: ${consoleErrors.join(' | ')}`);

await browser.close();
console.log(JSON.stringify({
  passed: true,
  sampleRecipes: 3,
  packetSheets: 4,
  mobileWidth: 390,
  offlineReload: true,
  printMedia: true,
  seriousOrCriticalAxeViolations: 0,
  otherAxeFindings: homeAxe.violations.map((item) => `${item.impact}:${item.id}`),
  legalOtherAxeFindingCount: privacyViolations + termsViolations,
  screenshot: '/tmp/dinner-binder-mobile.png'
}, null, 2));
