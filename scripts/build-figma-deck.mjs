/* Builds public/figma/index.html — the Figma Sound chapter of the branding
   deck as its own standalone deck — from public/branding/index.html.

   The branding deck stays the single source of truth: rerun this script after
   editing it (`node scripts/build-figma-deck.mjs`). It

     1. drops the Cursor-chapter sections (.cursor-slide),
     2. re-points the deck's own relative references at ../branding/,
     3. shifts the chapter's index thresholds (the Figma hero is slide 0 once
        the nine Cursor slides are gone; the three embedded prototypes move
        from indexes 13/14/15 to 4/5/6),
     4. retitles the page.                                                    */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, "public/branding/index.html");
const out = resolve(root, "public/figma/index.html");

let html = readFileSync(src, "utf8");

// 1. drop the Cursor chapter
const before = html.length;
html = html.replace(/[ \t]*<section class="slide cursor-slide[\s\S]*?<\/section>\n/g, "");
if (html.length === before) throw new Error("no cursor-slide sections found");
if (/<section class="slide cursor-slide/.test(html)) throw new Error("cursor sections survived");

// 2. deck-relative references now live one folder over
html = html
  .replace(/src="\.\//g, 'src="../branding/')
  .replace(/srcset="\.\//g, 'srcset="../branding/')
  .replace(/href="\.\/index\.html"/g, 'href="../branding/index.html"');

// 3. chapter index thresholds
const patches = [
  ['soundToggle.classList.toggle("is-visible", index >= 9);', 'soundToggle.classList.toggle("is-visible", index >= 0);'],
  ["if (opened && currentIndex() === 9) {", "if (opened && currentIndex() === 0) {"],
  ["} else if (opened && currentIndex() !== 9) {", "} else if (opened && currentIndex() !== 0) {"],
  ["if (currentIndex() === 9) playTitleSequence();", "if (currentIndex() === 0) playTitleSequence();"],
  ['{ frame: document.getElementById("interactionProto"), index: 13 }', '{ frame: document.getElementById("interactionProto"), index: 4 }'],
  ['{ frame: document.getElementById("variablesProto"), index: 14 }', '{ frame: document.getElementById("variablesProto"), index: 5 }'],
  ['{ frame: document.getElementById("devmodeProto"), index: 15 }', '{ frame: document.getElementById("devmodeProto"), index: 6 }'],
];
for (const [from, to] of patches) {
  const count = html.split(from).length - 1;
  if (count === 0) throw new Error(`patch not found: ${from}`);
  html = html.split(from).join(to);
}

// 4. its own identity
html = html.replace(/<title>[^<]*<\/title>/, "<title>Pranavi Ram — Figma Sound</title>");

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`wrote ${out} (${html.length} bytes)`);
