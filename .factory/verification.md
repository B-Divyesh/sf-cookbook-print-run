# Independent verification — FAIL

Work order: `cookbook-print-run-verify-1`  
Verified candidate: `bcf92943481276da92f74b635026a7a08bae05c9` (`bcf9294`)  
Verified URL: <https://cookbook-print-run.sociobot.in>  
Date: 2026-08-27

## Verdict

**FAIL.** The product meets most of the static-web and printable-packet contract, and the live deployment is byte-identical to the candidate build. It cannot ship as a PWA because the service worker update path preserves stale application content indefinitely. Two additional usability/accessibility and delivery-policy defects are recorded below.

## Gates run

- Clean checkout confirmed at the requested commit; `npm ci` completed with 0 reported vulnerabilities.
- `npm test`: **PASS** — 2 files / 10 tests.
- `npm run build`: **PASS** — TypeScript `--noEmit` and Vite production build. There is no lint script in `package.json`.
- Built output: JS 31,268 B raw / 11,066 B gzip; CSS 18,127 B raw / 4,910 B gzip; largest image 40,070 B. All are within the supplied static-product budgets.
- `AUDIT_URL=http://127.0.0.1:4173 npm run audit:browser`: **PASS** — 390 px samples flow, print-media isolation, offline reload, zero axe findings, and no Playwright console/page errors.
- Independent Playwright checks: **PASS except defects below.** Exercised desktop (1440 px) and mobile (390 px), native keyboard activation, reduced motion, malformed/oversize/wrong-type imports, schema.org JSON import, free-limit recovery, preservation of attribution/allergen notes, remove/undo, print sheets, privacy/terms, and offline reload.
- Axe: **0 serious/critical** violations on the app (desktop and 390 px) and `/privacy` and `/terms` (390 px).
- Lighthouse against the live deployment: Performance **100**, Accessibility **100**, Best Practices **100**, SEO **100**; FCP 0.9 s, LCP 1.0 s, TBT 40 ms, CLS 0, transfer 43 KiB.

## Product evidence

- The normal first-run path loads all three supplied recipes and produces a four-sheet packet (cover/timeline plus three recipes) on both desktop and 390 px mobile.
- A representative schema.org JSON recipe imported with author, URL, ISO 8601 durations, ingredient array, instruction object, and allergen note. Its printed sheet retained `By/source: M. Cook` and the supplied allergen note.
- Recovery messages were correct for malformed JSON, `.txt`, and a 2,000,001-byte Markdown file. The fourth free recipe was left unselected and selecting it produced the explicit three-recipe-limit message.
- Keyboard checks: Enter loaded samples and moved a recipe; Space toggled a native selection. The visible focus style is a solid outline plus saffron ring. Reduced-motion made recipe animation duration `0.01ms`. Neither tested viewport overflowed.
- The live first-run browser requested only `https://cookbook-print-run.sociobot.in`; source review and CSP allow Sociobot only for the explicit paid-license path. No analytics/CDN runtime request was observed. Recipe state and license are local storage only, as documented. CSP, HSTS, `nosniff`, referrer policy, permissions policy, and legal pages are present.
- Live `index.html`, hashed JS, hashed CSS, and `sw.js` SHA-256 values exactly matched the fresh candidate `dist/` output.

## Defects

### P1 — PWA updates retain stale application content

`public/sw.js` fixes the cache name to `dinner-binder-v1` (line 1), only deletes *other* cache names during activation (lines 9–13), and serves any matching cache entry before the network (lines 16–25). A subsequent service-worker script can activate, but it reuses that same cache and never refreshes cached `/` or previously cached hashed assets.

Controlled evidence: after first load, Cache Storage contained `dinner-binder-v1` with `/` and `/manifest.webmanifest`. Seeding the existing cache’s `/` entry with an old document and reloading **while online** returned `OLD DEPLOYMENT CACHE`. This is the exact state a later deployment leaves behind because the cache key is unchanged and the strategy is cache-first. Offline reload itself passes, but service-worker update does not; this violates the required PWA update check and can strand users on old code.

Required fix: derive a cache version from the build/release, precache the current shell/assets under it, remove prior versions on activation, and provide an update/reload path (or use a proven Vite PWA strategy). Add an automated update regression test.

### P2 — Invalid numeric fields visibly disagree with the printed packet

For `Serves`, entering `0` leaves the field visibly at `0` while the preview says `Serves 1`; entering `100` leaves the field visibly at `100` while the preview says `Serves 99`. The same `numberField` implementation is used for prep/cook bounds. The handler clamps model state but calls only `persistAndRenderPreview`, so the invalid source input is not re-rendered or explained ([`src/main.ts`](../src/main.ts) lines 399–403).

This makes an invalid boundary value look accepted while printing a different value, which is unsuitable for a reliable cooking packet. Required fix: re-render the edited control with the clamped value and announce a specific validation message, or block the value until corrected. Cover min/max for all numeric fields in UI tests.

### P2 — Remove action drops keyboard focus; Undo takes 24 Tab stops to reach

On keyboard activation of `Remove`, the focused control is removed during the full render and focus falls to `<body>`. The displayed Undo control remains reachable, but required 24 forward Tab stops in the 390 px flow before it could be activated. This weakens the required keyboard/reversible destructive-action path.

Required fix: move focus directly to the Undo button after rendering (or to a stable, meaningful successor) and preserve the announcement.

### P2 — Live hashed assets are not long-lived immutable cached

The live deployment returns `Cache-Control: public, must-revalidate, max-age=30` for `/assets/index-B2Ek_MxX.js`, `/assets/index-TMErduZr.css`, and image assets. The supplied performance contract requires long-lived immutable caching for hashed static assets. Required fix: configure the deployment/static-web response policy so content-hashed assets receive `public, max-age=31536000, immutable`; keep HTML/service worker short-lived.

### P3 — AVIF is sent as `application/octet-stream`

Both sampled AVIF assets return `Content-Type: application/octet-stream`, despite the `.avif` extension. Chromium rendered the workflow successfully, but this is an incorrect response type and can impair optimization/compatibility. Required fix: map `.avif` to `image/avif` in deployment MIME configuration.

## Deployment comparison and response policy evidence

`curl` against the live root returned HTTP/2 200 with the expected security headers and 689-byte document. SHA-256 matched local fresh output for:

- `dist/index.html`
- `dist/assets/index-B2Ek_MxX.js`
- `dist/assets/index-TMErduZr.css`
- `dist/sw.js`

`/privacy` and `/terms` return the app shell and render their respective legal pages. `/no-such-route` also returns the shell, as configured. The candidate is therefore deployed; this is not a deployment-only mismatch.

## Re-run

```sh
npm ci
npm test
npm run build
npm run preview -- --port 4173
AUDIT_URL=http://127.0.0.1:4173 npm run audit:browser
```

Use a Chromium/Playwright context to reproduce the PWA issue: load once, wait for service-worker control, inspect `caches.open('dinner-binder-v1')`, then observe that the cache-first worker serves its existing `/` entry even while online. Re-test a real version-to-version deployment after the cache-version fix.
