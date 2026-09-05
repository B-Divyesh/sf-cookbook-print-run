# Dinner Binder handoff — strict review 2

Work order: `cookbook-print-run-review-2`

Date: 2026-09-05
Live URL: <https://cookbook-print-run.sociobot.in>

Verdict: **FAIL — 2 findings and 1 untested public claim**

## Reviewed candidates

- Implementation: `41de89df029b490b2c2a51480e892ab6ebb10402`
- Validation suite: `a72a5c5b9c6ac9958df4434f2c353915d7c2cdd3`
- Documentation: `2cf60579dd255ed1980c7ba4b6cbbdcb0b8acd53`
- Review base: `77ff9fbc7a98487ced8c2fcb40f4e8c2c4a350fd`

The clean build matches the live HTML, JavaScript, and CSS byte for byte. The service worker matches after normalizing its release cache identifier. Product code was not changed during this review.

## What was checked

- Fresh 390 × 844 phone and 1440 × 900 desktop first screens
- One-click sample, persistent demo label, realistic three-recipe/four-sheet output, reset, exit, and real-data sentinel isolation
- Normal, malformed JSON, numeric boundary, keyboard, focus, Undo, print, reduced-motion, 200% reflow, and offline paths
- Home, demo, Privacy, Terms, internal links, metadata, response headers, and deliberate HTTP 404
- Axe and the factory URL verifier on all 200 routes
- Mobile Lighthouse: 100/100/100/100, LCP 1.3 s, CLS 0, TBT 0 ms
- All 19 exact claim commands from a remote clean clone
- Unit tests, TypeScript, build, production-shaped browser suite, Node 20, and dependency audit

## Findings

1. **Major:** After changing packet name and serving time, **Reset demo** restores storage and preview output but leaves both visible inputs stale. The complete reset promise is not asserted by a declared claim test.
2. **Minor:** The 404 headings use paper/binder metaphors instead of direct plain words.

See `.factory/review-2.md` for reproduction steps, evidence, full test results, and earlier-finding disposition.

## Next steps

Synchronize the packet-name and serving-time controls during reset, add an immediate reset assertion to the claim suite, replace the 404 headings with direct copy, deploy, and rerun the strict review.
