import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../src/pages/home/Journal.tsx", import.meta.url),
  "utf8"
);

test("notebook interaction opens its cover and renders the full artifact spill", () => {
  assert.match(source, /className="jr-img jr-img--closed"/);
  assert.match(source, /className="jr-img jr-img--open"/);
  assert.match(source, /className="jr-tooltip"/);
  assert.match(source, /className="jr-artifacts"/);
  assert.match(source, /className=\{`jr-artifact/);
  assert.match(source, /artifacts\.map/);
  assert.match(source, /cards\.forEach/);
});
