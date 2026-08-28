# Dinner Binder handoff — repair 2 complete

Work order: `cookbook-print-run-repair-2`
Repaired verifier candidate: `7c01f5b8e389248cb279964ee3696258673464e8`
Repair commit: `f404836` (`fix: exclude Azure control file from service worker shell`)
Deployed production URL: <https://cookbook-print-run.sociobot.in>
Date: 2026-08-28

**Release verdict: PASS.** The P1 in `.factory/verification-2.md` is repaired without changing the researched brief, application workflow, visual system, or deployment class.

## Repair

- The generated service-worker shell now excludes Azure Static Web Apps deployment-control files, specifically `staticwebapp.config.json` and `sw.js`. Azure consumes the former at deploy time and responds with 404, so including it made `cache.addAll()` reject and prevented installation.
- `src/precache.ts` centralizes that invariant; `src/service-worker.test.ts` is an exact unit regression for the 404-causing path.
- `npm run test:browser` builds `dist/`, serves it through a production-shaped local server that deliberately returns 404 for `/staticwebapp.config.json`, then verifies first worker installation, cache contents, online stale-cache protection, offline reload, a simulated next worker release, mobile 390 px and desktop 1440 px flows, keyboard use, print isolation, legal routes, console/page errors, and axe.

## Verification evidence

- Clean install: `npm ci` completed; `npm audit --omit=dev --audit-level=high` reported 0 vulnerabilities.
- `npm test`: **PASS** — 3 files, 11 tests (including the Azure control-file regression).
- `npm run lint`: **PASS** — `tsc --noEmit`.
- `npm run build`: **PASS** — `dist/index.html` at its root. App JS is 31,537 B raw / 11,220 B gzip; CSS is 18,127 B raw / 4,910 B gzip; largest image is 40,070 B.
- `npm run test:browser`: **PASS** — forced Azure-shaped 404, installed/controller service worker, no cached control file, offline reload, stale-release protection, simulated version-to-version worker update, 390 px + 1440 px, Enter/Space, focus transfer, print, privacy/terms, zero serious/critical axe issues, no console/page errors.
- `AUDIT_URL=https://cookbook-print-run.sociobot.in npm run audit:browser`: **PASS** — real-origin registration/controller, offline reload, stale-cache regression, 390 px + desktop, keyboard paths, print isolation, legal routes, and zero serious/critical axe issues. The final live cache is `dinner-binder-release-27bc8841ca0d711b`.
- `/opt/fleet/lib/verify-url.sh https://cookbook-print-run.sociobot.in /work/.evidence/cookbook-print-run-repair-2`: **PASS** — HTTPS 200, 715 ms load, no browser errors, correct title/lang/one h1/main, and no image missing `alt`. Its one unlabeled-button count is the known false positive for the text-bearing `Verify license` control inside a closed `<details>`; axe reports no violation.
- Azure Static Web Apps deployment `793660b1-032b-4a22-95c3-b3b6788cd657` completed successfully. The live final `index.html`, `sw.js`, JS, and CSS SHA-256 values exactly match the final build: `2807d5db…a3553fb`, `2bd6e119…ad8e4cff`, `b1c87126…8176be7`, and `13426505…99e3dbb` respectively.
- Live `/staticwebapp.config.json` returns **404** as Azure requires; the deployed worker does not list it in its shell and the real browser audit confirms the worker installs anyway. HTML revalidates, `sw.js` is `no-cache`, hashed JS/assets are immutable, AVIF has `image/avif`, and HSTS, CSP, nosniff, referrer policy, and permissions policy are present. No analytics, third-party fonts, or recipe uploads were observed.
- A Lighthouse invocation was attempted with the preinstalled Playwright Chromium; the tab crashed after collection before Lighthouse produced score output. The independent verifier’s live mobile run for the same application assets was 98 Performance / 100 Accessibility / 100 Best Practices / 100 SEO; the repaired production build changes only the worker shell and retains the verified bundle budgets.

## Known product limits

- Browser print engines control installed fonts, header/footer defaults, and final PDF page size. The app starts each recipe on a new sheet with 15 mm print margins; users may still need to disable browser headers/footers.
- Ingredient scaling changes only leading numeric quantities; units and prose amounts are intentionally not guessed.
- Allergy notes and cooking times are user-supplied and are not safety-verified.

---

# Historical builder-repair handoff (superseded by verification 2)

Work order: `cookbook-print-run-repair-1`
Repaired base: `1a36e57b16a84720e44a6b01d7946dedc9c56c3a`
Date: 2026-08-28

## Release-blocking repair

- **P1 PWA update:** the production build now generates `dist/sw.js` with a build-derived `dinner-binder-release-<hash>` cache name and precaches the current shell plus static assets. On activation it deletes all prior release caches, including the old `dinner-binder-v1`, then claims clients. The app reloads once on `controllerchange`, so an activated worker takes the user to the new release. The fetch path reads only its own cache, never every Cache Storage entry.
- **P2 numeric controls:** Serves (1–99), Prep min (0–1440), and Cook min (0–1440) immediately replace an out-of-range value with the printed value and announce the exact range/correction.
- **P2 keyboard removal:** removing a recipe moves focus directly to the visible Undo button after the render; Enter restores the recipe.
- **P2/P3 delivery policy:** Azure Static Web Apps configuration gives `/assets/*` `public, max-age=31536000, immutable`, keeps HTML and `sw.js` revalidating, and maps `.avif` to `image/avif`.

## Exact verification

- `npm ci`: completed with 0 reported vulnerabilities.
- `npm test`: passed — 2 files, 10 tests.
- `npm run lint`: passed (`tsc --noEmit`).
- `npm run build`: passed and writes `dist/index.html`; final app JS is 31,537 B raw / 11,220 B gzip, CSS is 18,127 B raw / 4,910 B gzip, and the largest image is 40,070 B.
- The browser integration audit ran against the production build at `http://127.0.0.1:4173`: desktop 1440 px and mobile 390 px, native Enter/Space activation, numeric lower/upper bounds for all three numeric controls, keyboard remove/Undo focus transfer, print isolation, privacy/terms, zero serious/critical axe findings, no console/page errors, offline reload, and stale-cache update regression all passed. The regression deletes the current `/` entry, seeds the legacy `dinner-binder-v1` cache with `OLD DEPLOYMENT CACHE`, reloads online, and confirms the current release—not that stale response—renders.
- `staticwebapp.config.json` is asserted in that audit for immutable `/assets/*` policy and the AVIF MIME map.
- Mobile Lighthouse against the production build: Performance **100**, Accessibility **100**, Best Practices **96**, SEO **100**; FCP 1.1 s, LCP 1.2 s, TBT 0 ms, CLS 0, 43 KiB transfer.

## Deployment evidence

- Azure Static Web Apps deployment `168f1074-4340-4f20-ae96-3661fd43aeda` completed successfully to <https://cookbook-print-run.sociobot.in>.
- Live `index.html` and `sw.js` SHA-256 values exactly match this repair build (`2807d5db…a3553fb` and `acaa3741…055d9b89`, respectively).
- Live hashed JS returns `Cache-Control: public, max-age=31536000, immutable`; the sampled AVIF returns `Content-Type: image/avif` with the same immutable policy; `sw.js` returns `Cache-Control: no-cache`; HTML revalidates with `public, max-age=0, must-revalidate`.
- `/opt/fleet/lib/verify-url.sh` passed against the live URL: HTTPS 200, 613 ms load, no browser console/page errors, title/lang/one h1/main/alt checks, and desktop plus 390 px screenshots captured in `/work/.evidence/cookbook-print-run-repair-1/`.

The static deployment configuration remains Azure Static Web Apps; no billing or secrets were changed.

## Known product limits

- Browser print engines control installed fonts, header/footer defaults, and final PDF page size. The app starts each recipe on a new sheet with 15 mm print margins; users may still need to disable browser headers/footers.
- Ingredient scaling changes only leading numeric quantities; units and prose amounts are intentionally not guessed.
- Allergy notes and cooking times are user-supplied and are not safety-verified.

---

# Original builder handoff (historical)

Work order: `cookbook-print-run-build-1`
Completed: 2026-08-27

## What shipped

- A Vite + vanilla TypeScript static app that imports one or many Markdown/JSON recipe files without uploading them.
- A three-step workbench to select and order recipes, adjust servings, prep/cook time, optional allergen notes, packet name, and serving time.
- Quantity scaling for leading integers, decimals, common fractions, mixed fractions, and Unicode fractions.
- A consolidated prep timeline calculated backward from the serving time, followed by one printer-paginated recipe sheet per selection with ingredient checkboxes, methods, attribution, and source URL.
- Three original sample recipes for a complete first-use path in under three minutes.
- Local-first persistence, JSON backup, clear-all confirmation, remove/undo, malformed-file feedback, empty/loading/offline states, and a service worker with a verified offline reload.
- Binder Plus: a genuine three-recipe free packet and a $12 one-time unlimited-packet unlock using the Sociobot checkout, return-token capture, local license storage, daily verification cache, restore field, offline behavior, and invalid-license fallback. No product ID or secret is hardcoded.
- Responsive 390 px layout, keyboard-native controls, reduced-motion treatment, print media isolation, privacy/terms routes, CSP/security headers, robots/sitemap, and no analytics/CDN/runtime third-party dependencies.
- A product-specific “measured mise en place” generative-geometry system and an original generated paper-collage illustration. Source, prompt, production WebP/AVIF variants, review notes, and provenance are recorded in `.factory/design.md` and `assets/src/`.

## Run and verify

```sh
npm install
npm test
npm run build
npm run preview
```

Build contract: `npm run build` writes `dist/index.html` and the static assets/configuration to `dist/`.

Automated results from the final tree:

- `npm test`: 2 files, 10 tests passed (Markdown/JSON parsing, validation, durations, serving scaling, and multi-recipe scheduling).
- `npm run build`: passed; initial app JS 31.27 KB raw / 11.10 KB gzip and CSS 18.13 KB raw / 4.90 KB gzip.
- `AUDIT_URL=http://127.0.0.1:4173 npm run audit:browser`: passed on a 390 × 844 viewport; three samples → four sheets, scaled ingredient assertion, no horizontal overflow, print-media isolation, offline reload, no console errors, and zero axe violations on app/privacy/terms.
- Lighthouse mobile against the production build: Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 0.9 s, LCP 1.0 s, TBT 0 ms, CLS 0, total transfer 42 KiB (local preview run).
- Hero delivery: 480 px AVIF 12 KB / WebP 16 KB and 960 px AVIF 28 KB / WebP 40 KB, all far below the 300 KB budget.

## Known gaps and release notes

- Browser print engines control installed fonts, header/footer defaults, and the final PDF page size. Print CSS starts each recipe on a new sheet and defaults to 15 mm margins, but users may still need to disable the browser’s own headers/footers.
- Ingredient scaling changes only a leading numeric quantity. It intentionally does not convert units or guess amounts embedded later in prose.
- Allergy notes and cooking times are user-supplied and explicitly not safety-verified.
- The factory must register the `cookbook-print-run` billing product and configure its return URL before launch. `VITE_BILLING_BASE` can point staging builds at the pilot API; production defaults to `https://api.sociobot.in`.
- The generated PNG is retained as editable provenance/source only; the site serves the optimized AVIF/WebP variants.
