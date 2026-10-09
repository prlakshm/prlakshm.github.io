/* The gallery's map: the bagel in the middle, one cluster per project around
   it, every piece "dropped" on the canvas (a little turned, a little
   overlapping), never gridded. Related projects sit next to each other going
   round the ring:
     Surprise Rail · Mixr · Pinnables          (the case studies)
     Codex · Figma Sound · Cursor              (products reimagined + campaigns)
     Disney deck templates                     (slides, next to Cursor)
     Seashell · Petal                          (print series, same Figma file)
     Textile · Sequin · Girls Should Cook      (the shader work)
   The layout is seeded, so it is the same on every visit. World units are
   CSS px at 100% zoom. */

export type Media = {
  id: string;
  title: string;
  kind: "image" | "video" | "sticker";
  src: string;
  poster?: string; // a video's first frame
  small?: string; // a light copy (~360px) a video plays while it's small on screen
  w: number; // display width in the world
  aspect: number; // height / width
  under?: string; // tuck just below this item (e.g. the Mixr variant)
  fan?: string; // scatter close round this item (e.g. the Codex variations)
};
export type Item = Media & { x: number; y: number; h: number; rot: number; z: number };
export type Cluster = { id: string; title: string; x: number; y: number; r: number; items: Item[] };

const V = "/gallery/vid/", I = "/gallery/img/", W = "/home/work/", P = 1.25, S = 9 / 16;

const img = (id: string, title: string, src: string, w: number, aspect = P, extra: Partial<Media> = {}): Media => ({ id, title, kind: "image", src, w, aspect, ...extra });
const vid = (id: string, title: string, name: string, w: number, aspect: number, extra: Partial<Media> = {}): Media => ({ id, title, kind: "video", src: V + name + ".mp4", poster: V + name + ".jpg", small: V + "small/" + name + ".mp4", w, aspect, ...extra });
const stk = (id: string, title: string, src: string, w: number, aspect = 1): Media => ({ id, title, kind: "sticker", src, w, aspect });

/* How a cluster is laid out: dropped (default), a straight row, or a grid of
   `cols` columns. `groups` splits a grid cluster into separate grids side by
   side (the two deck templates), each with its own column count if
   `groupCols` gives one. */
type Spec = { id: string; title: string; items: Media[]; row?: boolean; cols?: number; groups?: Media[][]; groupCols?: number[] };

const LILAC = ["1-intro", "2-body", "3-split", "4-statement", "5-closing", "6-route"].map((n, i) => img("deck-p-" + (i + 1), `Lilac Slide Deck Template · ${i + 1}`, I + "deck-purple-" + n + ".webp", 440, S));
const BW = ["01-anchored-toss", "02-bracket-drift", "03-tumble", "04-orbit", "05-edge-rhythm", "06-interlock", "07-confetti", "08-cascade", "09-square-corners"].map((n, i) => img("deck-w-" + (i + 1), `Black & White Slide Deck Template · ${i + 1}`, I + "deck-white-" + n + ".webp", 440, S));
const SPECS: Spec[] = [
  { id: "case-studies", title: "Case-study posters", row: true, items: [
    img("sr-poster", "Surprise Rail Poster", W + "surprise-rail-poster.webp", 400),
    img("mixr-poster", "Mixr Poster · 1", W + "mixr-poster.webp", 400),
    img("pin-poster", "Pinnables Poster", W + "pinnables-poster.webp", 400),
    img("fs-poster", "Figma Sound Poster", W + "figma-sound-poster.webp", 400),
    img("codex-poster", "Codex Poster · 1", W + "codex-bookmarks-poster.webp", 400),
    img("mixr-plain", "Mixr Poster · 2", I + "mixr-no-dj-app.webp", 400, P, { under: "mixr-poster" }),
    img("codex-flag", "Codex Poster · 2", I + "codex-flag.webp", 400, P, { fan: "codex-poster" }),
    img("codex-peekaboo", "Codex Poster · 3", I + "codex-peekaboo.webp", 400, P, { fan: "codex-poster" }),
    img("codex-tabs", "Codex Poster · 4", I + "codex-tabs.webp", 400, P, { fan: "codex-poster" }),
    img("codex-app-icon", "Codex Poster · 5", I + "codex-app-icon.webp", 400, P, { fan: "codex-poster" }),
  ] },
  { id: "figma-sound", title: "Figma Sound", items: [
    { id: "fs-film", title: "Figma Sound Film", kind: "video", src: "/branding/assets/film/figma-sound-film.mp4", poster: "/branding/assets/film/figma-sound-film-poster.jpg", small: V + "small/figma-sound-film.mp4", w: 640, aspect: S },
    vid("fs-girl", "Figma Sound Girl Loop", "fs-girl-loop", 300, P),
    // the twelve frames as one storyboard sheet, four to a row
    img("fs-storyboard", "Figma Sound Storyboard", I + "fs-storyboard.webp", 1600, 1908 / 4176),
  ] },
  { id: "cursor", title: "Cursor Loves Indie", cols: 2, items: Array.from({ length: 9 }, (_, i) => img("cursor-" + (i + 1), `Cursor Loves Indie Slides · ${i + 1}`, `/home/decks/cursor/slide-0${i + 1}.webp`, 460, S)) },
  { id: "decks", title: "Slide templates · Disney deck", cols: 2, groups: [LILAC, BW], groupCols: [2, 3], items: [...LILAC, ...BW] },
  { id: "seashell", title: "Seashell posters", row: true, items: [
    vid("shell-1", "Seashell Poster · 1", "shell-01-stamp-blue", 380, P),
    vid("shell-2", "Seashell Poster · 2", "shell-02-coastal-press", 380, P),
    vid("shell-3", "Seashell Poster · 3", "shell-03-full-sheet", 380, P),
    vid("shell-5", "Seashell Poster · 4", "shell-05-conveyor-belt", 380, P),
  ] },
  { id: "petal", title: "Petal posters", row: true, items: [
    vid("petal-1", "Petal Poster · 1", "petal-01-petal-press", 380, P),
    vid("petal-2", "Petal Poster · 2", "petal-02-in-full-bloom", 380, P),
    vid("petal-3", "Petal Poster · 3", "petal-03-grow-again", 380, P),
    vid("petal-4", "Petal Poster · 4", "petal-04-grid-tiles", 380, P),
  ] },
  { id: "textile", title: "Textile shader", items: [
    vid("tx-v1", "Textile Shader · 4", "textile-shader-1", 560, 722 / 1280),
    vid("tx-v2", "Textile Shader · 5", "textile-shader-2", 560, 722 / 1280),
    img("tx-lilies", "Textile Shader · 6", I + "textile-lilies-split.webp", 380, 1),
    // her pairs from the Textile Shader file (Group 1): each original photo,
    // and beside it the stitched version
    ...[1, 2, 3].flatMap(i => [
      img(`tx-${i}-original`, `Textile Shader · ${i} Original`, I + `textile-${i}-original.webp`, 400, 934 / 1400),
      img(`tx-${i}`, `Textile Shader · ${i}`, I + `textile-${i}-stitched.webp`, 400, 934 / 1400),
    ]),
  ] },
  { id: "sequin", title: "Sequin shader", items: [
    // the poster versions: Twitter posts 4–6 in the Girls Should Cook file
    img("sq-pom", "Sequin Shader · 1", I + "sequin-post-4.webp", 340, 4 / 3),
    img("sq-giraffe", "Sequin Shader · 2", I + "sequin-post-5.webp", 340, 4 / 3),
    img("sq-rocket", "Sequin Shader · 3", I + "sequin-post-6.webp", 340, 4 / 3),
  ] },
  { id: "gsc", title: "Girls Should Cook", items: [
    vid("gsc-motion", "Girls Should Cook · 1", "gsc-motion", 400, P),
    vid("gsc-promo", "Girls Should Cook", "gsc-promo", 560, 792 / 1280),
    vid("gsc-sequins", "Girls Should Cook · 3", "gsc-sequins", 300, 1100 / 824),
    vid("gsc-bowl", "Girls Should Cook · 4", "gsc-bowl-sequins", 360, 980 / 1000),
    // every alternative object, as they sit on their frame in the file
    img("gsc-alts", "Girls Should Cook Alt. Objects", I + "gsc-alts.webp", 820, 1446 / 2400),
  ] },
];

// a small seeded random, so the drop is the same every time
function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// drop the pieces of one cluster round (0, 0): biggest first, each at a random
// spot that overlaps the others only a little; tucked and fanned pieces follow
// their anchor
const GAP_COL = 56, GAP_ROW = 56;

const GROUP_GAP = 240;

function scatter(spec: Spec, seed: number): { items: Item[]; r: number } {
  const R = rng(seed);
  if (spec.cols) {
    // a grid per group, groups side by side; every cell the group's largest size
    const placed: Item[] = [];
    let gx = 0;
    (spec.groups ?? [spec.items]).forEach((g, gi) => {
      const cw = Math.max(...g.map(m => m.w)), rh = Math.max(...g.map(m => m.w * m.aspect)), cols = spec.groupCols?.[gi] ?? spec.cols!;
      g.forEach((m, i) => { const r = Math.floor(i / cols), c = i % cols; placed.push({ ...m, x: gx + c * (cw + GAP_COL) + cw / 2, y: r * (rh + GAP_ROW) + rh / 2, h: m.w * m.aspect, rot: 0, z: 1 }); });
      gx += cols * cw + (cols - 1) * GAP_COL + GROUP_GAP;
    });
    const x0 = Math.min(...placed.map(p => p.x - p.w / 2)), x1 = Math.max(...placed.map(p => p.x + p.w / 2)), y0 = Math.min(...placed.map(p => p.y - p.h / 2)), y1 = Math.max(...placed.map(p => p.y + p.h / 2));
    placed.forEach(p => { p.x -= (x0 + x1) / 2; p.y -= (y0 + y1) / 2; });
    return { items: placed, r: Math.hypot(x1 - x0, y1 - y0) / 2 };
  }
  if (spec.row) {
    const main = spec.items.filter(m => !m.under && !m.fan);
    const total = main.reduce((a, m) => a + m.w, 0) + GAP_COL * (main.length - 1);
    let x = -total / 2; const placed: Item[] = [];
    main.forEach(m => { const h = m.w * m.aspect; placed.push({ ...m, x: x + m.w / 2, y: -h / 2, h, rot: 0, z: 1 }); x += m.w + GAP_COL; });
    spec.items.filter(m => m.under).forEach(m => { const a = placed.find(p => p.id === m.under)!; const h = m.w * m.aspect; placed.push({ ...m, x: a.x, y: a.y + a.h / 2 + GAP_ROW + h / 2, h, rot: 0, z: 1 }); });
    const fans = spec.items.filter(m => m.fan);
    fans.forEach((m, i) => { const a = placed.find(p => p.id === m.fan)!; const h = m.w * m.aspect; placed.push({ ...m, x: a.x - a.w / 2 + m.w / 2 + i * (m.w + GAP_COL), y: a.y + a.h / 2 + GAP_ROW + h / 2, h, rot: 0, z: 1 }); });
    // centre the whole block on (0, 0)
    const x0 = Math.min(...placed.map(p => p.x - p.w / 2)), x1 = Math.max(...placed.map(p => p.x + p.w / 2)), y0 = Math.min(...placed.map(p => p.y - p.h / 2)), y1 = Math.max(...placed.map(p => p.y + p.h / 2));
    placed.forEach(p => { p.x -= (x0 + x1) / 2; p.y -= (y0 + y1) / 2; });
    return { items: placed, r: Math.hypot(x1 - x0, y1 - y0) / 2 };
  }
  const free = spec.items.filter(m => !m.under && !m.fan).sort((a, b) => b.w * b.w * b.aspect - a.w * a.w * a.aspect);
  const placed: Item[] = [];
  const area = spec.items.reduce((a, m) => a + m.w * m.w * m.aspect, 0);
  let reach = Math.sqrt(area / Math.PI) * 0.9 + 40;
  const overlap = (a: { x: number; y: number; w: number; h: number }, b: Item) => { const ox = Math.max(0, Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2)); const oy = Math.max(0, Math.min(a.y + a.h / 2, b.y + b.h / 2) - Math.max(a.y - a.h / 2, b.y - b.h / 2)); return ox * oy; };
  const turn = (_m: Media) => 0; // every piece sits straight
  free.forEach((m, k) => {
    const h = m.w * m.aspect; let best: Item | null = null, bestCost = Infinity;
    for (let tries = 0; tries < 260; tries++) {
      const a = R() * Math.PI * 2, d = k === 0 ? R() * 30 : Math.sqrt(R()) * reach;
      const cand = { x: Math.cos(a) * d, y: Math.sin(a) * d * 0.8, w: m.w, h };
      const small = (o: Item) => Math.min(o.w * o.h, m.w * h);
      const cost = placed.reduce((c, o) => c + overlap(cand, o) / small(o), 0);
      if (cost < bestCost) { bestCost = cost; best = { ...m, ...cand, rot: turn(m), z: 0 }; }
      if (cost < 0.06) break;
      if (tries % 60 === 59) reach *= 1.12;
    }
    placed.push(best!);
  });
  // tucked: just below the anchor, a hair overlapped and turned the other way
  spec.items.filter(m => m.under).forEach(m => { const a = placed.find(p => p.id === m.under)!; const h = m.w * m.aspect; placed.push({ ...m, x: a.x, y: a.y + a.h / 2 + GAP_ROW + h / 2, h, rot: 0, z: 0 }); });
  // fanned: spread round the anchor like prints thrown down beside it
  const fans = spec.items.filter(m => m.fan);
  // fanned: a straight row below the anchor, starting under it and running right
  fans.forEach((m, i) => { const a = placed.find(p => p.id === m.fan)!; const h = m.w * m.aspect; placed.push({ ...m, x: a.x - a.w / 2 + m.w / 2 + i * (m.w + GAP_COL), y: a.y + a.h / 2 + GAP_ROW + h / 2, h, rot: 0, z: 0 }); });
  // the first piece sits on top; the rest stack in the order they landed
  placed.forEach((p, i) => (p.z = placed.length - i));
  const r = Math.max(...placed.map(p => Math.hypot(p.x, p.y) + Math.hypot(p.w, p.h) / 2));
  return { items: placed, r };
}

/* The bagel is part of the canvas, not a piece: it can't be picked up. It comes
   in two layers cut from the same frame (Figma "Final Bagel"), so the
   exclamation can burst out of it. ORIGIN is the tail's tip, hidden under the
   bagel, as a fraction of the image: the point the shout grows from. */
export const BAGEL = {
  body: I + "bagel-body.webp",
  shout: I + "bagel-shout.webp",
  w: 2400,
  aspect: 1798 / 2552,
  origin: { x: 854 / 2552, y: 964 / 1798 },
  title: "The entire world fits on an everything bagel!",
};

function layout(): Cluster[] {
  const R = rng(20261008);
  const dropped = SPECS.map((s, i) => ({ s, ...scatter(s, 1000 + i * 97) }));
  const n = dropped.length, bagelR = Math.hypot(BAGEL.w, BAGEL.w * BAGEL.aspect) / 2;
  // round the bagel in order, each at its own distance, the ring a little oval
  const cl = dropped.map((d, i) => { const a = -Math.PI / 2 + (i / n) * Math.PI * 2 + (R() - 0.5) * 0.18; const dist = bagelR + d.r + 260 + R() * 420; return { id: d.s.id, title: d.s.title, x: Math.cos(a) * dist * 1.15, y: Math.sin(a) * dist * 0.92, r: d.r, items: d.items }; });
  // nudge apart anything that collides, and keep clear of the bagel
  for (let it = 0; it < 120; it++) {
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const a = cl[i], b = cl[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, need = a.r + b.r + 140; if (d < need) { const push = (need - d) / 2; a.x -= dx / d * push; a.y -= dy / d * push; b.x += dx / d * push; b.y += dy / d * push; } }
    cl.forEach(c => { const d = Math.hypot(c.x, c.y) || 1, need = bagelR + c.r + 200; if (d < need) { c.x *= need / d; c.y *= need / d; } });
  }
  return cl;
}

export const CLUSTERS: Cluster[] = layout();

export function worldBounds(list: Cluster[]) {
  const xs = list.flatMap(c => [c.x - c.r, c.x + c.r]).concat([-BAGEL.w / 2, BAGEL.w / 2]);
  const ys = list.flatMap(c => [c.y - c.r, c.y + c.r]).concat([-BAGEL.w * BAGEL.aspect / 2, BAGEL.w * BAGEL.aspect / 2]);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

/* Every piece on its own at its default spot in world
   coordinates (centre x, y). Pieces can be picked up and moved one by one, so
   from here on a cluster is only where they start out. */
export type Piece = Media & { x: number; y: number; h: number; z: number };

export const PIECES: Piece[] = [
  ...CLUSTERS.flatMap(c => c.items.map(it => ({ ...it, x: c.x + it.x, y: c.y + it.y }))),
];

/* Saved placements (layout.json): where each moved piece now sits and which
   pieces were removed. Anything not listed keeps its default spot. */
export type Layout = {
  items: Record<string, { x: number; y: number; z: number; w?: number }>;
  deleted: string[];
  names?: Record<string, string>; // renamed on the contact sheet (/gallery/#sheet)
  phone?: Record<string, { x: number; y: number; w?: number }>; // placed by hand on a phone-shaped screen
};

// pieces she placed by hand in the phone arrangement keep exactly that spot
export function applyPhone(list: Piece[], phone: Layout["phone"]): Piece[] {
  if (!phone) return list;
  return list.map(p => {
    const o = phone[p.id];
    if (!o) return p;
    const w = o.w ?? p.w;
    return { ...p, x: o.x, y: o.y, w, h: w * p.aspect };
  });
}

// a saved width resizes the piece with its proportions kept; a saved name
// replaces the default one
export function applyLayout(base: Piece[], l: Layout): Piece[] {
  const gone = new Set(l.deleted);
  return base.filter(p => !gone.has(p.id)).map(p => {
    const o = l.items[p.id], title = l.names?.[p.id] ?? p.title;
    if (!o) return { ...p, title };
    const w = o.w ?? p.w;
    return { ...p, ...o, w, h: w * p.aspect, title };
  });
}

// everything on the canvas, the bagel at (0, 0) included
export function pieceBounds(list: Piece[]) {
  const all = [...list, { x: 0, y: 0, w: BAGEL.w, h: BAGEL.w * BAGEL.aspect }];
  const x0 = Math.min(...all.map(p => p.x - p.w / 2)), x1 = Math.max(...all.map(p => p.x + p.w / 2));
  const y0 = Math.min(...all.map(p => p.y - p.h / 2)), y1 = Math.max(...all.map(p => p.y + p.h / 2));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/* PHONES (portrait): the desktop arrangement is wide, so phones get their own,
   placed by hand on a phone-shaped screen and saved in layout.json (phone).
   Anything not placed there (a piece added later) falls back to the
   composition below: every cluster at 56%, the bagel at full size, hung on
   the bagel's centre line. */
const GROUP_OF = (id: string) =>
  /^(sr-|mixr-|pin-|fs-poster|codex-)/.test(id) ? "case"
  : /^(gsc-|sq-)/.test(id) ? "gsc"
  : /^fs-/.test(id) ? "fs"
  : /^tx-/.test(id) ? "tx"
  : /^petal-/.test(id) ? "petal"
  : /^shell-/.test(id) ? "shell"
  : /^cursor-/.test(id) ? "cursor"
  : /^deck-/.test(id) ? "decks"
  : "other";

/* Her phone composition (from J): everything hangs on the bagel's centre line.
     case-study posters                 (centred)
     Girls Should Cook · Figma Sound    (centred pair)
                [ the bagel ]           (centred)
     textile  |  petal                  (either side of the centre line)
     Cursor ┐   seashell posters        (seashells offset right; Cursor rises
            │   deck templates           into the notch they leave, decks
            ┘                            tucked under the seashells) */
function framedLayout(list: Piece[]): Piece[] {
  const G = 260;
  type B = { l: number; t: number; r: number; b: number };
  const box: Record<string, B> = {};
  for (const p of list) {
    const g = GROUP_OF(p.id), o = box[g], l = p.x - p.w / 2, t = p.y - p.h / 2, r = p.x + p.w / 2, bt = p.y + p.h / 2;
    box[g] = o ? { l: Math.min(o.l, l), t: Math.min(o.t, t), r: Math.max(o.r, r), b: Math.max(o.b, bt) } : { l, t, r, b: bt };
  }
  const W = (g: string) => (box[g] ? box[g].r - box[g].l : 0), H = (g: string) => (box[g] ? box[g].b - box[g].t : 0);
  const bh = (BAGEL.w * BAGEL.aspect) / 2;
  const to: Record<string, { x: number; y: number }> = {}; // new top-left
  // above the bagel, centred
  const pairW = W("gsc") + G + W("fs"), pairH = Math.max(H("gsc"), H("fs"));
  let y = -bh - G - pairH;
  to.gsc = { x: -pairW / 2, y: y + (pairH - H("gsc")) / 2 };
  to.fs = { x: -pairW / 2 + W("gsc") + G, y: y + (pairH - H("fs")) / 2 };
  to.case = { x: -W("case") / 2, y: y - G - H("case") };
  // below: textile and petal either side of the centre line, tops level
  y = bh + G;
  to.tx = { x: -G / 2 - W("tx"), y };
  to.petal = { x: G / 2, y };
  y += Math.max(H("tx"), H("petal")) + G;
  // seashells offset right; Cursor rises into the notch on their left
  const shellL = -W("shell") / 2 + W("shell") * 0.3;
  to.shell = { x: shellL, y };
  to.cursor = { x: shellL - G - W("cursor"), y };
  to.decks = { x: shellL, y: y + H("shell") + G };
  /* Settle toward the bagel: the bagel's frame has two empty corners (its
     body fills the bottom-left, the burst the top-right), so clusters above
     slide down and clusters below slide up, nearest first, each until it
     meets the bagel's actual shapes or a cluster already settled. */
  const bw = BAGEL.w, bH = BAGEL.w * BAGEL.aspect, L0 = -bw / 2, T0 = -bH / 2;
  // body and burst, as fractions of the bagel image (bagel-body/-shout.webp)
  const shapes: B[] = [
    { l: L0, t: T0 + bH * 0.348, r: L0 + bw * 0.5, b: T0 + bH },
    { l: L0 + bw * 0.293, t: T0, r: L0 + bw, b: T0 + bH * 0.561 },
  ];
  const rectOf = (g: string): B => ({ l: to[g].x, t: to[g].y, r: to[g].x + W(g), b: to[g].y + H(g) });
  const hits = (a: B, o: B, gap: number) => a.l < o.r + gap && a.r > o.l - gap && a.t < o.b + gap && a.b > o.t - gap;
  const settled: B[] = [...shapes];
  const settle = (g: string, dir: 1 | -1) => {
    if (!to[g]) return;
    const others = settled.filter(o => !shapes.includes(o));
    for (let i = 0; i < 400; i++) {
      to[g].y += dir * 10;
      const r = rectOf(g);
      if (shapes.some(o => hits(r, o, G * 0.6)) || others.some(o => hits(r, o, G))) { to[g].y -= dir * 10; break; }
    }
    settled.push(rectOf(g));
  };
  for (const g of ["gsc", "fs", "case"]) settle(g, 1);
  for (const g of ["tx", "petal", "shell", "cursor", "decks"]) settle(g, -1);
  return list.map(p => {
    const g = GROUP_OF(p.id), b = box[g], t = to[g];
    return b && t ? { ...p, x: p.x + t.x - b.l, y: p.y + t.y - b.t } : p;
  });
}

const PHONE_SCALE = 0.56;

export function portraitLayout(list0: Piece[]): Piece[] {
  // clusters shrink about their own top-left; the bagel keeps its size
  const tl: Record<string, { l: number; t: number }> = {};
  for (const p of list0) { const g = GROUP_OF(p.id), l = p.x - p.w / 2, t = p.y - p.h / 2; tl[g] = tl[g] ? { l: Math.min(tl[g].l, l), t: Math.min(tl[g].t, t) } : { l, t }; }
  const s = PHONE_SCALE;
  return framedLayout(list0.map(p => { const o = tl[GROUP_OF(p.id)]; return { ...p, x: o.l + (p.x - o.l) * s, y: o.t + (p.y - o.t) * s, w: p.w * s, h: p.h * s }; }));
}
