# Dinner Binder visual thesis

## Direction: measured mise en place

Dinner Binder uses **generative geometry** derived from the physical acts of cooking and binding: nested paper rectangles, punched circles, ingredient dots, ruled lines, and clock arcs. Geometry is functional—showing packet order, recipe count, servings, and prep sequence—rather than decorative wallpaper. The interface should feel like arranging a calm workbench before the burners go on: precise, warm, tactile, and ready to print.

The product is intentionally light-first. Its destination is white paper, so a dark theme would make the authoring view and output disagree. Explicit cream and ink surfaces make that single-mode choice clear while preserving printer fidelity.

## Tokens

- `paper #F7F2E8`: warm uncoated stock; page background.
- `sheet #FFFDF8`: clean recipe paper; primary surface.
- `ink #252522`: near-black pencil/letterpress; primary text.
- `muted #625F56`: graphite annotation; secondary text (≥ 4.5:1 on paper).
- `beet #A33A4B`: pantry-label red; primary action and focus.
- `beet-dark #762536`: pressed action and high-contrast links.
- `celery #DDE7C7`: fresh produce wash; selection/success surface.
- `herb #315D48`: success text.
- `saffron #F2C15D`: time and attention markers.
- `danger #9C2F2F`: errors and destructive actions.

Spacing follows a 4 px base rhythm: 4, 8, 12, 16, 24, 32, 48, 64. Corners are deliberately mixed: paper panels use 2–6 px radii; circular controls and counters echo binder holes and timer dials. Shadows are offset and slightly hard, like stacked card stock, not floating glass.

## Type

- **Headings:** Georgia, `Times New Roman`, serif—editorial, familiar on printed recipes, and available without a network request.
- **UI and recipe body:** system sans (`Inter`-like platform stack)—fast, highly legible, and neutral beside food content.
- Numeric times and serving values use tabular figures. Body is at least 16 px with 1.5 line height; print body is 10.5–11 pt.

## Layout and interaction grammar

The app is a three-step workbench: **Add recipes → Set the run → Print packet**. A narrow status rail records progress, while the active work area has large, direct controls. Imported recipes appear as independent sheets with a visible punched-hole marker. Selection is expressed with both a checkbox and a green wash. Recipe order is controllable with labeled arrow buttons; the order is the print order.

Desktop uses a 12-column workspace with the intro/controls and packet preview in balanced columns. At 390 px everything becomes one deliberate sequence; ornamental geometry reduces, actions become full-width, and no fixed bar obscures the safe area. The printable artifact leaves all app chrome behind and uses forced page breaks for predictable sheets.

## Motion

Controls respond in 160–220 ms. Newly parsed recipe sheets enter with a short vertical-to-rest motion, mirroring a page being laid down. Step and selection state changes use opacity and color. There are no loops. Under `prefers-reduced-motion: reduce`, all transforms and scrolling become instant while state remains visible through shape, label, and contrast.

## Asset plan and provenance

The hero illustration is a generated editorial still life used only in the empty/onboarding state. It clarifies the output: a physical packet, ingredient checks, and a prep clock. Functional icons are hand-authored inline SVG with `currentColor`; decorative geometry is CSS, keeping the interface sharp and tiny.

### Prompt sheet

**Subject:** top-down arrangement of three cream recipe sheets with abstract ingredient tokens, binder holes, checkmarks, and a circular kitchen timer arc. **World:** quiet kitchen prep table interpreted through bold geometric paper collage. **Materials:** uncoated paper, cut card, subtle risograph ink grain. **Light:** diffuse morning side light, restrained soft shadows. **Lens/composition:** orthographic top-down, landscape, main packet centered-right with breathing room. **Palette words:** warm cream, beet red, dark graphite, celery green, saffron. **Negative list:** people, hands, readable words, letters, numbers, logos, brands, watermarks, photoreal food, glossy 3D, gradients, UI screenshot.

Final asset prompt is stored beside the source image in `assets/src/dinner-packet-hero.prompt.json`. Generated with the factory image model (`factory-image`, Azure AI Foundry) on 2026-08-27. The result is original generated imagery for this product; reviewed for text artifacts, unintended symbols, and visual seams. Production exports are WebP and AVIF, each kept under the 300 KB hero budget.

## Accessibility intent

Information never depends on color: selections retain native checkboxes, errors include text, and sequence uses numbers. Focus is a 3 px saffron ring plus ink outline. Touch targets are at least 44 px. Print checkboxes remain high-contrast outlines. Allergens are notes supplied by the user—not inferred—and every relevant surface repeats that limitation.
