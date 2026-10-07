import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

const socialImages = [
  "public/social/portfolio-landing-v1.png",
  "public/social/about-v1.png",
  "public/social/cursor-loves-indie-v1.png",
  "public/social/figma-sound-v1.png",
  "public/social/codex-bookmarks-v1.png",
];

const pngSize = (buffer) => {
  assert.deepEqual([...buffer.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
};

test("all social preview assets are 1200 by 630 PNGs", async () => {
  for (const path of socialImages) {
    const image = await readFile(new URL(path, root));
    assert.deepEqual(pngSize(image), { width: 1200, height: 630 }, path);
  }
});

test("About has a clean Vite page entry", async () => {
  const [html, entry, vite] = await Promise.all([
    text("about/index.html"),
    text("src/about-main.tsx"),
    text("vite.config.ts"),
  ]);
  assert.match(html, /<link rel="canonical" href="https:\/\/pranaviram\.com\/about\/"/);
  assert.match(html, /<div id="root"><\/div>/);
  assert.match(html, /src="\/src\/about-main\.tsx"/);
  assert.match(entry, /BrowserRouter/);
  assert.match(entry, /<About\s*\/>/);
  assert.match(vite, /about:\s*resolve\(__dirname,\s*"about\/index\.html"\)/);
});

test("first-party navigation uses the clean About URL", async () => {
  const paths = [
    "src/pages/home/WtNav.tsx",
    "src/components/Header.tsx",
    "src/static-chrome.tsx",
    "public/mixr/index.html",
    "public/surprise-rail/index.html",
    "public/reasons-to-watch/index.html",
  ];
  for (const path of paths) {
    const source = await text(path);
    assert.doesNotMatch(source, /#\/about/, path);
  }
  assert.match(await text("src/pages/home/WtNav.tsx"), /href="\/about\/"/);
  assert.match(await text("src/static-chrome.tsx"), /href="\/about\/"/);
});

const metadata = [
  ["index.html", "https://pranaviram.com/social/portfolio-landing-v1.png"],
  ["about/index.html", "https://pranaviram.com/social/about-v1.png"],
  ["public/surprise-rail/index.html", "https://pranaviram.com/social/portfolio-landing-v1.png"],
  ["public/mixr/index.html", "https://pranaviram.com/social/portfolio-landing-v1.png"],
  ["public/cursor/index.html", "https://pranaviram.com/social/cursor-loves-indie-v1.png"],
  ["public/figma/index.html", "https://pranaviram.com/social/figma-sound-v1.png"],
  ["public/codex/index.html", "https://pranaviram.com/social/codex-bookmarks-v1.png"],
];

test("every shareable endpoint declares its approved large image", async () => {
  for (const [path, image] of metadata) {
    const html = await text(path);
    assert.match(html, new RegExp(`property=["']og:image["'] content=["']${image.replaceAll(".", "\\.")}['"]`), path);
    assert.match(html, new RegExp(`name=["']twitter:image["'] content=["']${image.replaceAll(".", "\\.")}['"]`), path);
    assert.match(html, /property=["']og:image:width["'] content=["']1200["']/, path);
    assert.match(html, /property=["']og:image:height["'] content=["']630["']/, path);
    assert.match(html, /property=["']og:image:alt["'] content=["'][^"']+["']/, path);
    assert.match(html, /name=["']twitter:image:alt["'] content=["'][^"']+["']/, path);
    assert.doesNotMatch(html, /about\/Profile(?:%20| )picture\.png/i, path);
  }
});
