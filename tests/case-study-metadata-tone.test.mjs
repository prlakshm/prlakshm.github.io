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
    // The plate carries the same wash main/.jump/.prog use — half-strength
    // ground behind a two-axis linear fade. It used to be an opaque radial,
    // which made the metadata the only non-card element that hid the paper
    // grid outright and set it apart from the section list beneath it.
    assert.match(
      html,
      /\.side \.who::before\{[^}]*background:color-mix\(in srgb,var\(--ground\) 50%,transparent\)/,
    );
    assert.match(
      html,
      /\.side \.who::before\{[^}]*mask-image:linear-gradient\(to right[^}]*mask-composite:intersect/,
    );
    assert.match(html, /\.side \.who>span\{display:block;color:inherit\}/);
    assert.doesNotMatch(html, /\.side \.who>span\+span\{[^}]*font-weight:/);
  });
}
