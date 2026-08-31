# MIXR Right-Hip Contour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make intact `Mixr` words form the right-hip curve and move that contour 10 canvas pixels farther right.

**Architecture:** Keep the existing single-canvas renderer and its silhouette distance field. Replace the three manually positioned right-hip tags with a small contour sampler that finds the silhouette's right edge, offsets it by the existing inner-ring distance plus 10 pixels, and distributes words by accumulated arc length so they overlap into a continuous typographic curve.

**Tech Stack:** HTML5 Canvas, browser JavaScript, Node.js built-in test runner, in-app browser visual verification.

## Global Constraints

- Modify only `poster-lab/pinnables/mixr-side.html` and a focused source-contract test.
- Preserve all existing uncommitted spacing refinements.
- Keep word style, size, color, spray texture, figure, wave bands, and non-hip aura unchanged.
- Extend only the right-hip contour by exactly 10 canvas pixels relative to the existing inner contour.
- Keep every right-hip word intact and tangent to the local silhouette contour.

---

### Task 1: Lock the right-hip contour contract

**Files:**
- Create: `tests/mixr-side-contour.test.mjs`
- Test: `tests/mixr-side-contour.test.mjs`

**Interfaces:**
- Consumes: source text from `poster-lab/pinnables/mixr-side.html`
- Produces: regression checks for `RIGHT_HIP_EXTEND`, `rightHipContour`, arc-length spacing, and removal of fixed horizontal hip overrides

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pagePath = new URL("../poster-lab/pinnables/mixr-side.html", import.meta.url);

test("builds the right hip from an intact contour extended by ten pixels", async () => {
  const html = await readFile(pagePath, "utf8");
  assert.match(html, /const RIGHT_HIP_EXTEND=10;/);
  assert.match(html, /const rightHipContour=/);
  assert.match(html, /arc\+=Math\.hypot/);
  assert.match(html, /hipContour:true/);
  assert.doesNotMatch(html, /\[1124,1462,-0\.10\]/);
  assert.doesNotMatch(html, /\[1166,1644,-0\.06\]/);
  assert.doesNotMatch(html, /\[1206,1818,0\.02\]/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/mixr-side-contour.test.mjs`

Expected: FAIL because `RIGHT_HIP_EXTEND` and `rightHipContour` do not exist and the fixed horizontal overrides remain.

### Task 2: Generate the continuous right-hip word contour

**Files:**
- Modify: `poster-lab/pinnables/mixr-side.html:340-420`
- Test: `tests/mixr-side-contour.test.mjs`

**Interfaces:**
- Consumes: `graf.maskAt(x, y)`, `dist(x, y)`, `RING_START`, `wordW`, `spots`, and the existing contour-gradient rotation calculation
- Produces: `rightHipContour(): Array<{x:number,y:number,rot:number,fade:number,L:number,hipContour:true}>`

- [ ] **Step 1: Add the contour sampler**

Add constants for the 10-pixel extension and hip bounds. For each vertical sample, scan from the figure center toward the right until the ray has exited the body and reached `RING_START + RIGHT_HIP_EXTEND`. Accumulate distance between samples, emitting a word at overlapping word-length intervals. Derive rotation from the existing distance-field gradient and mark emitted spots with `hipContour:true`.

```js
const RIGHT_HIP_EXTEND=10;
const RIGHT_HIP_TOP=1380, RIGHT_HIP_BOTTOM=1900;
const RIGHT_HIP_DISTANCE=RING_START+RIGHT_HIP_EXTEND;
const rightHipContour=()=>{
  const path=[];
  for(let py=RIGHT_HIP_TOP;py<=RIGHT_HIP_BOTTOM;py+=4){
    let leftBody=false;
    for(let px=Math.floor(cx0Graf);px<W-MB;px+=4){
      if(graf.maskAt(px,py)>128){leftBody=true;continue}
      if(leftBody&&dist(px,py)>=RIGHT_HIP_DISTANCE){path.push([px,py]);break}
    }
  }
  const out=[];
  let arc=wordW*.28,prev=path[0];
  for(const p of path){
    arc+=Math.hypot(p[0]-prev[0],p[1]-prev[1]);prev=p;
    if(arc<wordW*.55)continue;
    arc=0;
    const [px,py]=p,e=7;
    const gx=dist(px+e,py)-dist(px-e,py),gy=dist(px,py+e)-dist(px,py-e);
    let rot=Math.atan2(gx,-gy);
    if(Math.cos(rot)<0)rot+=Math.PI;
    out.push({x:px,y:py-(TYPO_Y+DOWN),rot,fade:.97,L:RING_START,hipContour:true});
  }
  return out;
};
```

- [ ] **Step 2: Replace the fixed right-hip overrides**

Remove the three horizontal coordinate tuples. Remove only existing inner-ring spots in the right-hip corridor so they cannot interrupt the new contour, then append `rightHipContour()` to `spots`. Keep all outer rings and non-hip spots.

- [ ] **Step 3: Run the focused test**

Run: `node --test tests/mixr-side-contour.test.mjs`

Expected: PASS.

- [ ] **Step 4: Run the full Node test suite**

Run: `node --test tests/*.test.mjs`

Expected: PASS.

### Task 3: Verify the poster visually

**Files:**
- Verify: `poster-lab/pinnables/mixr-side.html`

**Interfaces:**
- Consumes: `http://localhost:4517/mixr-side.html`
- Produces: verified canvas rendering with intact, tangent right-hip words and no unrelated regression

- [ ] **Step 1: Reload the local poster**

Reload the existing in-app browser tab and wait for the canvas render.

- [ ] **Step 2: Inspect the right hip at canvas scale**

Confirm that the inner word silhouettes form a continuous curve down the right hip, remain intact rather than disappearing under the figure, and sit 10 pixels outside the prior inner contour.

- [ ] **Step 3: Inspect unchanged regions**

Confirm the left curve, upper aura, white tag, wave bands, figure, border, and existing spacing changes remain visually unchanged.

- [ ] **Step 4: Review the final diff**

Run: `git diff -- poster-lab/pinnables/mixr-side.html tests/mixr-side-contour.test.mjs`

Expected: only the focused test and right-hip contour logic differ; the user's pre-existing spacing edits remain present.
