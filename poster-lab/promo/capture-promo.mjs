/* Landing-page promo, captured frame by frame from the real page.
   0.00-1.00  five posters cut in full-frame, one per 0.2s beat
   1.00-1.15  they fan out as a stack
   1.15-2.10  each flies into its slot in the row; the page washes in
   2.55       a real star is earned from the title and stamps onto the card
   ->4.80     hold */
import { chromium } from "/Users/pranavi/Documents/GitHub/prlakshm.github.io/node_modules/playwright/index.mjs";
import fs from "node:fs";
const OUT = process.argv[2]; const DPR = Number(process.argv[3] || 1); const ONLY = process.argv[4] ? process.argv[4].split(",").map(Number) : null;
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: false, args: ["--window-position=-4000,0"] });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: DPR });
await ctx.addInitScript(() => { try { const f = ["name", "read", "reimagine"]; sessionStorage.setItem("pr-badges-session-v2", JSON.stringify({ found: f, records: f.map((id, i) => ({ id, eventId: "promo-" + id, foundAt: i + 1 })) })); sessionStorage.setItem("pr-badge-intro", "1"); } catch {} });
const page = await ctx.newPage();
await page.clock.install({ time: new Date("2026-10-10T10:00:00") });
await page.goto("http://localhost:5173/"); await page.waitForLoadState("networkidle");
await page.clock.pauseAt(new Date("2026-10-10T10:00:05"));
await page.evaluate(() => document.fonts.ready);
await page.mouse.move(1919, 1079);
await page.clock.runFor(2500); // arms the badges, settles the page
await page.evaluate(() => Promise.all([...document.images].map((im) => (im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; })))));
await page.evaluate(() => {
  document.querySelectorAll(".enter").forEach((e) => e.classList.add("is-in"));
  document.getAnimations().forEach((a) => { try { a.finish(); } catch {} });
});
await page.clock.runFor(500);
// build the composition
await page.evaluate(async () => {
  const W = innerWidth, H = innerHeight;
  const cards = [...document.querySelectorAll(".gl-card")];
  const prints = cards.map((c) => c.querySelector(".gl-print"));
  const rects = prints.map((p) => p.getBoundingClientRect());
  const srcs = prints.map((p) => p.querySelector("img").currentSrc);
  const mine = [];
  const add = (el, kf, o) => { const a = el.animate(kf, { fill: "both", ...o }); a.pause(); a.currentTime = 0; mine.push(a); return a; };
  const quiet = document.createElement("style");
  quiet.textContent = ".hero-pron { display: none !important; }"; // a hover note; not part of the promo
  document.head.appendChild(quiet);
  const bg = getComputedStyle(document.body).backgroundColor;
  const veil = Object.assign(document.createElement("div"), { id: "promo-veil" });
  Object.assign(veil.style, { position: "fixed", inset: "0", background: bg, zIndex: 9000, pointerEvents: "none" });
  document.body.appendChild(veil);
  // the big frame size for the flash
  const bh = Math.round(H * 0.8), bw = Math.round(bh * 0.8);
  const big = { x: (W - bw) / 2, y: (H - bh) / 2, w: bw, h: bh };
  const clones = srcs.map((src, i) => {
    const r = rects[i];
    const im = document.createElement("img");
    im.src = src;
    Object.assign(im.style, { position: "fixed", left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px", objectFit: "cover", zIndex: 9100 + i, transformOrigin: "50% 50%", boxShadow: "0 18px 40px rgb(15 23 42 / 0.18)", willChange: "transform", opacity: 0 });
    document.body.appendChild(im);
    return im;
  });
  await Promise.all(clones.map((c) => c.decode().catch(() => {})));
  const T = 4800;
  const at = (ms) => ms / T;
  const toBig = (r) => { const s = big.w / r.width; return { dx: big.x + big.w / 2 - (r.left + r.width / 2), dy: big.y + big.h / 2 - (r.top + r.height / 2), s }; };
  const easeOut = "cubic-bezier(0.16, 1, 0.3, 1)";
  clones.forEach((im, i) => {
    const r = rects[i], b = toBig(r);
    const cutIn = 200 * i, fan = [-7, 5, -3, 6, 0][i];
    const fanX = [-38, 30, -16, 24, 0][i], fanY = [10, -6, 4, -10, 0][i];
    const launch = 1150 + 55 * i, land = launch + 900;
    const frames = [
      { offset: 0, opacity: i === 0 ? 1 : 0, transform: `translate(${b.dx}px, ${b.dy}px) scale(${b.s * 1.06})` },
      // hard cut in, with a small punch
      { offset: at(cutIn), opacity: i === 0 ? 1 : 0, transform: `translate(${b.dx}px, ${b.dy}px) scale(${b.s * 1.06})` },
      { offset: at(cutIn) + 0.00001, opacity: 1, transform: `translate(${b.dx}px, ${b.dy}px) scale(${b.s * 1.06})`, easing: easeOut },
      { offset: at(cutIn + 170), opacity: 1, transform: `translate(${b.dx}px, ${b.dy}px) scale(${b.s})` },
      // a beat as the top card, then the stack fans
      { offset: at(1000), opacity: 1, transform: `translate(${b.dx}px, ${b.dy}px) scale(${b.s})`, easing: easeOut },
      { offset: at(1150), opacity: 1, transform: `translate(${b.dx + fanX}px, ${b.dy + fanY}px) rotate(${fan}deg) scale(${b.s * 0.96})` },
      { offset: at(launch), opacity: 1, transform: `translate(${b.dx + fanX}px, ${b.dy + fanY}px) rotate(${fan}deg) scale(${b.s * 0.96})`, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      // into its slot
      { offset: at(land), opacity: 1, transform: "none" },
      { offset: at(land + 140), opacity: 0, transform: "none" },
      { offset: 1, opacity: 0, transform: "none" },
    ];
    add(im, frames, { duration: T, easing: "linear" });
    // the real print takes over under it as it lands
    add(prints[i], [{ offset: 0, opacity: 0 }, { offset: at(land - 10), opacity: 0 }, { offset: at(land), opacity: 1 }, { offset: 1, opacity: 1 }], { duration: T });
  });
  // the page washes in behind the flight
  add(veil, [{ offset: 0, opacity: 1 }, { offset: at(1150), opacity: 1, easing: "cubic-bezier(0.33, 0, 0.2, 1)" }, { offset: at(1600), opacity: 0 }, { offset: 1, opacity: 0 }], { duration: T });
  const rise = (el, from, dur) => add(el, [{ offset: 0, opacity: 0, transform: "translateY(18px)" }, { offset: at(from), opacity: 0, transform: "translateY(18px)", easing: "cubic-bezier(0.22, 0.61, 0.36, 1)" }, { offset: at(from + dur), opacity: 1, transform: "none" }, { offset: 1, opacity: 1, transform: "none" }], { duration: T });
  rise(document.querySelector(".hero-block"), 1350, 650);
  document.querySelectorAll(".gl-placard").forEach((e, i) => rise(e, 1650 + 80 * i, 550));
  document.querySelectorAll(".gl-label").forEach((e, i) => rise(e, 1900 + 55 * i, 550));
  window.__mine = mine;
  window.__seen = new Map();
  window.__set = (ms) => {
    mine.forEach((a) => { a.currentTime = ms; });
    // anything the page itself starts (the stamp, the card) is held to the same clock
    document.getAnimations().forEach((a) => {
      if (mine.includes(a)) return;
      if (!window.__seen.has(a)) { window.__seen.set(a, ms - 16.667); a.pause(); }
      try { a.currentTime = ms - window.__seen.get(a); } catch {}
    });
  };
  window.__set(0);
});
const { earn } = await page.evaluate(async () => { const m = await import("/src/components/badges/badgeStore.ts"); window.__earn = m.earn; return { earn: typeof m.earn }; });
if (earn !== "function") throw new Error("no earn()");
const fps = 60, T = 4800, n = Math.round((T / 1000) * fps);
let earned = false;
for (let i = 0; i <= n; i++) {
  const ms = (i / fps) * 1000;
  if (!earned && ms >= 2550) {
    earned = true;
    await page.evaluate(() => { const r = document.querySelector(".hero-title").getBoundingClientRect(); window.__earn("bagel", { x: r.left + r.width * 0.5, y: r.top + r.height * 0.5 }); });
  }
  if (i > 0) await page.clock.runFor(1000 / fps);
  await page.evaluate((ms) => window.__set(ms), ms);
  if (!ONLY || ONLY.includes(i)) await page.screenshot({ path: OUT + String(i).padStart(5, "0") + ".jpg", type: "jpeg", quality: 94 });
}
console.log("frames", n + 1);
await browser.close();
