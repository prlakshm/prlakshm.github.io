/* The original (shipped) Codex poster as Figma-ready SVG.
   Its doodles get their hand-drawn wobble from feTurbulence + feDisplacementMap,
   which Figma can't do, so each doodle layer is rendered alone at 3x and traced
   (trace.py) into a vector with the wobble baked in. The type is outlined from
   the real Tiempos / Söhne Mono files at Chrome's own glyph positions, and the
   grain tile is exported as a PNG for a tiled overlay fill.
   usage: node trace-original.cjs   (needs the poster-lab server on :4517) */
const { chromium } = require('../../../../../node_modules/playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const OUT = path.join(__dirname, 'out');
const TMP = path.join(OUT, '.trace');
const SCALE = 3;
const FONTS = {
  'Tiempos Headline': path.resolve(__dirname, '../../fonts/k/test-tiempos-headline-regular.woff2'),
  'Söhne Mono': path.resolve(__dirname, '../../fonts/k/test-soehne-mono-buch.woff2'),
};
// name, fill, and how to find it inside svg.art. (The bookmark's short white
// detail stroke is left out: it is perfectly horizontal, so its filter region has
// zero height and Chrome never painted it on the shipped poster either.)
const LAYERS = [
  ['Cloud fill', 'url(#cl)', (a) => a.querySelector('#cloud').children[0]],
  ['Cloud outline', '#fff', (a) => a.querySelector('#cloud').children[1]],
  ['Prompt >_', '#3A43F5', (a) => a.querySelector('#cloud').children[2]],
  ['Bookmark fill', '#FF6FA8', (a) => [...a.children].filter((n) => n.tagName === 'g' && n.id !== 'cloud')[0].children[0]],
  ['Bookmark outline', '#fff', (a) => [...a.children].filter((n) => n.tagName === 'g' && n.id !== 'cloud')[0].children[1]],
  ['Sparkles', '#fff', (a) => [...a.children].filter((n) => n.tagName === 'g' && n.id !== 'cloud')[1]],
];

(async () => {
  fs.mkdirSync(TMP, { recursive: true });
  const b = await chromium.launch({ channel: 'chrome' });
  const url = 'http://localhost:4517/redesign/cx/original-src.html';

  // 1. text: per-glyph pen positions + the baseline of each line
  const p1 = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  await p1.goto(url);
  await p1.evaluate(async () => { await document.fonts.ready; for (const f of document.fonts) await f.load(); });
  const runs = await p1.evaluate(() => {
    const out = [];
    const probe = () => { const s = document.createElement('span'); s.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline'; return s; };
    const measure = (textNode, name, color) => {
      const pr = probe(); textNode.parentNode.insertBefore(pr, textNode);
      const base = pr.getBoundingClientRect().top;
      const cs = getComputedStyle(textNode.parentNode), r = document.createRange(), pos = [];
      for (let i = 0; i < textNode.length; i++) { r.setStart(textNode, i); r.setEnd(textNode, i + 1); pos.push([r.getBoundingClientRect().left, base]); }
      out.push({ name, str: cs.textTransform === 'uppercase' ? textNode.data.toUpperCase() : textNode.data, pos, size: parseFloat(cs.fontSize), family: cs.fontFamily.replace(/["']/g, '').split(',')[0].trim(), color });
    };
    const [a, c] = document.querySelectorAll('.top span');
    measure(a.firstChild, 'Label · Product concept');
    measure(c.firstChild, 'Label · Codex · 2026');
    const h = document.querySelector('h1'), lines = [...h.childNodes].filter((n) => n.nodeType === 3);
    lines.forEach((t) => measure(t, `Title · ${t.data}`));
    return out;
  });
  // Söhne Mono (trial) has no '·'; Chrome drew it from Times-Roman, so we do too.
  const FALLBACK = { path: '/System/Library/Fonts/Times.ttc', ps: 'Times-Roman' };
  fs.writeFileSync(path.join(TMP, 'jobs.json'), JSON.stringify(runs.map((r) => ({ font: FONTS[r.family], str: r.str, pos: r.pos, size: r.size, fallback: FALLBACK }))));
  execFileSync('python3', [path.join(__dirname, 'glyphs.py'), path.join(TMP, 'jobs.json'), path.join(TMP, 'paths.json')], { env: { ...process.env, PYTHONPATH: __dirname } });
  const textD = JSON.parse(fs.readFileSync(path.join(TMP, 'paths.json'), 'utf8'));

  // 2. doodles: each layer alone, transparent, 3x, then traced
  const p3 = await b.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: SCALE });
  await p3.goto(url);
  await p3.evaluate(async () => { await document.fonts.ready; });
  await p3.addStyleTag({ content: 'html,body{background:none!important}body::after{display:none!important}.top,h1{visibility:hidden}' });
  const traced = [];
  for (let i = 0; i < LAYERS.length; i++) {
    const [name, fill] = LAYERS[i];
    await p3.evaluate(({ i, src }) => {
      const a = document.querySelector('svg.art'), pick = eval(src);
      a.querySelectorAll('*').forEach((n) => { if (n.tagName !== 'filter' && !n.closest('defs')) n.style.visibility = 'hidden'; });
      const t = pick(a); t.style.visibility = 'visible'; t.querySelectorAll('*').forEach((n) => (n.style.visibility = 'visible'));
    }, { i, src: LAYERS[i][2].toString() });
    const png = path.join(TMP, `layer-${i}.png`);
    await p3.screenshot({ path: png, omitBackground: true });
    const d = execFileSync('python3', [path.join(__dirname, 'trace.py'), png, String(SCALE)], { maxBuffer: 1 << 26 }).toString().trim();
    traced.push({ name, fill, d });
    console.log(`${name}: ${(d.length / 1024).toFixed(1)} KB`);
  }

  // 3. the grain tile, exactly as the page draws it (alpha noise, 180 px)
  const noiseSvg = 'data:image/svg+xml,' + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.95' numOctaves='2' stitchTiles='stitch'/></filter><rect width='180' height='180' filter='url(#n)'/></svg>");
  const p4 = await b.newPage({ viewport: { width: 180, height: 180 } });
  await p4.setContent(`<html><body style="margin:0;background:none"><img src="${noiseSvg}" width="180" height="180"></body></html>`);
  await p4.waitForTimeout(200);
  await p4.screenshot({ path: path.join(OUT, 'original-grain.png'), omitBackground: true });
  await b.close();

  // 4. compose: same stacking as the page (labels, doodles, title, grain on top)
  const lab = runs.map((r, k) => ({ ...r, d: textD[k] }));
  const art = (n) => traced.find((t) => t.name === n);
  const P = (t) => `<path id="${t.name}" fill="${t.fill}" fill-rule="evenodd" d="${t.d}"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
<defs>
 <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ABA8FF"/><stop offset=".38" stop-color="#8C9DFF"/><stop offset=".72" stop-color="#5E74FF"/><stop offset="1" stop-color="#3A43F5"/></linearGradient>
 <linearGradient id="cl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E4DEFF"/><stop offset="1" stop-color="#B9C6FF"/></linearGradient>
</defs>
<rect id="Background" width="1080" height="1350" fill="url(#bg)"/>
<g id="Labels">${lab.filter((r) => r.name.startsWith('Label')).map((r) => `<path id="${r.name}" fill="#fff" fill-opacity=".82" d="${r.d}"/>`).join('')}</g>
<g id="Doodles">
 <g id="Codex cloud">${P(art('Cloud fill'))}${P(art('Cloud outline'))}${P(art('Prompt >_'))}</g>
 <g id="Bookmark">${P(art('Bookmark fill'))}${P(art('Bookmark outline'))}</g>
 ${P(art('Sparkles'))}
</g>
<g id="Title">${lab.filter((r) => r.name.startsWith('Title')).map((r) => `<path id="${r.name}" fill="#fff" d="${r.d}"/>`).join('')}</g>
<rect id="Grain" width="1080" height="1350" fill="#808080"/>
</svg>`;
  fs.writeFileSync(path.join(OUT, 'original.svg'), svg);
  fs.rmSync(TMP, { recursive: true });
  console.log(`original.svg ${(svg.length / 1024).toFixed(1)} KB`);
})();
