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
