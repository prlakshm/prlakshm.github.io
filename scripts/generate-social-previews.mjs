import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import {
  CODEX_FULL_BLEED_CSS,
  PAGE_PREVIEWS,
  SOCIAL_CANVAS,
} from "./social-preview-layout.mjs";

const root = new URL("../", import.meta.url);
const args = process.argv.slice(2);
const baseIndex = args.indexOf("--base");
if (baseIndex !== -1 && (!args[baseIndex + 1] || args[baseIndex + 1].startsWith("--"))) {
  throw new Error("--base requires a URL, for example http://localhost:5178");
}
const BASE = (baseIndex === -1 ? "http://localhost:5173" : args[baseIndex + 1]).replace(/\/$/, "");
const launchOptions = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
  ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
  : { channel: "chrome" };
// Software compositing keeps grain, gradients, and scaled page captures stable
// between runs instead of depending on the host GPU's rasterization cache.
const browser = await chromium.launch({ ...launchOptions, headless: true, args: ["--disable-gpu"] });

const capture = async ({ url, width, height, selector, style, wait = 1200 }) => {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  try {
    const page = await context.newPage();
    const response = await page.goto(`${BASE}${url}`, { waitUntil: "networkidle", timeout: 30000 });
    if (!response?.ok()) throw new Error(`Capture failed: ${url} (${response?.status()})`);
    if (style) await page.addStyleTag({ content: style });
    if (selector) await page.waitForSelector(selector, { timeout: 15000 });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise((resolve) => setTimeout(resolve, wait));
    return await page.screenshot({ type: "png" });
  } finally {
    await context.close();
  }
};

try {
  const pageImages = [];
  for (const preview of PAGE_PREVIEWS) {
    pageImages.push([preview.name, await capture({
      url: preview.url,
      width: SOCIAL_CANVAS.width,
      height: SOCIAL_CANVAS.height,
      selector: "#root > *",
      wait: 2500,
    })]);
  }
  const images = [
    ...pageImages,
    ["cursor-loves-indie-v1.png", await capture({ url: "/cursor/wordmark.html", width: 1200, height: 630, selector: "#wordmark .wordmark", wait: 1800 })],
    ["figma-sound-v1.png", await capture({ url: "/branding/sound-orbit.html", width: 1200, height: 630, selector: "#stage", wait: 3500 })],
    ["codex-bookmarks-v2.png", await capture({
      url: "/codex/",
      width: SOCIAL_CANVAS.width,
      height: SOCIAL_CANVAS.height,
      selector: ".hx-frame.is-ready",
      style: CODEX_FULL_BLEED_CSS,
      wait: 3500,
    })],
  ];
  const directory = new URL("public/social/", root);
  await mkdir(directory, { recursive: true });
  for (const [name, image] of images) {
    await writeFile(new URL(name, directory), image);
    console.log(`Generated public/social/${name} (1200 × 630)`);
  }
} finally {
  await browser.close();
}
