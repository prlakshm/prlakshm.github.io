/* ==========================================================================
   Sunroom — the olive branch.

   Two sprigs hanging just outside the doors, described in the plane of the
   glass: slender pointed ovals along a stem, alternating sides, the way olive
   grows. Being against the glass, they are a silhouette in the panes and a
   shadow in everything the panes light — the shader carries them down the
   sun's rays to the floor and through the shafts in the air.

   Each sprig sways from its base and each leaf flutters a little on its own.
   ========================================================================== */

import type { LeafShadow } from "./light.js";

interface Sprig {
  /** Where the stem comes into the glass: metres along the wall from the
      doors' centre (x) and above the floor (y). */
  x: number;
  y: number;
  /** Heading, radians: 0 runs to the right, positive turns upward. */
  heading: number;
  length: number;
  leaves: number;
  /** How far it bends over its length, radians. */
  curl: number;
  seed: number;
}

/** One reaching in from the top of the left leaf, one from the right-hand
    side lower down. */
const SPRIGS: Sprig[] = [
  { x: -0.56, y: 2.02, heading: -0.72, length: 0.92, leaves: 12, curl: 0.5, seed: 3 },
  { x: 0.58, y: 1.5, heading: 3.6, length: 0.7, leaves: 9, curl: -0.55, seed: 11 },
];

const rand = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export function leavesAt(time: number): LeafShadow[] {
  const out: LeafShadow[] = [];
  for (const sp of SPRIGS) {
    // the whole sprig leans in the air and comes back
    const sway = Math.sin(time * 0.62 + sp.seed) * 0.035 + Math.sin(time * 0.27 + sp.seed * 2.1) * 0.025;
    const segs = 5;
    const n = segs * 4;
    let u = sp.x;
    let v = sp.y;
    const pts: [number, number, number][] = [[u, v, sp.heading + sway * 0.4]];
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const h = sp.heading + sway * (0.4 + t * 1.4) + sp.curl * t * t;
      const step = sp.length / n;
      u += Math.cos(h) * step;
      v += Math.sin(h) * step;
      pts.push([u, v, h]);
    }
    // the stem, as a few very slender shapes end to end
    for (let s = 0; s < segs; s++) {
      const a = pts[s * 4];
      const b = pts[s * 4 + 4];
      const half = Math.hypot(b[0] - a[0], b[1] - a[1]) / 2;
      out.push({
        u: (a[0] + b[0]) / 2,
        v: (a[1] + b[1]) / 2,
        du: (b[0] - a[0]) / (2 * half),
        dv: (b[1] - a[1]) / (2 * half),
        half: half * 1.1,
        ratio: 0.05 * (1 - s / (segs * 1.5)),
      });
    }
    // leaves, alternating sides, a touch smaller toward the tip
    for (let i = 0; i < sp.leaves; i++) {
      const t = (i + 0.8) / (sp.leaves + 0.2);
      const k = Math.min(n, Math.round(t * n));
      const [bu, bv, h] = pts[k];
      const side = i % 2 ? 1 : -1;
      const r = rand(sp.seed * 31 + i);
      const flutter = Math.sin(time * (1.3 + r * 1.4) + i * 1.7 + sp.seed) * 0.1;
      const tip = i === sp.leaves - 1;
      const ang = h + (tip ? 0 : side * (0.7 + r * 0.3)) + flutter;
      const half = (0.075 - 0.022 * t) * (0.86 + r * 0.3);
      const du = Math.cos(ang);
      const dv = Math.sin(ang);
      out.push({ u: bu + du * half * 1.04, v: bv + dv * half * 1.04, du, dv, half, ratio: 0.27 });
    }
  }
  return out;
}
