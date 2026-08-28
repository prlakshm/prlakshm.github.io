# Combined Branding Deck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and locally launch a 19-slide branding presentation at `/branding/` that preserves the existing Cursor deck and adds the ten-slide Figma Sound campaign.

**Architecture:** A self-contained static HTML deck reproduces the existing nine Cursor slides with portable `../cursor/` asset references, then adds nine Figma Sound slides. The Figma chapter uses exactly two approved campaign photographs, a text-only animated title, three deterministic product UI compositions, and preloaded local interface-sound cues.

**Tech Stack:** Semantic HTML, CSS, inline SVG, vanilla JavaScript, Vite static asset serving, Node-based structural checks.

## Global Constraints

- Do not modify any file under `public/cursor/`.
- Publish the interactive deck at `public/branding/deck.html` and make `/branding/` open it.
- Use `#052427` for the Figma chapter background and accessible `#82A6A6` for display typography.
- Preserve all supplied photographs as raster assets without generative or destructive alteration.
- Keep `FIGMA` and each `SOUND` glyph independently editable.
- The combined deck contains exactly 19 full-viewport slides.
- Support Arrow keys, Page Up/Page Down, Space/Shift+Space, Home, and End.

---

### Task 1: Asset Boundary and Structural Test

**Files:**
- Create: `scripts/check-branding-deck.mjs`
- Create: `public/branding/assets/figma-sound-listening.png`
- Create: `public/branding/assets/figma-sound-piano.png`

**Interfaces:**
- Consumes: supplied local image files and the immutable `public/cursor/` directory.
- Produces: stable `/branding/assets/*` URLs and a zero-dependency structural verifier.

- [ ] **Step 1: Write the structural verifier**

Create a Node script that asserts `public/branding/deck.html` exists, contains exactly 18 `<section class="slide…">` elements, references exactly the two approved campaign assets, contains five `data-sound-glyph` attributes, includes the approved copy and sound control, and that `public/branding/index.html` points to `deck.html`.

- [ ] **Step 2: Run the verifier to confirm it fails before implementation**

Run: `node scripts/check-branding-deck.mjs`

Expected: non-zero exit because `public/branding/deck.html` does not exist.

- [ ] **Step 3: Preserve the two approved source images non-destructively**

Keep the approved listening crop and piano-laboratory source in the two exact asset paths above. Verify dimensions with `sips -g pixelWidth -g pixelHeight`.

### Task 2: Revised Figma Sound Pacing and Audio

**Files:**
- Create: `public/branding/deck.html`
- Create: `public/branding/index.html`

**Interfaces:**
- Consumes: `/cursor/wordmark.html`, `/cursor/orbit.html`, `/cursor/assets/brand/*`, and `/branding/assets/*`.
- Produces: `/branding/` and `/branding/deck.html`.

**Files:**
- Modify: `public/branding/deck.html`
- Modify: `scripts/check-branding-deck.mjs`
- Modify: `docs/superpowers/specs/2026-08-24-branding-deck-design.md`
- Modify: `docs/superpowers/plans/2026-08-24-branding-deck.md`

**Interfaces:**
- Consumes: the approved `figma-sound-listening.png`, the approved Black-woman piano image, existing locally generated interface cues, and the three Figma mock compositions.
- Produces: the immutable nine-slide Cursor chapter plus an exact ten-slide Figma Sound chapter and a cue map that plays only after audio is unlocked.

- [ ] **Step 1: Write the failing structural assertions**

Change `scripts/check-branding-deck.mjs` to expect 19 slides, two independent Figma copy statements before and after the listening artwork, the exact new thesis and sonic-behavior copy, no obsolete combined thesis, and no title `playDropCue` scheduling.

- [ ] **Step 2: Run the verifier to confirm it fails**

Run: `node scripts/check-branding-deck.mjs`

Expected: non-zero exit because the deck still has 18 slides and schedules the obsolete title drop cue.

- [ ] **Step 3: Split the campaign thesis and preserve the exact sequence**

Update `deck.html` so the Figma chapter reads title, thesis, listening image, sonic-behavior statement, interaction mock, token statement, variables mock, Dev Mode mock, proposition, and piano close. Do not alter Cursor markup or files.

- [ ] **Step 4: Preserve the hero and add non-hero campaign cues**

Do not change slide 10 markup, animation, or title-audio code. Do not add transition cues to slides 11–18. Keep one preloaded felt-piano resolve on slide 19 only.

- [ ] **Step 5: Dispatch cues after browser audio is unlocked**

Add a non-hero cue controller to the scroll-state synchronization. Play no sound before an explicit browser audio unlock, play only the slide-19 piano key cue, do not replay it while that slide remains active, and never invoke title audio from a later slide.

- [ ] **Step 6: Run structural verification and visual QA**

Run: `node scripts/check-branding-deck.mjs`, `npm run build`, and inspect the ten Figma slides at desktop and mobile widths. Confirm title letters do not translate from their final locations and the full listening/piano subjects remain visible.

### Task 3: Placeholder PDF and Build Verification

**Files:**
- Create: `public/pranavi-ram-branding.pdf`

**Interfaces:**
- Consumes: final Figma Sound palette.
- Produces: a valid landscape 16:9 placeholder PDF at the requested URL.

- [ ] **Step 1: Generate the PDF placeholder**

Generate one 16:9 page with the title “Pranavi Ram — Branding” and a clear “interactive deck available at /branding/” note using the approved dark/light teal palette.

- [ ] **Step 2: Validate the repository build**

Run: `npm run build`

Expected: TypeScript and Vite complete successfully and copy the static branding files into `dist/`.

- [ ] **Step 3: Verify immutable Cursor sources**

Run: `git status --short public/cursor`

Expected: no output.

### Task 4: Local Visual QA and Launch

**Files:**
- Verify: `public/branding/deck.html`

**Interfaces:**
- Consumes: the completed static deck.
- Produces: a localhost URL opened in the in-app browser.

- [ ] **Step 1: Start the local Vite server**

Run: `npm run dev -- --host 127.0.0.1`

Expected: a localhost URL with `/branding/deck.html` available.

- [ ] **Step 2: Inspect representative slides**

Inspect the title, one Cursor slide, one centered Figma copy slide, one artwork slide, and one product UI slide at a 16:9 desktop viewport. Confirm the woman is not cropped out and the staggered title remains legible.

- [ ] **Step 3: Return and open the link**

Open the verified `/branding/deck.html` URL and provide it to the user.
