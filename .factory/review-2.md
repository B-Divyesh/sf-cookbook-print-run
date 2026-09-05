# Review 2 — Print recipe files as a timed cooking packet

Work order: `cookbook-print-run-review-2`

Reviewed: 2026-09-05

Live URL: <https://cookbook-print-run.sociobot.in>

## Verdict

**FAIL — 2 findings and 1 untested public claim.**

All 19 declared claim commands pass from a clean checkout. The live product also passes its main recipe-to-print flow, privacy isolation, offline reload, accessibility scans, delivery checks, and performance budgets. It cannot receive a strict PASS because the demo reset leaves one visible setting stale, its full reset promise is not covered by a claim test, and the 404 heading uses metaphors forbidden by the plain-words contract.

## First screen

- **Job:** turn owned Markdown or JSON recipe files into a selected, timed, printable cooking packet.
- **Audience:** households coordinating several recipes for a week, trip, or screen-free meal.
- **First action:** **Try it with sample data**, followed by “Opens three recipes and a ready-to-print timeline.”

Fresh Chromium contexts were opened at 390 × 844 and 1440 × 900 before scrolling. The phone action was fully visible at `y=354.28`, measured 358 × 46 px, and opened the demo with Enter. The desktop action was fully visible at `y=603.38`. Both layouts had no horizontal overflow.

## Candidate and live comparison

- Implementation reviewed: `41de89df029b490b2c2a51480e892ab6ebb10402` (`41de89d`).
- Validation-suite change: `a72a5c5b9c6ac9958df4434f2c353915d7c2cdd3`; browser runtime output is unchanged.
- Documentation candidate: `2cf60579dd255ed1980c7ba4b6cbbdcb0b8acd53` (`2cf6057`).
- Review base: `77ff9fbc7a98487ced8c2fcb40f4e8c2c4a350fd` (`77ff9fb`).

A clean `77ff9fb` build matched the live HTML, hashed JavaScript, and hashed CSS byte for byte. The service worker also matched after normalizing its deployment-derived release cache identifier.

## Findings

### Major — Reset demo leaves visible packet settings stale

The demo record states that **Reset demo** restores the initial sample recipes and settings. In a fresh live `/demo` context:

1. Change **Packet name** from `Sample supper` to `Changed demo title` and serving time from `18:30` to `20:00`.
2. Select **Reset demo**.
3. Read the packet-name field and the print preview without navigating or reloading.

The stored state and preview correctly return to `Sample supper` at 18:30, but the visible inputs still read `Changed demo title` and `20:00`. The editor and output therefore disagree immediately after the recovery action. The three recipes and four sheets do reset, and the real storage key remains unchanged.

The reset handler replaces and saves state, then calls `renderAll()` at `src/main.ts:221`. That render path does not refresh the packet-name or serving-time inputs. The declared `demo-isolation-local` test changes the packet name and clicks reset, but checks only real storage before navigating to a new URL; that navigation masks the stale field.

Required correction: refresh both packet setting inputs when reset runs, then assert their immediate visible values, stored values, and preview values before any navigation.

Evidence: `/work/.evidence/review-2-reset-mismatch.png`. A separate serving-time check returned visible `20:00`, preview `6:30 pm`, and stored `18:30`.

### Minor — The designed 404 uses metaphor instead of a direct heading

The 404 response is correctly styled, returns HTTP 404, and provides working links home and to the demo. Its eyebrow and h1 are “That sheet is missing” and “This page is not in the binder.” These describe a web page as paper or a binder, which violates the plain-words rule for every page and leaves Review 1’s terminology finding only partly resolved.

Required correction: use direct copy such as “Page not found” and “Check the address or return to Dinner Binder.”

## Untested public claim

Count: **1**.

`.factory/demo.md:9` says: “Reset demo restores the initial sample recipes and settings.” No claim entry names that complete behavior. The closest command, `@claim:demo-isolation-local`, does not assert the visible packet name or serving time immediately after reset. The manual review proves that the settings portion currently fails.

All 19 entries that do exist in `.factory/claims.json` were run separately with their exact commands and exited successfully. This missing assertion still prevents “zero untested claims.”

## Live behavior checked

- The one-click demo opened Lemony sheet-pan chickpeas, Herby couscous, and Cucumber mint salad with four print sheets.
- The persistent label read “Demo — sample data, nothing is saved.” Demo edits, malformed JSON recovery, numeric-boundary correction, reset, and exit did not change a seeded real-data sentinel.
- **Start for real** removed only `demo:dinner-binder:packet:v1`. No cross-origin request or cookie appeared during the live demo flow.
- `Serves: 0` visibly corrected to `1`, announced the allowed range, and matched the preview. Malformed JSON named the problem and recovery step.
- Keyboard Enter opened the demo; Space toggled recipe selection; remove moved focus to Undo; Enter restored the recipe. Print media hid app chrome and retained the packet.
- Reduced motion set animation duration to 0.01 ms and scroll behavior to `auto`. A 640 CSS px effective-width check, equivalent to 200% zoom on a 1280 px viewport, had no horizontal overflow or hidden controls.
- Axe returned zero violations on home, demo, privacy, and terms at phone and desktop sizes. The required URL verifier found one h1, `lang=en`, a main landmark, alt text, labeled buttons, and no console errors on every 200 route.
- Privacy and Terms had route-specific titles, descriptions, and canonicals. Internal links returned 200. The designed unknown route returned HTTP 404; this expected response is not itself a defect.
- The live worker controlled the page, ignored stale release content, excluded the Azure configuration file, and reloaded offline. Response headers included HSTS, CSP with `frame-ancestors 'none'`, `nosniff`, strict-origin referrer policy, and restrictive permissions policy.
- Mobile Lighthouse: Performance 100, Accessibility 100, Best Practices 100, SEO 100; LCP 1.3 s, CLS 0, TBT 0 ms.

This static product has no backend or tenant system, so backend restart, tenant-isolation, health, and 429 checks do not apply. Optional AI would not improve the brief’s local file-to-print job enough to justify sending recipe data to a model.

## Clean-checkout results

A remote clone at `77ff9fb` received `npm ci --ignore-scripts`; npm reported zero vulnerabilities.

- Every one of the 19 declared claim commands: PASS.
- `npm test`: PASS, 11 tests in 3 files.
- `npm run lint`: PASS.
- `npm run build`: PASS; `dist/index.html` and `dist/sw.js` created.
- `npm run test:browser`: PASS, including offline install/update, mobile and desktop layouts, keyboard paths, print media, legal routes, and axe.
- `npm run test:node20`: PASS on Node v20.20.2.
- Production output: JS 35.45 KB raw / 12.21 KB gzip; CSS 21.00 KB raw / 5.46 KB gzip.
- `npm audit --omit=dev --audit-level=high`: zero vulnerabilities.

## Earlier finding disposition

- Review 1’s first-screen failure is resolved.
- Review 1’s real-data contamination is resolved; the demo namespace remained isolated. The reset requirement is only partly resolved because a visible setting stays stale.
- Review 1’s missing claims registry is resolved for 19 listed claims, but the complete reset promise remains unlisted and untested.
- Review 1’s dead checkout is resolved; no checkout link is exposed while purchases are paused.
- Review 1’s missing HTTP 404 is resolved. Its remaining metaphor copy creates the minor finding above.
- Review 1’s metadata, route focus, shared structure, and touch-target findings are resolved.
- Review 1’s terminology finding is resolved on normal routes but not on the 404 route.
- Verification 1’s stale PWA update, numeric feedback, Undo focus, immutable caching, and AVIF MIME findings are resolved.
- Verification 2’s live service-worker install failure is resolved.
- Verification 3 recorded no defects; its core, privacy, PWA, accessibility, and delivery results still pass.
- Verification 4’s reported zero-finding result is superseded by the reset mismatch and uncovered 404 wording above.

## Required next steps

1. Synchronize visible packet settings during demo reset.
2. Add exact automated coverage for the complete reset promise.
3. Replace the 404 metaphor with direct missing-page copy.
4. Rebuild, deploy, and rerun all claim and live checks.
