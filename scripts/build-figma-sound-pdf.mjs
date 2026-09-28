/* Builds public/figma-sound.pdf — the Figma Sound deck as a PDF (960 x 540 pt pages, like before):

     1. title       the film's closing wordmark with its orbit (assets/film/figma-sound-wordmark.png)
     2. watch       a still of the film with a play button, "watch with sound", a clickable link and a QR code
                    to pranaviram.com/figma/ — a PDF can't reliably play video (browsers, Preview, email, LinkedIn),
                    so the film lives on the web and this page sends people there
     3. storyboard  the film's 12 beats, 3 rows x 4 (assets/film/storyboard/, captions in storyboard.json)
     4-7. the deck  "a design system material" + the interaction / variables / Dev Mode mocks, captured from the
                    live /figma/ deck so the PDF always matches the site

   The deck has to be served (with HTTP range support, for the film) while this runs:
       npx http-server public -p 8766 -s &
       node scripts/build-figma-sound-pdf.mjs [http://localhost:8766]
   (needs Playwright: `npm i -g playwright` or a local install; its bundled Chromium renders the PDF)
   Then refresh the home-page previews (scripts/deck_slides/README.md) — the page count is 7.            */

import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const base = process.argv[2] || "http://localhost:8766";
const film = resolve(root, "public/branding/assets/film");
const fonts = resolve(root, "public/fonts");
const out = resolve(root, "public/figma-sound.pdf");
const tmp = mkdtempSync(join(tmpdir(), "figma-pdf-"));
const url = (p) => pathToFileURL(p).href;

// PW_CHROMIUM=/path/to/chrome points it at an existing browser if Playwright's own download is missing
const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"], executablePath: process.env.PW_CHROMIUM || undefined });

// ---- 4-7: the deck's slides after the film, as the site shows them (the sound toggle hidden)
const deck = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 });
await deck.goto(`${base}/figma/`, { waitUntil: "networkidle" });
// the sound toggle is web-only, and the site's "0N / 05" folios would contradict the PDF's own page count
await deck.addStyleTag({ content: ".sound-toggle, .folio { display: none !important; }" });
const shots = [];
// the moments that show each mock's point: the Interaction panel with Sound set, the yellow .wav chips, Dev Mode's Sound code
for (const [index, wait] of [[1, 2600], [2, 7000], [3, 7000], [4, 4000]]) {
  await deck.evaluate((i) => document.querySelectorAll(".slide")[i].scrollIntoView({ block: "start" }), index);
  await deck.waitForTimeout(wait);
  const path = join(tmp, `deck-${index}.png`);
  await deck.screenshot({ path });
  shots.push(path);
}
await deck.close();

// ---- the pages
const board = JSON.parse(readFileSync(join(film, "storyboard/storyboard.json"), "utf8"));
const time = (t) => `0:${t.toFixed(1).padStart(4, "0")}`;
const cells = board.map((b) => `
      <figure>
        <img src="${url(join(film, b.src))}" alt="" />
        <figcaption><span class="num">${String(b.n).padStart(2, "0")} · ${time(b.t)}</span><span class="cap">${b.caption}</span></figcaption>
      </figure>`).join("");
const qr = readFileSync(join(film, "qr-figma.svg"), "utf8").replace(/<\?xml[^>]*>/, "")
  .replace("<svg ", '<svg class="qr" ').replace(/width="[^"]*" height="[^"]*"/, "");
const html = `<!doctype html><html><head><meta charset="utf-8" /><style>
  @font-face { font-family: "General Sans"; src: url("${url(join(fonts, "general-sans/GeneralSans-Variable.woff2"))}") format("woff2"); font-weight: 200 700; }
  @font-face { font-family: "JetBrains Mono"; src: url("${url(join(fonts, "jetbrains-mono/JetBrainsMono-Variable.woff2"))}") format("woff2"); font-weight: 100 800; }
  @page { size: 1280px 720px; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body { color: #F4EDE0; font-family: "General Sans", "Helvetica Neue", Arial, sans-serif; }
  .page { break-after: page; height: 720px; overflow: hidden; position: relative; width: 1280px;
    background: #0D0C0F radial-gradient(circle at center, #34343A 0 1.5px, transparent 2.1px) center / 32px 32px; }
  .page:last-child { break-after: auto; }
  .bleed { display: block; height: 720px; object-fit: cover; width: 1280px; }
  .mono { font-family: "JetBrains Mono", ui-monospace, monospace; }
  .credit { bottom: 26px; color: rgba(244,237,224,.45); font-size: 12px; left: 56px; letter-spacing: .02em; position: absolute; }

  /* 2 · watch */
  .watch a.still { display: block; height: 405px; left: 56px; position: absolute; top: 158px; width: 720px; }
  .watch a.still img { display: block; height: 100%; width: 100%; }
  /* on the dark canvas below SLURP!, clear of the word and the cup */
  .watch .play { background: #F4EDE0; border-radius: 50%; height: 84px; left: 24%; position: absolute; top: 72%;
    transform: translate(-50%, -50%); width: 84px; box-shadow: 0 10px 40px rgba(0,0,0,.35); }
  .watch .play::after { border-bottom: 16px solid transparent; border-left: 26px solid #0D0C0F; border-top: 16px solid transparent;
    content: ""; left: 32px; position: absolute; top: 26px; }
  .watch .side { left: 832px; position: absolute; top: 158px; width: 392px; }
  .watch .label { color: rgba(244,237,224,.6); font-size: 14px; letter-spacing: .06em; margin: 0 0 20px; }
  .watch h1 { font-size: 46px; font-weight: 500; letter-spacing: -.025em; line-height: 1.04; margin: 0 0 18px; }
  .watch h1 em { color: #FFE38A; font-style: normal; }
  .watch p { color: rgba(244,237,224,.78); font-size: 17px; line-height: 1.45; margin: 0 0 26px; }
  .watch .link { color: #FFE38A; font-size: 20px; text-decoration: none; border-bottom: 2px solid #FFE38A; padding-bottom: 2px; }
  .watch .scan { align-items: center; display: flex; gap: 16px; margin-top: 34px; }
  .watch .qr { background: #F4EDE0; border-radius: 8px; height: 112px; padding: 10px; width: 112px; }
  .watch .qr path { fill: #0D0C0F; }
  .watch .scan span { color: rgba(244,237,224,.6); font-size: 13px; letter-spacing: .04em; line-height: 1.5; }

  /* 3 · storyboard */
  .board header { align-items: baseline; display: flex; justify-content: space-between; left: 76px; position: absolute; right: 76px; top: 30px; }
  .board h2 { font-size: 26px; font-weight: 500; letter-spacing: -.02em; margin: 0; }
  .board header .mono { color: rgba(244,237,224,.55); font-size: 12.5px; letter-spacing: .06em; }
  .board .grid { column-gap: 20px; display: grid; grid-template-columns: repeat(4, 1fr); left: 76px; position: absolute; right: 76px; row-gap: 12px; top: 80px; }
  .board figure { margin: 0; }
  .board img { aspect-ratio: 16 / 9; display: block; outline: 1px solid rgba(244,237,224,.12); width: 100%; }
  .board figcaption { display: flex; flex-direction: column; gap: 3px; margin-top: 8px; }
  .board .num { color: #FFE38A; font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 11px; letter-spacing: .04em; }
  .board .cap { font-size: 13.5px; line-height: 1.25; }
</style></head><body>
  <section class="page"><img class="bleed" src="${url(join(film, "figma-sound-wordmark.png"))}" alt="Figma Sound" /></section>

  <section class="page watch">
    <a class="still" href="https://pranaviram.com/figma/"><img src="${url(join(film, "figma-sound-film-still.jpg"))}" alt="" /><span class="play"></span></a>
    <div class="side">
      <p class="label mono">LAUNCH FILM · 0:27 · SOUND ON</p>
      <h1>Watch it with <em>sound</em>.</h1>
      <p>A film about sound can't live in a PDF. It plays at the top of the Figma Sound deck on my site.</p>
      <a class="link" href="https://pranaviram.com/figma/">pranaviram.com/figma →</a>
      <div class="scan">${qr}<span class="mono">SCAN TO<br />WATCH</span></div>
    </div>
    <span class="credit">Independent concept by Pranavi Ram</span>
  </section>

  <section class="page board">
    <header><h2>Storyboard</h2><span class="mono">LAUNCH FILM · 27 S · 12 BEATS</span></header>
    <div class="grid">${cells}
    </div>
  </section>

  ${shots.map((s) => `<section class="page"><img class="bleed" src="${url(s)}" alt="" /></section>`).join("\n  ")}
</body></html>`;
const doc = join(tmp, "figma-sound.html");
writeFileSync(doc, html);
const page = await browser.newPage();
await page.goto(url(doc), { waitUntil: "networkidle" });
await page.pdf({ path: out, width: "1280px", height: "720px", printBackground: true, preferCSSPageSize: true });
await browser.close();
console.log(`wrote ${out}`);
