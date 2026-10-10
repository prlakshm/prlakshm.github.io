const { chromium } = require('../../node_modules/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const out = process.argv[2] || 'out';
  const g = process.argv[3] || '1';
  for (const v of (process.argv[4]||'A,B,C').split(',')) for (const [s, W, H] of [['li',1584,396],['x',1500,500]]) {
    const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: +(process.env.DPR||1) });
    await p.goto('file://' + path.resolve(process.env.PAGE||'banner.html') + `?v=${v}&size=${s}&guides=${g}`);
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200); await p.waitForTimeout(300);
    await p.screenshot({ path: `${out}-${v}-${s}.png` });
    await p.close();
  }
  await b.close();
})();
