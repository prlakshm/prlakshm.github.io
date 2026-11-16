/* Render a Smart Mute prototype frame by frame and encode an MP4.
   Each page exposes render(t) and DURATION; ?record skips its own loop.
   Usage: node poster-lab/smart-mute/record.mjs iphone [fps]
          node poster-lab/smart-mute/record.mjs mac|settings [fps] */
import { chromium } from "playwright";
import { mkdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const name = process.argv[2] || "iphone";
const fps = Number(process.argv[3] || 60);
const size = name === "mac" ? { width: 1920, height: 1080 } : { width: 1080, height: 1350 };
const frames = resolve(here, `.frames-${name}`);
rmSync(frames, { recursive: true, force: true });
mkdirSync(frames, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(resolve(here, `${name}.html`)).href + "?record");
await page.evaluate(() => document.fonts.ready);
const duration = await page.evaluate(() => window.DURATION);
const n = Math.ceil(duration * fps);
for (let i = 0; i <= n; i++) {
  await page.evaluate((t) => window.render(t), i / fps);
  await page.screenshot({ path: `${frames}/${String(i).padStart(5, "0")}.png` });
}
await browser.close();

const outFile = resolve(here, `smart-mute-${name}.mp4`);
const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", `${frames}/%05d.png`,
  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-preset", "slow", "-movflags", "+faststart", outFile], { stdio: "inherit" });
rmSync(frames, { recursive: true, force: true });
if (r.status !== 0) process.exit(r.status);
console.log(outFile, `${n + 1} frames`);
