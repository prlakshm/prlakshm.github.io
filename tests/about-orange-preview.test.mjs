import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

test("About maps color query numbers to the nine contact-sheet oranges", () => {
  const preview = read("src/pages/about/orangePreview.ts");

  for (const hex of [
    "#fec79a",
    "#ffc98f",
    "#ffc266",
    "#ffb873",
    "#ffae70",
    "#ffa36a",
    "#ff995d",
    "#ff8f55",
    "#ff9275",
  ]) assert.match(preview.toLowerCase(), new RegExp(hex));

  assert.match(preview, /params\.get\("color"\)/);
  assert.match(preview, /index < 1 \|\| index > ORANGE_PREVIEWS\.length/);
});

test("About applies the selected orange only to oepeach tissue sprites", () => {
  const about = read("src/pages/about/About.tsx");
  const pop = read("src/pages/about/portraitPop.ts");
  const frame = read("src/pages/about/portraitFrame.ts");

  assert.match(about, /orangePreviewFromSearch\(window\.location\.search\) \?\? DEFAULT_ORANGE_PREVIEW/);
  assert.match(about, /mountPortraitPop\(fig, pane, prefersReducedMotion\(\), orangePreview\)/);
  assert.match(pop, /p\.kind === "tissue" && p\.s\?\.includes\("-oepeach"\)/);
  assert.match(pop, /feColorMatrix/);
  assert.match(pop, /url\(#\$\{filterId\}\)/);
  assert.match(frame.toLowerCase(), /oepeach:\s*"#ffc98f"/);
});
