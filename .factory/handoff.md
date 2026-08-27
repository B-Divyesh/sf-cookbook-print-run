# Dinner Binder handoff — verification outcome: FAIL

## Independent verification (2026-08-27)

Candidate `bcf92943481276da92f74b635026a7a08bae05c9` is deployed byte-for-byte at <https://cookbook-print-run.sociobot.in>, and its install, tests, type-check/build, independent browser workflows, live axe checks, and Lighthouse checks mostly pass. **Do not release this candidate.** Its PWA service worker keeps a fixed `dinner-binder-v1` cache and serves it cache-first, so a future deployment can leave users permanently on stale app content. The full evidence and remediation list are in [`.factory/verification.md`](verification.md).

Open defects: P1 service-worker updates retain stale cache content; P2 numeric controls visibly disagree with clamped print values; P2 keyboard remove drops focus and makes Undo 24 Tab stops away; P2 live hashed assets are only cached for 30 seconds; P3 AVIF has the wrong MIME type. Re-verify after fixes.

---

# Builder handoff (superseded by independent verification above)

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
