import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

test("the manifesto is generated from three clearly named handwriting exports", () => {
  const sourcePaths = [
    "src/pages/about/masks/manifesto-title-source.png",
    "src/pages/about/masks/manifesto-body-part-1-source.png",
    "src/pages/about/masks/manifesto-body-part-2-source.png",
  ];
  for (const path of sourcePaths) {
    const url = new URL(path, root);
    assert.equal(existsSync(url), true);
    const png = readFileSync(url);
    assert.equal(png[25], 6, `${path} must be an RGBA PNG`);
  }

  const build = read("scripts/manifesto/build.py");
  assert.match(build, /MASKS\s*=.*"masks"/);
  assert.match(build, /MASKS\s*\/\s*"manifesto-title-source\.png"/);
  assert.match(build, /MASKS\s*\/\s*"manifesto-body-part-1-source\.png"/);
  assert.match(build, /MASKS\s*\/\s*"manifesto-body-part-2-source\.png"/);
  assert.match(build, /getchannel\("A"\)/);
  assert.doesNotMatch(build, /trace_word/);
  assert.doesNotMatch(
    build,
    /y: number;\s*y: number;/,
    "the generated coordinate type must declare y only once",
  );
});

test("body part two is normalized to body part one's scale and line rhythm", () => {
  const build = read("scripts/manifesto/build.py");
  const generated = read("src/pages/about/manifesto-words.ts");
  const normalizedBody = new URL(
    "src/pages/about/masks/manifesto-body-normalized.png",
    root,
  );

  assert.match(build, /def write_normalized_body_mask/);
  assert.match(build, /part_1_x_height/);
  assert.match(build, /part_2_x_height/);
  assert.match(build, /part_2_scale/);
  assert.match(build, /target_line_step/);
  assert.match(generated, /MANIFESTO_BODY_NORMALIZATION/);
  const metrics = generated.match(
    /part1XHeight: ([0-9.]+),[\s\S]*?part2XHeightAfter: ([0-9.]+),[\s\S]*?lineStep: ([0-9.]+)/,
  );
  assert.ok(metrics, "generated normalization metrics must be present");
  assert.ok(
    Math.abs(Number(metrics[1]) - Number(metrics[2])) <= 0.5,
    "body part two must match body part one's measured x-height",
  );
  assert.ok(Number(metrics[3]) > Number(metrics[1]) * 2);
  assert.equal(existsSync(normalizedBody), true);
});

test("the visible masks and accessible copy use the rewritten manifesto", () => {
  const generated = read("src/pages/about/manifesto-words.ts");
  const words = [...generated.matchAll(/\{ t: "((?:[^"\\]|\\.)*)", l:/g)].map(
    ([, word]) => JSON.parse(`"${word}"`),
  );

  assert.equal(
    words.join(" "),
    [
      "Design Manifesto",
      "I decided to use this space to",
      "share my thoughts on AI. AI can",
      "write like us, talk like us, and imitate",
      "everything we do. At this point,",
      "I don't know where a person ends",
      "and where AI begins. But we are humans.",
      "We are made of flesh and blood. we",
      "create, we dance, and make art. So",
      "let's not see this as AI is taking over",
      "our lives, but that AI is letting us",
      "have more life to live. We can take",
      "back control in the creative process.",
      "Automate what we need and",
      "make more time for the things",
      "that spark us joy. If we can",
      "learn where and when to use AI,",
      "we can bring our lives back to",
      "the art. We are a house for",
      "creative spirit. So let's be",
      "intentional about how we create.",
    ].join(" "),
  );

  assert.match(generated, /\bs:\s*"title"/);
  assert.match(generated, /\bx:\s*[0-9]/);
  assert.match(generated, /\by:\s*[0-9]/);
  assert.doesNotMatch(generated, /\bd:\s*"/);
});

test("body and title preserve their authored stroke treatment at the compact scale", () => {
  const css = read("src/pages/about/about.css");
  const build = read("scripts/manifesto/build.py");
  const component = read("src/pages/about/Manifesto.tsx");

  const manifestoRule = css.match(/\.mf\s*\{([\s\S]*?)\n\}/)?.[1];
  const titleLineRule = css.match(
    /\.mf-line--title\s*\{([\s\S]*?)\n\}/,
  )?.[1];
  const bodyLineRule = css.match(
    /\.mf-line--body\s*\{([\s\S]*?)\n\}/,
  )?.[1];
  const bodyWeightRule = css.match(
    /\.mf-line--body \.mf-word\s*\{([\s\S]*?)\n\}/,
  )?.[1];
  const glowRule = css.match(
    /\.mf-line--title \.mf-word\s*\{([\s\S]*?)\n\}/,
  )?.[1];
  const titleMaxUnit = Number(
    titleLineRule?.match(/--mf-u:\s*clamp\([^;]*,\s*([0-9.]+)px\);/)?.[1],
  );
  const bodyMaxUnit = Number(
    bodyLineRule?.match(/--mf-u:\s*clamp\([^;]*,\s*([0-9.]+)px\);/)?.[1],
  );
  const titleGap = Number(
    titleLineRule?.match(
      /margin-bottom:\s*calc\(var\(--mf-u\) \* ([0-9.]+)\)/,
    )?.[1],
  );

  assert.match(titleLineRule ?? "", /color:\s*var\(--mono-secondary\);/);
  assert.match(
    build,
    /RENDER_DILATION_RADII\s*=\s*\{\s*"body":\s*0\.375,\s*"title":\s*0\.625\s*\}/,
  );
  assert.match(
    build,
    /MARK_DILATION_RADII\s*=\s*\{\s*"body":\s*0\.625,\s*"title":\s*0\.75\s*\}/,
  );
  assert.match(build, /if radius < 1:/);
  assert.match(build, /alpha \* \(1 - radius\) \+ expanded \* radius/);
  assert.match(build, /maximum_filter/);
  assert.match(component, /manifesto-body-ink\.png/);
  assert.match(component, /manifesto-title-ink\.png/);
  assert.ok(
    bodyMaxUnit >= 1.48 && bodyMaxUnit <= 1.49,
    "body text must grow five percent from its compact 90 percent scale",
  );
  assert.ok(titleMaxUnit > bodyMaxUnit, "title must render visibly larger than the body");
  assert.ok(titleGap <= 10, "title-to-body gap should be visibly tighter");
  assert.doesNotMatch(
    bodyWeightRule ?? "",
    /drop-shadow/,
    "body thickness must come from its alpha mask, not a costly filter chain",
  );
  assert.doesNotMatch(glowRule ?? "", /currentColor/);
  assert.match(glowRule ?? "", /drop-shadow/);
  assert.match(glowRule ?? "", /rgba\(255,\s*255,\s*255/);
});

test("body row spacing scales with the compact manifesto", () => {
  const css = read("src/pages/about/about.css");
  const bodyLineRule = css.match(
    /\.mf-line--body\s*\{([\s\S]*?)\n\}/,
  )?.[1];
  const bodyWordRule = css.match(
    /\.mf-line--body \.mf-word-wrap\s*\{([\s\S]*?)\n\}/,
  )?.[1];
  const bodyInkRule = css.match(
    /\.mf-line--body \.mf-word\s*\{([\s\S]*?)\n\}/,
  )?.[1];
  const rowStep = bodyLineRule?.match(
    /--mf-body-row-step:\s*clamp\(\s*([0-9.]+)px,\s*calc\(\s*([0-9.]+)vw\s*\+\s*([0-9.]+)px\s*\),\s*([0-9.]+)px\s*\)/,
  );

  assert.equal(Number(rowStep?.[1]), 26.4995);
  assert.equal(Number(rowStep?.[2]), 1.637685);
  assert.equal(Number(rowStep?.[3]), 20.13965);
  assert.equal(Number(rowStep?.[4]), 41.09975);
  assert.match(bodyLineRule ?? "", /row-gap:\s*0;/);
  assert.match(
    bodyWordRule ?? "",
    /height:\s*var\(--mf-body-row-step\)/,
  );
  assert.match(bodyWordRule ?? "", /margin-top:\s*0;/);
  assert.match(bodyWordRule ?? "", /margin-bottom:\s*0;/);
  assert.match(
    bodyWordRule ?? "",
    /translateY\(calc\(var\(--mf-u\) \* var\(--dy\)\)\)/,
  );
  assert.match(bodyInkRule ?? "", /width:\s*calc\(var\(--mf-u\) \* var\(--w\)\)/);
  assert.match(bodyInkRule ?? "", /height:\s*calc\(var\(--mf-u\) \* var\(--h\)\)/);
});

test("the cleaner title source is used without per-letter warping", () => {
  const build = read("scripts/manifesto/build.py");
  const css = read("src/pages/about/about.css");
  const titleSource = new URL(
    "src/pages/about/masks/manifesto-title-source.png",
    root,
  );

  assert.equal(existsSync(titleSource), true);
  assert.doesNotMatch(build, /TITLE_LETTER_ADJUSTMENTS/);
  assert.doesNotMatch(build, /write_balanced_title_mask/);
  assert.doesNotMatch(build, /map_coordinates/);
  assert.doesNotMatch(build, /TITLE_CURVE_SMOOTH_REGIONS/);
  assert.match(css, /\.mf-word-wrap\s*\{[^}]*skewX\(var\(--mf-deskew\)\)/s);
  assert.match(css, /\.mf-line--title\s*\{[^}]*--mf-deskew:\s*-[0-9.]+deg/s);
  assert.match(css, /\.mf-line--body\s*\{[^}]*--mf-deskew:\s*-[0-9.]+deg/s);
});

test("title aligns to the pocket while body begins under the D foot", () => {
  const css = read("src/pages/about/about.css");
  const titleRule = css.match(
    /\.mf-line--title\s*\{([\s\S]*?)\n\}/,
  )?.[1];
  const bodyRule = css.match(
    /\.mf-line--body\s*\{([\s\S]*?)\n\}/,
  )?.[1];

  assert.match(
    titleRule ?? "",
    /margin-left:\s*calc\(-1 \* var\(--mf-u\)\)/,
  );
  assert.match(
    bodyRule ?? "",
    /margin-left:\s*calc\(var\(--grid-minor-step\)\s*-\s*4px\);/,
  );
  assert.match(
    bodyRule ?? "",
    /width:\s*calc\(100% - \(var\(--grid-minor-step\) \* 2\)\)/,
  );
});

test("the portrait aligns with the top of the manifesto body", () => {
  const css = read("src/pages/about/about.css");
  const aboutRule = css.match(/\.ab\s*\{([\s\S]*?)\n\}/)?.[1];
  const textRule = css.match(/\.ab-text\s*\{([\s\S]*?)\n\}/)?.[1];
  const manifestoRule = css.match(/\.mf\s*\{([\s\S]*?)\n\}/)?.[1];
  const portraitRule = css.match(/\.ab-portrait\s*\{([\s\S]*?)\n\}/)?.[1];

  assert.match(textRule ?? "", /position:\s*relative;/);
  assert.doesNotMatch(textRule ?? "", /display:\s*contents;/);
  assert.doesNotMatch(manifestoRule ?? "", /display:\s*contents;/);
  assert.match(aboutRule ?? "", /--mf-title-u:\s*clamp\(1\.206px,\s*0\.1305vw \+ 0\.72px,\s*1\.8px\);/);
  assert.match(portraitRule ?? "", /align-self:\s*start;/);
  assert.match(portraitRule ?? "", /margin-top:\s*calc\(var\(--mf-title-u\) \* 58\.8\);/);
  assert.doesNotMatch(portraitRule ?? "", /transform:/);
  assert.doesNotMatch(portraitRule ?? "", /grid-row:/);
  assert.doesNotMatch(portraitRule ?? "", /margin-left:/);
});

test("the manifesto has a grid-toned wash that fades at every edge", () => {
  const css = read("src/pages/about/about.css");
  const manifestoRule = css.match(/\.mf\s*\{([\s\S]*?)\n\}/)?.[1];
  const washRule = css.match(/\.mf::before\s*\{([\s\S]*?)\n\}/)?.[1];

  assert.match(manifestoRule ?? "", /position:\s*relative;/);
  assert.match(washRule ?? "", /content:\s*["']{2};/);
  assert.match(washRule ?? "", /position:\s*absolute;/);
  assert.match(
    washRule ?? "",
    /inset:\s*clamp\(-80\.64px,\s*-8\.82%,\s*-40\.32px\)\s*clamp\(-60\.48px,\s*-7\.56%,\s*-30\.24px\);/,
  );
  assert.match(
    washRule ?? "",
    /background:\s*color-mix\(in srgb, var\(--parchment\) 50%, transparent\);/,
  );
  assert.match(washRule ?? "", /mask-image:[\s\S]*?10%/);
  assert.match(washRule ?? "", /-webkit-mask-image:[\s\S]*?10%/);
  assert.doesNotMatch(washRule ?? "", /border(?:-radius)?:|box-shadow:/);
});

test("the manifesto handwriting and its wash scale down to 90 percent without resizing the portrait", () => {
  const css = read("src/pages/about/about.css");
  const manifestoRule = css.match(/\.mf\s*\{([\s\S]*?)\n\}/)?.[1];
  const bodyRule = css.match(/\.mf-line--body\s*\{([\s\S]*?)\n\}/)?.[1];
  const titleRule = css.match(/\.mf-line--title\s*\{([\s\S]*?)\n\}/)?.[1];
  const portraitRule = css.match(/\.ab-portrait\s*\{([\s\S]*?)\n\}/)?.[1];

  assert.match(manifestoRule ?? "", /--mf-u:\s*clamp\(0\.954px,\s*0\.1008vw \+ 0\.585px,\s*1\.413px\);/);
  assert.match(bodyRule ?? "", /--mf-u:\s*clamp\(1\.0017px,\s*0\.10584vw \+ 0\.61425px,\s*1\.48365px\);/);
  assert.match(bodyRule ?? "", /--mf-body-row-step:\s*clamp\(26\.4995px,\s*calc\(1\.637685vw \+ 20\.13965px\),\s*41\.09975px\);/);
  assert.match(titleRule ?? "", /--mf-u:\s*clamp\(1\.206px,\s*0\.1305vw \+ 0\.72px,\s*1\.8px\);/);
  assert.match(portraitRule ?? "", /width:\s*clamp\(250px,\s*26\.25vw,\s*375px\);/);
});

test("the hero text receives the same feathered paper wash", () => {
  const css = read("src/pages/home/home.css");
  const blockRule = css.match(/\.hero-block\s*\{([\s\S]*?)\n\}/)?.[1];
  const washRule = css.match(/\.hero-block::before\s*\{([\s\S]*?)\n\}/)?.[1];

  assert.match(blockRule ?? "", /position:\s*relative;/);
  assert.match(blockRule ?? "", /isolation:\s*isolate;/);
  assert.match(washRule ?? "", /content:\s*["']{2};/);
  assert.match(
    washRule ?? "",
    /inset:\s*clamp\(-89\.6px,\s*-9\.8%,\s*-44\.8px\)\s*clamp\(-67\.2px,\s*-8\.4%,\s*-33\.6px\);/,
  );
  assert.match(washRule ?? "", /background:\s*color-mix\(in srgb, var\(--parchment\) 50%, transparent\);/);
  assert.match(washRule ?? "", /mask-image:[\s\S]*?10%/);
  assert.match(washRule ?? "", /-webkit-mask-image:[\s\S]*?10%/);
  assert.doesNotMatch(washRule ?? "", /border(?:-radius)?:|box-shadow:/);
});

test("the navigation text uses the same feathered paper wash", () => {
  const css = read("src/pages/home/home.css");
  const navRule = css.match(/\.wt-nav-inner\s*\{([\s\S]*?)\n\}/)?.[1];
  const washRule = css.match(/\.wt-nav-inner::before\s*\{([\s\S]*?)\n\}/)?.[1];

  assert.match(navRule ?? "", /position:\s*relative;/);
  assert.match(navRule ?? "", /isolation:\s*isolate;/);
  assert.match(washRule ?? "", /content:\s*["']{2};/);
  assert.match(washRule ?? "", /background:\s*color-mix\(in srgb, var\(--parchment\) 50%, transparent\);/);
  assert.match(washRule ?? "", /mask-image:[\s\S]*?10%/);
  assert.match(washRule ?? "", /-webkit-mask-image:[\s\S]*?10%/);
  assert.doesNotMatch(washRule ?? "", /border(?:-radius)?:|box-shadow:/);
});

test("each handwriting mask has a restrained light ink halo", () => {
  const css = read("src/pages/about/about.css");
  const inkRule = css.match(/\.mf-word,\s*\.mf-mark\s*\{([\s\S]*?)\n\}/)?.[1];
  const titleRule = css.match(/\.mf-line--title \.mf-word\s*\{([\s\S]*?)\n\}/)?.[1];
  const bodyRule = css.match(/\.mf-line--body \.mf-word\s*\{([\s\S]*?)\n\}/)?.[1];

  assert.match(inkRule ?? "", /filter:\s*drop-shadow\(0 0 1\.5px rgba\(255, 255, 255, 0\.72\)\)/);
  assert.match(titleRule ?? "", /drop-shadow\(0 0 calc\(var\(--mf-u\) \* 1\) rgba\(255, 255, 255, 0\.82\)\)/);
  assert.doesNotMatch(bodyRule ?? "", /filter:\s*none;/);
});

test("the rendered copy omits only the authored word that", () => {
  const build = read("scripts/manifesto/build.py");
  const generated = read("src/pages/about/manifesto-words.ts");

  assert.match(build, /OMITTED_WORD\s*=\s*\{\s*"text":\s*"that",\s*"line":\s*4\s*\}/);
  assert.doesNotMatch(generated, /\{ t: "that", l: 4,/);
  assert.match(
    generated,
    /\{ t: "everything", l: 4,[\s\S]*?\{ t: "we", l: 4,/,
  );
});

test("the added where reuses the later authored where crop", () => {
  const build = read("scripts/manifesto/build.py");
  const generated = read("src/pages/about/manifesto-words.ts");

  assert.match(build, /INSERTED_WORD_REUSE/);
  assert.match(build, /"text": "where"/);
  assert.match(build, /"source_line": 16/);
  assert.match(build, /"after_line": 6/);
  const insertedWhere = generated.match(
    /\{ t: "where", l: 6, s: "body", x: ([0-9.]+), y: ([0-9.]+),/,
  );
  const sourceWhere = generated.match(
    /\{ t: "where", l: 16, s: "body", x: ([0-9.]+), y: ([0-9.]+),/,
  );
  assert.ok(insertedWhere);
  assert.ok(sourceWhere);
  assert.deepEqual(insertedWhere.slice(1), sourceWhere.slice(1));
});

test("the body grows roughly five percent while retaining its left inset and the portrait grows by 125 percent", () => {
  const css = read("src/pages/about/about.css");
  const bodyRule = css.match(/\.mf-line--body\s*\{([\s\S]*?)\n\}/)?.[1];
  const portraitRule = css.match(/\.ab-portrait\s*\{([\s\S]*?)\n\}/)?.[1];

  assert.match(
    bodyRule ?? "",
    /width:\s*calc\(100%\s*-\s*\(var\(--grid-minor-step\)\s*\*\s*2\)\)/,
  );
  assert.match(
    bodyRule ?? "",
    /margin-left:\s*calc\(var\(--grid-minor-step\)\s*-\s*4px\);/,
  );
  assert.doesNotMatch(
    css,
    /\.mf-line--body\s*\{\s*width:\s*100%;\s*\}/,
    "the two-grid-line reduction must remain active at every breakpoint",
  );
  assert.match(portraitRule ?? "", /width:\s*clamp\(250px,\s*26\.25vw,\s*375px\)/);
});

test("every body word uses the same measured baseline without optical offsets", () => {
  const build = read("scripts/manifesto/build.py");
  const generated = read("src/pages/about/manifesto-words.ts");
  const bodyNudges = [...generated.matchAll(/s: "body",[^}]*?n: (-?[0-9.]+)/g)]
    .map((match) => Number(match[1]));

  assert.match(build, /WORD_BASELINE_NUDGES\s*=\s*\{\s*\}/);
  assert.match(build, /def measure_word_baseline/);
  assert.match(build, /\(word\["baseline"\]\s*-\s*top\)\s*\*\s*scale/);
  assert.doesNotMatch(
    build,
    /m\s*\*\s*\(word\["x0"\]\s*\+\s*word\["x1"\]\)\s*\/\s*2\s*\+\s*c\s*-\s*top/,
    "word baselines must come from each word's authored ink, not a line-wide estimate",
  );
  assert.ok(bodyNudges.length > 100, "the full body must expose baseline data");
  assert.deepEqual(
    [...new Set(bodyNudges)],
    [0],
    "no body word may sit above or below its measured baseline",
  );
});

test("handwriting wraps as whole alpha-masked words", () => {
  const component = read("src/pages/about/Manifesto.tsx");
  const css = read("src/pages/about/about.css");

  assert.match(component, /className="mf-word"/);
  assert.match(component, /MANIFESTO_WORDS/);
  assert.match(component, /maskImage/);
  assert.match(component, /WebkitMaskImage/);
  assert.doesNotMatch(component, /<svg/);
  assert.doesNotMatch(component, /<path/);
  assert.match(css, /background-color:\s*currentColor/);
  assert.match(css, /mask-size:/);
  assert.match(css, /mask-position:/);
  assert.match(css, /\.mf-line\s*\{[^}]*flex-wrap:\s*wrap;/s);
});

test("four authored-alpha passes create solid marker ink without changing its shape", () => {
  const component = read("src/pages/about/Manifesto.tsx");

  assert.match(component, /const MASK_PASSES = 4/);
  assert.match(component, /const maskStack\s*=/);
  assert.match(component, /Array\.from\(\{ length: MASK_PASSES \}/);
  assert.match(component, /maskImage:\s*maskStack/);
  assert.match(component, /WebkitMaskImage:\s*maskStack/);
});

test("trailing punctuation stays in the preceding word mask", () => {
  const generated = read("src/pages/about/manifesto-words.ts");
  const point = generated.match(
    /\{ t: "point,", l: 4,[^}]*?w: ([0-9.]+)/,
  );
  const followingI = generated.match(
    /\{ t: "I", l: 5,[^}]*?w: ([0-9.]+)/,
  );

  assert.ok(point);
  assert.ok(followingI);
  assert.ok(Number(point[1]) > 45, "point, crop must include its comma");
  assert.ok(Number(followingI[1]) < 25, "following I crop must not own the comma");
});

test("the final word mask includes the authored period", () => {
  const generated = read("src/pages/about/manifesto-words.ts");
  const finalWord = generated.match(
    /\{ t: "create\.", l: 20,[^}]*?w: ([0-9.]+)/,
  );

  assert.ok(finalWord);
  assert.ok(
    Number(finalWord[1]) > 52,
    "create. crop must extend through the final period",
  );
});

test("tiny authored i-dots stay inside their word masks", () => {
  const generated = read("src/pages/about/manifesto-words.ts");
  const crop = (word, line) => {
    const match = generated.match(
      new RegExp(
        `\\{ t: "${word}", l: ${line},[^}]*y: ([0-9.]+),[^}]*h: ([0-9.]+)`,
      ),
    );
    assert.ok(match, `${word} on line ${line} must have crop data`);
    return { y: Number(match[1]), h: Number(match[2]) };
  };

  assert.ok(crop("this", 1).y < 30.5, "this must include its i-dot");
  assert.ok(crop("like", 3).h > 0, "like must include its i-dot");
  assert.ok(crop("creative", 19).h > 0, "creative must include its i-dot");
  assert.ok(
    crop("intentional", 20).h > 0,
    "intentional must include both i-dots",
  );
});

test("every sentence period survives the alpha cleanup", () => {
  const build = read("scripts/manifesto/build.py");
  const generated = read("src/pages/about/manifesto-words.ts");
  const joy = generated.match(
    /\{ t: "joy\.", l: 15,[^}]*?w: ([0-9.]+)/,
  );

  assert.match(build, /validate_authored_marks/);
  assert.match(build, /word\.count\("i"\)/);
  assert.match(build, /word\.endswith\("\."\)/);
  assert.ok(joy);
  assert.ok(Number(joy[1]) > 29, "joy. crop must include its period");
});

test("all i-dots and periods receive heavier source-mask overlays", () => {
  const generated = read("src/pages/about/manifesto-words.ts");
  const build = read("scripts/manifesto/build.py");
  const component = read("src/pages/about/Manifesto.tsx");

  assert.equal(
    [...generated.matchAll(/\bmx:\s*-[0-9.]+/g)].length,
    44,
    "two title i-dots, thirty body i-dots, and twelve periods need overlays",
  );
  assert.match(component, /w\.m\.map/);
  assert.match(component, /className="mf-mark"/);
  assert.match(
    build,
    /MARK_DILATION_RADII\s*=\s*\{\s*"body":\s*0\.625,\s*"title":\s*0\.75\s*\}/,
  );
  assert.match(component, /body-marks\.png/);
  assert.match(component, /title-marks\.png/);
  assert.match(component, /maskStack\(MARK_MASKS\[w\.s\]\)/);
});
