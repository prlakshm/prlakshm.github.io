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

test("presents the descriptor research conclusion as a chosen decision", async () => {
  const html = await readFile(pagePath, "utf8");
  const start = html.indexOf('<section id="built">');
  const end = html.indexOf("<!-- 05 -->", start);
  const behavior = html.slice(start, end);

  assert.match(
    behavior,
    /<div class="flag rv d2">\s*<p>Chosen: Two- or three-word thematic clues\. Working with UX research, we found they were easiest to scan and had the greatest impact on decisions\.<\/p>\s*<\/div>/,
  );
  assert.doesNotMatch(
    behavior,
    /<h3>Two or three words\. Thematic or tactical, never atmospheric\.<\/h3>/,
  );
  assert.doesNotMatch(behavior, /Research compared four descriptor types/);
  assert.doesNotMatch(
    behavior,
    /<div class="dec rv d1">\s*<div class="flag rv d2">/,
  );
});

test("shows How I worked in its own full-width metadata structure", async () => {
  const html = await readFile(pagePath, "utf8");
  const headerStart = html.indexOf("<main>");
  const headerEnd = html.indexOf("</header>", headerStart);
  const header = html.slice(headerStart, headerEnd);

  assert.match(
    header,
    /<div class="meta meta-how">\s*<div><span>How I worked<\/span><span>Invent an engaging feature &rarr; build a product yourself &rarr; design with emerging technology<\/span><\/div>\s*<\/div>/,
  );
  const primaryMetaEnd = header.indexOf("</div>", header.indexOf('<div class="meta">'));
  const howIndex = header.indexOf('<div class="meta meta-how">');
  assert.ok(howIndex > primaryMetaEnd, "How I worked should sit below the primary metadata");
  assert.match(html, /\.meta-how\{[^}]*margin-top:0/);
  assert.match(html, /\.meta-how div\{[^}]*flex-basis:100%/);
});

test("uses a full-column wash on main and localizes sidebar and nav washes", async () => {
  const html = await readFile(pagePath, "utf8");

  assert.doesNotMatch(html, /\.side::before/);
  assert.match(html, /main::before\{content:"";position:absolute;z-index:-1;/);
  assert.match(html, /main::before\{[^}]*background:color-mix\(in srgb,var\(--ground\) 50%,transparent\)/);
  assert.match(html, /:is\(\.jump,\.prog,\.wt-nav-inner\),main\{position:relative;isolation:isolate\}/);
  assert.doesNotMatch(html, /--parchment:/);
  assert.match(html, /body::before\{[^}]*z-index:0/);
  assert.match(html, /body>\.wt-nav,body>\.shell\{position:relative;z-index:1\}/);
  assert.doesNotMatch(html, /header\.rv,\.sechead,\.stack>p/);
  assert.match(html, /\.wt-nav-inner\{position:relative;isolation:isolate;/);
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

test("explains the subpage-aware title treatment in one short sentence", async () => {
  const html = await readFile(pagePath, "utf8");
  const changedStart = html.indexOf('<section id="changed">');
  const changedEnd = html.indexOf("<!-- 06 -->", changedStart);
  const changed = html.slice(changedStart, changedEnd);

  assert.match(
    changed,
    /<p>Like the clues, the title changes with the subpage to show viewers they're getting something different: "Blind Date with a Romance" or "Blind Date with a Mystery"\.<\/p>/,
  );
  assert.doesNotMatch(changed, /I also wanted to change the title based on the subpage/);
});

test("uses type anatomy guides behind both naming lockups", async () => {
  const html = await readFile(pagePath, "utf8");
  const changedStart = html.indexOf('<section id="changed">');
  const changedEnd = html.indexOf("<!-- 06 -->", changedStart);
  const changed = html.slice(changedStart, changedEnd);

  assert.match(changed, /namecard namecard--blind[\s\S]*type-line type-line--primary[\s\S]*type-line type-line--secondary/);
  assert.match(changed, /namecard namecard--surprise[\s\S]*type-line type-line--single/);
  assert.match(html, /\.namecard \.type-line::before,\.namecard \.type-line::after\{[^}]*background:#7a7a88/);
  assert.match(html, /\.namecard \.type-line::before\{top:var\(--cap-line\)\}/);
  assert.match(html, /\.namecard \.type-line::after\{top:var\(--baseline\)\}/);
  assert.match(html, /\.namecard \.gridv\{[^}]*background:#7a7a88[^}]*bottom:auto/);
  assert.match(html, /\.namecard--blind \.gridv\{[^}]*height:var\(--blind-guide-height\)/);
  assert.match(html, /\.namecard--surprise \.gridv\{[^}]*height:var\(--surprise-guide-height\)/);
  assert.doesNotMatch(html, /\.namecard \.gridbox::before,\.namecard \.gridbox::after/);
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

test("formats the two result metrics as labels beside stacked fractions", async () => {
  const html = await readFile(pagePath, "utf8");
  const resultsStart = html.indexOf('<section id="limits">');
  const resultsEnd = html.indexOf('<div class="case-actions">', resultsStart);
  const results = html.slice(resultsStart, resultsEnd);

  assert.match(results, /<li class="result-metric">[\s\S]*<div class="metric-equation">[\s\S]*<b>Reveal Rate<\/b>[\s\S]*<span class="fraction" aria-label="reveals divided by tiles viewed">[\s\S]*<span class="numerator">reveals<\/span>[\s\S]*<span class="denominator">tiles viewed<\/span>[\s\S]*<\/div>[\s\S]*<p class="metric-question">Did the clue earn a click\?<\/p>/);
  assert.match(results, /<li class="result-metric">[\s\S]*<div class="metric-equation">[\s\S]*<b>Play After Reveal<\/b>[\s\S]*<span class="fraction" aria-label="plays divided by reveals">[\s\S]*<span class="numerator">plays<\/span>[\s\S]*<span class="denominator">reveals<\/span>[\s\S]*<\/div>[\s\S]*<p class="metric-question">Did the click earn a play\?<\/p>/);
  assert.match(html, /\.results-metrics \.stats\{[^}]*display:grid;[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\);gap:clamp\(22px,5vw,64px\)/);
  assert.match(html, /\.results-metrics \.result-metric\{[^}]*gap:0/);
  assert.match(html, /\.metric-equation\{display:flex;[^}]*gap:12px/);
  assert.match(html, /\.metric-question\{[^}]*margin-top:clamp\(19\.2px,2\.4vw,25\.6px\)/);
  assert.match(html, /\.numerator\{[^}]*border-bottom:1px solid/);
  assert.doesNotMatch(results, /class="metric-formula"/);
});

test("turns the frosted-glass anatomy into one focused black prototype panel", async () => {
  const html = await readFile(pagePath, "utf8");
  const start = html.indexOf('<section id="decisions">');
  const end = html.indexOf("<!-- 04 -->", start);
  const decisions = html.slice(start, end);

  assert.match(decisions, /<section class="tile-breakdown"/);
  assert.match(decisions, /<h3 class="tile-breakdown-title"[^>]*>Design Breakdown<\/h3>/);
  assert.match(decisions, /class="lyr"/);
  assert.match(decisions, /class="irid-palette"/);
  assert.match(decisions, />Iridescent Gradient<\/p>/);
  assert.match(decisions, /class="gradient-bar"/);
  assert.match(decisions, /left:0%[\s\S]*left:17%[\s\S]*left:30%[\s\S]*left:56%[\s\S]*left:91%/);
  assert.match(decisions, /#BEA6BF[\s\S]*#EDEFE5[\s\S]*#E6D5E8[\s\S]*#979AB1[\s\S]*#EDEFE5/);
  assert.match(decisions, /class="title-font-spec"[^>]*>Title Font</);
  assert.doesNotMatch(decisions, /badge-iridescent|Contextual Info|tokbar--glare/);
  assert.match(html, /\.tile-breakdown\{[^}]*background:var\(--max-ink\)/);
  assert.match(html, /\.tile-breakdown\{[^}]*--breakdown-gap:19\.2px/);
  assert.match(html, /\.tile-breakdown\{[^}]*--specimen-gap:11\.52px/);
  assert.match(html, /\.tile-breakdown\{[^}]*--title-font-gap:16\.848px/);
  assert.match(html, /\.tile-breakdown-title\{[^}]*color:#fff/);
  assert.match(html, /\.tile-breakdown-title\{[^}]*font-size:clamp\(37\.5px,5vw,55px\)/);
  assert.match(html, /\.tile-breakdown-title\{[^}]*margin:0 0 var\(--breakdown-gap\)/);
  assert.match(html, /\.tile-breakdown \.lyr b,\.tile-breakdown \.lyr i\{color:#a6a6b0/);
  assert.match(html, /\.gradient-bar\{[^}]*background-image:var\(--irid-banner\)/);
  const paletteRule = html.match(/\.irid-palette\{([^}]*)\}/)?.[1] ?? "";
  assert.doesNotMatch(paletteRule, /border-top/);
  assert.match(paletteRule, /margin-top:var\(--specimen-gap\)/);
  assert.match(html, /\.title-font-spec\{[^}]*margin:var\(--title-font-gap\) 0 0/);
  const gradientBarRule = html.match(/\.gradient-bar\{([^}]*)\}/)?.[1] ?? "";
  assert.doesNotMatch(gradientBarRule, /border:/);
  assert.match(html, /\.title-font-spec\{[^}]*background-image:var\(--irid-banner\)/);
});
