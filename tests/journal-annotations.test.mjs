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
  assert.match(source, /arrow: "solid"/);
  assert.match(source, /arrow: "dotted"/);
});

test("renders body-font notes with upward icon-library arrows", async () => {
  const [component, css] = await Promise.all([
    readFile(componentPath, "utf8"),
    readFile(cssPath, "utf8"),
  ]);

  assert.match(component, /CornerUpLeft, CornerUpRight[^\n]*from "lucide-react"/);
  assert.match(component, /className="jr-annotation"/);
  assert.match(component, /className="jr-annotation-copy"/);
  assert.match(component, /className="jr-annotation-arrow/);
  assert.match(css, /\.jr-annotation\s*\{[^}]*position:\s*absolute/);
  assert.match(css, /\.jr-annotation\s*\{[^}]*color:\s*var\(--mono-secondary\)/);
  assert.match(
    css,
    /\.jr-annotation-kicker\s*\{[^}]*font-family:\s*var\(--font-mono\)[^}]*font-size:\s*14px[^}]*letter-spacing:\s*0\.1em[^}]*-webkit-text-stroke:\s*0\.4px currentColor/
  );
  assert.match(
    css,
    /\.jr-annotation-copy\s*\{[^}]*font-family:\s*var\(--font-mono\)[^}]*font-size:\s*13px[^}]*letter-spacing:\s*0\.04em[^}]*-webkit-text-stroke:\s*0\.35px currentColor/
  );
  assert.match(css, /\.jr-annotation-arrow--dotted/);
  assert.match(
    css,
    /@media \(max-width: 767px\)[\s\S]*?\.jr-link\s*\{[^}]*padding-top:\s*90px/
  );
});
