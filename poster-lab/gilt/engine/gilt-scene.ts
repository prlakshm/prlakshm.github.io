import type { Concept, PieceDef, Placement } from "./concept";
import { FLOATS_PER_VERTEX, SEG, TILT_RANGE } from "./gilt-shaders";
import { SWELL } from "./mesq";

/* The gilded sheet's layout and motion (plan §2.5, §2.7). Replaces scene.ts.

   Nearly all the movement is LIGHT: the gold never changes position (unless the
   concept sets FOIL_WARP). What moves:
   - a virtual sway of the sheet, which moves the studio's lights (not the band,
     so the straight top edge stays);
   - the lights shifting with the pointer;
   - the cursor lamp (hover), or an idle figure-eight path, or a one-time
     left-to-right sweep when the band first arrives in view;
   - the sun (the strip light) drifting on a long loop;
   - each piece "breathing" a degree or so with the swell under it, and rocking
     when a click ripple passes. */

export type PlacedPiece = {
  index: number;
  id: string;
  def: PieceDef;
  place: Placement;
  corners: [number, number][]; // CSS px, y down: (0,0) (1,0) (1,1) (0,1) of the rect
  centre: [number, number]; // rect centre, CSS px
  visCentre: [number, number]; // centre of the part inside the band
  bbox: [number, number, number, number];
  area: number; // CSS px^2 of the rect inside the band
  phase: number;
  breathe: number;
};

export type SceneInput = { pointer: { x: number; y: number } | null };
export type SceneRipple = { x: number; y: number; t: number; strength: number };

const TAU = Math.PI * 2;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

export const bandHeight = (w: number) => Math.floor(clamp(0.194 * w, 180, 340));

export function createGiltScene(concept: Concept) {
  const cfg = concept.config;
  const Mo = cfg.motion;
  const L = cfg.lighting;
  const layout = concept.layout;
  const AW = layout.atlas.w;
  const AH = layout.atlas.h;

  let W = 0;
  let H = 0;
  let mobile = false;
  let pieces: PlacedPiece[] = [];
  let hero: PlacedPiece | null = null;
  let heroPoint: [number, number] | null = null;
  let verts = new Float32Array(0);
  let vertCount = 0;

  const lamp = { x: 0, y: 0, on: 0.7 };
  const shift = { x: 0, y: 0 }; // the pointer's share
  let arrival: { start: number } | null = null;
  let arrived = false;
  let tap: { x: number; y: number; until: number } | null = null;
  let ripples: SceneRipple[] = [];
  const tilt = new Uint8Array(256 * 4).fill(128);

  const keepThreshold = (w: number) =>
    w >= cfg.breakpoint ? 0.35 * clamp((1200 - w) / 300, 0, 1) : 0.35 * clamp((375 - w) / 55, 0, 1);

  const place = () => {
    mobile = W < cfg.breakpoint;
    const k = keepThreshold(W);
    const list: PlacedPiece[] = [];
    const defs = [...layout.pieces].map((d, i) => ({ d, i })).sort((a, b) => (a.d.z ?? 0) - (b.d.z ?? 0) || a.i - b.i);
    for (const { d } of defs) {
      const pl = mobile ? (d.mobile === undefined ? d.desktop : d.mobile) : d.desktop;
      if (!pl) continue;
      if ((d.keep ?? 1) < k) continue;
      const [, , rw, rh] = d.rect;
      const [ax, ay] = d.anchor ?? [0.5, 0.5];
      const s = (pl.h * H) / rh;
      const cx = pl.x * W;
      const cy = pl.y * H;
      const rot = pl.rot ?? 0;
      const c = Math.cos(rot);
      const sn = Math.sin(rot);
      const at = (u: number, v: number): [number, number] => {
        let lx = (u - ax) * rw * s;
        const ly = (v - ay) * rh * s;
        if (pl.flip) lx = -lx;
        return [cx + c * lx - sn * ly, cy + sn * lx + c * ly];
      };
      const corners = [at(0, 0), at(1, 0), at(1, 1), at(0, 1)];
      const xs = corners.map((p) => p[0]);
      const ys = corners.map((p) => p[1]);
      const bbox: [number, number, number, number] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
      const ix0 = clamp(bbox[0], 0, W);
      const ix1 = clamp(bbox[2], 0, W);
      const iy0 = clamp(bbox[1], 0, H);
      const iy1 = clamp(bbox[3], 0, H);
      const area = Math.max(0, ix1 - ix0) * Math.max(0, iy1 - iy0);
      if (area <= 0) continue;
      list.push({
        index: list.length,
        id: d.id,
        def: d,
        place: pl,
        corners,
        centre: at(0.5, 0.5),
        visCentre: [(ix0 + ix1) / 2, (iy0 + iy1) / 2],
        bbox,
        area,
        phase: d.phase ?? ((list.length * 0.618) % 1),
        breathe: d.breathe ?? 1,
      });
    }
    pieces = list;
    // hero: an id, or a point per breakpoint ({desktop:[x,y], mobile:[x,y]} band fractions)
    const spec = (cfg.hero as unknown) ?? layout.hero;
    heroPoint = null;
    if (typeof spec === "string") hero = pieces.find((p) => p.id === spec) ?? null;
    else if (spec && typeof spec === "object") {
      const pt = (spec as Record<string, [number, number] | undefined>)[mobile ? "mobile" : "desktop"];
      if (Array.isArray(pt)) {
        heroPoint = [pt[0] * W, pt[1] * H];
        const [hx, hy] = heroPoint;
        hero = [...pieces].sort((a, b) => Math.hypot(a.visCentre[0] - hx, a.visCentre[1] - hy) - Math.hypot(b.visCentre[0] - hx, b.visCentre[1] - hy))[0] ?? null;
      } else hero = null;
    } else hero = null;
    if (!hero) hero = [...pieces].sort((a, b) => b.area - a.area)[0] ?? null;

    // vertices: a strip of SEG segments down each piece
    verts = new Float32Array(pieces.length * SEG * 6 * FLOATS_PER_VERTEX);
    let n = 0;
    for (const pc of pieces) {
      const d = pc.def;
      const pl = pc.place;
      const [rx, ry, rw, rh] = d.rect;
      const [ax, ay] = d.anchor ?? [0.5, 0.5];
      const s = (pl.h * H) / rh;
      const c = Math.cos(pl.rot ?? 0);
      const sn = Math.sin(pl.rot ?? 0);
      const put = (u: number, v: number) => {
        let lx = (u - ax) * rw * s;
        const ly = (v - ay) * rh * s;
        if (pl.flip) lx = -lx;
        const o = n * FLOATS_PER_VERTEX;
        verts[o] = pl.x * W + c * lx - sn * ly;
        verts[o + 1] = pl.y * H + sn * lx + c * ly;
        verts[o + 2] = (rx + u * rw) / AW;
        verts[o + 3] = (ry + v * rh) / AH;
        verts[o + 4] = pc.index;
        verts[o + 5] = pc.phase;
        verts[o + 6] = v;
        // FOIL_WARP weight: layout "warp" (0..1, default 1); "warpAnchor" 1 pins the piece's
        // top (v = 0) and lets the bend grow toward its bottom, like a strand hung from the edge
        const wa = d.warpAnchor ?? 0;
        verts[o + 7] = (d.warp ?? 1) * (1 - wa + wa * v);
        n++;
      };
      for (let k = 0; k < SEG; k++) {
        const v0 = k / SEG;
        const v1 = (k + 1) / SEG;
        put(0, v0);
        put(1, v0);
        put(1, v1);
        put(0, v0);
        put(1, v1);
        put(0, v1);
      }
    }
    vertCount = n;
  };

  const heroSpot = (): [number, number] => {
    const c = heroPoint ?? (hero ? hero.visCentre : [W * 0.5, H * 0.5]);
    return [clamp(c[0], W * 0.04, W * 0.96), clamp(c[1], H * 0.12, H * 0.9)];
  };

  // The idle figure-eight, phased so that at t = 0 it passes over the hero:
  // the first frame is lit well and the lamp drifts off it slowly.
  let phX = 0;
  let phY = (Mo.IDLE_PATH as number[])[6];
  const phaseFromHero = () => {
    const [x0, xA, , y0, yA, , yP] = Mo.IDLE_PATH as number[];
    if (!hero || !Mo.IDLE_FROM_HERO) {
      phX = 0;
      phY = yP;
      return;
    }
    const [hx, hy] = heroSpot();
    phX = Math.asin(clamp((hx / W - x0) / xA, -1, 1));
    phY = Math.asin(clamp((hy / H - y0) / yA, -1, 1));
  };
  const idleTarget = (t: number) => {
    const [x0, xA, xT, y0, yA, yT] = Mo.IDLE_PATH as number[];
    return { x: W * (x0 + xA * Math.sin((TAU * t) / xT + phX)), y: H * (y0 + yA * Math.sin((TAU * t) / yT + phY)) };
  };

  const scene = {
    get W() {
      return W;
    },
    get H() {
      return H;
    },
    get mobile() {
      return mobile;
    },
    resize(w: number, h: number) {
      const changed = Math.round(w) !== W || Math.round(h) !== H;
      W = Math.round(w);
      H = Math.round(h);
      if (changed) {
        place();
        phaseFromHero();
        const [hx, hy] = heroSpot();
        lamp.x = hx;
        lamp.y = hy;
      }
      return changed;
    },
    geometry: () => ({ verts, count: vertCount }),
    state: () => ({ lamp: { ...lamp }, shift: { ...shift }, ripples: ripples.length, arriving: !!arrival, arrived, tap: !!tap }),
    pieces: () => pieces,
    hero: () => hero,
    heroSpot,

    /* Spots for the capture tool: hero, open water, the far (top-most) and the smallest piece. */
    spots() {
      const hs = heroSpot();
      let best: [number, number] = [W * 0.5, H * 0.5];
      let bestD = -1;
      for (let i = 1; i < 48; i++) {
        for (let j = 1; j < 10; j++) {
          const x = (i / 48) * W;
          const y = H * (0.15 + (0.7 * j) / 10);
          let d = 1e9;
          for (const p of pieces) {
            const dx = Math.max(p.bbox[0] - x, 0, x - p.bbox[2]);
            const dy = Math.max(p.bbox[1] - y, 0, y - p.bbox[3]);
            d = Math.min(d, Math.hypot(dx, dy));
          }
          if (d > bestD) {
            bestD = d;
            best = [x, y];
          }
        }
      }
      const others = pieces.filter((p) => p !== hero);
      const smallest = [...others].sort((a, b) => a.area - b.area)[0] ?? hero;
      const far = [...others].sort((a, b) => a.visCentre[1] - b.visCentre[1] || a.area - b.area)[0] ?? hero;
      const info = (p: PlacedPiece | null) => (p ? { id: p.id, centre: p.visCentre, bbox: p.bbox, area: p.area } : null);
      return { W, H, hero: { ...info(hero), spot: hs }, water: { spot: best, clearance: bestD }, smallest: info(smallest), far: info(far) };
    },

    ripple(x: number, y: number, t: number, strength = 1.1) {
      ripples = [...ripples, { x, y, t, strength }].slice(-6);
    },
    ripples: (t: number) => ripples.filter((r) => t - r.t < Mo.RIPPLE_LIFE),
    tapAt(x: number, y: number, t: number) {
      tap = { x, y, until: t + Mo.TAP_HOLD };
    },
    arrive(t: number) {
      if (arrived) return;
      arrived = true;
      arrival = { start: t };
    },

    /* Park the followers where they would settle (for frozen frames). */
    settle(t: number, input: SceneInput, reduced = false) {
      if (input.pointer && !reduced) {
        lamp.x = input.pointer.x;
        lamp.y = input.pointer.y;
        lamp.on = Mo.LAMP_HOVER_ON;
        shift.x = Mo.POINTER_SHIFT[0] * clamp((2 * input.pointer.x) / W - 1, -1, 1);
        shift.y = Mo.POINTER_SHIFT[1] * clamp(1 - (2 * input.pointer.y) / H, -1, 1);
      } else {
        const [hx, hy] = reduced ? heroSpot() : [idleTarget(t).x, idleTarget(t).y];
        lamp.x = hx;
        lamp.y = hy;
        lamp.on = Mo.LAMP_IDLE_ON;
        shift.x = 0;
        shift.y = 0;
      }
    },
    /* Restart from the parked state (lamp over the hero, as at page load). */
    reset() {
      const [hx, hy] = heroSpot();
      lamp.x = hx;
      lamp.y = hy;
      lamp.on = Mo.LAMP_IDLE_ON;
      shift.x = 0;
      shift.y = 0;
      ripples = [];
      tap = null;
      arrival = null;
      arrived = false;
    },

    step(t: number, dt: number, input: SceneInput) {
      if (dt <= 0) return;
      const pointer = input.pointer;
      if (tap && t > tap.until) tap = null;
      let target: { x: number; y: number; on: number; k: number };
      if (pointer) target = { ...pointer, on: Mo.LAMP_HOVER_ON, k: Mo.LAMP_HOVER_RATE };
      else if (tap) target = { x: tap.x, y: tap.y, on: Mo.LAMP_HOVER_ON, k: Mo.LAMP_HOVER_RATE };
      else if (arrival && t - arrival.start < Mo.ARRIVAL) {
        const u = ease(clamp((t - arrival.start) / Mo.ARRIVAL, 0, 1));
        target = { x: W * (-0.06 + 1.12 * u), y: H * 0.46, on: 1.0, k: 14 };
      } else {
        arrival = null;
        const it = idleTarget(t);
        target = { x: it.x, y: it.y, on: Mo.LAMP_IDLE_ON, k: Mo.LAMP_IDLE_RATE };
      }
      const a = 1 - Math.exp(-dt * target.k);
      lamp.x += (target.x - lamp.x) * a;
      lamp.y += (target.y - lamp.y) * a;
      lamp.on += (target.on - lamp.on) * (1 - Math.exp(-dt * Mo.LAMP_ON_RATE));
      const src = pointer ?? (tap ? { x: tap.x, y: tap.y } : null);
      const sx = src ? Mo.POINTER_SHIFT[0] * clamp((2 * src.x) / W - 1, -1, 1) : 0;
      const sy = src ? Mo.POINTER_SHIFT[1] * clamp(1 - (2 * src.y) / H, -1, 1) : 0;
      const b = 1 - Math.exp(-dt * Mo.SHIFT_RATE);
      shift.x += (sx - shift.x) * b;
      shift.y += (sy - shift.y) * b;
    },

    /* Everything FINISH needs that changes per frame. */
    frame(t: number, opts: { still?: boolean; lampOff?: boolean } = {}) {
      const still = !!opts.still;
      const [ya, yt, ya2, yt2] = Mo.SWAY_YAW as number[];
      const [pa, pt] = Mo.SWAY_PITCH as number[];
      const yaw = still ? 0 : ya * Math.sin((TAU * t) / yt) + ya2 * Math.sin((TAU * t) / yt2);
      const pitch = still ? 0 : pa * Math.sin((TAU * t) / pt);
      const sunX = L.strip.c[0] + (still ? 0 : Mo.SUN_DRIFT * Math.sin((TAU * t) / Mo.SUN_PERIOD));
      const z = clamp(L.LAMP_Z_K * H, L.LAMP_Z_MIN, L.LAMP_Z_MAX);
      // per-piece tilt: breathing with the swell, rocking under click ripples
      tilt.fill(128);
      const live = ripples.filter((r) => t - r.t < Mo.RIPPLE_LIFE && t >= r.t);
      for (const p of pieces) {
        // the piece's own base tilt (baked into the layout), then breathing and ripples
        let tx = p.def.tilt?.[0] ?? 0;
        let ty = p.def.tilt?.[1] ?? 0;
        if (!still) {
          const ph = TAU * (p.visCentre[0] / SWELL.length - t / SWELL.period) + TAU * p.phase;
          tx += Mo.BREATHE * p.breathe * Math.cos(ph);
          ty += Mo.BREATHE * p.breathe * 0.6 * Math.sin(0.83 * ph + 1.3 + TAU * p.phase);
        }
        for (const r of live) {
          const dx = p.visCentre[0] - r.x;
          const dy = p.visCentre[1] - r.y;
          const d = Math.hypot(dx, dy);
          const age = t - r.t;
          const ring = Math.exp(-(((d - age * Mo.RIPPLE_SPEED) / 24) ** 2)) * Math.exp(-age * 1.4) * r.strength;
          const sgn = Math.sin(((d - age * Mo.RIPPLE_SPEED) / 24) * 2.2);
          if (d > 1) {
            tx += (Mo.RIPPLE_TILT * ring * sgn * dx) / d;
            ty -= (Mo.RIPPLE_TILT * ring * sgn * dy) / d;
          }
        }
        const id = (p.index % 255) + 1;
        tilt[id * 4] = Math.round(clamp(127.5 + (tx / TILT_RANGE) * 127.5, 0, 255));
        tilt[id * 4 + 1] = Math.round(clamp(127.5 + (ty / TILT_RANGE) * 127.5, 0, 255));
      }
      return {
        shift: [shift.x + yaw, shift.y + pitch] as [number, number],
        lamp: [lamp.x, lamp.y, z, opts.lampOff ? 0 : lamp.on] as [number, number, number, number],
        sunX,
        tilt,
      };
    },
  };
  return scene;
}

export type GiltScene = ReturnType<typeof createGiltScene>;
