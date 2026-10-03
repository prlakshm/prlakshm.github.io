/* ==========================================================================
   Sunroom — the sketch.

   Projects the model's 3D line work to the page and gives it a hand: ruled
   lines bow a hair and run past their corners the way a draughtsman's do,
   curves are drawn through their points, and every path carries the order it
   should be drawn in so the room can sketch itself on load.

   Output is an SVG string. It is rebuilt whole on resize — a few hundred short
   paths — rather than patched, which keeps this file free of DOM bookkeeping.
   ========================================================================== */

import { project, projectFurn, sunReach, type Layout, type V2 } from "./scene.js";
import { isFurniture, type Group, type Item, type Line3, type Model, type Weight } from "./model.js";

export interface LineStyle {
  color: string;
  width: Record<Weight, number>;
  opacity: Record<Weight, number>;
  /** px of wobble on each end of a ruled line. */
  jitter: number;
  /** px a long ruled line may bow at its middle. */
  bow: number;
  /** px a ruled line runs past its end, [min, max]. */
  over: [number, number];
  /** Chance a bold or main line is gone over twice. */
  double: number;
}

/** Small seeded generator, so the sketch is the same drawing on every load. */
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

function ruled(a: V2, b: V2, rnd: () => number, st: LineStyle, overshoot: boolean): string {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len < 0.6) return `M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}`;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const short = Math.min(1, len / 46);
  const o = () => (overshoot ? (st.over[0] + rnd() * (st.over[1] - st.over[0])) * short : 0);
  const j = () => (rnd() - 0.5) * 2 * st.jitter * short;
  const o0 = o();
  const o1 = o();
  const p0: V2 = [a[0] - ux * o0 + nx * j(), a[1] - uy * o0 + ny * j()];
  const p1: V2 = [b[0] + ux * o1 + nx * j(), b[1] + uy * o1 + ny * j()];
  const bow = (rnd() - 0.5) * 2 * st.bow * Math.min(1, len / 160);
  if (len < 90) {
    const mx = (p0[0] + p1[0]) / 2 + nx * bow;
    const my = (p0[1] + p1[1]) / 2 + ny * bow;
    return `M${f1(p0[0])} ${f1(p0[1])}Q${f1(mx)} ${f1(my)} ${f1(p1[0])} ${f1(p1[1])}`;
  }
  const b2 = bow * (0.4 + rnd() * 0.6);
  const c0: V2 = [p0[0] + (p1[0] - p0[0]) * 0.33 + nx * bow, p0[1] + (p1[1] - p0[1]) * 0.33 + ny * bow];
  const c1: V2 = [p0[0] + (p1[0] - p0[0]) * 0.68 + nx * b2, p0[1] + (p1[1] - p0[1]) * 0.68 + ny * b2];
  return `M${f1(p0[0])} ${f1(p0[1])}C${f1(c0[0])} ${f1(c0[1])} ${f1(c1[0])} ${f1(c1[1])} ${f1(p1[0])} ${f1(p1[1])}`;
}

/** Catmull-Rom through the points, as cubic Béziers. */
function smooth(pts: V2[], closed: boolean): string {
  const n = pts.length;
  if (n < 2) return "";
  const at = (i: number) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1: V2 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: V2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f1(c1[0])} ${f1(c1[1])} ${f1(c2[0])} ${f1(c2[1])} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return closed ? d + "Z" : d;
}

const poly = (pts: V2[]) => "M" + pts.map((p) => `${f1(p[0])} ${f1(p[1])}`).join("L") + "Z";

/** Draw-in order: the wall and doors first, then drapery, then the furniture. */
export const GROUP_ORDER: Record<Group, number> = { wall: 0, door: 1, curtain: 2, table: 3, chairs: 4 };

/** The curtains move, so their paths are drawn with their own seed: the same
    jitter every frame, whatever else is on the page. */
const CURTAIN_SEED = 11;

/** The path data for a run of items, in order: one per fill or curve, one per
    ruled segment (and one more for the odd line gone over twice). */
export function pathsFor(lay: Layout, items: Item[], st: LineStyle, seed: number): string[] {
  const rnd = mulberry(seed);
  const out: string[] = [];
  for (const item of items) {
    const pts = item.pts.map((p) => (isFurniture(item.group) ? projectFurn(lay.furn, p) : project(lay.sketch, p)));
    if (item.kind === "fill") {
      out.push(item.curve ? smooth(pts, true) : poly(pts));
    } else if (item.curve) {
      const wob = pts.map((p) => [p[0] + (rnd() - 0.5) * st.jitter, p[1] + (rnd() - 0.5) * st.jitter] as V2);
      out.push(smooth(wob, !!item.closed));
    } else {
      const overshoot = item.overshoot !== false;
      const heavy = item.weight === "bold" || item.weight === "main";
      for (let i = 0; i < pts.length - 1; i++) {
        out.push(ruled(pts[i], pts[i + 1], rnd, st, overshoot));
        if (heavy && rnd() < st.double) out.push(ruled(pts[i], pts[i + 1], rnd, st, overshoot));
      }
    }
  }
  return out;
}

/** The curtains' path data at a moment: for mount.ts to breathe them. */
export function curtainPaths(lay: Layout, items: Item[], st: LineStyle): string[] {
  return pathsFor(lay, items, st, CURTAIN_SEED);
}

export function renderSketch(lay: Layout, model: Model, st: LineStyle, seed = 7): string {
  const rndMain = mulberry(seed);
  const rndCurtain = mulberry(CURTAIN_SEED);
  const v = lay.sketch;
  const out: string[] = [];
  const defs: string[] = [];
  const counts: Record<string, number> = {};
  let cloths = 0;
  let feet = 0;

  const stroke = (d: string, line: Line3, ghost: boolean) => {
    const n = (counts[line.group] = (counts[line.group] ?? 0) + 1);
    const w = st.width[line.weight] * (ghost ? 0.8 : 1);
    const o = st.opacity[line.weight] * (ghost ? 0.5 : 1) * (line.alpha ?? 1);
    const c = line.group === "curtain" ? ' data-c=""' : "";
    out.push(
      `<path class="sr-l" data-g="${GROUP_ORDER[line.group]}" data-i="${n}"${c} d="${d}" fill="none" ` +
        `stroke-width="${w.toFixed(2)}" stroke-opacity="${o.toFixed(2)}" pathLength="1"/>`
    );
  };

  for (const item of model.items) {
    // the room in perspective; the furniture in its own parallel projection
    const pts = item.pts.map((p) => (isFurniture(item.group) ? projectFurn(lay.furn, p) : project(v, p)));
    const rnd = item.group === "curtain" ? rndCurtain : rndMain;

    if (item.kind === "fill") {
      const d = item.curve ? smooth(pts, true) : poly(pts);
      if (item.paint === "cloth") {
        /* Sheer white over the shaded wall, warming toward the edge nearest
           the glass. */
        const xs = pts.map((p) => p[0]);
        const lo = Math.min(...xs);
        const hi = Math.max(...xs);
        const inner = (item.side ?? 1) > 0 ? lo : hi;
        const outer = (item.side ?? 1) > 0 ? hi : lo;
        const id = `sr-cloth-${cloths++}`;
        defs.push(
          `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f1(inner)}" y1="0" x2="${f1(outer)}" y2="0">` +
            `<stop offset="0" style="stop-color:var(--sr-cloth-glow)"/>` +
            `<stop offset="0.55" style="stop-color:var(--sr-cloth)"/>` +
            `<stop offset="1" style="stop-color:var(--sr-cloth)"/></linearGradient>`
        );
        out.push(`<path class="sr-f sr-cloth" data-g="${GROUP_ORDER.curtain}" data-c="" d="${d}" fill="url(#${id})" stroke="none"/>`);
      } else {
        /* A leg standing in the light is lit as far up as the light stands:
           follow the sun back from the top of the glass to this spot. */
        const a = item.foot ? projectFurn(lay.furn, item.foot) : null;
        const reach = a ? sunReach(lay, a[0], a[1]) : 0;
        let fill = "";
        if (a && reach > 3) {
          const b: V2 = [a[0], a[1] - reach * 1.08];
          const id = `sr-foot-${feet++}`;
          defs.push(
            `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}">` +
              `<stop offset="0" style="stop-color:var(--sr-sun)"/>` +
              `<stop offset="0.86" style="stop-color:var(--sr-sun)"/>` +
              `<stop offset="1" style="stop-color:#fff"/></linearGradient>`
          );
          // inline style: a presentation attribute would lose to .sr-paper
          fill = ` style="fill:url(#${id})"`;
        }
        out.push(`<path class="sr-f sr-paper" data-g="${GROUP_ORDER[item.group]}" d="${d}"${fill} stroke="none"/>`);
      }
      continue;
    }

    if (item.curve) {
      const wob = pts.map((p) => [p[0] + (rnd() - 0.5) * st.jitter, p[1] + (rnd() - 0.5) * st.jitter] as V2);
      stroke(smooth(wob, !!item.closed), item, false);
      continue;
    }
    const overshoot = item.overshoot !== false;
    const heavy = item.weight === "bold" || item.weight === "main";
    for (let i = 0; i < pts.length - 1; i++) {
      stroke(ruled(pts[i], pts[i + 1], rnd, st, overshoot), item, false);
      if (heavy && rnd() < st.double) stroke(ruled(pts[i], pts[i + 1], rnd, st, overshoot), item, true);
    }
  }

  return (
    `<defs>${defs.join("")}</defs>` +
    `<g stroke="${st.color}" stroke-linecap="round" stroke-linejoin="round">${out.join("")}</g>`
  );
}
