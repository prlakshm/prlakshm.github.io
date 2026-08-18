# Surprise Rail Modular Poster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an editable 1080 × 1620 Surprise Rail poster in the existing Surprise Tiles Figma file using authentic obscured-tile artwork and copied Max Sans glyphs.

**Architecture:** Source artwork remains read-only in the portfolio project. Temporary raster and vector assets are derived from the case-study images and F37 specimens, uploaded to Figma, and composed inside one absolute-positioned poster frame on a 4 × 6 modular grid. Validation uses staged Figma screenshots at skeleton, artwork, typography, and final-grain checkpoints.

**Tech Stack:** Local image extraction, SVG glyph tracing, Figma Plugin API, Figma asset upload.

## Global Constraints

- Do not modify `public/surprise-rail/index.html`.
- Use Figma file `7ALenAe4ALVk0Y6FBKUl74`, source page node `6006:97068`.
- Poster size is exactly 1080 × 1620 with ground `#08080A`.
- Use a visible 4 × 6 modular grid and only one edge-cropped title breakout.
- Use the real Dystopian Wars, Magic and Mayhem, Suburban Secrets, and NYC Punk Dream artwork and scrim values from the case study.
- Build `SURPRISE RAIL` from copied or traced Max Sans glyphs from the F37 specimen; do not substitute another display font.
- No green, shadows, glass cards, product UI chrome, fake metadata, or unrelated imagery.

---

### Task 1: Prepare Tile and Max Sans Assets

**Files:**
- Read only: `public/surprise-rail/index.html`
- Read only: `public/surprise-rail/art/2073.jpg`
- Read only: `public/surprise-rail/art/night-is-short.jpg`
- Read only: `public/surprise-rail/art/naked-kiss.jpg`
- Read only: `public/surprise-rail/art/smithereens.jpg`
- Read only: `public/case-study-hbo-max1/generated-v5/suburban-layer-spec.json`
- Create temporarily: `/private/tmp/surprise-rail-poster-assets/`

**Interfaces:**
- Consumes: case-study tile art and F37 Max Sans specimen images.
- Produces: four 2:3 obscured-tile PNGs and an editable SVG title assembled from traced Max Sans glyphs.

- [ ] **Step 1: Render the four obscured tiles**

Reproduce the source stack for each portrait tile: 75% white backing plate, enlarged blurred key art, artwork-specific black scrim, restrained spectral glare, white soft-light, and centered authentic clue.

- [ ] **Step 2: Verify the tile set**

Inspect a contact sheet and confirm each tile uses a different source image, its specified scrim opacity, and a legible authentic clue.

- [ ] **Step 3: Extract and trace Max Sans glyphs**

Use high-resolution F37 specimens to isolate the required `SURPRISE RAIL` letterforms. Convert the resulting silhouettes to SVG paths so the title imports as editable vector geometry rather than substituted live type.

- [ ] **Step 4: Verify the title asset**

Render the SVG locally and compare the circular bowls, bowed diagonals, angled terminals, interrupted strokes, and round-dot details to the F37 reference.

### Task 2: Build the Figma Poster Skeleton

**Files:**
- Modify externally: Figma file `7ALenAe4ALVk0Y6FBKUl74`

**Interfaces:**
- Consumes: approved design specification.
- Produces: one poster frame with visible modular structure and tracked node IDs.

- [ ] **Step 1: Inspect the target Figma page**

Enumerate pages and top-level nodes, locate page `6006:97068`, and calculate a clear position to the right of existing work.

- [ ] **Step 2: Create the poster frame**

Create `Poster / Surprise Rail / Modular Plate`, 1080 × 1620, no auto-layout, clipped content, near-black fill, and temporary placeholder state.

- [ ] **Step 3: Add the 4 × 6 grid and structural slabs**

Create low-opacity pearl hairlines plus a restrained set of pearl, raised-black, graphite, and spectral blocks snapped exactly to 270 × 270 modules.

- [ ] **Step 4: Capture the skeleton checkpoint**

Screenshot the poster and verify the reference’s asymmetrical modular rhythm, black dominance, and one clear future title breakout.

### Task 3: Place Authentic Tile Artwork and Max Sans Title

**Files:**
- Modify externally: Figma file `7ALenAe4ALVk0Y6FBKUl74`

**Interfaces:**
- Consumes: four tile PNGs and traced Max Sans title SVG from Task 1; poster frame ID from Task 2.
- Produces: composed artwork and title hierarchy.

- [ ] **Step 1: Upload the prepared assets**

Upload all four tile images and the traced title SVG to the target Figma file, preserving raster quality and editable SVG paths.

- [ ] **Step 2: Place and crop the tile blocks**

Place tiles at varied scales across grid-spanning clipped frames. Keep at least Dystopian Wars and Suburban Secrets fully legible; use the remaining two as cropped color-and-blur fields with their clue fragments still identifiable.

- [ ] **Step 3: Compose the title breakout**

Use the traced Max Sans Bold title vertically through the central-right modules, rendered as a graphite or pearl outline and cropped once by the poster boundary. Keep the phrase recoverable at thumbnail size.

- [ ] **Step 4: Add support labels**

Use small cut-out Max Sans Regular labels for `CTV DISCOVERY CONCEPT` and `LOOK BEFORE YOU KNOW.` on quiet fields. Do not introduce substitute live display type.

- [ ] **Step 5: Capture the artwork and typography checkpoint**

Screenshot and verify title/tile hierarchy, authentic clue treatments, and critical-copy readability.

### Task 4: Finish, Verify, and Hand Off

**Files:**
- Modify externally: Figma file `7ALenAe4ALVk0Y6FBKUl74`

**Interfaces:**
- Consumes: fully composed poster frame from Task 3.
- Produces: finished editable poster and final screenshot evidence.

- [ ] **Step 1: Add one full-sheet grain layer**

Apply subtle monochrome grain across the poster using soft-light or overlay blending at low opacity. Keep critical type above the grain if contrast weakens.

- [ ] **Step 2: Remove placeholder state and lock the grain**

Clear the poster placeholder, lock the grain layer, and return every mutated node ID.

- [ ] **Step 3: Verify full-size composition**

Capture a full poster screenshot and confirm no clipped critical copy, unintended overlaps, empty tile blocks, or off-grid slabs.

- [ ] **Step 4: Verify thumbnail performance**

Inspect a downscaled screenshot and confirm `SURPRISE RAIL`, one authentic clue, and the action line remain readable.

- [ ] **Step 5: Check all acceptance criteria**

Compare the final frame line by line against `docs/superpowers/specs/2026-08-18-surprise-rail-modular-poster-design.md`; report any remaining deviations rather than claiming completion.
