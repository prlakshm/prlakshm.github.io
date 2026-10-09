import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import {
  CODEX_FULL_BLEED_CSS,
  PAGE_PREVIEWS,
  SOCIAL_PREVIEW_BADGES,
  SOCIAL_CANVAS,
} from "../scripts/social-preview-layout.mjs";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

const socialImages = [
  "public/social/portfolio-landing-v4.png",
  "public/social/about-v4.png",
  "public/social/cursor-loves-indie-v1.png",
  "public/social/figma-sound-v1.png",
  "public/social/codex-bookmarks-v2.png",
];

const pngSize = (buffer) => {
  assert.deepEqual([...buffer.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
};

test("Home and About social artwork are direct page captures without browser chrome", async () => {
  assert.deepEqual(PAGE_PREVIEWS, [
    { name: "portfolio-landing-v4.png", url: "/" },
    { name: "about-v4.png", url: "/about/" },
  ]);
  assert.deepEqual(SOCIAL_CANVAS, { width: 1200, height: 630 });

  const generator = await text("scripts/generate-social-previews.mjs");
  assert.doesNotMatch(generator, /browser__chrome|safari-toolbar|chrome-toolbar|const collage/);
});

test("direct page captures start with three earned stars without changing visitor defaults", async () => {
  assert.deepEqual(SOCIAL_PREVIEW_BADGES, ["name", "read", "reimagine"]);
  const generator = await text("scripts/generate-social-previews.mjs");
  assert.match(generator, /context\.addInitScript/);
  assert.match(generator, /pr-badges-session-v2/);
  assert.match(generator, /pr-badge-intro/);
});

test("Codex social capture removes only the page framing around the poster", () => {
  assert.match(CODEX_FULL_BLEED_CSS, /slide\[data-slide=["']01["']\]\s*\{[^}]*padding:\s*0/s);
  assert.match(CODEX_FULL_BLEED_CSS, /hx-frame\s*\{[^}]*inset:\s*0/s);
  assert.match(CODEX_FULL_BLEED_CSS, /concept-credit\s*\{[^}]*display:\s*none/s);
});

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
  ];
  for (const path of paths) {
    const source = await text(path);
    assert.doesNotMatch(source, /#\/about/, path);
  }
  assert.match(await text("src/pages/home/WtNav.tsx"), /href="\/about\/"/);
  assert.match(await text("src/static-chrome.tsx"), /href="\/about\/"/);
});

const metadata = [
  ["index.html", "https://pranaviram.com/social/portfolio-landing-v4.png", "Pranavi Ram’s portfolio landing page with three collected stars."],
  ["about/index.html", "https://pranaviram.com/social/about-v4.png", "Pranavi Ram’s About page with three collected stars."],
  ["public/surprise-rail/index.html", "https://pranaviram.com/social/portfolio-landing-v4.png", "Pranavi Ram’s portfolio landing page with three collected stars."],
  ["public/mixr/index.html", "https://pranaviram.com/social/portfolio-landing-v4.png", "Pranavi Ram’s portfolio landing page with three collected stars."],
  ["public/cursor/index.html", "https://pranaviram.com/social/cursor-loves-indie-v1.png", "Thin white looping letterforms spell cursor loves indie across a black background."],
  ["public/figma/index.html", "https://pranaviram.com/social/figma-sound-v1.png", "Figma Sound wordmark surrounded by colorful hand-drawn sound icons on a dark dotted grid."],
  ["public/codex/index.html", "https://pranaviram.com/social/codex-bookmarks-v2.png", "Blue Codex Bookmarks poster with a pink bookmark and a doodled terminal cloud."],
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

test("tracked HTML no longer points to replaced framed page previews", async () => {
  const paths = execFileSync("git", ["ls-files", "-z", "--", "*.html"], {
    cwd: new URL("../", import.meta.url),
    encoding: "utf8",
  }).split("\0").filter(Boolean);
  const staleReferences = [];

  for (const path of paths) {
    const html = await text(path);
    if (/social\/(?:portfolio-landing|about)-v[123]\.png/.test(html)) {
      staleReferences.push(path);
    }
  }

  assert.deepEqual(staleReferences, []);
});

test("About describes the page rather than the retired portrait or browser collage", async () => {
  const html = await text("about/index.html");
  const alt = "Pranavi Ram’s About page with three collected stars.";
  assert.match(html, new RegExp(`property=["']og:image:alt["'] content=["']${alt}["']`));
  assert.match(html, new RegExp(`name=["']twitter:image:alt["'] content=["']${alt}["']`));
  assert.doesNotMatch(html, /image:alt["'] content=["']A portrait of Pranavi Ram/i);
  assert.doesNotMatch(html, /responsive browser windows/i);
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
