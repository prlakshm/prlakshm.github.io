import { FLOATS_PER_VERTEX } from "./painter.js";
import { DRIFT } from "./shaders.js";

/* What floats in the pond, and how it moves. After the pixie-water photos:
   true confetti (foil stars, flecks, snipped curls, two long curling ribbons),
   rafts of it gathered together with quiet water between, about a third of it
   just under the surface or sunk. Everything rides one surface: one current,
   one swell whose phase is set by position (so neighbours move together, in
   small orbits), tilting the foil so it catches the light.

   The cursor is a finger in the water: only its MOVEMENT pushes things (a
   wake that drifts and slowly heals), and it carries a lamp, like Ann
   Nguyen's foil cards, that the foil reflects. */

const TAU = Math.PI * 2;
const GOLD = 1;
const HOLO = 2;
const RIBBON = 3;
const SPARKLE = 4;
const FLECK = 5;
const CRESCENT = 6;

type Piece = {
  kind: number;
  x: number; // drifting home position
  y: number;
  ox: number; // the wake's offset and velocity
  oy: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  spin: number; // rad/s
  kick: number; // the wake's spin, rad/s
  seed: number;
  depth: number;
  hue: number;
  speed: number;
  z: number;
  flare: number;
  period: number; // sparkles
  phase: number;
  coil: number; // ribbons
};

type Flare = { piece: Piece; start: number; dur: number };

export type Input = { pointer: { x: number; y: number } | null; velocity: { x: number; y: number } };

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createScene() {
  let W = 0;
  let H = 0;
  let pieces: Piece[] = [];
  let flares: Flare[] = [];
  let nextFlare = 1.5;
  const lamp = { x: 0, y: 0, on: 0.7 };
  const env = { x: 0, y: 0 };
  let buf = new Float32Array(0);
  const rng = mulberry32(81);

  const swell = (x: number, y: number, t: number) => {
    const s1 = TAU * (x / 640 - t / 5.5);
    const s2 = TAU * (x / 230 + t / 3.7);
    const amp = 0.7 + 0.6 * Math.min(1, Math.max(0, y / H));
    return {
      dx: 0.8 * Math.cos(s1) * amp,
      dy: (1.2 * Math.sin(s1) + 0.5 * Math.sin(s2)) * amp,
      // the slope under the piece, which is what makes foil flash
      tx: (1.2 * Math.cos(s1) * (TAU / 640) + 0.5 * Math.cos(s2) * (TAU / 230)) * amp * 3.2,
      ty: 0.045 * Math.sin(s1 + 1.3),
      sway: 0.026 * Math.sin(s1),
    };
  };

  const layout = () => {
    const r = mulberry32(20261004);
    const list: Piece[] = [];
    const mk = (kind: number, x: number, y: number, size: number, extra: Partial<Piece> = {}): Piece => ({
      kind,
      x,
      y,
      ox: 0,
      oy: 0,
      vx: 0,
      vy: 0,
      size,
      angle: r() * TAU,
      spin: (0.4 + r() * 2.1) * (Math.PI / 180) * (r() < 0.5 ? -1 : 1),
      kick: 0,
      seed: r(),
      depth: 0,
      hue: 0,
      speed: DRIFT * (0.97 + r() * 0.06), // the water's own drift, so pieces ride it
      z: r(),
      flare: 0,
      period: 0,
      phase: r() * TAU,
      coil: 0,
      ...extra,
    });
    // depth: about a sixth just under, a sixth sunk, the rest floating
    const depthOf = () => {
      const d = r();
      return d < 0.17 ? 0.85 + r() * 0.15 : d < 0.34 ? 0.45 + r() * 0.15 : r() * 0.06;
    };
    // Gold comes only from the hand-placed heroes below; scattered stars are holo film.
    const starKind = () => HOLO;
    // Stars at the pixie photos' scale (outer radius, CSS px).
    const starSize = (kind: number, hue: number) =>
      kind === GOLD ? 32 + r() * 10 : hue > 4.5 ? 13 + r() * 5 : 16 + r() * 10;
    // Far (higher) pieces are smaller.
    const near = (y: number) => 0.8 + 0.35 * Math.min(1, Math.max(0, y / H));
    const holoHue = () => {
      const h = r();
      return h < 0.15 ? 5 : Math.floor(r() * 5);
    };
    const clearOfTop = (y: number, rad: number) => Math.max(y, rad + 8);
    const addStar = (x: number, y: number, kindIn?: number) => {
      const kind = kindIn ?? starKind();
      const hue = kind === GOLD ? 0 : holoHue();
      const size = starSize(kind, hue) * near(y);
      list.push(mk(kind, x, clearOfTop(y, size), size, { depth: kind === GOLD ? r() * 0.05 : depthOf(), hue }));
    };
    const addFleck = (x: number, y: number) => {
      const size = (1 + r() * 1.4) * near(y);
      list.push(mk(FLECK, x, clearOfTop(y, 3), size, { depth: r() < 0.3 ? 0.7 + r() * 0.3 : r() * 0.1, hue: r() < 0.15 ? 6 : Math.floor(r() * 6) }));
    };

    // Two rafts: floating things gather, touch, and drift as one.
    const raft = (cx: number, cy: number, rx: number, ry: number, stars: number, flecks: number) => {
      const sp = DRIFT * (0.97 + r() * 0.06);
      let tries = 0;
      for (let i = 0; i < stars; i++) {
        const a = r() * TAU;
        const d = Math.pow(r(), 0.7);
        const x = cx + Math.cos(a) * rx * d;
        const y = cy + Math.sin(a) * ry * d;
        // close, even touching, but never stacked into one blob
        if (list.some((p) => (p.kind === HOLO || p.kind === GOLD) && Math.hypot(p.x - x, (p.y - y) / 0.75) < 0.6 * (p.size + 20))) {
          if (++tries > 60) break;
          i--;
          continue;
        }
        addStar(x, y);
        list[list.length - 1].speed = sp;
      }
      for (let i = 0; i < flecks; i++) {
        const a = r() * TAU;
        const d = Math.pow(r(), 0.7);
        addFleck(cx + Math.cos(a) * rx * d * 1.1, cy + Math.sin(a) * ry * d * 1.1);
        list[list.length - 1].speed = sp;
      }
      return sp;
    };
    const s = W / 1440;
    raft(0.3 * W, 0.5 * H, 95 * s + 24, 0.18 * H, Math.round(8 * s) + 2, Math.round(8 * s) + 2);
    let spB = DRIFT;
    if (W > 700) spB = raft(0.78 * W, 0.32 * H, 65 * s + 18, 0.13 * H, Math.round(5 * s) + 1, Math.round(5 * s) + 1);
    // The gold glitter heroes, spread across the band at different depths of field.
    [[0.06, 0.4], [0.27, 0.56], [0.52, 0.32], [0.82, 0.3], [0.97, 0.66]].forEach(([u, v]) => {
      if (u * 1440 < W + 40) addStar(u * W + (r() - 0.5) * 30, v * H + (r() - 0.5) * 14, GOLD);
    });

    // The rest scattered, thinner in two quiet stretches.
    const quiet = (x: number) => {
      const u = x / W;
      return Math.exp(-(((u - 0.55) / 0.045) ** 2)) + Math.exp(-(((u - 0.93) / 0.05) ** 2));
    };
    const spaced = (x: number, y: number, min: number) => list.every((p) => p.kind === RIBBON || Math.hypot(p.x - x, p.y - y) > min);
    const scatter = (n: number, add: (x: number, y: number) => void, min: number) => {
      let placed = 0;
      for (let k = 0; k < n * 12 && placed < n; k++) {
        const x = r() * W;
        const y = 10 + Math.pow(r(), 1.3) * (H - 16);
        if (r() < quiet(x) * 0.85) continue;
        if (!spaced(x, y, min)) continue;
        add(x, y);
        placed++;
      }
    };
    scatter(Math.round(W / 80), (x, y) => addStar(x, y), 55);
    scatter(Math.round(W / 60), addFleck, 16);
    for (let i = 0; i < Math.round(W / 160); i++) {
      const cy = 14 + r() * (H - 24);
      list.push(mk(CRESCENT, r() * W, cy, (7 + r() * 6) * near(cy), { depth: r() < 0.3 ? 0.6 : r() * 0.08, hue: Math.floor(r() * 2) }));
    }

    // Long curling ribbons: lilac lower left, pink-and-butter right of centre.
    list.push(mk(RIBBON, 0.11 * W, 0.68 * H, Math.min(200, 0.12 * W + 40), { angle: -0.16, spin: 0, hue: 0, coil: 12, depth: 0 }));
    if (W > 900) list.push(mk(RIBBON, 0.66 * W, 0.4 * H, Math.min(180, 0.11 * W + 30), { angle: 0.24, spin: 0, hue: 1, coil: 11, depth: 0, speed: spB }));

    // mesq's sparkles at his density: chunky crosses (a third on the sun path)
    // and tiny white specks, mostly in the top part of the band.
    for (let i = 0; i < Math.round(W / 70); i++) {
      const u = r() < 0.35 ? 0.62 + r() * 0.24 : r();
      list.push(mk(SPARKLE, u * W, 12 + Math.pow(r(), 1.6) * H * 0.75, 5 + r() * 3, { angle: (r() - 0.5) * 0.1, spin: 0, period: 3.3 + r() * 9.3 }));
    }
    for (let i = 0; i < Math.round(W / 36); i++) {
      list.push(mk(SPARKLE, r() * W, 12 + Math.pow(r(), 1.6) * H * 0.75, 1.6 + r() * 0.8, { angle: 0, spin: 0, period: 3.3 + r() * 9.3 }));
    }

    // Draw order: sunk first, then submerged, then floating, mixed by z.
    pieces = list.sort((a, b) => b.depth - a.depth || a.z - b.z);
    flares = [];
    buf = new Float32Array(pieces.length * 6 * FLOATS_PER_VERTEX);
  };

  return {
    resize(w: number, h: number) {
      const changed = Math.round(w) !== W || Math.round(h) !== H;
      W = Math.round(w);
      H = Math.round(h);
      if (changed) layout();
      if (!lamp.x) {
        lamp.x = W * 0.6;
        lamp.y = H * 0.35;
      }
    },

    /* A click: a ring in the water (made by the caller) and the nearest holo
       stars flare. */
    poke(x: number, y: number, t: number) {
      pieces
        .filter((p) => p.kind === HOLO && p.depth < 0.5)
        .sort((a, b) => Math.hypot(a.x + a.ox - x, a.y + a.oy - y) - Math.hypot(b.x + b.ox - x, b.y + b.oy - y))
        .slice(0, 3)
        .forEach((piece, i) => flares.push({ piece, start: t + i * 0.12, dur: 1 + rng() * 0.4 }));
    },

    step(t: number, dt: number, input: Input) {
      const { pointer, velocity } = input;
      const speedNow = Math.hypot(velocity.x, velocity.y);
      for (const p of pieces) {
        p.x += p.speed * dt;
        const m = p.kind === RIBBON ? p.size + 60 : p.size * 2.5 + 8;
        if (p.x - m > W) p.x -= W + 2 * m;
        p.angle += (p.spin + p.kick) * dt;
        p.kick *= Math.exp(-dt / 1.8);
        // The wake: only a moving cursor pushes, and what it pushes drifts.
        if (pointer && speedNow > 4 && p.kind !== SPARKLE) {
          const rx = p.x + p.ox - pointer.x;
          const ry = p.y + p.oy - pointer.y;
          const d = Math.hypot(rx, ry);
          const reach = 60 + 35 * Math.min(1, Math.max(0, p.y / H));
          if (d < reach) {
            const k = (1 - d / reach) ** 2 * (p.kind === RIBBON ? 0.12 : 0.3) * (1 - 0.8 * p.depth);
            p.vx += velocity.x * k * dt * 6;
            p.vy += velocity.y * k * dt * 6;
            if (p.kind !== RIBBON && d > 1) {
              const kick = ((rx * velocity.y - ry * velocity.x) / (d * d)) * 0.4 * dt * 6;
              p.kick = Math.max(-0.7, Math.min(0.7, p.kick + kick));
            }
          }
        }
        p.vx *= Math.exp(-dt / 1.4);
        p.vy *= Math.exp(-dt / 1.4);
        p.ox += p.vx * dt;
        p.oy += p.vy * dt;
        p.ox *= Math.exp(-dt / 20);
        p.oy *= Math.exp(-dt / 20);
        p.oy = Math.max(-p.y + p.size + 6, Math.min(H - p.y, p.oy));
      }

      // Holo flares: never more than two at once, one every 2-4 s, favouring the sun.
      flares = flares.filter((f) => t < f.start + f.dur);
      if (t > nextFlare && flares.length < 2) {
        const candidates = pieces.filter((p) => p.kind === HOLO && p.depth < 0.3);
        if (candidates.length) {
          const weight = (p: Piece) => 0.25 + Math.exp(-(((p.x / W - 0.74) / 0.14) ** 2));
          const total = candidates.reduce((a, p) => a + weight(p), 0);
          let pick = rng() * total;
          const piece = candidates.find((p) => (pick -= weight(p)) <= 0) ?? candidates[0];
          flares.push({ piece, start: t, dur: 0.8 + rng() * 0.6 });
        }
        nextFlare = t + 2 + rng() * 2;
      }
      for (const p of pieces) p.flare = 0;
      for (const f of flares) {
        const u = (t - f.start) / f.dur;
        if (u < 0) continue;
        const e = u < 0.35 ? u / 0.35 : 1 - (u - 0.35) / 0.65;
        f.piece.flare = Math.max(f.piece.flare, e * e * (3 - 2 * e));
      }

      // The lamp: follows the cursor quickly; idles slowly on a figure eight.
      const target = pointer
        ? { x: pointer.x, y: pointer.y, on: 1, k: 10 }
        : { x: W * (0.55 + 0.3 * Math.sin((t * TAU) / 34)), y: H * (0.35 + 0.2 * Math.sin((t * TAU) / 17)), on: 0.7, k: 1.2 };
      const a = 1 - Math.exp(-dt * target.k);
      lamp.x += (target.x - lamp.x) * a;
      lamp.y += (target.y - lamp.y) * a;
      lamp.on += (target.on - lamp.on) * (1 - Math.exp(-dt * 3));
      const ex = pointer ? (pointer.x / W - 0.5) * 0.14 : 0;
      const ey = pointer ? (pointer.y / H - 0.5) * 0.09 : 0;
      env.x += (ex - env.x) * (1 - Math.exp(-dt * 2));
      env.y += (ey - env.y) * (1 - Math.exp(-dt * 2));
    },

    /* Fill the vertex buffer: one quad per piece, big enough for its glow. */
    build(t: number) {
      let n = 0;
      const put = (x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, A: number[], B: number[], C: number[]) => {
        const corners = [x0, y0, x1, y1, x2, y2, x0, y0, x2, y2, x3, y3];
        for (let v = 0; v < 6; v++) {
          const o = (n * 6 + v) * FLOATS_PER_VERTEX;
          buf[o] = corners[v * 2];
          buf[o + 1] = corners[v * 2 + 1];
          buf.set(A, o + 2);
          buf.set(B, o + 6);
          buf.set(C, o + 10);
        }
        n++;
      };
      for (const p of pieces) {
        const w = swell(p.x + p.ox, p.y + p.oy, t);
        const x = p.x + p.ox + w.dx * (1 - p.depth * 0.5);
        const y = p.y + p.oy + w.dy * (1 - p.depth * 0.5);
        const angle = p.angle + w.sway;
        if (p.kind === RIBBON) {
          // an oriented box around the whole ribbon, foreshortened like the shader does
          const squash = 0.62 + 0.28 * Math.min(1, Math.max(0, y / H));
          const hx = p.size + 34;
          const hy = 20 + 14 * p.seed + p.coil * 2.42 + 10;
          const c = Math.cos(angle);
          const s = Math.sin(angle);
          const corner = (lx: number, ly: number) => [x + c * lx - s * ly, y + (s * lx + c * ly) * squash];
          const [ax, ay] = corner(-hx, -hy);
          const [bx, by] = corner(hx, -hy);
          const [cx, cy] = corner(hx, hy);
          const [dx, dy] = corner(-hx, hy);
          put(ax, ay, bx, by, cx, cy, dx, dy, [x, y, p.size, angle], [p.kind, p.seed, p.depth, p.hue], [w.tx, w.ty, p.phase + t * 0.15, p.coil]);
          continue;
        }
        let size = p.size;
        let extra = p.flare;
        // big enough for the holo's flare (1.5 R) and the gold's glints (0.9 R)
        let reach = p.size * (p.kind === GOLD ? 1.15 : 1.6) + 4;
        if (p.kind === SPARKLE) {
          const k = 0.5 + 0.5 * Math.sin((t * TAU) / p.period + p.phase);
          size = p.size * (0.88 + 0.12 * k);
          extra = 0.73 + 0.27 * k;
          reach = size * 1.2 + 2;
        } else if (p.kind === FLECK) reach = p.size * 1.6 + 2.5;
        else if (p.kind === CRESCENT) reach = p.size * 0.9 + 3;
        put(x - reach, y - reach, x + reach, y - reach, x + reach, y + reach, x - reach, y + reach, [x, y, size, angle], [p.kind, p.seed, p.depth, p.hue], [w.tx, w.ty, 0, extra]);
      }
      const sun: [number, number, number] = (() => {
        const v = [0.75 * Math.sin(t * 0.021), -0.04 + 0.03 * Math.sin(t * 0.013), 1];
        const l = Math.hypot(v[0], v[1], v[2]);
        return [v[0] / l, v[1] / l, v[2] / l];
      })();
      return {
        quads: buf,
        quadCount: n,
        sun,
        lamp: [lamp.x, lamp.y, 160, lamp.on] as [number, number, number, number],
        env: [env.x, env.y] as [number, number],
      };
    },
  };
}
