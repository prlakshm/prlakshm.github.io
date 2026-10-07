import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const navSource = await readFile(
  new URL("../src/pages/home/WtNav.tsx", import.meta.url),
  "utf8",
);
const chromeCss = await readFile(
  new URL("../src/pages/home/chrome.css", import.meta.url),
  "utf8",
);

test("phone navigation exposes an accessible text menu button", () => {
  assert.match(navSource, /className="wt-nav-toggle"/);
  assert.match(navSource, /aria-label=\{mobileOpen \? "Close menu" : "Open menu"\}/);
  assert.match(navSource, /aria-expanded=\{mobileOpen\}/);
  assert.match(navSource, /aria-controls=\{menuId\}/);
  assert.match(navSource, />\s*INDEX\s*<span className="nav-rule" aria-hidden="true" \/>\s*<\/button>/);
});

test("phone navigation becomes a parchment dropdown while desktop links stay visible", () => {
  assert.match(navSource, /wt-primary-nav\$\{mobileOpen \? " is-open" : ""\}/);
  assert.match(chromeCss, /@media \(max-width: 767px\)[\s\S]*?\.wt-nav-toggle\s*\{[\s\S]*?display:\s*inline-flex/);
  assert.match(chromeCss, /@media \(max-width: 767px\)[\s\S]*?\.wt-primary-nav\s*\{[\s\S]*?position:\s*absolute/);
  assert.match(chromeCss, /\.wt-primary-nav\.is-open\s*\{[\s\S]*?visibility:\s*visible/);
});

test("mobile menu supports escape and outside-click dismissal", () => {
  assert.match(navSource, /event\.key !== "Escape"/);
  assert.match(navSource, /document\.addEventListener\("pointerdown", onOutside\)/);
  assert.match(navSource, /menuButtonRef\.current\?\.focus\(\)/);
});
