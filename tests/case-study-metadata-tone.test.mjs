import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pages = [
  ["Mixr", new URL("../public/mixr/index.html", import.meta.url)],
  ["Surprise Rail", new URL("../public/surprise-rail/index.html", import.meta.url)],
];

for (const [name, pagePath] of pages) {
  test(`${name} renders both sidebar metadata rows over one uniform ground`, async () => {
    const html = await readFile(pagePath, "utf8");

    assert.match(
      html,
      /\.side \.who\{[^}]*position:relative;[^}]*isolation:isolate;[^}]*width:max-content/,
    );
    assert.match(
      html,
      /\.side \.who::before\{[^}]*background:var\(--ground\)[^}]*mask-image:radial-gradient/,
    );
    assert.match(html, /\.side \.who>span\{display:block;color:inherit\}/);
    assert.doesNotMatch(html, /\.side \.who>span\+span\{[^}]*font-weight:/);
  });
}
