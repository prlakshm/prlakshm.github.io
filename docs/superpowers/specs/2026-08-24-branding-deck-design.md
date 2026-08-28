# Pranavi Ram Branding Deck — Design Specification

## Goal

Create a new combined branding presentation at `pranaviram.com/branding/`. The presentation begins with the existing nine-slide Cursor Loves Indie campaign and continues into a concise ten-slide Figma Sound campaign.

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

The Figma Sound chapter follows as slides 10–19:

10. Animated `FIGMA SOUND` identity on dark teal
11. Centered thesis: “Figma Sound makes sound a design-system material.”
12. Full-bleed approved listening campaign photograph
13. Centered sonic-behavior statement
14. Pixel-accurate Figma Interaction menu with Sound open
15. Centered reusable-token statement
16. Pixel-accurate Sound Variables collection with multiple modes
17. Pixel-accurate Dev Mode sound handoff
18. Centered closing proposition: “Design what an interface sounds like.”
19. Full-bleed piano laboratory closing photograph

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

The title is a separate identity slide on `#052427`, not an overlay on the hero photograph. Its visual and audio implementation is owned by a separate concurrent edit and is out of scope for the revised campaign pacing.

- Desktop uses one horizontal `FIGMA SOUND` line.
- Mobile intentionally recomposes the title as `FIGMA` above staggered `SOUND`.
- All letters use consistent optical spacing.
- `SOUND` retains the approved stagger: O and N lower; U and D slightly higher.
- This pass must not change title markup, artwork, animation, or title-audio behavior.
- The final letterforms, motion timing, and audio assets remain replaceable without changing slide structure.
- Reduced-motion mode shows the final lockup without the construction animation.

### Campaign Artwork

- The chapter uses exactly two campaign photographs for pacing.
- The approved circular listening photograph follows the thesis and uses a responsive focal crop that protects the woman and the surrounding sound forms.
- The piano laboratory photograph closes the chapter and keeps the woman’s head, dress, and heels inside the frame while prioritizing the piano, speakers, chimes, and strongest fabric forms.
- The former megaphone title photograph is omitted from the main deck so the chapter contains exactly two campaign photographs.

### Product Interface Images

Product slides follow the current Figma desktop interface structure, spacing, colors, panels, controls, and typography while introducing the fictional Sound feature. They are built as deterministic local interface compositions and captured as static image assets for the deck. They are not generated by an image model.

The three product views cover distinct parts of the product story:

- Apply: Prototype Interaction settings with the Sound menu open, reusable tokens, preview controls, and import.
- Systematize: A Sound Variables collection with reusable token rows and `Web`, `iOS`, and `Android` modes.
- Deliver: Dev Mode handoff with token name, resolved sound file, duration, gain, playback behavior, and copy/download affordances.

No fourth interface mock is added. A standalone audio library or waveform editor would broaden the launch story without proving an essential new claim.

## Copy Direction

The chapter uses three centered copy slides:

- Thesis: “Figma Sound makes sound a design-system material.”
- Sonic behavior: “Today a component can have visual states and motion behavior. Now, it can also have sonic behavior.”
- Token statement: “Sounds become reusable tokens. Designers can hear them in prototypes, synchronize them with interactions, and hand their sound files to engineering alongside the rest of their design system.”
- Closing proposition: “Design what an interface sounds like.”

Line breaks are responsive and visually centered rather than hard-coded for only one viewport.

## Interaction

- Full-viewport vertical slides with scroll snapping.
- Arrow keys, Page Up/Page Down, Space/Shift+Space, Home, and End navigate between slides.
- Navigation continues to work when either Cursor wordmark iframe has focus.
- Reduced-motion preferences disable smooth scrolling and unnecessary animation.
- The structural implementation may ship before final audio assets are approved.
- Sound begins only after a user interaction in the Figma Sound chapter, satisfying browser playback restrictions.
- The title establishes a restrained interface-sound vocabulary: mechanical keyboard clicks for `FIGMA`, plus mouse pickup and drag cues for `SOUND`.
- Campaign photographs may use short atmospheric transitions, but audio must not become a continuous soundtrack.
- Product slides use discrete interaction cues or token previews rather than autoplaying ambience.
- The piano closing resolves with a quiet felt-piano resonance; it does not add a bounce or landing sound.
- Playback uses preloaded local WAV cues. The first title interaction explicitly unlocks playback, mute persists throughout the Figma chapter, and all meaning remains available without audio.
- After unlock, the chapter has no slide-transition sounds except one quiet felt-piano key on the final image. There is no continuous soundtrack.

## PDF Placeholder

`public/pranavi-ram-branding.pdf` is a valid one-page 16:9 PDF placeholder. It uses the Figma chapter palette and identifies the artifact as Pranavi Ram’s branding deck. It is deliberately not presented as the complete exported deck.

## Verification

- Confirm `public/cursor/` has no modified files.
- Confirm the combined deck contains exactly 19 slides.
- Confirm every local HTML, image, font, iframe, and SVG reference resolves.
- Confirm `/branding/` opens `deck.html`.
- Confirm keyboard navigation crosses the Cursor-to-Figma chapter boundary.
- Confirm the temporary Didot title is independent of the hero photograph.
- Confirm the chapter uses exactly two full-bleed campaign-art slides and no photograph on the title slide.
- Confirm the placeholder PDF is valid, landscape, and 16:9.
- Build the portfolio successfully.
- Visually inspect the deck at a 16:9 desktop viewport and a narrow viewport before handoff.
