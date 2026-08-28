# Dinner Binder

Dinner Binder turns a small set of recipe files into a dependable paper cooking run: scaled servings, ingredient checkboxes, a shared prep timeline, preserved credits, optional allergy notes, and clean page breaks. It is for households planning a week, a trip, or a screen-free meal—not for collecting recipes or scraping websites.

Live product: <https://cookbook-print-run.sociobot.in>

## What it does

- Imports user-owned Markdown (`.md`, `.markdown`) and JSON recipe files, including common schema.org recipe fields.
- Selects and orders recipes, scales numeric ingredient quantities, and lets the cook correct prep/cook times.
- Works backward from one serving time to build a consolidated timeline.
- Prints a cover/timeline plus one recipe per sheet with checkboxes and attribution.
- Keeps the current packet in local browser storage and offers a JSON backup.
- Works offline after the first visit; there are no accounts, trackers, recipe uploads, or CDN assets.

The free version supports three recipes per packet. Binder Plus is a $12 one-time license for unlimited recipes per packet, verified by the Sociobot billing API. Billing is configurable with `VITE_BILLING_BASE`; the default is the production API and no product ID or secret is stored in this repository.

## Recipe formats

A Markdown recipe uses an H1 title plus ingredient and method sections. Optional YAML-style frontmatter can include `servings`, `prepMinutes`, `cookMinutes`, `author`, `source`, `sourceUrl`, `attribution`, and `allergenNotes`.

```md
---
servings: 4
prepMinutes: 15
cookMinutes: 30
author: Your name
sourceUrl: https://example.com/original
---
# Tomato pasta
## Ingredients
- 400 g pasta
- 2 cups tomato sauce
## Method
1. Boil the pasta.
2. Warm the sauce and combine.
```

JSON may contain one recipe, an array, or `{ "recipes": [...] }`. Supported aliases include `name`, `recipeYield`, `prepTime`, `cookTime`, `recipeIngredient`, and `recipeInstructions`.

## Develop and verify

Requires Node.js 20 or newer.

```sh
npm install
npm run dev
npm test
npm run lint
npm run build
```

The exact production build command is `npm run build`; it produces `dist/` with `dist/index.html` at its root. Preview it with `npm run preview`.

The optional browser audit needs a Playwright Chromium installation and a running local server:

```sh
npx playwright install chromium
npm run dev
npm run audit:browser
npm run test:browser
```

`npm run test:browser` builds first, then runs the browser audit against an Azure-shaped static server. It deliberately returns 404 for `staticwebapp.config.json`, the deployment-control file Azure consumes, and verifies a first worker install, an offline reload, and a version-to-version worker update.

## Deploy

Deploy the contents of `dist/` as an Azure Static Web App. `staticwebapp.config.json` provides history fallback, security headers, immutable caching for content-hashed assets, and the AVIF MIME type. Azure consumes that configuration file rather than serving it, so each build explicitly excludes it from the service-worker shell. Each build generates a versioned service-worker cache, removes old release caches on activation, and reloads once when an update takes control; the current shell remains available offline. Infrastructure, DNS, product registration, and billing secrets are intentionally outside this repository.

## Privacy and safety

Recipe data and license tokens remain in browser local storage. Only license purchase/verification contacts Sociobot. Dinner Binder does not infer allergens, verify dietary suitability, or provide food-safety advice. See `/privacy` and `/terms` in the built app.

## Project records

- `.factory/brief.json` — product scope
- `.factory/design.md` — visual system and generated-art provenance
- `.factory/handoff.md` — verification record and known gaps

Licensed under the [MIT License](LICENSE).
