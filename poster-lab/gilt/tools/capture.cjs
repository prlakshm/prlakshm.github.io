#!/usr/bin/env node
/* capture.cjs <id> [outDir] [--ab=<param>:<value>,...] [--ref=<dir of same-scale study crops>] [--no-perf]

   Captures the plan §4.2 frames of one concept from the gilt lab (served by the
   repo's running Vite dev server at :5173), on the shared off-screen Chrome
   (scratchpad/lab/ws.txt) or a fallback headful Chrome, at dpr 2:

     d_rest_t0.png, d_rest_t6.png      1440x279 band, idle lamp, t = 0 / 6 s
     d_lamp_hero|water|far.png         cursor lamp over the hero / open water / far gold
     m_rest.png, m_lamp.png            375x180
     film_0..7.png                     idle, 1 s apart (post.py stacks them at 720 wide)
     dbg_<term>.png                    caught, hot, glow, height, near, normal (lamp on hero)
     cov_d.png, cov_m.png              R foil, G coverage, B wide NEAR (mask export)
     d_nohalf.png                      the no-half-float fallback, same frame as d_rest_t0
     flat.png                          after WEBGL_lose_context (CSS wash)
     spots.json, stats.json            spots, pieces, coverage, frame times, checks

   Every frame comes from canvas.toDataURL right after a synchronous render
   (window.__gilt.snapshot), so pixels are exact and time is repeatable
   (window.__gilt.at / frame). Then runs post.py for crops, film, debug strip,
   contact sheet and metrics. */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("/Users/pranavi/Documents/GitHub/prlakshm.github.io/node_modules/playwright");

const SCRATCH = "/private/tmp/claude-501/-Users-pranavi-Documents-GitHub-prlakshm-github-io/d63b9b37-0a16-462a-b9d0-58588530c01f/scratchpad";
const WS = `${SCRATCH}/lab/ws.txt`;
const BASE = "http://localhost:5173/poster-lab/gilt/index.html";

const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith("--"));
const opt = Object.fromEntries(args.filter((a) => a.startsWith("--")).map((a) => {
  const [k, ...v] = a.slice(2).split("=");
  return [k, v.length ? v.join("=") : true];
}));
const id = pos[0] || "test";
const out = pos[1] || `${SCRATCH}/redo/gilt/caps/${id}`;
fs.mkdirSync(out, { recursive: true });
const abq = opt.ab ? `&ab=${encodeURIComponent(opt.ab)}` : "";
const HARD = Number(opt.timeout || 240) * 1000;
const hard = setTimeout(() => {
  console.error(`HARD TIMEOUT after ${HARD / 1000}s`);
  process.exit(3);
}, HARD);

const log = (...a) => console.log(...a);
const save = (name, dataUrl) => fs.writeFileSync(path.join(out, name), Buffer.from(dataUrl.split(",")[1], "base64"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  let browser;
  let shared = true;
  try {
    browser = await chromium.connect(fs.readFileSync(WS, "utf8").trim(), { timeout: 8000 });
  } catch (e) {
    log(`shared Chrome unavailable (${e.message.split("\n")[0]}); launching a fallback`);
    shared = false;
    browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--ignore-gpu-blocklist", "--window-position=-2400,0"] });
  }
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 700 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const consoleLines = [];
  page.on("console", (m) => (m.type() === "error" || m.type() === "warning") && consoleLines.push(`[${m.type()}] ${m.text()}`));
  page.on("pageerror", (e) => consoleLines.push(`[pageerror] ${e.message}`));
  page.on("framenavigated", (f) => f === page.mainFrame() && consoleLines.push(`[nav] ${f.url()}`));
  const stats = { id, out, shared };

  const open = async (q) => {
    await page.goto(`${BASE}?c=${id}${abq}&${q}`, { waitUntil: "load", timeout: 30000 });
    await page.waitForFunction(() => (window.__gilt && window.__gilt.ready) || window.__error, null, { timeout: 30000 });
    const err = await page.evaluate(() => window.__error || null);
    if (err) throw new Error(`lab error: ${err}`);
  };
  const snap = async (name, js = "") => {
    const url = await page.evaluate((js) => {
      if (js) eval(js);
      return window.__gilt.snapshot();
    }, js);
    save(name, url);
  };

  try {
    // ---------------------------------------------------------------- desktop
    await open("w=1440&t=0");
    stats.desktop = await page.evaluate(() => window.__gilt.stats());
    const spots = await page.evaluate(() => window.__gilt.spots());
    const pieces = await page.evaluate(() => window.__gilt.pieces());
    await snap("d_rest_t0.png");
    await snap("d_rest_t6.png", "window.__gilt.at(6)");
    await page.evaluate(() => window.__gilt.at(0));
    for (const m of ["hero", "water", "far"]) await snap(`d_lamp_${m}.png`, `window.__gilt.setLamp(${JSON.stringify(m)})`);
    if (spots.smallest && spots.far && spots.smallest.id !== spots.far.id) await snap("d_lamp_smallest.png", "window.__gilt.setLamp('smallest')");
    await page.evaluate(() => window.__gilt.setLamp("hero"));
    for (const d of ["caught", "hot", "glow", "height", "near", "normal"]) await snap(`dbg_${d}.png`, `window.__gilt.setDebug(${JSON.stringify(d)})`);
    await snap("cov_d.png", "window.__gilt.setDebug('coverage')");
    await page.evaluate(() => {
      window.__gilt.setDebug("");
      window.__gilt.setLamp("idle");
    });
    stats.coverage_d = await page.evaluate(() => window.__gilt.measure());
    await page.evaluate(() => window.__gilt.at(0));
    for (let i = 0; i < 8; i++) await snap(`film_${i}.png`, i ? "window.__gilt.frame(1)" : "");
    // off lamp, for the "pure rest" numbers
    await snap("d_lamp_off.png", "window.__gilt.at(0); window.__gilt.setLamp('off')");
    fs.writeFileSync(path.join(out, "spots.json"), JSON.stringify({ spots, pieces }, null, 1));
    log(`desktop ok: ${pieces.length} pieces, coverage ${(stats.coverage_d.coverage * 100).toFixed(1)}% (foil ${(stats.coverage_d.foil * 100).toFixed(1)}%)`);

    // ---------------------------------------------------------------- mobile
    await open("w=375&t=0");
    stats.mobile = await page.evaluate(() => window.__gilt.stats());
    const mspots = await page.evaluate(() => window.__gilt.spots());
    await snap("m_rest.png");
    await snap("m_lamp.png", "window.__gilt.setLamp('hero')");
    await snap("cov_m.png", "window.__gilt.setDebug('coverage')");
    await page.evaluate(() => window.__gilt.setDebug(""));
    stats.coverage_m = await page.evaluate(() => window.__gilt.measure());
    fs.writeFileSync(path.join(out, "spots_m.json"), JSON.stringify(mspots, null, 1));
    log(`mobile ok: coverage ${(stats.coverage_m.coverage * 100).toFixed(1)}%`);

    // ---------------------------------------------------------------- fallback: no half float
    await open("w=1440&t=0&noHalf");
    stats.noHalf = (await page.evaluate(() => window.__gilt.stats())).half === false;
    await snap("d_nohalf.png");

    // ---------------------------------------------------------------- performance (live)
    if (!opt["no-perf"]) {
      await open("w=1440&live");
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(600);
      await page.evaluate(() => window.__gilt.resetIntervals());
      const t0 = Date.now();
      while (Date.now() - t0 < 20000) {
        const n = await page.evaluate(() => window.__gilt.stats().intervals.n);
        if (n >= 600) break;
        await sleep(250);
      }
      const s = await page.evaluate(() => window.__gilt.stats());
      stats.perf = { intervals: s.intervals, cpu: s.cpu, frames: s.frames, paints: s.paints, running: s.running, seconds: (Date.now() - t0) / 1000 };
      await page.evaluate(() => window.__gilt.stop());
      stats.bench = await page.evaluate(() => window.__gilt.bench(90));
      log(`perf: interval p50 ${s.intervals.p50.toFixed(2)} p95 ${s.intervals.p95.toFixed(2)} ms over ${s.intervals.n}; gpu-sync finish p50 ${stats.bench.finish.p50.toFixed(2)} ms, paint+finish p50 ${stats.bench.paintPlusFinish.p50.toFixed(2)} ms`);

      // off-screen: scroll away -> no draws; visibilitychange -> no draws
      try {
      await open("w=1440&live");
      await sleep(500);
      await sleep(500);
      await page.evaluate(() => {
        const sp = document.createElement("div");
        sp.style.height = "4000px";
        document.body.appendChild(sp);
        window.scrollTo(0, document.body.scrollHeight);
      });
      await sleep(400);
      const a = await page.evaluate(() => window.__gilt.stats());
      await sleep(2000);
      const b = await page.evaluate(() => window.__gilt.stats());
      stats.offscreen = { drawsIn2s: b.drawCalls - a.drawCalls, running: b.running, visible: b.visible };
      await page.evaluate(() => window.scrollTo(0, 0));
      await sleep(500);
      const c = await page.evaluate(() => window.__gilt.stats());
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await sleep(300);
      const d = await page.evaluate(() => window.__gilt.stats());
      await sleep(2000);
      const e = await page.evaluate(() => window.__gilt.stats());
      stats.hidden = { resumedOnScrollBack: c.running, drawsIn2s: e.drawCalls - d.drawCalls, running: e.running };
      log(`off-screen: ${JSON.stringify(stats.offscreen)}  hidden: ${JSON.stringify(stats.hidden)}`);
      } catch (e) {
        stats.offscreenError = e.message.split("\n")[0];
        log(`off-screen test failed: ${stats.offscreenError}`);
      }

      // headroom: 4x the band's area
      await open("w=2880&h=558&live");
      await page.evaluate(() => window.__gilt.resetIntervals());
      await sleep(4000);
      const h4 = await page.evaluate(() => window.__gilt.stats());
      stats.perf4x = { intervals: h4.intervals, fps: 1000 / Math.max(1e-3, h4.intervals.p50) };
      log(`4x area: interval p50 ${h4.intervals.p50.toFixed(2)} p95 ${h4.intervals.p95.toFixed(2)} ms`);
    }

    // ---------------------------------------------------------------- reduced motion
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open("w=1440&live");
    // compare the band minus a 24 px strip on the right (macOS overlay scrollbar fades there)
    await page.evaluate(() => document.getElementById("band").scrollIntoView());
    await sleep(800);
    const box = await page.locator("#band").boundingBox();
    const clip = { x: box.x, y: box.y, width: Math.min(box.width, 1440) - 24, height: box.height };
    const d0 = (await page.evaluate(() => window.__gilt.stats())).drawCalls;
    const r1 = await page.screenshot({ clip });
    await sleep(2000);
    const r2 = await page.screenshot({ clip });
    const s2 = await page.evaluate(() => window.__gilt.stats());
    stats.reduced = { identical: Buffer.compare(r1, r2) === 0, drawsIn2s: s2.drawCalls - d0, frames: s2.frames, running: s2.running };
    fs.writeFileSync(path.join(out, "reduced.png"), r1);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    log(`reduced motion: ${JSON.stringify(stats.reduced)}`);

    // ---------------------------------------------------------------- context loss -> CSS wash
    await open("w=1440&t=0");
    await page.evaluate(() => window.__gilt.loseContext());
    await sleep(500);
    stats.contextLoss = { flat: await page.evaluate(() => document.getElementById("band").classList.contains("is-flat")) };
    fs.writeFileSync(path.join(out, "flat.png"), await page.locator("#band").screenshot());
    log(`context loss: ${JSON.stringify(stats.contextLoss)}`);
  } catch (e) {
    stats.error = e.message;
    console.error("CAPTURE FAILED:", e.message);
  } finally {
    stats.console = consoleLines.slice(0, 40);
    fs.writeFileSync(path.join(out, "stats.json"), JSON.stringify(stats, null, 1));
    await page.close().catch(() => {});
    await ctx.close().catch(() => {});
    if (!shared) await browser.close().catch(() => {});
  }
  if (!stats.error) {
    try {
      const post = path.join(__dirname, "post.py");
      const refArg = opt.ref ? ["--ref", opt.ref] : [];
      log(execFileSync("python3", [post, out, ...refArg], { encoding: "utf8", timeout: 120000 }));
    } catch (e) {
      console.error("post.py failed:", e.message);
    }
  }
  clearTimeout(hard);
  process.exit(stats.error ? 1 : 0);
})();
