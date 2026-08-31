/* ─────────────────────────────────────────────────────────────────────────
   MIXR POSTER KIT
   Shared mixed-media toolkit for the three Mixr case-study posters.
   Everything here is print-shop physics: photocopiers, torn stock, tape,
   spot-colour plates that miss their register, marker on paper.

   Palette is the real app palette (Mixr/DesignSystem/MixrColors.swift) plus
   the paper/press neutrals the posters are printed on.
   ───────────────────────────────────────────────────────────────────────── */
const MK = (() => {
const W = 1600, H = 2000;

// ── the app ───────────────────────────────────────────────────────────────
const C = {
  black:     '#050816',   // background
  navy:      '#080B16',   // backgroundSecondary
  surface:   '#111827',   // surface
  elevated:  '#171E2E',   // elevatedSurface
  divider:   '#2A3142',   // divider
  white:     '#FFFFFF',
  gray:      '#9CA3AF',   // textSecondary
  purple:    '#7231DD',   // primaryPurple
  purpleLt:  '#9873EB',
  purpleDk:  '#4C1FA3',
  pink:      '#FF5FA2',   // waveformPink
  blue:      '#0EA5E9',   // waveformBlue
  red:       '#EF4444',   // waveformRed
  yellow:    '#EAB308',   // waveformYellow
  lavender:  '#C9B9F4',   // sfxMenuLavender
  // ── the press ───────────────────────────────────────────────────────────
  paper:     '#EDE9E0',   // photocopy stock
  paperDk:   '#DFD9CC',
  concrete:  '#C9C5BC',
  toner:     '#14131A',   // faded copier black
  tonerLt:   '#3A3742',
};

// ── deterministic randomness ──────────────────────────────────────────────
let seed = 1;
const srnd = s => { seed = s >>> 0; };
const rnd  = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const rr   = (a, b) => a + rnd() * (b - a);
const pick = arr => arr[(rnd() * arr.length) | 0];

const load = src => new Promise((res, rej) => {
  const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src;
});

// ── offscreen ─────────────────────────────────────────────────────────────
function offc(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return { canvas: c, ctx: c.getContext('2d', { willReadFrequently: true }) };
}

function rrect(x, X, Y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  x.beginPath();
  x.moveTo(X + r, Y);
  x.arcTo(X + w, Y, X + w, Y + h, r);
  x.arcTo(X + w, Y + h, X, Y + h, r);
  x.arcTo(X, Y + h, X, Y, r);
  x.arcTo(X, Y, X + w, Y, r);
  x.closePath();
}

/* ═════════════════════════ PAPER & TEXTURE ══════════════════════════════ */

function noiseCanvas(size, alpha) {
  const g = offc(size, size);
  const id = g.ctx.createImageData(size, size);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = Math.random() * 255 | 0;
    id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
    id.data[i + 3] = alpha;
  }
  g.ctx.putImageData(id, 0, 0);
  return g.canvas;
}

// paper grain over the whole sheet
function grain(x, alpha = 0.5, size = 220, a = 26, mode = 'multiply') {
  x.save();
  x.globalAlpha = alpha; x.globalCompositeOperation = mode;
  x.fillStyle = x.createPattern(noiseCanvas(size, a), 'repeat');
  x.fillRect(0, 0, W, H);
  x.restore();
}

// fibrous stock: long soft fibres + speckle, drawn in ink not noise
function fibre(x, X, Y, w, h, color, n = 260, alpha = 0.06) {
  x.save(); x.globalAlpha = alpha; x.strokeStyle = color; x.lineWidth = 1;
  for (let i = 0; i < n; i++) {
    const px = X + rnd() * w, py = Y + rnd() * h, a = rnd() * Math.PI, L = 6 + rnd() * 34;
    x.beginPath(); x.moveTo(px, py);
    x.lineTo(px + Math.cos(a) * L, py + Math.sin(a) * L); x.stroke();
  }
  x.restore();
}

// scanner / copier drum streaks — vertical bands of lift and dropout
function scanStreaks(x, X, Y, w, h, n = 14, strength = 0.10) {
  x.save();
  x.beginPath(); x.rect(X, Y, w, h); x.clip();
  for (let i = 0; i < n; i++) {
    const px = X + rnd() * w, sw = 1 + rnd() * 9, up = rnd() > 0.45;
    x.globalCompositeOperation = up ? 'lighter' : 'multiply';
    x.globalAlpha = strength * (0.3 + rnd() * 0.9);
    x.fillStyle = up ? 'rgba(255,255,255,1)' : 'rgba(20,19,26,1)';
    x.fillRect(px, Y, sw, h);
  }
  x.restore();
}

// toner dropout: the pale ghost band a tired copier leaves
function tonerBand(x, X, Y, w, h, alpha = 0.16) {
  const g = x.createLinearGradient(X, Y, X, Y + h);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.5, `rgba(255,255,255,${alpha})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.save(); x.fillStyle = g; x.fillRect(X, Y, w, h); x.restore();
}

/* ═══════════════════════ IMAGE REPRODUCTION ═════════════════════════════ */

/* Photocopy an image region: desaturate, crush the levels, optionally
   invert (Mixr's UI is near-black, so inverting is what turns a screenshot
   into something that reads as a printed page). Returns a canvas. */
function xerox(img, sx, sy, sw, sh, tw, th, o = {}) {
  const { contrast = 1.55, bright = 0.04, gamma = 1, invert = false,
          dust = 0.0004, blowout = 0 } = o;
  const g = offc(tw, th);
  g.ctx.drawImage(img, sx, sy, sw, sh, 0, 0, tw, th);
  const id = g.ctx.getImageData(0, 0, tw, th), d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    let l = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) / 255;
    if (invert) l = 1 - l;
    l = Math.pow(l, gamma);
    l = (l - 0.5) * contrast + 0.5 + bright;
    if (blowout) l = l > 1 - blowout ? 1 : l;
    l = l < 0 ? 0 : l > 1 ? 1 : l;
    const v = l * 255;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  g.ctx.putImageData(id, 0, 0);
  // toner dust — white pinholes and black flecks
  const n = tw * th * dust;
  for (let i = 0; i < n; i++) {
    g.ctx.fillStyle = rnd() > 0.4 ? '#fff' : '#000';
    g.ctx.globalAlpha = 0.3 + rnd() * 0.6;
    g.ctx.fillRect(rnd() * tw, rnd() * th, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  g.ctx.globalAlpha = 1;
  return g.canvas;
}

/* A dot screen of a source canvas. Returns a transparent canvas of dots in
   `color` whose radius tracks the source darkness. This is the halftone —
   the thing that makes a screenshot read as ink rather than pixels. */
function halftone(src, cell = 6, color = '#14131A', o = {}) {
  const { angle = Math.PI / 4, minR = 0.18, maxR = 0.72, invert = false } = o;
  const w = src.width, h = src.height;
  const sd = src.getContext('2d').getImageData(0, 0, w, h).data;
  const g = offc(w, h);
  g.ctx.fillStyle = color;
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const diag = Math.hypot(w, h);
  for (let v = -diag; v < diag; v += cell) {
    for (let u = -diag; u < diag; u += cell) {
      const px = w / 2 + u * ca - v * sa, py = h / 2 + u * sa + v * ca;
      if (px < 0 || py < 0 || px >= w || py >= h) continue;
      const i = ((py | 0) * w + (px | 0)) * 4;
      let l = (sd[i] * 0.299 + sd[i + 1] * 0.587 + sd[i + 2] * 0.114) / 255;
      if (invert) l = 1 - l;
      const dark = 1 - l;
      const r = cell * (minR + (maxR - minR) * dark) * dark;
      if (r < 0.3) continue;
      g.ctx.beginPath(); g.ctx.arc(px, py, r, 0, 7); g.ctx.fill();
    }
  }
  return g.canvas;
}

// flat dot field, no source — a screen tint for backgrounds
function dotField(x, X, Y, w, h, cell, r, color, alpha = 1) {
  x.save(); x.globalAlpha = alpha; x.fillStyle = color;
  x.beginPath(); x.rect(X, Y, w, h); x.clip();
  for (let py = Y; py < Y + h; py += cell)
    for (let px = X; px < X + w; px += cell) {
      x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
    }
  x.restore();
}

// isolate one ink from a source and paint it flat — the spot-colour plate
function spotPlate(src, hueTest, color) {
  const w = src.width, h = src.height;
  const sd = src.getContext('2d').getImageData(0, 0, w, h).data;
  const g = offc(w, h);
  const id = g.ctx.createImageData(w, h), od = id.data;
  const [cr, cg, cb] = hexRGB(color);
  for (let i = 0; i < sd.length; i += 4) {
    if (hueTest(sd[i], sd[i + 1], sd[i + 2])) {
      od[i] = cr; od[i + 1] = cg; od[i + 2] = cb; od[i + 3] = 255;
    }
  }
  g.ctx.putImageData(id, 0, 0);
  return g.canvas;
}

function hexRGB(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
const rgba = (hex, a) => { const [r, g, b] = hexRGB(hex); return `rgba(${r},${g},${b},${a})`; };

/* ═══════════════════════════ TORN PAPER ═════════════════════════════════ */

/* A ragged rectangle path. `edges` says which sides are torn (the others are
   guillotine-clean, which is how a real cut-up looks — you tear two sides and
   trim the rest). */
function tornPath(x, X, Y, w, h, edges = 'trbl', rough = 11, step = 15) {
  const t = edges.includes('t'), r = edges.includes('r'),
        b = edges.includes('b'), l = edges.includes('l');
  const j = amt => (rnd() - 0.5) * amt;
  x.beginPath();
  x.moveTo(X, Y);
  for (let p = X; p <= X + w; p += step) x.lineTo(p, Y + (t ? j(rough) : 0));
  x.lineTo(X + w, Y);
  for (let p = Y; p <= Y + h; p += step) x.lineTo(X + w + (r ? j(rough) : 0), p);
  x.lineTo(X + w, Y + h);
  for (let p = X + w; p >= X; p -= step) x.lineTo(p, Y + h + (b ? j(rough) : 0));
  x.lineTo(X, Y + h);
  for (let p = Y + h; p >= Y; p -= step) x.lineTo(X + (l ? j(rough) : 0), p);
  x.closePath();
}

/* Paste a canvas/image onto the sheet as a torn scrap: drop shadow so it sits
   ON the collage, torn clip, then a white fibre lip along the torn edges. */
function pasteTorn(x, src, X, Y, w, h, rot = 0, o = {}) {
  const { edges = 'trbl', rough = 11, step = 15, lip = '#F6F3EC',
          shadow = 0.34, sdx = 5, sdy = 8, sblur = 14, lipW = 3,
          sx = 0, sy = 0, sw = src.width, sh = src.height, alpha = 1 } = o;
  const cx = X + w / 2, cy = Y + h / 2;
  x.save();
  x.translate(cx, cy); x.rotate(rot); x.translate(-cx, -cy);
  x.globalAlpha = alpha;

  const s0 = seed;                       // same tear for shadow, art and lip
  if (shadow > 0) {
    seed = s0;
    x.save();
    x.fillStyle = `rgba(0,0,0,${shadow})`;
    x.shadowColor = `rgba(0,0,0,${shadow})`; x.shadowBlur = sblur;
    x.shadowOffsetX = sdx; x.shadowOffsetY = sdy;
    tornPath(x, X, Y, w, h, edges, rough, step); x.fill();
    x.restore();
  }
  seed = s0;
  x.save();
  tornPath(x, X, Y, w, h, edges, rough, step); x.clip();
  x.drawImage(src, sx, sy, sw, sh, X, Y, w, h);
  x.restore();

  if (lipW > 0) {
    seed = s0;
    x.save();
    tornPath(x, X, Y, w, h, edges, rough, step);
    x.clip();                             // lip lives inside the scrap
    seed = s0;
    tornPath(x, X, Y, w, h, edges, rough, step);
    x.strokeStyle = lip; x.lineWidth = lipW; x.globalAlpha = 0.85 * alpha; x.stroke();
    x.restore();
  }
  x.restore();
  seed = s0;
  rnd();                                   // advance so the next scrap differs
}

// a torn band of flat colour across the sheet
function tornBand(x, y0, h, color, rough = 13, lip = null) {
  x.save(); x.fillStyle = color; x.beginPath();
  x.moveTo(-10, y0);
  for (let t = -10; t <= W + 10; t += 16) x.lineTo(t, y0 + (rnd() - 0.5) * rough);
  x.lineTo(W + 10, y0 + h);
  for (let t = W + 10; t >= -10; t -= 16) x.lineTo(t, y0 + h + (rnd() - 0.5) * rough);
  x.closePath(); x.fill();
  if (lip) {
    x.globalAlpha = 0.5; x.strokeStyle = lip; x.lineWidth = 1.6;
    x.beginPath(); x.moveTo(-10, y0);
    for (let t = -10; t <= W + 10; t += 16) x.lineTo(t, y0 + (rnd() - 0.5) * rough * 0.6);
    x.stroke();
  }
  x.restore();
}

/* ═════════════════════════ FIXINGS ══════════════════════════════════════ */

function tape(x, cx, cy, w, h, rot, o = {}) {
  const { tint = 'rgba(255,255,255,.34)', edge = 'rgba(255,255,255,.5)',
          shade = 'rgba(90,86,110,.14)' } = o;
  x.save(); x.translate(cx, cy); x.rotate(rot);
  x.fillStyle = tint; x.fillRect(-w / 2, -h / 2, w, h);
  x.fillStyle = shade; x.fillRect(-w / 2, -h / 2, w, h);
  x.strokeStyle = edge; x.lineWidth = 1; x.strokeRect(-w / 2, -h / 2, w, h);
  // torn ends
  x.globalAlpha = 0.4; x.fillStyle = shade;
  for (let i = 0; i < 11; i++) {
    x.fillRect(-w / 2 - 2, -h / 2 + i * h / 11, 3.5, h / 11 * (0.35 + rnd() * 0.65));
    x.fillRect(w / 2 - 1.5, -h / 2 + i * h / 11, 3.5, h / 11 * (0.35 + rnd() * 0.65));
  }
  // a couple of trapped-air creases
  x.globalAlpha = 0.22; x.strokeStyle = '#fff'; x.lineWidth = 1.2;
  for (let i = 0; i < 2; i++) {
    const yy = -h / 2 + rnd() * h;
    x.beginPath(); x.moveTo(-w / 2, yy); x.lineTo(w / 2, yy + (rnd() - 0.5) * 4); x.stroke();
  }
  x.restore();
}

function staple(x, cx, cy, rot = 0, color = '#6E6A78') {
  x.save(); x.translate(cx, cy); x.rotate(rot);
  x.fillStyle = color; x.fillRect(-13, -2.4, 26, 4.8);
  x.fillStyle = 'rgba(255,255,255,.55)'; x.fillRect(-13, -2.4, 26, 1.3);
  x.fillStyle = 'rgba(0,0,0,.30)'; x.fillRect(-13, 1.4, 26, 1.6);
  x.restore();
}

function pinMark(x, cx, cy, color = '#EF4444') {
  x.save();
  x.fillStyle = 'rgba(0,0,0,.28)';
  x.beginPath(); x.arc(cx + 2, cy + 3, 8, 0, 7); x.fill();
  x.fillStyle = color;
  x.beginPath(); x.arc(cx, cy, 8, 0, 7); x.fill();
  x.fillStyle = 'rgba(255,255,255,.55)';
  x.beginPath(); x.arc(cx - 2.6, cy - 2.8, 2.6, 0, 7); x.fill();
  x.restore();
}

/* ══════════════════════════ TYPE ════════════════════════════════════════ */

/* Non-uniform stretch: fill a text box edge to edge. This is how the display
   type gets its condensed/extended poster proportions without needing a
   width axis on the canvas font shorthand. */
function fillStretched(x, txt, X, Y, bw, bh, fontSpec, o = {}) {
  const { stroke = false, lw = 3 } = o;
  x.save();
  x.font = fontSpec.replace(/\d+px/, '200px');
  const m = x.measureText(txt);
  const asc = m.actualBoundingBoxAscent || 145;
  const wid = m.width || 1;
  x.translate(X, Y);
  x.scale(bw / wid, bh / asc);
  x.textBaseline = 'alphabetic';
  if (stroke) { x.lineWidth = lw / (bh / asc); x.strokeText(txt, 0, 0); }
  else x.fillText(txt, 0, 0);
  x.restore();
}

// measure what fillStretched would need — for laying out around it
function stretchMetrics(x, txt, fontSpec) {
  x.save(); x.font = fontSpec.replace(/\d+px/, '200px');
  const m = x.measureText(txt);
  x.restore();
  return { w: m.width, asc: m.actualBoundingBoxAscent || 145 };
}

/* A marker word, eroded so it reads as paint on paper rather than a font:
   coverage pits, dry drags, ragged bites and an overspray halo. */
function tag(x, txt, fs, color, cx, cy, rot = 0, o = {}) {
  const { alpha = 1, erode = 1, spray = 0, font = 'Permanent Marker',
          align = 'center' } = o;
  const probe = offc(10, 10).ctx;
  probe.font = `${fs}px "${font}"`;
  const w = probe.measureText(txt).width, pad = fs * 0.62;
  const g = offc(w + pad * 2, fs * 2.1);
  const o2 = g.ctx;
  o2.font = `${fs}px "${font}"`; o2.textBaseline = 'alphabetic';
  o2.fillStyle = color; o2.fillText(txt, pad, fs * 1.42);

  if (spray > 0) {                         // overspray mist around the glyphs
    const halo = offc(g.canvas.width, g.canvas.height);
    const hc = halo.ctx;
    for (let a = 0; a < 14; a++) {
      const ang = a / 14 * Math.PI * 2, d = 3 + rnd() * 7 * spray;
      hc.globalAlpha = 0.10;
      hc.drawImage(g.canvas, Math.cos(ang) * d, Math.sin(ang) * d);
    }
    hc.globalCompositeOperation = 'destination-out';
    hc.globalAlpha = 1; hc.drawImage(g.canvas, 0, 0);
    hc.globalCompositeOperation = 'source-atop';
    hc.globalAlpha = 0.5; hc.fillStyle = color;
    for (let i = 0; i < halo.canvas.width * halo.canvas.height / 60; i++)
      hc.fillRect(rnd() * halo.canvas.width, rnd() * halo.canvas.height, 1, 1);
    o2.globalCompositeOperation = 'source-over';
    o2.globalAlpha = 0.6; o2.drawImage(halo.canvas, 0, 0); o2.globalAlpha = 1;
  }

  if (erode > 0) {
    o2.globalCompositeOperation = 'destination-out';
    const pits = g.canvas.width * g.canvas.height / 320 * erode;
    for (let i = 0; i < pits; i++) {
      o2.globalAlpha = 0.28 + rnd() * 0.5;
      o2.beginPath();
      o2.arc(rnd() * g.canvas.width, rnd() * g.canvas.height, 0.5 + rnd() * 1.5, 0, 7);
      o2.fill();
    }
    for (let i = 0; i < 5 * erode; i++) {   // dry drags
      o2.globalAlpha = 0.18 + rnd() * 0.3;
      o2.fillRect(rnd() * g.canvas.width, rnd() * g.canvas.height,
                  20 + rnd() * 70, 1 + rnd() * 1.6);
    }
  }

  x.save(); x.translate(cx, cy); x.rotate(rot); x.globalAlpha = alpha;
  const ax = align === 'left' ? 0 : align === 'right' ? -g.canvas.width : -g.canvas.width / 2;
  x.drawImage(g.canvas, ax, -g.canvas.height / 2);
  x.restore();
  return w;
}

/* A stamped label — condensed grotesk on a slab, slightly off-square, the
   kind of thing a rubber stamp or a Dymo strip leaves. */
function label(x, txt, X, Y, o = {}) {
  const { fs = 15, color = '#EDE9E0', bg = null, track = 3, pad = 9,
          rot = 0, weight = 600, align = 'left', box = false } = o;
  x.save();
  x.font = `${weight} ${fs}px Archivo, system-ui, sans-serif`;
  x.letterSpacing = `${track}px`;
  const w = x.measureText(txt).width, h = fs * 1.55;
  const ox = align === 'right' ? -w - pad * 2 : align === 'center' ? -(w + pad * 2) / 2 : 0;
  x.translate(X, Y); x.rotate(rot);
  if (bg) { x.fillStyle = bg; x.fillRect(ox, -h / 2, w + pad * 2, h); }
  if (box) {
    x.strokeStyle = color; x.lineWidth = 1.2;
    x.strokeRect(ox + 0.5, -h / 2 + 0.5, w + pad * 2 - 1, h - 1);
  }
  x.fillStyle = color; x.textBaseline = 'middle';
  x.fillText(txt, ox + pad, 1);
  x.letterSpacing = '0px';
  x.restore();
  return w + pad * 2;
}

// plain metadata run — no slab, just tracked-out caption type
function meta(x, txt, X, Y, o = {}) {
  const { fs = 14, color = '#14131A', track = 4, weight = 500,
          align = 'left', alpha = 1, rot = 0 } = o;
  x.save();
  x.globalAlpha = alpha;
  x.font = `${weight} ${fs}px Archivo, system-ui, sans-serif`;
  x.letterSpacing = `${track}px`;
  const w = x.measureText(txt).width;
  x.translate(X, Y); x.rotate(rot);
  x.fillStyle = color; x.textBaseline = 'alphabetic';
  x.fillText(txt, align === 'right' ? -w : align === 'center' ? -w / 2 : 0, 0);
  x.letterSpacing = '0px'; x.restore();
  return w;
}

/* ═════════════════════ PRESS FURNITURE ══════════════════════════════════ */

function regMark(x, cx, cy, color = '#14131A', R = 13, lw = 1.2) {
  x.save(); x.strokeStyle = color; x.lineWidth = lw;
  x.beginPath();
  x.moveTo(cx - R, cy); x.lineTo(cx + R, cy);
  x.moveTo(cx, cy - R); x.lineTo(cx, cy + R); x.stroke();
  x.beginPath(); x.arc(cx, cy, R * 0.56, 0, 7); x.stroke();
  x.restore();
}

function cropMarks(x, m = 42, len = 34, color = '#14131A', lw = 1.4) {
  x.save(); x.strokeStyle = color; x.lineWidth = lw;
  const pts = [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]];
  for (const [cx, cy, sx, sy] of pts) {
    x.beginPath();
    x.moveTo(cx - sx * len, cy); x.lineTo(cx - sx * 6, cy);
    x.moveTo(cx, cy - sy * len); x.lineTo(cx, cy - sy * 6);
    x.stroke();
  }
  x.restore();
}

function colourBar(x, X, Y, cw, ch, inks, gap = 4, labels = false) {
  x.save();
  inks.forEach((c, i) => {
    x.fillStyle = c; x.fillRect(X + i * (cw + gap), Y, cw, ch);
  });
  if (labels) {
    x.fillStyle = 'rgba(20,19,26,.6)';
    x.font = '500 9px Archivo, system-ui'; x.letterSpacing = '1px';
    inks.forEach((c, i) => x.fillText(c.slice(1).toUpperCase(), X + i * (cw + gap), Y + ch + 12));
    x.letterSpacing = '0px';
  }
  x.restore();
}

// thin registration grid — the drafting layer under everything
function grid(x, X, Y, w, h, cell, color, lw = 1, heavyEvery = 0, heavy = null) {
  x.save();
  x.beginPath(); x.rect(X, Y, w, h); x.clip();
  let i = 0;
  for (let px = X; px <= X + w + 0.5; px += cell, i++) {
    x.strokeStyle = (heavyEvery && i % heavyEvery === 0 && heavy) ? heavy : color;
    x.lineWidth = (heavyEvery && i % heavyEvery === 0) ? lw * 1.8 : lw;
    x.beginPath(); x.moveTo(px, Y); x.lineTo(px, Y + h); x.stroke();
  }
  i = 0;
  for (let py = Y; py <= Y + h + 0.5; py += cell, i++) {
    x.strokeStyle = (heavyEvery && i % heavyEvery === 0 && heavy) ? heavy : color;
    x.lineWidth = (heavyEvery && i % heavyEvery === 0) ? lw * 1.8 : lw;
    x.beginPath(); x.moveTo(X, py); x.lineTo(X + w, py); x.stroke();
  }
  x.restore();
}

/* ═══════════════════════════ WAVEFORMS ══════════════════════════════════ */

/* Mixr draws every clip as a symmetric peak envelope inside a rounded lane.
   These are rebuilt procedurally so they can be cut up, repeated and printed
   at any size without resampling a screenshot. */
function peaks(n, s, o = {}) {
  const { swell = 0.55, floor = 0.16, jag = 0.5 } = o;
  const old = seed; srnd(s);
  const out = new Array(n);
  let v = 0.4;
  for (let i = 0; i < n; i++) {
    v = v * (1 - jag) + rnd() * jag;
    const t = i / (n - 1);
    const env = floor + swell * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.35)), 0.55);
    out[i] = Math.min(1, Math.max(0.04, v * env * (0.75 + rnd() * 0.5)));
  }
  seed = old;
  return out;
}

/* One lane: rounded clip body, tinted fill, then the envelope. */
function waveLane(x, X, Y, w, h, color, o = {}) {
  const { s = 7, body = true, radius = 10, bar = 3, gap = 2, alpha = 1,
          glow = 0, tint = 0.16, mono = false, playhead = -1 } = o;
  const n = Math.max(4, Math.floor(w / (bar + gap)));
  const p = peaks(n, s, o);
  x.save(); x.globalAlpha = alpha;
  if (body) {
    rrect(x, X, Y, w, h, radius);
    x.fillStyle = rgba(color, tint); x.fill();
    x.strokeStyle = rgba(color, 0.55); x.lineWidth = 1.5; x.stroke();
  }
  x.save();
  rrect(x, X, Y, w, h, radius); x.clip();
  if (glow) { x.shadowColor = rgba(color, 0.9); x.shadowBlur = glow; }
  x.fillStyle = mono ? color : color;
  const cy = Y + h / 2, half = h * 0.42;
  for (let i = 0; i < n; i++) {
    const a = p[i] * half;
    x.fillRect(X + i * (bar + gap), cy - a, bar, a * 2);
  }
  x.restore();
  if (playhead >= 0) {
    x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(X + w * playhead, Y - 6); x.lineTo(X + w * playhead, Y + h + 6); x.stroke();
  }
  x.restore();
}

/* A repeated waveform strip used as ribbon/rule — no lane body, just the
   envelope, so it can run across the sheet and tie fragments together. */
function waveRibbon(x, pts, amp, color, o = {}) {
  const { s = 11, bar = 3, gap = 2, alpha = 1, cap = false } = o;
  // pts: [[x,y],...] polyline the ribbon rides
  let total = 0; const segs = [];
  for (let i = 1; i < pts.length; i++) {
    const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    segs.push(L); total += L;
  }
  const n = Math.max(6, Math.floor(total / (bar + gap)));
  const p = peaks(n, s, o);
  x.save(); x.globalAlpha = alpha; x.fillStyle = color;
  for (let i = 0; i < n; i++) {
    let d = i / n * total, k = 0;
    while (k < segs.length - 1 && d > segs[k]) { d -= segs[k]; k++; }
    const t = segs[k] ? d / segs[k] : 0;
    const ax = pts[k][0] + (pts[k + 1][0] - pts[k][0]) * t;
    const ay = pts[k][1] + (pts[k + 1][1] - pts[k][1]) * t;
    const ang = Math.atan2(pts[k + 1][1] - pts[k][1], pts[k + 1][0] - pts[k][0]);
    const a = p[i] * amp;
    x.save(); x.translate(ax, ay); x.rotate(ang);
    if (cap) { rrect(x, -bar / 2, -a, bar, a * 2, bar / 2); x.fill(); }
    else x.fillRect(-bar / 2, -a, bar, a * 2);
    x.restore();
  }
  x.restore();
}

/* ═════════════════════════ HAND MARKS ═══════════════════════════════════ */

// a wobbling hand-drawn line through points
function scrawl(x, pts, color, lw = 5, wobble = 3, alpha = 1) {
  x.save(); x.globalAlpha = alpha;
  x.strokeStyle = color; x.lineWidth = lw; x.lineCap = 'round'; x.lineJoin = 'round';
  x.beginPath();
  pts.forEach(([px, py], i) => {
    const jx = px + (rnd() - 0.5) * wobble, jy = py + (rnd() - 0.5) * wobble;
    i ? x.lineTo(jx, jy) : x.moveTo(jx, jy);
  });
  x.stroke(); x.restore();
}

// hand-drawn arrow: shaft + two barbs, all wobbled
function arrow(x, pts, color, lw = 5, head = 26, alpha = 1) {
  scrawl(x, pts, color, lw, 2.4, alpha);
  const a = pts[pts.length - 1], b = pts[pts.length - 2];
  const ang = Math.atan2(a[1] - b[1], a[0] - b[0]);
  x.save(); x.globalAlpha = alpha; x.translate(a[0], a[1]); x.rotate(ang);
  x.strokeStyle = color; x.lineWidth = lw; x.lineCap = 'round';
  x.beginPath();
  x.moveTo(-head, -head * 0.52); x.lineTo(2, 0); x.lineTo(-head, head * 0.52);
  x.stroke(); x.restore();
}

// a circled annotation, drawn twice like a real pen loop
function circleMark(x, cx, cy, rx, ry, color, lw = 4, alpha = 1) {
  x.save(); x.globalAlpha = alpha;
  x.strokeStyle = color; x.lineWidth = lw; x.lineCap = 'round';
  for (let k = 0; k < 2; k++) {
    x.beginPath();
    for (let a = -0.25; a < Math.PI * 2 - 0.1; a += 0.12) {
      const w = 1 + (rnd() - 0.5) * 0.05;
      const px = cx + Math.cos(a) * rx * w + k * 3, py = cy + Math.sin(a) * ry * w + k * 2;
      a === -0.25 ? x.moveTo(px, py) : x.lineTo(px, py);
    }
    x.stroke();
  }
  x.restore();
}

/* ═════════════════════════ MISREGISTRATION ══════════════════════════════ */

/* Run a draw function twice, the second time offset and in a spot ink — the
   plate that missed its register. The whole poster family leans on this. */
function misreg(x, fn, dx, dy, color, alpha = 0.85, mode = 'multiply') {
  x.save();
  x.globalCompositeOperation = mode;
  x.globalAlpha = alpha;
  x.translate(dx, dy);
  const s0 = seed;
  fn(color);
  seed = s0;
  x.restore();
  fn(null);
}

// tint an alpha-carrying canvas to a flat ink
function inkify(src, color) {
  const g = offc(src.width, src.height);
  g.ctx.drawImage(src, 0, 0);
  g.ctx.globalCompositeOperation = 'source-in';
  g.ctx.fillStyle = color;
  g.ctx.fillRect(0, 0, src.width, src.height);
  return g.canvas;
}

// knock a canvas to pure alpha-on-ink from its darkness (for spot plates)
function darknessMask(src, color, gammaK = 1.4) {
  const w = src.width, h = src.height;
  const sd = src.getContext('2d').getImageData(0, 0, w, h).data;
  const g = offc(w, h);
  const id = g.ctx.createImageData(w, h), od = id.data;
  const [cr, cg, cb] = hexRGB(color);
  for (let i = 0; i < sd.length; i += 4) {
    const l = (sd[i] * 0.299 + sd[i + 1] * 0.587 + sd[i + 2] * 0.114) / 255;
    od[i] = cr; od[i + 1] = cg; od[i + 2] = cb;
    od[i + 3] = Math.pow(1 - l, gammaK) * 255;
  }
  g.ctx.putImageData(id, 0, 0);
  return g.canvas;
}

/* ═════════════════════════ EXPORT PLUMBING ══════════════════════════════ */

function boot(canvasId) {
  const cv = document.getElementById(canvasId);
  const x = cv.getContext('2d');
  if (new URLSearchParams(location.search).has('export'))
    document.body.classList.add('export');
  window.exportPNG = () => cv.toDataURL('image/png');
  return { cv, x };
}

async function fonts() {
  await Promise.all([
    document.fonts.load('900 300px Archivo'),
    document.fonts.load('700 60px Archivo'),
    document.fonts.load('500 20px Archivo'),
    document.fonts.load('400 200px "Permanent Marker"'),
    document.fonts.load('400 20px "Space Mono"'),
    document.fonts.load('700 20px "Space Mono"'),
  ]);
  await document.fonts.ready;
}


/* ═══════════════════════════════════════════════════════════════════════
   PART II — the effects canvas can do and a vector tool cannot.
   Generative modular type, true per-channel chromatic slicing, real
   refraction sampled off the sheet itself, and film grain.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── GENERATIVE MODULAR TYPE ──────────────────────────────────────────
   Rasterise a letter, then rebuild it column by column out of rounded
   vertical bars — the exact module Mixr draws a clip's peaks with. Every
   contiguous run of coverage in a column becomes one bar, so the letter's
   own anatomy decides the rhythm: stems give long bars, curves give short
   stacked ones. */
function barType(ctx, text, X, Y, boxW, boxH, o = {}) {
  const { bar = 13, gap = 7, color = '#fff', font = '900 200px Archivo',
          radius = null, minLen = null, jitter = 0, seed: sd = 7,
          spark = null, alpha = 1, threshold = 110, pad = 0,
          stroke = false, lw = 1.6 } = o;
  const g = offc(boxW + pad * 2, boxH + pad * 2);
  g.ctx.fillStyle = '#fff';
  fillStretched(g.ctx, text, pad, boxH + pad, boxW, boxH, font);
  const gw = g.canvas.width, gh = g.canvas.height;
  const d = g.ctx.getImageData(0, 0, gw, gh).data;
  const step = bar + gap, R = radius == null ? bar / 2 : radius;
  const keep = seed; srnd(sd);
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = lw;
  let col = 0;
  for (let cx = 0; cx < boxW; cx += step, col++) {
    const px = Math.min(gw - 1, Math.round(cx + pad + bar / 2));
    let run = -1;
    for (let py = 0; py <= gh; py++) {
      const on = py < gh && d[(py * gw + px) * 4 + 3] > threshold;
      if (on && run < 0) run = py;
      if (!on && run >= 0) {
        let y0 = run, y1 = py;
        if (jitter) { const j = (rnd() - .5) * jitter; y0 -= j; y1 += j; }
        const len = y1 - y0;
        if (len >= (minLen == null ? bar * .5 : minLen)) {
          const c = spark ? spark(col, y0 - pad, len, rnd) : null;
          ctx.fillStyle = c || color; ctx.strokeStyle = c || color;
          if (stroke) {
            rrect(ctx, X + cx + lw/2, Y + y0 - pad + lw/2,
                  bar - lw, len - lw, Math.max(0, Math.min(R, len/2) - lw/2));
            ctx.stroke();
          } else {
            rrect(ctx, X + cx, Y + y0 - pad, bar, len, Math.min(R, len / 2));
            ctx.fill();
          }
        }
        run = -1;
      }
    }
  }
  ctx.restore();
  seed = keep;
  return { cols: col, step };
}

/* Measure the natural width of a word at a given cap height, so letters can
   be laid out at true relative widths — an M is a long clip, an I is short. */
function capWidth(ctx, text, cap, font = '900 200px Archivo') {
  const m = stretchMetrics(ctx, text, font);
  return m.w * (cap / m.asc);
}

/* ── CHROMATIC SLICING ────────────────────────────────────────────────
   A table of horizontal bands, each with a displacement quantised to a
   musical grid, so the tear reads as a beat rather than as noise. */
function sliceTable(total, o = {}) {
  const { n = 26, seed: sd = 3, irregular = .55,
          grid = [0,0,0,0,0,0,0,10,-10,22,-22,52,-52,118,-160],
          chroma = [0,0,0,1,1,2,3,5,9,16] } = o;
  const keep = seed; srnd(sd);
  const rows = []; let y = 0; const base = total / n;
  while (y < total - 1) {
    const h = Math.max(7, base * (1 - irregular / 2 + rnd() * irregular));
    const y1 = Math.min(total, y + h);
    rows.push({ y0: Math.round(y), y1: Math.round(y1),
                dx: grid[(rnd() * grid.length) | 0],
                cr: chroma[(rnd() * chroma.length) | 0] });
    y = y1;
  }
  seed = keep;
  return rows;
}

/* True per-channel horizontal displacement, band by band: R, G and B are
   each sampled from a different x. This is real chromatic aberration —
   not a tinted duplicate laid on top. */
function sliceRGB(src, rows) {
  const w = src.width, h = src.height;
  const s = src.getContext('2d').getImageData(0, 0, w, h).data;
  const g = offc(w, h);
  const out = g.ctx.createImageData(w, h), o2 = out.data;
  const cl = v => v < 0 ? 0 : v >= w ? w - 1 : v;
  for (const r of rows) {
    for (let y = r.y0; y < Math.min(r.y1, h); y++) {
      const row = y * w;
      for (let px = 0; px < w; px++) {
        const i = (row + px) * 4;
        const ir = (row + cl(px - r.dx - r.cr)) * 4;
        const ig = (row + cl(px - r.dx)) * 4;
        const ib = (row + cl(px - r.dx + r.cr)) * 4;
        o2[i] = s[ir]; o2[i+1] = s[ig+1]; o2[i+2] = s[ib+2]; o2[i+3] = s[ig+3];
      }
    }
  }
  g.ctx.putImageData(out, 0, 0);
  return g.canvas;
}

/* Misregistration for marks on a light ground: the same plate printed three
   times in three inks, each a little out of true. Multiply keeps the
   overlaps dark and leaves brand-coloured fringes at the edges. */
function misregPlate(ctx, plate, rows, inks, o = {}) {
  const { alpha = 1 } = o;
  const tinted = inks.map(([hex]) => darknessMask(plate, hex));
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = alpha;
  for (const r of rows) {
    ctx.save();
    ctx.beginPath(); ctx.rect(0, r.y0, plate.width, r.y1 - r.y0); ctx.clip();
    inks.forEach(([, mult], k) => {
      ctx.drawImage(tinted[k], r.dx + r.cr * mult, 0);
    });
    ctx.restore();
  }
  ctx.restore();
}

/* ── DUOTONE ──────────────────────────────────────────────────────────
   Remap a photograph's luminance onto a two-colour ramp, optionally
   keying the bright ground away so the figure can sit on the sheet. */
function duotone(img, sx, sy, sw, sh, tw, th, o = {}) {
  const { dark = '#0A0A0F', light = '#EDEBE6', gamma = 1, contrast = 1,
          bright = 0, cut = null, soft = .10 } = o;
  const g = offc(tw, th);
  g.ctx.drawImage(img, sx, sy, sw, sh, 0, 0, tw, th);
  const id = g.ctx.getImageData(0, 0, tw, th), d = id.data;
  const [dr, dg, db] = hexRGB(dark), [lr, lg, lb] = hexRGB(light);
  for (let i = 0; i < d.length; i += 4) {
    let l = (d[i] * .299 + d[i+1] * .587 + d[i+2] * .114) / 255;
    l = Math.pow(l, gamma);
    l = (l - .5) * contrast + .5 + bright;
    l = l < 0 ? 0 : l > 1 ? 1 : l;
    d[i]   = dr + (lr - dr) * l;
    d[i+1] = dg + (lg - dg) * l;
    d[i+2] = db + (lb - db) * l;
    if (cut != null) {
      const a = (cut - l) / soft;
      d[i+3] = d[i+3] * (a < 0 ? 0 : a > 1 ? 1 : a);
    }
  }
  g.ctx.putImageData(id, 0, 0);
  return g.canvas;
}

/* ── SQUIRCLE + REAL REFRACTION ───────────────────────────────────────
   The app-icon shape as a superellipse, and a lens that re-samples the
   sheet already drawn beneath it. Displacement is zero through the middle
   and rises sharply at the rim — how a thick glass tile actually behaves —
   and R, G and B are sampled at slightly different magnitudes, so the tile
   disperses light at its edges. */
function squircle(ctx, cx, cy, hw, hh, n = 4.4, steps = 240, begin = true) {
  const e = 2 / n;
  if (begin) ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps * Math.PI * 2;
    const c = Math.cos(t), s = Math.sin(t);
    const px = cx + hw * Math.sign(c) * Math.pow(Math.abs(c), e);
    const py = cy + hh * Math.sign(s) * Math.pow(Math.abs(s), e);
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}

function refractSquircle(ctx, cv, cx, cy, hw, hh, o = {}) {
  const { n = 4.4, strength = 58, rim = .34, power = 2.6, disperse = .2,
          zoom = 1.03 } = o;
  const x0 = Math.max(0, Math.floor(cx - hw - 2));
  const y0 = Math.max(0, Math.floor(cy - hh - 2));
  const x1 = Math.min(cv.width,  Math.ceil(cx + hw + 2));
  const y1 = Math.min(cv.height, Math.ceil(cy + hh + 2));
  const bw = x1 - x0, bh = y1 - y0;
  if (bw <= 0 || bh <= 0) return;
  const CW = cv.width, CH = cv.height;
  const s = ctx.getImageData(0, 0, CW, CH).data;
  const g = offc(bw, bh);
  const out = g.ctx.createImageData(bw, bh), o2 = out.data;
  const inv = 1 / n;
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      const oi = ((py - y0) * bw + (px - x0)) * 4;
      const dx = px - cx, dy = py - cy;
      const u = dx / hw, v = dy / hh;
      const au = Math.abs(u), av = Math.abs(v);
      const f = Math.pow(au, n) + Math.pow(av, n);
      const src = (py * CW + px) * 4;
      if (f >= 1) {                                  // outside: pass through
        o2[oi] = s[src]; o2[oi+1] = s[src+1];
        o2[oi+2] = s[src+2]; o2[oi+3] = s[src+3];
        continue;
      }
      const e = 1 - Math.pow(f, inv);                // 0 at rim → 1 at centre
      const k = Math.pow(1 - Math.min(1, e / rim), power) * strength;
      // outward normal of the superellipse
      let nx = (n * Math.pow(au, n - 1) * Math.sign(u)) / hw;
      let ny = (n * Math.pow(av, n - 1) * Math.sign(v)) / hh;
      const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
      const zx = cx + dx / zoom, zy = cy + dy / zoom;
      let r = 0, gg = 0, b = 0;
      for (let ch = 0; ch < 3; ch++) {
        const m = 1 + (ch - 1) * disperse;            // R pushed, B pulled
        let ax = Math.round(zx + nx * k * m);
        let ay = Math.round(zy + ny * k * m);
        ax = ax < 0 ? 0 : ax >= CW ? CW - 1 : ax;
        ay = ay < 0 ? 0 : ay >= CH ? CH - 1 : ay;
        const si = (ay * CW + ax) * 4;
        if (ch === 0) r = s[si]; else if (ch === 1) gg = s[si+1]; else b = s[si+2];
      }
      o2[oi] = r; o2[oi+1] = gg; o2[oi+2] = b; o2[oi+3] = 255;
    }
  }
  g.ctx.putImageData(out, 0, 0);
  ctx.save();
  squircle(ctx, cx, cy, hw, hh, n); ctx.clip();
  ctx.drawImage(g.canvas, x0, y0);
  ctx.restore();
}

/* The surface of the tile, once it has finished bending what is behind it. */
function glassSurface(ctx, cx, cy, hw, hh, o = {}) {
  const { n = 4.4, frost = .05, gloss = .30, spec = .30,
          bounce = '#7231DD', rim = .85 } = o;
  ctx.save();
  squircle(ctx, cx, cy, hw, hh, n); ctx.clip();
  const X = cx - hw, Y = cy - hh, w = hw * 2, h = hh * 2;
  ctx.fillStyle = `rgba(255,255,255,${frost})`; ctx.fillRect(X, Y, w, h);
  const gl = ctx.createLinearGradient(X, Y, X + w * .35, Y + h);
  gl.addColorStop(0, `rgba(255,255,255,${gloss})`);
  gl.addColorStop(.36, 'rgba(255,255,255,.03)');
  gl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl; ctx.fillRect(X, Y, w, h);
  const sp = ctx.createLinearGradient(X, Y, X + w, Y + h);
  sp.addColorStop(.30, 'rgba(255,255,255,0)');
  sp.addColorStop(.395, `rgba(255,255,255,${spec})`);
  sp.addColorStop(.45, 'rgba(255,255,255,.04)');
  sp.addColorStop(.53, 'rgba(255,255,255,0)');
  ctx.fillStyle = sp; ctx.fillRect(X, Y, w, h);
  const bo = ctx.createLinearGradient(X, Y + h - h * .3, X, Y + h);
  bo.addColorStop(0, rgba(bounce, 0)); bo.addColorStop(1, rgba(bounce, .16));
  ctx.fillStyle = bo; ctx.fillRect(X, Y + h - h * .3, w, h * .3);
  ctx.restore();
  squircle(ctx, cx, cy, hw - .8, hh - .8, n);
  ctx.strokeStyle = `rgba(255,255,255,${rim})`; ctx.lineWidth = 1.6; ctx.stroke();
  squircle(ctx, cx, cy, hw - 4, hh - 4, n);
  ctx.strokeStyle = rgba(bounce, .22); ctx.lineWidth = 1.2; ctx.stroke();
}

/* ── FINISHING ────────────────────────────────────────────────────────── */
function filmGrain(ctx, o = {}) {
  const { alpha = .30, size = 200, amp = 30, mode = 'overlay' } = o;
  ctx.save();
  ctx.globalAlpha = alpha; ctx.globalCompositeOperation = mode;
  ctx.fillStyle = ctx.createPattern(noiseCanvas(size, amp), 'repeat');
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function vignette(ctx, o = {}) {
  const { inner = .40, outer = .95, amount = .34, cx = .5, cy = .5 } = o;
  const g = ctx.createRadialGradient(W*cx, H*cy, H*inner, W*cx, H*cy, H*outer);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${amount})`);
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}

/* A ruler: the app's own timecode furniture, used as poster structure. */
function ruler(ctx, X, Y, w, marks, o = {}) {
  const { color = 'rgba(255,255,255,.45)', tick = 9, big = 16,
          fs = 13, font = '400 13px "Space Mono", monospace', label = true } = o;
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + w, Y); ctx.stroke();
  marks.forEach((m, i) => {
    const px = X + w * (i / (marks.length - 1));
    const t = m ? big : tick;
    ctx.beginPath(); ctx.moveTo(px, Y); ctx.lineTo(px, Y + t); ctx.stroke();
    if (label && m) {
      ctx.font = font; ctx.letterSpacing = '1px'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(m, px + 8, Y - 8);
      ctx.letterSpacing = '0px';
    }
  });
  ctx.restore();
}

/* Force real channel separation into a two-ink axis. The displacement stays
   physically true — R, G and B were genuinely sampled from three places —
   but wherever the channels disagree, the fringe is pushed onto the brand's
   warm/cool pair instead of landing on arbitrary spectrum colours. */
function chromaRemap(src, o = {}) {
  const { ink = '#111119', ground = '#E6E3DC', warm = '#FF5FA2',
          cool = '#0EA5E9', strength = 3.4, dead = .06 } = o;
  const w = src.width, h = src.height;
  const id = src.getContext('2d').getImageData(0, 0, w, h), d = id.data;
  const [ir, ig, ib] = hexRGB(ink), [gr, gg, gb] = hexRGB(ground);
  const [wr, wg, wb] = hexRGB(warm), [cr, cg, cb] = hexRGB(cool);
  for (let i = 0; i < d.length; i += 4) {
    const R = d[i], G = d[i+1], B = d[i+2];
    const L = (R * .299 + G * .587 + B * .114) / 255;
    let br = ir + (gr - ir) * L, bg = ig + (gg - ig) * L, bb = ib + (gb - ib) * L;
    const sgn = (R - B) / 255;
    // a warm paper stock is not a fringe: ignore everything under the
    // deadzone so flat ground stays the colour it was mixed as
    const a = Math.min(1, Math.max(0, Math.abs(sgn) - dead) * strength);
    if (a > .003) {
      const tr = sgn > 0 ? wr : cr, tg = sgn > 0 ? wg : cg, tb = sgn > 0 ? wb : cb;
      br += (tr - br) * a; bg += (tg - bg) * a; bb += (tb - bb) * a;
    }
    d[i] = br; d[i+1] = bg; d[i+2] = bb;
  }
  const g = offc(w, h); g.ctx.putImageData(id, 0, 0);
  return g.canvas;
}

/* Clamp the tear inside a band of the sheet — so an image can come apart
   while the wordmark under it stays readable. */
function calmRows(rows, y0, y1, maxDx, maxCr) {
  return rows.map(r => {
    const mid = (r.y0 + r.y1) / 2;
    if (mid < y0 || mid > y1) return r;
    return { ...r,
      dx: Math.max(-maxDx, Math.min(maxDx, r.dx)),
      cr: Math.min(maxCr, r.cr) };
  });
}

return { W, H, C, srnd, rnd, rr, pick, load, offc, rrect,
         noiseCanvas, grain, fibre, scanStreaks, tonerBand,
         xerox, halftone, dotField, spotPlate, hexRGB, rgba,
         tornPath, pasteTorn, tornBand,
         tape, staple, pinMark,
         fillStretched, stretchMetrics, tag, label, meta,
         regMark, cropMarks, colourBar, grid,
         peaks, waveLane, waveRibbon,
         scrawl, arrow, circleMark,
         misreg, inkify, darknessMask,
         boot, fonts,
         // part II
         barType, capWidth, sliceTable, sliceRGB, misregPlate, duotone,
         squircle, refractSquircle, glassSurface, filmGrain, vignette, ruler,
         chromaRemap, calmRows };
})();
