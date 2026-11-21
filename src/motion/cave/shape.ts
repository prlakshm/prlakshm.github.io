/* THE CAVE-IN: what both halves share.

   Leaving any page for EVERYTHING, the page caves in: a jagged hole cracks
   open where Everything's bagel will be, and the page falls into it, nearest
   first (exit.ts, on the page being left). Everything then throws its own
   pieces back out of the same hole, the bagel rises under it and it shuts
   (Gallery.tsx runCave). Designed in Figma first ("Vortex C · Cave-in");
   every number here is that timeline's, in seconds.

   This file is the hole itself (one seeded shape, so both pages draw the very
   same hole), the clock, and the fall: a straight radial free fall whose size
   is depth in a well. */

export const CAVE_KEY = "gx-cave-handoff";
export const PAPER = "#f8fafc"; // the portfolio's cool white (Everything's ground)
export const INK = "#111113";

export type Pt = [number, number];

/* The clock. Out: the page being left. Back: Everything, on its own clock
   that starts once its pieces are ready to draw. */
/* Playback pace: 1 is the Figma timeline, lower is faster. Every time in
   CLOCK is still written in Figma seconds; these only scale how fast the
   clock runs, so the order of the beats holds.
   Two paces. The opening (the hole and its cracks snapping in, the page over
   it dropping away) is quick, so the click is answered at once. Everything
   after it (the pieces going in, and all of the way back out, to the hole
   shutting) runs slower, so it can be watched. */
export const PACE = 0.75; // the opening
export const PACE_REST = 0.88; // everything after

export const CLOCK = {
  // (the Figma timeline held 0.25s before anything moved; on a click that
  // reads as the page not answering, so everything on the way out starts
  // 0.17s sooner: same order, same gaps)
  crack: 0.08, // the hole and its crack lines snap in
  lidFall: 0.16, // the page over the hole starts dropping in, shard by shard
  lidStep: 0.025,
  lidDur: 0.32,
  release: 0.24, // the collapse front leaves the rim...
  // (the way in and the way out keep the same time: the same spread from
  // the nearest piece to the farthest, the same flight for each. The Figma
  // timeline let go over 1.35s on the way in and launched within 0.6s on the
  // way out, and the way in read as slower. Both are 15% longer than the
  // Figma way out.)
  front: 0.69, // ...and takes this long to reach the farthest piece,
  frontPow: 0.7, // speeding up as it spreads (<1), so the far pieces aren't left alone on screen
  fall: [0.575, 0.575], // a piece's way in: base + extra for the farthest...
  drop: 0.36, // ...the last of which is the drop over the rim into the hole
  thump: [0.66, 0.78], // the rim jolts 4% as the last shard goes
  // back out of the hole (Everything)
  launchSpread: 0.69, // the farthest piece launches this long after the nearest
  flight: [0.575, 0.575],
  rock: [0.13, 0.34], // past flat, then settled, after landing
  bagel: [1.15, 2.05],
  heal: [1.3, 1.65],
  close: [1.45, 2.18], // one smooth close
  ground: [2.2, 2.45],
} as const;

/* A moment on the way out, in clock seconds, as real milliseconds: the
   opening's pace up to the moment the collapse leaves the rim, the slower
   pace from there on. */
export const outAt = (t: number) =>
  1000 * (t <= CLOCK.release ? t * PACE : CLOCK.release * PACE + (t - CLOCK.release) * PACE_REST);

/* Tilting in 3D is for desktop Chromium only. iPhone Safari cannot afford
   it: tilting some sixty tiles at once ran it out of memory mid-flight (the
   page was killed and reloaded, then refused: 2026-11-20, as the 3D storm
   did in October), and no simulator shows that limit. Desktop Safari and
   Firefox draw the same paths flat: slide, shrink, fade. Phones and tablets
   (anything driven by touch) cannot afford even that: moving the sixty
   pieces flat was killed on a real iPhone's first visit (2026-11-21). They
   get "canvas", which moves no pieces at all and passed on that phone, and
   so does any desktop that looks short of room or has shown that it is
   (lite(), below). The desktop test is the same as the storm's
   (everything/index.html).

   How it is drawn:
     deep    real 3D tilt, the hole in two copies (desktop Chromium);
     flat    no tilt, one hole layer (desktop Safari and Firefox);
     squash  the tilt faked flat: a piece tipping away mostly just looks
             squashed toward the hole, and a squash is an ordinary 2D
             transform, as cheap as flat;
     fit     real 3D tilt with the canvas laid out at its on-screen size
             (CSS zoom in place of scale), in case what Safari cannot afford
             is storing each tilted tile at its full laid-out size.
     canvas  (phones, tablets, lighter desktops) the pocket-size one (draw.ts): on Everything the pieces are not
             moved at all; they are drawn, from their light copies, into one
             screen-sized canvas, tilt as a squash, and the real canvas is
             put back under it once they land. The memory it takes is the
             one drawing, however many pieces fly. On the other pages (the
             way in is pictures of the page already) it is squash.
   squash and fit are candidates that were tried on the phone and set aside,
   reached only by a test link (test.ts: ?cave=flat|squash|fit|canvas|3d),
   which forces any of these on any device. */
export type Mode = "deep" | "flat" | "squash" | "fit" | "canvas";

/* THE LIGHTER DEVICES: who gets "canvas" in place of moving the pieces.
     touch   anything whose main pointer is not a mouse or trackpad;
     iPad    also with a trackpad attached (it calls itself a Mac; the
             touch screen gives it away);
     small   a desktop with 4GB of memory or less (Chromium says), or four
             processor threads or fewer: the older laptops;
     slow    a desktop that ran the full version and dropped frames doing
             it (watchFrames, below): for a month it gets this one.
   everything/index.html decides the same thing before the first frame and
   leaves it in window.__gxLite; keep its copy of these lines in step. */
export const LITE_KEY = "gx-cave-lite";
const STRIKE_KEY = "gx-cave-lite-once";
const LITE_FOR = 30 * 864e5;
export const lite = (): boolean => {
  const w = window as unknown as { __gxLite?: boolean };
  if (typeof w.__gxLite === "boolean") return w.__gxLite;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const touch = !window.matchMedia("(pointer: fine)").matches;
  const pad = /iPad/.test(nav.userAgent) || (/Macintosh/.test(nav.userAgent) && nav.maxTouchPoints > 1);
  const small = (nav.deviceMemory ?? 8) <= 4 || (nav.hardwareConcurrency ?? 8) <= 4;
  let slow = false;
  try {
    const since = Number(localStorage.getItem(LITE_KEY));
    slow = since > 0 && Date.now() - since < LITE_FOR;
  } catch {
    /* storage closed to us */
  }
  return (w.__gxLite = touch || pad || small || slow);
};

let modeMemo: Mode | null = null;
let asked: string | null = null;
export const mode = (): Mode => {
  if (modeMemo) return modeMemo;
  try {
    asked = new URLSearchParams(window.location.search).get("cave");
  } catch {
    /* no address to read */
  }
  const desk =
    typeof navigator !== "undefined" &&
    /Chrome\//.test(navigator.userAgent) &&
    !/Mobile|Android|CriOS|EdgiOS/.test(navigator.userAgent) &&
    window.matchMedia("(pointer: fine) and (min-width: 1024px)").matches;
  const light = typeof window !== "undefined" && lite();
  return (modeMemo = asked === "3d" ? "deep" : asked === "flat" || asked === "squash" || asked === "fit" || asked === "canvas" ? asked : light ? "canvas" : desk ? "deep" : "flat");
};

/* THE STEP-DOWN. A desktop that is given the full version is watched while
   it plays: if it cannot keep up (under 45 frames a second over the run, or
   five frames that each took longer than 50ms) twice running, it is marked,
   and from its next page on it gets the lighter drawing, for a month. Twice,
   because once can be the machine being busy with something else for a
   moment; the two halves of one press are two runs, so a machine that
   really can't is marked by its first press. Call the function
   this returns when the run ends. Nothing is judged where the lighter one
   is already in use, with a ?cave= test link, on a run under 0.6s, or if
   the tab was ever hidden meanwhile (a hidden tab draws no frames). */
export function watchFrames(): () => void {
  if (typeof window === "undefined" || mode() === "canvas" || asked) return () => {};
  let frames = 0, slow = 0, first = 0, last = 0, on = true, away = document.hidden;
  const hid = () => { away = true; };
  document.addEventListener("visibilitychange", hid);
  const tick = (t: number) => {
    if (!on) return;
    if (!first) first = t;
    else {
      frames++;
      if (frames > 3 && t - last > 50) slow++; // (the first frames are the set-up)
    }
    last = t;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return () => {
    if (!on) return;
    on = false;
    document.removeEventListener("visibilitychange", hid);
    const took = last - first;
    if (away || took < 600) return;
    const poor = (frames * 1000) / took < 45 || slow >= 5;
    try {
      if (!poor) localStorage.removeItem(STRIKE_KEY);
      else if (localStorage.getItem(STRIKE_KEY)) {
        localStorage.removeItem(STRIKE_KEY);
        localStorage.setItem(LITE_KEY, String(Date.now()));
      } else localStorage.setItem(STRIKE_KEY, "1");
    } catch {
      /* nothing to remember it in */
    }
  };
}
/** real 3D transforms on the pieces */
export const tilts = (): boolean => mode() === "deep" || mode() === "fit";

/* The safety switch. A cave-in marks itself as running (sessionStorage) and
   clears the mark when it ends or the page is left in the ordinary way. A
   page that loads and finds the mark still set was killed mid-animation; it
   turns the cave-in off on this device for a month (localStorage), and the
   site goes back to the plain entrance. So at the very worst a device sees
   one failure, never a second. caveIn.ts and everything/index.html keep
   their own copies of these few lines (they run before this file loads).
   (The key is "-2": phones that switched it off while the pieces themselves
   were being moved, 2026-11-20/21, get the drawn version, draw.ts, afresh.) */
export const RUN_KEY = "gx-cave-running", OFF_KEY = "gx-cave-off-2";
export const markRunning = (on: boolean) => {
  try {
    if (on) sessionStorage.setItem(RUN_KEY, "1");
    else sessionStorage.removeItem(RUN_KEY);
  } catch {
    /* private mode */
  }
};

export const TILT = 80; // degrees, once it has tipped over the rim
const TILT_LIP = 22; // ...and as it reaches the rim, the floor dipping toward the hole
const SIZE_LIP = 0.82; // its size as it reaches the rim (the floor dips; it never grows)
const LIP = 1.05; // the rim, in hole radii
export const PERSP = 500;

export const EASE = {
  acc: "cubic-bezier(0.55, 0, 0.9, 0.55)",
  in: "cubic-bezier(0.6, 0, 0.9, 0.5)",
  io: "cubic-bezier(0.65, 0, 0.35, 1)",
  out: "cubic-bezier(0.22, 1, 0.36, 1)",
} as const;

const rand = (seed: number) => {
  let s = seed;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  return { rnd, rr: (a: number, b: number) => a + (b - a) * rnd() };
};

export type Shape = {
  R: number;
  seed: number;
  /** half the side of the square that holds the hole and every crack */
  reach: number;
  rim: Pt[];
  inner: Pt[];
  walls: { pts: Pt[]; grey: number }[];
  cracks: { pts: Pt[]; base: Pt; at: number }[];
  lids: { pts: Pt[]; c: Pt; spin: number }[];
};

/* Every point is relative to the hole's centre. Irregular on purpose: even
   corners push out (the cracks start there), odd ones cut in, and the angles
   wander. */
export function makeShape(R: number, seed = 11): Shape {
  const { rnd, rr } = rand(seed);
  const s = R / 115; // the Figma hole was 115 across a 1440 page
  const NR = 22;
  const pol = (r: number, a: number): Pt => [r * Math.cos(a), r * Math.sin(a)];
  const rimV = Array.from({ length: NR }, (_, i) => ({
    a: ((i + rr(-0.34, 0.34)) / NR) * 2 * Math.PI,
    r: R * (i % 2 ? rr(0.72, 1.0) : rr(0.98, 1.32)),
  }));
  const rim = rimV.map((v) => pol(v.r, v.a));
  // thin walls, so the hole is almost all black
  const inner = rim.map((p): Pt => [p[0] * 0.84, p[1] * 0.84 + 4 * s]);
  const G = [0.12, 0.16, 0.21, 0.26, 0.19, 0.14];
  const walls: Shape["walls"] = [];
  for (let i = 0; i < NR; i++) {
    const j = (i + 1) % NR;
    const g = G[(i * 5 + Math.floor(rnd() * 2)) % G.length];
    walls.push({ pts: [rim[i], rim[j], inner[j], inner[i]], grey: g });
    // a darker strip inside every other wall: striations
    if (i % 2 === 0) {
      const m: Pt = [(rim[i][0] + rim[j][0]) / 2, (rim[i][1] + rim[j][1]) / 2];
      const mi: Pt = [(inner[i][0] + inner[j][0]) / 2, (inner[i][1] + inner[j][1]) / 2];
      walls.push({ pts: [rim[i], m, mi, inner[i]], grey: g * 0.7 });
    }
  }
  // cracks: tapered jagged wedges with a branch
  const wedge = (start: Pt, dir: number, L: number, w0: number, ns: number) => {
    const cl: Pt[] = [start];
    let p = start;
    for (let k = 1; k <= ns; k++) {
      const d = dir + rr(-0.55, 0.55);
      p = [p[0] + (Math.cos(d) * L) / ns, p[1] + (Math.sin(d) * L) / ns];
      cl.push(p);
    }
    const l: Pt[] = [], r: Pt[] = [];
    for (let k = 0; k < ns; k++) {
      const a = cl[k], b = cl[k + 1];
      const nx = -(b[1] - a[1]), ny = b[0] - a[0], nl = Math.hypot(nx, ny) || 1, w = w0 * Math.pow(1 - k / ns, 1.15);
      l.push([a[0] + (nx / nl) * w, a[1] + (ny / nl) * w]);
      r.push([a[0] - (nx / nl) * w, a[1] - (ny / nl) * w]);
    }
    return { pts: l.concat([cl[ns]], r.reverse()), cl };
  };
  const cracks: Shape["cracks"] = [];
  let k = 0;
  for (let i = 0; i < NR; i += 2) {
    const start = pol(rimV[i].r * 0.92, rimV[i].a), dir = rimV[i].a + rr(-0.22, 0.22), L = R * rr(0.75, 2.0);
    const at = CLOCK.crack + 0.03 + k * 0.035;
    k++;
    const m = wedge(start, dir, L, rr(4.5, 7.5) * s, 6);
    cracks.push({ pts: m.pts, base: start, at });
    const bs = m.cl[2 + Math.floor(rnd() * 2)];
    const b = wedge(bs, dir + (rnd() < 0.5 ? -1 : 1) * rr(0.6, 1.05), L * rr(0.32, 0.5), 3.2 * s, 4);
    cracks.push({ pts: b.pts, base: bs, at: at + 0.1 });
  }
  // lids: the page over the hole, in shards that tip in (shuffled order)
  const order: number[] = [];
  for (let i = 0; i < NR; i += 2) order.push(i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const lids = order.map((i) => {
    const pts: Pt[] = [[0, 0], rim[i], rim[(i + 1) % NR], rim[(i + 2) % NR]];
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const c: Pt = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
    return { pts, c, spin: rr(6, 16) * (rnd() < 0.5 ? -1 : 1) };
  });
  const far = Math.max(...cracks.flatMap((c) => c.pts.map((p) => Math.max(Math.abs(p[0]), Math.abs(p[1])))), R * 1.4);
  return { R, seed, reach: Math.ceil(far + 8), rim, inner, walls, cracks, lids };
}

const NS = "http://www.w3.org/2000/svg";
const f1 = (n: number) => n.toFixed(1);
const points = (pts: Pt[], o: Pt = [0, 0]) => pts.map((p) => `${f1(p[0] - o[0])},${f1(p[1] - o[1])}`).join(" ");

/* The hole, open, as one SVG whose own origin is the hole's centre (so it
   and each crack grow and shrink about the right point with no bookkeeping).
   Drawn open: the animations only ever lead up to, or away from, this. */
export function buildHole(shape: Shape) {
  const B = shape.reach, s = shape.R / 115;
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "cave-hole");
  svg.setAttribute("width", String(2 * B));
  svg.setAttribute("height", String(2 * B));
  svg.setAttribute("viewBox", `${-B} ${-B} ${2 * B} ${2 * B}`);
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("style", `position:absolute;left:${-B}px;top:${-B}px;overflow:visible;display:block;pointer-events:none`);
  const add = (parent: Element, tag: string, attrs: Record<string, string>) => {
    const el = document.createElementNS(NS, tag);
    for (const key in attrs) el.setAttribute(key, attrs[key]);
    parent.appendChild(el);
    return el as SVGElement;
  };
  const cracksG = add(svg, "g", { class: "cave-cracks" });
  const cracks = shape.cracks.map((c) => {
    const g = add(cracksG, "g", { transform: `translate(${f1(c.base[0])} ${f1(c.base[1])})` });
    return { el: add(g, "polygon", { points: points(c.pts, c.base), fill: INK }), at: c.at };
  });
  const body = add(svg, "g", { class: "cave-body" });
  shape.walls.forEach((w) => {
    const v = Math.round(w.grey * 255);
    add(body, "polygon", { points: points(w.pts), fill: `rgb(${v} ${v} ${v + 3})` });
  });
  add(body, "polygon", { points: points(shape.inner), fill: "#000" });
  add(body, "polygon", { points: points(shape.rim), fill: "none", stroke: INK, "stroke-width": f1(3.5 * s), "stroke-linejoin": "miter" });
  return { svg, body, cracks };
}

/* One shard of the page over the hole, as its own element (it tips in 3D). */
export function buildLid(shape: Shape, lid: Shape["lids"][number]) {
  const s = shape.R / 115, pad = 3;
  const xs = lid.pts.map((p) => p[0]), ys = lid.pts.map((p) => p[1]);
  const x = Math.min(...xs) - pad, y = Math.min(...ys) - pad, w = Math.max(...xs) - x + pad, h = Math.max(...ys) - y + pad;
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "cave-lid");
  svg.setAttribute("width", f1(w));
  svg.setAttribute("height", f1(h));
  svg.setAttribute("viewBox", `${f1(x)} ${f1(y)} ${f1(w)} ${f1(h)}`);
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("style", `position:absolute;left:${f1(x)}px;top:${f1(y)}px;overflow:visible;display:block;pointer-events:none`);
  const poly = document.createElementNS(NS, "polygon");
  poly.setAttribute("points", points(lid.pts));
  poly.setAttribute("fill", PAPER);
  poly.setAttribute("stroke", INK);
  poly.setAttribute("stroke-width", f1(2.2 * s));
  poly.setAttribute("stroke-linejoin", "miter");
  svg.appendChild(poly);
  return svg;
}

/* THE FALL. Mechanics: the page is a floor with a pit in it, dipping a
   little toward the pit. Once the collapse front reaches a piece it lets go
   and is pulled across the floor from rest, faster and faster, all but flat
   and all but full size. At the rim it goes over: it tips about the rim's
   tangent until it is nearly edge-on (its hole-side edge dipping away from
   the viewer, never a turn in the plane) and drops, from no downward speed
   at all, so it shrinks slowly at first, then fast, toward the middle of
   the hole, and is lost in the dark. It only ever shrinks. Thin text never
   tips (tilted, a long strip reads as lifting off the page and rotating):
   it is dragged to the rim and drops flat.
   dx, dy: from the hole's centre to the piece's centre; w, h: its size on
   screen; dur: its whole way in, in clock seconds. `unit` converts screen
   pixels to the element's own (1 on a page, 1/zoom on the canvas). */
/** rot: a turn in the plane, degrees; clip: shown only within this many pixels of its centre (draw.ts) */
export type Pose = { offset: number; easing?: string; tx: number; ty: number; sc: number; tilt: number; opacity: number; rot?: number; clip?: number };
type FallOpts = { flat: boolean; w: number; h: number; dur: number; out?: boolean; unit?: number; rock?: number };

/* The fall as numbers: where the piece is (tx, ty: screen pixels from its
   place), its size, its tilt in degrees and its opacity, at each step.
   fallFrames turns these into keyframes for an element; draw.ts draws them. */
export function fallPath(dx: number, dy: number, R: number, o: FallOpts): { poses: Pose[]; flat: boolean; turn: number } {
  const flat = o.flat || mode() === "flat";
  const r0 = Math.hypot(dx, dy) || 1, ux = dx / r0, uy = dy / r0;
  // where its centre is as its leading edge starts over the rim
  const lead = Math.min(1.2 * R, (Math.abs(ux) * o.w + Math.abs(uy) * o.h) / 2);
  const lip = Math.min(r0, R * LIP + lead * 0.5), run = r0 - lip;
  // the share of the way in spent dropping (all of it, for a piece already at the rim)
  const dropT = run < 1 ? 1 : Math.min(0.55, CLOCK.drop / o.dur), slideT = 1 - dropT;
  // the pull: from rest, accelerating (power 2), eased off for a far small
  // piece so it doesn't reach the rim much faster than the drop carries it on
  const carry = 2.6 * lip; // the most the drop can carry on, in px over the drop
  const pow = run < 1 ? 2 : Math.max(1.45, Math.min(2, (carry * slideT) / (run * dropT)));
  const v0 = run < 1 ? 0 : Math.min(carry, ((pow * run) / slideT) * dropT);
  const pose = (rho: number, sc: number, tilt: number, opacity: number) => {
    const ff = 1 - rho / r0;
    return { tx: -dx * ff, ty: -dy * ff, sc, tilt, opacity };
  };
  // the way in, as [time 0..1, pose]
  const path: [number, ReturnType<typeof pose>][] = [];
  const NS = run < 1 ? 0 : 9, ND = 12;
  for (let i = 0; i < NS; i++) {
    const t = i / NS, dip = Math.pow(t, 2.5);
    path.push([t * slideT, pose(r0 - run * Math.pow(t, pow), 1 - (1 - SIZE_LIP) * dip, TILT_LIP * dip, 1)]);
  }
  for (let j = 0; j <= ND; j++) {
    const t = j / ND;
    const rho = Math.max(0, lip - v0 * (t - 2 * t * t + t * t * t) - lip * (3 * t * t - 2 * t * t * t));
    const depth = 1 / (1 + 12 * t * t); // falling from rest, seen from above
    const over = 1 - Math.pow(1 - Math.min(1, t / 0.5), 3); // tipped over within half the drop
    const tilt = run < 1 ? TILT * over : TILT_LIP + (TILT - TILT_LIP) * over;
    path.push([slideT + t * dropT, pose(rho, (run < 1 ? 1 : SIZE_LIP) * depth, tilt, t < 0.45 ? 1 : 1 - (t - 0.45) / 0.55)]);
  }
  // share of the timeline the flight takes (the rest is the rock on landing)
  const share = o.out && o.rock ? 1 - o.rock : 1;
  const poses: Pose[] = (o.out ? path.reverse() : path).map(([t, p]) => ({ offset: (o.out ? 1 - t : t) * share, easing: "linear", ...p }));
  if (o.out && o.rock) {
    // thrown out, a tilting piece lands leaning the other way a touch, then settles
    const land = share;
    if (!flat) {
      poses[poses.length - 1].easing = EASE.out;
      poses.push({ offset: land + (CLOCK.rock[0] / CLOCK.rock[1]) * (1 - land), easing: EASE.io, ...pose(r0, 1, -0.2 * TILT, 1) });
    }
    poses.push({ offset: 1, ...pose(r0, 1, 0, 1) });
  }
  return { poses, flat, turn: (Math.atan2(dy, dx) * 180) / Math.PI };
}

export function fallFrames(dx: number, dy: number, R: number, o: FallOpts): Keyframe[] {
  const u = o.unit ?? 1, how = mode(), squash = how === "squash" || how === "canvas";
  const { poses, flat, turn: line } = fallPath(dx, dy, R, o);
  const turn = line.toFixed(2); // the line from the hole through the piece
  const g0 = Math.atan2(-dy, -dx), ax = (-Math.sin(g0)).toFixed(3), ay = Math.cos(g0).toFixed(3);
  // a big piece must not swell as its outer edge tips toward the viewer
  const persp = Math.max(PERSP, 1.6 * Math.max(o.w, o.h));
  return poses.map(({ offset, easing, tx, ty, sc, tilt, opacity }) => {
    const move = `translate(${(tx * u).toFixed(1)}px, ${(ty * u).toFixed(1)}px)`;
    return {
      offset,
      ...(easing ? { easing } : {}),
      opacity: +opacity.toFixed(3),
      transform: flat
        ? `${move} scale(${sc.toFixed(4)})`
        : squash
        ? `${move} rotate(${turn}deg) scaleX(${Math.max(0.02, Math.cos((tilt * Math.PI) / 180)).toFixed(4)}) rotate(${-turn}deg) scale(${sc.toFixed(4)})`
        : `${move} perspective(${(persp * u).toFixed(0)}px) rotate3d(${ax}, ${ay}, 0, ${tilt.toFixed(2)}deg) scale(${sc.toFixed(4)})`,
    };
  });
}

/* When a piece lets go, and how long it falls. d: its farthest corner from
   the hole, as a share of the farthest piece's (a piece lets go only once
   the front has passed all of it, so long rows and edge text wait). */
export const releaseAt = (d: number) => CLOCK.release + CLOCK.front * Math.pow(d, CLOCK.frontPow);
export const fallFor = (d: number) => CLOCK.fall[0] + CLOCK.fall[1] * d;
export const launchAt = (d: number) => CLOCK.launchSpread * d;
export const flightFor = (d: number) => CLOCK.flight[0] + CLOCK.flight[1] * d;

export const farCorner = (r: { left: number; top: number; right: number; bottom: number }, hx: number, hy: number) =>
  Math.max(
    Math.hypot(r.left - hx, r.top - hy),
    Math.hypot(r.right - hx, r.top - hy),
    Math.hypot(r.left - hx, r.bottom - hy),
    Math.hypot(r.right - hx, r.bottom - hy),
  );

/* Thin text (section rows, labels, nav words, small copy) is only pulled. */
export const isThin = (w: number, h: number, text: boolean) => text && (h <= 32 || w > 4 * h);

export const holeRadius = (w: number, h: number) => Math.max(64, Math.min(140, 115 * Math.min(w / 1440, h / 900)));

export type CaveHandoff = { at: number; hx: number; hy: number; R: number; seed: number; w: number; h: number; svg: string };
