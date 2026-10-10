const { chromium } = require('../../node_modules/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const [out, g, dpr] = [process.argv[2], process.argv[3] || '0', +(process.argv[4] || 1)];
  for (const img of (process.env.IMGS||'plain,gold').split(',')) for (const v of (process.env.VS||'row,step,face').split(',')) {
    const p = await b.newPage({ viewport: { width: 1500, height: 500 }, deviceScaleFactor: dpr });
    await p.goto('file://' + path.resolve('sky.html') + `?img=${img}&v=${v}&guides=${g}`);
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${out}-${img}-${v}.png` });
    await p.close();
  }
  await b.close();
})();
