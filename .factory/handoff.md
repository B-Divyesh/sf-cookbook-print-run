# Dinner Binder handoff — verification 4

Work order: `cookbook-print-run-verify-4`

Implementation reviewed: `41de89df029b490b2c2a51480e892ab6ebb10402`

Runtime repair commit: `41de89df029b490b2c2a51480e892ab6ebb10402`

Validation-suite commit: `a72a5c5` (runtime build output unchanged)

Documentation commit: `2cf6057`

Date: 2026-09-05

Verdict: **PASS — zero findings and zero untested public claims**

## What changed

- Replaced the first screen with an eight-word job headline, named household use cases, a visible sample action, its result, and three tested facts.
- Added isolated `/demo` and `/?demo=1` entry points. They seed three recipes under `demo:dinner-binder:packet:v1` only.
- Added the persistent demo banner, “Reset demo,” and “Start for real.” Leaving demo deletes the demo key.
- Added `.factory/claims.json` and one tagged browser or runtime test for each of 19 public claims.
- Removed the dead checkout action. The page now states that purchases are unavailable while existing-license restore remains available.
- Added route-specific titles, descriptions, canonicals, Open Graph/Twitter metadata, a 1200 × 630 social image, favicon, and touch icon.
- Added real `/demo`, `/privacy`, and `/terms` rewrites plus a styled unknown-route response with HTTP 404.
- Added client navigation focus transfer, live announcement, back/forward handling, consistent navigation/footer, factory credit, build ID, and 44 px targets.
- Reworked phone spacing and type so the first action and all three facts fit at 390 × 844 without horizontal overflow.
- Replaced competing output metaphors with “cooking packet.” Added the required copy audit, demo record, and catalog description.
- Preserved the measured mise en place palette, ruled sheets, binder holes, paper geometry, editorial type, and generated collage art.

## Clean-clone claim evidence

A separate clone at `/tmp/dinner-final.8jpgVa/repo` checked out claim-suite commit `a72a5c5`. `npm ci` reported zero vulnerabilities.

Every command in `.factory/claims.json` ran separately and passed:

`offline-reload`, `demo-isolation-local`, `no-accounts-trackers-cdn`, `input-formats-size`, `sample-packet`, `edit-preview`, `shared-timeline`, `one-recipe-per-sheet`, `attribution-allergy`, `json-backup`, `free-limit`, `existing-license-verification`, `checkout-disabled`, `service-worker-lifecycle`, `node20-runtime`, `documented-routes`, `build-output`, `project-records-license`, and `safety-boundary`.

The isolation test seeded the real key before demo edits, import, reset, and exit. Its bytes remained unchanged, and no cross-origin request or cookie appeared.

## Full verification

- `npm test` — 11 tests passed in 3 files.
- `npm run lint` — TypeScript passed with no errors.
- `npm run test:node20` — 11 unit tests and the production build passed on Node v20.20.2.
- `npm run build` — produced `dist/index.html` and `dist/sw.js`.
- Production assets — JS 35.45 KB raw / 12.21 KB gzip; CSS 21.00 KB raw / 5.46 KB gzip; mobile hero AVIF 9.03 KB.
- `npm run test:browser` — passed at 390 px and 1440 px, keyboard undo, print media, offline reload, stale-cache rejection, and service-worker update.
- Playwright axe — zero serious, critical, or other findings on home, demo, privacy, terms, mobile, and desktop checks.
- `/opt/fleet/lib/verify-url.sh` — live home, demo, privacy, and terms returned 200 with title, `lang`, one h1, main, image alts, zero unlabeled buttons, and zero console errors.
- Live `/definitely-missing` — HTTP 404 with the designed Dinner Binder return link.
- Live browser audit — passed; offline reload worked from cache `dinner-binder-release-e8affed9e61e671e`.
- Lighthouse 12.8.2 mobile against production — performance 100, accessibility 100, best practices 100, SEO 100; LCP 1.2 s, CLS 0, TBT 40 ms, speed index 1.1 s.
- `git diff --check` — passed.

## Run and verify

```sh
npm ci
npm test
npm run lint
npm run test:claims
npm run test:browser
npm run build
```

To run one public claim, copy its exact command from `.factory/claims.json`.

## Deployment

- Static deployment command: `/opt/fleet/lib/deploy-static.sh cookbook-print-run dist`
- Azure deployment ID: `88fb1846-a587-47f4-8bb5-3f5076004b88`
- Azure app: `sf-cookbook-print-run` in `eastus2`
- Production: <https://cookbook-print-run.sociobot.in>
- Demo: <https://cookbook-print-run.sociobot.in/demo>
- Managed custom domain status: `Ready`; production returned HTTP 200 after upload.

## Known gaps and next step

There are no known blocking product gaps. New Binder Plus sales remain intentionally unavailable because the approved checkout is not enabled. Reintroduce a buy link only after that route passes a non-charging checkout and return-path test.

## Verification 4 evidence

Independent verification on 2026-09-05 used a clean `2cf6057` clone. Every one of the 19 declared claim commands passed individually, as did unit tests, lint, build, Node 20, and the production-shaped browser suite. Live phone and desktop first reads, sample/reset isolation, keyboard, invalid/recovery paths, legal and 404 routes, privacy requests, service-worker offline reload, accessibility scans, response headers, link crawl, and Lighthouse (100/100/100/100) all passed. The live HTML, JS, and CSS exactly match the clean build; the worker is source-identical apart from its expected release cache id. See `.factory/verification-4.md` for detailed evidence and earlier-finding disposition.
