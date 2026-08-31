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
  assert.match(html, /if\(!p\.hipContour&&p\.x>cutX\(sy\)\)return;/);
  assert.doesNotMatch(html, /\[1124,1462,-0\.10\]/);
  assert.doesNotMatch(html, /\[1166,1644,-0\.06\]/);
  assert.doesNotMatch(html, /\[1206,1818,0\.02\]/);
});

test("adds one outer-ring word beside the mid-right hip", async () => {
  const html = await readFile(pagePath, "utf8");

  assert.match(html, /const RIGHT_HIP_EXTRA_Y=1540;/);
  assert.match(html, /const RIGHT_HIP_EXTRA_DISTANCE=RIGHT_HIP_DISTANCE\+RING_STEP;/);
  assert.equal((html.match(/hipContourLayer:2/g) || []).length, 1);
});
