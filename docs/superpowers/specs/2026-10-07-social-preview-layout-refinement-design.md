# Social Preview Layout Refinement Design

## Goal

Refine the approved social-sharing artwork without changing page design or metadata routing.

## Browser collages

The Home/case-study preview and About preview remain 1200 × 630 PNGs on the existing `#EBEBED` gray background. Each collage contains exactly five responsive captures of its page. The five browser windows form an asymmetrical desktop spread with visible gray gutters between every window; their rectangles may not touch or overlap.

One window uses recognizable Safari chrome. The other four use recognizable Chrome chrome, and every Chrome window contains exactly one portfolio tab. The five captures use distinct viewport widths so the artwork communicates real responsive behavior rather than repeated scaling of one screenshot.

The layout data is separated from the renderer so automated tests can prove the window count, browser mix, viewport variety, canvas containment, and lack of overlap.

## Codex poster

The Codex preview remains a 1200 × 630 PNG but shows the animated poster frame edge-to-edge. Generation hides the concept credit and removes the page padding/inset only for the social capture. It does not change the live Codex page.

## Unchanged scope

Cursor and Figma artwork, page metadata, site behavior, and visual styling outside generated social assets remain unchanged.

## Verification

- Automated layout checks cover five windows, one Safari/four Chrome, distinct viewport widths, no overlap, and canvas bounds.
- Automated source checks cover the Codex full-bleed capture override.
- Existing social metadata and 1200 × 630 PNG checks continue to pass.
- Both regenerated collages and the Codex preview receive visual inspection before push.
- The production build, full test suite, deployed metadata, and deployed image URLs are verified.
