/* Rebuild the Velocity E 95% poster pieces as standalone SVGs fitted to the
   exact Figma boxes (geometry.json): doodles from the traced original.svg,
   words outlined from OpenAI Sans Medium at Chrome's glyph positions.
   Output: pieces.json  {name: {w, h, svg}}  (svg = inner markup, viewBox 0 0 w h)
   needs the poster-lab server on :4517 */
const { chromium } = require('../../../../../node_modules/playwright');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const G = JSON.parse(fs.readFileSync(path.join(__dirname, 'geometry.json'), 'utf8'));
const FONT = path.resolve(__dirname, '../../fonts/oai/OpenAISans-Medium-B7nJY_kG.woff2');
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await b.newPage();
  await p.goto('http://localhost:4517/redesign/cx/deck/blank.html');
  // 1. glyph positions for the two words
  const runs = await p.evaluate(async () => {
    await document.fonts.load('500 200px "OpenAI Sans"');
    const NS = 'http://www.w3.org/2000/svg', s = document.createElementNS(NS, 'svg'); document.body.appendChild(s);
    return ['Codex', 'Bookmarks'].map((w) => { const t = document.createElementNS(NS, 'text'); t.setAttribute('x', 0); t.setAttribute('y', 300);
      t.setAttribute('style', 'font: 500 200px "OpenAI Sans"; letter-spacing: -6px'); t.textContent = w; s.appendChild(t);
      const pos = []; for (let i = 0; i < w.length; i++) { const q = t.getStartPositionOfChar(i); pos.push([q.x, q.y]); } return { str: w, pos, size: 200 }; });
  });
  fs.writeFileSync('/tmp/cxjobs.json', JSON.stringify(runs.map((r) => ({ font: FONT, ...r }))));
  execFileSync('python3', [path.resolve(__dirname, '../figma/glyphs.py'), '/tmp/cxjobs.json', '/tmp/cxpaths.json'], { env: { ...process.env, PYTHONPATH: path.resolve(__dirname, '../figma') } });
  const words = JSON.parse(fs.readFileSync('/tmp/cxpaths.json', 'utf8'));
  const orig = fs.readFileSync(path.resolve(__dirname, '../figma/out/original.svg'), 'utf8');
  // 2. fit every source path into its target box
  const out = await p.evaluate(({ G, orig, words }) => {
    const NS = 'http://www.w3.org/2000/svg';
    const doc = new DOMParser().parseFromString(orig, 'image/svg+xml');
    const d = (id) => doc.getElementById(id).getAttribute('d');
    const host = document.createElementNS(NS, 'svg'); document.body.appendChild(host);
    const bbox = (dd) => { const e = document.createElementNS(NS, 'path'); e.setAttribute('d', dd); host.appendChild(e); const r = e.getBBox(); e.remove(); return r; };
    const fit = (dd, [x, y, w, h]) => { const r = bbox(dd), sx = w / r.width, sy = h / r.height; return `matrix(${sx} 0 0 ${sy} ${x - r.x * sx} ${y - r.y * sy})`; };
    const P = (dd, box, attrs) => `<path d="${dd}" transform="${fit(dd, box)}" ${attrs}/>`;
    const res = {};
    const C = G.cloud.kids;
    res.cloud = { w: G.cloud.w, h: G.cloud.h, svg:
      `<defs><linearGradient id="cxCl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e4deff"/><stop offset="1" stop-color="#b9c6ff"/></linearGradient></defs>` +
      P(d('Cloud fill'), C['Cloud fill'], 'fill="url(#cxCl)" fill-rule="evenodd"') + P(d('Cloud outline'), C['Cloud outline'], 'fill="#fff" fill-rule="evenodd"') + P(d('Prompt >_'), C['Prompt >_'], 'fill="#3a43f5" fill-rule="evenodd"') };
    const K = G.bookmark.kids;
    res.bookmark = { w: G.bookmark.w, h: G.bookmark.h, svg: P(d('Bookmark fill'), K['Bookmark fill'], 'fill="#ff6fa8" fill-rule="evenodd"') + P(d('Bookmark outline'), K['Bookmark outline'], 'fill="#fff" fill-rule="evenodd"') };
    // sparkles: split subpaths, assign by position
    const parts = d('Sparkles').split(/(?=M)/).map((s) => s.trim()).filter(Boolean).map((s) => ({ s, r: bbox(s) }));
    const bl = parts.reduce((a, q) => (q.r.x < a.r.x ? q : a)); const rest = parts.filter((q) => q !== bl);
    const tr = rest.reduce((a, q) => (q.r.y < a.r.y ? q : a)); const br = rest.find((q) => q !== tr);
    for (const [k, q] of [['spTR', tr], ['spBL', bl], ['spBR', br]]) res[k] = { w: G[k].w, h: G[k].h, svg: P(q.s, [0, 0, G[k].w, G[k].h], 'fill="#fff" fill-rule="evenodd"') };
    // words: fill + faux-bold round stroke; pad the viewBox by half the stroke
    for (const [k, i] of [['codex', 0], ['marks', 1]]) { const g = G[k], pad = g.sw / 2;
      res[k] = { w: g.w + 2 * pad, h: g.h + 2 * pad, pad, svg: `<path d="${words[i]}" transform="${fit(words[i], [pad, pad, g.w, g.h])}" fill="#f7f8ff" stroke="#f7f8ff" stroke-width="${g.sw}" stroke-linejoin="round" paint-order="stroke"/>` }; }
    return res;
  }, { G, orig, words });
  // trim number precision to keep the page small
  for (const k in out) out[k].svg = out[k].svg.replace(/-?\d+\.\d{3,}/g, (m) => (+m).toFixed(2));
  fs.writeFileSync(path.join(__dirname, 'pieces.json'), JSON.stringify(out));
  for (const k in out) console.log(k, out[k].w.toFixed(1), out[k].h.toFixed(1), (out[k].svg.length / 1024).toFixed(1) + 'KB');
  await b.close();
})();
