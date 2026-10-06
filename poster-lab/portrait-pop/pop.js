// Portrait pop-outs lab. Eight directions for what is tucked under the About
// portrait and comes out when it tilts. Served by the site's Vite dev server:
//   http://localhost:5173/poster-lab/portrait-pop/index.html
// ?open=all   every option open, at rest (for stills)
// ?only=<id>  one option alone (for motion frames)
import { animate } from "motion";

const ART = "./art/";
const PHOTO = "/about/Profile%20picture.webp";
const PH = 400 / 3; // the photo is 100u x 133.3u
const STAR =
  "M12 2.6l2.75 5.75 6.3.8-4.62 4.37 1.2 6.25L12 16.7l-5.63 3.07 1.2-6.25L2.95 9.15l6.3-.8z";

const qs = new URLSearchParams(location.search);
const OPEN_ALL = qs.get("open") === "all";
const ROUND = document.body.dataset.round || "1";
const ONLY = qs.get("only");

// --- piece helpers ------------------------------------------------------------
// x, y: the piece's centre when open, in u from the photo's top-left. r: its
// angle when open. The tucked state is worked out (pulled in under the photo far
// enough to hide it) unless a piece says otherwise.
const gold = (s, w, h, x, y, r = 0, o = {}) => ({ kind: "gold", s, w, h, x, y, r, ...o });
const tis = (s, w, h, x, y, r = 0, o = {}) => ({ kind: "tissue", s, w, h, x, y, r, ...o });
const star = (i, w, x, y, r, o = {}) => ({ kind: "star", i, w, h: w, x, y, r, ...o });
const slot = (w, x, y, r, o = {}) => ({ kind: "slot", w, h: w, x, y, r, ...o });

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const rr = (a, b) => a + rnd() * (b - a);

/* Petals and sheets turn about their base: give the open centre from the base
   point, the length and the angle (0 = pointing up). */
const fromBase = (bx, by, h, deg) => {
  const a = (deg * Math.PI) / 180;
  return [bx + Math.sin(a) * (h / 2), by - Math.cos(a) * (h / 2)];
};

// --- the eight directions -----------------------------------------------------------
const OPTIONS = [
  {
    id: "flakes",
    n: "01",
    name: "Gilt flakes",
    blurb: "She was laid on a gilded page. Tilt the photo and torn gold leaf shows under its edges, catching the light.",
    spring: { stiffness: 340, damping: 19 },
    pieces: [
      // top-left cluster
      gold("g-leaf-1", 28, 22, -8, 5, -8),
      gold("g-leaf-4", 18, 14, 16, -8, 12),
      gold("g-shard-4", 10, 9, -11, 25, 18),
      gold("g-speck-1", 4, 3.5, -15, 9, 10),
      gold("g-speck-4", 3, 3, 4, -14, 0),
      gold("g-speck-2", 3.5, 4.5, 27, -11, -20),
      // bottom-right cluster
      gold("g-leaf-2", 26, 20, 107, 129, 10),
      gold("g-leaf-3", 20, 15, 86, 142, -14),
      gold("g-shard-7", 9, 12, 111, 110, 25),
      gold("g-speck-3", 5, 4, 115, 135, 35),
      gold("g-speck-1", 4, 3.5, 96, 149, -30),
      gold("g-speck-4", 3, 3, 72, 145, 0),
      // singles along the long edges
      gold("g-leaf-6", 15, 12, 105, 48, -12),
      gold("g-shard-2", 12, 15, -6, 90, 8),
      gold("g-shard-4", 10, 9, 36, 139, 14),
    ],
  },
  {
    id: "bunting",
    n: "02",
    name: "Bunting",
    blurb: "A party strung behind her photo. It springs up above the top edge and swings, every third pennant in gold leaf.",
    spring: { stiffness: 210, damping: 13 },
    bunting: {
      p0: [3, -34], c: [50, -6], p2: [97, -34],
      flags: ["g-pennant-1", "t-pennant-blush", "t-pennant-lilac", "g-pennant-2", "t-pennant-sky",
              "t-pennant-chart", "g-pennant-1", "t-pennant-peach", "t-pennant-lilac", "g-pennant-2"],
      size: [11, 13],
      drop: 58,
    },
    pieces: [],
  },
  {
    id: "streamers",
    n: "03",
    name: "Streamers",
    blurb: "The party popper's streamers, uncurling out from behind her: two in gold foil, the rest in tissue.",
    spring: { stiffness: 300, damping: 18 },
    streamers: [
      { s: [92, 20], deg: -24, len: 40, r: 4.6, loops: 3.6, col: "gold", w: 3.4 },
      { s: [93, 68], deg: 10, len: 36, r: 4.3, loops: 3.2, col: "#c4b1f1", w: 3.8 },
      { s: [9, 36], deg: 200, len: 38, r: 4.5, loops: 3.5, col: "#a3ccf1", w: 3.8 },
      { s: [8, 98], deg: 166, len: 34, r: 4.2, loops: 3.0, col: "gold", w: 3.4 },
      { s: [72, 7], deg: -74, len: 32, r: 4.0, loops: 2.8, col: "#f2a3b7", w: 3.6 },
      { s: [30, 127], deg: 106, len: 28, r: 3.9, loops: 2.4, col: "#f6bd9c", w: 3.6 },
      { s: [95, 118], deg: 38, len: 32, r: 4.0, loops: 2.8, col: "gold", w: 3.2 },
    ],
    pieces: [
      gold("g-dot-1", 4.5, 4.5, 133, -2, 0, { delay: 0.35 }), gold("g-tri-2", 6, 8, 131, 86, 30, { delay: 0.4 }),
      tis("t-dot-sky", 4.5, 4.5, -33, 14, 0, { delay: 0.38 }), gold("g-dot-2", 3.5, 3.5, -27, 116, 0, { delay: 0.42 }),
      tis("t-tri-blush-1", 7, 7, 86, -25, -20, { delay: 0.36 }), gold("g-speck-2", 3.5, 4.5, 22, 156, 15, { delay: 0.44 }),
      tis("t-dot-lilac", 4.5, 4.5, 124, 140, 0, { delay: 0.42 }),
    ],
  },
  {
    id: "stars",
    n: "04",
    name: "Star stamps",
    blurb: "The star card's gold leaf, peeking out like stickers. Live, only the stars you've found are gold; the rest wait as dotted outlines.",
    spring: { stiffness: 420, damping: 15 },
    pieces: [
      star(0, 18, -6, 14, -7),
      star(1, 18, 106, 8, 5),
      star(2, 18, 108, 76, -3),
      slot(18, -8, 108, 8),
      slot(18, 92, 142, -5),
    ],
  },
  {
    id: "pond",
    n: "05",
    name: "Lily pond",
    blurb: "The footer's pond, under her photo: gold-leaf and aqua pads drift out, and a lotus opens at the corner.",
    spring: { stiffness: 170, damping: 16 },
    pieces: (() => {
      const P = [
        gold("g-pad-1", 19, 19, 16, 142, 30),
        tis("t-pad-aqua-1", 17, 17, 44, 145, -40),
        gold("g-pad-3", 11, 11, 67, 142, 110),
        tis("t-pad-aqua-2", 12, 12, 90, 139, 200),
        gold("g-pad-2", 14, 14, 108, 122, 60),
        tis("t-pad-aqua-2", 12, 12, -9, 92, 15),
      ];
      const lotus = (bx, by, angs, tuck, sprites, h, w) =>
        angs.forEach((deg, k) => {
          const [x, y] = fromBase(bx, by, h, deg);
          const [tx, ty] = fromBase(tuck[0], tuck[1], h, 0);
          P.push(tis(sprites[k], w, h, x, y, deg, { origin: "50% 100%", tuck: { x: tx, y: ty, r: 0, s: 0.92 } }));
        });
      // back petals (peach) first, the front ones (blush) over them
      lotus(1, 131, [-84, -56, -28], [14, 118], ["t-lotus-6", "t-lotus-7", "t-lotus-8"], 17, 8);
      lotus(1, 131, [-70, -42, -14, 8], [14, 118], ["t-lotus-1", "t-lotus-2", "t-lotus-3", "t-lotus-4"], 17, 8);
      lotus(101, 96, [30, 58, 84], [86, 96], ["t-lotus-5", "t-lotus-2", "t-lotus-3"], 14, 6.6);
      return P;
    })(),
  },
  {
    id: "seal",
    n: "06",
    name: "Best in show",
    blurb: "A museum's prize, pinned behind the portrait: a gold-leaf seal with tissue tails swings out from the corner, a stamp at its heart.",
    spring: { stiffness: 260, damping: 14 },
    seal: { c: [104, 129], tuck: [72, 86], rot: [-38, 6] },
    pieces: [
      gold("g-tri-1", 7, 7, 120, 106, 20, { delay: 0.18 }),
      gold("g-tri-3", 8, 6, 84, 151, -30, { delay: 0.22 }),
      gold("g-dot-1", 4.5, 4.5, 124, 143, 0, { delay: 0.25 }),
      tis("t-tri-blush-1", 7, 7, 114, 156, 40, { delay: 0.2 }),
    ],
  },
  {
    id: "fan",
    n: "07",
    name: "Tissue fan",
    blurb: "A collage held behind her: torn tissue sheets fan out like a hand of cards, a sheet of gold leaf rising through the middle.",
    spring: { stiffness: 170, damping: 17 },
    pieces: [
      ...[["t-sheet-chart", 19, "tissue"], ["t-sheet-blush", 15, "tissue"], ["g-sheet", 11, "gold"],
          ["t-sheet-sky", 7, "tissue"], ["t-sheet-lilac", 3, "tissue"]].map(([sp, deg, kind], k) =>
        (kind === "gold" ? gold : tis)(sp, 80, 120, 52, 70, deg, {
          origin: "0% 100%", tuck: { x: 52, y: 70, r: 0, s: 1 }, sway: kind === "gold" ? 0.25 : 0.45, delay: k * 0.05,
        })),
    ],
  },
  {
    id: "halo",
    n: "08",
    name: "Confetti halo",
    blurb: "Today's tissue burst, caught mid-air: it rings the photo and floats there, gold flecks among the tissue, until you let go.",
    spring: { stiffness: 300, damping: 15 },
    pieces: (() => {
      seed = 11;
      const kinds = [
        ["t-tri-blush-1", 7, 7, "tissue"], ["g-tri-1", 7, 7, "gold"], ["t-square-sky", 5.5, 5.5, "tissue"],
        ["t-strip-lilac", 2.6, 11, "tissue"], ["g-dot-1", 4.5, 4.5, "gold"], ["t-tri-chart-2", 6, 8, "tissue"],
        ["t-dot-blush", 4.5, 4.5, "tissue"], ["g-speck-3", 5, 4, "gold"], ["t-tri-sky-1", 7, 7, "tissue"],
        ["t-strip-chart", 2.6, 11, "tissue"], ["g-tri-2", 6, 8, "gold"], ["t-square-lilac", 5.5, 5.5, "tissue"],
        ["t-tri-peach-2", 6, 8, "tissue"], ["g-square-1", 5, 5, "gold"], ["t-dot-sky", 4.5, 4.5, "tissue"],
        ["t-strip-blush", 2.6, 11, "tissue"], ["t-tri-lilac-1", 7, 7, "tissue"], ["g-speck-1", 4, 3.5, "gold"],
        ["t-square-chart", 5.5, 5.5, "tissue"], ["t-tri-aqua-2", 6, 8, "tissue"], ["g-dot-2", 3.5, 3.5, "gold"],
        ["t-dot-lilac", 4.5, 4.5, "tissue"], ["t-strip-sky", 2.6, 11, "tissue"], ["g-tri-4", 6.5, 6.5, "gold"],
        ["t-tri-blush-2", 6, 8, "tissue"], ["t-square-blush", 5.5, 5.5, "tissue"],
      ];
      const per = 2 * (100 + PH);
      return kinds.map(([s, w, h, kind], i) => {
        // walk the rim clockwise from the top-left, then step out from it
        let t = ((i + rr(-0.3, 0.3)) / kinds.length) * per;
        let x, y, nx, ny;
        if (t < 100) { x = t; y = 0; nx = 0; ny = -1; }
        else if ((t -= 100) < PH) { x = 100; y = t; nx = 1; ny = 0; }
        else if ((t -= PH) < 100) { x = 100 - t; y = PH; nx = 0; ny = 1; }
        else { t -= 100; x = 0; y = PH - t; nx = -1; ny = 0; }
        const d = rr(7, 17);
        const o = { delay: i * 0.012, float: true };
        const f = kind === "gold" ? gold : tis;
        const k = 1.22;
        return f(s, w * k, h * k, x + nx * d + rr(-2, 2), y + ny * d + rr(-2, 2), rr(-70, 70), o);
      });
    })(),
  },
];

// --- build ----------------------------------------------------------------------------
const grid = document.getElementById("grid");
if (ONLY) document.body.classList.add("only");

function el(tag, cls, parent) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (parent) parent.appendChild(e);
  return e;
}

function img(src, cls, parent) {
  const i = el("img", cls, parent);
  i.src = ART + src + ".webp";
  i.alt = "";
  i.decoding = "async";
  return i;
}

function makePiece(p, back, U) {
  const pc = el("div", `pc pc--${p.kind}`, back);
  pc.style.left = `${(p.x - p.w / 2) * U}px`;
  pc.style.top = `${(p.y - p.h / 2) * U}px`;
  pc.style.width = `${p.w * U}px`;
  pc.style.height = `${p.h * U}px`;
  if (p.origin) pc.style.transformOrigin = p.origin;
  if (p.z) pc.style.zIndex = p.z;
  if (p.opacity && p.opacity < 1) pc.style.opacity = p.opacity;
  const inner = el("div", "pc-in", pc);
  if (p.origin) inner.style.transformOrigin = p.origin;
  if (p.kind === "gold") {
    img(p.s, "rest", inner);
    p.lit = img(p.s + "-lit", "lit", inner);
  } else if (p.kind === "tissue") {
    img(p.s, "rest", inner);
  } else if (p.kind === "star") {
    const x = `${p.i * 25}%`;
    const a = el("div", "st", inner);
    a.style.backgroundPosition = `${x} 0%`;
    const b = el("div", "st st-lit", inner);
    b.style.backgroundPosition = `${x} 66.667%`;
    p.lit = b;
  } else if (p.kind === "curl") {
    inner.innerHTML = p.svg;
  } else if (p.kind === "slot") {
    inner.innerHTML = `<svg viewBox="0 0 24 24"><path d="${STAR}" fill="none" stroke="#b6bcc6" stroke-width="1.1" stroke-dasharray="1.2 1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  // tucked: pulled in under the photo far enough to be hidden, a little turned
  const reach = Math.hypot(p.w, p.h) / 2 + 1.5;
  const t = p.tuck || {
    x: Math.min(Math.max(p.x, reach), 100 - reach),
    y: Math.min(Math.max(p.y, reach), PH - reach),
    r: p.r + (p.r >= 0 ? -24 : 24),
    s: 0.88,
  };
  p.el = pc;
  p.inner = inner;
  p.tucked = { x: (t.x - p.x) * U, y: (t.y - p.y) * U, rotate: t.r ?? p.r, scale: t.s ?? 1 };
  p.open = { x: 0, y: 0, rotate: p.r, scale: 1 };
  animate(pc, OPEN_ALL ? p.open : p.tucked, { duration: 0 });
  return p;
}

/* Streamers are curled ribbon. The centreline loops as it travels (a
   trochoid) and droops a little; along it the ribbon twists once per loop, so it
   narrows where it turns edge-on and shows its darker back on the far side of
   each curl. Drawn as one quad per step, back faces first so the front of each
   loop crosses over the back, and revealed step by step from the end hidden
   under the photo: it unfurls. */
function ribbon(st, N = 170) {
  const a = (st.deg * Math.PI) / 180;
  const ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
  const turns = st.loops * 2 * Math.PI;
  const P = [], ph = [];
  for (let k = 0; k <= N; k++) {
    const t = k / N;
    const q = t * turns;
    const ax = t * st.len + st.r * 0.85 * Math.sin(q);
    const ay = st.r * (1 - Math.cos(q)) * (0.35 + 0.65 * t);
    P.push([st.s[0] + ux * ax + vx * ay, st.s[1] + uy * ax + vy * ay + (st.droop ?? 9) * t * t]);
    ph.push(q);
  }
  const nrm = P.map((_, k) => {
    const p0 = P[Math.max(0, k - 1)], p1 = P[Math.min(N, k + 1)];
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  });
  const segs = [];
  for (let k = 0; k < N; k++) {
    const c = Math.cos(ph[k]);
    const w0 = (st.w / 2) * (0.22 + 0.78 * Math.abs(Math.cos(ph[k])));
    const w1 = (st.w / 2) * (0.22 + 0.78 * Math.abs(Math.cos(ph[k + 1])));
    const [x0, y0] = P[k], [x1, y1] = P[k + 1];
    const [n0x, n0y] = nrm[k], [n1x, n1y] = nrm[k + 1];
    const pts = [
      [x0 + n0x * w0, y0 + n0y * w0], [x1 + n1x * w1, y1 + n1y * w1],
      [x1 - n1x * w1, y1 - n1y * w1], [x0 - n0x * w0, y0 - n0y * w0],
    ].map((v) => v[0].toFixed(2) + "," + v[1].toFixed(2)).join(" ");
    // front face catches the light; the back of the curl sits in shade
    const shade = c >= 0 ? 1 + 0.14 * c : 0.74 + 0.1 * -c;
    segs.push({ k, pts, front: c >= 0, shade });
  }
  return segs;
}

const tint = (hex, f) => {
  const n = (i) => Math.round(Math.min(255, parseInt(hex.slice(i, i + 2), 16) * f));
  return `rgb(${n(1)},${n(3)},${n(5)})`;
};

function build(opt) {
  const cell = el("section", "cell", grid);
  cell.dataset.opt = opt.id;
  const stage = el("div", "stage", cell);
  const fig = el("figure", "pp", stage);
  const back = el("div", "pp-back", fig);
  const photo = el("img", "pp-photo", fig);
  photo.src = PHOTO;
  photo.alt = "Pranavi Ram on the Brown University green.";
  const pl = el("div", "placard", cell);
  pl.innerHTML = `<b>${opt.n} — ${opt.name}</b><span>${opt.blurb}</span>`;

  const U = fig.clientWidth / 100;
  const pieces = opt.pieces.map((p) => makePiece({ ...p }, back, U));
  const extras = []; // {open(delay), close()} for groups

  if (opt.bunting) {
    const b = opt.bunting;
    const grp = el("div", "pc pc--group", back);
    Object.assign(grp.style, { left: "0", top: "0", width: "100%", height: "100%" });
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "pp-svg");
    svg.setAttribute("viewBox", "-20 -40 140 60");
    Object.assign(svg.style, { left: `${-20 * U}px`, top: `${-40 * U}px`, width: `${140 * U}px`, height: `${60 * U}px` });
    const thread = document.createElementNS(svgNS, "path");
    thread.setAttribute("d", `M${b.p0} Q${b.c} ${b.p2}`);
    thread.setAttribute("fill", "none");
    thread.setAttribute("stroke", "#9c8f7a");
    thread.setAttribute("stroke-width", "0.45");
    svg.appendChild(thread);
    grp.appendChild(svg);
    const B = (t, i) => (1 - t) ** 2 * b.p0[i] + 2 * (1 - t) * t * b.c[i] + t * t * b.p2[i];
    const D = (t, i) => 2 * (1 - t) * (b.c[i] - b.p0[i]) + 2 * t * (b.p2[i] - b.c[i]);
    const flags = b.flags.map((s, k) => {
      const t = 0.1 + (0.8 * k) / (b.flags.length - 1);
      const x = B(t, 0), y = B(t, 1);
      const ang = (Math.atan2(D(t, 1), D(t, 0)) * 180) / Math.PI;
      const [w, h] = b.size;
      const f = el("div", `pc pc--${s.startsWith("g-") ? "gold" : "tissue"}`, grp);
      Object.assign(f.style, { left: `${(x - w / 2) * U}px`, top: `${y * U}px`, width: `${w * U}px`, height: `${h * U}px`, transformOrigin: "50% 0" });
      const inner = el("div", "pc-in", f);
      inner.style.transformOrigin = "50% 0";
      img(s, "rest", inner);
      const lit = s.startsWith("g-") ? img(s + "-lit", "lit", inner) : null;
      animate(f, { rotate: ang }, { duration: 0 });
      return { el: f, inner, lit, ang, k };
    });
    for (const pin of [b.p0, b.p2]) {
      const p = makePiece(gold("g-dot-2", 3.5, 3.5, pin[0], pin[1], 0, { tuck: { x: pin[0], y: pin[1], r: 0, s: 1 } }), grp, U);
      pieces.push({ ...p, passive: true });
    }
    animate(grp, { y: OPEN_ALL ? 0 : b.drop * U }, { duration: 0 });
    extras.push({
      open: () => {
        animate(grp, { y: 0 }, { type: "spring", ...opt.spring });
        flags.forEach((f) => {
          animate(f.inner, { rotate: [0, 10, -7, 4, -2, 0] }, { duration: 1.6, delay: 0.18 + f.k * 0.035, ease: "easeOut" });
          if (f.lit) animate(f.lit, { opacity: [0, 0.95, 0.35] }, { duration: 1.1, delay: 0.2 + f.k * 0.035, times: [0, 0.35, 1] });
        });
      },
      close: () => {
        animate(grp, { y: b.drop * U }, { duration: 0.34, ease: [0.5, 0, 0.75, 0] });
        flags.forEach((f) => f.lit && animate(f.lit, { opacity: 0 }, { duration: 0.2 }));
      },
      lights: flags.filter((f) => f.lit).map((f) => ({ el: f.el, lit: f.lit })),
      openNow: () => flags.forEach((f) => f.lit && (f.lit.style.opacity = "0.35")),
    });
  }

  if (opt.streamers) {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "pp-svg");
    svg.setAttribute("viewBox", "-60 -60 220 253.3");
    Object.assign(svg.style, { left: `${-60 * U}px`, top: `${-60 * U}px`, width: `${220 * U}px`, height: `${253.3 * U}px` });
    svg.innerHTML = `<defs>
      <pattern id="gold-${opt.id}" patternUnits="userSpaceOnUse" width="40" height="40"><image href="${ART}g-tile.webp" width="40" height="40"/></pattern>
      <filter id="lift-${opt.id}" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="0.45" stdDeviation="0.5" flood-color="#3c2800" flood-opacity="0.24"/></filter>
    </defs>`;
    back.appendChild(svg);
    const streams = opt.streamers.map((st, n) => {
      const g = document.createElementNS(svgNS, "g");
      g.style.transformOrigin = `${st.s[0]}px ${st.s[1]}px`;
      g.style.transformBox = "view-box";
      if (st.col === "gold") g.setAttribute("filter", `url(#lift-${opt.id})`);
      else g.setAttribute("class", "tissue-stroke");
      const segs = ribbon(st);
      const order = [...segs.filter((q) => !q.front), ...segs.filter((q) => q.front)];
      const nodes = [];
      for (const q of order) {
        const add = (fill, extra = {}) => {
          const poly = document.createElementNS(svgNS, "polygon");
          poly.setAttribute("points", q.pts);
          poly.setAttribute("fill", fill);
          // a hair of stroke in the same fill closes the seams between steps
          poly.setAttribute("stroke", fill);
          poly.setAttribute("stroke-width", "0.12");
          poly.setAttribute("stroke-linejoin", "round");
          for (const [a, v] of Object.entries(extra)) poly.setAttribute(a, v);
          g.appendChild(poly);
          nodes.push({ k: q.k, el: poly });
        };
        if (st.col === "gold") {
          add(`url(#gold-${opt.id})`);
          if (q.shade < 1) add("#2a1a00", { "fill-opacity": ((1 - q.shade) * 0.95).toFixed(3), stroke: "none" });
          else add("#fff4cf", { "fill-opacity": ((q.shade - 1) * 1.7).toFixed(3), stroke: "none" });
        } else {
          add(tint(st.col, q.shade), { "fill-opacity": "0.92" });
        }
      }
      svg.appendChild(g);
      const N = segs.length;
      const show = (m) => nodes.forEach((o) => (o.el.style.visibility = o.k < m ? "visible" : "hidden"));
      show(OPEN_ALL ? N : 0);
      return { g, nodes, N, show, n };
    });
    let raf = 0;
    const run = (to, dur, stagger) => {
      cancelAnimationFrame(raf);
      const t0 = performance.now();
      const from = streams.map((q) => q.m ?? 0);
      const tick = (now) => {
        let busy = false;
        streams.forEach((q, i) => {
          const t = Math.min(1, Math.max(0, (now - t0 - i * stagger * 1000) / (dur * 1000)));
          if (t < 1) busy = true;
          const e = to ? 1 - Math.pow(1 - t, 3) : t * t;   // out on the way out, in on the way back
          q.m = from[i] + (to * q.N - from[i]) * e;
          q.show(Math.round(q.m));
        });
        if (busy) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    streams.forEach((q) => (q.m = OPEN_ALL ? q.N : 0));
    extras.push({
      open: () => {
        run(1, 0.85, 0.05);
        // a whip: each ribbon swings past where it settles
        streams.forEach((q, i) => animate(q.g, { rotate: [-14, 5, 0] }, { duration: 0.9, delay: i * 0.05, ease: "easeOut" }));
      },
      close: () => run(0, 0.32, 0.01),
      lights: [],
      openNow: () => {},
    });
  }

  if (opt.seal) {
    const s = opt.seal;
    const grp = el("div", "pc pc--group", back);
    Object.assign(grp.style, { left: "0", top: "0", width: "100%", height: "100%", transformOrigin: `${s.c[0]}% ${(s.c[1] / PH) * 100}%` });
    const [cx, cy] = s.c;
    const kids = [
      tis("t-tail-lilac", 7.5, 26, cx - 5, cy + 13, 14, { origin: "50% 0" }),
      tis("t-tail-blush", 7.5, 26, cx + 4, cy + 14, -12, { origin: "50% 0" }),
      gold("g-rosette", 30, 30, cx, cy, 0),
      gold("g-button", 12, 12, cx, cy, 0),
      star(2, 7, cx, cy, -6),
    ].map((p) => makePiece({ ...p, tuck: { x: p.x, y: p.y, r: p.r, s: 1 } }, grp, U));
    pieces.push(...kids.map((k) => ({ ...k, passive: true })));
    const tuck = { x: (s.tuck[0] - cx) * U, y: (s.tuck[1] - cy) * U, rotate: s.rot[0], scale: 0.92 };
    animate(grp, OPEN_ALL ? { x: 0, y: 0, rotate: s.rot[1], scale: 1 } : tuck, { duration: 0 });
    const tails = kids.slice(0, 2);
    extras.push({
      open: () => {
        animate(grp, { x: 0, y: 0, rotate: s.rot[1], scale: 1 }, { type: "spring", ...opt.spring });
        tails.forEach((t, k) => animate(t.inner, { rotate: [0, k ? -9 : 9, k ? 5 : -5, 0] }, { duration: 1.4, delay: 0.2, ease: "easeOut" }));
      },
      close: () => animate(grp, tuck, { duration: 0.34, ease: [0.5, 0, 0.75, 0] }),
      lights: [],
      openNow: () => {},
    });
  }

  // --- behaviour ---
  const active = pieces.filter((p) => !p.passive);
  const lights = () => [
    ...pieces.filter((p) => p.lit).map((p) => ({ el: p.el, lit: p.lit })),
    ...extras.flatMap((e) => e.lights),
  ];
  const sways = [];
  let open = false;
  let glintUntil = 0;

  const startSway = () => {
    pieces.forEach((p, i) => {
      if (p.kind === "slot") return;
      const amp = p.sway ?? (p.kind === "tissue" ? 2.4 : 1.2);
      const dur = (ROUND === "3" || ROUND === "4" || ROUND === "5" ? 5.5 : 2.6) + ((i * 0.37) % 1.6);
      // null: start from wherever the piece is, so nothing snaps
      const drift = ROUND === "3" || ROUND === "4" || ROUND === "5" ? 0.18 : ROUND === "2" ? 0.45 : 0.9;
      const keys = p.float
        ? { rotate: [null, amp * 1.6, 0, -amp * 1.6, 0], y: [null, -drift * U, 0, drift * U, 0] }
        : { rotate: [null, amp, 0, -amp, 0] };
      sways.push(animate(p.inner, keys, { duration: dur, repeat: Infinity, ease: "easeInOut", delay: (i % 5) * 0.11 }));
    });
  };
  const stopSway = () => {
    sways.splice(0).forEach((a) => a.stop());
    pieces.forEach((p) => animate(p.inner, { rotate: 0, y: 0 }, { duration: 0.25 }));
  };

  const doOpen = () => {
    if (open) return;
    open = true;
    animate(photo, { rotate: -3, scale: 1.05, y: -6 }, opt.glide ? PHOTO_GLIDE : { type: "spring", stiffness: 260, damping: 16 });
    active.forEach((p, i) => {
      const delay = p.delay ?? i * 0.028;
      animate(p.el, p.open, opt.glide
        ? { type: "spring", bounce: 0, duration: p.dur ?? 0.85, delay }
        : { type: "spring", ...(p.spring || opt.spring), delay });
      if (p.lit) animate(p.lit, { opacity: [0, 0.95, 0.35] }, { duration: 1.1, delay: delay + 0.12, times: [0, 0.35, 1] });
    });
    pieces.forEach((p) => p.passive && p.lit &&
      animate(p.lit, { opacity: [0, 0.95, 0.35] }, { duration: 1.1, delay: 0.16, times: [0, 0.35, 1] }));
    extras.forEach((e) => e.open());
    glintUntil = performance.now() + 1300;
    setTimeout(() => open && startSway(), 900);
  };
  const doClose = () => {
    if (!open) return;
    open = false;
    stopSway();
    animate(photo, { rotate: 0, scale: 1, y: 0 }, opt.glide ? PHOTO_GLIDE : { type: "spring", stiffness: 260, damping: 16 });
    active.forEach((p, i) =>
      animate(p.el, p.tucked, opt.glide
        ? { type: "spring", bounce: 0, duration: 0.5, delay: (active.length - 1 - i) * 0.004 }
        : { duration: 0.32, ease: [0.5, 0, 0.75, 0], delay: (active.length - 1 - i) * 0.008 }));
    pieces.forEach((p) => p.lit && animate(p.lit, { opacity: 0 }, { duration: 0.2 }));
    extras.forEach((e) => e.close());
  };

  // the cursor is a lamp: gold nearest it flares
  fig.addEventListener("pointermove", (e) => {
    if (!open || performance.now() < glintUntil) return;
    for (const { el: pe, lit } of lights()) {
      const r = pe.getBoundingClientRect();
      const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
      lit.style.opacity = (0.2 + 0.75 * Math.exp(-((d / 130) ** 2))).toFixed(3);
    }
  });
  if (!OPEN_ALL) {
    fig.addEventListener("pointerenter", doOpen);
    fig.addEventListener("pointerleave", doClose);
    fig.addEventListener("click", () => (open ? doClose() : doOpen()));
  }

  if (OPEN_ALL) {
    open = true;
    animate(photo, { rotate: -3, scale: 1.05, y: -6 }, { duration: 0 });
    pieces.forEach((p) => p.lit && (p.lit.style.opacity = "0.35"));
    extras.forEach((e) => e.openNow());
  }
}

// --- round 2: abundant ----------------------------------------------------------------
/* Abundant bursts. Pieces all round the frame in three layers: an inner ring of
   big pieces whose centres sit on the edge, so about half of each stays tucked
   under the photo; a middle ring mostly out; an outer scatter of small pieces
   flung furthest. Each starts deep under the photo, small and turned, and bursts
   out on a bouncy spring, inner layer first, so it reads as one pop rippling
   outward. Triangles point the way they were flung; hearts stay near upright. */
function mulberry(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// a point on the photo's rim (corners rounded by rc), and the outward normal there
function rim(t, rc = 9) {
  const W = 100, H = PH;
  const straight = [W - 2 * rc, H - 2 * rc, W - 2 * rc, H - 2 * rc];
  const arc = (Math.PI / 2) * rc;
  const total = straight.reduce((a, b) => a + b, 0) + 4 * arc;
  let d = (((t % 1) + 1) % 1) * total;
  const corners = [[W - rc, rc], [W - rc, H - rc], [rc, H - rc], [rc, rc]];
  const starts = [[rc, 0], [W, rc], [W - rc, H], [0, H - rc]];
  const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  const norms = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  for (let i = 0; i < 4; i++) {
    if (d <= straight[i]) {
      return { x: starts[i][0] + dirs[i][0] * d, y: starts[i][1] + dirs[i][1] * d, nx: norms[i][0], ny: norms[i][1] };
    }
    d -= straight[i];
    if (d <= arc) {
      const a0 = Math.atan2(norms[i][1], norms[i][0]);
      const a1 = a0 + (d / arc) * (Math.PI / 2);
      const c = corners[i];
      return { x: c[0] + Math.cos(a1) * rc, y: c[1] + Math.sin(a1) * rc, nx: Math.cos(a1), ny: Math.sin(a1) };
    }
    d -= arc;
  }
  return { x: rc, y: 0, nx: 0, ny: -1 };
}

const RIM_TOTAL = 2 * (100 + PH) - 8 * 9 + 2 * Math.PI * 9;
const CORNER_T = (() => {
  // the rim parameter at the middle of each rounded corner
  const arc = (Math.PI / 2) * 9;
  const st = [100 - 18, PH - 18, 100 - 18, PH - 18];
  let acc = 0;
  return st.map((len) => { acc += len; const mid = (acc + arc / 2) / RIM_TOTAL; acc += arc; return mid; });
})();

const COLS = { sblush: "#f9a2c6", slilac: "#c3a8f7", ssky: "#98cdfa", schart: "#c3e57e", speach: "#ffbb94", saqua: "#8fe3c4", vblush: "#ee6e98", vlilac: "#9a86e2", vsky: "#4da6e0", vchart: "#bcd43c", vpeach: "#f5966a", vaqua: "#4cc0a0", lpink: "#ee6e98", lgreen: "#4cc0a0", lblue: "#4da6e0", lviolet: "#9a86e2", blush: "#f2a3b7", lilac: "#c4b1f1", sky: "#a3ccf1", chart: "#d7e26c", peach: "#f6bd9c", aqua: "#93d2c7" };

function curlSpec(R, col, size, textured = false, geom = null) {
  const st = { s: [0, 0], deg: 0, len: 9 + R() * 6, r: 1.8 + R() * 0.9, loops: 1.6 + R() * 1.2, w: 1.7 + R() * 0.5, droop: 1.5 };
  if (geom) Object.assign(st, geom);
  // A streamer stays a narrow ribbon however big it curls: past ~2.4x the
  // ribbon stops widening (it read as tubes), and big curls get more loops.
  if (size > 2.4 && !geom) {
    st.w *= 2.4 / size;
    st.loops += 0.5 * (size - 2.4);
    st.len *= 1 + 0.06 * (size - 2.4);
  }
  const segs = ribbon(st, 90);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  segs.forEach((q) => q.pts.split(" ").forEach((v) => {
    const [x, y] = v.split(",").map(Number);
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }));
  const pad = 0.4;
  x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
  const id = "c" + Math.floor(R() * 1e9).toString(36);
  const order = [...segs.filter((q) => !q.front), ...segs.filter((q) => q.front)];
  const polys = order.map((q) => {
    if (col === "gold") {
      const ov = q.shade < 1
        ? `<polygon points="${q.pts}" fill="#2a1a00" fill-opacity="${((1 - q.shade) * 0.95).toFixed(3)}"/>`
        : `<polygon points="${q.pts}" fill="#fff4cf" fill-opacity="${((q.shade - 1) * 1.7).toFixed(3)}"/>`;
      return `<polygon points="${q.pts}" fill="url(#${id})" stroke="url(#${id})" stroke-width="0.1"/>` + ov;
    }
    const f = tint(COLS[col], q.shade);
    return `<polygon points="${q.pts}" fill="${f}" stroke="${f}" stroke-width="0.1" fill-opacity="0.92"/>`;
  }).join("");
  // big tissue curls wear the crumpled texture too, multiplied over the twist shading
  const crumple = textured && col !== "gold"
    ? `<g style="mix-blend-mode:multiply">${order.map((q) => `<polygon points="${q.pts}" fill="url(#t${id})"/>`).join("")}</g>` : "";
  const defs = col === "gold"
    ? `<defs><pattern id="${id}" patternUnits="userSpaceOnUse" width="20" height="20"><image href="${ART}g-tile.webp" width="20" height="20"/></pattern></defs>`
    : textured
      ? `<defs><pattern id="t${id}" patternUnits="userSpaceOnUse" width="12" height="12"><image href="${ART}t-crumple-tile.webp" width="12" height="12"/></pattern></defs>` : "";
  const w = (x1 - x0) * size, h = (y1 - y0) * size;
  return {
    kind: "curl", tissueBlend: col !== "gold", w, h,
    svg: `<svg viewBox="${x0.toFixed(2)} ${y0.toFixed(2)} ${(x1 - x0).toFixed(2)} ${(y1 - y0).toFixed(2)}" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible${col === "gold" ? ";filter:drop-shadow(0 0.6px 0.6px rgba(60,40,0,.25))" : ";mix-blend-mode:multiply"}">${defs}${polys}${crumple}</svg>`,
  };
}

/* shape vocabulary: [weight, name, w, h, kind, type] */
const SH = {
  tTri: (c, i = 1) => [`t-tri-${c}-${i}`, i === 2 ? 6 : i === 3 ? 8 : 7, i === 2 ? 8 : i === 3 ? 8 : 7, "tissue", "tri"],
  gTri: (i) => [`g-tri-${i}`, 7, 7, "gold", "tri"],
  tHeart: (c, i = 1) => [`t-heart-${c}-${i}`, 8, 7.4, "tissue", "heart"],
  gHeart: (i) => [`g-heart-${i}`, 8, 7.4, "gold", "heart"],
  tSquare: (c) => [`t-square-${c}`, 5.5, 5.5, "tissue", "sq"],
  tDot: (c) => [`t-dot-${c}`, 4.5, 4.5, "tissue", "dot"],
  tStrip: (c) => [`t-strip-${c}`, 2.6, 11, "tissue", "strip"],
  gDot: (i) => [`g-dot-${i}`, i === 3 ? 5.5 : i === 1 ? 4.5 : 3.5, i === 3 ? 5.5 : i === 1 ? 4.5 : 3.5, "gold", "dot"],
  gSparkle: (i) => [`g-sparkle-${i}`, [7, 5.5, 4][i - 1], [7, 5.5, 4][i - 1], "gold", "sparkle"],
  gStrip: (i) => [`g-strip-${i}`, 2.6, 10, "gold", "strip"],
  gSquare: (i) => [`g-square-${i}`, 5, 5, "gold", "sq"],
  gFlake: (i) => [`g-shard-${i}`, ...[[16, 12], [12, 15], [20, 13], [10, 9], [14, 11], [18, 16], [9, 12], [13, 10], [11, 14]][i - 1].map((v) => v * 0.55), "gold", "flake"],
  curl: (c) => ["curl:" + c, 0, 0, c === "gold" ? "gold" : "tissue", "curl"],
};
const ALL = ["blush", "lilac", "sky", "chart", "peach", "aqua"];
const each = (fn, list = ALL) => list.map(fn);

function burst({ seed, layers, palette, cornerShare = 0.32, spring }) {
  const R = mulberry(seed);
  const bag = [];
  palette.forEach(([w, items]) => items.forEach((it) => bag.push([w / items.length, it])));
  const total = bag.reduce((a, e) => a + e[0], 0);
  const pick = () => {
    let x = R() * total;
    for (const e of bag) if ((x -= e[0]) <= 0) return e[1];
    return bag[bag.length - 1][1];
  };
  const out = [];
  layers.forEach((L, li) => {
    for (let i = 0; i < L.n; i++) {
      let t;
      if (R() < cornerShare) t = CORNER_T[Math.floor(R() * 4)] + (R() - 0.5) * 0.07;
      else t = (i + R() * 0.9) / L.n + li * 0.137;
      const { x, y, nx, ny } = rim(t);
      const d = L.d[0] + R() * (L.d[1] - L.d[0]);
      const [name, bw, bh, kind, type] = pick();
      const sc = L.scale * (0.82 + R() * 0.36);
      const out_ = Math.atan2(ny, nx) * 180 / Math.PI;
      let rot;
      if (type === "heart") rot = (R() - 0.5) * 56;
      else if (type === "sparkle") rot = (R() - 0.5) * 30;
      else if (type === "tri") rot = out_ + 90 + (R() - 0.5) * 80;
      else rot = (R() - 0.5) * 220;
      const px = x + nx * d + (R() - 0.5) * L.jit * 2;
      const py = y + ny * d + (R() - 0.5) * L.jit * 2;
      let spec;
      if (type === "curl") {
        spec = curlSpec(R, name.split(":")[1], sc);
        spec.s = null;
      } else spec = { s: name, w: bw * sc, h: bh * sc, kind };
      // tucked: further in along the normal, so the burst travels; small and turned
      const back = d + 7 + R() * 9;
      const reach = Math.hypot(spec.w, spec.h) / 2 + 1;
      const tx = Math.min(Math.max(px - nx * back, reach), 100 - reach);
      const ty = Math.min(Math.max(py - ny * back, reach), PH - reach);
      out.push({
        ...spec, x: px, y: py, r: rot,
        tuck: { x: tx, y: ty, r: rot + (R() - 0.5) * 140, s: 0.45 },
        delay: L.delay + R() * L.spread,
        float: li > 0, z: 3 - li,
        spring: spring && li === 2 ? { ...spring, damping: spring.damping - 2 } : undefined,
      });
    }
  });
  return out;
}

/* A bursting frame: three rings packed into a tight band round the photo. The
   inner ring's centres sit on the edge, so each piece stays half tucked under;
   nothing travels further out than ~14u. The springs overshoot, so the burst
   flies past the band and settles back into it. */
const LAYERS = (k = 1) => [
  { n: Math.round(46 * k), d: [-3, 1.5], scale: 1.8, jit: 1.2, delay: 0, spread: 0.07 },
  { n: Math.round(62 * k), d: [1, 6], scale: 1.4, jit: 1.5, delay: 0.03, spread: 0.09 },
  { n: Math.round(38 * k), d: [5, 10], scale: 0.95, jit: 1.8, delay: 0.06, spread: 0.12 },
];

const ROUND2 = [
  {
    id: "party", n: "A", name: "Party burst",
    blurb: "Everything at once: tissue triangles, hearts, squares, dots and strips, curled ribbon, gold-leaf triangles, hearts and sparkles, in three rings, the inner ring still half under her photo.",
    spring: { stiffness: 300, damping: 11 },
    pieces: burst({
      seed: 21, layers: LAYERS(1), spring: { stiffness: 300, damping: 11 },
      palette: [
        [30, each((c) => SH.tTri(c, 1)).concat(each((c) => SH.tTri(c, 3)))],
        [15, each((c) => SH.tHeart(c, 1), ["blush", "lilac", "peach", "sky", "chart"])],
        [11, [5, 6, 7, 8, 9, 10].map(SH.gTri)],
        [6, [1, 2, 3, 4].map(SH.gHeart)],
        [8, each(SH.tSquare)], [8, each(SH.tDot)], [8, each(SH.tStrip)],
        [5, [1, 2, 3].map(SH.gDot)], [7, [1, 2, 3].map(SH.gSparkle)], [3, [1, 2, 3].map(SH.gStrip)],
        [7, ["blush", "lilac", "sky", "gold", "peach", "gold"].map(SH.curl)],
      ],
    }),
  },
  {
    id: "hearts", n: "B", name: "Sweetheart",
    blurb: "Hearts lead: tissue hearts in blush, peach and lilac with gold-leaf hearts among them, sparkles and a few dots between.",
    spring: { stiffness: 300, damping: 11 },
    pieces: burst({
      seed: 34, layers: LAYERS(0.95), spring: { stiffness: 300, damping: 11 },
      palette: [
        [44, ["blush", "peach", "lilac", "blush", "peach", "chart"].map((c, i) => SH.tHeart(c, (i % 2) + 1))],
        [16, [1, 2, 3, 4].map(SH.gHeart)],
        [12, [1, 2, 3].map(SH.gSparkle)],
        [9, each(SH.tDot, ["blush", "peach", "lilac"])], [5, [1, 2, 3].map(SH.gDot)],
        [8, each((c) => SH.tTri(c, 1), ["blush", "lilac", "peach"])],
        [5, ["blush", "gold", "peach"].map(SH.curl)],
      ],
    }),
  },
  {
    id: "gilded", n: "C", name: "Gilded",
    blurb: "Gold leads, like the painting: leaf triangles, flakes, hearts, strips and sparkles, with tissue in peach, chartreuse and blush as the accent.",
    spring: { stiffness: 300, damping: 11 },
    pieces: burst({
      seed: 55, layers: LAYERS(1), spring: { stiffness: 300, damping: 11 },
      palette: [
        [22, [5, 6, 7, 8, 9, 10, 1, 2].map(SH.gTri)],
        [12, [1, 3, 4, 5, 8].map(SH.gFlake)],
        [12, [1, 2, 3].map(SH.gSparkle)], [8, [1, 2, 3, 4].map(SH.gHeart)],
        [8, [1, 2, 3].map(SH.gStrip)], [6, [1, 2, 3].map(SH.gDot)], [3, [1, 2].map(SH.gSquare)],
        [16, [SH.tTri("peach", 3), SH.tTri("chart", 1), SH.tTri("blush", 3), SH.tHeart("peach", 2), SH.tDot("chart"), SH.tStrip("peach")]],
        [5, ["gold", "gold", "peach"].map(SH.curl)],
      ],
    }),
  },
  {
    id: "triangles", n: "D", name: "Pennant burst",
    blurb: "Triangles only, almost: every colour of tissue and gold leaf, each pointing the way it was flung, so the frame radiates.",
    spring: { stiffness: 300, damping: 11 },
    pieces: burst({
      seed: 89, layers: LAYERS(1.05), cornerShare: 0.26, spring: { stiffness: 300, damping: 11 },
      palette: [
        [52, each((c) => SH.tTri(c, 1)).concat(each((c) => SH.tTri(c, 3)), each((c) => SH.tTri(c, 2)))],
        [24, [5, 6, 7, 8, 9, 10, 1, 2, 3, 4].map(SH.gTri)],
        [8, each(SH.tDot)], [6, [1, 2, 3].map(SH.gDot)], [6, each(SH.tStrip)],
      ],
    }),
  },
  {
    id: "curls", n: "E", name: "Streamer party",
    blurb: "The popper's curls lead: curled ribbon in tissue and gold foil spills out all round, confetti triangles, hearts and sparkles caught among them.",
    spring: { stiffness: 300, damping: 11 },
    pieces: burst({
      seed: 144, layers: LAYERS(0.95), spring: { stiffness: 300, damping: 11 },
      palette: [
        [30, ["blush", "lilac", "sky", "gold", "peach", "chart", "gold", "aqua"].map(SH.curl)],
        [18, each((c) => SH.tTri(c, 1)).concat([5, 6, 7, 8].map(SH.gTri))],
        [10, each((c) => SH.tHeart(c, 1), ["blush", "lilac", "peach"]).concat([SH.gHeart(1)])],
        [9, [1, 2, 3].map(SH.gSparkle)], [9, each(SH.tDot)], [8, each(SH.tStrip)], [4, [1, 2, 3].map(SH.gDot)],
      ],
    }),
  },
];

// --- round 3: D, refined ------------------------------------------------------------------
/* Pennant burst, refined to her notes: tissue 2-3x bigger, a bigger and airier
   frame, real crumpled-tissue texture, and motion that blooms without bouncing.

   Motion: critically damped springs (bounce 0). Each piece moves with weight
   and eases to a stop, never past it; the further a ring travels the longer it
   takes, so the frame unfolds from the inside out. The photo tilts on the same
   spring. Leaving, everything slides home a little quicker. */
const PHOTO_GLIDE = { type: "spring", bounce: 0, duration: 0.7 };
let PEN_T = ["blush", "lilac", "sky", "chart", "peach", "aqua"];
const PEN_SIZE = [[24, 30], [28, 26], [22, 32], [26, 28], [25, 29]];

function pennantFrame({ seed, k, rings, goldShare = 0.22, spacing = 0.6 }) {
  const R = mulberry(seed);
  const placed = [];
  const out = [];
  let colour = Math.floor(R() * PEN_T.length);
  rings.forEach((ring, li) => {
    let made = 0, tries = 0;
    const offset = R();
    while (made < ring.n && tries < ring.n * 80) {
      tries++;
      const t = (offset + (made + R() * 0.8) / ring.n) % 1;
      const { x, y, nx, ny } = rim(t, 12);
      const gold = R() < goldShare;
      const v = 1 + Math.floor(R() * (gold ? 5 : 4));
      const [bw, bh] = PEN_SIZE[v - 1];
      const sc = k * ring.scale * (0.86 + R() * 0.28);
      const w = bw * sc, h = bh * sc;
      const d = h * (ring.d[0] + R() * (ring.d[1] - ring.d[0]));
      const px = x + nx * d, py = y + ny * d;
      const r0 = 0.4 * Math.max(w, h);
      if (placed.some((q) => Math.hypot(q.x - px, q.y - py) < spacing * (q.r + r0))) continue;
      placed.push({ x: px, y: py, r: r0 });
      const rot = (Math.atan2(ny, nx) * 180) / Math.PI + 90 + (R() - 0.5) * 44;
      let s;
      if (gold) s = `g-pen-${v}`;
      else { colour = (colour + 1 + Math.floor(R() * 2)) % PEN_T.length; s = `t-pen-${PEN_T[colour]}-${v}`; }
      const back = d + h * 0.45 + 6;
      const reach = Math.hypot(w, h) / 2 + 1;
      out.push({
        kind: gold ? "gold" : "tissue", s, w, h, x: px, y: py, r: rot,
        tuck: {
          x: Math.min(Math.max(px - nx * back, reach), 100 - reach),
          y: Math.min(Math.max(py - ny * back, reach), PH - reach),
          r: rot + (R() < 0.5 ? -18 : 18), s: 0.72,
        },
        delay: ring.delay + R() * 0.08,
        dur: ring.dur,
        z: 3 - li, sway: 0.5, float: true,
      });
      made++;
    }
  });
  return out;
}

const PEN_RINGS = (n) => [
  { n: n[0], scale: 0.46, d: [0.02, 0.18], delay: 0, dur: 0.75 },
  { n: n[1], scale: 0.36, d: [0.4, 0.62], delay: 0.06, dur: 0.85 },
  { n: n[2], scale: 0.25, d: [0.72, 1.02], delay: 0.12, dur: 0.95 },
];

const ROUND3 = [
  {
    id: "pen2", n: "D", name: "Pennant burst, 2x",
    blurb: "Tissue twice the size, spaced so each sheet reads: crumpled tissue you can see through, gold leaf among it, every pennant pointing out. Blooms out, no bounce.",
    glide: true,
    pieces: pennantFrame({ seed: 301, k: 2, rings: PEN_RINGS([16, 17, 13]) }),
  },
  {
    id: "pen3", n: "D", name: "Pennant burst, 3x",
    blurb: "Three times the size, fewer and bolder: big crumpled-tissue pennants and gold-leaf ones, the inner ring's bases still tucked under her photo.",
    glide: true,
    pieces: pennantFrame({ seed: 307, k: 3, rings: PEN_RINGS([11, 12, 10]) }),
  },
];

// --- round 4: A and E, big --------------------------------------------------------------
/* Party burst (A) and Streamer party (E) at 2x and 3x, on D's terms: big
   crumpled tissue you can see through, gold leaf among it, a bigger airier
   frame with every piece spaced so it reads, and the same zero-bounce bloom. */
const BIG = {
  tri: { t: (c, i) => `t-btri-${c}-${i}`, n: 3, w: 24, h: 24, rot: "any" },
  heart: { t: (c, i) => `t-bheart-${c}-${i}`, n: 2, w: 26, h: 24, rot: "upright" },
  sq: { t: (c, i) => `t-bsq-${c}-${i}`, n: 2, w: 20, h: 20, rot: "any" },
  dot: { t: (c) => `t-bdot-${c}`, n: 1, w: 18, h: 18, rot: "any" },
  strip: { t: (c) => `t-bstrip-${c}`, n: 1, w: 7, h: 30, rot: "any" },
  gtri: { g: (i) => `g-btri-${i}`, n: 4, w: 24, h: 24, rot: "any" },
  gheart: { g: (i) => `g-bheart-${i}`, n: 3, w: 26, h: 24, rot: "upright" },
  gspark: { g: (i) => `g-bsparkle-${i}`, n: 2, w: 22, h: 22, rot: "spark" },
  gdot: { g: (i) => `g-bdot-${i}`, n: 2, w: 16, h: 16, rot: "any" },
  gstrip: { g: (i) => `g-bstrip-${i}`, n: 2, w: 7, h: 28, rot: "any" },
  curl: { curl: "tissue" },
  gcurl: { curl: "gold" },
};

function bigBurst({ seed, k, rings, palette, spacing = 0.6 }) {
  const R = mulberry(seed);
  const total = palette.reduce((a, e) => a + e[0], 0);
  const pick = () => {
    let x = R() * total;
    for (const e of palette) if ((x -= e[0]) <= 0) return e[1];
    return palette[palette.length - 1][1];
  };
  const placed = [];
  const out = [];
  let colour = Math.floor(R() * PEN_T.length);
  const nextColour = () => (colour = (colour + 1 + Math.floor(R() * 2)) % PEN_T.length);
  rings.forEach((ring, li) => {
    let made = 0, tries = 0;
    const offset = R();
    while (made < ring.n && tries < ring.n * 90) {
      tries++;
      const t = (offset + (made + R() * 0.8) / ring.n) % 1;
      const { x, y, nx, ny } = rim(t, 12);
      const type = pick();
      const spec = BIG[type];
      let piece;
      if (spec.curl) {
        const col = spec.curl === "gold" ? "gold" : PEN_T[nextColour()];
        piece = curlSpec(R, col, ring.scale * k * 2.6, true);
      } else if (spec.g) {
        const sc = k * ring.scale * (0.86 + R() * 0.28);
        piece = { kind: "gold", s: spec.g(1 + Math.floor(R() * spec.n)), w: spec.w * sc, h: spec.h * sc };
      } else {
        const sc = k * ring.scale * (0.86 + R() * 0.28);
        piece = { kind: "tissue", s: spec.t(PEN_T[nextColour()], 1 + Math.floor(R() * spec.n)), w: spec.w * sc, h: spec.h * sc };
      }
      const size = Math.max(piece.w, piece.h);
      const d = size * (ring.d[0] + R() * (ring.d[1] - ring.d[0]));
      const px = x + nx * d, py = y + ny * d;
      const r0 = 0.4 * size;
      if (placed.some((q) => Math.hypot(q.x - px, q.y - py) < spacing * (q.r + r0))) continue;
      placed.push({ x: px, y: py, r: r0 });
      const rot = spec.rot === "upright" ? (R() - 0.5) * 50 : spec.rot === "spark" ? (R() - 0.5) * 24 : R() * 360;
      const back = d + size * 0.45 + 6;
      const reach = Math.hypot(piece.w, piece.h) / 2 + 1;
      out.push({
        ...piece, x: px, y: py, r: rot,
        tuck: {
          x: Math.min(Math.max(px - nx * back, reach), 100 - reach),
          y: Math.min(Math.max(py - ny * back, reach), PH - reach),
          r: rot + (R() < 0.5 ? -18 : 18), s: 0.72,
        },
        delay: ring.delay + R() * 0.08,
        dur: ring.dur,
        z: 3 - li, sway: 0.5, float: true,
      });
      made++;
    }
  });
  return out;
}

const BIG_RINGS = (n) => [
  { n: n[0], scale: 0.5, d: [0.02, 0.2], delay: 0, dur: 0.75 },
  { n: n[1], scale: 0.38, d: [0.4, 0.62], delay: 0.06, dur: 0.85 },
  { n: n[2], scale: 0.27, d: [0.72, 1.0], delay: 0.12, dur: 0.95 },
];
const PARTY = [[26, "tri"], [14, "heart"], [9, "sq"], [8, "dot"], [8, "strip"], [10, "gtri"], [6, "gheart"],
               [7, "gspark"], [4, "gdot"], [3, "gstrip"], [5, "curl"], [3, "gcurl"]];
const STREAM = [[26, "curl"], [14, "gcurl"], [16, "tri"], [9, "heart"], [9, "gspark"], [8, "dot"], [8, "strip"],
                [6, "gtri"], [4, "gheart"]];

const ROUND4 = [
  {
    id: "party2", n: "A", name: "Party burst, 2x",
    blurb: "Everything at once, twice the size: crumpled tissue triangles, hearts, squares, dots, strips and curled ribbon, gold-leaf triangles, hearts and sparkles among them.",
    glide: true,
    pieces: bigBurst({ seed: 401, k: 2, rings: BIG_RINGS([16, 17, 13]), palette: PARTY }),
  },
  {
    id: "party3", n: "A", name: "Party burst, 3x",
    blurb: "Three times the size, fewer and bolder: the whole party in big crumpled tissue and gold leaf, the inner ring still tucked under her photo.",
    glide: true,
    pieces: bigBurst({ seed: 409, k: 3, rings: BIG_RINGS([11, 12, 10]), palette: PARTY }),
  },
  {
    id: "stream2", n: "E", name: "Streamer party, 2x",
    blurb: "Curled ribbon leads, twice the size: tissue streamers you can see through and gold-foil ones, with triangles, hearts and sparkles caught among them.",
    glide: true,
    pieces: bigBurst({ seed: 421, k: 2, rings: BIG_RINGS([15, 16, 12]), palette: STREAM }),
  },
  {
    id: "stream3", n: "E", name: "Streamer party, 3x",
    blurb: "Three times the size: big curls of crumpled tissue and gold foil spill out round the frame, a few big confetti pieces among them.",
    glide: true,
    pieces: bigBurst({ seed: 433, k: 3, rings: BIG_RINGS([10, 11, 9]), palette: STREAM }),
  },
];

// --- round 5: Party burst 3x, a full frame ----------------------------------------------------
/* Her pick, A at 3x, to her notes: every piece a little tucked in, and tissue
   in overlapping layers that frame the whole photo with barely any gaps.

   Each layer walks the whole rim, stepping on by less than a piece's own size,
   so neighbours always overlap and the band can't break. Every centre sits just
   outside the edge, so 20-35% of every piece stays under the photo. Back to
   front: big flat tissue, then smaller confetti, then strips, curls and
   sparkles on top. Tissue multiplies, so where layers cross the colour deepens. */
function collar({ seed, k, layers }) {
  const R = mulberry(seed);
  // mostly medium, a few big, some small
  const sizeVar = () => 0.62 + 0.83 * Math.pow(R(), 1.35);
  const out = [];
  let colour = Math.floor(R() * PEN_T.length);
  const nextColour = () => (colour = (colour + 1 + Math.floor(R() * 2)) % PEN_T.length);
  layers.forEach((L, li) => {
    const total = L.palette.reduce((a, e) => a + e[0], 0);
    const pick = () => {
      let x = R() * total;
      for (const e of L.palette) if ((x -= e[0]) <= 0) return e[1];
      return L.palette[L.palette.length - 1][1];
    };
    let walked = R() * RIM_TOTAL * 0.5;
    const end = walked + RIM_TOTAL;
    while (walked < end) {
      const type = pick();
      const spec = BIG[type];
      let piece;
      if (spec.curl) piece = curlSpec(R, spec.curl === "gold" ? "gold" : PEN_T[nextColour()], L.scale * k * 2.6, true);
      else {
        const sc = k * L.scale * sizeVar() * (spec.g ? 0.72 : 1);
        piece = spec.g
          ? { kind: "gold", s: spec.g(1 + Math.floor(R() * spec.n)), w: spec.w * sc, h: spec.h * sc }
          : { kind: "tissue", s: spec.t(PEN_T[nextColour()], 1 + Math.floor(R() * spec.n)), w: spec.w * sc, h: spec.h * sc,
              opacity: L.tint ?? 1 };
      }
      const size = Math.max(piece.w, piece.h);
      const { x, y, nx, ny } = rim((walked % RIM_TOTAL) / RIM_TOTAL, 12);
      const far = L.out && R() < L.out;   // a few reach further out than the rest
      const d = size * (far ? 0.36 + R() * 0.08 : L.d[0] + (L.d[1] - L.d[0]) * Math.pow(R(), 0.8));
      const px = x + nx * d + (R() - 0.5) * 3, py = y + ny * d + (R() - 0.5) * 3;
      const rot = spec.rot === "upright" ? (R() - 0.5) * 50 : spec.rot === "spark" ? (R() - 0.5) * 24 : R() * 360;
      const back = d + size * 0.45 + 6;
      const reach = Math.hypot(piece.w, piece.h) / 2 + 1;
      out.push({
        ...piece, x: px, y: py, r: rot,
        tuck: {
          x: Math.min(Math.max(px - nx * back, reach), 100 - reach),
          y: Math.min(Math.max(py - ny * back, reach), PH - reach),
          r: rot + (R() < 0.5 ? -18 : 18), s: 0.72,
        },
        delay: L.delay + R() * 0.1,
        dur: L.dur,
        z: li + 1, sway: 0.5, float: true, opacity: piece.opacity,
      });
      walked += size * L.step * (0.85 + R() * 0.3);
    }
  });
  return out;
}

// triangles lead (her note: more triangles); gold is the accent, not the mass
const FLAT = [[52, "tri"], [12, "heart"], [9, "sq"], [8, "dot"], [8, "gtri"], [3, "gheart"]];
const MID = [[46, "tri"], [11, "heart"], [7, "sq"], [7, "dot"], [7, "strip"], [8, "gtri"], [3, "gheart"], [3, "gdot"]];
const TOP = [[38, "tri"], [8, "heart"], [9, "strip"], [7, "dot"], [10, "curl"], [5, "gcurl"], [9, "gspark"], [8, "gtri"], [3, "gstrip"]];

const AIRY = [
  { scale: 0.5, step: 1.0, d: [0.08, 0.3], out: 0.2, palette: FLAT, delay: 0, dur: 0.75, tint: 0.85 },
  { scale: 0.4, step: 1.05, d: [0.1, 0.32], out: 0.2, palette: MID, delay: 0.05, dur: 0.82, tint: 0.92 },
  { scale: 0.3, step: 1.2, d: [0.12, 0.34], out: 0.25, palette: TOP, delay: 0.1, dur: 0.9 },
];

/* Gold on top, to tie it together: three gold-leaf stars cut like the star
   card's stamps and two curled gold-foil streamers like the party popper's,
   spaced evenly round the frame, above the tissue but still a little tucked
   under the photo. They bloom last, so they land as the finishing touch. */
function goldAccents({ seed, at }) {
  const R = mulberry(seed);
  return at.map(([t, what, sz], i) => {
    const { x, y, nx, ny } = rim(t, 12);
    // the popper's streamer: a short, wide ringlet of foil (her note: thicker, shorter)
    const piece = what === "curl"
      ? curlSpec(R, "gold", sz, false, { len: 11 + R(), r: 1.4, loops: 2.7 + R() * 0.3, w: 0.95, droop: 1.8 })
      : { kind: "gold", s: `g-bstar-${what}`, w: sz, h: sz };
    const size = Math.max(piece.w, piece.h);
    // stars mostly out, so they read as stars; streamers start well under the edge
    const d = size * (what === "curl" ? 0.27 : 0.36);
    const px = x + nx * d, py = y + ny * d;
    const out = (Math.atan2(ny, nx) * 180) / Math.PI;
    const rot = what === "curl" ? out + (R() - 0.5) * 50 : [-7, 5, -3, 8, -5][i % 5];
    const back = d + size * 0.45 + 6;
    const reach = Math.hypot(piece.w, piece.h) / 2 + 1;
    return {
      ...piece, x: px, y: py, r: rot,
      tuck: {
        x: Math.min(Math.max(px - nx * back, reach), 100 - reach),
        y: Math.min(Math.max(py - ny * back, reach), PH - reach),
        r: rot + (R() < 0.5 ? -18 : 18), s: 0.72,
      },
      delay: 0.16 + i * 0.03, dur: 0.95, z: 6, sway: 0.4, float: true,
    };
  });
}

const DEAL_TWO = collar({ seed: 547, k: 3, layers: AIRY });
// colour-scheme options: the same frame and gold, only the six tissue colours change
const ACCENTS = () => goldAccents({ seed: 551, at: [[0.07, 1, 24], [0.38, "curl", 3.2], [0.575, 2, 19], [0.77, 3, 16], [0.975, "curl", 3.0]] });
const FAM = ["blush", "lilac", "sky", "chart", "peach", "aqua"];
const scheme = (prefix) => {
  PEN_T = FAM.map((f) => prefix + f);
  const out = [...collar({ seed: 547, k: 3, layers: AIRY }), ...ACCENTS()];
  PEN_T = [...FAM];
  return out;
};
const SCHEME_OPTS = [
  ["spring", "s", "Spring pastel", "Cherry blossom, lilac, spring sky, pistachio, apricot, mint."],
  ["sorbet", "o", "Sorbet", "The brightest: raspberry pink, violet, clear blue, lime, tangerine, mint."],
  ["almond", "a", "Sugared almond", "The softest: powdery pink, lavender, baby blue, celery, peach cream, seafoam."],
  ["garden", "g", "Garden", "A touch deeper: rose, iris, cornflower, leaf green, coral, jade."],
  ["bright", "b", "Bright pastel", "High-chroma pastels: bubblegum, lilac, ice blue, lemon-lime, melon, aqua."],
];

const ROUND5 = [
  ...SCHEME_OPTS.map(([id, prefix, name, blurb], n) => ({ id, n: String(n + 1).padStart(2, "0"), name, blurb, glide: true, pieces: scheme(prefix) })),
  {
    id: "deal2gold", n: "A", name: "Deal two, gold on top",
    blurb: "Deal two with five gold accents laid over it: three gold-leaf stars cut like the star card's stamps, two curled gold-foil streamers like the popper's, spaced round the frame and still a little tucked in.",
    glide: true,
    pieces: [
      ...DEAL_TWO,
      ...goldAccents({
        seed: 551,
        // in the gaps between the collar's own gold (t 0.19, 0.28, 0.49, 0.67, 0.87),
        // so no two golds touch: leaf on leaf merges into one blob
        at: [[0.07, 1, 24], [0.38, "curl", 3.2], [0.575, 2, 19], [0.77, 3, 16], [0.975, "curl", 3.0]],
      }),
    ],
  },
  {
    id: "deal2", n: "A", name: "Deal two, as it was",
    blurb: "For comparison: deal two without the accents.",
    glide: true,
    pieces: collar({ seed: 547, k: 3, layers: AIRY }),
  },
];

const SET = ROUND === "5" ? ROUND5 : ROUND === "4" ? ROUND4 : ROUND === "3" ? ROUND3 : ROUND === "2" ? ROUND2 : OPTIONS;
(ONLY ? SET.filter((o) => o.id === ONLY) : SET).forEach(build);
window.__ready = true;
