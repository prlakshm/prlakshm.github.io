# Star Light Loading Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the existing baked star artwork visible until each WebGL light canvas has completed a safe first paint, then switch to the unchanged loaded effect without an intermediate black frame.

**Architecture:** A small first-paint gate owned by `stampLight.ts` controls a readiness class on each star row. One row-level class atomically reveals that row's existing WebGL canvas and removes its baked highlight; context loss and teardown return the row to the baked fallback. `BadgeCard.tsx` consults the same readiness state before routing pointer lighting to WebGL.

**Tech Stack:** React 18, TypeScript, WebGL 1, CSS, Node test runner, Vite

## Global Constraints

- Preserve the existing shader output, colors, blend mode, timing, and completed visual appearance.
- Preserve the current card dimensions and responsive layout.
- Do not duplicate the card CSS.
- Do not change badge progress, navigation, or storage behavior.
- Do not push or deploy.

---

### Task 1: Gate each WebGL star-row reveal behind its first completed paint

**Files:**
- Create: `tests/badge-light-loading.test.mjs`
- Modify: `src/components/badges/stampLight.ts:17-27,234-335`
- Modify: `src/components/badges/BadgeCard.tsx:288-393,707-742,768`
- Modify: `src/components/badges/badges.css:173-191`

**Interfaces:**
- Produces: `createStampLightRevealGate(canvas, requestFrame?, cancelFrame?)` with `afterDraw()`, `hide()`, `isReady()`, and `destroy()` methods.
- Produces: `StampLight.isReady(): boolean`, which is true only after a successful draw has crossed one later animation-frame boundary.
- Consumes: the existing `.bc-light` canvas, `.bc-lit` baked highlight, and `createStampLight()` lifecycle.

- [x] **Step 1: Write the failing readiness-gate and CSS regression tests**

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createStampLightRevealGate } from "../src/components/badges/stampLight.ts";

test("the stamp light reveals only on the paint after its first draw", () => {
  const classes = new Set();
  const queued = new Map();
  let nextId = 1;
  const canvas = {
    parentElement: {
      classList: {
        add: (name) => classes.add(name),
        remove: (name) => classes.delete(name),
      },
    },
  };
  const gate = createStampLightRevealGate(
    canvas,
    (callback) => {
      const id = nextId++;
      queued.set(id, callback);
      return id;
    },
    (id) => queued.delete(id),
  );

  assert.equal(gate.isReady(), false);
  gate.afterDraw();
  assert.equal(gate.isReady(), false);
  for (const callback of queued.values()) callback(16);
  queued.clear();
  assert.equal(gate.isReady(), true);
  assert.equal(classes.has("is-light-ready"), true);

  gate.hide();
  assert.equal(gate.isReady(), false);
  assert.equal(classes.has("is-light-ready"), false);
});

test("the stamp light loading CSS swaps fallback and WebGL in one row state", async () => {
  const css = await readFile(new URL("../src/components/badges/badges.css", import.meta.url), "utf8");
  assert.match(css, /\.bc-light\s*\{[^}]*visibility:\s*hidden/s);
  assert.match(css, /\.bc-slots\.is-light-ready \.bc-light\s*\{[^}]*visibility:\s*visible/s);
  assert.match(css, /\.bc-slots\.is-light-ready \.bc-lit\s*\{[^}]*display:\s*none/s);
  assert.doesNotMatch(css, /\.bc-gl \.bc-lit/);
});
```

- [x] **Step 2: Run the focused test to verify it fails for the missing gate**

Run: `node --test tests/badge-light-loading.test.mjs`

Expected: FAIL because `createStampLightRevealGate` is not exported and the canvas is not hidden by default.

- [x] **Step 3: Implement the first-paint gate and expose readiness on the WebGL light**

Add a focused gate in `stampLight.ts`:

```ts
const LIGHT_READY_CLASS = "is-light-ready";

export function createStampLightRevealGate(
  canvas: Pick<HTMLCanvasElement, "parentElement">,
  requestFrame: (callback: FrameRequestCallback) => number = requestAnimationFrame,
  cancelFrame: (id: number) => void = cancelAnimationFrame
) {
  let ready = false;
  let pending = 0;
  const hide = () => {
    if (pending) cancelFrame(pending);
    pending = 0;
    ready = false;
    canvas.parentElement?.classList.remove(LIGHT_READY_CLASS);
  };
  return {
    afterDraw() {
      if (ready || pending) return;
      pending = requestFrame(() => {
        pending = 0;
        const row = canvas.parentElement;
        if (!row) return;
        row.classList.add(LIGHT_READY_CLASS);
        ready = true;
      });
    },
    hide,
    isReady: () => ready,
    destroy: hide,
  };
}
```

Extend `StampLight` with `isReady(): boolean`. In `createStampLight()`, create the gate once, call `gate.afterDraw()` only after `gl.drawArrays(...)` succeeds, hide the gate on `webglcontextlost`, report `gate.isReady()`, and destroy the gate during cleanup. Remove the context-loss listener during cleanup.

- [x] **Step 4: Make the CSS switch atomic and keep pointer lighting on the fallback until ready**

In `badges.css`, hide only the canvas by default and reveal it from the same row class that disables the baked highlight:

```css
.bc-light {
  /* existing geometry and blend declarations stay unchanged */
  visibility: hidden;
}

.bc-slots.is-light-ready .bc-light {
  visibility: visible;
}

.bc-slots.is-light-ready .bc-lit {
  display: none;
}
```

In `BadgeCard.tsx`, stop applying the global `bc-gl` visual class. Route pointer movement to WebGL only when `lightFor(root)?.isReady()` is true; otherwise retain the existing baked-light path. Keep `glOn` only as the existing lifecycle/layout signal.

- [x] **Step 5: Run the focused test to verify it passes**

Run: `node --test tests/badge-light-loading.test.mjs`

Expected: both tests PASS.

- [x] **Step 6: Run all automated tests and the production build**

Run: `node --test tests/*.test.mjs`

Expected: all tests PASS.

Run: `npm run build`

Expected: TypeScript and Vite build successfully with no errors.

- [x] **Step 7: Verify repeated phone-sized cold loads**

Run: `npm run dev -- --host 127.0.0.1 --port 5174`

At a 390 × 844 viewport, reload the landing page at least eight times. Confirm the compact card always shows the baked star artwork while loading, never shows a black or blank row, and reaches the same finished WebGL appearance.

- [x] **Step 8: Commit the isolated loading guard**

```bash
git add tests/badge-light-loading.test.mjs src/components/badges/stampLight.ts src/components/badges/BadgeCard.tsx src/components/badges/badges.css docs/superpowers/plans/2026-10-07-star-light-loading-guard.md
git commit -m "fix: guard star light initialization"
```
