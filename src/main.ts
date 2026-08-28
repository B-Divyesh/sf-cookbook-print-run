import './style.css';
import { parseRecipeText, scaleIngredient, validateRecipe } from './parser';
import { buildTimeline, formatClock } from './schedule';
import { PRICE, captureReturnedLicense, checkoutUrl, clearLicense, getCachedLicenseState, storeLicense, verifyLicense } from './license';
import { makeSamples } from './samples';
import type { Recipe, StoredState } from './types';

const STORAGE_KEY = 'dinner-binder:packet:v1';
const FREE_LIMIT = 3;
const app = document.querySelector<HTMLDivElement>('#app')!;
if (!app) throw new Error('App mount was not found');

function renderLegalPage(kind: 'privacy' | 'terms'): void {
  const privacy = kind === 'privacy';
  document.title = `${privacy ? 'Privacy' : 'Terms'} — Dinner Binder`;
  app.innerHTML = `
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="site-header"><a class="brand" href="/" aria-label="Dinner Binder home"><span aria-hidden="true" class="brand-mark"></span>Dinner Binder</a></header>
    <main id="main" class="legal-page">
      <p class="eyebrow">The plain-language version</p>
      <h1>${privacy ? 'Your recipes stay yours.' : 'Fair terms for a small tool.'}</h1>
      ${privacy ? `
        <p>Dinner Binder reads recipe files only after you choose them. Recipe content, packet settings, and any license token are stored in your browser’s local storage. We do not upload or sell recipe content and we do not use advertising trackers.</p>
        <h2>Billing</h2><p>If you buy Binder Plus, checkout and license verification are handled by Sociobot and its merchant-of-record partner, Dodo. Dinner Binder receives a license verdict, not your card details. Their systems may process the email and billing details needed for the purchase.</p>
        <h2>Removing local data</h2><p>Use “Clear all” in the app or clear this site’s browser storage. Removing local data cannot cancel or refund a completed purchase.</p>
        <h2>Network requests</h2><p>The app works offline after its first load. It contacts the Sociobot billing API only to buy or verify a license. No analytics are included.</p>
      ` : `
        <p>You may use Dinner Binder to format recipes you own or have permission to use. You remain responsible for recipe rights, attribution, ingredients, timing, food handling, and the accuracy of allergy or dietary notes.</p>
        <h2>Binder Plus</h2><p>Binder Plus is a ${PRICE} one-time purchase that unlocks unlimited recipes per packet for this product. Sociobot/Dodo is the merchant of record and handles payment and refunds. A refunded or revoked purchase deactivates its license.</p>
        <h2>No safety guarantee</h2><p>Dinner Binder does not infer allergens, test recipes, or provide medical, dietary, or food-safety advice. Confirm ingredient labels and cooking requirements yourself.</p>
        <h2>Warranty</h2><p>The software is provided “as is,” without warranty, to the extent allowed by law. Keep your source recipe files; browser storage can be cleared by you, your browser, or your device.</p>
      `}
      <p><a href="/">Back to Dinner Binder</a></p>
    </main>
    <footer class="site-footer"><span>Made for paper-first kitchens.</span><nav aria-label="Legal"><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav></footer>`;
}

const path = location.pathname.replace(/\/$/, '') || '/';
if (path === '/privacy' || path === '/terms') {
  renderLegalPage(path.slice(1) as 'privacy' | 'terms');
} else {
  startApp();
}

function startApp(): void {
  captureReturnedLicense();
  let state = loadState();
  let license = getCachedLicenseState();
  let removed: { recipe: Recipe; index: number } | null = null;
  let undoTimer = 0;

  app.innerHTML = `
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="site-header">
      <a class="brand" href="/" aria-label="Dinner Binder home"><span aria-hidden="true" class="brand-mark"></span>Dinner Binder</a>
      <div class="header-status"><span id="connection-status" class="connection-status"><span aria-hidden="true"></span>Works offline</span><a href="#plus">Binder Plus</a></div>
    </header>
    <main id="main">
      <section class="intro" aria-labelledby="page-title">
        <div class="intro-copy">
          <p class="eyebrow">Your recipes. One calm cooking run.</p>
          <h1 id="page-title">From recipe files<br>to <em>dinner on paper.</em></h1>
          <p class="lede">Gather the recipes you already own, line up the timing, and print a clean kitchen packet—no ads, accounts, or open tabs.</p>
        </div>
        <div class="intro-geometry" aria-hidden="true"><span></span><span></span><span></span><b>01</b></div>
      </section>

      <ol class="step-rail" aria-label="Packet progress">
        <li id="progress-add" class="active"><span>1</span>Add recipes</li>
        <li id="progress-set"><span>2</span>Set the run</li>
        <li id="progress-print"><span>3</span>Print packet</li>
      </ol>

      <section class="work-section import-section" aria-labelledby="add-heading">
        <div class="section-heading"><div><p class="step-label">Step 01</p><h2 id="add-heading">Add your recipe files</h2></div><p>Markdown or JSON · up to 2 MB each</p></div>
        <div id="drop-zone" class="drop-zone">
          <div>
            <svg aria-hidden="true" viewBox="0 0 48 48"><path d="M24 34V10m0 0-8 8m8-8 8 8M9 29v9h30v-9"/></svg>
            <p><strong>Drop recipe files here</strong><br><span>or choose files from your device</span></p>
          </div>
          <label class="button primary" for="recipe-files">Choose files</label>
          <input class="visually-hidden" id="recipe-files" type="file" accept=".md,.markdown,.json,application/json,text/markdown" multiple>
        </div>
        <div class="import-actions"><button id="load-samples" class="button quiet" type="button">Try 3 sample recipes</button><button id="clear-all" class="text-button danger-link" type="button">Clear all recipes</button><span>Nothing is uploaded. Files stay in this browser.</span></div>
        <div id="messages" class="messages" role="status" aria-live="polite"></div>
      </section>

      <section class="work-section" aria-labelledby="run-heading">
        <div class="section-heading"><div><p class="step-label">Step 02</p><h2 id="run-heading">Set the cooking run</h2></div><p id="selection-count">0 selected</p></div>
        <div id="recipe-list" class="recipe-list"></div>
      </section>

      <section class="work-section packet-builder" aria-labelledby="packet-heading">
        <div class="section-heading"><div><p class="step-label">Step 03</p><h2 id="packet-heading">Check and print</h2></div><p>Each recipe starts on a new sheet</p></div>
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

      <section id="plus" class="plus-section" aria-labelledby="plus-heading">
        <div class="plus-geometry" aria-hidden="true"><span></span><span></span><span></span></div>
        <div><p class="step-label">A one-time kitchen upgrade</p><h2 id="plus-heading">Build bigger binders.</h2><p>The free version prints up to three recipes per packet. Binder Plus removes that limit for <strong>${PRICE} once</strong>—no subscription, account, or cloud recipe storage.</p></div>
        <div class="license-box">
          <div id="license-status" class="license-status" aria-live="polite"></div>
          <a class="button primary" href="${checkoutUrl}">Buy Binder Plus — ${PRICE}</a>
          <details><summary>Have a license? Restore it</summary>
            <form id="license-form"><label for="license-token">License token</label><input id="license-token" autocomplete="off" spellcheck="false" required><button class="button quiet" type="submit">Verify license</button></form>
          </details>
        </div>
      </section>

      <section class="safety-note" aria-labelledby="safety-heading"><span aria-hidden="true">!</span><div><h2 id="safety-heading">Allergy notes are yours to verify</h2><p>Dinner Binder preserves notes you supply; it does not detect allergens or provide dietary or food-safety advice. Always check original recipes and ingredient labels.</p></div></section>
    </main>
    <div id="undo" class="undo" role="status" aria-live="polite"></div>
    <footer class="site-footer"><span>Private by default · Works offline · Generated illustration</span><nav aria-label="Legal"><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav></footer>`;

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
  getElement('load-samples').addEventListener('click', () => {
    const titles = new Set(state.recipes.map((recipe) => recipe.title));
    const additions = makeSamples().filter((recipe) => !titles.has(recipe.title));
    state.recipes.push(...additions);
    enforceFreeSelections();
    announce(additions.length ? `Added ${additions.length} sample recipes.` : 'The sample recipes are already here.');
    persistAndRender();
  });
  getElement('clear-all').addEventListener('click', () => {
    if (!state.recipes.length) return;
    if (!window.confirm(`Remove all ${state.recipes.length} recipes from this browser? Keep your source files or download a backup first.`)) return;
    state.recipes = [];
    announce('All recipes were removed from this browser.');
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
  getElement<HTMLFormElement>('license-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const token = getElement<HTMLInputElement>('license-token').value.trim();
    if (!token) return;
    storeLicense(token);
    updateLicenseStatus('Checking this license…');
    license = await verifyLicense(true);
    renderAll();
  });
  window.addEventListener('online', updateConnection);
  window.addEventListener('offline', updateConnection);

  updateConnection();
  renderAll();
  void verifyLicense().then((next) => { license = next; renderAll(); });

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
    renderLicense();
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
      empty.innerHTML = `<picture><source srcset="/assets/dinner-packet-hero-480.avif 480w, /assets/dinner-packet-hero.avif 960w" sizes="(max-width: 560px) 358px, (max-width: 820px) 75vw, 50vw" type="image/avif"><img src="/assets/dinner-packet-hero.webp" srcset="/assets/dinner-packet-hero-480.webp 480w, /assets/dinner-packet-hero.webp 960w" sizes="(max-width: 560px) 358px, (max-width: 820px) 75vw, 50vw" width="960" height="640" decoding="async" alt="Geometric paper recipe sheets arranged with ingredient markers and a kitchen timer"></picture><div><p class="step-label">Your workbench is clear</p><h3>Add a recipe to begin</h3><p>Use your own Markdown or JSON export, or load the three samples to see a complete packet in seconds.</p></div>`;
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
        announce(`The free packet fits ${FREE_LIMIT} recipes. Remove one or unlock Binder Plus for larger runs.`, true);
        getElement('plus').scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
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
        const link = document.createElement('a'); link.href = recipe.sourceUrl; link.target = '_blank'; link.rel = 'noreferrer'; link.textContent = recipe.attribution || recipe.source || recipe.sourceUrl; credit.append(link);
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
    const kicker = document.createElement('p'); kicker.className = 'print-kicker'; kicker.textContent = 'Dinner Binder · cooking run';
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
      text.innerHTML = expired ? '<strong>License no longer active.</strong><br>You can still make three-recipe packets.' : license.reason === 'offline' ? '<strong>Could not check the license offline.</strong><br>Your free packet still works.' : '<strong>Free packet</strong><br>Up to three recipes per print run.';
      box.append(text);
    }
  }

  function updateLicenseStatus(message: string): void { getElement('license-status').textContent = message; }

  function persistAndRender(): void { saveState(state); renderAll(); }
  function persistAndRenderPreview(): void { saveState(state); renderPreview(); }
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

function loadState(): StoredState {
  const fallback: StoredState = { recipes: [], packetTitle: 'Dinner this week', serveAt: '18:30' };
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as StoredState | null;
    if (!parsed || !Array.isArray(parsed.recipes)) return fallback;
    return { recipes: parsed.recipes, packetTitle: parsed.packetTitle || fallback.packetTitle, serveAt: /^\d{2}:\d{2}$/.test(parsed.serveAt) ? parsed.serveAt : fallback.serveAt };
  } catch { return fallback; }
}

function saveState(state: StoredState): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
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
