# Cursor Loves Indie Portfolio Integration

**Date:** 2026-08-24  
**Status:** Approved  
**Destination:** `pranaviram.com/cursor/`

## Objective

Publish the complete nine-slide Cursor Loves Indie campaign deck inside the
portfolio repository as an unlisted standalone page. Also publish a faithful
nine-page landscape PDF at `pranaviram.com/cursor-loves-indie.pdf`.

The existing portfolio homepage, navigation, and case-study listings must not
link to either deliverable.

## Approved architecture

Use the portfolio's existing standalone-case-study pattern: a static package
under `public/cursor/`. Vite will copy that directory into `dist/cursor/`, and
the existing development-server middleware will resolve `/cursor/` to its
`index.html` during local testing.

The deck remains a standalone HTML experience rather than becoming a React
route. This preserves its full-screen scroll snapping, keyboard navigation,
responsive layout, embedded animation frames, typography, and selected
photography without coupling it to the portfolio shell.

## Runtime package

Only files required by the live deck will be copied:

- `public/cursor/index.html`: the current `deck.html`, used as the directory
  entry point.
- `public/cursor/wordmark.html`: the current opening `index.html`, renamed to
  avoid colliding with the directory entry point.
- `public/cursor/orbit.html`: the closing Indie Loves Cursor animation.
- `public/cursor/assets/fonts/CursorGothic-Regular.woff2`.
- `public/cursor/assets/brand/slide-02-office-final-v2.png`.
- `public/cursor/assets/brand/slide-05-community-final-v2.png`.
- `public/cursor/assets/brand/slide-08-closing-final-v6.png`.

The opening iframe in the copied deck will point to `./wordmark.html`. All
other deck content and behavior remain unchanged.

Draft photography, alternate visual treatments, audits, contact sheets,
experiments, source modules, bake scripts, and planning documents from the
Cursor project are excluded from the runtime package.

## PDF export

Publish `public/cursor-loves-indie.pdf` as a nine-page, 16:9 landscape PDF.
Each page will be rendered from the actual web deck at a fixed 1920 by 1080
CSS-pixel viewport so typography, layout, photography, and monochrome styling
match the interactive version.

The PDF uses one full-bleed slide image per page:

- Page 1 captures the settled `cursor ♥ indie` wordmark.
- Pages 2 through 8 capture their corresponding deck slides.
- Page 9 captures the settled `indie ♥ cursor` wordmark.

Animations and interactive controls are not represented in the PDF. The PDF
contains no added headers, footers, page numbers, margins, navigation, or
portfolio branding beyond what is already present in the slides.

## Routing and discoverability

- `https://pranaviram.com/cursor/` serves the interactive deck.
- `https://pranaviram.com/cursor-loves-indie.pdf` serves the downloadable PDF.
- No route, card, link, sitemap entry, or navigation item is added to the
  portfolio homepage.
- Relative URLs keep the deck portable between local Vite preview, GitHub
  Pages, and the custom domain.

## Verification

Add a focused automated test that verifies:

- The production package contains exactly nine deck slides.
- The opening and closing iframes target files that exist.
- Every local image, font, and HTML dependency referenced by the deck exists.
- The portfolio source does not gain a homepage or navigation link to
  `/cursor/` or `cursor-loves-indie.pdf`.
- The PDF exists and contains exactly nine landscape pages.

Run the portfolio's full test suite and production build. Confirm that the
build emits both `dist/cursor/index.html` and
`dist/cursor-loves-indie.pdf`.

Render every PDF page to PNG for visual inspection. Also inspect the live deck
at desktop and mobile widths, checking all nine slides, both settled wordmark
states, photography cropping, typography, scroll snapping, and the absence of
horizontal overflow.

## Delivery

Commit the approved design and implementation to the portfolio repository.
After all verification succeeds, fast-forward the portfolio's local `main`
branch and push `main` to `origin`.
