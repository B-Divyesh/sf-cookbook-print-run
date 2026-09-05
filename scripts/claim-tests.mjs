import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const dist = resolve('dist');
const root = `${dist}${sep}`;
const mime = { '.avif': 'image/avif', '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.webp': 'image/webp', '.xml': 'application/xml' };

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname;
  if (pathname === '/staticwebapp.config.json') return void response.writeHead(404).end('Not found');
  const clean = normalize(pathname.replace(/^\/+/, ''));
  let file = resolve(join(dist, clean));
  let statusCode = 200;
  if (file !== dist && !file.startsWith(root)) return void response.writeHead(404).end('Not found');
  try { if ((await stat(file)).isDirectory()) throw new Error('fallback'); }
  catch { file = join(dist, 'index.html'); if (!['/', '/demo', '/privacy', '/terms'].includes(pathname)) statusCode = 404; }
  try {
    const body = await readFile(file);
    response.writeHead(statusCode, { 'Cache-Control': file.endsWith('sw.js') ? 'no-cache' : 'no-store', 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
    response.end(body);
  } catch { response.writeHead(404).end('Not found'); }
});
await new Promise((resolveListen, rejectListen) => { server.once('error', rejectListen); server.listen(0, '127.0.0.1', resolveListen); });
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Claim server did not start');
const base = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ headless: true });

async function demoPage({ seedReal = false } = {}) {
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  if (seedReal) {
    await page.goto(base);
    await page.evaluate(() => localStorage.setItem('dinner-binder:packet:v1', '{"sentinel":"My real stew"}'));
  }
  await page.goto(`${base}/demo`, { waitUntil: 'networkidle' });
  return { context, page };
}

function assert(condition, message) { if (!condition) throw new Error(message); }

const tests = [
  { name: '@claim:offline-reload', run: async () => {
    const { context, page } = await demoPage();
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByLabel('Packet name').fill('Offline supper');
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { level: 1 }).waitFor();
    assert(await page.getByLabel('Packet name').inputValue() === 'Offline supper', 'Offline reload lost demo edits');
    assert(await page.getByText('Offline now — edits are safe').isVisible(), 'Offline state was not shown');
    await context.close();
  } },
  { name: '@claim:demo-isolation-local', run: async () => {
    const { context, page } = await demoPage({ seedReal: true });
    const requests = [];
    page.on('request', request => requests.push(request.url()));
    await page.getByLabel('Packet name').fill('Changed demo');
    await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
    const real = await page.evaluate(() => localStorage.getItem('dinner-binder:packet:v1'));
    assert(real === '{"sentinel":"My real stew"}', 'Demo changed the real storage key');
    const keys = await page.evaluate(() => Object.keys(localStorage));
    assert(keys.includes('demo:dinner-binder:packet:v1'), 'Demo namespace was not used');
    assert(requests.every(url => new URL(url).origin === new URL(base).origin), 'Demo made an external request');
    await page.goto(`${base}/?demo=1`, { waitUntil: 'networkidle' });
    assert(await page.getByText('Demo — sample data, nothing is saved').isVisible(), '?demo=1 did not enter demo mode');
    assert(await page.locator('.recipe-row').count() === 3, '?demo=1 did not restore the reset sample');
    await page.getByRole('link', { name: 'Start for real' }).click();
    assert(await page.evaluate(() => localStorage.getItem('demo:dinner-binder:packet:v1')) === null, 'Leaving demo did not discard demo data');
    assert(await page.evaluate(() => localStorage.getItem('dinner-binder:packet:v1')) === '{"sentinel":"My real stew"}', 'Leaving demo changed real data');
    await context.close();
  } },
  { name: '@claim:demo-reset', run: async () => {
    const { context, page } = await demoPage({ seedReal: true });
    await page.getByLabel('Packet name').fill('Changed demo title');
    await page.getByLabel('Serve everything at').fill('20:00');
    await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
    assert(await page.getByLabel('Packet name').inputValue() === 'Sample supper', 'Reset did not restore the visible packet name');
    assert(await page.getByLabel('Serve everything at').inputValue() === '18:30', 'Reset did not restore the visible serving time');
    assert(await page.locator('.recipe-row').count() === 3 && await page.locator('.print-sheet').count() === 4, 'Reset did not restore the complete sample packet');
    assert(await page.locator('.cover-sheet h2').textContent() === 'Sample supper', 'Reset packet name did not match the print preview');
    assert(await page.locator('.cover-sheet').getByText('3 recipes · Serve at 6:30 pm').isVisible(), 'Reset serving time did not match the print preview');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('demo:dinner-binder:packet:v1') || '{}'));
    assert(saved.packetTitle === 'Sample supper' && saved.serveAt === '18:30', 'Reset did not save the original packet settings');
    assert(await page.evaluate(() => localStorage.getItem('dinner-binder:packet:v1')) === '{"sentinel":"My real stew"}', 'Reset demo changed real recipe data');
    await context.close();
  } },
  { name: '@claim:no-accounts-trackers-cdn', run: async () => {
    const context = await browser.newContext(); const page = await context.newPage();
    const external = [];
    page.on('request', request => { if (new URL(request.url()).origin !== new URL(base).origin) external.push(request.url()); });
    await page.goto(`${base}/demo`, { waitUntil: 'networkidle' });
    assert(external.length === 0, `External requests found: ${external.join(', ')}`);
    assert(await page.locator('input[type="email"], input[type="password"]').count() === 0, 'Demo contains account fields');
    assert((await context.cookies()).length === 0, 'Demo created cookies');
    await context.close();
  } },
  { name: '@claim:input-formats-size', run: async () => {
    const { context, page } = await demoPage();
    const input = page.locator('#recipe-files');
    await input.setInputFiles({ name: 'beans.md', mimeType: 'text/markdown', buffer: Buffer.from('# Braised beans\n## Ingredients\n- 2 cans beans\n## Method\n1. Simmer.') });
    await page.getByText('Braised beans', { exact: true }).waitFor();
    await input.setInputFiles({ name: 'soup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ '@type': 'Recipe', name: 'Tomato soup', recipeYield: '4', recipeIngredient: ['4 tomatoes'], recipeInstructions: ['Blend.'] })) });
    await page.getByText('Tomato soup', { exact: true }).waitFor();
    await input.setInputFiles({ name: 'too-big.md', mimeType: 'text/markdown', buffer: Buffer.alloc(2_000_001, 65) });
    await page.getByText('too-big.md is over the 2 MB limit.').waitFor();
    await context.close();
  } },
  { name: '@claim:sample-packet', run: async () => {
    const { context, page } = await demoPage();
    assert(await page.locator('.recipe-row').count() === 3, 'Demo did not seed three recipes');
    assert(await page.locator('.print-sheet').count() === 4, 'Demo did not show four sheets');
    for (const title of ['Lemony sheet-pan chickpeas', 'Herby couscous', 'Cucumber mint salad']) assert(await page.getByText(title, { exact: true }).first().isVisible(), `${title} missing`);
    await context.close();
  } },
  { name: '@claim:edit-preview', run: async () => {
    const { context, page } = await demoPage();
    await page.locator('.recipe-row').first().getByLabel('Serves').fill('8');
    await page.locator('.recipe-row').first().getByLabel('Serves').blur();
    assert(await page.locator('.recipe-sheet').first().getByText('4 cans chickpeas, drained').isVisible(), 'Serving scale did not update print preview');
    await page.locator('.recipe-row').nth(1).getByRole('button', { name: /Move .* earlier/ }).click();
    assert(await page.locator('.recipe-sheet h2').first().textContent() === 'Herby couscous', 'Recipe order did not update print preview');
    await page.locator('.recipe-row').first().getByLabel('Prep min').fill('21');
    await page.locator('.recipe-row').first().getByLabel('Prep min').blur();
    assert(await page.locator('.recipe-sheet').first().getByText('21 min prep').isVisible(), 'Prep time edit did not update preview');
    await context.close();
  } },
  { name: '@claim:shared-timeline', run: async () => {
    const { context, page } = await demoPage();
    await page.getByLabel('Serve everything at').fill('19:00');
    assert(await page.locator('.timeline').getByText('7:00 pm').first().isVisible(), 'Serving time missing from timeline');
    assert(await page.locator('.timeline li').count() === 8, 'Timeline does not include every sample recipe');
    assert(await page.locator('.timeline').getByText(/Lemony sheet-pan chickpeas/).count() >= 2, 'Timed chickpea steps missing');
    await context.close();
  } },
  { name: '@claim:one-recipe-per-sheet', run: async () => {
    const { context, page } = await demoPage();
    await page.emulateMedia({ media: 'print' });
    assert(await page.locator('.print-sheet').count() === 4, 'Print output should have one cover and three recipe sheets');
    const breaks = await page.locator('.print-sheet').evaluateAll(nodes => nodes.slice(0, -1).map(node => getComputedStyle(node).breakAfter));
    assert(breaks.every(value => value === 'page'), `Missing forced page breaks: ${breaks.join(', ')}`);
    await context.close();
  } },
  { name: '@claim:attribution-allergy', run: async () => {
    const { context, page } = await demoPage();
    const couscous = page.locator('.recipe-row').filter({ hasText: 'Herby couscous' });
    assert(await couscous.getByText('Credit: Original CC0 sample recipe').isVisible(), 'Credit was not preserved in editor');
    assert(await page.locator('.recipe-sheet').filter({ hasText: 'Herby couscous' }).getByText(/Couscous contains wheat/).isVisible(), 'Allergy note was not preserved in print view');
    await context.close();
  } },
  { name: '@claim:json-backup', run: async () => {
    const { context, page } = await demoPage();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download backup' }).click();
    const download = await downloadPromise;
    const body = JSON.parse(await readFile(await download.path(), 'utf8'));
    assert(body.format === 'dinner-binder-v1' && body.recipes.length === 3, 'Backup omitted packet or recipes');
    assert(body.packetTitle === 'Sample supper' && body.serveAt === '18:30', 'Backup omitted packet settings');
    await context.close();
  } },
  { name: '@claim:free-limit', run: async () => {
    const { context, page } = await demoPage();
    await page.locator('#recipe-files').setInputFiles({ name: 'fourth.md', mimeType: 'text/markdown', buffer: Buffer.from('# Fourth recipe\n## Ingredients\n- 1 cup rice\n## Method\n1. Cook.') });
    assert(await page.locator('.recipe-row').count() === 4, 'Fourth recipe was not imported');
    assert(await page.locator('.recipe-row input[type="checkbox"]:checked').count() === 3, 'Free selection limit was not enforced');
    assert(await page.locator('.recipe-sheet').count() === 3, 'More than three recipe sheets were printable');
    await context.close();
  } },
  { name: '@claim:existing-license-verification', run: async () => {
    const context = await browser.newContext(); const page = await context.newPage();
    let verificationUrl = '';
    await page.route('https://api.sociobot.in/**', async route => {
      verificationUrl = route.request().url();
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"valid":true,"reason":"ok"}' });
    });
    await page.goto(`${base}/?license=test-license-token`, { waitUntil: 'networkidle' });
    await page.getByText('Binder Plus is active.').waitFor();
    assert(verificationUrl === 'https://api.sociobot.in/api/v1/products/cookbook-print-run/verify?license=test-license-token', `Wrong verification endpoint: ${verificationUrl}`);
    assert(await page.evaluate(() => localStorage.getItem('sb_license:cookbook-print-run')) === 'test-license-token', 'Returned license was not stored');
    assert(!page.url().includes('license='), 'License token remained in the address bar');
    await context.close();
  } },
  { name: '@claim:checkout-disabled', run: async () => {
    const context = await browser.newContext(); const page = await context.newPage(); await page.goto(base);
    assert(await page.locator('a[href*="/checkout"]').count() === 0, 'Disabled checkout link is still exposed');
    assert(await page.getByText('Purchases are not available now.').isVisible(), 'Checkout status is not visible');
    await context.close();
  } },
  { name: '@claim:service-worker-lifecycle', run: async () => {
    const context = await browser.newContext(); const page = await context.newPage(); await page.goto(base);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    const result = await page.evaluate(async () => {
      const legacy = await caches.open('dinner-binder-v1');
      await legacy.put('/', new Response('old'));
      const registration = await navigator.serviceWorker.register('/sw.js?claim-update=1');
      await new Promise((resolve, reject) => {
        const worker = registration.installing || registration.waiting;
        if (!worker || registration.active?.scriptURL.includes('claim-update=1')) return resolve(undefined);
        const timeout = setTimeout(() => reject(new Error('Worker update timed out')), 5000);
        worker.addEventListener('statechange', () => { if (worker.state === 'activated') { clearTimeout(timeout); resolve(undefined); } });
      });
      const keys = await caches.keys();
      const current = keys.find(key => key.startsWith('dinner-binder-release-'));
      const cache = current ? await caches.open(current) : null;
      return { keys, current, deploymentControlCached: Boolean(await cache?.match('/staticwebapp.config.json')) };
    });
    assert(Boolean(result.current), 'Versioned service-worker cache is missing');
    assert(!result.keys.includes('dinner-binder-v1'), 'Legacy cache was not removed during activation');
    assert(!result.deploymentControlCached, 'Azure configuration was cached as runtime content');
    const config = JSON.parse(await readFile('public/staticwebapp.config.json', 'utf8'));
    assert(config.responseOverrides?.['404']?.statusCode === 404, 'Azure configuration does not preserve HTTP 404');
    assert(['X-Content-Type-Options', 'Referrer-Policy', 'Content-Security-Policy'].every(header => config.globalHeaders?.[header]), 'Required security headers are missing');
    await context.close();
  } },
  { name: '@claim:documented-routes', run: async () => {
    const context = await browser.newContext(); const page = await context.newPage();
    for (const [path, title, heading] of [['/privacy', 'Privacy — Dinner Binder', 'Your recipes stay in your browser.'], ['/terms', 'Terms — Dinner Binder', 'Use recipes you have permission to use.']]) {
      await page.goto(`${base}${path}`);
      assert(await page.title() === title, `${path} title is wrong`);
      assert(await page.getByRole('heading', { level: 1 }).textContent() === heading, `${path} h1 is wrong`);
      assert(await page.locator('link[rel="canonical"]').getAttribute('href') === `https://cookbook-print-run.sociobot.in${path}`, `${path} canonical is wrong`);
    }
    await page.goto(base);
    await page.getByRole('link', { name: 'Privacy' }).first().click();
    assert(await page.locator('h1').evaluate(node => document.activeElement === node), 'Route change did not focus h1');
    await page.goBack();
    await page.waitForFunction(() => document.title === 'Dinner Binder — print a timed cooking packet');
    const missingResponse = await page.goto(`${base}/definitely-missing`);
    assert(missingResponse?.status() === 404, 'Unknown route did not return HTTP 404');
    assert(await page.title() === 'Page not found — Dinner Binder', 'Unknown route did not get 404 title');
    assert(await page.getByRole('link', { name: 'Return to Dinner Binder' }).isVisible(), '404 has no route home');
    await context.close();
  } },
  { name: '@claim:build-output', run: async () => {
    assert((await stat(join(dist, 'index.html'))).isFile(), 'dist/index.html is missing');
    assert((await stat(join(dist, 'sw.js'))).isFile(), 'dist/sw.js is missing');
  } },
  { name: '@claim:project-records-license', run: async () => {
    for (const file of ['.factory/brief.json', '.factory/design.md', '.factory/handoff.md', 'LICENSE']) assert((await stat(resolve(file))).isFile(), `${file} is missing`);
    assert((await readFile('LICENSE', 'utf8')).includes('MIT License'), 'LICENSE is not MIT');
  } },
  { name: '@claim:safety-boundary', run: async () => {
    const { context, page } = await demoPage();
    assert(await page.getByText('Dinner Binder preserves notes you supply; it does not detect allergens or provide dietary or food-safety advice.').isVisible(), 'Safety boundary is not visible');
    const note = 'Contains sesame; verify the original label.';
    const field = page.locator('.recipe-row').first().getByLabel('Allergen note (optional)');
    await field.fill(note); await field.blur();
    const printedNote = await page.locator('.recipe-sheet').first().locator('.allergen-print').textContent();
    assert(printedNote?.endsWith(note), 'Supplied note was not copied verbatim');
    await context.close();
  } }
];

const grepIndex = process.argv.indexOf('--grep');
const filter = grepIndex >= 0 ? process.argv[grepIndex + 1] : '';
const selected = filter ? tests.filter(test => test.name.includes(filter)) : tests;
if (!selected.length) throw new Error(`No claim matched ${filter}`);

let failed = 0;
for (const test of selected) {
  try { await test.run(); console.log(`PASS ${test.name}`); }
  catch (error) { failed += 1; console.error(`FAIL ${test.name}\n${error instanceof Error ? error.stack : error}`); }
}

await browser.close();
await new Promise(resolveClose => server.close(resolveClose));
if (failed) process.exitCode = 1;
