# Surprise Rail Modular Poster — Design Specification

**Date:** 2026-08-18

**Status:** Approved for implementation

**Format:** 1080 × 1620 portrait poster

## Objective

Create a Surprise Rail campaign poster that translates the supplied Anthropic modular-plate reference into the visual language of the HBO Max concept. The result should feel like a tactile editorial print, not a product screen, while remaining unmistakably grounded in the real Surprise Rail tile system.

## Authoritative Sources

- Composition reference: `/Users/pranavi/Downloads/poster inspo 3.jpeg`.
- Tile implementation: `public/surprise-rail/index.html` and the image files in `public/surprise-rail/art/`.
- Typography reference: [F37 Max case study](https://f37.com/case-studies/max).
- Supporting decoded tile specification: `public/case-study-hbo-max1/generated-v5/suburban-layer-spec.json`.

`public/surprise-rail/index.html` is a read-only source for this task and must not be edited.

## Poster Type and Graphic Event

Use a Type C modular editorial plate. Its single dominant event is the collision between oversized Max Sans title glyphs and a field of authentic obscured Surprise Rail tiles. Do not combine this with a silhouette collage, product UI, or a wall of equal mini-posters.

## Canvas and Grid

- Canvas: 1080 × 1620, portrait 2:3.
- Ground: HBO Max near-black `#08080A`, not pure black and not green.
- Grid: 4 columns × 6 rows with visible pearl hairlines at low opacity.
- Blocks snap to cell intersections and may span multiple cells.
- One breakout is allowed: the oversized title may bleed and crop at a poster edge.
- No corner radii on structural blocks, shadows, glass cards, or ambient gradients.

## Tile Artwork

Use four authentic recreated hidden tiles from the case-study implementation:

1. Dystopian Wars — `art/2073.jpg`, scrim 54%.
2. Magic and Mayhem — `art/night-is-short.jpg`, scrim 67%.
3. Suburban Secrets — `art/naked-kiss.jpg`, scrim 75%.
4. NYC Punk Dream — `art/smithereens.jpg`, scrim 66%.

Each tile must preserve the source treatment:

- 75% white backing plate with edge blur.
- Key art blurred and slightly enlarged.
- Artwork-specific black scrim.
- Source glare or concealment layer.
- White soft-light layer.
- Centered clue text only where the composition leaves it intentionally readable.

Tiles should appear at different scales and crops across the grid. Some blocks may show only blurred image color and texture; at least two clues must remain legible so the product mechanic is recognizable. Do not replace the set with one repeated blurred image.

## Typography

The display face is Max Sans. Forma DJR Display, General Sans, Roboto, and look-alike substitutions must not be used for poster display type.

Build the necessary glyphs by tracing or copying letterforms from the high-resolution specimens on the F37 Max case study. Use Max Sans Bold for the primary title and Max Sans Regular for smaller labels. The final title must not depend on a locally installed substitute font.

Primary title:

- Copy: `SURPRISE RAIL`.
- Treatment: oversized Max Sans Bold glyphs, stacked or vertical, with a pearl outline or low-opacity graphite fill.
- Placement: runs through several modules and crops once at the edge.
- It functions as image, so it may pass behind tile blocks, but the word sequence must remain recoverable.

Support labels:

- `SURPRISE RAIL`
- `CTV DISCOVERY CONCEPT`
- `LOOK BEFORE YOU KNOW.`
- The four authentic clue names listed above.

Use small Max Sans Regular labels at grid intersections. Do not invent dates, venues, ratings, credits, or interface status text.

## Palette

- Ground: `#08080A`.
- Raised black: `#0D0D10`.
- Pearl: `#F2F0EC`.
- Graphite: `#5A5A63`.
- Smoke: `#8C8C95`.
- Spectral accents: `#E8DBE2`, `#CFC6DD`, `#B5BCD4`, `#9AA6BD`.

Black should occupy roughly 70% of the poster. The spectral colors appear as a small number of solid slabs or restrained directional transitions derived from the tiles; they must not become a full-page Max-blue or purple SaaS gradient.

## Layering and Readability

- Critical: `SURPRISE RAIL` and `LOOK BEFORE YOU KNOW.` remain readable at thumbnail size.
- Support: project descriptor and clue labels may be small but must remain legible.
- Graphic: tile crops and oversized title fragments may be obscured or cropped.
- Critical lines sit on quiet near-black or pearl fields, not on the busiest tile regions.
- The poster must read first as a print composition and second as a collection of product artifacts.

## Texture

Apply one subtle full-sheet grain overlay after all artwork and type. Use soft-light or overlay blending at low opacity. Grain must not blur the title or weaken clue readability.

## Figma Construction

- Build the poster as editable Figma primitives, image fills, and traced vector glyphs.
- Place it to the right of existing work in the Surprise Tiles Figma file.
- Keep the poster frame free of auto-layout.
- Work incrementally: frame and grid, tile blocks, title glyphs, support labels, then grain.
- Capture and inspect screenshots after each major stage.
- Preserve the case-study source files; no implementation changes are required in the website.

## Acceptance Criteria

- The composition is recognizably derived from the supplied modular reference without copying its green palette, shell imagery, or Anthropic branding.
- HBO Max near-black is the dominant background.
- All four featured image sources come from the Surprise Rail case-study implementation.
- The obscured tiles preserve their real blur, backing plate, scrim, and soft-light logic.
- The title is made from traced Max Sans glyphs from the F37 reference, with no substitute display font.
- The 4 × 6 grid is visible and governs every block except the single title breakout.
- At least two authentic clue names remain legible.
- The poster contains no product UI chrome, fake metadata, shadows, glassmorphism, green field, or unrelated imagery.
- The finished Figma frame is editable and visually verified at full size and thumbnail size.
