import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pagePath = new URL("../public/surprise-rail/index.html", import.meta.url);

test("keeps Home and Next past the content edge without shrinking reading progress", async () => {
  const html = await readFile(pagePath, "utf8");
  const progressStart = html.indexOf('<div class="prog" id="prog">');
  const progressEnd = html.indexOf("</div>", progressStart);
  const progressMarkup = html.slice(progressStart, progressEnd);

  assert.ok(progressStart >= 0, "reading progress should be present");
  assert.doesNotMatch(progressMarkup, /NEXT|class="next"/);
  assert.match(progressMarkup, /<span>READ<\/span>[\s\S]*class="track"[\s\S]*id="pct"/);
  assert.match(html, /<a class="case-home" href="\/"[^>]*>\s*HOME[\s\S]*class="next-arrow"/);
  // NEXT carries the reader on to the next notebook in the landing page's own
  // order (01 Surprise Rail -> 02 Mixr). It used to point at "/", which just
  // repeated HOME beside it.
  assert.match(html, /<a class="case-next" href="\/mixr\/"[^>]*>\s*NEXT/);
  assert.match(html, /main\{position:relative;/);
  assert.match(html, /\.case-actions\{position:absolute;right:calc\(-1 \* var\(--gutter\)\);/);
  assert.match(html, /\.case-actions\{[^}]*flex-direction:column;[^}]*gap:calc\(var\(--grid-minor\) - var\(--case-link-h\)\)/);
});

test("keeps only a compact runway below the conclusion", async () => {
  const html = await readFile(pagePath, "utf8");

  assert.match(html, /main\{padding-block:var\(--intro-grid-offset\) 130px;min-width:0\}/);
  assert.doesNotMatch(html, /main\{padding-block:var\(--intro-grid-offset\) 260px/);
  assert.match(html, /main::before\{bottom:0\}/);
});

test("aligns the sidebar and case-study labels to one shared grid offset", async () => {
  const html = await readFile(pagePath, "utf8");

  assert.match(html, /--intro-grid-offset:43px/);
  assert.match(html, /\.side\{[^}]*padding-block:var\(--intro-grid-offset\)/);
  assert.match(html, /main\{[^}]*padding-block:var\(--intro-grid-offset\)/);
});

test("frames the behavior section as page-aware AI", async () => {
  const html = await readFile(pagePath, "utf8");
  const start = html.indexOf('<section id="built">');
  const end = html.indexOf("<!-- 05 -->", start);
  const behavior = html.slice(start, end);

  assert.ok(start >= 0, "behavior section should be present");
  assert.match(behavior, /<h2>AI tailors clues to the page\.<\/h2>/);
  assert.doesNotMatch(behavior, /Where you are decides what you're told/);
});

test("uses the same title color for Hacks and Game of Thrones", async () => {
  const html = await readFile(pagePath, "utf8");
  const start = html.indexOf('<section id="built">');
  const end = html.indexOf("<!-- 05 -->", start);
  const behavior = html.slice(start, end);

  assert.match(behavior, /<text class="lb"[^>]*>Hacks<\/text>/);
  assert.match(behavior, /<text class="lb"[^>]*>Game of<\/text>/);
  assert.doesNotMatch(behavior, /<text class="hd"[^>]*>Hacks<\/text>/);
});

test("gives the paired naming prototypes the standard figure spacing", async () => {
  const html = await readFile(pagePath, "utf8");
  const changedStart = html.indexOf('<section id="changed">');
  const changedEnd = html.indexOf("<!-- 06 -->", changedStart);
  const changed = html.slice(changedStart, changedEnd);

  assert.match(changed, /<div class="two rv d2">[\s\S]*Blind Date[\s\S]*Surprise/);
  assert.match(html, /\.two\{[^}]*margin:26px 0/);
  assert.doesNotMatch(html, /\.two\{[^}]*margin-top:26px/);
});

test("paints namecard gradients on the full glyph box despite negative leading", async () => {
  const html = await readFile(pagePath, "utf8");

  assert.match(
    html,
    /\.namecard \.line-copy\{[^}]*background-image:var\(--irid-banner\)[^}]*-webkit-background-clip:text[^}]*background-clip:text[^}]*color:transparent/,
  );
  assert.match(html, /\.namecard \.rail-title\{[^}]*background-image:none/);
  assert.match(
    html,
    /\.namecard \.type-line--secondary \.line-copy\{[^}]*-webkit-text-fill-color:#fff/,
  );
});
