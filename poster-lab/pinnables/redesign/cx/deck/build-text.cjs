/* Outline display copy in OpenAI Sans (git-ignored local font) into SVG paths,
   so the public deck ships shapes, not the font file. Chrome measures glyph
   positions (kerning included); glyphs.py draws the outlines.
   usage: node build-text.cjs <out.svg> <size> <tracking em> <weight 400|500> "line 1" "line 2" ...
   env LH = line height in em (default 1.18) */
const { chromium } = require('../../../../../node_modules/playwright');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const [out, size, track, weight, ...lines] = process.argv.slice(2);
const FONT = path.resolve(__dirname, '../../fonts/oai/' + (weight === '500' ? 'OpenAISans-Medium-B7nJY_kG.woff2' : 'OpenAISans-Regular-DFZxHTKM.woff2'));
(async () => {
  const b = await chromium.launch({ channel: 'chrome' }); const p = await b.newPage();
  await p.goto('http://localhost:4517/redesign/cx/deck/blank.html');
  const LH = +(process.env.LH || 1.18);
  const r = await p.evaluate(async ({ lines, size, track, weight, LH }) => {
    document.head.insertAdjacentHTML('beforeend', '<style>@font-face{font-family:"OAI R";font-weight:400;src:url(../../fonts/oai/OpenAISans-Regular-DFZxHTKM.woff2)}</style>');
    const fam = weight === '500' ? 'OpenAI Sans' : 'OAI R';
    await document.fonts.load(`${weight} ${size}px "${fam}"`);
    const NS = 'http://www.w3.org/2000/svg', s = document.createElementNS(NS, 'svg'); document.body.appendChild(s);
    const lh = size * LH, runs = []; let maxW = 0;
    lines.forEach((ln, k) => { const t = document.createElementNS(NS, 'text'); t.setAttribute('x', 0); t.setAttribute('y', size + k * lh);
      t.setAttribute('style', `font: ${weight} ${size}px "${fam}"; letter-spacing: ${track}em`); t.textContent = ln; s.appendChild(t);
      const pos = []; for (let i = 0; i < ln.length; i++) { const q = t.getStartPositionOfChar(i); pos.push([q.x, q.y]); }
      maxW = Math.max(maxW, t.getComputedTextLength()); runs.push({ str: ln, pos, size, w: t.getComputedTextLength() }); });
    return { runs, H: size * 1.25 + (lines.length - 1) * lh, W: maxW };
  }, { lines, size: +size, track: +track, weight, LH });
  // centre each line
  for (const run of r.runs) { const dx = (r.W - run.w) / 2; run.pos = run.pos.map(([x, y]) => [x + dx, y]); }
  fs.writeFileSync('/tmp/cxt.json', JSON.stringify(r.runs.map((q) => ({ font: FONT, str: q.str, pos: q.pos, size: q.size }))));
  execFileSync('python3', [path.resolve(__dirname, '../figma/glyphs.py'), '/tmp/cxt.json', '/tmp/cxt-out.json'], { env: { ...process.env, PYTHONPATH: path.resolve(__dirname, '../figma') } });
  const ds = JSON.parse(fs.readFileSync('/tmp/cxt-out.json', 'utf8'));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.ceil(r.W)} ${Math.ceil(r.H)}" fill="currentColor"><path d="${ds.join(' ').replace(/-?\d+\.\d{2,}/g, (m) => (+m).toFixed(1))}"/></svg>`;
  fs.writeFileSync(out, svg); console.log(out, Math.ceil(r.W), 'x', Math.ceil(r.H), (svg.length / 1024).toFixed(1) + 'KB');
  await b.close();
})();
