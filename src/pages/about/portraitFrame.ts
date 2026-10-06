/* The frame tucked under the About portrait: "Party burst 3x, deal two, gold
   on top" from the lab (poster-lab/portrait-pop, round 5). Pure layout: every
   piece's open centre, size and angle in photo units (the photo is 100u wide,
   133.3u tall), and where it hides when tucked. Seeded, so it is the same
   frame she picked on every visit; R() is drawn in the lab's exact order. */

export const ART = "/about/pop/";
export const PH = 400 / 3;

export type Tuck = { x: number; y: number; r: number; s: number };
export type Piece = {
  kind: "gold" | "tissue" | "curl";
  s?: string; // sprite name (gold and tissue)
  svg?: string; // curled ribbon, drawn inline (curl)
  w: number;
  h: number;
  x: number;
  y: number;
  r: number;
  tuck: Tuck;
  delay: number;
  dur: number;
  z: number;
  sway: number;
  opacity?: number;
};

function mulberry(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// a point on the photo's rim (corners rounded by rc), and the outward normal there
function rim(t: number, rc = 9) {
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

type Ribbon = { s: [number, number]; deg: number; len: number; r: number; loops: number; w: number; droop: number };

/* Curled ribbon: the centreline loops as it travels (a trochoid) and droops;
   the ribbon twists once per loop, narrowing edge-on and showing its darker
   back on the far side of each curl. One quad per step, back faces first. */
function ribbon(st: Ribbon, N: number) {
  const a = (st.deg * Math.PI) / 180;
  const ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
  const turns = st.loops * 2 * Math.PI;
  const P: [number, number][] = [], ph: number[] = [];
  for (let k = 0; k <= N; k++) {
    const t = k / N;
    const q = t * turns;
    const ax = t * st.len + st.r * 0.85 * Math.sin(q);
    const ay = st.r * (1 - Math.cos(q)) * (0.35 + 0.65 * t);
    P.push([st.s[0] + ux * ax + vx * ay, st.s[1] + uy * ax + vy * ay + st.droop * t * t]);
    ph.push(q);
  }
  const nrm = P.map((_, k) => {
    const p0 = P[Math.max(0, k - 1)], p1 = P[Math.min(N, k + 1)];
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  });
  const segs: { pts: string; front: boolean; shade: number }[] = [];
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
    const shade = c >= 0 ? 1 + 0.14 * c : 0.74 + 0.1 * -c;
    segs.push({ pts, front: c >= 0, shade });
  }
  return segs;
}

const COLS: Record<string, string> = {
  bblush: "#ff9ccc", blilac: "#c9a6ff", bsky: "#8fd3ff", bchart: "#d6f07a", bpeach: "#ffc48a", baqua: "#84ecd0",
  oeblush: "#ffb0d2", oelilac: "#d4c2ff", oesky: "#b2dcff", oechart: "#e9f09c", oepeach: "#fec79a", oeaqua: "#ade9cf",
};
const tint = (hex: string, f: number) => {
  const n = (i: number) => Math.round(Math.min(255, parseInt(hex.slice(i, i + 2), 16) * f));
  return `rgb(${n(1)},${n(3)},${n(5)})`;
};

function curlSpec(R: () => number, col: string, size: number, textured: boolean, geom: Partial<Ribbon> | null = null) {
  const st: Ribbon = { s: [0, 0], deg: 0, len: 9 + R() * 6, r: 1.8 + R() * 0.9, loops: 1.6 + R() * 1.2, w: 1.7 + R() * 0.5, droop: 1.5 };
  if (geom) Object.assign(st, geom);
  // a streamer stays a narrow ribbon however big it curls
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
  const id = "abc" + Math.floor(R() * 1e9).toString(36);
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
  const crumple = textured && col !== "gold"
    ? `<g style="mix-blend-mode:multiply">${order.map((q) => `<polygon points="${q.pts}" fill="url(#t${id})"/>`).join("")}</g>` : "";
  const defs = col === "gold"
    ? `<defs><pattern id="${id}" patternUnits="userSpaceOnUse" width="20" height="20"><image href="${ART}g-tile.webp" width="20" height="20"/></pattern></defs>`
    : textured
      ? `<defs><pattern id="t${id}" patternUnits="userSpaceOnUse" width="12" height="12"><image href="${ART}t-crumple-tile.webp" width="12" height="12"/></pattern></defs>` : "";
  return {
    kind: "curl" as const,
    w: (x1 - x0) * size,
    h: (y1 - y0) * size,
    svg: `<svg viewBox="${x0.toFixed(2)} ${y0.toFixed(2)} ${(x1 - x0).toFixed(2)} ${(y1 - y0).toFixed(2)}" class="ab-curl ab-curl--${col === "gold" ? "gold" : "tissue"}" aria-hidden="true">${defs}${polys}${crumple}</svg>`,
  };
}

type Shape = { t?: (c: string, i: number) => string; g?: (i: number) => string; curl?: "tissue" | "gold"; n?: number; w?: number; h?: number; rot?: string };
const BIG: Record<string, Shape> = {
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
// "bright pastel" hues (bubblegum, lilac, ice blue, lemon-lime, melon, aqua)
// as vivid pastels ON THE PAGE. Thin tissue is half page-white, which halves
// a dye's colour, so the dyes are deeper (prefix p, fitted by
// poster-lab/portrait-pop/bake/fit_tissue.py at alpha 0.45) and each sheet
// renders at ffb0d7 d3b7ff a8dfff e5fb9d ffd4a5 a3f5de.
// spring pastels (lab scheme "oc"): blossom, lavender, baby blue, pistachio,
// orange sherbet, mint. Baked with coloured light so they stay clear, never chalky
const PEN_T = ["oeblush", "oelilac", "oesky", "oechart", "oepeach", "oeaqua"];

type Layer = { scale: number; step: number; d: [number, number]; out: number; palette: [number, string][]; delay: number; dur: number; tint?: number };

/* Overlapping layers that walk the whole rim, each piece a little tucked under
   the photo; a few reach further out. Triangles lead; gold is the accent. */
function collar(seed: number, k: number, layers: Layer[]): Piece[] {
  const R = mulberry(seed);
  const sizeVar = () => 0.62 + 0.83 * Math.pow(R(), 1.35);
  const out: Piece[] = [];
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
      const spec = BIG[pick()];
      let piece: { kind: Piece["kind"]; s?: string; svg?: string; w: number; h: number; opacity?: number };
      if (spec.curl) piece = curlSpec(R, spec.curl === "gold" ? "gold" : PEN_T[nextColour()], L.scale * k * 2.6, true);
      else {
        const sc = k * L.scale * sizeVar() * (spec.g ? 0.72 : 1);
        piece = spec.g
          ? { kind: "gold", s: spec.g(1 + Math.floor(R() * spec.n!)), w: spec.w! * sc, h: spec.h! * sc }
          : { kind: "tissue", s: spec.t!(PEN_T[nextColour()], 1 + Math.floor(R() * spec.n!)), w: spec.w! * sc, h: spec.h! * sc, opacity: L.tint ?? 1 };
      }
      const size = Math.max(piece.w, piece.h);
      const { x, y, nx, ny } = rim((walked % RIM_TOTAL) / RIM_TOTAL, 12);
      const far = L.out && R() < L.out;
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
        z: li + 1, sway: 0.5,
      });
      walked += size * L.step * (0.85 + R() * 0.3);
    }
  });
  return out;
}

const FLAT: [number, string][] = [[52, "tri"], [12, "heart"], [9, "sq"], [8, "dot"], [8, "gtri"], [3, "gheart"]];
const MID: [number, string][] = [[46, "tri"], [11, "heart"], [7, "sq"], [7, "dot"], [7, "strip"], [8, "gtri"], [3, "gheart"], [3, "gdot"]];
const TOP: [number, string][] = [[38, "tri"], [8, "heart"], [9, "strip"], [7, "dot"], [10, "curl"], [5, "gcurl"], [9, "gspark"], [8, "gtri"], [3, "gstrip"]];
const AIRY: Layer[] = [
  { scale: 0.5, step: 1.0, d: [0.08, 0.3], out: 0.2, palette: FLAT, delay: 0, dur: 0.75 },
  { scale: 0.4, step: 1.05, d: [0.1, 0.32], out: 0.2, palette: MID, delay: 0.05, dur: 0.82 },
  { scale: 0.3, step: 1.2, d: [0.12, 0.34], out: 0.25, palette: TOP, delay: 0.1, dur: 0.9 },
];

/* Gold on top, to tie it to the star card and the painting: three gold-leaf
   stars and two short, thick curls of gold foil, each in a gap between the
   frame's own gold (leaf on leaf merges into one blob). They bloom last. */
function goldAccents(seed: number, at: [number, number | "curl", number][]): Piece[] {
  const R = mulberry(seed);
  return at.map(([t, what, sz], i) => {
    const { x, y, nx, ny } = rim(t, 12);
    const piece = what === "curl"
      ? curlSpec(R, "gold", sz, false, { len: 11 + R(), r: 1.4, loops: 2.7 + R() * 0.3, w: 0.95, droop: 1.8 })
      : { kind: "gold" as const, s: `g-bstar-${what}`, w: sz, h: sz };
    const size = Math.max(piece.w, piece.h);
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
      delay: 0.16 + i * 0.03, dur: 0.95, z: 6, sway: 0.4,
    };
  });
}

let cache: Piece[] | null = null;
export function framePieces(): Piece[] {
  cache ??= [
    // Keep the top triangle orange; dye the top heart and the large triangle
    // reaching past the photo's upper-left corner blossom pink.
    ...collar(547, 3, AIRY).map((p) =>
      p.kind === "tissue" && (
        (p.y < 0 && p.s?.startsWith("t-bheart-oepeach-")) ||
        (p.x < 0 && p.y > 0 && p.s?.startsWith("t-btri-oepeach-"))
      )
        ? { ...p, s: p.s.replace("-oepeach", "-oeblush") }
        : p
    ),
    ...goldAccents(551, [[0.07, 1, 24], [0.38, "curl", 3.2], [0.575, 2, 19], [0.77, 3, 16], [0.975, "curl", 3.0]]),
  ];
  return cache;
}
