# Independent verification 5 — FAIL

Work order: `cookbook-print-run-verify-5`  
Verified: 2026-09-05  
Live URL: <https://cookbook-print-run.sociobot.in>

## Verdict

**FAIL.** One declared public-claim command does not pass when run individually from the documented clean setup. The live product path is otherwise healthy, but the factory contract requires every declared command to pass individually and allows PASS only with zero findings.

Finding count: **1**. Untested-claim count: **0**.

## Candidate and comparison

- Runtime repair reviewed: `0feea4b6a280e367cba3be9e5e5908bd16b05add`.
- Final implementation and test candidate: `1b21363d54b2d25b79414fbfd53f861d43726038`.
- Documentation candidate: `8cb719e79a9e546f0e4a85512e8e0cec9553f280`.

`8cb719e` changes only `.factory/handoff.md` from `1b21363`; it does not change the product runtime. A clean build at `8cb719e` exactly matched live `index.html`, JS, and CSS SHA-256 values. The live service worker was exercised and controlled the page; its generated cache identifier is deployment-derived.

## First read and product exercise

Fresh private browser contexts were opened before scrolling.

- Phone, 390 × 844: job: “Print a timed packet from recipe files.” Audience: “For households coordinating several recipes for a week, trip, or screen-free meal.” First action: **Try it with sample data**, ending at 400 px in the viewport.
- Desktop, 1440 × 960: the same job, audience, and action were present before scrolling; the action ended at 649 px.

The one-click action opened the isolated demo with Lemony sheet-pan chickpeas, Herby couscous, and Cucumber mint salad, plus four print sheets. The persistent label said “Demo — sample data, nothing is saved.” After changing the packet name and serving time, **Reset demo** immediately restored `Sample supper`, `18:30`, the cover preview, all three recipes, and four sheets. A seeded real-storage sentinel remained byte-for-byte unchanged. Invalid JSON showed the specific recovery message. Reduced motion resolved to `1e-05s` (0.01 ms). Screenshots are in `/work/.evidence/cookbook-print-run-verify-5/`.

## Clean checkout and claims

A new clone at `8cb719e` received `npm ci` successfully; production dependency audit reported zero vulnerabilities.

- `npm test`: PASS — 11 tests in 3 files.
- `npm run lint`: PASS.
- `npm run build`: PASS — `dist/index.html` and `dist/sw.js` created. JS: 35.52 KB raw / 12.23 KB gzip; CSS: 21.00 KB raw / 5.46 KB gzip.
- `npm run test:node20`: PASS on Node v20.20.2.
- `npm run test:browser`: PASS — Azure-shaped 404, worker lifecycle/update, offline reload, keyboard, print, responsive layout, legal routes, and axe.
- `npm run test:claims`: PASS — all claim tests pass together.

Exact claim commands were then run one process at a time from that clone:

| Claim | Individual result |
|---|---|
| `offline-reload` | PASS |
| `demo-isolation-local` | PASS |
| `demo-reset` | PASS |
| `no-accounts-trackers-cdn` | PASS |
| `input-formats-size` | PASS |
| `sample-packet` | PASS |
| `edit-preview` | PASS |
| `shared-timeline` | PASS |
| `one-recipe-per-sheet` | PASS |
| `attribution-allergy` | PASS |
| `json-backup` | PASS |
| `free-limit` | PASS |
| `existing-license-verification` | PASS |
| `checkout-disabled` | PASS |
| `service-worker-lifecycle` | PASS |
| `node20-runtime` | PASS |
| `documented-routes` | **FAIL twice** |
| `build-output` | PASS |
| `project-records-license` | PASS |
| `safety-boundary` | PASS |

The failed exact command was `npm run test:claims -- --grep @claim:documented-routes`. On two clean-process attempts, its direct Privacy → Terms navigation failed before assertion with `page.title: Execution context was destroyed` and `page.goto: net::ERR_ABORTED`. The combined suite passes because the test runs later, after service-worker startup. This means the documented individual command is not reliable from the required clean setup.

## Live checks

- `AUDIT_URL=https://cookbook-print-run.sociobot.in npm run audit:browser`: PASS. It exercised desktop/mobile layout, keyboard activation, Space selection, remove/Undo focus, print media, live worker control/offline reload, privacy/terms, 404, and axe; it found zero serious or critical violations.
- `/opt/fleet/lib/verify-url.sh`: PASS — HTTPS 200, title, `lang=en`, one h1, main, image alts, labeled controls, and no browser-console errors.
- Direct `/privacy` and `/terms` loads returned 200 with their expected titles and h1s. `/definitely-missing` deliberately returned HTTP 404 with title `Page not found — Dinner Binder`, h1 `Page not found`, and a return link. The 404 status is expected, not a product defect.
- Rendered internal links to `/`, `/demo`, `/privacy`, and `/terms` all returned 200.
- First-load request capture showed only the product origin; no console errors, cookies, trackers, or external assets were observed. The live headers include HSTS, `nosniff`, strict-origin referrer policy, restrictive permissions policy, and CSP with `frame-ancestors 'none'`. Hashed assets are immutable and `sw.js` is `no-cache`.
- Fresh Lighthouse 12.8.2 mobile run: Performance 100, Accessibility 100, Best Practices 100, SEO 100; LCP 1,171 ms, CLS 0, TBT 0 ms. The first two invocations could not locate or then crashed Chromium; a third run using Playwright Chromium and container-safe flags produced the saved report.

## Earlier findings

All earlier product findings were inspected and their live behavior remains resolved:

- Review 1: the first screen names the job, audience, and action; the sandbox is isolated; the claims registry exists; unavailable checkout is honest; metadata, route focus, touch targets, shared structure, plain wording, and real 404 are present.
- Verification 1: worker update behavior, numeric-boundary feedback, remove/Undo focus, immutable asset caching, and AVIF delivery remain covered by the production-shaped browser test and live audit.
- Verification 2: the worker installs on the live Azure-shaped deployment, controls the page, excludes the consumed control file, and supports offline reload.
- Verification 3: its core packet, privacy, PWA, accessibility, delivery, and browser limitations remain covered by the current clean and live checks.
- Review 2: the reset now synchronizes visible controls, storage, and preview; the reset claim exists; the 404 heading is now direct plain language.
- Verification 4: its no-defect conclusion is superseded only by the independently reproduced standalone-claim-command failure above.

## Finding

### Major — `documented-routes` claim command is not independently runnable

The declared command for the public route claim fails in a fresh process while moving from `/privacy` to `/terms`. The routes themselves work live and the same test passes as part of the combined suite, but its result depends on prior tests/service-worker timing. This violates the claims contract’s requirement that each listed command pass individually from a clean setup. Stabilize the test (for example, wait for the navigation/worker state it depends on) and rerun this exact command in a fresh clone before accepting the release.

## Re-run

```sh
npm ci
npm test
npm run lint
npm run build
npm run test:claims -- --grep @claim:documented-routes
npm run test:browser
AUDIT_URL=https://cookbook-print-run.sociobot.in npm run audit:browser
```
