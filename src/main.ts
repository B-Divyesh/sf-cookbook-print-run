import './style.css';
import { parseRecipeText, scaleIngredient, validateRecipe } from './parser';
import { buildTimeline, formatClock } from './schedule';
import { captureReturnedLicense, clearLicense, getCachedLicenseState, storeLicense, verifyLicense } from './license';
import { makeSamples } from './samples';
import type { Recipe, StoredState } from './types';

const STORAGE_KEY = 'dinner-binder:packet:v1';
const DEMO_STORAGE_KEY = 'demo:dinner-binder:packet:v1';
const FREE_LIMIT = 3;
const BUILD_ID = 'v1.1.0';
const ORIGIN = 'https://cookbook-print-run.sociobot.in';
const app = document.querySelector<HTMLDivElement>('#app')!;
if (!app) throw new Error('App mount was not found');

type Route = 'home' | 'demo' | 'privacy' | 'terms' | 'not-found';

function currentRoute(): Route {
  const path = location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/demo' || (path === '/' && new URL(location.href).searchParams.get('demo') === '1')) return 'demo';
  if (path === '/') return 'home';
  if (path === '/privacy' || path === '/terms') return path.slice(1) as Route;
  return 'not-found';
}

function commonHeader(): string {
  return `<a class="skip-link" href="#main">Skip to content</a>
    <header class="site-header">
      <a class="brand" href="/" aria-label="Dinner Binder home"><span aria-hidden="true" class="brand-mark"></span>Dinner Binder</a>
      <nav class="site-nav" aria-label="Main navigation"><span id="connection-status" class="connection-status"><span aria-hidden="true"></span>Works offline</span><a href="/demo">Demo</a><a href="/privacy">Privacy</a></nav>
    </header>`;
}

function commonFooter(): string {
  return `<footer class="site-footer"><p>Print timed cooking packets from recipe files.</p><nav aria-label="Legal"><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav><p>Built by Param Factory · ${BUILD_ID}</p></footer>`;
}

function setMetadata(route: Route): void {
  const routeMetadata: Record<Route, [string, string, string]> = {
    home: ['Dinner Binder — print a timed cooking packet', 'Turn owned recipe files into a timed cooking packet with one recipe per printed sheet.', '/'],
    demo: ['Demo — Dinner Binder', 'Try Dinner Binder with three isolated sample recipes and a ready-to-print timeline.', '/demo'],
    privacy: ['Privacy — Dinner Binder', 'Read how Dinner Binder keeps recipe files and cooking packet settings in this browser.', '/privacy'],
    terms: ['Terms — Dinner Binder', 'Read the terms for using Dinner Binder with recipes you own or may use.', '/terms'],
    'not-found': ['Page not found — Dinner Binder', 'This Dinner Binder page does not exist. Return home or open the sample cooking packet.', location.pathname]
  };
  const values = routeMetadata[route];
  const [title, description, canonicalPath] = values;
  document.title = title;
  document.querySelector<HTMLMetaElement>('meta[name="description"]')!.content = description;
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')!.href = `${ORIGIN}${canonicalPath}`;
  document.querySelector<HTMLMetaElement>('meta[property="og:title"]')!.content = title;
  document.querySelector<HTMLMetaElement>('meta[property="og:description"]')!.content = description;
  document.querySelector<HTMLMetaElement>('meta[property="og:url"]')!.content = `${ORIGIN}${canonicalPath}`;
  document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]')!.content = title;
  document.querySelector<HTMLMetaElement>('meta[name="twitter:description"]')!.content = description;
}

function renderLegalPage(kind: 'privacy' | 'terms'): void {
  const privacy = kind === 'privacy';
  app.innerHTML = `
    ${commonHeader()}
    <main id="main" class="legal-page">
      <p class="eyebrow">The plain-language version</p>
      <h1 tabindex="-1">${privacy ? 'Your recipes stay in your browser.' : 'Use recipes you have permission to use.'}</h1>
      ${privacy ? `
        <p>Dinner Binder reads recipe files only after you choose them. Recipe content and cooking packet settings use this browser’s local storage.</p>
        <p>Demo data uses a separate <code>demo:</code> storage key. The demo never reads or changes your saved recipe list.</p>
        <h2>License checks</h2><p>An existing Binder Plus license is checked with Sociobot. Dinner Binder sends the license token, not your recipes.</p>
        <h2>Remove local data</h2><p>Use “Clear all recipes” in the app. You can also clear this site’s browser storage.</p>
        <h2>Network requests</h2><p>The app has no analytics, advertising trackers, or third-party assets. After the first visit, the cooking packet works offline.</p>
      ` : `
        <p>Use Dinner Binder only with recipes you own or may use. Keep any credits supplied with the original recipe.</p>
        <p>You are responsible for ingredients, timing, food handling, and the accuracy of allergy notes.</p>
        <h2>Existing Binder Plus licenses</h2><p>Existing licenses still work. New purchases are unavailable until the approved checkout is enabled.</p>
        <h2>No safety guarantee</h2><p>Dinner Binder copies notes you provide. It does not detect allergens or provide dietary, medical, or food-safety advice.</p>
        <h2>Warranty</h2><p>The software is provided “as is,” without warranty, to the extent allowed by law. Keep your source recipe files.</p>
      `}
      <p><a href="/">Back to Dinner Binder</a></p>
    </main>
    <div id="route-announcer" class="visually-hidden" aria-live="polite"></div>
    ${commonFooter()}`;
}

function renderNotFound(): void {
  app.innerHTML = `${commonHeader()}
    <main id="main" class="not-found-page">
      <div class="not-found-number" aria-hidden="true">404</div>
      <p class="eyebrow">Error 404</p>
      <h1 tabindex="-1">Page not found</h1>
      <p>Check the address, or return to the recipe list.</p>
      <div class="not-found-actions"><a class="button primary" href="/">Return to Dinner Binder</a><a href="/demo">Open sample cooking packet</a></div>
    </main>
    <div id="route-announcer" class="visually-hidden" aria-live="polite"></div>
    ${commonFooter()}`;
}

function renderRoute(moveFocus = false): void {
  const route = currentRoute();
  setMetadata(route);
  if (route === 'privacy' || route === 'terms') renderLegalPage(route);
  else if (route === 'not-found') renderNotFound();
  else startApp(route === 'demo');
  updateConnection();
  if (moveFocus) {
    const heading = document.querySelector<HTMLElement>('h1');
    heading?.focus();
    const announcer = document.getElementById('route-announcer');
    requestAnimationFrame(() => { if (announcer && heading) announcer.textContent = heading.textContent || document.title; });
  }
}

document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href]');
  if (!anchor || anchor.target || anchor.download) return;
  const next = new URL(anchor.href, location.href);
  if (next.origin !== location.origin || (next.pathname === location.pathname && next.search === location.search && next.hash)) return;
  event.preventDefault();
  if (currentRoute() === 'demo' && next.pathname === '/' && !next.searchParams.has('demo')) localStorage.removeItem(DEMO_STORAGE_KEY);
  history.pushState({}, '', `${next.pathname}${next.search}${next.hash}`);
  renderRoute(true);
  scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
});
window.addEventListener('popstate', () => renderRoute(true));
window.addEventListener('online', updateConnection);
window.addEventListener('offline', updateConnection);
renderRoute();

function startApp(isDemo: boolean): void {
  if (!isDemo) captureReturnedLicense();
  const storageKey = isDemo ? DEMO_STORAGE_KEY : STORAGE_KEY;
  let state = loadState(storageKey, isDemo);
  let license = isDemo ? { token: '', unlocked: false, checked: false, reason: '' } : getCachedLicenseState();
  let removed: { recipe: Recipe; index: number } | null = null;
  let undoTimer = 0;

  app.innerHTML = `
    ${commonHeader()}
    ${isDemo ? `<aside class="demo-banner" aria-label="Demo mode"><strong>Demo — sample data, nothing is saved</strong><span>Changes stay separate from your recipe list.</span><div><button id="reset-demo" type="button">Reset demo</button><a href="/">Start for real</a></div></aside>` : ''}
    <main id="main">
      <section class="intro" aria-labelledby="page-title">
        <div class="intro-copy">
          <p class="eyebrow">${isDemo ? 'Three sample recipes are ready' : 'Recipe files in. Cooking packet out.'}</p>
          <h1 id="page-title" tabindex="-1">${isDemo ? 'Try a timed cooking packet.' : 'Print a timed packet from recipe files.'}</h1>
          <p class="lede">${isDemo ? 'Change servings, recipe order, or serving time. The print preview updates below.' : 'For households coordinating several recipes for a week, trip, or screen-free meal.'}</p>
          ${isDemo ? '<a class="button primary hero-action" href="#recipe-list">Explore the sample recipe list</a>' : '<div class="hero-action-row"><a class="button primary" href="/demo">Try it with sample data</a><span>Opens three recipes and a ready-to-print timeline.</span></div>'}
          <ul class="hero-facts" aria-label="Key facts"><li>Stays in this browser</li><li>Works offline after the first visit</li><li>Three recipes per free cooking packet</li></ul>
        </div>
        <div class="intro-geometry" aria-hidden="true"><span></span><span></span><span></span><b>01</b></div>
      </section>

      <section class="process" aria-labelledby="process-heading"><h2 id="process-heading" class="visually-hidden">How it works</h2><ol class="step-rail">
        <li id="progress-add" class="active"><span>1</span>Add recipes</li>
        <li id="progress-set"><span>2</span>Choose recipes and serving time</li>
        <li id="progress-print"><span>3</span>Print the cooking packet</li>
      </ol></section>

      <section class="work-section import-section" aria-labelledby="add-heading">
        <div class="section-heading"><div><p class="step-label">Step 01</p><h2 id="add-heading">Add your recipe files</h2></div><p>Markdown or JSON · up to 2 MB each</p></div>
        <div id="drop-zone" class="drop-zone">
          <div>
            <svg aria-hidden="true" viewBox="0 0 48 48"><path d="M24 34V10m0 0-8 8m8-8 8 8M9 29v9h30v-9"/></svg>
            <p><strong>Drop recipe files here</strong><br><span>or choose files from your device</span></p>
          </div>
          <label class="button primary" for="recipe-files">Add recipe files</label>
          <input class="visually-hidden" id="recipe-files" type="file" accept=".md,.markdown,.json,application/json,text/markdown" multiple>
        </div>
        <div class="import-actions">${isDemo ? '<button id="reset-demo-inline" class="button quiet" type="button">Reset demo recipes</button>' : '<a class="button quiet" href="/demo">Try it with sample data</a>'}<button id="clear-all" class="text-button danger-link" type="button">${isDemo ? 'Clear demo recipes' : 'Clear all recipes'}</button><span>Files stay in this browser.</span></div>
        <div id="messages" class="messages" role="status" aria-live="polite"></div>
      </section>

      <section class="work-section" aria-labelledby="run-heading">
        <div class="section-heading"><div><p class="step-label">Step 02</p><h2 id="run-heading">Choose recipes and serving time</h2></div><p id="selection-count">0 selected</p></div>
        <div id="recipe-list" class="recipe-list"></div>
      </section>

      <section class="work-section packet-builder" aria-labelledby="packet-heading">
        <div class="section-heading"><div><p class="step-label">Step 03</p><h2 id="packet-heading">Preview and print the cooking packet</h2></div><p>Each recipe starts on a new sheet</p></div>
        <div class="packet-controls">
          <label>Packet name<input id="packet-title" type="text" maxlength="80" value="${escapeAttribute(state.packetTitle)}"></label>
          <label>Serve everything at<input id="serve-at" type="time" value="${escapeAttribute(state.serveAt)}"></label>
          <div class="packet-actions">
            <button id="print-button" class="button primary" type="button">Print packet</button>
            <button id="download-button" class="button quiet" type="button">Download backup</button>
          </div>
        </div>
        <div id="packet-preview-shell" class="preview-shell">
          <div class="preview-label"><span>Print preview</span><span id="sheet-count">0 sheets</span></div>
          <div id="print-packet"></div>
        </div>
      </section>

      ${isDemo ? '' : `<section id="plus" class="plus-section" aria-labelledby="plus-heading">
        <div class="plus-geometry" aria-hidden="true"><span></span><span></span><span></span></div>
        <div><p class="step-label">Existing license support</p><h2 id="plus-heading">Print more than three recipes.</h2><p>The free version prints three recipes per cooking packet. New Binder Plus purchases are paused until checkout is enabled.</p></div>
        <div class="license-box">
          <div id="license-status" class="license-status" aria-live="polite"></div>
          <p class="checkout-paused" role="status">Purchases are not available now. There is no payment link to follow.</p>
          <details><summary>Restore Binder Plus license</summary>
            <form id="license-form"><label for="license-token">License token</label><input id="license-token" autocomplete="off" spellcheck="false" required><button class="button quiet" type="submit" aria-label="Verify Binder Plus license">Verify license</button></form>
          </details>
        </div>
      </section>`}

      <section class="safety-note" aria-labelledby="safety-heading"><span aria-hidden="true">!</span><div><h2 id="safety-heading">Allergy notes are yours to verify</h2><p>Dinner Binder preserves notes you supply; it does not detect allergens or provide dietary or food-safety advice. Always check original recipes and ingredient labels.</p></div></section>
    </main>
    <div id="undo" class="undo" role="status" aria-live="polite"></div>
    <div id="route-announcer" class="visually-hidden" aria-live="polite"></div>
    ${commonFooter()}`;

  const fileInput = getElement<HTMLInputElement>('recipe-files');
  const dropZone = getElement<HTMLDivElement>('drop-zone');
  fileInput.addEventListener('change', () => void importFiles(fileInput.files));
  dropZone.addEventListener('dragover', (event) => { event.preventDefault(); dropZone.classList.add('dragging'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragging'));
  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('dragging');
    void importFiles(event.dataTransfer?.files || null);
  });
  const resetDemo = (): void => {
    if (!isDemo) return;
    state = sampleState();
    saveState(state, storageKey);
    renderAll();
    syncPacketSettings();
    announce('The three sample recipes and packet settings were reset.');
  };
  document.getElementById('reset-demo')?.addEventListener('click', resetDemo);
  document.getElementById('reset-demo-inline')?.addEventListener('click', resetDemo);
  getElement('clear-all').addEventListener('click', () => {
    if (!state.recipes.length) return;
    if (!window.confirm(`Remove all ${state.recipes.length} ${isDemo ? 'demo ' : ''}recipes from this browser?${isDemo ? ' You can reset the demo.' : ' Keep your source files or download a backup first.'}`)) return;
    state.recipes = [];
    announce(isDemo ? 'All demo recipes were removed.' : 'All recipes were removed from this browser.');
    persistAndRender();
  });
  getElement<HTMLInputElement>('packet-title').addEventListener('input', (event) => {
    state.packetTitle = (event.currentTarget as HTMLInputElement).value;
    persistAndRenderPreview();
  });
  getElement<HTMLInputElement>('serve-at').addEventListener('input', (event) => {
    state.serveAt = (event.currentTarget as HTMLInputElement).value;
    persistAndRenderPreview();
  });
  getElement('print-button').addEventListener('click', () => {
    if (!selectedRecipes().length) return announce('Select at least one recipe before printing.', true);
    const originalTitle = document.title;
    document.title = state.packetTitle.trim() || 'Dinner Binder packet';
    window.addEventListener('afterprint', () => { document.title = originalTitle; }, { once: true });
    window.print();
  });
  getElement('download-button').addEventListener('click', downloadBackup);
  document.getElementById('license-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const token = getElement<HTMLInputElement>('license-token').value.trim();
    if (!token) return;
    storeLicense(token);
    updateLicenseStatus('Checking this license…');
    license = await verifyLicense(true);
    renderAll();
  });
  updateConnection();
  renderAll();
  if (!isDemo) void verifyLicense().then((next) => { license = next; renderAll(); });

  async function importFiles(files: FileList | null): Promise<void> {
    if (!files?.length) return;
    announce(`Reading ${files.length} file${files.length === 1 ? '' : 's'}…`);
    const additions: Recipe[] = [];
    const errors: string[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 2_000_000) { errors.push(`${file.name} is over the 2 MB limit.`); continue; }
      if (!/\.(md|markdown|json)$/i.test(file.name)) { errors.push(`${file.name} is not a Markdown or JSON file.`); continue; }
      try {
        const parsed = parseRecipeText(await file.text(), file.name);
        parsed.forEach((recipe) => {
          const issues = validateRecipe(recipe);
          if (issues.length) errors.push(`${recipe.title} is missing ${joinWords(issues)}. It was added so you can inspect it.`);
          additions.push(recipe);
        });
      } catch (error) {
        errors.push(error instanceof Error ? error.message : `${file.name} could not be read.`);
      }
    }
    state.recipes.push(...additions);
    enforceFreeSelections();
    fileInput.value = '';
    announce([
      additions.length ? `Added ${additions.length} recipe${additions.length === 1 ? '' : 's'}.` : '',
      ...errors
    ].filter(Boolean).join(' '), errors.length > 0);
    persistAndRender();
  }

  function renderAll(): void {
    enforceFreeSelections();
    renderRecipes();
    renderPreview();
    if (!isDemo) renderLicense();
    const selected = selectedRecipes().length;
    getElement('progress-add').classList.toggle('complete', state.recipes.length > 0);
    getElement('progress-set').classList.toggle('active', state.recipes.length > 0);
    getElement('progress-set').classList.toggle('complete', selected > 0);
    getElement('progress-print').classList.toggle('active', selected > 0);
  }

  function renderRecipes(): void {
    const list = getElement('recipe-list');
    list.replaceChildren();
    const selectedCount = selectedRecipes().length;
    getElement('selection-count').textContent = `${selectedCount} selected · ${license.unlocked ? 'no limit' : `${FREE_LIMIT} free`}`;
    if (!state.recipes.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `<picture><source srcset="/assets/dinner-packet-hero-480.avif 480w, /assets/dinner-packet-hero.avif 960w" sizes="(max-width: 560px) 358px, (max-width: 820px) 75vw, 50vw" type="image/avif"><img src="/assets/dinner-packet-hero.webp" srcset="/assets/dinner-packet-hero-480.webp 480w, /assets/dinner-packet-hero.webp 960w" sizes="(max-width: 560px) 358px, (max-width: 820px) 75vw, 50vw" width="960" height="640" decoding="async" alt="Geometric paper recipe sheets arranged with ingredient markers and a kitchen timer"></picture><div><p class="step-label">No recipes added yet</p><h3>Add a recipe file</h3><p>Add your own Markdown or JSON file, or open the sample cooking packet.</p><a href="/demo">Try it with sample data</a></div>`;
      list.append(empty);
      return;
    }
    state.recipes.forEach((recipe, index) => list.append(createRecipeRow(recipe, index)));
  }

  function createRecipeRow(recipe: Recipe, index: number): HTMLElement {
    const article = document.createElement('article');
    article.className = `recipe-row${recipe.selected ? ' selected' : ''}`;
    article.dataset.id = recipe.id;
    const top = document.createElement('div');
    top.className = 'recipe-top';
    const selectLabel = document.createElement('label');
    selectLabel.className = 'recipe-select';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox'; checkbox.checked = recipe.selected;
    const titleWrap = document.createElement('span');
    const title = document.createElement('strong'); title.textContent = recipe.title;
    const meta = document.createElement('small');
    meta.textContent = [recipe.author, recipe.source, `${recipe.ingredients.length} ingredients`].filter(Boolean).join(' · ');
    titleWrap.append(title, meta); selectLabel.append(checkbox, titleWrap);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked && !license.unlocked && selectedRecipes().length >= FREE_LIMIT) {
        checkbox.checked = false;
        announce(`The free cooking packet fits ${FREE_LIMIT} recipes. Remove one before selecting another.`, true);
        document.getElementById('plus')?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
        return;
      }
      recipe.selected = checkbox.checked;
      persistAndRender();
    });
    const rowActions = document.createElement('div'); rowActions.className = 'row-actions';
    rowActions.append(
      actionButton('↑', `Move ${recipe.title} earlier`, index === 0, () => moveRecipe(index, -1)),
      actionButton('↓', `Move ${recipe.title} later`, index === state.recipes.length - 1, () => moveRecipe(index, 1)),
      actionButton('Remove', `Remove ${recipe.title}`, false, () => removeRecipe(index), 'remove-button')
    );
    top.append(selectLabel, rowActions);

    const fields = document.createElement('div'); fields.className = 'recipe-fields';
    fields.append(
      numberField('Serves', recipe.servings, 1, 99, (value) => recipe.servings = value),
      numberField('Prep min', recipe.prepMinutes, 0, 1440, (value) => recipe.prepMinutes = value),
      numberField('Cook min', recipe.cookMinutes, 0, 1440, (value) => recipe.cookMinutes = value),
      textField('Allergen note (optional)', recipe.allergenNotes, (value) => recipe.allergenNotes = value)
    );
    article.append(top, fields);
    if (recipe.attribution || recipe.sourceUrl) {
      const credit = document.createElement('p'); credit.className = 'source-line'; credit.append('Credit: ');
      if (recipe.sourceUrl && safeUrl(recipe.sourceUrl)) {
        const link = document.createElement('a'); link.href = recipe.sourceUrl; link.target = '_blank'; link.rel = 'noreferrer'; link.textContent = recipe.attribution || recipe.source || recipe.sourceUrl; link.setAttribute('aria-label', `${link.textContent} (opens in a new tab)`); credit.append(link);
      } else credit.append(recipe.attribution || recipe.source);
      article.append(credit);
    }
    return article;
  }

  function renderPreview(): void {
    const packet = getElement('print-packet');
    packet.replaceChildren();
    const chosen = selectedRecipes();
    getElement('sheet-count').textContent = `${chosen.length ? chosen.length + 1 : 0} sheet${chosen.length === 0 ? 's' : chosen.length === 0 ? '' : 's'}`;
    getElement<HTMLButtonElement>('print-button').disabled = chosen.length === 0;
    getElement<HTMLButtonElement>('download-button').disabled = state.recipes.length === 0;
    if (!chosen.length) {
      const empty = document.createElement('div'); empty.className = 'packet-empty'; empty.innerHTML = '<span aria-hidden="true">□</span><p>Select a recipe above to assemble the packet.</p>'; packet.append(empty); return;
    }
    packet.append(createCover(chosen));
    chosen.forEach((recipe, index) => packet.append(createRecipeSheet(recipe, index + 1, chosen.length)));
  }

  function createCover(chosen: Recipe[]): HTMLElement {
    const sheet = document.createElement('section'); sheet.className = 'print-sheet cover-sheet';
    const kicker = document.createElement('p'); kicker.className = 'print-kicker'; kicker.textContent = 'Dinner Binder · cooking packet';
    const heading = document.createElement('h2'); heading.textContent = state.packetTitle.trim() || 'Our cooking packet';
    const sub = document.createElement('p'); sub.className = 'cover-subtitle'; sub.textContent = `${chosen.length} recipe${chosen.length === 1 ? '' : 's'} · Serve at ${formatClock(Number(state.serveAt.split(':')[0] || 18) * 60 + Number(state.serveAt.split(':')[1] || 0))}`;
    const timelineHeading = document.createElement('h3'); timelineHeading.textContent = 'Prep timeline';
    const timeline = document.createElement('ol'); timeline.className = 'timeline';
    buildTimeline(chosen, state.serveAt).forEach((event) => {
      const item = document.createElement('li'); item.className = `timeline-${event.kind}`;
      const time = document.createElement('time'); time.textContent = formatClock(event.minute);
      const detail = document.createElement('span'); const strong = document.createElement('strong'); strong.textContent = event.label; detail.append(strong, document.createTextNode(` · ${event.recipeTitle}`));
      item.append(time, detail); timeline.append(item);
    });
    const note = document.createElement('p'); note.className = 'print-footnote'; note.textContent = 'Timing is calculated from the prep and cook minutes supplied in your files or adjusted in Dinner Binder. Check the original recipes before cooking.';
    sheet.append(kicker, heading, sub, timelineHeading, timeline, note); return sheet;
  }

  function createRecipeSheet(recipe: Recipe, index: number, total: number): HTMLElement {
    const sheet = document.createElement('section'); sheet.className = 'print-sheet recipe-sheet';
    const head = document.createElement('header');
    const count = document.createElement('p'); count.className = 'print-kicker'; count.textContent = `Recipe ${index} of ${total}`;
    const title = document.createElement('h2'); title.textContent = recipe.title;
    const details = document.createElement('p'); details.className = 'recipe-summary'; details.textContent = [`Serves ${recipe.servings}`, recipe.prepMinutes ? `${recipe.prepMinutes} min prep` : '', recipe.cookMinutes ? `${recipe.cookMinutes} min cook` : ''].filter(Boolean).join(' · ');
    head.append(count, title, details);
    if (recipe.author || recipe.source || recipe.attribution) {
      const credit = document.createElement('p'); credit.className = 'print-credit'; credit.textContent = `By/source: ${[recipe.author, recipe.source, recipe.attribution].filter(Boolean).join(' · ')}`; head.append(credit);
    }
    const grid = document.createElement('div'); grid.className = 'recipe-print-grid';
    const ingredientsSection = document.createElement('section');
    const ingredientHeading = document.createElement('h3'); ingredientHeading.textContent = 'Ingredients';
    const ingredients = document.createElement('ul'); ingredients.className = 'ingredient-list';
    const factor = recipe.servings / Math.max(1, recipe.baseServings);
    recipe.ingredients.forEach((ingredient) => { const item = document.createElement('li'); const box = document.createElement('span'); box.className = 'check-box'; box.setAttribute('aria-hidden', 'true'); item.append(box, document.createTextNode(scaleIngredient(ingredient, factor))); ingredients.append(item); });
    if (!recipe.ingredients.length) { const item = document.createElement('li'); item.textContent = 'No ingredients were found in this file.'; ingredients.append(item); }
    ingredientsSection.append(ingredientHeading, ingredients);
    const methodSection = document.createElement('section');
    const methodHeading = document.createElement('h3'); methodHeading.textContent = 'Method';
    const instructions = document.createElement('ol'); instructions.className = 'instruction-list';
    recipe.instructions.forEach((instruction) => { const item = document.createElement('li'); item.textContent = instruction; instructions.append(item); });
    if (!recipe.instructions.length) { const item = document.createElement('li'); item.textContent = 'No instructions were found in this file.'; instructions.append(item); }
    methodSection.append(methodHeading, instructions); grid.append(ingredientsSection, methodSection);
    sheet.append(head, grid);
    if (recipe.allergenNotes) { const allergens = document.createElement('div'); allergens.className = 'allergen-print'; allergens.setAttribute('role', 'note'); const strong = document.createElement('strong'); strong.textContent = 'Allergen note supplied with this packet: '; allergens.append(strong, document.createTextNode(recipe.allergenNotes)); sheet.append(allergens); }
    if (recipe.sourceUrl && safeUrl(recipe.sourceUrl)) { const url = document.createElement('p'); url.className = 'print-url'; url.textContent = recipe.sourceUrl; sheet.append(url); }
    return sheet;
  }

  function renderLicense(): void {
    const box = getElement('license-status');
    box.replaceChildren();
    const text = document.createElement('p');
    if (license.unlocked) {
      text.innerHTML = '<strong>Binder Plus is active.</strong><br>Unlimited recipes are ready on this device.';
      const button = document.createElement('button'); button.className = 'text-button'; button.type = 'button'; button.textContent = 'Remove license from this device';
      button.addEventListener('click', () => { clearLicense(); license = getCachedLicenseState(); renderAll(); });
      box.append(text, button);
    } else {
      const expired = license.checked && license.reason && license.reason !== 'offline';
      text.innerHTML = expired ? '<strong>License no longer active.</strong><br>You can still print three-recipe cooking packets.' : license.reason === 'offline' ? '<strong>Could not check the license offline.</strong><br>Your free cooking packet still works.' : '<strong>Free cooking packet</strong><br>Print up to three recipes.';
      box.append(text);
    }
  }

  function updateLicenseStatus(message: string): void { getElement('license-status').textContent = message; }

  function persistAndRender(): void { saveState(state, storageKey); renderAll(); }
  function persistAndRenderPreview(): void { saveState(state, storageKey); renderPreview(); }
  function syncPacketSettings(): void {
    getElement<HTMLInputElement>('packet-title').value = state.packetTitle;
    getElement<HTMLInputElement>('serve-at').value = state.serveAt;
  }
  function selectedRecipes(): Recipe[] { return state.recipes.filter((recipe) => recipe.selected); }

  function enforceFreeSelections(): void {
    if (license.unlocked) return;
    let kept = 0;
    state.recipes.forEach((recipe) => {
      if (!recipe.selected) return;
      kept += 1;
      if (kept > FREE_LIMIT) recipe.selected = false;
    });
  }

  function moveRecipe(index: number, direction: number): void {
    const next = index + direction; if (next < 0 || next >= state.recipes.length) return;
    const [recipe] = state.recipes.splice(index, 1); if (recipe) state.recipes.splice(next, 0, recipe); persistAndRender();
  }

  function removeRecipe(index: number): void {
    const [recipe] = state.recipes.splice(index, 1); if (!recipe) return;
    removed = { recipe, index }; window.clearTimeout(undoTimer);
    const undo = getElement('undo'); undo.replaceChildren(document.createTextNode(`${recipe.title} removed. `));
    const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Undo';
    button.addEventListener('click', () => { if (!removed) return; state.recipes.splice(removed.index, 0, removed.recipe); removed = null; undo.replaceChildren(); persistAndRender(); });
    undo.append(button); undo.classList.add('show');
    undoTimer = window.setTimeout(() => { removed = null; undo.classList.remove('show'); undo.replaceChildren(); }, 7000);
    persistAndRender();
    requestAnimationFrame(() => button.focus());
  }

  function numberField(labelText: string, value: number, min: number, max: number, update: (value: number) => void): HTMLLabelElement {
    const label = document.createElement('label'); label.textContent = labelText;
    const input = document.createElement('input'); input.type = 'number'; input.min = String(min); input.max = String(max); input.value = String(value); input.inputMode = 'numeric';
    input.addEventListener('change', () => {
      const entered = Number(input.value);
      const clamped = Math.min(max, Math.max(min, Number.isFinite(entered) ? entered : min));
      update(clamped);
      input.value = String(clamped);
      if (entered !== clamped) announce(`${labelText} must be between ${min} and ${max}. It was set to ${clamped}.`, true);
      persistAndRenderPreview();
    });
    label.append(input); return label;
  }

  function textField(labelText: string, value: string, update: (value: string) => void): HTMLLabelElement {
    const label = document.createElement('label'); label.className = 'wide-field'; label.textContent = labelText;
    const input = document.createElement('input'); input.type = 'text'; input.value = value; input.maxLength = 300;
    input.addEventListener('change', () => { update(input.value.trim()); persistAndRenderPreview(); }); label.append(input); return label;
  }

  function actionButton(text: string, label: string, disabled: boolean, action: () => void, className = ''): HTMLButtonElement {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = text; button.setAttribute('aria-label', label); button.disabled = disabled; button.className = className; button.addEventListener('click', action); return button;
  }

  function downloadBackup(): void {
    const blob = new Blob([JSON.stringify({ format: 'dinner-binder-v1', ...state }, null, 2)], { type: 'application/json' });
    const anchor = document.createElement('a'); anchor.href = URL.createObjectURL(blob); anchor.download = `${slugify(state.packetTitle) || 'dinner-binder'}-backup.json`; anchor.click(); setTimeout(() => URL.revokeObjectURL(anchor.href), 1000); announce('Backup downloaded.');
  }
}

function sampleState(): StoredState {
  return { recipes: makeSamples(), packetTitle: 'Sample supper', serveAt: '18:30' };
}

function loadState(storageKey: string, isDemo = false): StoredState {
  const fallback: StoredState = { recipes: [], packetTitle: 'Dinner this week', serveAt: '18:30' };
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || 'null') as StoredState | null;
    if (!parsed || !Array.isArray(parsed.recipes)) {
      const initial = isDemo ? sampleState() : fallback;
      if (isDemo) saveState(initial, storageKey);
      return initial;
    }
    return { recipes: parsed.recipes, packetTitle: parsed.packetTitle || fallback.packetTitle, serveAt: /^\d{2}:\d{2}$/.test(parsed.serveAt) ? parsed.serveAt : fallback.serveAt };
  } catch { return isDemo ? sampleState() : fallback; }
}

function saveState(state: StoredState, storageKey: string): void {
  try { localStorage.setItem(storageKey, JSON.stringify(state)); }
  catch { announce('Browser storage is full. Download a backup before closing this tab.', true); }
}

function getElement<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id); if (!element) throw new Error(`Missing #${id}`); return element as T;
}

function announce(message: string, error = false): void {
  const target = document.getElementById('messages'); if (!target) return; target.textContent = message; target.classList.toggle('error', error);
}

function updateConnection(): void {
  const target = document.getElementById('connection-status'); if (!target) return;
  target.innerHTML = navigator.onLine ? '<span aria-hidden="true"></span>Works offline' : '<span aria-hidden="true"></span>Offline now — edits are safe';
  target.classList.toggle('offline', !navigator.onLine);
}

function joinWords(words: string[]): string { return words.length < 2 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`; }
function safeUrl(value: string): boolean { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol); } catch { return false; } }
function slugify(value: string): string { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function escapeAttribute(value: string): string { return value.replace(/[&"<>]/g, (character) => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' })[character] || character); }
function prefersReducedMotion(): boolean { return matchMedia('(prefers-reduced-motion: reduce)').matches; }

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    let reloadingForWorker = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloadingForWorker) return;
      reloadingForWorker = true;
      window.location.reload();
    });
    void navigator.serviceWorker.register('/sw.js');
  });
}
