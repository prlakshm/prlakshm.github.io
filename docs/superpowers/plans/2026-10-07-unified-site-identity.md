# Unified Site Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the gold frame the only active favicon identity across the shipped portfolio while keeping the homepage Safari title exactly `Pranavi Ram | Product Designer`.

**Architecture:** The root favicon becomes a true multi-size gold-frame ICO, providing a safe fallback for every route and standalone page. Primary HTML entry points also declare the same cache-versioned SVG, PNG, ICO, and Apple touch icon set explicitly. A repository-level test audits the binary fallback, public metadata, and concise homepage title.

**Tech Stack:** Static HTML metadata, Python/Pillow favicon generation, Node.js built-in test runner, Vite/TypeScript build, GitHub Pages.

## Global Constraints

- The only active site icon is the existing gold-frame artwork.
- The primary title is exactly `Pranavi Ram | Product Designer`.
- Page-specific case-study, deck, and prototype titles remain unchanged.
- No visual layout or stylesheet rules change.
- Historical notebook assets may remain, but shipped HTML and `/favicon.ico` must not use them.
- Production work is committed to `main`, pushed, and published through the existing `gh-pages` workflow.

---

### Task 1: Lock the site identity contract with a failing test

**Files:**
- Create: `tests/site-identity.test.mjs`
- Test: `tests/site-identity.test.mjs`

**Interfaces:**
- Consumes: shipped HTML files and favicon assets from the repository.
- Produces: an automated contract for the canonical title, gold-frame metadata, and root ICO fallback.

- [ ] **Step 1: Write the failing test**

Create `tests/site-identity.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const entryPoints = [
  "index.html",
  "public/mixr/index.html",
  "public/reasons-to-watch/index.html",
  "public/surprise-rail/index.html",
  "public/figma/index.html",
  "public/codex/index.html",
  "public/cursor/index.html",
  "public/branding/index.html",
  "public/branding/v2/index.html",
];
const version = "gold-frame-2";

const text = (path) => readFile(new URL(path, root), "utf8");

test("the primary shell exposes one concise Safari title", async () => {
  const html = await text("index.html");
  assert.match(html, /<title>Pranavi Ram \| Product Designer<\/title>/);
  assert.match(html, /property=["']og:title["'] content=["']Pranavi Ram \| Product Designer["']/);
  assert.match(html, /name=["']twitter:title["'] content=["']Pranavi Ram \| Product Designer["']/);
  assert.doesNotMatch(html, /property=["']og:site_name["']/);
});

test("every primary entry point declares the cache-versioned gold frame", async () => {
  for (const path of entryPoints) {
    const html = await text(path);
    assert.match(html, new RegExp(`/icons/frame-favicon\\.svg\\?v=${version}`), path);
    assert.match(html, new RegExp(`/icons/frame-favicon-32\\.png\\?v=${version}`), path);
    assert.match(html, new RegExp(`/icons/frame-favicon-16\\.png\\?v=${version}`), path);
    assert.match(html, new RegExp(`/favicon\\.ico\\?v=${version}`), path);
    assert.match(html, new RegExp(`/icons/frame-apple-touch-icon\\.png\\?v=${version}`), path);
    assert.doesNotMatch(html, /notebook-(?:favicon|apple-touch-icon)/, path);
  }
});

test("the root fallback is the generated gold-frame ICO", async () => {
  const [rootIcon, frameIcon] = await Promise.all([
    readFile(new URL("public/favicon.ico", root)),
    readFile(new URL("public/icons/frame-favicon.ico", root)),
  ]);
  assert.deepEqual(rootIcon, frameIcon);
  assert.equal(rootIcon.readUInt16LE(0), 0);
  assert.equal(rootIcon.readUInt16LE(2), 1);
  assert.ok(rootIcon.readUInt16LE(4) >= 3);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/site-identity.test.mjs`

Expected: FAIL because the homepage still declares `og:site_name`, primary entry points do not share the versioned icon set, and `public/icons/frame-favicon.ico` does not exist.

- [ ] **Step 3: Commit the failing test**

```bash
git add tests/site-identity.test.mjs
git commit -m "test: require unified gold frame site identity"
```

---

### Task 2: Generate the gold-frame ICO and unify public metadata

**Files:**
- Create: `scripts/favicon/build-frame.py`
- Create: `public/icons/frame-favicon.ico`
- Modify: `public/favicon.ico`
- Modify: `index.html`
- Modify: `public/mixr/index.html`
- Modify: `public/reasons-to-watch/index.html`
- Modify: `public/surprise-rail/index.html`
- Modify: `public/figma/index.html`
- Modify: `public/codex/index.html`
- Modify: `public/cursor/index.html`
- Modify: `public/branding/index.html`
- Modify: `public/branding/v2/index.html`
- Modify: `public/branding/deck.html`
- Test: `tests/site-identity.test.mjs`

**Interfaces:**
- Consumes: `public/icons/frame-favicon-180.png` as the approved gold-frame source artwork.
- Produces: identical `public/favicon.ico` and `public/icons/frame-favicon.ico` files containing 16, 32, and 48 pixel variants; cache-versioned metadata for direct entry points.

- [ ] **Step 1: Add the deterministic frame favicon builder**

Create `scripts/favicon/build-frame.py`:

```python
from pathlib import Path
from shutil import copyfile

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
ICONS = ROOT / "public" / "icons"
SOURCE = ICONS / "frame-favicon-180.png"
NAMED_ICO = ICONS / "frame-favicon.ico"
ROOT_ICO = ROOT / "public" / "favicon.ico"


with Image.open(SOURCE) as source:
    source.convert("RGBA").save(
        NAMED_ICO,
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
    )

copyfile(NAMED_ICO, ROOT_ICO)
print(f"Wrote {NAMED_ICO.relative_to(ROOT)} and {ROOT_ICO.relative_to(ROOT)}")
```

- [ ] **Step 2: Generate the named and root ICO files**

Run: `python3 scripts/favicon/build-frame.py`

Expected: prints both output paths; `file public/favicon.ico public/icons/frame-favicon.ico` identifies both as Microsoft icon files with three images.

- [ ] **Step 3: Apply the shared icon metadata to the homepage**

In `index.html`, remove:

```html
<meta property="og:site_name" content="Pranavi Ram" />
```

Replace the favicon block with:

```html
<link rel="icon" type="image/svg+xml" href="/icons/frame-favicon.svg?v=gold-frame-2">
<link rel="icon" type="image/png" sizes="32x32" href="/icons/frame-favicon-32.png?v=gold-frame-2">
<link rel="icon" type="image/png" sizes="16x16" href="/icons/frame-favicon-16.png?v=gold-frame-2">
<link rel="icon" href="/favicon.ico?v=gold-frame-2" sizes="any">
<link rel="apple-touch-icon" href="/icons/frame-apple-touch-icon.png?v=gold-frame-2">
```

- [ ] **Step 4: Apply the same icon block to primary standalone entry points**

Use the exact five-line block from Step 3 in:

```text
public/mixr/index.html
public/reasons-to-watch/index.html
public/surprise-rail/index.html
public/figma/index.html
public/codex/index.html
public/cursor/index.html
public/branding/index.html
public/branding/v2/index.html
```

Replace existing favicon blocks where present and insert the block immediately after each document title where absent. Add the same block to `public/branding/deck.html`, the source document used to generate the Figma deck, so future rebuilds retain the identity.

- [ ] **Step 5: Run the targeted test to verify it passes**

Run: `node --test tests/site-identity.test.mjs`

Expected: 3 tests pass and 0 fail.

- [ ] **Step 6: Confirm no shipped HTML explicitly requests notebook icons**

Run:

```bash
rg -n "notebook-(favicon|apple-touch-icon)" index.html public -g '*.html'
```

Expected: no matches.

- [ ] **Step 7: Commit the implementation**

```bash
git add scripts/favicon/build-frame.py public/favicon.ico public/icons/frame-favicon.ico index.html public/mixr/index.html public/reasons-to-watch/index.html public/surprise-rail/index.html public/figma/index.html public/codex/index.html public/cursor/index.html public/branding/index.html public/branding/v2/index.html public/branding/deck.html
git commit -m "fix: use gold frame site identity everywhere"
```

---

### Task 3: Verify, push, deploy, and confirm the custom domain

**Files:**
- Verify: all tracked source and generated deployment files.

**Interfaces:**
- Consumes: the committed site-identity implementation from Tasks 1 and 2.
- Produces: synchronized `main`, a successful `gh-pages` deployment, and live custom-domain evidence.

- [ ] **Step 1: Run the complete test suite**

Run: `node --test tests/*.test.mjs`

Expected: all tests pass with 0 failures.

- [ ] **Step 2: Run the production build and diff validation**

Run: `npm run build`

Expected: TypeScript and Vite finish with exit code 0.

Run: `git diff --check`

Expected: exit code 0 with no output.

- [ ] **Step 3: Inspect the built identity metadata**

Run:

```bash
rg -n "Pranavi Ram \| Product Designer|gold-frame-2|og:site_name" dist/index.html dist/mixr/index.html dist/figma/index.html
```

Expected: the concise title and versioned gold-frame URLs are present; `og:site_name` is absent from `dist/index.html`.

- [ ] **Step 4: Push `main`**

```bash
git fetch origin
git status -sb
git push origin main
```

Expected: `main` is only ahead of, never behind, `origin/main`; push succeeds without force.

- [ ] **Step 5: Publish the production build**

Run: `npm run deploy`

Expected: the predeploy build succeeds and `gh-pages` reports `Published`.

- [ ] **Step 6: Wait for the Pages workflow to complete**

Query the public GitHub Actions API for the `gh-pages` commit produced in Step 5 until its Pages run reports `completed` and `success`.

- [ ] **Step 7: Verify the live custom domain**

Fetch these cache-busted URLs:

```text
https://pranaviram.com/?identity=gold-frame-2
https://pranaviram.com/favicon.ico?identity=gold-frame-2
https://pranaviram.com/icons/frame-favicon.svg?identity=gold-frame-2
```

Expected: all return HTTP 200, the live HTML title is exactly `Pranavi Ram | Product Designer`, `og:site_name` is absent, and the live root ICO matches the committed gold-frame ICO.

- [ ] **Step 8: Confirm the workspace is synchronized**

Run:

```bash
git status -sb
git rev-parse HEAD
git rev-parse origin/main
```

Expected: the workspace is clean and the two commit hashes match.
