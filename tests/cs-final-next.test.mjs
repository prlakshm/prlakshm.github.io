import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pagePath = new URL("../public/cs-final/cs-final.html", import.meta.url);

test("reveals a landing-page Next link when reading reaches 100%", async () => {
  const html = await readFile(pagePath, "utf8");

  assert.match(html, /<div class="prog" id="prog">/);
  assert.match(html, /<a class="next" href="\/"[^>]*>\s*NEXT/);
  assert.match(html, /prog\.classList\.toggle\("done", p >= 99\.5\)/);
  assert.match(html, /\.prog\.done \.next\{/);
});

test("reuses the landing-page navigation above the case-study shell", async () => {
  const html = await readFile(pagePath, "utf8");
  const navIndex = html.indexOf('<header class="wt-nav">');
  const shellIndex = html.indexOf('<div class="shell">');

  assert.ok(navIndex >= 0, "landing-page navigation should be present");
  assert.ok(navIndex < shellIndex, "navigation should appear before the case-study shell");
  assert.match(html, /<a class="wt-wordmark" href="\/#\/">PRANAVI RAM<\/a>/);
  assert.match(html, /href="\/#\/projects"[^>]*>WORK/);
  assert.match(html, /href="\/#\/about"[^>]*>ABOUT/);
  assert.match(html, /class="ext-arrow"/);
  assert.match(html, /--nav-height:78px/);
  assert.match(html, /\.side\{position:sticky;top:var\(--nav-height\)/);
});
