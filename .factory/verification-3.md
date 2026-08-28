# Independent verification 3 — PASS

Work order: `cookbook-print-run-verify-3`
Candidate commit: `020b414aa17239a2c2873b0264a4cdc073ca8b64` (`020b414`)
Live URL: <https://cookbook-print-run.sociobot.in>
Verified: 2026-08-28

## Verdict

**PASS.** Dinner Binder fulfils the researched static offline-web product contract: user-owned Markdown/JSON recipes can become a selected, scaled, paginated cooking packet with checkboxes, a consolidated prep schedule, preserved credit, and user-supplied allergy notes. The earlier live-only PWA install failure is not present in this candidate deployment.

No release-blocking defects were found. The documented limits remain: browser print headers/footers are browser-controlled; scaling changes only leading numeric quantities; and allergy/cooking information is expressly user-supplied rather than safety-verified.

## Clean-checkout quality gates

The worktree was clean at `020b414` before installation.

- `npm ci`: **PASS** — 58 packages installed; `npm audit --omit=dev --audit-level=high` reported 0 vulnerabilities.
- `npm test`: **PASS** — 3 files / 11 tests (parser, scheduling, and service-worker shell regression).
- `npm run lint`: **PASS** — `tsc --noEmit`.
- `npm run build`: **PASS** — exact production command; created `dist/index.html`.
- `npm run test:browser`: **PASS** — production-shaped static server deliberately returned 404 for Azure's consumed `staticwebapp.config.json`; tested install/control, offline reload, stale-cache isolation, a simulated next service-worker release, 390 px and 1440 px layouts, keyboard paths, print isolation, legal routes, console/page errors, and axe.

Fresh artifact sizes are within the supplied static-product budgets: app JavaScript 31,537 B raw / 11,220 B gzip (under 200 KB), CSS 18,127 B raw / 4,910 B gzip (under 50 KB), and largest image 40,070 B (under 300 KB).

## End-to-end product exercise

Independent Playwright exercise against the fresh local production preview confirmed:

- Schema.org JSON import with ISO durations, author, source URL, ingredient array, instruction objects, and allergen note created a two-sheet packet (cover plus recipe). Credit (`By/source: M. Cook`), source link, and supplied allergy note appeared in the printable recipe sheet.
- Changing a 2-serving recipe to 3 produced the correct `1½ cups rice` → `2¼ cups rice` scaling.
- Malformed JSON gave `not valid JSON. Check for a missing comma or quote`; `.txt` gave an explicit unsupported-format message; a 2,000,001-byte Markdown file gave the explicit 2 MB-limit message. All recovered without page/console errors.
- A `javascript:` source URL did not result in a link. The JSON backup included the two accepted recipes. Only `dinner-binder:packet:v1` was stored in local storage.
- Three supplied recipes produced four print sheets. Importing a fourth Markdown recipe left it unselected; attempting selection preserved the unchecked state and announced: `The free packet fits 3 recipes. Remove one or unlock Binder Plus for larger runs.`
- Clear-all first presented the exact count and recoverable confirmation; cancel retained all four recipes, and confirm returned to the empty state.
- Numeric lower/upper bounds visibly clamp and announce corrections; keyboard Enter loads/removes/restores recipes, Space toggles selection, and focus moves directly to Undo after remove.

## Accessibility, responsive layout, and performance

- Repository and independent browser checks found **0 serious or critical axe violations** on app, `/privacy`, and `/terms`, at 390 px and 1440 px.
- The 390 px layout has no horizontal overflow; desktop and mobile screenshots were visually inspected. Print media retains the packet and hides application chrome.
- The app has one `h1`, a `main` landmark, `lang="en"`, title, image alt text, skip/focus treatment, and visible designed focus. Reduced motion resolves animation duration to `0.01ms`.
- No page or console errors occurred in local or live browser runs.
- Fresh live mobile Lighthouse: Performance **95**, Accessibility **100**, Best Practices **100**, SEO **100**; FCP 1.0 s, LCP 1.2 s, TBT 260 ms, CLS 0, transfer 43 KiB.
- `/opt/fleet/lib/verify-url.sh` passed HTTPS/title/lang/one-h1/main/alt/error checks at the live URL (1,004 ms). Its one unlabeled-button heuristic is a false positive for the text-bearing `Verify license` button within the closed restore-details disclosure; axe reports no relevant violation.

## Privacy, PWA, delivery policy, and live identity

- First-load request capture from the live site contained only `https://cookbook-print-run.sociobot.in`. There are no analytics, CDN fonts/scripts, recipe uploads, or accounts. Recipe data and license state are local-first; the CSP limits external connections/forms to the disclosed Sociobot billing endpoints.
- The live worker is registered and controls the page, with cache `dinner-binder-release-8c2f8a824b158d0a`; offline reload showed `Offline now — edits are safe`. It does not cache `staticwebapp.config.json`, which live Azure correctly returns as 404. The local production-shaped regression also proved a subsequent versioned worker activates with a fresh cache and ignores stale `dinner-binder-v1` content.
- Live `index.html`, JS, and CSS SHA-256 values exactly match the fresh candidate build: `2807d5db…a3553fb`, `b1c87126…8176be7`, and `13426505…99e3dbb`. `sw.js` differs only in its intentionally build-derived cache identifier; normalized worker source is identical and neither version caches the Azure control file.
- Live policies are correct: HTML revalidates; `sw.js` is `no-cache`; hashed assets use `public, max-age=31536000, immutable`; AVIF is `image/avif`; HSTS, `nosniff`, strict-origin referrer policy, restrictive permissions policy, and CSP are present. Unknown application routes correctly return the SPA shell.

## Defects

None found by this verification.

## Re-run

```sh
npm ci
npm test
npm run lint
npm run build
npm run test:browser
AUDIT_URL=https://cookbook-print-run.sociobot.in npm run audit:browser
```
