# Dinner Binder handoff — repair 3

Work order: `cookbook-print-run-repair-3`
Date: 2026-09-05
Live URL: <https://cookbook-print-run.sociobot.in>

## Status

**Complete.** The two strict-review findings and the untested reset claim are resolved and deployed.

## Commits

- Runtime repair: `0feea4b6a280e367cba3be9e5e5908bd16b05add`
- Final implementation and validation-test repair: `1b21363d54b2d25b79414fbfd53f861d43726038`
- Documentation/report commits follow these implementation commits; see the final Git handoff for their SHA.

## What changed

- Resetting the isolated demo now restores the packet-name and serving-time controls immediately, as well as storage and the print preview.
- Added the public `demo-reset` claim. Its browser test changes both settings, resets, and proves the controls, persisted state, cover preview, recipe count, sheet count, and real-data sentinel have the expected outcome.
- Stabilized the existing free-limit claim by waiting for the observable fourth imported recipe before asserting the three-recipe limit.
- Replaced the 404 binder/paper metaphor with direct `Page not found` copy and a direct return path.
- Updated demo and README records to state exactly which demo settings reset restores.
- Copied the verb-first catalog description to `/work/.evidence/catalog-description.txt`.

## Verification

### Clean checkout

A separate clean clone at `1b21363` used `npm ci` successfully with zero audit vulnerabilities. Every one of the 20 exact commands in `.factory/claims.json` passed individually, including the new `demo-reset` command and the Node 20 command.

These additional clean-clone checks passed:

- `npm test` — 11 tests passed.
- `npm run lint` — passed.
- `npm run build` — passed and produced `dist/index.html` and `dist/sw.js`.
- `npm run test:browser` — passed: production-shaped service-worker install/update, offline reload, stale-cache rejection, mobile/desktop layout, keyboard paths, print output, routes, and axe.
- `npm audit --omit=dev --audit-level=high` — zero vulnerabilities.

The final artifact contains 35.52 KB raw JavaScript (12.23 KB gzip), 21.00 KB CSS (5.46 KB gzip), and a 40.07 KB largest image.

### Live deployment

`deploy-static.sh cookbook-print-run /work/repo/dist` completed successfully on the existing `sf-cookbook-print-run` Static Web App. HTTPS returned 200, and the deployed HTML, JS, CSS, and service worker matched the local final `dist/` SHA-256 values.

- `/opt/fleet/lib/verify-url.sh` passed: HTTPS, title, `lang`, one `h1`, `main`, image alts, labeled controls, and no console errors.
- `AUDIT_URL=https://cookbook-print-run.sociobot.in npm run audit:browser` passed: live demo, reset, offline reload, keyboard paths, print view, responsive layout, and zero serious/critical axe findings.
- Fresh 390 × 844 and 1440 × 900 contexts both stated the job, household audience, and **Try it with sample data** before scrolling. The action opened the isolated three-recipe, four-sheet demo. After a packet-name and serving-time edit, reset visibly returned both to `Sample supper` and `18:30`, with matching stored state and preview. No console errors occurred.
- A fresh unknown URL returned HTTP 404 with title `Page not found — Dinner Binder`, direct `Page not found` heading, and a visible home link.
- Mobile Lighthouse retry completed without a runtime error: Performance 100, Accessibility 100, Best Practices 100, SEO 100; LCP 1.285 s, CLS 0, TBT 0 ms. Evidence is in `/work/.evidence/cookbook-print-run-repair-3-live/`.

## Earlier-finding disposition

- Review 1’s first-screen, sample isolation, claims inventory, disabled checkout, metadata/routing/focus/targets, and plain-language issues remain resolved.
- Verification 1’s PWA cache update, numeric boundary feedback, Undo focus, immutable assets, and AVIF MIME issues remain resolved.
- Verification 2’s production service-worker install failure remains resolved by excluding Azure’s consumed control file from the shell.
- Verification 3 had no defects; its core workflow, privacy, delivery, PWA, and accessibility coverage was repeated.
- Review 2’s stale visible demo settings are resolved by the state-to-control synchronization and live reset exercise. Its untested reset promise is now the dedicated `demo-reset` claim. Its 404 metaphor is removed.

## Known gap and next step

The free core is complete and local-first. New Binder Plus checkout is still deliberately unavailable because the approved billing offer has not been registered. Existing license restoration and verification remain available; the separate billing-registration operator must enable an approved one-time offer before a checkout link or price is shown.
