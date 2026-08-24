import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const deckDir = resolve(repoRoot, "public/cursor");

const localReferences = (html) => {
  const references = [];
  const patterns = [
    /(?:src|href)=["']([^"']+)["']/g,
    /url\(["']?([^)'\"]+)["']?\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const reference = match[1];
      if (!/^(?:https?:|mailto:|data:|#)/.test(reference)) {
        references.push(reference.split(/[?#]/, 1)[0]);
      }
    }
  }

  return references;
};

test("publishes the complete nine-slide Cursor deck with every local dependency", async () => {
  const entryPath = resolve(deckDir, "index.html");
  const entryHtml = await readFile(entryPath, "utf8");

  assert.equal(
    [...entryHtml.matchAll(/<section\b[^>]*class=["'][^"']*\bslide\b[^"']*["']/g)].length,
    9,
  );
  assert.match(entryHtml, /src=["']\.\/wordmark\.html["']/);
  assert.match(entryHtml, /src=["']\.\/orbit\.html["']/);

  const htmlQueue = [entryPath];
  const visited = new Set();

  while (htmlQueue.length > 0) {
    const htmlPath = htmlQueue.shift();
    if (visited.has(htmlPath)) continue;
    visited.add(htmlPath);

    const html = await readFile(htmlPath, "utf8");
    for (const reference of localReferences(html)) {
      const dependencyPath = resolve(dirname(htmlPath), reference);
      const dependency = await stat(dependencyPath);
      assert.ok(dependency.isFile(), `${reference} should resolve to a file`);
      if (dependencyPath.endsWith(".html")) htmlQueue.push(dependencyPath);
    }
  }
});

test("keeps the Cursor deck and PDF unlisted from the portfolio shell", async () => {
  const shellPaths = [
    resolve(repoRoot, "index.html"),
    resolve(repoRoot, "src/App.tsx"),
    resolve(repoRoot, "src/components/Header.tsx"),
  ];

  for (const shellPath of shellPaths) {
    const shell = await readFile(shellPath, "utf8");
    assert.doesNotMatch(shell, /\/cursor\/?["'#?]/i);
    assert.doesNotMatch(shell, /cursor-loves-indie\.pdf/i);
  }
});

test("publishes the deck PDF as nine consistent 16:9 landscape pages", async () => {
  const pdf = await readFile(resolve(repoRoot, "public/cursor-loves-indie.pdf"));
  const source = pdf.toString("latin1");

  assert.match(source, /^%PDF-/);
  assert.equal([...source.matchAll(/\/Type\s*\/Page\b/g)].length, 9);

  const mediaBoxes = [
    ...source.matchAll(
      /\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/g,
    ),
  ];
  assert.equal(mediaBoxes.length, 9);

  for (const [, x1, y1, x2, y2] of mediaBoxes) {
    const width = Number(x2) - Number(x1);
    const height = Number(y2) - Number(y1);
    assert.ok(width > height, "each PDF page should be landscape");
    assert.ok(Math.abs(width / height - 16 / 9) < 0.001, "each PDF page should be 16:9");
  }
});
