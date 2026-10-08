# Social Preview Layout Refinement Design

## Goal

Refine the approved social-sharing artwork without changing page design or metadata routing.

## Direct page captures

The Home/case-study preview and About preview remain 1200 × 630 PNGs. Each is a direct screenshot of the corresponding page at a 1200 × 630 viewport, with no simulated browser window, tabs, chrome, border, or external background.

Home, Surprise Rail, and Mixr use the landing-page capture. About uses the About-page capture. Page-preview configuration is separated from the renderer so automated tests can verify the exact routes and filenames and ensure the synthetic browser renderer does not return.

## Codex poster

The Codex preview remains a 1200 × 630 PNG but shows the animated poster frame edge-to-edge. Generation hides the concept credit and removes the page padding/inset only for the social capture. It does not change the live Codex page.

## Unchanged scope

Cursor, Figma, and Codex artwork, site behavior, and visual styling outside generated social assets remain unchanged.

## Verification

- Automated checks cover the two direct page routes, 1200 × 630 canvas, and absence of browser-chrome rendering code.
- Automated source checks cover the Codex full-bleed capture override.
- Existing social metadata and 1200 × 630 PNG checks continue to pass.
- Both regenerated page captures receive visual inspection before push.
- The production build, full test suite, deployed metadata, and deployed image URLs are verified.
