# Dinner Binder

Dinner Binder turns recipe files into a printable cooking packet. It is for households planning a week, trip, or screen-free meal.

Live product: <https://cookbook-print-run.sociobot.in>

One-click demo: <https://cookbook-print-run.sociobot.in/demo>

## What it does

- Imports owned Markdown and JSON recipe files up to 2 MB each. Common schema.org recipe fields work too.
- Selects and orders recipes, scales numeric ingredient amounts, and updates prep or cook times.
- Works backward from one serving time to build one timeline for all selected recipes.
- Prints a cover and timeline, followed by one recipe per sheet.
- Preserves supplied credits and allergy notes in the editor and print view.
- Stores the current cooking packet in this browser and downloads a JSON backup.
- Works offline after the first visit. It has no accounts, trackers, recipe uploads, or CDN assets.

The free version prints three recipes per cooking packet. New Binder Plus purchases are paused until the approved checkout is enabled.

## Try the isolated demo

Open `/demo` or `/?demo=1` to load three sample recipes and a four-sheet print preview. Demo changes use only `demo:dinner-binder:packet:v1` in local storage.

The demo never reads or changes `dinner-binder:packet:v1`, the real recipe key. “Reset demo” restores the three samples. “Start for real” deletes demo data.

See [the demo record](.factory/demo.md) for the sample names and verification details.

## Recipe formats

A Markdown recipe uses an H1 title plus ingredient and method sections. Optional settings go between the opening `---` lines.

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

JSON can contain one recipe, an array, or `{ "recipes": [...] }`. Supported aliases include common schema.org Recipe field names.

## Develop and verify

Use Node.js 20 or a newer maintained release.

```sh
npm ci
npm run dev
npm test
npm run lint
npm run build
npm run test:claims
npm run test:browser
```

`npm run build` creates `dist/index.html` and the service worker. `npm run test:claims` runs every public claim against the isolated demo.

Each command in `.factory/claims.json` runs one claim by ID. The browser suite also checks accessibility, mobile layout, print output, routing, and offline updates.

## Deploy

Deploy `dist/` as an Azure Static Web App. The supplied configuration adds history fallback, security headers, asset caching, and AVIF support.

The service worker caches the application shell and removes old Dinner Binder caches during an update. Azure consumes `staticwebapp.config.json` during deployment.

## Privacy and safety

Recipe content stays in local browser storage. Only an existing license check may contact Sociobot, and demo mode never performs that check.

Dinner Binder copies allergy notes you provide. It does not detect allergens or provide dietary, medical, or food-safety advice.

Read the built-in [Privacy](https://cookbook-print-run.sociobot.in/privacy) and [Terms](https://cookbook-print-run.sociobot.in/terms) pages.

## Project records

- `.factory/brief.json` — product scope
- `.factory/design.md` — visual system and image source
- `.factory/demo.md` — isolated demo behavior
- `.factory/claims.json` — public claims and tests
- `.factory/handoff.md` — verification record and known gaps

Licensed under the [MIT License](LICENSE).
