import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const entryPoints = [
  "index.html",
  "public/mixr/index.html",
  "public/reasons-to-watch/index.html",
  "public/surprise-rail/index.html",
  "public/figma/index.html",
  "public/codex/index.html",
  "public/cursor/index.html",
  "public/branding/index.html",
  "public/branding/v2/index.html",
];
const version = "gold-frame-2";

const text = (path) => readFile(new URL(path, root), "utf8");

test("the primary shell exposes one concise Safari title", async () => {
  const html = await text("index.html");
  assert.match(html, /<title>Pranavi Ram \| Product Designer<\/title>/);
  assert.match(html, /property=["']og:title["'] content=["']Pranavi Ram \| Product Designer["']/);
  assert.match(html, /name=["']twitter:title["'] content=["']Pranavi Ram \| Product Designer["']/);
  assert.doesNotMatch(html, /property=["']og:site_name["']/);
});

test("every primary entry point declares the cache-versioned gold frame", async () => {
  for (const path of entryPoints) {
    const html = await text(path);
    assert.match(html, new RegExp(`/icons/frame-favicon\\.svg\\?v=${version}`), path);
    assert.match(html, new RegExp(`/icons/frame-favicon-32\\.png\\?v=${version}`), path);
    assert.match(html, new RegExp(`/icons/frame-favicon-16\\.png\\?v=${version}`), path);
    assert.match(html, new RegExp(`/favicon\\.ico\\?v=${version}`), path);
    assert.match(html, new RegExp(`/icons/frame-apple-touch-icon\\.png\\?v=${version}`), path);
    assert.doesNotMatch(html, /notebook-(?:favicon|apple-touch-icon)/, path);
  }
});

test("the root fallback is the generated gold-frame ICO", async () => {
  const [rootIcon, frameIcon] = await Promise.all([
    readFile(new URL("public/favicon.ico", root)),
    readFile(new URL("public/icons/frame-favicon.ico", root)),
  ]);
  assert.deepEqual(rootIcon, frameIcon);
  assert.equal(rootIcon.readUInt16LE(0), 0);
  assert.equal(rootIcon.readUInt16LE(2), 1);
  assert.ok(rootIcon.readUInt16LE(4) >= 3);
});
