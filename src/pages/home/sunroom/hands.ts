/* ==========================================================================
   Sunroom — other hands.

   Two alternative ways of drawing the same room, tried with `?hand=`:

     curly  a wandering dip pen: every edge is one flowing curve, corners loop
            round now and then, line ends flick off, and the room sprouts a
            few tendrils and stars.
     line   two unbroken lines: one draws the wall, the doors and the curtains
            and runs off the page to the left; the other draws the table and
            the chairs and runs off to the right. The pen never lifts.

   Both return the same kind of SVG as renderSketch — `.sr-l` paths with the
   draw-in order on them, paper fills under the furniture — so the entrance
   works unchanged. The curtains are still in these hands (no breeze).
   ========================================================================== */

import { project, projectFurn, type Layout, type V2 } from "./scene.js";
import { isFurniture, type Item, type Model, type Weight } from "./model.js";
import { GROUP_ORDER, type LineStyle } from "./sketch.js";

export type Hand = "ink" | "curly" | "line";

export function readHand(): Hand {
  const q = new URLSearchParams(window.location.search).get("hand");
  return q === "curly" || q === "line" ? q : "ink";
}

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const f1 = (n: number) => n.toFixed(1);
const dist = (a: V2, b: V2) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const pathOf = (pts: V2[], close = false) => "M" + pts.map((p) => `${f1(p[0])} ${f1(p[1])}`).join("L") + (close ? "Z" : "");

/** Catmull-Rom through the points, sampled to a polyline. */
function sampleCurve(pts: V2[], closed: boolean, per = 8): V2[] {
  const n = pts.length;
  if (n < 2) return pts.slice();
  const at = (i: number) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  const out: V2[] = [pts[0]];
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    for (let s = 1; s <= per; s++) {
      const t = s / per, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  return out;
}

/** A slow wave along a polyline: a hand that is not quite steady. */
function wobble(pts: V2[], amp: number, rnd: () => number, freq = 0.045): V2[] {
  if (amp <= 0) return pts;
  const ph = rnd() * 100, ph2 = rnd() * 100;
  let s = 0;
  return pts.map((p, i) => {
    if (i) s += dist(pts[i - 1], p);
    const q = pts[Math.min(pts.length - 1, i + 1)], o = pts[Math.max(0, i - 1)];
    const dx = q[0] - o[0], dy = q[1] - o[1], l = Math.hypot(dx, dy) || 1;
    const w = amp * (Math.sin(s * freq + ph) * 0.7 + Math.sin(s * freq * 2.7 + ph2) * 0.3);
    return [p[0] - (dy / l) * w, p[1] + (dx / l) * w];
  });
}

/** A ruled segment as a hand draws it, sampled. */
function ruled(a: V2, b: V2, rnd: () => number, jitter: number, bow: number, over: [number, number] | null): V2[] | null {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
  if (len < 0.6) return null;
  const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
  const short = Math.min(1, len / 46);
  const o = () => (over ? (over[0] + rnd() * (over[1] - over[0])) * short : 0);
  const j = () => (rnd() - 0.5) * 2 * jitter * short;
  const o0 = o(), o1 = o();
  const p0: V2 = [a[0] - ux * o0 + nx * j(), a[1] - uy * o0 + ny * j()];
  const p1: V2 = [b[0] + ux * o1 + nx * j(), b[1] + uy * o1 + ny * j()];
  const bw = (rnd() - 0.5) * 2 * bow * Math.min(1, len / 160);
  const n = Math.max(3, Math.min(14, Math.round(len / 18)));
  const out: V2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, k = Math.sin(t * Math.PI) * bw;
    out.push([p0[0] + (p1[0] - p0[0]) * t + nx * k, p0[1] + (p1[1] - p0[1]) * t + ny * k]);
  }
  return out;
}

const projectItem = (lay: Layout, it: Item): V2[] =>
  it.pts.map((p) => (isFurniture(it.group) ? projectFurn(lay.furn, p) : project(lay.sketch, p)));

function fills(lay: Layout, model: Model): string {
  return model.items
    .filter((it) => it.kind === "fill")
    .map((it) => {
      const pts = projectItem(lay, it);
      const d = it.curve ? pathOf(sampleCurve(pts, true, 8), true) : pathOf(pts, true);
      return `<path class="sr-f sr-paper" data-g="${GROUP_ORDER[it.group]}" d="${d}" stroke="none"/>`;
    })
    .join("");
}

export function renderHand(lay: Layout, model: Model, st: LineStyle, hand: Hand): string {
  return hand === "line" ? renderLine(lay, model, st) : renderCurly(lay, model, st);
}

/* --- curly --------------------------------------------------------------- */
function renderCurly(lay: Layout, model: Model, st: LineStyle): string {
  const rnd = mulberry(83);
  const width: Record<Weight, number> = { bold: 1.8, main: 1.5, fine: 1.25, hair: 1.0 };
  const counts: Record<string, number> = {};
  const out: string[] = [];
  const stroke = (pts: V2[], group: Item["group"], w: number, o: number, closed = false) => {
    const n = (counts[group] = (counts[group] ?? 0) + 1);
    out.push(
      `<path class="sr-l" data-g="${GROUP_ORDER[group]}" data-i="${n}" d="${pathOf(pts, closed)}" fill="none" ` +
        `stroke-width="${f1(w)}" stroke-opacity="${f1(o)}" pathLength="1"/>`
    );
  };
  // a small loop at a corner: the pen going round before it carries on
  const loopAt = (p: V2, inDir: V2, r: number): V2[] => {
    const a0 = Math.atan2(inDir[1], inDir[0]);
    const cx = p[0] - Math.sin(a0) * r, cy = p[1] + Math.cos(a0) * r, s = rnd() < 0.5 ? 1 : -1;
    const o: V2[] = [];
    for (let i = 1; i <= 10; i++) {
      const t = a0 - Math.PI / 2 + (i / 10) * Math.PI * 2 * s;
      o.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]);
    }
    return o;
  };

  for (const it of model.items) {
    if (it.kind === "fill") continue;
    let pts = projectItem(lay, it);
    if (!it.curve) {
      const dense: V2[] = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], c = pts[i + 1], n = Math.max(2, Math.round(dist(a, c) / 14));
        for (let s = 0; s < n; s++) dense.push([a[0] + ((c[0] - a[0]) * s) / n, a[1] + ((c[1] - a[1]) * s) / n]);
        if (i < pts.length - 2 && rnd() < 0.35 && dist(a, c) > 24) dense.push(...loopAt(c, [c[0] - a[0], c[1] - a[1]], 2.2 + rnd() * 2.2));
      }
      dense.push(pts[pts.length - 1]);
      pts = dense;
    }
    pts = sampleCurve(pts, !!it.closed, 6);
    pts = wobble(pts, it.group === "curtain" ? 1.6 : 0.9, rnd, 0.05);
    // a flick off the end
    if (!it.closed && rnd() < 0.5) {
      const e = pts[pts.length - 1], q = pts[Math.max(0, pts.length - 4)];
      const dx = e[0] - q[0], dy = e[1] - q[1], l = Math.hypot(dx, dy) || 1;
      const r = 3 + rnd() * 4, s = rnd() < 0.5 ? 1 : -1;
      pts = pts.concat(
        sampleCurve(
          [e, [e[0] + (dx / l) * r - (dy / l) * r * s, e[1] + (dy / l) * r + (dx / l) * r * s], [e[0] + (dx / l) * r * 0.4 - (dy / l) * r * 1.8 * s, e[1] + (dy / l) * r * 0.4 + (dx / l) * r * 1.8 * s]],
          false,
          5
        ).slice(1)
      );
    }
    stroke(pts, it.group, width[it.weight], 0.9 * (it.alpha ?? 1), !!it.closed);
  }

  // and the room sprouts: tendrils off the curtain hems and the vase, stars in the glass
  const tendril = (p: V2, ang: number, len: number, k: number): V2[] => {
    const o: V2[] = [p];
    let a = ang, x = p[0], y = p[1];
    for (let i = 0; i < 14; i++) {
      a += k * (0.16 + rnd() * 0.06);
      x += (Math.cos(a) * len) / 14;
      y += (Math.sin(a) * len) / 14;
      o.push([x, y]);
    }
    return sampleCurve(o, false, 4);
  };
  const leaf = (p: V2, ang: number, s: number): V2[] => {
    const o: V2[] = [];
    for (let k = 0; k < 2; k++) {
      for (let i = 0; i <= 12; i++) {
        const t = k ? 1 - i / 12 : i / 12, along = s * t, across = (k ? -1 : 1) * s * 0.38 * Math.sin(t * Math.PI);
        o.push([p[0] + along * Math.cos(ang) - across * Math.sin(ang), p[1] + along * Math.sin(ang) + across * Math.cos(ang)]);
      }
    }
    return o;
  };
  const bbox = (pts: V2[]) => {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  };
  for (const c of model.items.filter((i) => i.kind === "fill" && i.paint === "cloth")) {
    const bb = bbox(projectItem(lay, c));
    for (const x of [bb[0] + (bb[2] - bb[0]) * 0.3, bb[0] + (bb[2] - bb[0]) * 0.7]) {
      const t = tendril([x, bb[3] - 2], Math.PI / 2 + (rnd() - 0.5), 26 + rnd() * 20, rnd() < 0.5 ? 1 : -1);
      stroke(t, "curtain", 1.2, 0.85);
      stroke(leaf(t[t.length - 1], rnd() * 6.28, 7), "curtain", 1.05, 0.9, true);
    }
  }
  const tb = bbox(model.items.filter((i) => i.group === "table").flatMap((i) => projectItem(lay, i)));
  for (let i = 0; i < 5; i++) {
    const p: V2 = [tb[0] + (tb[2] - tb[0]) * (0.35 + rnd() * 0.3), tb[1] + 6 + rnd() * 8];
    const t = tendril(p, -Math.PI / 2 + (rnd() - 0.5) * 1.6, 18 + rnd() * 26, rnd() < 0.5 ? 1 : -1);
    stroke(t, "table", 1.1, 0.9);
    stroke(leaf(t[t.length - 1], rnd() * 6.28, 6), "table", 1.0, 0.9, true);
  }
  const glass = bbox(model.items.filter((i) => i.group === "door" && i.kind === "line" && i.weight === "fine").flatMap((i) => projectItem(lay, i)));
  for (let i = 0; i < 4; i++) {
    const cx = glass[0] + 10 + rnd() * (glass[2] - glass[0] - 20), cy = glass[1] + 8 + rnd() * 50, r = 2.5 + rnd() * 2.5;
    const s: V2[] = [];
    for (let k = 0; k < 10; k++) {
      const t = (k / 10) * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? r * 0.45 : r;
      s.push([cx + Math.cos(t) * rr, cy + Math.sin(t) * rr]);
    }
    stroke(s, "door", 0.95, 0.9, true);
  }

  return fills(lay, model) + `<g stroke="${st.color}" stroke-linecap="round" stroke-linejoin="round">${out.join("")}</g>`;
}

/* --- one line (two, one per side) --------------------------------------- */
interface Stroke {
  pts: V2[];
  group: Item["group"];
}

function renderLine(lay: Layout, model: Model, st: LineStyle): string {
  const rnd = mulberry(41);
  const pool: Stroke[] = [];
  for (const it of model.items) {
    if (it.kind === "fill") continue;
    if (it.weight === "hair") continue; // a single line cannot afford every detail
    if ((it.alpha ?? 1) < 1) continue; // the head's trail would run into the title
    // the curtain: its edges, hem and tie, and one fold in two
    if (it.group === "curtain" && it.weight === "fine" && rnd() < 0.5) continue;
    const pts = projectItem(lay, it);
    if (it.curve) {
      pool.push({ pts: sampleCurve(pts.map((p) => [p[0] + (rnd() - 0.5) * 0.4, p[1] + (rnd() - 0.5) * 0.4]), !!it.closed, 10), group: it.group });
      continue;
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const r = ruled(pts[i], pts[i + 1], rnd, 0.4, 1.2, null);
      if (r) pool.push({ pts: r, group: it.group });
    }
  }
  // the pen visits the strokes nearest-first from a starting point
  const chain = (list: Stroke[], start: V2): V2[][] => {
    const left = list.slice(), out: V2[][] = [];
    let cur = start;
    while (left.length) {
      let best = 0, bd = Infinity, rev = false;
      for (let i = 0; i < left.length; i++) {
        const p = left[i].pts, d0 = dist(cur, p[0]), d1 = dist(cur, p[p.length - 1]);
        if (d0 < bd) { bd = d0; best = i; rev = false; }
        if (d1 < bd) { bd = d1; best = i; rev = true; }
      }
      const s = left.splice(best, 1)[0], pts = rev ? s.pts.slice().reverse() : s.pts;
      out.push(pts);
      cur = pts[pts.length - 1];
    }
    return out;
  };
  // each curtain as one sweep: its strokes in drawing order, joined end to end
  const doorX = model.items.filter((i) => i.group === "door").flatMap((i) => projectItem(lay, i)).map((p) => p[0]);
  const doorMid = (Math.min(...doorX) + Math.max(...doorX)) / 2;
  const sweep = (list: Stroke[]): Stroke => {
    let pts: V2[] = [];
    for (const s of list) {
      const end = pts[pts.length - 1];
      const p = end && dist(end, s.pts[s.pts.length - 1]) < dist(end, s.pts[0]) ? s.pts.slice().reverse() : s.pts;
      pts = end ? pts.concat(sampleCurve([end, p[0]], false, 3).slice(1), p.slice(1)) : p.slice();
    }
    return { pts, group: "curtain" };
  };
  const cur = pool.filter((s) => s.group === "curtain" && s.pts.length > 2);
  const curtains = [sweep(cur.filter((s) => s.pts[0][0] < doorMid)), sweep(cur.filter((s) => s.pts[0][0] >= doorMid))];
  const roomStrokes = pool.filter((s) => s.group === "wall" || s.group === "door").concat(curtains);
  const furnStrokes = pool.filter((s) => s.group === "table" || s.group === "chairs");
  const furnX = furnStrokes.flatMap((s) => s.pts).map((p) => p[0]);
  const room = chain(roomStrokes, [0, lay.sketch.hy - 200]);
  const furn = chain(furnStrokes, [Math.min(...furnX), lay.floorY]);

  const travel = (a: V2, b: V2): V2[] => {
    const d = dist(a, b), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    const nx = -(b[1] - a[1]) / (d || 1), ny = (b[0] - a[0]) / (d || 1);
    const k = 0.07 * Math.min(d, 80) * (rnd() < 0.5 ? 1 : -1);
    return sampleCurve([a, [mx + nx * k, my + ny * k], b], false, 8);
  };
  const join = (seq: V2[][]): V2[] => {
    let o: V2[] = [];
    for (const pts of seq) {
      if (o.length) o = o.concat(travel(o[o.length - 1], pts[0]).slice(1));
      o = o.concat(o.length ? pts.slice(1) : pts);
    }
    return o;
  };
  let left = join(room), right = join(furn);
  // each runs off along the floor on its own side
  const e = right[right.length - 1];
  right = right.concat(sampleCurve([e, [e[0] + 30, e[1] + 30], [e[0] - 60, e[1] + 55], [e[0] + 90, e[1] + 70], [lay.width + 10, e[1] + 60]], false, 8).slice(1));
  const l = left[left.length - 1];
  left = left.concat(sampleCurve([l, [l[0] - 40, l[1] + 30], [l[0] + 20, l[1] + 60], [-10, l[1] + 80]], false, 8).slice(1));

  const line = (pts: V2[], g: number) =>
    `<path class="sr-l" data-g="${g}" data-i="1" d="${pathOf(wobble(pts, 0.35, rnd, 0.06))}" fill="none" stroke-width="1.9" stroke-opacity="0.95" pathLength="1"/>`;
  return (
    fills(lay, model) +
    `<g stroke="${st.color}" stroke-linecap="round" stroke-linejoin="round">${line(left, GROUP_ORDER.wall)}${line(right, GROUP_ORDER.chairs)}</g>`
  );
}
