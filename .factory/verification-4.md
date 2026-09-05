# Independent verification 4 — PASS

Work order: `cookbook-print-run-verify-4`  
Verified: 2026-09-05  
Live URL: <https://cookbook-print-run.sociobot.in>

## Verdict

**PASS.** There are zero findings at every severity and zero untested public claims.

Dinner Binder turns owned Markdown or JSON recipe files into a selected, timed, printable cooking packet. It is for households planning several recipes for a week, trip, or screen-free meal. In fresh 390 × 844 and 1440 × 960 browser contexts, before scrolling, the page states that job and audience and exposes **Try it with sample data**. The action opens three recipes and a ready-to-print timeline.

## Candidate and live comparison

- Implementation reviewed: `41de89df029b490b2c2a51480e892ab6ebb10402` (`41de89d`), the last runtime/UI change.
- Validation-suite change: `a72a5c5b9c6ac9958df4434f2c353915d7c2cdd3`; it does not change browser runtime output.
- Documentation candidate: `2cf60579dd255ed1980c7ba4b6cbbdcb0b8acd53` (`2cf6057`).
- A clean build of `2cf6057` matched live `/`, its hashed JS, and its hashed CSS byte-for-byte. The service worker matched after replacing its intentionally deployment-derived cache identifier (`dinner-binder-release-…`).

## Clean-clone evidence

A separate clone at `2cf6057` received `npm ci --ignore-scripts`; 58 packages installed and npm reported zero vulnerabilities.

- `npm test` — PASS: 11 tests in 3 files.
- `npm run lint` — PASS.
- `npm run build` — PASS: `dist/index.html` and `dist/sw.js` created; JS 35.45 KB raw / 12.21 KB gzip and CSS 21.00 KB raw / 5.46 KB gzip.
- `npm run test:browser` — PASS: production-shaped Azure 404, worker install/update and stale-cache rejection, offline reload, keyboard paths, 390 px and desktop layout, print isolation, legal routes, and axe.
- `npm run test:node20` — PASS under Node v20.20.2.

All 19 exact claim commands declared in `.factory/claims.json` passed independently from that clone: `offline-reload`, `demo-isolation-local`, `no-accounts-trackers-cdn`, `input-formats-size`, `sample-packet`, `edit-preview`, `shared-timeline`, `one-recipe-per-sheet`, `attribution-allergy`, `json-backup`, `free-limit`, `existing-license-verification`, `checkout-disabled`, `service-worker-lifecycle`, `node20-runtime`, `documented-routes`, `build-output`, `project-records-license`, and `safety-boundary`.

## Live evidence

- Fresh mobile and desktop first reads had one h1, the correct plain-language title, no console errors, and a visible primary sample action above the fold. The phone action measured 358 × 46 px.
- Keyboard Enter activated the first sample action. The live browser audit also passed Space selection, remove/Undo focus restoration, route-focus transfer, and 44 px navigation targets.
- The one-click sample produced three realistic named recipes (Lemony sheet-pan chickpeas, Herby couscous, and Cucumber mint salad) and four sheets: cover/timeline plus one sheet per recipe. The persistent banner reads “Demo — sample data, nothing is saved.” Reset restored the three recipes, four sheets, and `Sample supper`.
- With the real storage key seeded to a sentinel value, demo use, a boundary correction, an invalid JSON recovery, reset, offline reload, and exit-path checks never changed that value. The demo namespace was present. No request left the product origin and no cookie was set.
- Invalid `Serves: 0` visibly corrected to `1` and announced the reason. Malformed JSON produced the specific missing-comma-or-quote recovery message. Offline reload was controlled by the live service worker and announced “Offline now — edits are safe.”
- Playwright axe on `/`, `/demo`, `/privacy`, and `/terms` at 390 px found zero violations, including zero serious or critical violations. Reduced-motion media was honoured. `/opt/fleet/lib/verify-url.sh` reported title, `lang=en`, one h1, main, image alts, no unlabeled buttons, and no errors.
- Direct legal routes had their route titles, canonicals, descriptions, social metadata, favicon, and live internal links returning 200. `/definitely-missing` returned HTTP 404 with title `Page not found — Dinner Binder` and a visible return link.
- Live response policy includes HSTS, `nosniff`, strict-origin referrer policy, restrictive permissions policy, CSP with `frame-ancestors 'none'`, immutable caching for hashed assets, and `no-cache` for the worker. `robots.txt` and `sitemap.xml` return 200.
- Lighthouse 12.8.2 against live returned Performance 100, Accessibility 100, Best Practices 100, and SEO 100 (LCP 1.3 s, CLS 0, TBT 0 ms).

## Earlier finding disposition

All earlier findings are resolved and were retested:

- Review 1’s first-screen, isolated-demo, claims-registry, disabled-checkout, and designed-404 blockers now pass through the live first-read, demo, exact-claim, and 404 checks.
- Review 1’s metadata, consistent route structure/focus/targets, and plain-words/terminology majors now pass through metadata/link, keyboard, route, and copy-audit checks.
- Verification 1’s stale PWA update, numeric-boundary feedback, remove/Undo focus, immutable asset caching, and AVIF MIME findings pass through the production-shaped worker suite, live boundary/focus audit, and live header checks.
- Verification 2’s live worker-install failure is resolved: the live worker controls the page, its cache excludes Azure’s deployment-control file, and offline reload succeeds.
- Verification 3 had no defects; its PWA, privacy, delivery-policy, and accessibility results were independently repeated above.

## Findings

None.

## Re-run

```sh
npm ci
npm test
npm run lint
npm run test:claims
npm run test:node20
npm run test:browser
AUDIT_URL=https://cookbook-print-run.sociobot.in npm run audit:browser
```
