/* ==========================================================================
   Sunroom — the model.

   Every object in the room, written once as 3D line work (for the sketch) and
   once as simple solids (for the shadows the light casts). Units are metres.

   Items are listed in paint order, back to front. The wall, doors and drapery
   are in the room's frame and are traced from the photograph: a boxed valance
   wall to wall, sheer curtains swept back to a tie with a ruffle down the
   leading edge, and narrow French doors of two-by-five panes over a panelled
   kick. The chairs and table are in the furniture's own frame (see scene.ts),
   seen from in front, above, and the viewer's side — so of any box only the
   top, the front, and the flank toward +z are drawn. Paper-white fills sit
   under each piece's lines so that whatever is behind it is properly hidden.
   ========================================================================== */

import {
  CB,
  CURTAIN,
  DOOR,
  SB,
  SIDELIGHT,
  CROWN,
  ROD_Y,
  liftFurn,
  furnScale,
  paneCols,
  paneRows,
  projectFurn,
  type Layout,
  type Pose,
  type V3,
} from "./scene.js";

export type Weight = "bold" | "main" | "fine" | "hair";
export type Group = "wall" | "door" | "curtain" | "chairs" | "table";

/** The groups drawn in the furniture's projection rather than the room's. */
export const isFurniture = (g: Group) => g === "chairs" || g === "table";

export interface Line3 {
  kind: "line";
  pts: V3[];
  weight: Weight;
  group: Group;
  /** Smooth through the points instead of joining them with ruled segments. */
  curve?: boolean;
  closed?: boolean;
  /** Ruled lines overshoot their ends; set false where that would look wrong. */
  overshoot?: boolean;
  /** Fainter than its weight says: for a line trailing off. */
  alpha?: number;
}

export interface Fill3 {
  kind: "fill";
  pts: V3[];
  /** `cloth` is the sheer curtain; `paper` is opaque page-white. */
  paint: "cloth" | "paper";
  curve?: boolean;
  /** For cloth: +1 for the right-hand curtain, −1 for the left. */
  side?: number;
  /** For paper: where this piece stands on the floor. If the sun reaches that
      spot, the piece takes the light's colour from the floor up as far as the
      light stands there. */
  foot?: V3;
  group: Group;
}

export type Item = Line3 | Fill3;

export interface Stick {
  a: V3;
  b: V3;
  r: number;
}

/** A level sheet — a seat, a table top — as its centre and two half-edges on
    the floor plan. `round` inscribes an ellipse in it. */
export interface Slab {
  c: V3;
  u: [number, number];
  v: [number, number];
  round: boolean;
}

export interface Occluders {
  /** In the room's frame, for the sun. */
  sticks: Stick[];
  slabs: Slab[];
  /** In the furniture's frame, for the soft shade that gathers under things:
      the points where something touches the floor, and a pool under each piece. */
  feet: [number, number][];
  pools: { cx: number; cz: number; r: number; a: number }[];
}

export interface Model {
  items: Item[];
  occluders: Occluders;
  /** Page y of the lowest foot. */
  bottom: number;
}

type Push = (item: Item) => void;

const L = (
  pts: V3[],
  weight: Weight,
  group: Group,
  opt: Partial<Pick<Line3, "curve" | "closed" | "overshoot" | "alpha">> = {}
): Line3 => ({ kind: "line", pts, weight, group, ...opt });

/* --- Walls --------------------------------------------------------------- */
const W = (x: number, y: number, z = 0): V3 => [x, y, z];

function rect(x0: number, y0: number, x1: number, y1: number, weight: Weight, group: Group, z = 0): Line3[] {
  return [
    L([W(x0, y0, z), W(x1, y0, z)], weight, group),
    L([W(x1, y0, z), W(x1, y1, z)], weight, group),
    L([W(x1, y1, z), W(x0, y1, z)], weight, group),
    L([W(x0, y1, z), W(x0, y0, z)], weight, group),
  ];
}

const SKIRT = 0.12;

function buildWalls(lay: Layout, push: Push) {
  const edge = DOOR.half + DOOR.casing;
  const { wallL, wallR, wallH, sideZ } = lay;
  const rail = CROWN.rail;

  // The left wall, coming toward the viewer from the corner.
  const S = (y: number, z: number): V3 => [wallL, y, z];
  push(L([S(0, 0), S(0, sideZ)], "bold", "wall"));
  push(L([S(SKIRT, 0), S(SKIRT, sideZ)], "fine", "wall"));
  push(L([S(rail, 0), S(rail, sideZ)], "fine", "wall"));
  push(L([S(wallH, 0), S(wallH, sideZ)], "main", "wall"));
  // The corner itself.
  push(L([W(wallL, 0), W(wallL, wallH)], "main", "wall"));

  // The back wall: floor line and skirting, broken by the doorway.
  for (const [a, b] of [
    [wallL, -edge],
    [edge, wallR],
  ]) {
    push(L([W(a, 0), W(b, 0)], "bold", "wall"));
    push(L([W(a, SKIRT), W(b, SKIRT)], "fine", "wall"));
  }
  // Picture rail and ceiling line, the whole width.
  push(L([W(wallL, rail), W(wallR, rail)], "fine", "wall"));
  push(L([W(wallL, wallH), W(wallR, wallH)], "main", "wall"));
}

/* The rod the curtains hang from, under the crown. */
function buildRod(lay: Layout, push: Push) {
  const z = 0.12;
  const end = lay.curtainOuter + 0.06;
  push(L([[-end, ROD_Y + 0.02, z], [end, ROD_Y + 0.02, z]], "main", "curtain"));
  for (const e of [-1, 1]) {
    const ring: V3[] = [];
    for (let i = 0; i < 10; i++) {
      const t = (i / 10) * Math.PI * 2;
      ring.push([e * (end + 0.03) + Math.cos(t) * 0.028, ROD_Y + 0.02 + Math.sin(t) * 0.028, z]);
    }
    push(L(ring, "fine", "curtain", { curve: true, closed: true }));
  }
}

/* --- Doors --------------------------------------------------------------- */
function buildDoor(lay: Layout, push: Push) {
  const d = DOOR;
  const edge = d.half + d.casing;
  const top = d.height;
  const head = top + d.casing;

  // Casing: outer architrave, then the opening itself. The head runs on past
  // the rest of the drawing to the right and trails off.
  push(L([W(-edge, 0), W(-edge, head)], "bold", "door"));
  push(L([W(edge, head), W(edge, 0)], "bold", "door"));
  push(L([W(-edge + 0.03, 0.02), W(-edge + 0.03, head - 0.03)], "hair", "door", { overshoot: false }));
  push(L([W(-edge + 0.03, head - 0.03), W(edge - 0.03, head - 0.03)], "hair", "door", { overshoot: false }));
  push(L([W(edge - 0.03, head - 0.03), W(edge - 0.03, 0.02)], "hair", "door", { overshoot: false }));
  const trail = [
    [-edge, edge, 1, "bold"],
    [edge, lay.wallR + 0.1, 0.7, "main"],
    [lay.wallR + 0.1, lay.wallR + 0.45, 0.4, "fine"],
    [lay.wallR + 0.45, lay.wallR + 0.8, 0.16, "hair"],
  ] as const;
  for (const [a, b, alpha, weight] of trail) push(L([W(a, head), W(b, head)], weight, "door", { alpha, overshoot: false }));
  push(L([W(-d.half, 0.045), W(-d.half, top)], "main", "door"));
  push(L([W(-d.half, top), W(d.half, top)], "main", "door"));
  push(L([W(d.half, top), W(d.half, 0.045)], "main", "door"));
  // Where the two leaves meet.
  push(L([W(0, 0.045), W(0, top)], "main", "door"));

  // Glazing: every pane is its own little rectangle, so the bars read as two
  // fine lines, the way they are drawn on a joiner's elevation.
  const cols = paneCols();
  const rows = paneRows();
  for (const [x0, x1] of cols) {
    for (const [y0, y1] of rows) rect(x0, y0, x1, y1, "fine", "door").forEach(push);
  }
  const glassTop = rows[rows.length - 1][1];
  // The panel under each leaf's glass: one plain box, nothing inside it.
  for (const leaf of [0, 2]) {
    rect(cols[leaf][0] - 0.005, 0.12, cols[leaf + 1][1] + 0.005, d.kick - 0.085, "fine", "door").forEach(push);
  }
  // The narrow windows either side, behind the curtains: a frame, the same
  // rows of panes in two columns, a sill, and a cover under the sill.
  const [s0, s1] = SIDELIGHT;
  const sw = (s1 - s0 - 0.05 - d.muntin) / 2;
  for (const e of [-1, 1]) {
    const X = (x: number) => e * x;
    rect(X(s0), d.kick - 0.05, X(s1), glassTop + 0.05, "main", "door").forEach(push);
    for (let c = 0; c < 2; c++) {
      const a = s0 + 0.025 + c * (sw + d.muntin);
      for (const [y0, y1] of rows) rect(X(a), y0, X(a + sw), y1, "fine", "door").forEach(push);
    }
    push(L([W(X(s0 - 0.02), d.kick - 0.05, 0.03), W(X(s1 + 0.02), d.kick - 0.05, 0.03)], "main", "door"));
    rect(X(s0 + 0.01), 0.12, X(s1 - 0.01), d.kick - 0.1, "fine", "door").forEach(push);
  }

  // A lever handle on its plate, by the meeting stile.
  rect(-0.058, 0.95, -0.026, 1.1, "fine", "door").forEach(push);
  push(L([W(-0.042, 1.045, 0.05), W(-0.16, 1.04, 0.05)], "main", "door", { overshoot: false }));
  push(L([W(-0.042, 1.02, 0.05), W(-0.15, 1.018, 0.05)], "fine", "door", { overshoot: false }));

  // The threshold: a wooden step the doors close onto.
  push(L([W(-edge, 0, 0.09), W(edge, 0, 0.09)], "main", "door"));
  push(L([W(-edge, 0.045, 0.09), W(edge, 0.045, 0.09)], "fine", "door"));
  push(L([W(-edge, 0.045, 0), W(edge, 0.045, 0)], "fine", "door", { overshoot: false }));
  for (const e of [-1, 1]) push(L([W(e * edge, 0, 0.09), W(e * edge, 0.045, 0.09)], "fine", "door", { overshoot: false }));
}

/* --- Drapery -------------------------------------------------------------
   Sheer, gathered under the valance, swept out to a tie at the far side and
   let fall again, with a deep ruffle down the leading edge — the right-hand
   curtain of the photograph, and its mirror. It is light cloth, and the doors
   are open a crack: `t` is the time, and the free edge breathes with it. */
function buildCurtain(side: number, push: Push, t: number) {
  const z = 0.09;
  const x0 = DOOR.half + DOOR.casing - 0.03; // leading edge, under the valance
  const x1 = DOOR.half + DOOR.casing + CURTAIN; // outer edge
  const w = x1 - x0;
  const top = ROD_Y - 0.015;
  const tieY = 1.02;
  const hem = 0.36;
  const tieIn = x0 + w * 0.72;
  const tieOut = x1 - 0.012;

  /* The breeze. Slow waves, out of step between the two curtains, moving the
     cloth most where it is freest — the belly of the sweep and the tail below
     the tie — and not at all at the outer edge, where it is held. */
  const ph = side * 1.3;
  const gust = Math.sin(t * 0.52 + ph) * 0.55 + Math.sin(t * 1.17 + ph * 1.7 + 0.8) * 0.3 + Math.sin(t * 2.3 + ph) * 0.15;
  const P = (x: number, y: number): V3 => {
    const free = Math.max(0, Math.min(1, (x1 - x) / w));
    let bell: number;
    if (y > tieY) {
      const u = (top - y) / (top - tieY);
      bell = Math.sin(u * Math.PI) * 0.1;
    } else {
      const u = (tieY - y) / (tieY - hem);
      bell = 0.06 + u * u * 0.16;
    }
    const d = free * bell * gust;
    return [side * (x - d), y + Math.abs(d) * 0.45, z];
  };

  // The sweep, and the tail below the tie — as (x, y) before mirroring.
  const sweep: [number, number][] = [
    [x0, top],
    [x0 + w * 0.02, 2.02],
    [x0 + w * 0.12, 1.7],
    [x0 + w * 0.32, 1.38],
    [x0 + w * 0.54, 1.16],
    [tieIn, tieY + 0.035],
  ];
  const tail: [number, number][] = [
    [tieIn, tieY - 0.035],
    [x0 + w * 0.62, 0.84],
    [x0 + w * 0.57, 0.6],
    [x0 + w * 0.59, hem],
  ];

  /* The ruffle: a frill standing off the edge, toward the doors and down,
     gathered so its own edge runs in scallops. */
  const ruffle = (edge: [number, number][], depth: number, n: number): [number, number][] => {
    const out: [number, number][] = [];
    for (let i = 0; i <= n; i++) {
      const tt = (i / n) * (edge.length - 1);
      const j = Math.min(edge.length - 2, Math.floor(tt));
      const u = tt - j;
      const a = edge[j];
      const b = edge[j + 1];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1;
      // taper in at the valance and at the tie
      const ends = Math.min(1, Math.min(i, n - i) / 2.5 + 0.25);
      const d = depth * ends * (i % 2 ? 1 : 0.56);
      out.push([a[0] + dx * u + (dy / len) * d, a[1] + dy * u - (dx / len) * d]);
    }
    return out;
  };
  const frill = ruffle(sweep, 0.075, 24);
  const frillLow = ruffle(tail, 0.05, 10);

  const hemPts: V3[] = [];
  for (let i = 0; i <= 8; i++) {
    const u = i / 8;
    hemPts.push(P(x0 + w * (0.56 + 0.45 * u), hem + (i % 2 ? 0.026 : 0)));
  }
  const outerLow: V3[] = [P(x1 + 0.012, hem), P(x1 + 0.006, 0.7), P(tieOut, tieY - 0.035)];
  const outer: V3[] = [P(tieOut, tieY + 0.035), P(x1 + 0.004, 1.7), P(x1, top)];
  const pts = (xy: [number, number][]) => xy.map(([x, y]) => P(x, y));

  push({
    kind: "fill",
    paint: "cloth",
    group: "curtain",
    curve: true,
    side,
    pts: [...pts(frill), ...pts(frillLow), ...hemPts, ...outerLow.slice(1), ...outer],
  });

  push(L(pts(sweep), "main", "curtain", { curve: true }));
  push(L(pts(tail), "main", "curtain", { curve: true }));
  push(L(pts(frill), "fine", "curtain", { curve: true }));
  push(L(pts(frillLow), "fine", "curtain", { curve: true }));
  // the gathers of the ruffle: a tick from the edge out to each scallop
  for (const [edge, fr, n] of [
    [sweep, frill, 24],
    [tail, frillLow, 10],
  ] as const) {
    const base = ruffle(edge as [number, number][], 0, n);
    for (let i = 1; i < n; i += 2) {
      push(L([P(base[i][0], base[i][1]), P(fr[i][0], fr[i][1])], "hair", "curtain", { overshoot: false }));
    }
  }
  push(L(hemPts, "fine", "curtain", { curve: true }));
  push(L([...outerLow, ...outer], "main", "curtain", { curve: true }));

  // Folds: fall from the gathers under the valance, fan in to the tie, then
  // fan back out to the hem.
  for (const f of [0.2, 0.42, 0.63, 0.83]) {
    push(
      L(
        [
          P(x0 + w * f, top - 0.02),
          P(x0 + w * (0.16 + f * 0.82), 1.78),
          P(x0 + w * (0.5 + f * 0.46), 1.32),
          P(tieIn + (tieOut - tieIn) * f, tieY + 0.07),
        ],
        "hair",
        "curtain",
        { curve: true }
      )
    );
  }
  for (const f of [0.25, 0.55, 0.82]) {
    push(
      L(
        [P(tieIn + (tieOut - tieIn) * f, tieY - 0.07), P(x0 + w * (0.62 + f * 0.36), 0.7), P(x0 + w * (0.6 + f * 0.42), hem + 0.05)],
        "hair",
        "curtain",
        { curve: true }
      )
    );
  }
  // the gathered heading, under the valance
  const head: V3[] = [];
  for (let i = 0; i <= 10; i++) head.push(P(x0 + (w * i) / 10, top - (i % 2 ? 0.035 : 0.008)));
  push(L(head, "hair", "curtain", { curve: true }));

  // The tie-back itself.
  push(
    L([P(tieIn - 0.02, tieY + 0.04), P((tieIn + tieOut) / 2, tieY - 0.008), P(tieOut + 0.02, tieY + 0.035)], "main", "curtain", {
      curve: true,
    })
  );
  push(
    L([P(tieIn - 0.02, tieY - 0.03), P((tieIn + tieOut) / 2, tieY - 0.062), P(tieOut + 0.02, tieY - 0.03)], "fine", "curtain", {
      curve: true,
    })
  );
}

/** Both curtains at a moment in time. */
export function curtainsAt(t: number): Item[] {
  const items: Item[] = [];
  buildCurtain(-1, (i) => items.push(i), t);
  buildCurtain(1, (i) => items.push(i), t);
  return items;
}

/* --- Furniture ----------------------------------------------------------- */
function frame(pose: Pose) {
  const c = Math.cos(pose.yaw);
  const s = Math.sin(pose.yaw);
  // forward: the way the piece faces. side: its flank toward the viewer.
  const fx = -c;
  const fz = s;
  const sx = s;
  const sz = c;
  return (f: number, y: number, sd: number): V3 => [pose.x + f * fx + sd * sx, y, pose.z + f * fz + sd * sz];
}

/** The floor plan of a level sheet, as the light needs it. */
function slab(lay: Layout, c: V3, u: V3, v: V3, round: boolean): Slab {
  const C = liftFurn(lay, c);
  const U = liftFurn(lay, u);
  const V = liftFurn(lay, v);
  return { c: C, u: [U[0] - C[0], U[2] - C[2]], v: [V[0] - C[0], V[2] - C[2]], round };
}

function buildChair(lay: Layout, pose: Pose, push: Push, occ: Occluders) {
  const at = frame(pose);
  const g: Group = "chairs";
  const FW = 0.235; // half width at the front
  const BW = 0.2; // half width at the back
  const FD = 0.215;
  const BD = -0.215;
  const SEAT = 0.44;
  const CUSH = 0.478;
  const APR = 0.372;
  const TOP = 0.875;

  const paper = (pts: V3[], curve = false) => push({ kind: "fill", paint: "paper", group: g, pts, curve });

  // A square post, drawn as its two silhouette edges and a little foot.
  const post = (
    f0: number,
    s0: number,
    y0: number,
    h0: number,
    f1: number,
    s1: number,
    y1: number,
    h1: number,
    foot: boolean,
    weight: Weight = "main"
  ) => {
    push({
      kind: "fill",
      paint: "paper",
      group: g,
      pts: [at(f0 + h0, y0, s0 - h0), at(f0 - h0, y0, s0 + h0), at(f1 - h1, y1, s1 + h1), at(f1 + h1, y1, s1 - h1)],
      foot: foot ? at(f1, 0, s1) : undefined,
    });
    push(L([at(f0 + h0, y0, s0 - h0), at(f1 + h1, y1, s1 - h1)], weight, g, { overshoot: false }));
    push(L([at(f0 - h0, y0, s0 + h0), at(f1 - h1, y1, s1 + h1)], weight, g, { overshoot: false }));
    if (foot) {
      push(
        L([at(f1 + h1, y1, s1 - h1), at(f1 + h1, y1, s1 + h1), at(f1 - h1, y1, s1 + h1)], "fine", g, {
          overshoot: false,
        })
      );
    }
  };

  const lf = FD - 0.022;
  const ls = FW - 0.022;
  const bf = BD + 0.022;
  const bs = BW - 0.02;
  const rake = (y: number) => bf - 0.012 - ((y - CUSH) / (TOP - CUSH)) * 0.085;

  // Far legs first: the seat will cover their tops.
  post(bf, -bs, SEAT, 0.02, bf - 0.07, -bs, 0, 0.012, true);
  post(lf, -ls, SEAT, 0.021, lf, -ls, 0, 0.012, true);

  // Seat: the visible front and flank of the frame, then the cushion on top.
  paper([at(FD, CUSH, -FW), at(FD, CUSH, FW), at(FD, APR, FW), at(FD, APR, -FW)]);
  paper([at(FD, CUSH, FW), at(BD, CUSH, BW), at(BD, APR, BW), at(FD, APR, FW)]);
  const pad: V3[] = [];
  const corners: [number, number][] = [
    [FD, -FW],
    [FD, FW],
    [BD, BW],
    [BD, -BW],
  ];
  for (let i = 0; i < 4; i++) {
    const [f0, s0] = corners[i];
    const [f1, s1] = corners[(i + 1) % 4];
    for (const t of [0.12, 0.5, 0.88]) pad.push(at(f0 + (f1 - f0) * t, CUSH, s0 + (s1 - s0) * t));
  }
  paper(pad, true);
  push(L(pad, "main", g, { curve: true, closed: true }));
  push(L([at(FD, SEAT, -FW), at(FD, SEAT, FW), at(BD, SEAT, BW)], "fine", g, { overshoot: false }));
  push(L([at(FD, APR, -FW + 0.03), at(FD, APR, FW - 0.02)], "main", g, { overshoot: false }));
  push(L([at(FD - 0.03, APR, FW), at(BD + 0.03, APR, BW)], "main", g, { overshoot: false }));
  // Upholstery stripes.
  for (const t of [-0.62, -0.21, 0.21, 0.62]) {
    push(L([at(FD - 0.012, CUSH, t * FW), at(BD + 0.012, CUSH, t * BW)], "hair", g, { overshoot: false }));
  }

  // Near legs: front, tapering to the floor; back, raked like a sabre.
  post(lf, ls, SEAT, 0.021, lf, ls, 0, 0.012, true);
  post(bf, bs, SEAT, 0.02, bf - 0.07, bs, 0, 0.012, true);

  // Back: two raked stiles, a bowed crest rail, and a slimmer rail below it.
  const bowed = (y: number, bow: number, half: number, back = 0): V3[] => {
    const out: V3[] = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      const sd = -half + 2 * half * t;
      out.push(at(rake(y) - Math.sin(t * Math.PI) * bow - back, y, sd));
    }
    return out;
  };
  const crestHalf = bs + 0.03;
  // lower rail
  paper([...bowed(0.66, 0.022, bs - 0.012), ...bowed(0.615, 0.022, bs - 0.012).reverse()]);
  push(L(bowed(0.66, 0.022, bs - 0.012), "fine", g, { curve: true }));
  push(L(bowed(0.615, 0.022, bs - 0.012), "fine", g, { curve: true }));
  // stiles
  post(rake(CUSH), -bs, CUSH, 0.016, rake(TOP - 0.02), -bs, TOP - 0.02, 0.014, false);
  post(rake(CUSH), bs, CUSH, 0.016, rake(TOP - 0.02), bs, TOP - 0.02, 0.014, false);
  // crest rail: its face, then the sliver of its top edge
  paper([...bowed(TOP, 0.03, crestHalf, 0.024), ...bowed(TOP - 0.085, 0.03, crestHalf).reverse()]);
  push(L(bowed(TOP, 0.03, crestHalf), "main", g, { curve: true }));
  push(L(bowed(TOP - 0.085, 0.03, crestHalf), "main", g, { curve: true }));
  push(L(bowed(TOP, 0.03, crestHalf, 0.024), "fine", g, { curve: true }));
  for (const e of [-1, 1]) {
    push(
      L([at(rake(TOP), TOP, e * crestHalf), at(rake(TOP - 0.085), TOP - 0.085, e * crestHalf)], "main", g, {
        overshoot: false,
      })
    );
  }

  // Solids, for shadows.
  const stick = (a: V3, b: V3, r: number) =>
    occ.sticks.push({ a: liftFurn(lay, a), b: liftFurn(lay, b), r: r * furnScale(lay, a) });
  stick(at(lf, 0, -ls), at(lf, SEAT, -ls), 0.017);
  stick(at(lf, 0, ls), at(lf, SEAT, ls), 0.017);
  stick(at(bf - 0.07, 0, bs), at(bf, SEAT, bs), 0.017);
  stick(at(bf - 0.07, 0, -bs), at(bf, SEAT, -bs), 0.017);
  stick(at(rake(CUSH), CUSH, -bs), at(rake(TOP), TOP, -bs), 0.016);
  stick(at(rake(CUSH), CUSH, bs), at(rake(TOP), TOP, bs), 0.016);
  stick(at(rake(TOP - 0.04) - 0.02, TOP - 0.04, -crestHalf), at(rake(TOP - 0.04) - 0.02, TOP - 0.04, crestHalf), 0.042);
  stick(at(rake(0.64) - 0.015, 0.64, -bs), at(rake(0.64) - 0.015, 0.64, bs), 0.025);
  occ.slabs.push(slab(lay, at(0, 0.43, 0), at(FD, 0.43, 0), at(0, 0.43, (FW + BW) / 2), false));
  for (const [f, sd] of [
    [lf, -ls],
    [lf, ls],
    [bf - 0.07, bs],
    [bf - 0.07, -bs],
  ]) {
    const p = at(f, 0, sd);
    occ.feet.push([p[0], p[2]]);
  }
  occ.pools.push({ cx: pose.x, cz: pose.z, r: 0.36, a: 0.5 });
}

function buildTable(lay: Layout, pose: Pose, push: Push, occ: Occluders) {
  const g: Group = "table";
  const R = 0.27;
  const TOP = 0.72;
  const dress = lay.tableTop;
  const paper = (pts: V3[], curve = true) => push({ kind: "fill", paint: "paper", group: g, pts, curve });

  // A turned piece shows as its profile, so work in the viewer's own frame:
  // e1 across the line of sight, e2 back toward the eye.
  const e1: [number, number] = [SB, CB];
  const e2: [number, number] = [-CB, SB];
  const P = (a: number, y: number, b = 0, ox = 0, oz = 0): V3 => [
    pose.x + ox + a * e1[0] + b * e2[0],
    y,
    pose.z + oz + a * e1[1] + b * e2[1],
  ];
  const ring = (r: number, y: number, from = 0, to = Math.PI * 2, n = 28, ox = 0, oz = 0): V3[] => {
    const out: V3[] = [];
    for (let i = 0; i <= n; i++) {
      const t = from + ((to - from) * i) / n;
      out.push(P(r * Math.cos(t), y, r * Math.sin(t), ox, oz));
    }
    return out;
  };
  const stick = (a: V3, b: V3, r: number) =>
    occ.sticks.push({ a: liftFurn(lay, a), b: liftFurn(lay, b), r: r * furnScale(lay, a) });

  // Tripod: two cabriole feet splay toward the viewer; the third goes straight
  // back, hidden by the column — it still stands, and still casts a shadow.
  const feetAngles = [Math.PI * 0.14, Math.PI * 0.86, Math.PI * 1.5];
  const leg: [number, number][] = [
    [0.03, 0.25],
    [0.1, 0.23],
    [0.17, 0.13],
    [0.215, 0.035],
    [0.255, 0.0],
  ];
  for (const a of feetAngles) {
    const hidden = Math.sin(a) < -0.5;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    if (!hidden) {
      push(L(leg.map(([r, y]) => P(r * ca, y, r * sa)), "main", g, { curve: true }));
      push(L(leg.slice(0, 4).map(([r, y]) => P(r * ca, y - 0.035, r * sa)), "fine", g, { curve: true }));
    }
    const foot = P(0.25 * ca, 0, 0.25 * sa);
    stick(P(0.03 * ca, 0.22, 0.03 * sa), foot, 0.02);
  }

  // Turned column.
  const profile: [number, number][] = [
    [0.69, 0.035],
    [0.64, 0.028],
    [0.56, 0.05],
    [0.47, 0.036],
    [0.41, 0.024],
    [0.34, 0.045],
    [0.27, 0.052],
    [0.22, 0.034],
  ];
  paper([...profile.map(([y, r]) => P(r, y)), ...profile.map(([y, r]) => P(-r, y)).reverse()]);
  for (const side of [-1, 1]) {
    push(L(profile.map(([y, r]) => P(side * r, y)), "main", g, { curve: true }));
  }
  push(L(ring(0.034, 0.22, 0, Math.PI, 6), "fine", g, { curve: true }));

  // Top: the rim of its thickness, then the surface.
  paper([...ring(R, TOP - 0.03, 0, Math.PI, 14), ...ring(R, TOP, 0, Math.PI, 14).reverse()], false);
  push(L(ring(R, TOP - 0.03, 0, Math.PI, 14), "main", g, { curve: true }));
  push(L(ring(R * 0.93, TOP - 0.045, 0.25, Math.PI - 0.25, 12), "hair", g, { curve: true }));
  paper(ring(R, TOP).slice(0, -1));
  push(L(ring(R, TOP).slice(0, -1), "main", g, { curve: true, closed: true }));

  stick([pose.x, 0.2, pose.z], [pose.x, TOP, pose.z], 0.036);
  occ.slabs.push(slab(lay, [pose.x, TOP - 0.015, pose.z], P(R, TOP - 0.015), P(0, TOP - 0.015, R), true));
  if (dress === "bare") return;

  // A bud vase and two arching stems, in the middle of the top.
  const vo = P(0, 0, 0);
  const ox = vo[0] - pose.x;
  const oz = vo[2] - pose.z;
  const stem = (pts: [number, number][], weight: Weight = "fine") =>
    push(L(pts.map(([a, y]) => P(a, y, 0, ox, oz)), weight, g, { curve: true }));
  if (dress === "branch") {
    stem(
      [
        [0, TOP + 0.2],
        [0.03, TOP + 0.4],
        [0.13, TOP + 0.57],
        [0.26, TOP + 0.63],
      ],
      "main"
    );
    stem([
      [0, TOP + 0.2],
      [-0.03, TOP + 0.38],
      [-0.1, TOP + 0.5],
      [-0.19, TOP + 0.52],
    ]);
  }
  const leaf = (a: number, y: number, ang: number, len: number) => {
    const dx = Math.cos(ang) * len;
    const dy = Math.sin(ang) * len;
    const nx = -Math.sin(ang) * len * 0.3;
    const ny = Math.cos(ang) * len * 0.3;
    stem(
      [
        [a, y],
        [a + dx * 0.5 + nx, y + dy * 0.5 + ny],
        [a + dx, y + dy],
        [a + dx * 0.5 - nx, y + dy * 0.5 - ny],
        [a, y],
      ],
      "hair"
    );
  };
  if (dress === "branch") {
    leaf(0.05, TOP + 0.44, 0.5, 0.09);
    leaf(0.1, TOP + 0.53, 1.9, 0.08);
    leaf(0.18, TOP + 0.6, 0.2, 0.09);
    leaf(0.24, TOP + 0.625, -0.7, 0.07);
    leaf(-0.05, TOP + 0.42, 2.5, 0.08);
    leaf(-0.13, TOP + 0.51, 1.3, 0.07);
    leaf(-0.18, TOP + 0.52, 3.3, 0.07);
  }

  const vase: [number, number][] = [
    [TOP + 0.004, 0.04],
    [TOP + 0.05, 0.062],
    [TOP + 0.105, 0.05],
    [TOP + 0.15, 0.022],
    [TOP + 0.19, 0.02],
    [TOP + 0.205, 0.03],
  ];
  paper([...vase.map(([y, r]) => P(r, y, 0, ox, oz)), ...vase.map(([y, r]) => P(-r, y, 0, ox, oz)).reverse()]);
  for (const side of [-1, 1]) {
    push(L(vase.map(([y, r]) => P(side * r, y, 0, ox, oz)), "main", g, { curve: true }));
  }
  push(L(ring(0.03, TOP + 0.205, 0, Math.PI * 2, 10, ox, oz).slice(0, -1), "fine", g, { curve: true, closed: true }));
  push(L(ring(0.04, TOP + 0.004, 0, Math.PI, 6, ox, oz), "fine", g, { curve: true }));
  stick([vo[0], TOP, vo[2]], [vo[0], TOP + 0.2, vo[2]], 0.05);
}

export function buildModel(lay: Layout): Model {
  const items: Item[] = [];
  const occluders: Occluders = { sticks: [], slabs: [], feet: [], pools: [] };
  const push: Push = (item) => items.push(item);

  buildWalls(lay, push);
  buildDoor(lay, push);
  curtainsAt(0).forEach(push);
  buildRod(lay, push);
  // Furthest from the viewer first.
  buildTable(lay, lay.table, push, occluders);
  [...lay.chairs].sort((a, b) => a.z - b.z).forEach((c) => buildChair(lay, c, push, occluders));

  const bottom = Math.max(...occluders.feet.map(([x, z]) => projectFurn(lay.furn, [x, 0, z])[1]));
  return { items, occluders, bottom };
}
