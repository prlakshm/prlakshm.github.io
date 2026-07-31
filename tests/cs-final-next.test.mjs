import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pagePath = new URL("../public/cs-final/cs-final.html", import.meta.url);

test("keeps Home and Next past the content edge without shrinking reading progress", async () => {
  const html = await readFile(pagePath, "utf8");
  const progressStart = html.indexOf('<div class="prog" id="prog">');
  const progressEnd = html.indexOf("</div>", progressStart);
  const progressMarkup = html.slice(progressStart, progressEnd);

  assert.ok(progressStart >= 0, "reading progress should be present");
  assert.doesNotMatch(progressMarkup, /NEXT|class="next"/);
  assert.match(progressMarkup, /<span>READ<\/span>[\s\S]*class="track"[\s\S]*id="pct"/);
  assert.match(html, /<a class="case-home" href="\/"[^>]*>\s*HOME[\s\S]*class="next-arrow"/);
  assert.match(html, /<a class="case-next" href="\/"[^>]*>\s*NEXT/);
  assert.match(html, /main\{position:relative;/);
  assert.match(html, /\.case-actions\{position:absolute;right:calc\(-1 \* var\(--gutter\)\);/);
  assert.match(html, /\.case-actions\{[^}]*flex-direction:column;[^}]*gap:calc\(var\(--grid-minor\) - var\(--case-link-h\)\)/);
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

test("frames the behavior section as an AI-agent design-engineering decision", async () => {
  const html = await readFile(pagePath, "utf8");
  const start = html.indexOf('<section id="built">');
  const end = html.indexOf("<!-- 05 -->", start);
  const behavior = html.slice(start, end);

  assert.ok(start >= 0, "behavior section should be present");
  assert.match(behavior, /<h2>Adding AI agents to make it better\.<\/h2>/);
  assert.doesNotMatch(behavior, /Where you are decides what you're told/);
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
