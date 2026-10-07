import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

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

const capture = async ({ url, width, height, selector, wait = 1200 }) => {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  try {
    const page = await context.newPage();
    const response = await page.goto(`${BASE}${url}`, { waitUntil: "networkidle", timeout: 30000 });
    if (!response?.ok()) throw new Error(`Capture failed: ${url} (${response?.status()})`);
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
  const sizes = [
    { name: "large", width: 1280, height: 680 },
    { name: "medium", width: 820, height: 440 },
    { name: "small", width: 1024, height: 450 },
    { name: "phone", width: 390, height: 520 },
  ];
  const windows = [];
  for (const size of sizes) {
    const image = await capture({ url, ...size, selector: "#root > *" });
    windows.push(`<div class="browser browser--${size.name}">
      <div class="browser__chrome">
        <span class="traffic"><i></i><i></i><i></i></span>
        <div class="tab"><img src="${favicon}" alt="" /><span>Pranavi Ram | Product Designer</span></div>
      </div>
      <img class="browser__page" src="${dataURL(image)}" alt="" />
    </div>`);
  }
  const context = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  try {
    const page = await context.newPage();
    await page.setContent(`<!doctype html><html><head><style>
      * { box-sizing: border-box; }
      html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #EBEBED; }
      .browser { position: absolute; overflow: hidden; border: 1px solid rgba(60,60,65,.18); border-radius: 9px;
        background: white; box-shadow: 0 22px 50px rgba(35,35,40,.18); }
      .browser--large { left: 40px; top: 38px; width: 746px; }
      .browser--medium { left: 754px; top: 76px; width: 402px; }
      .browser--small { left: 424px; top: 366px; width: 462px; }
      .browser--phone { left: 919px; top: 250px; width: 237px; }
      .browser__chrome { display: flex; align-items: flex-end; height: 32px; padding: 5px 9px 0; gap: 11px;
        background: #e0e0e2; border-bottom: 1px solid #d1d1d3; }
      .traffic { display: flex; align-self: center; gap: 4px; margin-bottom: 4px; }
      .traffic i { width: 7px; height: 7px; border-radius: 50%; background: #ef7773; }
      .traffic i:nth-child(2) { background: #e9bd56; }
      .traffic i:nth-child(3) { background: #75bd80; }
      .tab { display: flex; align-items: center; gap: 6px; height: 26px; padding: 0 10px;
        background: #fafafa; border-radius: 6px 6px 0 0; color: #353538; white-space: nowrap;
        font: 11px Arial, sans-serif; }
      .tab img { width: 15px; height: 15px; object-fit: contain; }
      .browser--phone .browser__chrome { gap: 5px; padding-left: 6px; padding-right: 5px; }
      .browser--phone .traffic { gap: 3px; }
      .browser--phone .traffic i { width: 5px; height: 5px; }
      .browser--phone .tab { font-size: 9px; padding: 0 5px; gap: 4px; }
      .browser--phone .tab img { width: 13px; height: 13px; }
      .browser__page { display: block; width: 100%; height: auto; }
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
    ["portfolio-landing-v1.png", await collage("/", favicon)],
    ["about-v1.png", await collage("/about/", favicon)],
    ["cursor-loves-indie-v1.png", await capture({ url: "/cursor/wordmark.html", width: 1200, height: 630, selector: "#wordmark .wordmark", wait: 1800 })],
    ["figma-sound-v1.png", await capture({ url: "/branding/sound-orbit.html", width: 1200, height: 630, selector: "#stage", wait: 3500 })],
    ["codex-bookmarks-v1.png", await capture({ url: "/codex/", width: 1200, height: 630, selector: ".hx-poster", wait: 3500 })],
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
