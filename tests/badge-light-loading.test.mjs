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
    (id) => queued.delete(id)
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

  gate.afterDraw();
  assert.equal(queued.size, 1);
  gate.destroy();
  assert.equal(queued.size, 0);
  assert.equal(gate.isReady(), false);
});

test("the stamp light loading CSS swaps fallback and WebGL in one row state", async () => {
  const css = await readFile(new URL("../src/components/badges/badges.css", import.meta.url), "utf8");

  assert.match(css, /\.bc-light\s*\{[^}]*visibility:\s*hidden/s);
  assert.match(css, /\.bc-slots\.is-light-ready \.bc-light\s*\{[^}]*visibility:\s*visible/s);
  assert.match(css, /\.bc-slots\.is-light-ready \.bc-lit\s*\{[^}]*display:\s*none/s);
  assert.doesNotMatch(css, /\.bc-gl \.bc-lit/);
});

test("losing the WebGL context restores the baked fallback", async () => {
  const source = await readFile(new URL("../src/components/badges/stampLight.ts", import.meta.url), "utf8");
  const handler = source.match(/const onContextLost = \(\) => \{[\s\S]*?\n  \};/)?.[0] ?? "";

  assert.match(handler, /reveal\.hide\(\)/);
  assert.match(source, /addEventListener\("webglcontextlost", onContextLost\)/);
  assert.match(source, /removeEventListener\("webglcontextlost", onContextLost\)/);
});
