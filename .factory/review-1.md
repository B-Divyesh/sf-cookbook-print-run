# Adversarial first-read review 1 — Dinner Binder

Work order: `cookbook-print-run-review-1`

Reviewed URL: <https://cookbook-print-run.sociobot.in>

Reviewed repository base: `bd248fcc0210e7791c3b414e38c3f930ca576827`

Date: 2026-08-28

Verdict: **FAIL**

The product has five blocking findings. It therefore cannot pass regardless of the minor-finding count.

## Cold first screen

Fresh Chromium contexts were opened at 390 × 844 and 1440 × 900 before the local product copy was read.

- **What it does, in my words:** turns owned Markdown or JSON recipe files into a timed packet to print for cooking.
- **For whom:** not stated on the first screen. “Your recipes” does not identify the household, trip, weekly-planning, or screen-free-kitchen situation from the brief.
- **What to click first:** not answerable before scrolling. At 390 px, the viewport ends in the “Add your recipe files” area before any action. At 1440 px, it ends at that section's heading. The visible “Add recipes / Set the run / Print packet” strip looks like progress, not a primary action.

The exact first-screen copy was: “YOUR RECIPES. ONE CALM COOKING RUN.”, “From recipe files to dinner on paper.”, and “Gather the recipes you already own, line up the timing, and print a clean kitchen packet—no ads, accounts, or open tabs.” It communicates the rough output, but not a named audience or a first click.

## Findings, ordered by severity

### BLOCKING 1 — The first screen does not identify the user or expose a first action

**Quote:** “Your recipes. One calm cooking run.” / “From recipe files to dinner on paper.” / “Add recipes · Set the run · Print packet.”

**Why this loses a first-time visitor:** the visitor can infer the file-to-paper job, but cannot confirm that this is for coordinating several recipes for a week, trip, or screen-free meal. Neither viewport shows a clickable primary action before scrolling. The numbered strip supplies no action affordance.

**Concrete fix:** use a job headline such as “Print a timed packet from recipe files.” Follow it with “For households coordinating several recipes for a week, trip, or screen-free meal.” Put **Try it with sample data** and “Opens three recipes and a ready-to-print timeline” beside it above the fold. Show three short facts: “Stays in this browser”, “Works offline after the first visit”, and “Three recipes free”.

### BLOCKING 2 — The sample path writes into real storage and is not a demo

**Quote:** “Try 3 sample recipes” and “Clear all recipes.” There is no “Demo — sample data, nothing is saved” banner, “Reset demo,” or “Start for real.”

**Why this misleads a first-time visitor:** the one-click sample does load three realistic recipes and a four-sheet packet, but it saves them under the real key `dinner-binder:packet:v1`. In a context seeded with “My real stew,” clicking the sample action changed the same record to contain “My real stew” plus all three samples. “Clear all recipes” is a destructive confirmation for the combined data; it is not a demo reset. `/demo` and `/?demo=1` reuse whatever is already in real storage and show no demo state.

**Concrete fix:** add `/demo` as a direct, seeded route using a separate `demo:` storage namespace or memory only. Show the persistent required banner, make **Reset demo** restore the original three samples, make **Start for real** discard demo state, and add a browser test that seeds real data, exercises every demo edit, and confirms the real key is byte-for-byte unchanged.

### BLOCKING 3 — The claims registry and tagged claim tests do not exist

**Quote:** `.factory/claims.json` is absent. Repository search found no `@claim:` tag.

**Why this misleads a first-time visitor:** visitors are asked to rely on offline, privacy, import, scaling, page-break, backup, free-limit, and paid-license claims without the required claim inventory or one observable sandbox test per claim. The general tests passing does not connect a specific public sentence to its proof.

**Concrete fix:** create `.factory/claims.json`; give every claim below one test tagged `@claim:<id>`; run it only through the isolated demo from clean state. Remove any sentence that cannot be tested.

Every claim-like sentence is currently unlisted:

| ID to add | Exact claim or grouped repeated quote | Required observable test |
|---|---|---|
| `offline-reload` | “Works offline”; README: “Works offline after the first visit” | Load `/demo`, wait for the worker, go offline, reload, edit sample data, and confirm the UI and saved demo state. |
| `local-only-recipes` | “Nothing is uploaded. Files stay in this browser.”; “Private by default”; README local-storage/no-upload claims | Intercept the full import, edit, reset, and export flow; assert no request leaves the origin and no real storage key changes. |
| `no-accounts-trackers-cdn` | “no ads, accounts, or open tabs”; README: “there are no accounts, trackers, recipe uploads, or CDN assets” | Record all requests and storage/cookie changes in a clean demo; assert the stated absences. Split “open tabs” into its own functional assertion or remove it. |
| `input-formats-size` | “Markdown or JSON · up to 2 MB each”; README import and schema.org claims | Import supported Markdown, JSON, and schema.org fixtures; reject a file over 2 MB with the promised error. |
| `sample-packet` | “load the three samples to see a complete packet in seconds” | Open `/demo`; assert three named recipes and four sheets. If “in seconds” remains, measure and assert a numeric ceiling. |
| `select-order-scale` | README: “Selects and orders recipes, scales numeric ingredient quantities, and lets the cook correct prep/cook times.” | Select, reorder, rescale, and edit times; assert the printed preview values and order. |
| `shared-timeline` | “line up the timing”; README: “Works backward from one serving time to build a consolidated timeline.” | Set a serving time and assert the calculated event times for all samples. |
| `one-recipe-per-sheet` | “Each recipe starts on a new sheet”; README cover/page-break claims | Inspect print media and assert a cover followed by one forced-break sheet per selected recipe. |
| `attribution-allergy` | README preserved credits/allergy-note claims; landing: “Dinner Binder preserves notes you supply” | Import credited/allergy fixtures and assert exact preservation in edit and print views. |
| `json-backup` | “Download backup”; README: “offers a JSON backup” | Download and parse the file; assert every expected recipe and packet field. |
| `free-limit` | “The free version prints up to three recipes per packet”; README equivalent | Load four samples/fixtures without a license and assert that no more than three can be selected or printed. |
| `plus-price-unlimited` | “Binder Plus removes that limit for $12 once—no subscription, account, or cloud recipe storage”; README equivalent | Use a billing sandbox/license fixture; assert the exact price, one-time entitlement, unlimited selection, and stated storage/network behavior. |
| `billing-api` | README: license is “verified by the Sociobot billing API”; `VITE_BILLING_BASE` behavior | Run against an approved fake server and assert the endpoint, request scope, response handling, and configured base URL. |
| `runtime-requirement` | README: “Requires Node.js 20 or newer.” | Run install, test, and build in the oldest supported Node 20 release. |
| `build-output` | README: `npm run build` “produces `dist/` with `dist/index.html`” | Build from clean checkout and assert the documented files. |
| `browser-audit-behavior` | README claims about Azure-shaped 404, first worker install, offline reload, and worker update | Keep the existing integration assertions, but register them as separately tagged claims. |
| `documented-routes` | README: “See `/privacy` and `/terms` in the built app.” | Direct-load both routes and assert their titles, h1s, links, and content. |
| `project-records-license` | README says the three `.factory` records exist and the project uses the MIT License | Assert those files exist and that `LICENSE` contains the expected MIT text. |
| `safety-boundary` | “does not detect allergens or provide dietary or food-safety advice”; README equivalent | Confirm imported notes are copied verbatim and no inferred safety result is shown; otherwise phrase this only as a limitation. |

The live privacy exercise itself produced no requests after initial load while samples were loaded, a serving was edited, and a private Markdown file was imported. Offline reload also retained four recipes and showed “Offline now — edits are safe.” Those are useful observations, but they do not repair the missing registry, missing isolation, or missing claim tags.

### BLOCKING 4 — The paid primary link is dead

**Quote:** “Buy Binder Plus — $12.”

**Why this misleads a first-time visitor:** both HEAD and GET to `https://api.sociobot.in/api/v1/products/cookbook-print-run/checkout` returned HTTP 404 with `{"error":"enabled factory product","status":404}`. The page presents a purchasable $12 product that cannot be purchased.

**Concrete fix:** do not show the buy action until the product is enabled. Configure the approved Sociobot product and return URL, then add a non-charging claim test that verifies the checkout route reaches the expected checkout screen and that cancel/back returns safely.

### BLOCKING 5 — Unknown routes impersonate the home page instead of showing a 404

**Quote:** `/definitely-missing` returned HTTP 200 with the home headline “From recipe files to dinner on paper.” `/demo` also returned the ordinary home app.

**Why this loses a first-time visitor:** a mistyped or stale URL looks valid and offers no explanation or route home. It also hides the absence of the required demo route. This is broken routing under the supplied structure contract.

**Concrete fix:** route unknown paths to a designed Dinner Binder 404 with a single **Return to Dinner Binder** link. Recognize `/demo` separately. Add direct-load, reload, back/forward, title, h1-focus, and 404 tests for every route.

### MAJOR 1 — Required discovery and sharing metadata is absent

**Quote:** the live DOM has no canonical link, Open Graph title/description/image, Twitter card, favicon, or apple-touch icon on `/`, `/privacy`, or `/terms`.

**Why this matters:** shared links have no controlled preview, duplicate route URLs have no canonical identity, and saved tabs/home-screen entries have no product mark.

**Concrete fix:** add route-correct canonical metadata, Open Graph and Twitter metadata, a real 1200 × 630 image based on the paper-collage art, an SVG favicon, and a 180 px apple-touch icon. Test the resolved URLs on every route.

### MAJOR 2 — Route focus, header/footer consistency, and touch targets miss the site contract

**Quote:** after activating “Privacy,” `document.activeElement` was `BODY`, not the new h1. The legal header contains only “Dinner Binder,” while home contains “Dinner Binder” and “Binder Plus.” Footers alternate between “Private by default · Works offline · Generated illustration” and “Made for paper-first kitchens.” None includes “Built by Param Factory” or a version/build ID. Footer “Privacy” and “Terms” links measured about 20 px high; desktop “Binder Plus” measured 21 px high.

**Why this matters:** keyboard and screen-reader users do not receive the required route transition, navigation changes between pages, release identity is unavailable during support, and link hit areas miss the 44 px touch baseline.

**Concrete fix:** use one header and footer component on all routes; include Demo and Privacy in the header and Privacy/Terms, “Built by Param Factory,” and a build ID in the footer. On navigation, update the title, focus a `tabindex="-1"` h1, and announce it. Give all link targets at least 44 × 44 CSS pixels. Add keyboard and target-size tests.

### MAJOR 3 — Landing and README copy uses metaphors, unmeasured adjectives, and inconsistent names

**Quote:** “calm cooking run,” “clean kitchen packet,” “workbench,” “complete packet in seconds,” “A one-time kitchen upgrade,” “Build bigger binders,” and README “dependable paper cooking run.”

**Why this matters:** “cooking run,” “kitchen packet,” “packet,” “print run,” and “binder” compete for the same output. A new visitor must translate the metaphors before understanding the workflow. “Calm,” “clean,” and “dependable” are subjective; “in seconds” is an unregistered quantitative claim.

**Concrete fix:** use **cooking packet** for the output everywhere and **recipe list** for the editable workspace. Example rewrites: “No recipes added yet”; “Add a recipe file or open the sample packet”; “Print more than three recipes”; “The free version prints three recipes per cooking packet”; and “Open three sample recipes and their print preview.” Remove “in seconds” unless a measured threshold is registered.

## Copy audit

Counts below treat each whitespace-separated token as one word; URLs, paths, commands, and hyphenated terms count as one. Code fences are excluded except for the two user-facing recipe-method sentences. No landing sentence exceeds 22 words. Flags are listed after the inventories.

### Landing-page sentences and sentence-like copy

| # | Words | Copy |
|---:|---:|---|
| 1 | 2 | Works offline. |
| 2 | 2 | Your recipes. |
| 3 | 4 | One calm cooking run. |
| 4 | 7 | From recipe files to dinner on paper. |
| 5 | 21 | Gather the recipes you already own, line up the timing, and print a clean kitchen packet—no ads, accounts, or open tabs. |
| 6 | 9 | Markdown or JSON · up to 2 MB each. |
| 7 | 4 | Drop recipe files here. |
| 8 | 6 | Or choose files from your device. |
| 9 | 3 | Nothing is uploaded. |
| 10 | 5 | Files stay in this browser. |
| 11 | 5 | 0 selected · 3 free. |
| 12 | 4 | Your workbench is clear. |
| 13 | 5 | Add a recipe to begin. |
| 14 | 19 | Use your own Markdown or JSON export, or load the three samples to see a complete packet in seconds. |
| 15 | 7 | Each recipe starts on a new sheet. |
| 16 | 8 | Select a recipe above to assemble the packet. |
| 17 | 4 | A one-time kitchen upgrade. |
| 18 | 3 | Build bigger binders. |
| 19 | 10 | The free version prints up to three recipes per packet. |
| 20 | 14 | Binder Plus removes that limit for $12 once—no subscription, account, or cloud recipe storage. |
| 21 | 2 | Free packet. |
| 22 | 7 | Up to three recipes per print run. |
| 23 | 3 | Have a license? |
| 24 | 2 | Restore it. |
| 25 | 6 | Allergy notes are yours to verify. |
| 26 | 17 | Dinner Binder preserves notes you supply; it does not detect allergens or provide dietary or food-safety advice. |
| 27 | 7 | Always check original recipes and ingredient labels. |
| 28 | 3 | Private by default. |
| 29 | 2 | Works offline. |
| 30 | 2 | Generated illustration. |

Other visible labels/actions: “Dinner Binder” (2), “Binder Plus” (2), “Add recipes” (2), “Set the run” (3), “Print packet” (2), “Step 01/02/03” (2 each), “Add your recipe files” (4), “Set the cooking run” (4), “Check and print” (3), “Packet name” (2), “Serve everything at” (3), “Print preview” (2), “0 sheets” (2), “License token” (2), “Privacy” (1), and “Terms” (1).

Action-label audit:

| Label | Words | Flag and rewrite |
|---|---:|---|
| Choose files | 2 | Does not name the result. Use **Add recipe files**. |
| Try 3 sample recipes | 4 | Does not use the required unambiguous demo label. Use **Try it with sample data**. |
| Clear all recipes | 3 | Passes as a result-naming action, but must not serve as demo reset. |
| Print packet | 2 | Passes. |
| Download backup | 2 | Passes. |
| Buy Binder Plus — $12 | 5 | Passes as copy; its destination is broken. |
| Have a license? Restore it | 5 | “It” is ambiguous. Use **Restore Binder Plus license**. |
| Verify license | 2 | Passes. |

### README sentences

| # | Words | Copy |
|---:|---:|---|
| 1 | **32** | Dinner Binder turns a small set of recipe files into a dependable paper cooking run: scaled servings, ingredient checkboxes, a shared prep timeline, preserved credits, optional allergy notes, and clean page breaks. |
| 2 | 19 | It is for households planning a week, a trip, or a screen-free meal—not for collecting recipes or scraping websites. |
| 3 | 3 | Live product: https://cookbook-print-run.sociobot.in |
| 4 | 14 | Imports user-owned Markdown (`.md`, `.markdown`) and JSON recipe files, including common schema.org recipe fields. |
| 5 | 15 | Selects and orders recipes, scales numeric ingredient quantities, and lets the cook correct prep/cook times. |
| 6 | 11 | Works backward from one serving time to build a consolidated timeline. |
| 7 | 12 | Prints a cover/timeline plus one recipe per sheet with checkboxes and attribution. |
| 8 | 13 | Keeps the current packet in local browser storage and offers a JSON backup. |
| 9 | 16 | Works offline after the first visit; there are no accounts, trackers, recipe uploads, or CDN assets. |
| 10 | 8 | The free version supports three recipes per packet. |
| 11 | 18 | Binder Plus is a $12 one-time license for unlimited recipes per packet, verified by the Sociobot billing API. |
| 12 | 22 | Billing is configurable with `VITE_BILLING_BASE`; the default is the production API and no product ID or secret is stored in this repository. |
| 13 | 12 | A Markdown recipe uses an H1 title plus ingredient and method sections. |
| 14 | 14 | Optional YAML-style frontmatter can include `servings`, `prepMinutes`, `cookMinutes`, `author`, `source`, `sourceUrl`, `attribution`, and `allergenNotes`. |
| 15 | 12 | JSON may contain one recipe, an array, or `{ "recipes": [...] }`. |
| 16 | 10 | Supported aliases include `name`, `recipeYield`, `prepTime`, `cookTime`, `recipeIngredient`, and `recipeInstructions`. |
| 17 | 3 | Boil the pasta. |
| 18 | 5 | Warm the sauce and combine. |
| 19 | 5 | Requires Node.js 20 or newer. |
| 20 | 17 | The exact production build command is `npm run build`; it produces `dist/` with `dist/index.html` at its root. |
| 21 | 6 | Preview it with `npm run preview`. |
| 22 | 14 | The optional browser audit needs a Playwright Chromium installation and a running local server. |
| 23 | 15 | `npm run test:browser` builds first, then runs the browser audit against an Azure-shaped static server. |
| 24 | **25** | It deliberately returns 404 for `staticwebapp.config.json`, the deployment-control file Azure consumes, and verifies a first worker install, an offline reload, and a version-to-version worker update. |
| 25 | 11 | Deploy the contents of `dist/` as an Azure Static Web App. |
| 26 | 16 | `staticwebapp.config.json` provides history fallback, security headers, immutable caching for content-hashed assets, and the AVIF MIME type. |
| 27 | 19 | Azure consumes that configuration file rather than serving it, so each build explicitly excludes it from the service-worker shell. |
| 28 | **27** | Each build generates a versioned service-worker cache, removes old release caches on activation, and reloads once when an update takes control; the current shell remains available offline. |
| 29 | 12 | Infrastructure, DNS, product registration, and billing secrets are intentionally outside this repository. |
| 30 | 10 | Recipe data and license tokens remain in browser local storage. |
| 31 | 5 | Only license purchase/verification contacts Sociobot. |
| 32 | 13 | Dinner Binder does not infer allergens, verify dietary suitability, or provide food-safety advice. |
| 33 | 8 | See `/privacy` and `/terms` in the built app. |
| 34 | 4 | `.factory/brief.json` — product scope. |
| 35 | 7 | `.factory/design.md` — visual system and generated-art provenance. |
| 36 | 7 | `.factory/handoff.md` — verification record and known gaps. |
| 37 | 5 | Licensed under the MIT License. |

README headings are “Dinner Binder,” “What it does,” “Recipe formats,” “Develop and verify,” “Deploy,” “Privacy and safety,” and “Project records.” They make sense in the README outline.

### Copy flags and proposed rewrites

Each row is a copy finding.

| ID | Flag | Exact copy | Proposed rewrite |
|---|---|---|---|
| C1 | Over 22 words | README sentence 1 (32 words) | “Dinner Binder turns recipe files into a printable cooking packet. It scales servings, adds checkboxes, builds one timeline, preserves credits, and starts each recipe on a new sheet.” |
| C2 | Over 22 words | README sentence 24 (25 words) | “The test server returns 404 for `staticwebapp.config.json`, which Azure consumes during deployment. It also tests installation, offline reload, and updates between releases.” |
| C3 | Over 22 words | README sentence 28 (27 words) | “Each build creates a versioned service-worker cache and removes older caches. When an update takes control, the app reloads once and remains available offline.” |
| C4 | Inconsistent term | “cooking run,” “kitchen packet,” “packet,” “print run,” and “binder” | Use **cooking packet** for the output everywhere. Reserve “Dinner Binder” for the product name. |
| C5 | Subjective marketing adjectives | “calm,” “clean,” and “dependable” | State observable results: “Print a timed cooking packet with one recipe per sheet.” |
| C6 | Untested quantitative wording | “see a complete packet in seconds” | “Open three sample recipes and their print preview,” or register and test a numeric time limit. |
| C7 | Jargon/metaphor | “Your workbench is clear” | “No recipes added yet.” |
| C8 | Jargon/metaphor | “A one-time kitchen upgrade” / “Build bigger binders.” | “Print more than three recipes.” |
| C9 | Jargon | “consolidated timeline” | “one timeline for all selected recipes.” |
| C10 | Jargon | “Azure-shaped static server,” “deployment-control file,” “version-to-version worker update” | “a local server that matches Azure Static Web Apps,” “Azure configuration file,” and “service worker update between releases.” |
| C11 | Jargon | “YAML-style frontmatter” and raw field aliases | “Optional settings go between the opening `---` lines.” Keep the exact field list in a reference table. |
| C12 | Jargon | “generated-art provenance” | “image source and generation record.” |
| C13 | Heading unclear out of context | “From recipe files to dinner on paper.” | “Print a timed packet from recipe files.” |
| C14 | Heading unclear out of context | “Set the cooking run” | “Choose recipes and serving time.” |
| C15 | Heading unclear out of context | “Check and print” | “Preview and print the cooking packet.” |
| C16 | Button not result-naming | “Choose files” | **Add recipe files**. |
| C17 | Demo button ambiguous | “Try 3 sample recipes” | **Try it with sample data**. |
| C18 | Collapsed action uses a pronoun | “Have a license? Restore it” | **Restore Binder Plus license**. |
| C19 | Footer copy is internal provenance, not visitor guidance | “Generated illustration” | Remove it from the product footer; keep provenance in `.factory/design.md`. |

## Structure, accessibility, and identity checks

| Check | Result | Evidence |
|---|---|---|
| Title pattern and length | Pass on `/`, `/privacy`, `/terms` | “Dinner Binder — print a cooking run,” “Privacy — Dinner Binder,” and “Terms — Dinner Binder.” `/demo` and unknown routes incorrectly keep the home title. |
| One h1, `lang`, and `main` | Pass on tested routes | One h1, `lang="en"`, and one main landmark. |
| Meta description | Partial | Present and under 155 characters, but reused on legal pages. |
| Canonical/OG/Twitter/favicon | Fail | All absent in the live DOM. |
| Designed 404 | Blocking fail | Unknown path renders home with HTTP 200. |
| Deep links/back button | Partial | `/privacy` and `/terms` load and browser back restores scroll; `/demo` is not implemented. |
| Focus on route change | Fail | Focus remains on `BODY`; the h1 is not focused or announced. |
| Link crawl | Blocking fail | Same-origin links returned 200. The paid checkout link returned 404. |
| Header/footer consistency | Fail | Legal header/footer copy differs; required navigation, Param Factory credit, and build ID are missing. |
| Axe serious/critical | Pass | Live axe runs at 390 px and 1440 px returned zero violations. |
| Touch targets | Fail | Footer links and desktop “Binder Plus” are about 20–21 px high, below 44 px. |
| Reduced motion | Pass | Emulated reduced motion resolves scroll behavior to `auto`. |
| Visual identity | Pass | The cream/beet/celery paper geometry, binder holes, ruled sheets, editorial serif, and hard card-stock shadows are distinct from a generic SaaS template and match `.factory/design.md`. |
| Internal crawl/support files | Pass | Home, Privacy, Terms, hash links, `robots.txt`, `sitemap.xml`, and `manifest.webmanifest` returned 200. |

## Verification record

Run from the clean worktree before review documents were added:

- `npm ci` — pass; 58 packages installed, 0 vulnerabilities reported.
- `npm test` — pass; 11 tests in 3 files. These are not tagged claim tests.
- `npm run build` — pass; `dist/` produced. App JS is 31.54 kB raw / 11.22 kB gzip; CSS is 18.13 kB raw / 4.90 kB gzip.
- `npm run test:browser` — pass; sample rendering, scaling, keyboard removal/undo, mobile/desktop overflow, print media, legal pages, offline reload/update, and axe checks passed.
- Live fresh-context checks — no console errors; sample button was below the initial 390 px viewport at y=958; three samples rendered; real storage contamination reproduced; `/demo` was not isolated; unknown route rendered home; route focus failed; paid link returned 404.
- Live privacy/offline exercise — no post-load requests during sample load, edit, and private-file import; offline reload succeeded with retained data. This verifies current behavior only, not the required demo sandbox.

## Verdict

**FAIL.** The page is visually distinct and the underlying recipe-to-print workflow works, but a first-time phone visitor is not given an audience or first action above the fold. The sample path changes real data, the claims system is absent, checkout is dead, and routing has no real demo or 404 state. These must be corrected and independently re-reviewed before release.
