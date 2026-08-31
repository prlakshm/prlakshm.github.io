# Mixr Alternate Graffiti Pockets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add contour-aligned “Mixr” tags to the four requested empty pockets in the alternate poster without changing its wider aura.

**Architecture:** Keep the existing generated orbit system intact and append a small deterministic placement list after featured-tag selection. Compute each added tag’s rotation from the existing silhouette distance field, then render it through the existing `roughWord` path before the figure is composited.

**Tech Stack:** HTML Canvas, browser JavaScript, Node.js built-in test runner

## Global Constraints

- Preserve `RING_STEP=118`, `RING_START=74`, `MAXD=480`, and the existing distance-based opacity fade.
- Add tags only above the head, above and below the left arm, and above the right arm.
- Do not add the focus poster’s left-hip fill or stray-tag removal.
- Do not modify `poster-mixr-focus.html`.

---

### Task 1: Add and verify the four graffiti pocket clusters

**Files:**
- Create: `tests/mixr-alt-graffiti-pockets.test.mjs`
- Modify: `poster-lab/pinnables/poster-mixr-alt.html:310-315`

**Interfaces:**
- Consumes: existing `spots`, `tagSpot`, `dist(X, Y)`, `rnd()`, `TYPO_Y`, `DOWN`, `WORD_FS`, `GWORD`, `GRAF`, and `roughWord(...)`
- Produces: seven deterministic tag placements distributed across the four requested pockets

- [ ] **Step 1: Write the failing source-contract test**

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../poster-lab/pinnables/poster-mixr-alt.html", import.meta.url),
  "utf8",
);

test("fills only the requested Mixr graffiti pockets", () => {
  assert.match(source, /const POCKET_FILL=\[/);
  for (const point of [
    "[332,624]", "[560,556]", "[812,486]",
    "[1182,700]", "[1302,776]",
    "[300,998]", "[452,1052]",
  ]) {
    assert.ok(source.includes(point), `missing pocket placement ${point}`);
  }
  assert.doesNotMatch(source, /placeNear\(452,1694\)/);
});

test("preserves the alternate poster aura", () => {
  assert.match(source, /const RING_STEP=118;/);
  assert.match(source, /const RING_START=74;/);
  assert.match(source, /const MAXD=480;/);
  assert.match(source, /const fade=\.98-\.26\*\(\(L-RING_START\)\/\(MAXD-RING_START\)\);/);
});
```

- [ ] **Step 2: Run the test and confirm the new placement contract fails**

Run: `node --test tests/mixr-alt-graffiti-pockets.test.mjs`

Expected: the first test fails because `POCKET_FILL` does not exist; the aura-preservation test passes.

- [ ] **Step 3: Append the deterministic pocket placements**

Insert after `const tagSpot=spots[tagIdx];`:

```js
  // Fill only the four reviewed pockets while keeping the alternate poster's
  // wider generated aura intact. These draw before the figure so the words
  // tuck naturally behind her silhouette.
  {
    const OFF=TYPO_Y+DOWN;
    const POCKET_FILL=[
      [332,624],[560,556],[812,486],       // above left arm and close above head
      [1182,700],[1302,776],               // above right arm
      [300,998],[452,1052],                // below left arm
    ];
    for(const [px,py] of POCKET_FILL){
      const sy=py-OFF, e=7;
      const dx=dist(px+e,sy)-dist(px-e,sy), dy=dist(px,sy+e)-dist(px,sy-e);
      let rot=Math.atan2(dx,-dy);
      if(Math.cos(rot)<0)rot+=Math.PI;
      rot+=(rnd()-.5)*.16;
      spots.push({x:px,y:sy,rot,fade:.97,L:RING_START});
    }
  }
```

Change the render exclusion from the original numeric index to the selected object:

```js
  spots.forEach(p=>{
    if(p!==tagSpot)roughWord(GWORD,WORD_FS,GRAF,p.x,p.y+TYPO_Y+DOWN,p.rot,p.fade);
  });
```

- [ ] **Step 4: Run the source-contract test**

Run: `node --test tests/mixr-alt-graffiti-pockets.test.mjs`

Expected: both tests pass.

- [ ] **Step 5: Verify the rendered poster**

Reload `http://localhost:4517/poster-mixr-alt.html` and capture the full poster. Confirm the new tags fill all four requested pockets, remain behind the figure, and do not obscure the face, hands, headline, or white “iOS DJ App” tag. Read browser console errors and expect none.

Open `http://localhost:4517/poster-mixr-focus.html` and confirm it still renders unchanged.

- [ ] **Step 6: Run repository verification**

Run: `npm run build`

Expected: TypeScript and Vite complete successfully.

- [ ] **Step 7: Commit the implementation**

```bash
git add poster-lab/pinnables/poster-mixr-alt.html tests/mixr-alt-graffiti-pockets.test.mjs docs/superpowers/plans/2026-08-30-mixr-alt-graffiti-pockets.md
git commit -m "feat: fill mixr alt graffiti pockets"
```
