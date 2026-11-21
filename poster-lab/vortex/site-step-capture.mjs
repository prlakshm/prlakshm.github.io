// frame-stepped capture of the cave-in: node step.mjs <startUrl> <outPrefix> [w] [h] [scrollY]
import { chromium } from "/Users/pranavi/Documents/GitHub/prlakshm.github.io/node_modules/playwright/index.mjs";
const [url, out, W = "1440", H = "900", scrollY = "0", mobile = ""] = process.argv.slice(2);
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const ctx = await browser.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1, hasTouch: !!mobile, isMobile: !!mobile });
const page = await ctx.newPage();
const logs = [];
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(m.type() + ": " + m.text().slice(0, 300)); });
page.on("pageerror", (e) => logs.push("pageerror: " + e.message.slice(0, 300)));
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(+(process.env.WAIT || 1500));
if (+scrollY) { await page.evaluate((y) => window.scrollTo(0, y), +scrollY); await page.waitForTimeout(600); }
await page.screenshot({ path: `${out}-00-before.png` });
// click the EVERYTHING link (open the phone menu first if it is folded away)
const link = page.locator('a[href^="/everything"]').first();
if (!(await link.isVisible())) { await page.locator(".wt-nav-toggle").click(); await page.waitForTimeout(400); }
await link.click({ noWaitAfter: true });
await page.waitForFunction(() => document.documentElement.classList.contains("cave-run") && document.getAnimations().some((a) => a.effect && a.effect.pseudoElement), null, { timeout: 8000 });
const info = await page.evaluate(() => { const as = document.getAnimations(); as.forEach((a) => a.pause()); return { n: as.length, pseudo: as.filter((a) => a.effect.pseudoElement).length, names: as.filter((a) => a.effect.pseudoElement).map((a) => a.effect.pseudoElement).slice(0, 6) }; });
console.log("exit animations", JSON.stringify(info));
for (const t of [0.1, 0.3, 0.5, 0.8, 1.2, 1.6, 2.0, 2.4, 2.6]) {
  await page.evaluate((ms) => document.getAnimations().forEach((a) => (a.currentTime = ms)), t * 1000);
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${out}-out-${t.toFixed(2)}.png` });
}
const nav = page.waitForURL(/everything/, { timeout: 10000 });
await page.evaluate(() => document.getAnimations().forEach((a) => { try { a.finish(); } catch (e) {} }));
await nav;
await page.waitForFunction(() => !!document.querySelector(".gx-cave-hole") || (!document.documentElement.classList.contains("gx-cave") && document.readyState === "complete"), null, { timeout: 15000 });
const info2 = await page.evaluate(() => { const as = document.getAnimations(); as.forEach((a) => a.pause()); return { n: as.length, hole: !!document.querySelector(".gx-cave-hole"), classes: document.documentElement.className }; });
console.log("arrival", JSON.stringify(info2));
for (const t of [0.0, 0.3, 0.6, 0.9, 1.2, 1.5, 1.8, 2.1, 2.5]) {
  await page.evaluate((ms) => document.getAnimations().forEach((a) => { try { a.currentTime = ms; } catch (e) {} }), t * 1000);
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${out}-back-${t.toFixed(2)}.png` });
}
await page.evaluate(() => document.getAnimations().forEach((a) => { try { a.finish(); } catch (e) {} }));
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}-zz-settled.png` });
console.log("end classes:", await page.evaluate(() => document.documentElement.className), "| leftovers:", await page.evaluate(() => [!!document.querySelector(".gx-cave-hole"), !!document.getElementById("gx-cave-first")].join()));
console.log(logs.slice(0, 12).join("\n"));
await browser.close();
