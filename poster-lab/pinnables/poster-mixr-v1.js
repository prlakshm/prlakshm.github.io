/* ───────────────────────────────────────────────────────────────────────────
   MIXR — poster, v1
   The first cut of the RUN-reference collage: a soft lavender sheet, ONE
   graffiti purple at ONE size, black micro-type waves, and the figure printed
   with a purple plate a hair off-register.  Kept as its own file because the
   live poster (poster-mixr.html) has since gone acid — multiple cans, tags
   that overprint the waves, heavier grain.  This is the quieter earlier state.

   Usage:  drawMixrPosterV1(canvasEl)  →  Promise
   Needs "Permanent Marker" + "Space Mono" 700 loaded, and assets/mixr-girl.png
   reachable from the page.
   ─────────────────────────────────────────────────────────────────────────── */
(function () {
  const W = 1600, H = 2000;

  // ---- MIXR APP PALETTE (MixrColors.swift), tinted to the reference's value ----
  const BG_TOP = '#E2D8F9', BG_MID = '#DACEF7', BG_BOT = '#CDBEF3'; // the soft ground
  const GRAF   = '#4C1FA3';   // the one graffiti purple — every word, no exceptions
  const BLACK  = '#050816';   // app background — the micro-type
  const LAV    = '#E4DBFA';   // sfxWaveformTop — type going light as it crosses her
  const WHITE  = '#FFFFFF';
  const GHOST  = '#7231DD';   // primaryPurple, printed a hair off-register

  const WORD_FS   = 150;  // ONE size for every graffiti word — big, like the RUN letters
  const MICRO_FS  = 21;   // the small type the wave bands are built from
  const BAND_ROWS = 10;   // rows of it stacked to make one band
  const LINE_H    = 22;
  const BAND_GAP  = 520;  // one spacing for every band — perfectly even
  const RING_STEP = 118;  // distance between contour rings
  const RING_START = 74;  // the first orbit hugs her silhouette
  const MAXD      = 480;  // a contained cloud around her, not a full-page field

  const TAG      = 'iOS DJ App';
  // white carries more optical weight than the purple, so it is set a little
  // smaller to READ the same size as a "Mixr"
  const TAG_FS   = Math.round(WORD_FS * 0.82);
  const TAG_TILT = -0.21; // kicked off the orbit tangent just enough to fall
                          // across the sheet on a lively diagonal
  const TARGET   = { x: 1090, y: 790 };

  const A = 62, L_WAVE = 920, PH = 0; // ONE wave for every band — short enough
                                      // wavelength that it rises and falls twice

  const load = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = s; });

  window.drawMixrPosterV1 = async function (cv, src) {
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');

    let seed = 90210;                       // deterministic — the layout is a design,
    const rnd = () => {                     // not a roll of the dice
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    function grain(alpha) {
      const g = document.createElement('canvas'); g.width = 256; g.height = 256;
      const gc = g.getContext('2d'), id = gc.createImageData(256, 256);
      for (let i = 0; i < id.data.length; i += 4) {
        const v = Math.random() * 255 | 0;
        id.data[i] = v; id.data[i + 1] = v; id.data[i + 2] = v; id.data[i + 3] = 255;
      }
      gc.putImageData(id, 0, 0);
      x.save(); x.globalAlpha = alpha; x.globalCompositeOperation = 'overlay';
      x.fillStyle = x.createPattern(g, 'repeat'); x.fillRect(0, 0, W, H); x.restore();
    }

    // chalky marker word — stamped, then eroded so it reads as spray, not a font
    function roughWord(txt, fs, color, cx, cy, rot, alpha = 1) {
      const off = document.createElement('canvas'), o = off.getContext('2d');
      o.font = `${fs}px "Permanent Marker"`;
      const w = o.measureText(txt).width;
      off.width = Math.ceil(w + fs * .6); off.height = Math.ceil(fs * 1.7);
      o.font = `${fs}px "Permanent Marker"`; o.textBaseline = 'alphabetic';
      o.fillStyle = color; o.fillText(txt, fs * .3, fs * 1.15);
      o.globalCompositeOperation = 'destination-out';
      const pits = off.width * off.height / 260;
      for (let i = 0; i < pits; i++) {
        o.globalAlpha = .3 + rnd() * .55;
        o.beginPath(); o.arc(rnd() * off.width, rnd() * off.height, .5 + rnd() * 1.3, 0, 7); o.fill();
      }
      for (let i = 0; i < 4; i++) {         // a few dry-marker skips across the stroke
        o.globalAlpha = .2 + rnd() * .3;
        o.fillRect(rnd() * off.width, rnd() * off.height, 16 + rnd() * 60, 1 + rnd() * 1.4);
      }
      x.save(); x.translate(cx, cy); x.rotate(rot); x.globalAlpha = alpha;
      x.drawImage(off, -off.width / 2, -off.height / 2); x.restore();
      return w;
    }

    await document.fonts.load(`400 ${WORD_FS}px "Permanent Marker"`);
    await document.fonts.load(`700 ${MICRO_FS}px "Space Mono"`);
    const girl = await load(src || 'assets/mixr-girl.png');

    // ── L1 · light purple ground
    const bg = x.createLinearGradient(0, 0, W * .3, H);
    bg.addColorStop(0, BG_TOP); bg.addColorStop(.5, BG_MID); bg.addColorStop(1, BG_BOT);
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 8; i++) {           // soft blooms so the sheet isn't a flat fill
      const g = x.createRadialGradient(rnd() * W, rnd() * H, 0, rnd() * W, rnd() * H, 320 + rnd() * 520);
      g.addColorStop(0, `rgba(255,255,255,${.04 + rnd() * .05})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
    }

    // ── the figure, pre-levelled so her paper clips to true white ──
    const gh = H * 0.70, gw = gh * girl.width / girl.height;   // 70% of poster height
    const gx = (W - gw) / 2, gy = H - gh;
    const fig = document.createElement('canvas'); fig.width = W; fig.height = H;
    const f2 = fig.getContext('2d');
    f2.fillStyle = '#fff'; f2.fillRect(0, 0, W, H);
    f2.filter = 'grayscale(1) brightness(1.10) contrast(1.34)';
    f2.drawImage(girl, gx, gy, gw, gh);

    // Proper cutout: flood the paper inward from the border, so only background
    // CONNECTED to the edge is removed. Anything light but enclosed by her —
    // highlights on her arms, the pale brushwork — stays fully opaque, instead
    // of going semi-transparent and letting the purple plate show through.
    const imgd = f2.getImageData(0, 0, W, H), px = imgd.data;
    const N = W * H, PAPER = 238;
    const isPaper = new Uint8Array(N), fseen = new Uint8Array(N);
    for (let p = 0; p < N; p++) {
      const i = p * 4;
      isPaper[p] = (px[i] * .299 + px[i + 1] * .587 + px[i + 2] * .114) >= PAPER ? 1 : 0;
    }
    const q = new Int32Array(N); let head = 0, tail = 0;
    const push = p => { if (isPaper[p] && !fseen[p]) { fseen[p] = 1; q[tail++] = p; } };
    for (let X = 0; X < W; X++) { push(X); push((H - 1) * W + X); }
    for (let Y = 0; Y < H; Y++) { push(Y * W); push(Y * W + W - 1); }
    while (head < tail) {
      const p = q[head++], X = p % W;
      if (X > 0) push(p - 1);
      if (X < W - 1) push(p + 1);
      if (p >= W) push(p - W);
      if (p < N - W) push(p + W);
    }
    // binary alpha, then one 3×3 pass to take the jaggies off the edge
    const A0 = new Uint8Array(N);
    for (let p = 0; p < N; p++) A0[p] = fseen[p] ? 0 : 255;
    const mask = document.createElement('canvas'); mask.width = W; mask.height = H;
    const mk = mask.getContext('2d');
    const md = mk.createImageData(W, H), mdd = md.data;
    let sx = 0, sy = 0, sn = 0, headTop = H;
    for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
      const p = Y * W + X, i = p * 4;
      let a = A0[p];
      if (a && X && Y && X < W - 1 && Y < H - 1) {
        a = (A0[p] * 4 + A0[p - 1] + A0[p + 1] + A0[p - W] + A0[p + W]) / 8;
      }
      if (a > 0) {
        mdd[i] = px[i]; mdd[i + 1] = px[i + 1]; mdd[i + 2] = px[i + 2];
        mdd[i + 3] = Math.round(a);
        if (a > 128) { sx += X; sy += Y; sn++; if (Y < headTop) headTop = Y; }
      }
    }
    mk.putImageData(md, 0, 0);
    const cx0 = sn ? sx / sn : W / 2, cy0 = sn ? sy / sn : H * .7;

    // The distance field is solved on a domain far LARGER than the poster.
    // Solving it only on the page made distance jump to infinity at the edge,
    // so every outward ray "hit" its target the instant it crossed the border —
    // which is what parked a ring of words along the frame. With the field
    // extended, the orbits keep going past the sheet and are simply clipped.
    const PAD = 1000, C = 6, INF = 1e9;
    const GW = Math.ceil((W + 2 * PAD) / C), GH = Math.ceil((H + 2 * PAD) / C);
    const D = new Float32Array(GW * GH).fill(INF);
    for (let b = 0; b < GH; b++) for (let a = 0; a < GW; a++) {
      const X = a * C - PAD + C / 2, Y = b * C - PAD + C / 2;
      if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      if (mdd[((Y | 0) * W + (X | 0)) * 4 + 3] > 128) D[b * GW + a] = 0;
    }

    // chamfer distance transform (3-4), in grid units
    const at = (a, b) => (a < 0 || b < 0 || a >= GW || b >= GH) ? INF : D[b * GW + a];
    for (let b = 0; b < GH; b++) for (let a = 0; a < GW; a++) {
      let v = D[b * GW + a];
      v = Math.min(v, at(a - 1, b) + 3, at(a, b - 1) + 3, at(a - 1, b - 1) + 4, at(a + 1, b - 1) + 4);
      D[b * GW + a] = v;
    }
    for (let b = GH - 1; b >= 0; b--) for (let a = GW - 1; a >= 0; a--) {
      let v = D[b * GW + a];
      v = Math.min(v, at(a + 1, b) + 3, at(a, b + 1) + 3, at(a + 1, b + 1) + 4, at(a - 1, b + 1) + 4);
      D[b * GW + a] = v;
    }
    const dist = (X, Y) => {                 // px distance to the silhouette
      const a = Math.floor((X + PAD) / C), b = Math.floor((Y + PAD) / C);
      if (a < 0 || b < 0 || a >= GW || b >= GH) return INF;
      return D[b * GW + a] / 3 * C;
    };

    // ── L2 · graffiti rings — one size, one purple, wrapping her and stepping outward
    x.font = `${WORD_FS}px "Permanent Marker"`;
    const wordW = x.measureText('Mixr').width;
    const GAP = 22;                          // words sit apart, not colliding
    const spots = [];
    for (let ring = RING_START; ring < MAXD; ring += RING_STEP) {
      const pts = [];
      for (let ang = 0; ang < Math.PI * 2; ang += Math.PI / 360) {
        const ca = Math.cos(ang), sa = Math.sin(ang);
        let hit = null;
        for (let t = 10; t < PAD + 2600; t += 8) {
          const X = cx0 + ca * t, Y = cy0 + sa * t;
          if (X < 40 - PAD || Y < 40 - PAD || X > W + PAD - 40 || Y > H + PAD - 40) break;
          if (dist(X, Y) >= ring) { hit = [X, Y]; break; }
        }
        if (hit) pts.push(hit);
      }
      let acc = 1e9, prev = null;
      for (const p of pts) {
        if (prev) acc += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
        prev = p;
        if (acc < wordW + GAP) continue;
        acc = 0;
        const [X, Y] = p;
        if (X < -380 || Y < -380 || X > W + 380 || Y > H + 380) continue; // off-sheet
        // tangent to the contour = gradient of the distance field, turned 90°
        const e = 7;
        const dx = dist(X + e, Y) - dist(X - e, Y), dy = dist(X, Y + e) - dist(X, Y - e);
        let rot = Math.atan2(dx, -dy);
        if (Math.cos(rot) < 0) rot += Math.PI;
        rot += (rnd() - .5) * .16;            // only slightly random — one steady hand
        const fade = .98 - .26 * ((ring - RING_START) / (MAXD - RING_START));
        spots.push({ x: X + (rnd() - .5) * 9, y: Y + (rnd() - .5) * 9, rot, fade, L: ring });
      }
    }

    // "iOS DJ App" is a MEMBER of the aura, not a caption: same orbit, same
    // tangent, same fade as its neighbours — only the colour and wording differ.
    x.font = `${TAG_FS}px "Permanent Marker"`;
    const tagW = x.measureText(TAG).width;
    let tagIdx = -1, tagBest = 1e9;
    spots.forEach((p, i) => {
      if (p.L > RING_START + RING_STEP * 2.4) return;
      const rr = p.rot + TAG_TILT;
      const half = tagW / 2 * Math.abs(Math.cos(rr)) + TAG_FS * .6 * Math.abs(Math.sin(rr));
      if (p.x - half < 70 || p.x + half > W - 70) return;   // must sit fully on the sheet
      if (p.y < 600 || p.y > 1080) return;
      const d = Math.hypot(p.x - TARGET.x, p.y - TARGET.y);
      if (d < tagBest) { tagBest = d; tagIdx = i; }
    });
    const tagSpot = spots[tagIdx];
    spots.forEach((p, i) => {
      if (i !== tagIdx) roughWord('Mixr', WORD_FS, GRAF, p.x, p.y, p.rot, p.fade);
    });

    // ── the wave-band system ────────────────────────────────────────
    const mdata = mk.getImageData(0, 0, W, H).data;
    const maskAt = (X, Y) => (X < 0 || Y < 0 || X >= W || Y >= H) ? 0 : mdata[((Y | 0) * W + (X | 0)) * 4 + 3];
    const yAt = (y0, t) => y0 + A * Math.sin(2 * Math.PI * t / L_WAVE + PH);
    const slopeAt = t => A * (2 * Math.PI / L_WAVE) * Math.cos(2 * Math.PI * t / L_WAVE + PH);

    // Anchor the stack so the HEAD band's TOPMOST row sits at her mid-scalp and
    // runs over her from there. The rest of that band passes BEHIND her, so it
    // disappears into her head and reappears past her silhouette — which is why
    // no face-clearance search is needed here any more.
    const stack = sh => {
      const r = [];
      for (let y = -BAND_GAP * 2 + sh; y < H + BAND_GAP * 2; y += BAND_GAP) r.push(y);
      return r;
    };
    const midScalp = headTop + gh * 0.05;
    const topOff = -(BAND_ROWS - 1) / 2 * LINE_H;          // where a band's row 0 sits
    const wantCentre = midScalp - topOff;                  // ...so row 0 lands on scalp
    const wantY0 = wantCentre - A * Math.sin(2 * Math.PI * cx0 / L_WAVE + PH);
    const shift = ((wantY0 % BAND_GAP) + BAND_GAP) % BAND_GAP;
    const rows = stack(shift);
    let headBand = 0, hbd = 1e9;
    rows.forEach((y0, i) => {
      const d = Math.abs(yAt(y0, cx0) - wantCentre);
      if (d < hbd) { hbd = d; headBand = i; }
    });

    // Only INDIVIDUAL rows ride in front of her. Enumerate every row of every
    // band by the height it actually crosses her at, sorted top to bottom.
    const frontRows = new Map();
    const mark = (i, r) => {
      if (r < 0 || r >= BAND_ROWS) return;
      const f = frontRows.get(i) || [];
      if (!f.includes(r)) { f.push(r); frontRows.set(i, f); }
    };
    const zone = (lo, hi) => {
      const out = [];
      rows.forEach((y0, i) => {
        for (let r = 0; r < BAND_ROWS; r++) {
          const y = yAt(y0, cx0) + (r - (BAND_ROWS - 1) / 2) * LINE_H;
          if (y > headTop + gh * lo && y < headTop + gh * hi) out.push({ i, r, y });
        }
      });
      return out.sort((p, q) => p.y - q.y);
    };

    mark(headBand, 0);                     // top row of the head band, on her scalp

    // Across her chest: every OTHER row, three of them. Adjacent rows read as one
    // fat stripe; skipping one leaves black dress showing between, so it reads as
    // three straps wound round her.
    const chest = zone(0.36, 0.64);
    if (chest.length) {
      const c0 = chest[chest.length - 1];
      mark(c0.i, c0.r); mark(c0.i, c0.r - 2); mark(c0.i, c0.r - 4);
    }

    // one through her torso...
    const torso = zone(0.62, 0.90);
    if (torso.length) {
      const t0 = torso[Math.floor(torso.length / 2)];
      mark(t0.i, t0.r);
    }

    // ...and the middle row of the lowest band still on the poster
    let bottomBand = -1, bottomY = -1e9;
    rows.forEach((y0, i) => { const y = yAt(y0, cx0); if (y < H - 40 && y > bottomY) { bottomY = y; bottomBand = i; } });
    if (bottomBand >= 0 && bottomBand !== headBand) mark(bottomBand, Math.floor(BAND_ROWS / 2));

    const WORD = 'MIXR', TRACK = 4;
    const band = (y0, keep, over) => {
      x.font = `700 ${MICRO_FS}px "Space Mono"`;
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.letterSpacing = '4px';
      for (let r = 0; r < BAND_ROWS; r++) {
        if (!keep(r)) continue;
        const off = (r - (BAND_ROWS - 1) / 2) * LINE_H;
        let t = -160, k = r * 2;             // stagger each row's phase
        while (t < W + 160) {
          const ch = WORD[k++ % WORD.length];
          const cw = x.measureText(ch).width;
          const cxp = t + cw / 2, cy = yAt(y0, cxp) + off;
          x.save(); x.translate(cxp, cy); x.rotate(Math.atan(slopeAt(cxp)));
          x.fillStyle = (over && maskAt(cxp, cy) > 110) ? LAV : BLACK;
          x.fillText(ch, 0, 0);
          x.restore();
          t += cw + TRACK;
        }
      }
      x.letterSpacing = '0px'; x.textAlign = 'start'; x.textBaseline = 'alphabetic';
    };

    // ── L3 · the bands that run BEHIND her
    rows.forEach((y0, i) => { const f = frontRows.get(i) || []; band(y0, r => !f.includes(r), false); });

    // ── L4 · the figure — a purple plate a hair off-register, then her
    const plate = document.createElement('canvas'); plate.width = W; plate.height = H;
    const pl = plate.getContext('2d');
    pl.drawImage(mask, 0, 0);
    pl.globalCompositeOperation = 'source-in';
    pl.fillStyle = GHOST; pl.fillRect(0, 0, W, H);
    x.save(); x.globalAlpha = .30; x.drawImage(plate, 9, 10); x.restore();
    x.drawImage(mask, 0, 0);                 // true black-and-white figure

    // ── L4b · the few rows that ride OVER her, going lavender as they cross
    rows.forEach((y0, i) => { const f = frontRows.get(i) || []; if (f.length) band(y0, r => f.includes(r), true); });

    // the aura's one white slot, drawn last so nothing buries it
    if (tagSpot) roughWord(TAG, TAG_FS, WHITE, tagSpot.x, tagSpot.y, tagSpot.rot + TAG_TILT, tagSpot.fade);

    grain(.055);
    return cv;
  };
})();
