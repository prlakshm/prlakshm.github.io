/* Record each Figma Sound slide as an X-ready MP4 (H.264 + AAC, 16:9)
   with its motion and soundtrack. Uses ?go=&record=1 so one slide fills
   the frame, chrome is hidden, and audio unlocks on cue.

   Usage (dev server already up):
     node scripts/export-figma-x-videos.mjs
     node scripts/export-figma-x-videos.mjs --base http://localhost:5173 --out exports/figma-sound-x
*/

import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const BASE = flag("--base", "http://localhost:5173").replace(/\/$/, "");
const OUT = resolve(root, flag("--out", "exports/figma-sound-x"));
const WIDTH = 1920;
const HEIGHT = 1080;

const ALL_SLIDES = [
  { id: "10", n: "01", slug: "figma-sound-title", ms: 9000 },
  { id: "11", n: "02", slug: "megaphone", ms: 6500 },
  { id: "12", n: "03", slug: "design-system-material", ms: 4200 },
  { id: "13", n: "04", slug: "sonic-behavior", ms: 4500 },
  { id: "14", n: "05", slug: "prototype-sound-control", ms: 10500 },
  { id: "15", n: "06", slug: "sound-tokens", ms: 12000 },
  { id: "16", n: "07", slug: "dev-mode-sound", ms: 12000 },
  { id: "17", n: "08", slug: "what-will-it-sound-like", ms: 3800 },
  { id: "18", n: "09", slug: "piano", ms: 6500 },
];
const only = new Set((flag("--only", "")).split(",").map((s) => s.trim()).filter(Boolean));
const SLIDES = only.size ? ALL_SLIDES.filter((s) => only.has(s.id) || only.has(s.n)) : ALL_SLIDES;

const TAP = `(() => {
  if (window.__xCapInstalled) return;
  window.__xCapInstalled = true;
  const attached = new Set();
  const mixerCtx = new (window.AudioContext || window.webkitAudioContext)();
  const mixDest = mixerCtx.createMediaStreamDestination();
  window.__xHtmlCtx = mixerCtx;
  const attachStream = (stream) => {
    if (!stream || attached.has(stream)) return;
    attached.add(stream);
    try { mixerCtx.createMediaStreamSource(stream).connect(mixDest); } catch {}
  };
  const tapContext = (ctx) => {
    if (!ctx || ctx.__xTap) return ctx.__xTap;
    ctx.__xTap = ctx.createMediaStreamDestination();
    attachStream(ctx.__xTap.stream);
    return ctx.__xTap;
  };
  const origConnect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...rest) {
    const result = origConnect.call(this, dest, ...rest);
    try {
      if (dest === this.context.destination && this.context !== mixerCtx) {
        origConnect.call(this, tapContext(this.context), ...rest);
      }
    } catch {}
    return result;
  };
  const origPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    if (!this.__xTapped) {
      try {
        const src = mixerCtx.createMediaElementSource(this);
        src.connect(mixerCtx.destination);
        src.connect(mixDest);
        this.__xTapped = true;
      } catch {}
    }
    return origPlay.call(this);
  };
  const pickMime = () => {
    for (const type of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) return type;
    }
    return "";
  };
  window.__xStartRec = async () => {
    if (window.__xRec) return true;
    try { await mixerCtx.resume(); } catch {}
    const mime = pickMime();
    const rec = new MediaRecorder(mixDest.stream, mime ? { mimeType: mime } : undefined);
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    window.__xRec = rec;
    window.__xChunks = chunks;
    rec.start(200);
    return true;
  };
  window.__xStopRec = () => new Promise((resolve) => {
    const rec = window.__xRec;
    if (!rec || rec.state === "inactive") return resolve(null);
    rec.onstop = async () => {
      window.__xRec = null;
      const blob = new Blob(window.__xChunks, { type: rec.mimeType || "audio/webm" });
      const buf = await blob.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let bin = "";
      for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
      resolve(btoa(bin));
    };
    rec.stop();
  });
})();`;

const ffmpeg = (...ffmpegArgs) => {
  const result = spawnSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...ffmpegArgs], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "ffmpeg failed");
  }
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

mkdirSync(OUT, { recursive: true });
const scratch = resolve(OUT, ".scratch");
mkdirSync(scratch, { recursive: true });

const browser = await chromium.launch({
  args: [
    "--autoplay-policy=no-user-gesture-required",
    "--disable-dev-shm-usage",
  ],
});

try {
  for (const slide of SLIDES) {
    const name = `${slide.n}-${slide.slug}`;
    const dest = resolve(OUT, `${name}.mp4`);
    process.stdout.write(`${name} … `);

    const context = await browser.newContext({
      viewport: { width: WIDTH, height: HEIGHT },
      recordVideo: { dir: scratch, size: { width: WIDTH, height: HEIGHT } },
      reducedMotion: "no-preference",
    });
    await context.addInitScript(TAP);
    const page = await context.newPage();
    const recStarted = Date.now();
    await page.goto(`${BASE}/figma/?go=${slide.id}&record=1`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForSelector(".sound-slide", { timeout: 15000 });
    if (slide.id === "10") {
      await page.waitForSelector("#titleParticles", { timeout: 15000 });
      await page.waitForFunction(() => {
        const c = document.getElementById("titleParticles");
        return c && c.width > 0 && c.height > 0;
      });
      await sleep(500);
    } else if (["14", "15", "16"].includes(slide.id)) {
      await page.waitForSelector("iframe.animation-frame", { timeout: 15000 });
      await sleep(1200);
    } else {
      await sleep(700);
    }

    const frames = page.frames();
    for (const frame of frames) {
      await frame.evaluate(async () => {
        if (typeof window.__xStartRec === "function") await window.__xStartRec();
      }).catch(() => {});
    }
    await sleep(200);

    const armAt = Date.now();
    const armed = await page.evaluate(async () => {
      if (typeof window.__recordArm !== "function") return false;
      return window.__recordArm();
    });
    if (!armed) throw new Error(`record arm failed on slide ${slide.id}`);

    await sleep(slide.ms);

    const audioFiles = [];
    for (const [i, frame] of frames.entries()) {
      const b64 = await frame.evaluate(() => window.__xStopRec?.() ?? null).catch(() => null);
      if (!b64 || typeof b64 !== "string") continue;
      const file = resolve(scratch, `${name}-a${i}.webm`);
      writeFileSync(file, Buffer.from(b64, "base64"));
      if (Buffer.from(b64, "base64").length > 400) audioFiles.push(file);
    }

    const video = page.video();
    await page.close();
    const rawVideo = await video.path();
    await context.close();

    const trimStart = Math.max(0, (armAt - recStarted) / 1000);
    const durationSec = slide.ms / 1000;
    const clipped = resolve(scratch, `${name}-clip.mp4`);
    ffmpeg(
      "-ss", trimStart.toFixed(3),
      "-t", durationSec.toFixed(3),
      "-i", rawVideo,
      "-an",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-preset", "fast",
      "-crf", "18",
      clipped,
    );

    const mixed = resolve(scratch, `${name}-mix.wav`);
    if (audioFiles.length === 1) {
      ffmpeg("-i", audioFiles[0], mixed);
    } else if (audioFiles.length > 1) {
      const inputs = audioFiles.flatMap((f) => ["-i", f]);
      const n = audioFiles.length;
      ffmpeg(
        ...inputs,
        "-filter_complex",
        `amix=inputs=${n}:duration=longest:normalize=0`,
        mixed,
      );
    }

    if (existsSync(mixed)) {
      ffmpeg(
        "-i", clipped,
        "-i", mixed,
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "slow",
        "-crf", "18",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        "-movflags", "+faststart",
        dest,
      );
    } else {
      ffmpeg(
        "-i", clipped,
        "-c:v", "copy",
        "-an",
        "-movflags", "+faststart",
        dest,
      );
      process.stdout.write("(no audio tap) ");
    }
    console.log("ok");
  }
} finally {
  await browser.close();
  rmSync(scratch, { recursive: true, force: true });
}

console.log(`\nWrote ${SLIDES.length} videos to ${OUT}`);
