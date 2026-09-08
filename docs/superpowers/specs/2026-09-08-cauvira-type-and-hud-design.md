# Cauvira type and HUD refinement

Date: 2026-09-08  
Surface: public storefront first; shared tokens so backoffice headings stay readable.

## Problem

The approved palette (cement, aubergine, acid, vermilion, cream) is fine. The type and chrome make the storefront feel like an idle-game HUD: Barlow Condensed with tracking as tight as `-0.075em` and line-height ~0.85, acid-green all-caps labels, and a hard `5px 5px 0` aubergine shadow.

## Direction (approved)

Option 2: keep the palette and first-viewport commerce layout; fix readability and lower the HUD.

## Type

- Drop Barlow Condensed.
- Headings and wordmark use Geist Sans (same family as body), weight 700.
- Heading tracking `0` to `-0.02em`. Heading line-height `1.15`–`1.25`.
- Storefront `h1` reads as a sentence: about `clamp(1.85rem, 4vw, 2.75rem)`, not a 5.5rem arcade lockup.
- Wordmark “Cauvira” is title case / normal tracking, cream (not acid), not condensed uppercase.

## HUD

- Acid green is reserved for primary buttons, focus, selection, and hover borders. Not for eyebrows or logos.
- Eyebrows and utility strip use muted cream, tracking ~`0.04em`. Uppercase allowed only on tiny labels.
- `--shadow-structural` becomes a soft shadow (`0 10px 28px` aubergine at ~28% opacity), not a 5px hard offset.

## Unchanged

- Palette tokens (except shadow).
- Search, categories, vermilion feature block, product cards, first-viewport structure.
- Backoffice information density; it only inherits readable headings.

## Out of scope

- New display font beyond Geist.
- Homepage merchandising restructure.
- Cart, checkout, or Plan 2.
