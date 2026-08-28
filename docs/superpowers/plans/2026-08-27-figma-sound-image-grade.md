# Figma Sound Image Grade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create restrained final desktop and mobile grades for the megaphone and piano photographs and wire them into the Figma Sound deck.

**Architecture:** Use deterministic FFmpeg color filters against the untouched source photographs. Generate mobile assets by cropping the graded desktop result, then update the HTML and asset-validation script to point at the four final files.

**Tech Stack:** FFmpeg 7, HTML/CSS `<picture>`, Node.js deck validation, Vite production build

## Global Constraints

- Never regenerate, repaint, or add texture to the megaphone image.
- Preserve composition, skin tones, original black points, and photographic detail.
- Piano adjustments affect only upper-mid and highlight brightness by a subtle amount.
- Megaphone adjustments move the cyan balance slightly from green toward blue while preserving lightness.
- Desktop and mobile assets must share the same grade.

---

### Task 1: Render final deterministic image grades

**Files:**
- Create: `public/branding/assets/figma-sound-piano-final.png`
- Create: `public/branding/assets/figma-sound-piano-mobile-final.png`
- Create: `public/branding/assets/figma-sound-megaphone-final.png`
- Create: `public/branding/assets/figma-sound-megaphone-mobile-final.png`

**Interfaces:**
- Consumes: untouched `figma-sound-piano.png` and `figma-sound-megaphone.png` source pixels
- Produces: four PNG assets referenced by the deck `<picture>` elements

- [x] **Step 1: Render the restrained piano desktop grade**

```bash
/Users/pranavi/bin/ffmpeg -y -i public/branding/assets/figma-sound-piano.png -vf "curves=all='0/0 0.75/0.735 0.90/0.865 1/0.96'" -frames:v 1 -update 1 public/branding/assets/figma-sound-piano-final.png
```

Expected: the white glass and background are slightly quieter, with the source black point and teal fabric preserved.

- [x] **Step 2: Render the piano mobile crop from the same grade**

```bash
/Users/pranavi/bin/ffmpeg -y -i public/branding/assets/figma-sound-piano.png -vf "curves=all='0/0 0.75/0.735 0.90/0.865 1/0.96',crop=610:1084:550:0,scale=1080:1920:flags=lanczos" -frames:v 1 -update 1 public/branding/assets/figma-sound-piano-mobile-final.png
```

Expected: 1080×1920 pixels with the pianist fully visible and the identical desktop grade.

- [x] **Step 3: Render the restrained megaphone desktop grade**

```bash
/Users/pranavi/bin/ffmpeg -y -i public/branding/assets/figma-sound-megaphone.png -vf "colorbalance=gm=-0.006:bm=0.010:gh=-0.008:bh=0.014:pl=1" -frames:v 1 -update 1 public/branding/assets/figma-sound-megaphone-final.png
```

Expected: the wall and translucent materials read slightly bluer and less green without losing brightness.

- [x] **Step 4: Render the megaphone mobile crop from the same grade**

```bash
/Users/pranavi/bin/ffmpeg -y -i public/branding/assets/figma-sound-megaphone.png -vf "colorbalance=gm=-0.006:bm=0.010:gh=-0.008:bh=0.014:pl=1,crop=450:800:570:0,scale=1080:1920:flags=lanczos" -frames:v 1 -update 1 public/branding/assets/figma-sound-megaphone-mobile-final.png
```

Expected: 1080×1920 pixels, extra space remains above the subject, and no generative fill is introduced.

- [x] **Step 5: Inspect all four final assets side by side**

Open the desktop and mobile PNGs at original detail. Confirm no added grain, no clipped highlights, no changed composition, and a shared restrained blue-teal balance.

### Task 2: Wire final assets into the deck

**Files:**
- Modify: `public/branding/deck.html`
- Modify: `scripts/check-branding-deck.mjs`

**Interfaces:**
- Consumes: four final PNG assets from Task 1
- Produces: responsive deck references and automated asset assertions

- [x] **Step 1: Update the two responsive `<picture>` elements**

Use these four paths:

```text
./assets/figma-sound-megaphone-final.png
./assets/figma-sound-megaphone-mobile-final.png
./assets/figma-sound-piano-final.png
./assets/figma-sound-piano-mobile-final.png
```

- [x] **Step 2: Update deck validation asset expectations**

Use the same four paths in the required asset array and slide-specific assertions in `scripts/check-branding-deck.mjs`.

- [x] **Step 3: Run the deck validation**

```bash
node scripts/check-branding-deck.mjs
```

Expected: `PASS: 18 slides, 5 SOUND glyphs, assets present`.

- [x] **Step 4: Run the production build and whitespace check**

```bash
npm run build
git diff --check
```

Expected: Vite build exits 0 and `git diff --check` prints no errors.

- [x] **Step 5: Verify final dimensions and references**

```bash
sips -g pixelWidth -g pixelHeight public/branding/assets/figma-sound-megaphone-final.png public/branding/assets/figma-sound-megaphone-mobile-final.png public/branding/assets/figma-sound-piano-final.png public/branding/assets/figma-sound-piano-mobile-final.png
rg -n "figma-sound-(megaphone|piano)-(mobile-)?final" public/branding/deck.html scripts/check-branding-deck.mjs
```

Expected: mobile assets are 1080×1920, desktop dimensions match their source photographs, and the deck/test references point only to the four final files.
