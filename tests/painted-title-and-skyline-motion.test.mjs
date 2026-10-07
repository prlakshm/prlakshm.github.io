import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

test("painted titles and footer reuse one gold-light model with surface-specific timing", () => {
  const home = read("src/pages/home/Home.tsx");
  const about = read("src/pages/about/About.tsx");
  const light = read("src/pages/home/titleGoldLight.ts");
  const footer = read("src/pages/home/pond/PaintingFooter.tsx");
  const sharedPath = new URL("src/pages/home/goldLight.ts", root);

  assert.equal(existsSync(sharedPath), true, "the footer and titles need one shared gold-light model");
  const shared = read("src/pages/home/goldLight.ts");

  assert.match(home, /mountTitleGoldLight/);
  assert.match(home, /firstDelay:\s*1\.6/);
  assert.match(home, /interval:\s*\[6,\s*9\]/);
  assert.match(home, /hero-title-gold hero-title-gold--auto/);
  assert.match(home, /hero-title-gold hero-title-gold--pointer/);

  assert.match(about, /mountTitleGoldLight/);
  assert.match(about, /firstDelay:\s*1\.9/);
  assert.match(about, /interval:\s*\[7,\s*10\]/);
  assert.match(about, /ab-heading-gold ab-heading-gold--auto/);
  assert.match(about, /ab-heading-gold ab-heading-gold--pointer/);
  assert.equal((home.match(/aria-hidden="true"/g) ?? []).length >= 3, true);
  assert.equal((about.match(/aria-hidden="true"/g) ?? []).length >= 2, true);

  assert.match(light, /prefersReducedMotion\(\)/);
  assert.match(light, /IntersectionObserver/);
  assert.match(light, /createGoldShine/);
  assert.match(light, /stepGoldLamp/);
  assert.match(light, /pointerenter/);
  assert.match(light, /pointermove/);
  assert.match(light, /pointerleave/);
  assert.match(footer, /createGoldShine/);
  assert.match(footer, /stepGoldLamp/);
  assert.match(shared, /q \* q \* \(3 - 2 \* q\)/);
  assert.match(shared, /Math\.exp\(-dt \* target\.k\)/);
  assert.match(shared, /firstDelay/);
  assert.match(shared, /interval/);
});

test("the About experience table measures only the visible title text", () => {
  const about = read("src/pages/about/About.tsx");

  assert.match(about, /const titleText = h\.firstChild/);
  assert.match(about, /range\.selectNodeContents\(titleText\)/);
  assert.doesNotMatch(about, /range\.selectNodeContents\(h\)/);
});

test("masked titles keep a faint idle gold drift and use a readable shine duration", () => {
  const light = read("src/pages/home/titleGoldLight.ts");
  const shared = read("src/pages/home/goldLight.ts");

  assert.match(light, /duration:\s*\[1\.05,\s*1\.45\]/);
  assert.match(light, /idle\.x\s*=/);
  assert.match(light, /idle\.y\s*=/);
  assert.match(light, /on:\s*0\.26/);
  assert.match(shared, /duration\?:\s*\[number,\s*number\]/);
  assert.match(shared, /duration\s*\?/);
});

test("homepage overlaps the above-fold poster wall with the second subheading line", () => {
  const home = read("src/pages/home/Home.tsx");
  const entrance = read("src/motion/entrance.ts");
  const gallery = read("src/pages/home/PosterGallery.tsx");

  assert.match(home, /at:\s*0\.14/);
  assert.match(home, /at:\s*0\.26/);
  assert.match(home, /rows:\s*0\.04/);
  assert.match(home, /at:\s*0\.4/);
  assert.match(home, /getBoundingClientRect\(\)\.top\s*<\s*window\.innerHeight \* 0\.9/);
  assert.match(entrance, /at\?:\s*number/);
  assert.match(entrance, /duration:\s*0\.5/);
  assert.match(entrance, /duration:\s*0\.7/);
  assert.match(gallery, /loading="eager"/);
  assert.match(gallery, /fetchpriority:\s*"high"/);
});

test("the larger About portrait settles more slowly than poster cards", () => {
  const about = read("src/pages/about/About.tsx");
  const entrance = read("src/motion/entrance.ts");

  assert.match(about, /import \{[^}]*BEAT[^}]*\} from "\.\.\/\.\.\/motion\/entrance\.js"/);
  assert.match(about, /const portraitAt = heading \? BEAT \* Math\.max\(0, lineCount\(heading\) - 1\) \+ 0\.05 : 0/);
  assert.match(about, /el:\s*portrait,\s*large:\s*true,\s*weight:\s*"heavy",\s*at:\s*portraitAt/);
  assert.match(entrance, /weight\?:\s*"heavy"/);
  assert.match(entrance, /FADE_HEAVY\s*=\s*\{\s*duration:\s*0\.65/);
  assert.match(entrance, /SETTLE_HEAVY\s*=\s*\{\s*duration:\s*0\.9/);
});

test("title light is clipped to the paintings' gold masks", () => {
  const homeCss = read("src/pages/home/home.css");
  const aboutCss = read("src/pages/about/about.css");
  const masks = [
    "public/home/footer/skyline-d-gold.webp",
    "public/home/footer/water-lilies-5b-gold.webp",
  ];

  for (const path of masks) assert.equal(existsSync(new URL(path, root)), true, `${path} must exist`);

  assert.match(homeCss, /\.hero-title-gold--auto/);
  assert.match(homeCss, /\.hero-title-gold--pointer/);
  assert.match(homeCss, /mask-image:\s*url\("\/home\/footer\/skyline-d-gold\.webp"\)/);
  assert.match(homeCss, /background-clip:\s*text/);
  assert.match(homeCss, /radial-gradient\(/);

  assert.match(aboutCss, /\.ab-heading-gold--auto/);
  assert.match(aboutCss, /\.ab-heading-gold--pointer/);
  assert.match(aboutCss, /mask-image:\s*url\("\/home\/footer\/water-lilies-5b-gold\.webp"\)/);
  assert.match(aboutCss, /background-clip:\s*text/);
  assert.match(aboutCss, /radial-gradient\(/);
});

test("skyline clouds use legible two-speed drift feathered into the painted sky", () => {
  const footer = read("src/pages/home/pond/PaintingFooter.tsx");
  const shader = read("src/pages/home/pond/paintGL.ts");

  assert.match(footer, /speed:\s*52/);
  assert.match(footer, /secondarySpeed:\s*22/);
  assert.match(footer, /vertical:\s*5/);
  assert.match(footer, /verticalPeriod:\s*15/);
  assert.match(footer, /gain:\s*2\.1/);
  assert.match(shader, /uniform vec4 uCloudMotion/);
  assert.match(shader, /uCloudMotion\.y/);
  assert.match(shader, /uCloudMotion\.z/);
  assert.match(shader, /uCloudMotion\.w/);
  assert.match(shader, /float sky = smoothstep\(0\.04, 0\.96, c0\.g\)/);
  assert.match(shader, /\(there - here\)/);
  assert.match(shader, /float cloudDelta =/);
  assert.match(shader, /col \+= \(vec3\(1\.0\) - col\) \* light/);
  assert.match(shader, /col \*= 1\.0 - shade/);
});
