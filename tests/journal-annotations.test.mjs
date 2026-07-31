import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dataPath = new URL("../src/pages/home/journals.ts", import.meta.url);
const componentPath = new URL("../src/pages/home/Journal.tsx", import.meta.url);
const cssPath = new URL("../src/pages/home/home.css", import.meta.url);

test("gives every notebook a short project-specific annotation", async () => {
  const source = await readFile(dataPath, "utf8");

  assert.match(source, /annotation: "Turning indecision into curiosity\."/);
  assert.match(source, /annotation: "Making remixing feel as easy as editing\."/);
  assert.match(source, /annotation: "AI agents that explain why a title fits\."/);
  // One of each leader treatment across the shelf.
  assert.match(source, /arrow: "dotted"/);
  assert.match(source, /arrow: "solid"/);
  assert.match(source, /arrow: "dotted-arrow"/);
});

test("draws its own leader lines rather than borrowing icon-set arrows", async () => {
  const component = await readFile(componentPath, "utf8");

  // Icon-set corner arrows read as UI chrome next to the photographs.
  assert.doesNotMatch(component, /lucide-react/);
  assert.match(component, /className="jr-annotation"/);
  assert.match(component, /className="jr-annotation-copy"/);
  assert.match(component, /className: `jr-leader jr-leader--\$\{variant\}`/);

  // Dashes on both dotted variants.
  const dashed = component.match(/strokeDasharray/g) ?? [];
  assert.equal(dashed.length, 2);

  // Both arrows turn the reference's rounded right angle (a quadratic corner)
  // and land their head at the TOP of the box, pointing up into the note.
  const solid = component.match(/viewBox="0 0 44 58"[\s\S]*?<\/svg>/)?.[0];
  const dottedArrow = component.match(/viewBox="0 0 52 98"[\s\S]*?<\/svg>/)?.[0];
  for (const arrow of [solid, dottedArrow]) {
    assert.ok(arrow, "both arrow variants are authored at a fixed viewBox");
    assert.match(arrow, /H\d|H \d/); // horizontal run
    assert.match(arrow, /Q/); // rounded right angle
    // Arrowhead: a chevron whose tip sits in the top ~15% of the viewBox.
    const head = arrow.match(/d="M[\d.]+ [\d.]+ ([\d.]+) ([\d.]+) /);
    assert.ok(head && Number(head[2]) < 10, "the head points up into the note");
  }
});

test("hangs the notes above the covers on a measured leader", async () => {
  const css = await readFile(cssPath, "utf8");

  assert.match(css, /\.jr-annotation\s*\{[^}]*position:\s*absolute/);
  assert.match(css, /\.jr-annotation\s*\{[^}]*color:\s*var\(--mono-secondary\)/);

  // Bottom-anchored in cqw off the cover, not a px offset from the stage top:
  // between 1024 and 1440 the journals are fluid, so a px offset only lines up
  // at one viewport. Needs the query container to resolve.
  assert.match(
    css,
    /\.jr-annotation\s*\{[^}]*bottom:\s*calc\(100cqw \* var\(--cover-lift\) \+ var\(--lead-h\) \+ 31px\)/
  );
  assert.match(css, /\.jr-link\s*\{[^}]*container-type:\s*inline-size/);

  // Every journal supplies both halves of that sum.
  for (const id of ["surprise-rail", "mixr", "reasons-to-watch"]) {
    assert.match(
      css,
      new RegExp(
        `\\.jr\\[data-journal="${id}"\\] \\.jr-annotation\\s*\\{[^}]*--cover-lift:[^}]*--lead-h:`
      )
    );
  }

  // The note's own type is the page's established mono treatment — the
  // placement changed, the typography did not.
  assert.match(
    css,
    /\.jr-annotation-kicker\s*\{[^}]*font-family:\s*var\(--font-mono\)[^}]*font-size:\s*14px[^}]*letter-spacing:\s*0\.1em[^}]*-webkit-text-stroke:\s*0\.4px currentColor/
  );
  assert.match(
    css,
    /\.jr-annotation-copy\s*\{[^}]*font-family:\s*var\(--font-mono\)[^}]*font-size:\s*13px[^}]*letter-spacing:\s*0\.04em[^}]*-webkit-text-stroke:\s*0\.35px currentColor/
  );

  // The leaders are sized in CSS on purpose: home1.css carries a global
  // `svg { width: 0; height: 0 }` that collapses them otherwise.
  assert.match(css, /\.jr-leader--dotted\s*\{[^}]*height:\s*var\(--lead-h\)/);
  assert.match(css, /\.jr-leader--solid\s*\{[^}]*height:\s*var\(--lead-h\)/);
  assert.match(
    css,
    /\.jr-leader--dotted-arrow\s*\{[^}]*height:\s*var\(--lead-h\)/
  );

  // Stacked tiers have no row slack to hang the notes in.
  assert.match(
    css,
    /@media \(max-width: 1023px\)[\s\S]*?\.jr-link\s*\{[^}]*padding-top:\s*80px/
  );
  assert.match(
    css,
    /@media \(max-width: 767px\)[\s\S]*?\.jr-link\s*\{[^}]*padding-top:\s*104px/
  );
});
