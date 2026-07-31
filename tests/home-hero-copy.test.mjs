import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../src/pages/home/Home.tsx", import.meta.url),
  "utf8"
);

test("hero identifies Pranavi as a 0-to-1 design engineer", () => {
  assert.match(source, /Design Engineer for 0 → 1 product experiences/);
  assert.doesNotMatch(source, /Design Engineer for 0→1 product experiences/);
  assert.doesNotMatch(source, /Designer at intersection Film \+ Technology/);
});
