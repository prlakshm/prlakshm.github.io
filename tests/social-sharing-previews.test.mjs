import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
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
  ["index.html", "https://pranaviram.com/social/portfolio-landing-v1.png", "Pranavi Ram’s portfolio shown in responsive browser windows."],
  ["about/index.html", "https://pranaviram.com/social/about-v1.png", "Pranavi Ram’s About page shown in responsive browser windows."],
  ["public/surprise-rail/index.html", "https://pranaviram.com/social/portfolio-landing-v1.png", "Pranavi Ram’s portfolio shown in responsive browser windows."],
  ["public/mixr/index.html", "https://pranaviram.com/social/portfolio-landing-v1.png", "Pranavi Ram’s portfolio shown in responsive browser windows."],
  ["public/cursor/index.html", "https://pranaviram.com/social/cursor-loves-indie-v1.png", "Thin white looping letterforms spell cursor loves indie across a black background."],
  ["public/figma/index.html", "https://pranaviram.com/social/figma-sound-v1.png", "Figma Sound wordmark surrounded by colorful hand-drawn sound icons on a dark dotted grid."],
  ["public/codex/index.html", "https://pranaviram.com/social/codex-bookmarks-v1.png", "Blue Codex Bookmarks poster with a pink bookmark and a doodled terminal cloud."],
];

test("every shareable endpoint declares its approved large image", async () => {
  for (const [path, image, alt] of metadata) {
    const html = await text(path);
    assert.match(html, new RegExp(`property=["']og:image["'] content=["']${image.replaceAll(".", "\\.")}['"]`), path);
    assert.match(html, new RegExp(`name=["']twitter:image["'] content=["']${image.replaceAll(".", "\\.")}['"]`), path);
    assert.match(html, /property=["']og:image:width["'] content=["']1200["']/, path);
    assert.match(html, /property=["']og:image:height["'] content=["']630["']/, path);
    assert.ok(html.includes(`<meta property="og:image:alt" content="${alt}"`), path);
    assert.ok(html.includes(`<meta name="twitter:image:alt" content="${alt}"`), path);
    assert.doesNotMatch(html, /about\/Profile(?:%20| )picture\.png/i, path);
  }
});

test("tracked HTML has no social image metadata pointing to the profile picture", async () => {
  const paths = execFileSync("git", ["ls-files", "-z", "--", "*.html"], {
    cwd: new URL("../", import.meta.url),
    encoding: "utf8",
  }).split("\0").filter(Boolean);
  const staleReferences = [];

  for (const path of paths) {
    const html = await text(path);
    for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
      const tag = match[0];
      if (/(?:property|name)=["'](?:og:image|twitter:image)["']/i.test(tag)
        && /about\/Profile(?:%20| )picture\.png/i.test(tag)) {
        staleReferences.push(path);
      }
    }
  }

  assert.deepEqual(staleReferences, []);
});

test("About describes its responsive collage rather than the retired portrait preview", async () => {
  const html = await text("about/index.html");
  const alt = "Pranavi Ram’s About page shown in responsive browser windows.";
  assert.match(html, new RegExp(`property=["']og:image:alt["'] content=["']${alt}["']`));
  assert.match(html, new RegExp(`name=["']twitter:image:alt["'] content=["']${alt}["']`));
  assert.doesNotMatch(html, /image:alt["'] content=["']A portrait of Pranavi Ram/i);
});

test("tracked first-party source no longer generates the retired hash About URL", () => {
  const paths = execFileSync("git", ["ls-files", "-z", "--", "*.html", "*.tsx", "*.ts", "*.js"], {
    cwd: new URL("../", import.meta.url),
    encoding: "utf8",
  }).split("\0").filter(Boolean);
  const result = spawnSync("git", ["grep", "-l", "-E", "(/#|#)/about", "--", ...paths], {
    cwd: new URL("../", import.meta.url),
    encoding: "utf8",
  });
  assert.ok(result.status === 0 || result.status === 1, result.stderr);
  const staleLinks = result.stdout.trim().split("\n").filter(Boolean);
  assert.deepEqual(staleLinks, []);
});
