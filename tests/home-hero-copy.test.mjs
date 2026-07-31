import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pagePath = new URL("../src/pages/home/Home.tsx", import.meta.url);

test("keeps the previous-work label on the right while updating the landing hero copy", async () => {
  const page = await readFile(pagePath, "utf8");
  const introStart = page.indexOf('<div className="hero-intro">');
  const introEnd = page.indexOf("<ContactIcons", introStart);
  const intro = page.slice(introStart, introEnd);

  assert.match(intro, /Designer at intersection Film \+ Technology/);
  assert.match(intro, /Building apps \+ sharing the process on X/);
  assert.match(intro, /@pranavibuilds/);
  assert.match(intro, /<p className="line line--label">Prev:<\/p>/);
  assert.match(intro, /Product Design @ hbo max/);
});
