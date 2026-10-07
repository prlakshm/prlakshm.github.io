# Social Sharing Previews Design

## Goal

Replace the portrait-based social previews with intentional 1200 × 630 images that represent the portfolio and each independent concept accurately. Preserve the current site UI; this work changes share metadata and adds static preview assets only.

## Confirmed image assignment

| Shared URL | Preview treatment |
| --- | --- |
| `/` | Landing-page browser-window collage |
| `/surprise-rail/` | Same landing-page browser-window collage |
| `/mixr/` | Same landing-page browser-window collage |
| `/about/` | About-page browser-window collage |
| `/cursor/` | Cursor Loves Indie wordmark slide |
| `/figma/` | Figma Sound closing wordmark/orbit slide |
| `/codex/` | Codex Bookmarks poster slide |

The generic portfolio image is deliberately not reused for the three concept decks. Each concept already has a defining poster or wordmark slide and should retain that identity when shared.

## Landing-page collage

- Canvas: exactly 1200 × 630 pixels.
- Background: a plain, neutral light gray sampled from the supplied Codex Bookmarks video. The sampled frames range from approximately `#EEEEF0` to `#E7E7E9`; use a visually central neutral near `#EBEBED` without the blue wallpaper or desktop clutter from the composition reference.
- Composition: several overlapping browser windows at different sizes and aspect ratios, with soft shadows and restrained corner rounding.
- Content: every window displays the real portfolio landing page at a corresponding responsive viewport.
- Browser state: every browser window contains exactly one open tab. That tab is the portfolio, titled `Pranavi Ram | Product Designer`, and uses the gold-frame favicon.
- Exclusions: no blank tab, second tab, unrelated site, browser extensions, desktop dock, wallpaper pattern, or portrait used as the dominant image.
- The arrangement should remain legible when reduced to a small social card. A smaller number of clearly readable windows is preferable to a dense collage of illegible thumbnails.

## About collage

The About preview uses the same canvas, gray background, browser treatment, and single-tab rule as the landing-page collage. Its browser windows show the real About page at different responsive sizes. The portrait may appear naturally as part of the page layout, but it must not become a standalone or dominant social image.

## Concept previews

Each concept preview is a direct, clean 1200 × 630 rendering of its established hero visual, without the multi-window collage treatment:

- Cursor: the black `cursor ♥ indie` opening wordmark slide, settled and centered.
- Figma Sound: the closing Figma Sound wordmark/orbit slide, captured in its intentional settled state rather than at an arbitrary frame of the launch film.
- Codex Bookmarks: the blue Codex Bookmarks poster slide, framed as the deck presents it rather than stretching the existing portrait poster to a wide ratio.

## About URL behavior

The current About route is `/#/about`. Social crawlers do not send URL fragments to the server, so that address cannot expose metadata distinct from the homepage.

Add a real `/about/` document with About-specific Open Graph and Twitter metadata. Human visitors who open `/about/` should be taken to the existing About experience at `/#/about`. This preserves the application and gives social crawlers a stable URL from which to read the About preview.

## Metadata

For every endpoint in scope:

- Use `twitter:card=summary_large_image`.
- Set both `og:image` and `twitter:image` to the new absolute HTTPS URL.
- Include `og:image:width=1200`, `og:image:height=630`, and descriptive image alt text; mirror alt text for Twitter where supported.
- Keep the existing page-specific title and description unless either is missing. Figma currently lacks complete share metadata and should receive a canonical URL, description, Open Graph fields, and Twitter fields.
- Use new, versioned image filenames so external crawlers do not mistake the replacement for the cached portrait.
- Remove every remaining social-metadata reference to `about/Profile picture.png` from the affected documents.

## Production method

Generate the images from the real local site and its existing poster/wordmark pages, not from an AI reinterpretation. This keeps type, artwork, spacing, favicon, and responsive behavior faithful to the deployed portfolio. Keep a reproducible local generation path in the repository so the previews can be refreshed when the site changes.

## Verification

- Assert all five unique preview image assets exist and are exactly 1200 × 630.
- Assert all seven in-scope endpoints contain the expected absolute image URL and dimensions.
- Assert no in-scope metadata still references the profile portrait.
- Build the production site and verify that all preview assets and endpoint documents are present in `dist`.
- Inspect every final image visually at full size and at a reduced social-card size.
- Verify `/about/` exposes About metadata without changing the existing About page experience for human visitors.
- After verification, commit all implementation changes, push `main`, deploy the production build, and confirm the live metadata and image URLs.
