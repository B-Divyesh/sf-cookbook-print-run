# Dinner Binder handoff — adversarial first-read review 1

Work order: `cookbook-print-run-review-1`

Reviewed base: `bd248fcc0210e7791c3b414e38c3f930ca576827`

Date: 2026-08-28

Verdict: **FAIL**

## What was done

- Reviewed the live product cold in fresh Chromium contexts at 390 × 844 and 1440 × 900.
- Audited every landing/README sentence, headings, action labels, terminology, jargon, and word counts.
- Exercised the sample flow with empty and pre-existing local data, `/demo`, `/?demo=1`, offline reload, and network observation.
- Checked claims registration, routing, titles, metadata, link health, route focus/back behavior, touch targets, axe results, reduced motion, and visual identity.
- Wrote the evidence and concrete fixes in `.factory/review-1.md`. No product code was modified.

## Verification

- `npm ci` — pass; 0 reported vulnerabilities.
- `npm test` — pass; 11 tests in 3 files.
- `npm run build` — pass; `dist/index.html` produced; app JS 11.22 kB gzip.
- `npm run test:browser` — pass.
- Live axe at mobile and desktop — zero violations.
- Same-origin live links and support files — pass; paid checkout link — HTTP 404.

## Release blockers

1. The first mobile/desktop screen does not name the audience or show a clickable first action.
2. The sample action writes into the real `dinner-binder:packet:v1` key; there is no isolated demo, banner, reset, or start-real path.
3. `.factory/claims.json` and all `@claim:` tests are missing.
4. “Buy Binder Plus — $12” points to an HTTP 404.
5. Unknown paths render the home app with HTTP 200; `/demo` is not implemented.

Additional required work: add canonical/OG/favicon metadata, route-change h1 focus/announcement, a consistent header/footer with factory/build attribution, 44 px link targets, and the copy fixes catalogued in the review.

## Next step

Repair the five blockers and major findings, add the isolated claim-test sandbox, deploy the corrected build, and run a fresh adversarial review against production.
