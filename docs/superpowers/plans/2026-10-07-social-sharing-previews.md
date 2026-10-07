# Social Sharing Previews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish intentional 1200 × 630 social previews for the portfolio, About page, and three concept decks while moving About to the clean canonical URL `https://pranaviram.com/about/`.

**Architecture:** Keep the existing hash-routed portfolio intact, but add a Vite multi-page HTML entry for `/about/` that renders the existing `About` component under a browser router. Generate five deterministic PNG assets from the real local site with Playwright, then reference those assets from seven page-specific Open Graph and Twitter metadata documents.

**Tech Stack:** React 18, React Router 6, Vite 5 multi-page build, Node test runner, Playwright 1.62, static Open Graph/Twitter metadata, GitHub Pages.

## Global Constraints

- Every social preview is exactly 1200 × 630 pixels.
- The portfolio and About collages use the video-sampled neutral gray near `#EBEBED`.
- Every simulated browser window contains exactly one tab titled `Pranavi Ram | Product Designer` with the gold-frame favicon.
- Homepage, Surprise Rail, and Mixr share the landing-page collage.
- About uses its own About-page collage.
- Cursor, Figma Sound, and Codex Bookmarks each use their established wordmark or poster slide.
- `/about/` must render the existing About experience while the browser remains at `/about/`; it must not redirect to `/#/about`.
- Existing `/#/about` links remain compatible, but no first-party navigation may generate them.
- Do not duplicate the existing About component or its full CSS.
- New versioned image filenames must replace portrait metadata references.
- Preserve all unrelated working-tree changes.

## File structure

- Create `about/index.html`: Vite HTML entry and About-specific metadata source.
- Create `src/about-main.tsx`: mounts the existing `About` component at the clean pathname.
- Modify `vite.config.ts`: includes the About HTML document in the multi-page build.
- Modify `src/pages/home/WtNav.tsx`: sends About links to `/about/` and gives the clean About entry reliable Home/Work exits.
- Modify `src/components/Header.tsx`, `src/static-chrome.tsx`, and three static page fallbacks: removes first-party `/#/about` links.
- Create `scripts/generate-social-previews.mjs`: captures responsive pages, composes the two browser collages, and captures three concept slides.
- Create `public/social/*.png`: five generated 1200 × 630 assets.
- Modify `index.html`, `public/about/index.html` via the source `about/index.html`, and the five static endpoint documents: installs complete share metadata.
- Create `tests/social-sharing-previews.test.mjs`: covers clean About routing, metadata assignments, portrait removal, and PNG dimensions.
- Modify `package.json`: adds a repeatable social-preview generation command and a focused metadata test command.

---

### Task 1: Clean About page entry

**Files:**
- Create: `about/index.html`
- Create: `src/about-main.tsx`
- Modify: `vite.config.ts`
- Modify: `src/pages/home/WtNav.tsx`
- Modify: `src/components/Header.tsx`
- Modify: `src/static-chrome.tsx`
- Modify: `public/mixr/index.html`
- Modify: `public/surprise-rail/index.html`
- Modify: `public/reasons-to-watch/index.html`
- Create: `tests/social-sharing-previews.test.mjs`

**Interfaces:**
- Consumes: the existing default `About` export and existing `WtNav`/`SiteFooter` inside it.
- Produces: an independently built `/about/index.html` document and the public URL `/about/`.

- [ ] **Step 1: Write the failing clean-URL tests**

Create `tests/social-sharing-previews.test.mjs` with the initial tests:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

test("About has a clean Vite page entry", async () => {
  const [html, entry, vite] = await Promise.all([
    text("about/index.html"),
    text("src/about-main.tsx"),
    text("vite.config.ts"),
  ]);
  assert.match(html, /<link rel="canonical" href="https:\/\/pranaviram\.com\/about\/"/);
  assert.match(html, /<div id="root"><\/div>/);
  assert.match(html, /src="\/src\/about-main\.tsx"/);
  assert.match(entry, /BrowserRouter/);
  assert.match(entry, /<About\s*\/>/);
  assert.match(vite, /about:\s*resolve\(__dirname,\s*"about\/index\.html"\)/);
});

test("first-party navigation uses the clean About URL", async () => {
  const paths = [
    "src/pages/home/WtNav.tsx",
    "src/components/Header.tsx",
    "src/static-chrome.tsx",
    "public/mixr/index.html",
    "public/surprise-rail/index.html",
    "public/reasons-to-watch/index.html",
  ];
  for (const path of paths) {
    const source = await text(path);
    assert.doesNotMatch(source, /#\/about/, path);
  }
  assert.match(await text("src/pages/home/WtNav.tsx"), /href="\/about\/"/);
  assert.match(await text("src/static-chrome.tsx"), /href="\/about\/"/);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test tests/social-sharing-previews.test.mjs`

Expected: FAIL because `about/index.html` and `src/about-main.tsx` do not exist and current nav files still contain hash-based About links.

- [ ] **Step 3: Add the clean About HTML entry**

Create `about/index.html` with the existing site title/favicons, an About description and canonical URL, the root mount, and the module entry:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>About Pranavi Ram | Product Designer</title>
    <meta name="description" content="About Pranavi Ram, an interdisciplinary product designer working across interaction, branding, systems, and film." />
    <link rel="canonical" href="https://pranaviram.com/about/" />
    <link rel="icon" type="image/svg+xml" href="/icons/frame-favicon.svg?v=gold-frame-2" />
    <link rel="icon" type="image/png" sizes="32x32" href="/icons/frame-favicon-32.png?v=gold-frame-2" />
    <link rel="icon" type="image/png" sizes="16x16" href="/icons/frame-favicon-16.png?v=gold-frame-2" />
    <link rel="icon" href="/favicon.ico?v=gold-frame-2" sizes="any" />
    <link rel="apple-touch-icon" href="/icons/frame-apple-touch-icon.png?v=gold-frame-2" />
  </head>
  <body style="margin:0;background:#f8fafc;min-height:100vh;">
    <div id="root"></div>
    <script type="module" src="/src/about-main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Mount the existing About component**

Create `src/about-main.tsx` without copying About markup or CSS:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import About from "./pages/about/About.js";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <About />
    </BrowserRouter>
  </React.StrictMode>,
);
```

- [ ] **Step 5: Add the About document to Vite’s build inputs**

Extend the existing `rollupOptions.input` in `vite.config.ts`:

```ts
input: {
  main: resolve(__dirname, "index.html"),
  about: resolve(__dirname, "about/index.html"),
  "static-chrome": resolve(__dirname, CHROME_ENTRY),
},
```

- [ ] **Step 6: Replace first-party About navigation**

In `WtNav.tsx`, render About as a document link and detect when the component is running from the clean entry:

```tsx
const onCleanAbout = window.location.pathname.replace(/\/+$/, "") === "/about";

const goWork = () => {
  if (onCleanAbout) {
    window.location.assign("/#/projects");
    return;
  }
  if (pathname === "/" || pathname === "/projects") scrollToId("work");
  else navigate("/", { state: { scrollTo: "work" } });
};

const goHome = () => {
  if (onCleanAbout) {
    window.location.assign("/#/");
    return;
  }
  const here = pathname === "/";
  if (!here) navigate("/");
  window.scrollTo({ top: 0, behavior: here && !prefersReducedMotion() ? "smooth" : "auto" });
};

about={
  <a href="/about/" aria-current={onCleanAbout || pathname === "/about" ? "page" : undefined}>
    ABOUT
    <span className="nav-rule" aria-hidden="true" />
  </a>
}
```

Replace all remaining first-party `/#/about` and `#/about` anchors in the listed source/static files with `/about/`. Keep the existing `<Route path="/about" element={<About />}>` in `App.tsx` so saved hash URLs continue to work.

- [ ] **Step 7: Run the focused tests**

Run: `node --test tests/social-sharing-previews.test.mjs`

Expected: both clean-About tests PASS.

- [ ] **Step 8: Build and inspect the clean entry**

Run: `npm run build`

Expected: PASS, with `dist/about/index.html` containing a hashed module script and stylesheet links. Opening `http://localhost:5173/about/` shows the existing About page and keeps `/about/` in the address bar.

- [ ] **Step 9: Commit the clean URL change**

```bash
git add about/index.html src/about-main.tsx vite.config.ts src/pages/home/WtNav.tsx src/components/Header.tsx src/static-chrome.tsx public/mixr/index.html public/surprise-rail/index.html public/reasons-to-watch/index.html tests/social-sharing-previews.test.mjs
git commit -m "feat: move About to a clean URL"
```

---

### Task 2: Deterministic social-preview generator

**Files:**
- Create: `scripts/generate-social-previews.mjs`
- Modify: `package.json`
- Generate: `public/social/portfolio-landing-v1.png`
- Generate: `public/social/about-v1.png`
- Generate: `public/social/cursor-loves-indie-v1.png`
- Generate: `public/social/figma-sound-v1.png`
- Generate: `public/social/codex-bookmarks-v1.png`
- Modify: `tests/social-sharing-previews.test.mjs`

**Interfaces:**
- Consumes: `--base` URL, defaulting to `http://localhost:5173`; live pages and existing favicon/poster/wordmark code.
- Produces: five PNG files under `public/social/`, each exactly 1200 × 630.

- [ ] **Step 1: Add failing asset-contract tests**

Append the following to `tests/social-sharing-previews.test.mjs`:

```js
const socialImages = [
  "public/social/portfolio-landing-v1.png",
  "public/social/about-v1.png",
  "public/social/cursor-loves-indie-v1.png",
  "public/social/figma-sound-v1.png",
  "public/social/codex-bookmarks-v1.png",
];

const pngSize = (buffer) => {
  assert.deepEqual([...buffer.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
};

test("all social preview assets are 1200 by 630 PNGs", async () => {
  for (const path of socialImages) {
    const image = await readFile(new URL(path, root));
    assert.deepEqual(pngSize(image), { width: 1200, height: 630 }, path);
  }
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test tests/social-sharing-previews.test.mjs`

Expected: FAIL with missing `public/social/*.png` files.

- [ ] **Step 3: Implement responsive page capture**

Create `scripts/generate-social-previews.mjs` using Playwright’s `chromium` API. Parse `--base`, resolve the repository root from `import.meta.url`, launch Chrome, and implement this capture interface:

```js
const capture = async ({ url, width, height, selector, wait = 1200 }) => {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle", timeout: 30000 });
  if (selector) await page.waitForSelector(selector, { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((resolve) => setTimeout(resolve, wait));
  const image = await page.screenshot({ type: "png" });
  await context.close();
  return image;
};
```

Launch with the installed Chrome channel by default, while allowing `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to override the executable path:

```js
const launchOptions = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
  ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
  : { channel: "chrome" };
const browser = await chromium.launch({ ...launchOptions, headless: true });
```

- [ ] **Step 4: Implement the one-tab collage renderer**

Capture landing and About at desktop, tablet, and phone viewport sizes. Convert buffers to data URLs and render them into a 1200 × 630 composition page whose background is `#EBEBED`.

The browser-frame HTML must use one `.tab` element only:

```html
<div class="browser browser--large">
  <div class="browser__chrome">
    <span class="traffic"><i></i><i></i><i></i></span>
    <div class="tab">
      <img src="GOLD_FRAME_DATA_URL" alt="" />
      <span>Pranavi Ram | Product Designer</span>
    </div>
  </div>
  <img class="browser__page" src="PAGE_SCREENSHOT_DATA_URL" alt="" />
</div>
```

Use four windows: one dominant landscape window, one medium landscape window, one tall phone window, and one small landscape window. Apply shadows equivalent to `0 22px 50px rgba(35,35,40,.18)` and keep every window within the 1200 × 630 canvas. Screenshot the composition page once for the landing captures and once for the About captures.

- [ ] **Step 5: Capture the three established concept slides**

Use the same `capture` helper at 1200 × 630:

```js
const cursor = await capture({
  url: "/cursor/wordmark.html",
  width: 1200,
  height: 630,
  selector: "#wordmark .wordmark",
  wait: 1800,
});
const figma = await capture({
  url: "/branding/sound-orbit.html",
  width: 1200,
  height: 630,
  selector: "#stage",
  wait: 3500,
});
const codex = await capture({
  url: "/codex/",
  width: 1200,
  height: 630,
  selector: ".hx-poster",
  wait: 3500,
});
```

Write the two composites and three direct captures with `mkdir(..., { recursive: true })` and `writeFile(...)` to the five filenames defined in this task.

- [ ] **Step 6: Add repeatable commands**

Add these scripts to `package.json`:

```json
"test:social": "node --test tests/social-sharing-previews.test.mjs",
"social:previews": "node scripts/generate-social-previews.mjs"
```

- [ ] **Step 7: Generate the assets and rerun the test**

Run: `npm run social:previews`

Expected: the command writes five PNGs and exits successfully.

Run: `npm run test:social`

Expected: all clean-URL and PNG-size tests PASS.

- [ ] **Step 8: Visually inspect full and reduced images**

Open each PNG at full size and render a 600 × 315 reduction. Confirm:

- The two collages use plain neutral gray and legible overlapping windows.
- Each simulated browser contains one portfolio tab only.
- The gold-frame favicon and full title appear in every simulated tab.
- The About portrait remains page content rather than the dominant isolated image.
- Cursor, Figma Sound, and Codex show the approved wordmark/poster slides without accidental animation frames.

- [ ] **Step 9: Commit the generator and approved assets**

```bash
git add scripts/generate-social-previews.mjs package.json tests/social-sharing-previews.test.mjs public/social
git commit -m "feat: generate social sharing artwork"
```

---

### Task 3: Install route-specific metadata

**Files:**
- Modify: `index.html`
- Modify: `about/index.html`
- Modify: `public/surprise-rail/index.html`
- Modify: `public/mixr/index.html`
- Modify: `public/cursor/index.html`
- Modify: `public/figma/index.html`
- Modify: `public/codex/index.html`
- Modify: `tests/social-sharing-previews.test.mjs`

**Interfaces:**
- Consumes: the five versioned image URLs from Task 2.
- Produces: complete Open Graph and Twitter metadata on seven shareable endpoints.

- [ ] **Step 1: Write failing metadata-assignment tests**

Append a table-driven test:

```js
const metadata = [
  ["index.html", "https://pranaviram.com/social/portfolio-landing-v1.png"],
  ["about/index.html", "https://pranaviram.com/social/about-v1.png"],
  ["public/surprise-rail/index.html", "https://pranaviram.com/social/portfolio-landing-v1.png"],
  ["public/mixr/index.html", "https://pranaviram.com/social/portfolio-landing-v1.png"],
  ["public/cursor/index.html", "https://pranaviram.com/social/cursor-loves-indie-v1.png"],
  ["public/figma/index.html", "https://pranaviram.com/social/figma-sound-v1.png"],
  ["public/codex/index.html", "https://pranaviram.com/social/codex-bookmarks-v1.png"],
];

test("every shareable endpoint declares its approved large image", async () => {
  for (const [path, image] of metadata) {
    const html = await text(path);
    assert.match(html, new RegExp(`property=["']og:image["'] content=["']${image.replaceAll(".", "\\.")}["']`), path);
    assert.match(html, new RegExp(`name=["']twitter:image["'] content=["']${image.replaceAll(".", "\\.")}["']`), path);
    assert.match(html, /property=["']og:image:width["'] content=["']1200["']/, path);
    assert.match(html, /property=["']og:image:height["'] content=["']630["']/, path);
    assert.match(html, /property=["']og:image:alt["'] content=["'][^"']+["']/, path);
    assert.match(html, /name=["']twitter:image:alt["'] content=["'][^"']+["']/, path);
    assert.doesNotMatch(html, /about\/Profile(?:%20| )picture\.png/i, path);
  }
});
```

- [ ] **Step 2: Run the metadata test and verify it fails**

Run: `npm run test:social`

Expected: FAIL on the first old portrait URL and on Figma’s missing metadata.

- [ ] **Step 3: Update the shared landing-preview documents**

Set `og:image` and `twitter:image` in the root, Surprise Rail, and Mixr documents to:

```html
<meta property="og:image" content="https://pranaviram.com/social/portfolio-landing-v1.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="Pranavi Ram’s portfolio shown in responsive browser windows." />
<meta name="twitter:image" content="https://pranaviram.com/social/portfolio-landing-v1.png" />
<meta name="twitter:image:alt" content="Pranavi Ram’s portfolio shown in responsive browser windows." />
```

Match each document’s existing slash/indent style without copying its surrounding CSS.

- [ ] **Step 4: Add About metadata**

In `about/index.html`, add `og:type`, `og:url`, page title/description, `summary_large_image`, dimensions, and both image-alt fields. Use `https://pranaviram.com/social/about-v1.png`.

- [ ] **Step 5: Add concept-specific metadata**

Use these absolute URLs:

```text
Cursor: https://pranaviram.com/social/cursor-loves-indie-v1.png
Figma:  https://pranaviram.com/social/figma-sound-v1.png
Codex:  https://pranaviram.com/social/codex-bookmarks-v1.png
```

Preserve Cursor and Codex’s existing page-specific titles/descriptions. Add to Figma:

```html
<link rel="canonical" href="https://pranaviram.com/figma/" />
<meta name="description" content="Figma Sound makes sound a design system material. An independent product concept by Pranavi Ram." />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://pranaviram.com/figma/" />
<meta property="og:site_name" content="Pranavi Ram" />
<meta property="og:title" content="Figma Sound — Pranavi Ram" />
<meta property="og:description" content="Figma Sound makes sound a design system material. An independent product concept by Pranavi Ram." />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Figma Sound — Pranavi Ram" />
<meta name="twitter:description" content="Figma Sound makes sound a design system material. An independent product concept by Pranavi Ram." />
```

- [ ] **Step 6: Run focused and existing metadata tests**

Run: `npm run test:social`

Expected: PASS.

Run: `node --test tests/site-identity.test.mjs tests/case-study-metadata-tone.test.mjs tests/cursor-deck.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit route-specific metadata**

```bash
git add index.html about/index.html public/surprise-rail/index.html public/mixr/index.html public/cursor/index.html public/figma/index.html public/codex/index.html tests/social-sharing-previews.test.mjs
git commit -m "feat: publish route-specific social previews"
```

---

### Task 4: Production verification, push, and deployment

**Files:**
- Verify: all files from Tasks 1–3
- Build output: `dist/` (generated and not committed)

**Interfaces:**
- Consumes: clean About entry, generated images, and endpoint metadata.
- Produces: verified `main` and deployed `gh-pages` branches.

- [ ] **Step 1: Run the complete relevant test suite**

Run:

```bash
node --test tests/*.test.mjs
```

Expected: all current repository tests PASS.

- [ ] **Step 2: Build production output**

Run: `npm run build`

Expected: TypeScript and Vite succeed with no errors.

- [ ] **Step 3: Inspect the built contracts**

Confirm:

```bash
test -f dist/about/index.html
test -f dist/social/portfolio-landing-v1.png
test -f dist/social/about-v1.png
test -f dist/social/cursor-loves-indie-v1.png
test -f dist/social/figma-sound-v1.png
test -f dist/social/codex-bookmarks-v1.png
rg -n "og:image|twitter:image|og:image:width|og:image:height" dist/index.html dist/about/index.html dist/surprise-rail/index.html dist/mixr/index.html dist/cursor/index.html dist/figma/index.html dist/codex/index.html
```

Expected: every file exists; all seven documents reference the expected versioned images and 1200 × 630 dimensions.

- [ ] **Step 4: Verify clean About navigation in a production preview**

Serve `dist`, open `/about/`, and verify the existing About page appears with the browser URL still ending in `/about/`. From About, verify Home and Work return to the existing landing experience. From the homepage and a static case study, verify About opens `/about/`.

- [ ] **Step 5: Perform final visual review**

Inspect the five built PNGs at 1200 × 630 and 600 × 315. Reject the build if any collage window has more than one tab, if a concept capture is mid-transition, if the gray background differs visibly from the supplied video, or if the portrait is isolated as the main artwork.

- [ ] **Step 6: Confirm the working tree only contains intended changes**

Run: `git status --short` and `git diff --check`.

Expected: no uncommitted implementation changes after the task commits, and no whitespace errors.

- [ ] **Step 7: Push the approved main branch**

Run: `git push origin main`

Expected: the remote `main` branch advances to the verified implementation commit.

- [ ] **Step 8: Deploy the production build**

Run: `npm run deploy`

Expected: predeploy rebuild succeeds and `gh-pages` publishes the new `dist` contents.

- [ ] **Step 9: Verify the live deployment**

Fetch the live homepage, About, Surprise Rail, Mixr, Cursor, Figma, and Codex documents. Confirm the new metadata, clean About URL, and all five image URLs return HTTP 200. Confirm the live page title and gold-frame favicon remain unchanged.

- [ ] **Step 10: Report cache behavior clearly**

Report the exact deployed commit and URLs. Note that the new versioned image filenames prevent reuse of the previous portrait asset, while a social platform may still require its own card-debugger refresh if it cached the old HTML response.

