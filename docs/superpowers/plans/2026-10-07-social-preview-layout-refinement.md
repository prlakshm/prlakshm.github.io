# Social Preview Layout Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate five non-overlapping mixed-browser responsive collages and an edge-to-edge Codex social poster.

**Architecture:** Move composition data into a pure module that both the generator and tests consume. Keep Playwright rendering in the existing generator and apply a capture-only CSS override for Codex.

**Tech Stack:** Node.js, Playwright, Node test runner, HTML/CSS, PNG screenshots

## Global Constraints

- Outputs remain exactly 1200 × 630 PNGs.
- Collages use `#EBEBED` and exactly five fully separate browser windows.
- Browser mix is exactly one Safari and four Chrome windows.
- The five source viewport widths are distinct.
- Codex artwork is full bleed with no black page border or concept credit.
- Cursor, Figma, metadata routing, and live page visuals do not change.

---

### Task 1: Make collage geometry testable

**Files:**
- Create: `scripts/social-preview-layout.mjs`
- Modify: `tests/social-sharing-previews.test.mjs`

**Interfaces:**
- Produces: `SOCIAL_CANVAS`, `COLLAGE_WINDOWS`, and `CODEX_FULL_BLEED_CSS`
- Consumes: none

- [ ] Add failing tests which import the layout data and assert five entries, exactly one `safari`, exactly four `chrome`, five unique viewport widths, positive gray gaps between every rectangle, and all rectangles contained by 1200 × 630.
- [ ] Add a failing assertion that `CODEX_FULL_BLEED_CSS` removes slide padding, expands `.hx-frame` to every edge, and hides `.concept-credit`.
- [ ] Run `npm run test:social` and confirm the missing module/layout causes the expected failure.
- [ ] Implement the pure layout constants with explicit `x`, `y`, `width`, `height`, `viewportWidth`, `viewportHeight`, and `browser` values.
- [ ] Run `npm run test:social` and confirm the new geometry tests pass.

### Task 2: Render the approved compositions

**Files:**
- Modify: `scripts/generate-social-previews.mjs`
- Modify: `public/social/portfolio-landing-v1.png`
- Modify: `public/social/about-v1.png`
- Modify: `public/social/codex-bookmarks-v1.png`

**Interfaces:**
- Consumes: `SOCIAL_CANVAS`, `COLLAGE_WINDOWS`, and `CODEX_FULL_BLEED_CSS`
- Produces: deterministic 1200 × 630 social PNGs

- [ ] Replace the four hard-coded collage sizes and overlapping CSS positions with the five tested layout records.
- [ ] Render Safari chrome for the one Safari record and single-tab Chrome chrome for the other four records.
- [ ] Give every browser a fixed tested rectangle; crop each responsive page capture within its content area so geometry cannot exceed its rectangle.
- [ ] Extend `capture()` with an optional CSS override and apply `CODEX_FULL_BLEED_CSS` only to the Codex capture.
- [ ] Start the local site, run `npm run social:previews`, and stop the local site.
- [ ] Inspect the two collages and Codex PNG at original resolution; adjust composition data only if windows touch, overlap, or important page content is obscured.
- [ ] Run the generator twice and compare checksums for deterministic output.

### Task 3: Verify, publish, and confirm production

**Files:**
- Verify: all tracked changes

**Interfaces:**
- Consumes: regenerated assets and existing metadata
- Produces: deployed social previews

- [ ] Run `npm run test:social`.
- [ ] Run `node --test tests/*.test.mjs`.
- [ ] Run `npm run build` and `git diff --check`.
- [ ] Confirm only the intended script, tests, docs, and three generated PNGs changed.
- [ ] Commit, push `main`, and run `npm run deploy`.
- [ ] Fetch each live page and confirm its existing metadata still points to the intended image.
- [ ] Fetch all changed live PNG URLs and confirm HTTP 200 with `image/png`.
