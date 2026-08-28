# Independent verification 2 — FAIL

Work order: `cookbook-print-run-verify-2`  
Candidate: `7c01f5b8e389248cb279964ee3696258673464e8` (`7c01f5b`)  
Live URL: <https://cookbook-print-run.sociobot.in>  
Verified: 2026-08-28

## Verdict

**FAIL.** The core recipe-to-print-packet workflow, local quality gates, delivery headers, accessibility, bundle budgets, and live application assets pass. The deployed PWA does not install: its service-worker install event rejects in production, so the promised offline reload and update behavior do not exist on the live URL. This is a release blocker for the brief's static offline web app.

## Release-blocking defect

### P1 — Production service worker cannot install; live app is not offline-capable

`vite.config.ts` builds the precache list from every `dist/` file (lines 23–32) and sends it to `cache.addAll()` (lines 36–38). That includes `/staticwebapp.config.json`. Azure Static Web Apps consumes that configuration file rather than serving it: on the live URL, `GET /staticwebapp.config.json` returns **404** (Azure's 404 page), while the local Vite preview returns it. Therefore the live worker's `cache.addAll()` rejects.

Fresh Chromium CDP evidence after registering `/sw.js`:

```text
ServiceWorker failed to install: ServiceWorker failed to handle event
(event.waitUntil Promise rejected)
Uncaught (in promise) TypeError: Failed to execute 'addAll' on 'Cache': Request failed
```

After five seconds the live origin had `registered: false`, `controller: false`, and zero registrations. The repository's live browser audit consequently stalls awaiting `navigator.serviceWorker.ready`; I stopped that run after it demonstrated the missing registration. The same audit passes against local Vite preview, which masks the defect because the configuration file is accessible there.

Impact: first-time live users cannot get a worker, cache the shell, reload offline, or receive the tested update path. This fails the brief's offline requirement and the PWA acceptance check.

Required repair: do not include deployment-control files such as `staticwebapp.config.json` in the service-worker shell, and add a production-shaped test where that URL returns 404. Re-verify an actual live registration, controlled offline reload, and version-to-version update after deployment.

## Local clean-checkout gates

The worktree was clean at the requested candidate before installation.

- `npm ci`: **PASS** — 58 packages installed; `npm audit --omit=dev --audit-level=high` reported 0 vulnerabilities.
- `npm test`: **PASS** — 2 files, 10 tests.
- `npm run lint`: **PASS** — `tsc --noEmit`.
- `npm run build`: **PASS** — TypeScript and Vite production build; `dist/` produced.
- Built budgets: app JS 31,537 B raw / 11,220 B gzip; CSS 18,127 B raw / 4,910 B gzip; largest image 40,070 B. All are within the 200 KB JS, 50 KB CSS, and 300 KB hero-image limits.
- `AUDIT_URL=http://127.0.0.1:4173 npm run audit:browser`: **PASS** — 390 px and 1440 px, keyboard activation, numeric bounds, remove/Undo focus restoration, print isolation, legal pages, axe, local offline reload, stale-cache regression, and no page/console errors.

## Independent product exercise

Against the fresh production build at `http://127.0.0.1:4173`, a separate Playwright check passed all of the following:

- Imported a representative schema.org JSON recipe with ISO durations, author, source URL, attribution, allergen note, ingredients, and instruction objects. The packet retained its attribution and allergen note; changing 2 servings to 3 correctly scaled `1½ cups rice` to `2¼ cups rice`.
- Downloaded and parsed the JSON backup; it retained the imported recipe.
- Recovered with explicit messages from malformed JSON, a `.txt` file, and a 2,000,001-byte Markdown file.
- Enforced the three-recipe free limit with an explanatory recovery message; rejected a `javascript:` source URL rather than emitting a link.
- Verified print-media isolation, no 390 px horizontal overflow, reduced-motion animation duration at 0.01 ms, local offline reload, and zero serious/critical axe findings. No console or page errors were emitted; initial-load requests stayed on the local origin only.

Keyboard-only checks in the repository audit passed: Enter loads samples and activates actions; Space toggles recipe selection; focus is visibly styled; remove moves focus directly to the Undo button and Enter restores the recipe.

## Live deployment, privacy, and response policy

- The live `index.html`, `assets/index-B8YnTodY.js`, and `assets/index-TMErduZr.css` SHA-256 values exactly matched this fresh candidate build. The generated `sw.js` cache identifier differed as expected because the build intentionally incorporates a build-time value; its deployed source contains the same invalid shell entry noted above.
- Live first-load browser checks at 390 px and 1440 px passed: title, `lang`, one `h1`, one `main`, no overflow, no console/page errors, zero axe serious/critical findings, and no first-load request outside `https://cookbook-print-run.sociobot.in`.
- `/opt/fleet/lib/verify-url.sh https://cookbook-print-run.sociobot.in <temp-evidence-dir>` passed: HTTPS 200, 756 ms load, title/lang/main/alt checks, and no console/page errors. Its reported unlabeled-button count is a false positive for the text-bearing `Verify license` button hidden inside a closed `<details>`; axe reported no issue.
- Live headers: HSTS, `X-Content-Type-Options: nosniff`, strict-origin referrer policy, restrictive permissions policy, and the configured CSP are present. Hashed JS/CSS and AVIF return `Cache-Control: public, max-age=31536000, immutable`; AVIF returns `Content-Type: image/avif`; `/sw.js` returns `Cache-Control: no-cache`; HTML revalidates.
- Source review and runtime request capture found no analytics, third-party fonts, or recipe uploads. Recipe state and license are local storage only; the CSP allows Sociobot only for the disclosed optional checkout/license verification path. `/privacy` and `/terms` render correctly.
- Live mobile Lighthouse: Performance **98**, Accessibility **100**, Best Practices **100**, SEO **100**; FCP/LCP 2.0 s, TBT 0 ms, CLS 0, transfer 44 KiB.

## Re-run

```sh
npm ci
npm test
npm run lint
npm run build
npm run preview -- --port 4173
AUDIT_URL=http://127.0.0.1:4173 npm run audit:browser
```

Then validate the deployed service worker in Chromium DevTools/Playwright. Ensure `navigator.serviceWorker.getRegistration()` is non-null, a page is controlled after reload, Cache Storage contains the current release shell, offline reload succeeds, and a subsequent version takes control without using stale content.
