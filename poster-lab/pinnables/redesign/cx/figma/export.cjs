/* Export the lab posters as Figma-ready SVG plus an effects manifest.
   Figma's SVG importer keeps ids as layer names, gradients, dashes and group
   transforms, but drops filters, patterns and live text. So, per poster:
   - every <text> becomes its exact glyph outlines (positions measured here,
     shapes drawn by glyphs.py from the real font file);
   - <pattern> fills are expanded into real stripes;
   - each SVG filter is translated into a native-effect spec (fx.json) that
     the Figma side applies after import: puffy = two inner shadows,
     sticker = union silhouette with an outside white stroke + drop shadow,
     plus plain drop shadows and layer blurs.
   usage: node export.cjs [poster ...]   (needs the poster-lab server on :4517) */
const { chromium } = require('../../../../../node_modules/playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const OUT = path.join(__dirname, 'out');
const FONTS = {
  'OpenAI Sans': path.resolve(__dirname, '../../fonts/oai/OpenAISans-Medium-B7nJY_kG.woff2'),
  'Tiempos Headline': path.resolve(__dirname, '../../fonts/k/test-tiempos-headline-regular.woff2'),
  'Söhne Mono': path.resolve(__dirname, '../../fonts/k/test-soehne-mono-buch.woff2'),
};
const POSTERS = { 'c-flag': 'Codex · Flag', 'e-peek': 'Codex · Peekaboo', 'b-tabs': 'Codex · Tabs', 'd-icon': 'Codex · App icon', 'original': 'Codex · Original' };

function outline(jobs) {
  const tmp = path.join(OUT, '.jobs.json'), res = path.join(OUT, '.paths.json');
  fs.writeFileSync(tmp, JSON.stringify(jobs));
  execFileSync('python3', [path.join(__dirname, 'glyphs.py'), tmp, res], { env: { ...process.env, PYTHONPATH: __dirname }, stdio: 'inherit' });
  const out = JSON.parse(fs.readFileSync(res, 'utf8'));
  fs.rmSync(tmp); fs.rmSync(res);
  return out;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const only = process.argv.slice(2);
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  for (const [file, title] of Object.entries(POSTERS)) {
    if (only.length && !only.includes(file)) continue;
    await p.goto(`http://localhost:4517/redesign/cx/${file}.html`);
    await p.evaluate(async () => { await document.fonts.ready; for (const f of document.fonts) await f.load(); });

    // Filter sizes are in each element's own user space; Figma flattens group
    // scaling into geometry, so record the real scale and size effects by it.
    await p.evaluate(() => document.querySelectorAll('#p [filter]').forEach((el) => {
      const m = el.getCTM(); el.setAttribute('data-s', Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)).toFixed(4));
    }));
    const jobs = await p.evaluate(() => [...document.querySelectorAll('#p text')].map((t, k) => {
      t.setAttribute('data-k', k);
      const pos = [];
      for (let i = 0; i < t.getNumberOfChars(); i++) { const q = t.getStartPositionOfChar(i); pos.push([q.x, q.y]); }
      const cs = getComputedStyle(t);
      const str = cs.textTransform === 'uppercase' ? t.textContent.toUpperCase() : t.textContent;
      return { str, pos, size: parseFloat(cs.fontSize), family: cs.fontFamily.replace(/["']/g, '').split(',')[0].trim() };
    }));
    for (const j of jobs) if (!FONTS[j.family]) throw new Error(`no font file for ${j.family}`);
    const ds = jobs.length ? outline(jobs.map((j) => ({ font: FONTS[j.family], str: j.str, pos: j.pos, size: j.size }))) : [];

    const { svg, fx } = await p.evaluate((ds) => {
      const NS = 'http://www.w3.org/2000/svg', W = 1080, H = 1350;
      const svg = document.getElementById('p').cloneNode(true);
      const mk = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const [a, v] of Object.entries(attrs)) if (v != null) n.setAttribute(a, v); return n; };

      // text -> outlined glyph paths (same fill, faux-bold stroke, transform)
      svg.querySelectorAll('text').forEach((t) => {
        const pth = mk('path', { d: ds[+t.getAttribute('data-k')] });
        for (const a of ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-linejoin', 'transform', 'opacity', 'data-name']) if (t.hasAttribute(a)) pth.setAttribute(a, t.getAttribute(a));
        t.replaceWith(pth);
      });

      // pattern fills -> real stripes (gingham is bands of the tile's rects)
      svg.querySelectorAll('[fill^="url(#"]').forEach((el) => {
        const pat = svg.querySelector(`pattern[id="${el.getAttribute('fill').slice(5, -1)}"]`);
        if (!pat) return;
        const tw = +pat.getAttribute('width'), th = +pat.getAttribute('height');
        const g = mk('g', { 'data-name': el.getAttribute('data-name') || 'Pattern' });
        const vert = mk('g', { 'data-name': 'Vertical stripes' }), horiz = mk('g', { 'data-name': 'Horizontal stripes' });
        for (const r of pat.querySelectorAll('rect')) {
          const x = +(r.getAttribute('x') || 0), y = +(r.getAttribute('y') || 0), w = +r.getAttribute('width'), h = +r.getAttribute('height');
          const base = { fill: r.getAttribute('fill'), opacity: r.getAttribute('opacity') };
          if (w >= tw && h >= th) g.appendChild(mk('rect', { ...base, x: 0, y: 0, width: W, height: H, 'data-name': 'Base' }));
          else if (h >= th) for (let X = x; X < W; X += tw) vert.appendChild(mk('rect', { ...base, x: X, y: 0, width: w, height: H }));
          else if (w >= tw) for (let Y = y; Y < H; Y += th) horiz.appendChild(mk('rect', { ...base, x: 0, y: Y, width: W, height: h }));
        }
        if (vert.childNodes.length) g.appendChild(vert);
        if (horiz.childNodes.length) g.appendChild(horiz);
        el.replaceWith(g);
      });

      // filters -> effect specs
      const specs = [];
      svg.querySelectorAll('[filter]').forEach((el) => {
        const f = svg.querySelector(`filter[id="${el.getAttribute('filter').slice(5, -1)}"]`);
        el.removeAttribute('filter');
        if (!f) return;
        const pr = [...f.children], tag = (n) => n.tagName, num = (n, a) => parseFloat(n.getAttribute(a) || 0);
        const flood = (n) => ({ color: n.getAttribute('flood-color'), op: parseFloat(n.getAttribute('flood-opacity') || 1) });
        const blurs = pr.filter((n) => tag(n) === 'feGaussianBlur'), offs = pr.filter((n) => tag(n) === 'feOffset'), floods = pr.filter((n) => tag(n) === 'feFlood');
        let s = null;
        if (pr.length === 1 && tag(pr[0]) === 'feGaussianBlur') s = { kind: 'blur', radius: 2 * num(pr[0], 'stdDeviation') };
        else if (pr.length === 1 && tag(pr[0]) === 'feDropShadow') s = { kind: 'drop', dx: num(pr[0], 'dx'), dy: num(pr[0], 'dy'), radius: 2 * num(pr[0], 'stdDeviation'), color: pr[0].getAttribute('flood-color'), op: parseFloat(pr[0].getAttribute('flood-opacity') || 1) };
        else if (tag(pr[0]) === 'feComponentTransfer') s = { kind: 'puffy', inner: [0, 1].map((i) => ({ dy: num(offs[i], 'dy'), radius: 2 * num(blurs[i], 'stdDeviation'), ...flood(floods[i]) })) };
        else if (tag(pr[0]) === 'feGaussianBlur' && pr[0].getAttribute('in') === 'SourceAlpha') s = { kind: 'sticker', r: +(num(blurs[0], 'stdDeviation') * 1.645).toFixed(1), color: floods[0].getAttribute('flood-color'), shadow: { dy: num(offs[0], 'dy'), radius: 2 * num(blurs[1], 'stdDeviation'), ...flood(floods[1]) } };
        if (!s) return;
        const k = parseFloat(el.getAttribute('data-s') || 1), sc = (o) => { for (const key of ['radius', 'dx', 'dy', 'r']) if (key in o) o[key] = +(o[key] * k).toFixed(2); };
        sc(s); if (s.inner) s.inner.forEach(sc); if (s.shadow) sc(s.shadow);
        if (!el.getAttribute('data-name')) { const pn = el.parentNode.getAttribute && el.parentNode.getAttribute('data-name'); el.setAttribute('data-name', pn ? `${pn} · shape` : 'Shape'); }
        specs.push([el, s]);
      });

      // unique ids from data-name (Figma shows ids as layer names)
      const seen = {};
      svg.querySelectorAll('[data-name]').forEach((el) => {
        const n = el.getAttribute('data-name'); seen[n] = (seen[n] || 0) + 1;
        el.setAttribute('id', seen[n] > 1 ? `${n} ${seen[n]}` : n); el.removeAttribute('data-name');
      });
      const fx = specs.map(([el, s]) => ({ id: el.getAttribute('id'), ...s }));

      svg.querySelectorAll('filter, pattern').forEach((n) => n.remove());
      svg.querySelectorAll('[data-k],[data-s],[paint-order]').forEach((n) => { n.removeAttribute('data-k'); n.removeAttribute('data-s'); n.removeAttribute('paint-order'); });
      svg.removeAttribute('id'); svg.removeAttribute('style');
      svg.setAttribute('xmlns', NS); svg.setAttribute('width', W); svg.setAttribute('height', H);
      return { svg: new XMLSerializer().serializeToString(svg), fx };
    }, ds);

    fs.writeFileSync(path.join(OUT, `${file}.svg`), svg);
    fs.writeFileSync(path.join(OUT, `${file}.fx.json`), JSON.stringify(fx));
    console.log(`${title}: ${(svg.length / 1024).toFixed(1)} KB svg, ${fx.length} effects`);
  }
  await b.close();
})();
