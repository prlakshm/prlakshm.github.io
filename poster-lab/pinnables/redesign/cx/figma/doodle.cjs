/* New hand-drawn marks in the Original's exact wobble, as Figma-ready vectors.
   Each mark is drawn through the same feTurbulence + feDisplacementMap filters
   the Original uses (wob / wob2), rendered alone at 3x and traced (trace.py).
   Filter regions are userSpaceOnUse here: the Original's bbox-relative regions
   clip near-horizontal strokes to nothing (its bookmark detail line never drew).
   usage: node doodle.cjs <name> '<svg fragment>' <fill>   -> out/doodle-<name>.svg
   The fragment is in poster coordinates (1080 x 1350) and may use
   filter="url(#wob)" or filter="url(#wob2)". */
const { chromium } = require('../../../../../node_modules/playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const [name, fragment, fill] = process.argv.slice(2);
const SCALE = 3;
const OUT = path.join(__dirname, 'out');
const region = 'filterUnits="userSpaceOnUse" x="0" y="0" width="1080" height="1350"';
const page = `<!doctype html><html><body style="margin:0;background:none">
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350" style="display:block">
<defs>
 <filter id="wob" ${region}><feTurbulence type="fractalNoise" baseFrequency=".018" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="11"/></filter>
 <filter id="wob2" ${region}><feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="2" seed="9"/><feDisplacementMap in="SourceGraphic" scale="8"/></filter>
</defs>${fragment}</svg></body></html>`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: SCALE });
  await p.setContent(page);
  const png = path.join(OUT, `.doodle-${name}.png`);
  await p.screenshot({ path: png, omitBackground: true });
  await b.close();
  const d = execFileSync('python3', [path.join(__dirname, 'trace.py'), png, String(SCALE)], { maxBuffer: 1 << 26 }).toString().trim();
  fs.rmSync(png);
  if (!d) throw new Error('traced nothing');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350"><path id="${name}" fill="${fill}" fill-rule="evenodd" d="${d}"/></svg>`;
  fs.writeFileSync(path.join(OUT, `doodle-${name}.svg`), svg);
  console.log(`doodle-${name}.svg ${(svg.length / 1024).toFixed(1)} KB`);
})();
