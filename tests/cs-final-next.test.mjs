import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pagePath = new URL("../public/cs-final/cs-final.html", import.meta.url);

test("keeps Next past the content edge without shrinking reading progress", async () => {
  const html = await readFile(pagePath, "utf8");
  const progressStart = html.indexOf('<div class="prog" id="prog">');
  const progressEnd = html.indexOf("</div>", progressStart);
  const progressMarkup = html.slice(progressStart, progressEnd);

  assert.ok(progressStart >= 0, "reading progress should be present");
  assert.doesNotMatch(progressMarkup, /NEXT|class="next"/);
  assert.match(progressMarkup, /<span>READ<\/span>[\s\S]*class="track"[\s\S]*id="pct"/);
  assert.match(html, /<a class="case-next" href="\/"[^>]*>\s*NEXT/);
  assert.match(html, /main\{position:relative;/);
  assert.match(html, /\.case-next\{position:absolute;right:calc\(-1 \* var\(--gutter\)\);/);
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

test("aligns the sidebar and case-study labels to one shared grid offset", async () => {
  const html = await readFile(pagePath, "utf8");

  assert.match(html, /--intro-grid-offset:43px/);
  assert.match(html, /\.side\{[^}]*padding-block:var\(--intro-grid-offset\)/);
  assert.match(html, /main\{[^}]*padding-block:var\(--intro-grid-offset\)/);
});
