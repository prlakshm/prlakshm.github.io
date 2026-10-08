# Social Preview Layout Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate direct page screenshots for Home/case-study and About social previews without simulated browser chrome.

**Architecture:** Keep exact page-preview routes and filenames in a pure module that both the generator and tests consume. Use the existing Playwright capture path directly at the social canvas size; preserve the existing full-bleed Codex capture.

**Tech Stack:** Node.js, Playwright, Node test runner, HTML/CSS, PNG screenshots

## Global Constraints

- Outputs remain exactly 1200 × 630 PNGs.
- Home/case-study and About previews contain no simulated browser chrome.
- Home, Surprise Rail, and Mixr share the direct landing-page capture.
- About uses a direct About-page capture.
- Codex artwork is full bleed with no black page border or concept credit.
- Cursor, Figma, Codex, and live page visuals do not change.

---

### Task 1: Make direct captures testable

**Files:**
- Create: `scripts/social-preview-layout.mjs`
- Modify: `tests/social-sharing-previews.test.mjs`

**Interfaces:**
- Produces: `SOCIAL_CANVAS`, `PAGE_PREVIEWS`, and `CODEX_FULL_BLEED_CSS`
- Consumes: none

- [ ] Add failing tests which assert direct `/` and `/about/` capture entries, 1200 × 630 dimensions, and no browser-chrome renderer.
- [ ] Run `npm run test:social` and confirm the missing direct-capture configuration causes the expected failure.
- [ ] Replace collage geometry with the exact direct-capture filenames and routes.
- [ ] Run `npm run test:social` and confirm only the not-yet-generated PNG check remains red.

### Task 2: Render the approved page screenshots

**Files:**
- Modify: `scripts/generate-social-previews.mjs`
- Create: `public/social/portfolio-landing-v3.png`
- Create: `public/social/about-v3.png`

**Interfaces:**
- Consumes: `SOCIAL_CANVAS` and `PAGE_PREVIEWS`
- Produces: deterministic 1200 × 630 social PNGs

- [ ] Remove the collage renderer and call `capture()` directly for each configured page at 1200 × 630.
- [ ] Update Home, About, Surprise Rail, Mixr, and tracked poster-lab metadata to cache-busted `v3` files and accurate alt text.
- [ ] Start the local site, run `npm run social:previews`, and stop the local site.
- [ ] Inspect both direct page screenshots at original resolution and confirm the intended page content fills each image without browser chrome.
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
- [ ] Confirm only the intended script, tests, docs, metadata, and two generated PNGs changed.
- [ ] Commit, push `main`, and run `npm run deploy`.
- [ ] Fetch each live page and confirm its existing metadata still points to the intended image.
- [ ] Fetch all changed live PNG URLs and confirm HTTP 200 with `image/png`.
