# Pranavi Ram Branding Deck — Design Specification

## Goal

Create a new combined branding presentation at `pranaviram.com/branding/`. The presentation begins with the existing nine-slide Cursor Loves Indie campaign and continues into a concise eight-slide Figma Sound campaign.

The existing `pranaviram.com/cursor/` deck and all files under `public/cursor/` are immutable source material. The new deck may reference those assets, but it must not edit them.

## Published Files

- `public/branding/deck.html` — canonical interactive combined deck.
- `public/branding/index.html` — lightweight entry that opens `deck.html`, preserving the clean `/branding/` endpoint.
- `public/branding/assets/` — Figma Sound photographs, SVG wordmark layers, and product-interface images.
- `public/pranavi-ram-branding.pdf` — valid one-page placeholder PDF until the full combined PDF is exported.

The deck remains unlisted from the portfolio navigation unless separately requested.

## Combined Deck Architecture

The first nine slides reproduce the current Cursor Loves Indie deck exactly:

1. Cursor Loves Indie animated wordmark
2. Creative studio campaign image
3. Campaign thesis
4. Creative-builder opportunity
5. Creator-community campaign image
6. Cursor indie-origin rationale
7. Campaign partnerships and community system
8. Closing creator campaign image
9. Indie Loves Cursor animated wordmark

The new deck will reproduce the existing Cursor markup and copy inside `deck.html`, changing only its asset references to absolute `/cursor/…` paths so its existing animations, images, typography, and behavior remain available. The source files under `public/cursor/` will not change.

The Figma Sound chapter follows as slides 10–17:

10. Animated `FIGMA SOUND` identity on dark teal
11. Full-bleed megaphone/listening hero photograph
12. Centered campaign thesis
13. Pixel-accurate Figma Interaction menu with Sound open
14. Centered reusable-token statement
15. Pixel-accurate Sound Variables collection with multiple modes
16. Pixel-accurate Dev Mode sound handoff
17. Full-bleed piano laboratory closing photograph

## Figma Sound Visual System

### Palette

- Background: `#052427`, a darker editorial teal derived from the supplied campaign artwork.
- Display typography: `#82A6A6`, an accessibility-adjusted version of the supplied light-teal “S.”

Figma’s official brand book does not define a dark-teal/light-teal campaign pair; its wordmark is restricted to black or white, and its published logo palette is red, purple, green, orange, and blue. The deck therefore preserves a custom editorial dark teal rather than presenting a generic Figma color-tool palette as official brand color.

The light-teal display typography remains `#82A6A6`. Its contrast must be rechecked against `#052427` during implementation and must meet WCAG AA for normal text.

Copy slides use only the dark-teal background and centered light-teal type. Figma chapter slides do not include folios, decorative borders, captions, or portfolio chrome.

General Sans Regular (`400`) is the Figma chapter’s body and statement typeface. Centered statements use the same responsive body scale and measure as the Cursor chapter: `clamp(24px, 2.6vw, 42px)`, `max-width: 32em`, and `width: min(86vw, 32em)`. Their `-0.025em` tracking and `1.12` line height approximate the compact display rhythm of Figma Sans without using Figma’s proprietary font files. Didot is reserved exclusively for the temporary `FIGMA SOUND` title. Product-interface compositions retain Inter-style UI typography.

### Slide Modes

The Figma chapter has four visual modes:

1. Animated title: `FIGMA SOUND` in Didot on dark teal, independent of photography.
2. Centered copy: dark-teal background with centered light-teal General Sans Regular.
3. Image-only: a campaign photograph occupying the slide without overlaid copy.
4. Product interface: a Figma interface mock occupying the slide without campaign copy.

### Title Slide

The title is temporarily rendered in Didot while the final custom letterforms are still being resolved. It is a separate identity slide on `#052427`, not an overlay on the hero photograph.

- Desktop uses one horizontal `FIGMA SOUND` line.
- Mobile intentionally recomposes the title as `FIGMA` above staggered `SOUND`.
- All letters use consistent optical spacing.
- `SOUND` retains the approved stagger: O and N lower; U and D slightly higher.
- Keyboard clicks construct the title, a mouse click introduces SOUND, and drag-and-drop pickup/release cues move the SOUND letters into their final staggered positions.
- The final letterforms, motion timing, and audio assets remain replaceable without changing slide structure.
- Reduced-motion mode shows the final lockup without the construction animation.

### Campaign Artwork

- The chapter uses exactly two campaign photographs for pacing.
- The megaphone/listening hero immediately follows the title and uses a responsive focal crop that protects the woman, ear, and megaphone.
- The piano laboratory photograph closes the chapter and keeps the woman’s head, dress, and heels inside the frame while prioritizing the piano, speakers, chimes, and strongest fabric forms.
- The additional circular listening photograph is omitted from the main deck. It may replace the hero later but must not become a third artwork slide.

### Product Interface Images

Product slides follow the current Figma desktop interface structure, spacing, colors, panels, controls, and typography while introducing the fictional Sound feature. They are built as deterministic local interface compositions and captured as static image assets for the deck. They are not generated by an image model.

The three product views cover distinct parts of the product story:

- Apply: Prototype Interaction settings with the Sound menu open, reusable tokens, preview controls, and import.
- Systematize: A Sound Variables collection with reusable token rows and `Web`, `iOS`, and `Android` modes.
- Deliver: Dev Mode handoff with token name, resolved sound file, duration, gain, playback behavior, and copy/download affordances.

No fourth interface mock is added. A standalone audio library or waveform editor would broaden the launch story without proving an essential new claim.

## Copy Direction

The chapter uses only two centered copy slides:

- Thesis: “Figma Sound makes sound a design-system material. Today a component can have visual states and motion behavior. Now, it can also have sonic behavior.”
- Token statement: “Sounds become reusable tokens. Designers can hear them in prototypes, synchronize them with interactions, and hand their sound files to engineering alongside the rest of their design system.”

Line breaks are responsive and visually centered rather than hard-coded for only one viewport.

## Interaction

- Full-viewport vertical slides with scroll snapping.
- Arrow keys, Page Up/Page Down, Space/Shift+Space, Home, and End navigate between slides.
- Navigation continues to work when either Cursor wordmark iframe has focus.
- Reduced-motion preferences disable smooth scrolling and unnecessary animation.
- The structural implementation may ship before final audio assets are approved.
- Sound begins only when the presentation enters the Figma Sound chapter.
- The title establishes a restrained interface-sound vocabulary: keyboard clicks, mouse click, drag pickup, drag movement, and drop confirmation.
- Campaign photographs may use short atmospheric transitions, but audio must not become a continuous soundtrack.
- Product slides use discrete interaction cues or token previews rather than autoplaying ambience.
- The piano closing resolves the title’s percussive interface sounds into a restrained acoustic resonance.
- Playback is opt-in, mute persists throughout the Figma chapter, and all meaning remains available without audio.

## PDF Placeholder

`public/pranavi-ram-branding.pdf` is a valid one-page 16:9 PDF placeholder. It uses the Figma chapter palette and identifies the artifact as Pranavi Ram’s branding deck. It is deliberately not presented as the complete exported deck.

## Verification

- Confirm `public/cursor/` has no modified files.
- Confirm the combined deck contains exactly 17 slides.
- Confirm every local HTML, image, font, iframe, and SVG reference resolves.
- Confirm `/branding/` opens `deck.html`.
- Confirm keyboard navigation crosses the Cursor-to-Figma chapter boundary.
- Confirm the temporary Didot title is independent of the hero photograph.
- Confirm the chapter uses exactly two full-bleed campaign-art slides.
- Confirm the placeholder PDF is valid, landscape, and 16:9.
- Build the portfolio successfully.
- Visually inspect the deck at a 16:9 desktop viewport and a narrow viewport before handoff.
