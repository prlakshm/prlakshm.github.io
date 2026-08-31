import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pagePath = new URL("../poster-lab/pinnables/poster-mixr-wave.html", import.meta.url);

test("fills the sheet with the current orbit spacing, then keeps words left of a wave cut", async () => {
  const html = await readFile(pagePath, "utf8");

  assert.match(html, /const RING_STEP=100;/);
  assert.match(html, /const RING_START=72;/);
  assert.match(html, /const GAP=22;/);
  assert.match(html, /const fade=\.97;/);
  assert.match(html, /const CUT=/);
  assert.match(html, /const cutX=y=>/);
  assert.match(html, /if\(p!==tagSpot&&!p\.pocket&&p\.x>cutX\(sy\)\)return;/);
  assert.match(html, /pocket:true/);
  assert.match(html, /headContour:true/);
  assert.match(html, /placeNear\(392,656\)/);
  assert.doesNotMatch(html, /\[1182,700\]/);

  const maxd = html.match(/const MAXD=(\d+)/);
  assert.ok(maxd, "expected a numeric MAXD for a filled field");
  assert.ok(Number(maxd[1]) >= 800, `MAXD ${maxd[1]} should cover the left field, not a 3-ring halo`);

  assert.doesNotMatch(html, /MAXD=72\+100\*2\.5/);
});
