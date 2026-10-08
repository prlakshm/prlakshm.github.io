import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import {
  CODEX_FULL_BLEED_CSS,
  COLLAGE_WINDOWS,
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
const dataURL = (image) => `data:image/png;base64,${image.toString("base64")}`;

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

const collage = async (url, favicon) => {
  const windows = [];
  for (const window of COLLAGE_WINDOWS) {
    const image = await capture({
      url,
      width: window.viewportWidth,
      height: window.viewportHeight,
      selector: "#root > *",
    });
    const chrome = window.browser === "safari"
      ? `<div class="browser__chrome safari-toolbar">
          <span class="traffic"><i></i><i></i><i></i></span>
          <span class="safari-nav" aria-hidden="true">‹　›</span>
          <div class="safari-address"><img src="${favicon}" alt="" /><span>pranaviram.com</span></div>
          <span class="safari-actions" aria-hidden="true">↗　＋</span>
        </div>`
      : `<div class="browser__chrome chrome-toolbar">
          <span class="traffic"><i></i><i></i><i></i></span>
          <div class="tab"><img src="${favicon}" alt="" /><span>Pranavi Ram | Product Designer</span></div>
        </div>`;
    windows.push(`<div class="browser browser--${window.browser}" style="left:${window.x}px;top:${window.y}px;width:${window.width}px;height:${window.height}px">
      ${chrome}
      <img class="browser__page" src="${dataURL(image)}" alt="" />
    </div>`);
  }
  const context = await browser.newContext({ viewport: SOCIAL_CANVAS, deviceScaleFactor: 1 });
  try {
    const page = await context.newPage();
    await page.setContent(`<!doctype html><html><head><style>
      * { box-sizing: border-box; }
      html, body { margin: 0; width: ${SOCIAL_CANVAS.width}px; height: ${SOCIAL_CANVAS.height}px; overflow: hidden; background: #EBEBED; }
      .browser { position: absolute; overflow: hidden; border: 1px solid rgba(60,60,65,.18); border-radius: 9px;
        background: white; box-shadow: 0 10px 24px rgba(35,35,40,.13); }
      .browser__chrome { display: flex; align-items: flex-end; height: 32px; padding: 5px 9px 0; gap: 11px;
        background: #e0e0e2; border-bottom: 1px solid #d1d1d3; }
      .traffic { display: flex; align-self: center; gap: 4px; margin-bottom: 4px; }
      .traffic i { width: 7px; height: 7px; border-radius: 50%; background: #ef7773; }
      .traffic i:nth-child(2) { background: #e9bd56; }
      .traffic i:nth-child(3) { background: #75bd80; }
      .tab { display: flex; align-items: center; gap: 6px; height: 26px; padding: 0 10px;
        background: #fafafa; border-radius: 6px 6px 0 0; color: #353538; white-space: nowrap;
        min-width: 0; font: 11px Arial, sans-serif; }
      .tab span { overflow: hidden; text-overflow: ellipsis; }
      .tab img { width: 15px; height: 15px; object-fit: contain; }
      .safari-toolbar { align-items: center; justify-content: space-between; padding: 0 9px; gap: 8px;
        background: #ececee; color: #606064; font: 11px Arial, sans-serif; }
      .safari-toolbar .traffic { flex: 0 0 auto; margin: 0; }
      .safari-nav, .safari-actions { flex: 0 0 auto; white-space: nowrap; color: #89898d; }
      .safari-address { align-items: center; background: rgba(255,255,255,.78); border: 1px solid rgba(80,80,84,.12);
        border-radius: 6px; display: flex; gap: 5px; height: 22px; justify-content: center; min-width: 0; padding: 0 9px; }
      .safari-address img { height: 12px; object-fit: contain; width: 12px; }
      .safari-address span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .browser__page { display: block; width: 100%; height: calc(100% - 32px); object-fit: cover; object-position: left top; }
    </style></head><body>${windows.join("")}</body></html>`);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((image) => image.decode()));
    });
    return await page.screenshot({ type: "png" });
  } finally {
    await context.close();
  }
};

try {
  const favicon = dataURL(await readFile(new URL("public/icons/frame-favicon-48.png", root)));
  const images = [
    ["portfolio-landing-v2.png", await collage("/", favicon)],
    ["about-v2.png", await collage("/about/", favicon)],
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
