import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';

const base = process.env.AUDIT_URL || 'http://127.0.0.1:5173';
const expectAzureDeploymentControl404 = process.env.EXPECT_AZURE_DEPLOYMENT_CONTROL_404 === 'true';
const testWorkerUpdate = process.env.TEST_SERVICE_WORKER_UPDATE === 'true';
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
if (expectAzureDeploymentControl404) {
  const deploymentControl = await page.request.get(`${base}/staticwebapp.config.json`);
  if (deploymentControl.status() !== 404) throw new Error(`Expected Azure-shaped 404 for staticwebapp.config.json, got ${deploymentControl.status()}`);
}
if (await page.locator('h1').count() !== 1) throw new Error('Expected exactly one h1');
if (await page.locator('main').count() !== 1) throw new Error('Expected one main landmark');
if (await page.locator('img:not([alt])').count()) throw new Error('Found image without alt text');

const samplesButton = page.getByRole('button', { name: 'Try 3 sample recipes' });
await samplesButton.focus();
await samplesButton.press('Enter');
await page.locator('.recipe-row').first().waitFor();
if (await page.locator('.recipe-row').count() !== 3) throw new Error('Sample workflow did not load three recipes');
if (await page.locator('.print-sheet').count() !== 4) throw new Error('Packet should contain cover plus three recipe sheets');

const firstServings = page.locator('.recipe-row').first().getByLabel('Serves');
await firstServings.fill('8');
await firstServings.blur();
if (!await page.locator('.recipe-sheet').first().getByText('4 cans chickpeas, drained').isVisible()) throw new Error('Serving scaling was not reflected in the packet');

async function expectNumberBoundary(label, min, max, previewText) {
  const input = page.locator('.recipe-row').first().getByLabel(label);
  await input.fill(String(min - 1));
  await input.blur();
  if (await input.inputValue() !== String(min)) throw new Error(`${label} did not visibly clamp its lower bound`);
  if (!await page.locator('#messages').getByText(`${label} must be between ${min} and ${max}. It was set to ${min}.`).isVisible()) throw new Error(`${label} lower-bound validation was not announced`);
  if (!await page.locator('.recipe-sheet').first().getByText(previewText(min)).isVisible()) throw new Error(`${label} lower bound did not match the print preview`);
  await input.fill(String(max + 1));
  await input.blur();
  if (await input.inputValue() !== String(max)) throw new Error(`${label} did not visibly clamp its upper bound`);
  if (!await page.locator('#messages').getByText(`${label} must be between ${min} and ${max}. It was set to ${max}.`).isVisible()) throw new Error(`${label} upper-bound validation was not announced`);
  if (!await page.locator('.recipe-sheet').first().getByText(previewText(max)).isVisible()) throw new Error(`${label} upper bound did not match the print preview`);
}

await expectNumberBoundary('Serves', 1, 99, (value) => `Serves ${value}`);
await expectNumberBoundary('Prep min', 0, 1440, (value) => value ? `${value} min prep` : 'Serves 99');
await expectNumberBoundary('Cook min', 0, 1440, (value) => value ? `${value} min cook` : 'Serves 99');

const thirdRecipeCheckbox = page.locator('.recipe-row').nth(2).getByRole('checkbox');
await thirdRecipeCheckbox.focus();
await thirdRecipeCheckbox.press('Space');
if (await thirdRecipeCheckbox.isChecked()) throw new Error('Space did not toggle the native recipe selection off');
await thirdRecipeCheckbox.press('Space');
if (!await thirdRecipeCheckbox.isChecked()) throw new Error('Space did not toggle the native recipe selection on');

const removeButton = page.locator('.recipe-row').first().getByRole('button', { name: /Remove / });
await removeButton.focus();
await removeButton.press('Enter');
const undoButton = page.getByRole('button', { name: 'Undo' });
await undoButton.waitFor();
if (!await undoButton.evaluate((element) => document.activeElement === element)) throw new Error('Remove did not move keyboard focus directly to Undo');
await undoButton.press('Enter');
if (await page.locator('.recipe-row').count() !== 3) throw new Error('Keyboard Undo did not restore the removed recipe');

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
const serviceWorkerRegression = await page.evaluate(async () => {
  const names = await caches.keys();
  const current = names.find((name) => name.startsWith('dinner-binder-release-'));
  if (!current) throw new Error(`No versioned Dinner Binder cache found: ${names.join(', ')}`);
  const currentCache = await caches.open(current);
  const deploymentControl = await currentCache.match(new Request(`${location.origin}/staticwebapp.config.json`));
  if (deploymentControl) throw new Error('Azure deployment control file was included in the service-worker shell');
  await currentCache.delete(new Request(`${location.origin}/`));
  const stale = await caches.open('dinner-binder-v1');
  await stale.put(new Request(`${location.origin}/`), new Response('<!doctype html><title>OLD DEPLOYMENT CACHE</title>'));
  return { current, names: await caches.keys() };
});
await page.reload({ waitUntil: 'networkidle' });
if (await page.getByText('OLD DEPLOYMENT CACHE').count()) throw new Error('A previous-release cache was served while online');
if (!await page.getByRole('heading', { level: 1 }).isVisible()) throw new Error('The current release was not served after ignoring a stale cache');
let serviceWorkerUpdate = false;
await context.setOffline(true);
await page.reload({ waitUntil: 'domcontentloaded' });
if (!await page.getByRole('heading', { level: 1 }).isVisible()) throw new Error(`App shell did not load offline (${page.url()} · ${(await page.locator('body').innerText()).slice(0, 120)})`);
if (!await page.getByText('Offline now — edits are safe').isVisible()) throw new Error('Offline state was not announced');
await context.setOffline(false);
if (testWorkerUpdate) {
  const updateResponse = await page.request.get(`${base}/__test__/activate-worker-update`);
  if (!updateResponse.ok()) throw new Error(`Could not activate test worker update: ${updateResponse.status()}`);
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) throw new Error('No registration available for update test');
    await registration.update();
  });
  await page.waitForFunction(() => caches.keys().then((names) => names.some((name) => name.endsWith('-update'))));
  const updateShell = await page.evaluate(async () => {
    const name = (await caches.keys()).find((key) => key.endsWith('-update'));
    if (!name) return false;
    const cache = await caches.open(name);
    return !(await cache.match(new Request(`${location.origin}/staticwebapp.config.json`)));
  });
  if (!updateShell) throw new Error('Updated worker cached an Azure deployment control file');
  await page.waitForTimeout(300);
  await page.getByRole('heading', { level: 1 }).waitFor({ state: 'visible' });
  serviceWorkerUpdate = true;
}
if (consoleErrors.length) throw new Error(`Console errors: ${consoleErrors.join(' | ')}`);

const staticWebAppConfig = JSON.parse(await readFile(new URL('../public/staticwebapp.config.json', import.meta.url), 'utf8'));
const assetRoute = staticWebAppConfig.routes?.find((route) => route.route === '/assets/*');
if (assetRoute?.headers?.['Cache-Control'] !== 'public, max-age=31536000, immutable') throw new Error('Hashed assets are not configured for immutable caching');
if (staticWebAppConfig.mimeTypes?.['.avif'] !== 'image/avif') throw new Error('AVIF MIME type is not configured for Azure Static Web Apps');

const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const desktop = await desktopContext.newPage();
await desktop.goto(base, { waitUntil: 'networkidle' });
if (await desktop.locator('h1').count() !== 1 || await desktop.locator('main').count() !== 1) throw new Error('Desktop semantic landmarks are incomplete');
const desktopAxe = await new AxeBuilder({ page: desktop }).analyze();
const desktopBlocking = desktopAxe.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact));
if (desktopBlocking.length) throw new Error(`Desktop accessibility violations: ${desktopBlocking.map((item) => item.id).join(', ')}`);
const desktopOverflow = await desktop.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
if (!desktopOverflow) throw new Error('The desktop layout has horizontal overflow');
await desktopContext.close();

await browser.close();
console.log(JSON.stringify({
  passed: true,
  sampleRecipes: 3,
  packetSheets: 4,
  mobileWidth: 390,
  offlineReload: true,
  staleReleaseCacheIgnored: true,
  azureDeploymentControl404: expectAzureDeploymentControl404,
  serviceWorkerUpdate,
  serviceWorkerCache: serviceWorkerRegression.current,
  desktopWidth: 1440,
  printMedia: true,
  seriousOrCriticalAxeViolations: 0,
  otherAxeFindings: homeAxe.violations.map((item) => `${item.impact}:${item.id}`),
  legalOtherAxeFindingCount: privacyViolations + termsViolations,
  screenshot: '/tmp/dinner-binder-mobile.png'
}, null, 2));
