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
  assert.match(html, /\.case-actions\{[^}]*flex-direction:column;[^}]*gap:2px/);
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

test("fades the case-study grid beneath the main column and sidebar", async () => {
  const html = await readFile(pagePath, "utf8");

  for (const selector of ["main", ".side"]) {
    const rule = html.match(new RegExp(`${selector.replace(".", "\\.")}\\{([^}]*)\\}`))?.[1];
    const wash = html.match(
      new RegExp(`${selector.replace(".", "\\.")}::before\\{([^}]*)\\}`),
    )?.[1];

    assert.match(rule ?? "", /isolation:isolate/);
    assert.match(wash ?? "", /content:""/);
    assert.match(wash ?? "", /background:color-mix\(in srgb,var\(--ground\) 50%,transparent\)/);
    assert.match(wash ?? "", /mask-image:.*10%/);
    assert.match(wash ?? "", /-webkit-mask-image:.*10%/);
    assert.doesNotMatch(wash ?? "", /border|box-shadow|border-radius/);
  }
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
  assert.match(html, /\.tile-breakdown-title\{[^}]*color:#fff/);
  assert.match(html, /\.tile-breakdown \.lyr b,\.tile-breakdown \.lyr i\{color:#a6a6b0/);
  assert.match(html, /\.gradient-bar\{[^}]*background-image:var\(--irid-banner\)/);
  const paletteRule = html.match(/\.irid-palette\{([^}]*)\}/)?.[1] ?? "";
  assert.doesNotMatch(paletteRule, /border-top/);
  assert.match(html, /\.title-font-spec\{[^}]*background-image:var\(--irid-banner\)/);
});
