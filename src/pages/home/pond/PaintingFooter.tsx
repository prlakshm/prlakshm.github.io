import { useEffect, useRef, type CSSProperties } from "react";
import { cancelFrame, frame } from "motion";
import { prefersReducedMotion } from "../interactions.js";
import { createGoldShine, stepGoldLamp } from "../goldLight.js";
import { createPaintGL, type PaintGL, type PaintOptions } from "./paintGL.js";
import "./pond.css";

/* The footer band as Pranavi's water-lily painting. The still image shows
   first and stays as the fallback (no WebGL, reduced motion, context lost).
   Paintings with an `fx` map come alive on top of it (paintGL.ts): the water
   shimmers in place and the gold catches a light that follows the cursor.

   Framing: the band is wide on desktop and nearly 2:1 on phones, so a fixed
   anchor can't keep the lilies whole everywhere. Paintings that list their
   lilies (`lilies`: each flower's left/right edge, painting px) are framed per
   width: of every horizontal position, the one that cuts no flower, then shows
   the most, then leaves them the most room; `y` trims top and bottom. The
   still and the live layer share that framing. Paintings without it fall back
   to CSS anchors (`pos` on tablet and up, `phone` below 600px).

   The footer shows DEFAULT; /?footer=<key>#/ previews another on the real
   page. The WebGL pond (PondFooter.tsx) is untouched.
   Decorative, so hidden from assistive tech. */

type Painting = {
  src: string;
  pos: string;
  phone: string;
  fx?: string;
  size?: [number, number]; // painting px
  y?: number; // 0 top .. 1 bottom: where to trim when the band is shorter than the painting
  lilies?: [number, number][];
  live?: PaintOptions; // soft normals and the lilies that sway (paintGL.ts)
};

// image 5b's five flowers, left to right (painting px, from the bake's petal mask)
const LILIES_5B: [number, number][] = [[12, 272], [1168, 1397], [1871, 2148], [2319, 2565], [2884, 3118]];
const FRAME_5B = { size: [3376, 686] as [number, number], y: 0.29, lilies: LILIES_5B };
// Image 5b's lilies for the live layer: left, top, right, base of each flower
// (painting px, from the bake's petal mask), and how much each sways (same
// order: 3rd, 2nd, 5th, 1st, 4th from the left; the 2nd moves least, the 3rd a
// touch less than the rest).
const SWAY_5B: Pick<PaintOptions, "flowers" | "sway"> = {
  flowers: [[1870, 84, 2146, 251], [1167, 138, 1397, 277], [2883, 205, 3116, 401], [12, 218, 272, 402], [2317, 325, 2563, 538]],
  sway: [0.85, 0.65, 1, 1, 1],
};

// The skyline's landmarks, left and right edges (painting px): the left spire,
// the gilded tower, the Chrysler, the gold-banded block, the black tower, the
// centre spire, the dripped tower, the banded black tower, the Empire State,
// the banded white tower.
const SKYLINE_TOWERS: [number, number][] = [
  [95, 153], [377, 557], [662, 746], [793, 1060], [1475, 1612],
  [1815, 1899], [2330, 2439], [2442, 2534], [2633, 2770], [3022, 3233],
];
const FRAME_SKYLINE = { size: [3376, 701] as [number, number], y: 0, lilies: SKYLINE_TOWERS };
// what one unit of the sky's cloud layer does to its colour (sRGB), from the bake
const SKYLINE_CLOUD_RGB: [number, number, number] = [0.0245, 0.0246, 0.0248];

const PAINTINGS: Record<string, Painting> = {
  4: { src: "/home/footer/water-lilies-4.webp", pos: "0 0", phone: "100% 0" },
  1: { src: "/home/footer/water-lilies-1.webp", pos: "0 0", phone: "36% 0" },
  5: { src: "/home/footer/water-lilies-5.webp", pos: "0 7%", phone: "89% 0" },
  // image 5 with Pranavi's added lily on the left (same crop)
  "5b": { src: "/home/footer/water-lilies-5b.webp", pos: "0 7%", phone: "89% 0" },
  // 5b zoomed out ~11% (the painting's full width), rebuilt at full size from her original
  "5b-wide": {
    src: "/home/footer/water-lilies-5b-wide.webp",
    fx: "/home/footer/water-lilies-5b-wide-fx.webp",
    pos: "0 29%",
    phone: "92% 0",
    ...FRAME_5B,
  },
  // 5b-wide with the water and pads blended smooth (gold and lilies exactly as painted);
  // baked by poster-lab/footer/bake/smooth.py. "-medium" is the gentler blend.
  "5b-smooth": {
    src: "/home/footer/water-lilies-5b-smooth.webp",
    fx: "/home/footer/water-lilies-5b-wide-fx.webp",
    pos: "0 29%",
    phone: "92% 0",
    ...FRAME_5B,
    live: { normals: "/home/footer/water-lilies-5b-smooth-normals.webp", ...SWAY_5B },
  },
  "5b-smooth-medium": {
    src: "/home/footer/water-lilies-5b-smooth-medium.webp",
    fx: "/home/footer/water-lilies-5b-wide-fx.webp",
    pos: "0 29%",
    phone: "92% 0",
    ...FRAME_5B,
  },
  // 5b-smooth reworked the way mesq paints (https://mesq.me/jelly-painting/): strokes
  // cross colour edges, then melt wet-in-wet, so edges go soft; reflections are
  // water now (soft, and they ripple); lilies feathered into the paint; gold as is.
  // Baked by poster-lab/footer/bake/smooth.py ("softer").
  "5b-soft": {
    src: "/home/footer/water-lilies-5b-soft.webp",
    fx: "/home/footer/water-lilies-5b-wide-fx.webp",
    pos: "0 29%",
    phone: "92% 0",
    ...FRAME_5B,
    live: { normals: "/home/footer/water-lilies-5b-soft-normals.webp", ...SWAY_5B },
  },
  // Repainted in mesq's style (poster-lab/repaint): the water and pads run
  // through his own paint passes (strokes along colour gradients, smear, flecks,
  // fixed dither); the lilies simplified into painted colour shapes with the same
  // grain; the gold leaf exactly as painted. "-soft" is a deeper wash and a
  // bigger brush.
  "5b-repaint": {
    src: "/home/footer/water-lilies-5b-repaint.webp",
    fx: "/home/footer/water-lilies-5b-wide-fx.webp",
    pos: "0 29%",
    phone: "92% 0",
    ...FRAME_5B,
    live: { normals: "/home/footer/water-lilies-5b-repaint-normals.webp", ...SWAY_5B },
  },
  "5b-repaint-soft": {
    src: "/home/footer/water-lilies-5b-repaint-soft.webp",
    fx: "/home/footer/water-lilies-5b-wide-fx.webp",
    pos: "0 29%",
    phone: "92% 0",
    ...FRAME_5B,
    live: { normals: "/home/footer/water-lilies-5b-repaint-soft-normals.webp", ...SWAY_5B },
  },
  // image 5 with the added lily lower left (same crop)
  "5c": { src: "/home/footer/water-lilies-5c.webp", pos: "0 7%", phone: "89% 0" },
  // The NYC skyline, Home's painting: her Midjourney panorama (option 4)
  // as she re-made it with a painted sky, in its own colours
  // (brighter, warm accents popped), gilded in the lilies' own leaf: its gold
  // where the painting puts gold, plus vertical patches down five towers (never
  // scattered flecks); every piece modelled as the lilies' is, a raised crumpled
  // sheet lit from the upper left that casts a soft shadow on the building under
  // it, and lit live by the same light. poster-lab/footer/skyline (newsky.py,
  // SRC=sky base.py, paint.py, lilygold.py "hand+3d"): source rows 163-578.
  // Its "lilies" are its landmark towers, kept whole when the band narrows; it
  // trims from the bottom (y 0). A city doesn't ripple or breathe (no motion in
  // its fx map, no swell); its sky drifts instead: soft light slides slowly
  // through its clouds behind the towers.
  // The footer's city: option A, her first painted-sky version (she switched
  // back to it 2026-10-06). Option B, the second, stays for comparing, and
  // is kept for comparing; the hero title uses A too.
  skyline: {
    src: "/home/footer/skyline-d.webp",
    fx: "/home/footer/skyline-d-fx.webp",
    pos: "50% 0",
    phone: "75% 0",
    ...FRAME_SKYLINE,
    live: { swell: 0, clouds: { src: "/home/footer/skyline-d-clouds.webp", rgb: SKYLINE_CLOUD_RGB, speed: 24, secondarySpeed: 9, vertical: 3, gain: 1.65 } },
  },
  "skyline-b": {
    src: "/home/footer/skyline-b.webp",
    fx: "/home/footer/skyline-b-fx.webp",
    pos: "50% 0",
    phone: "75% 0",
    ...FRAME_SKYLINE,
    size: [3376, 704],
    live: { swell: 0, clouds: { src: "/home/footer/skyline-b-clouds.webp", rgb: SKYLINE_CLOUD_RGB, speed: 24, secondarySpeed: 9, vertical: 3, gain: 1.65 } },
  },
};
const DEFAULT = "5b-smooth";
// For comparing paintings on the real page: /?footer=5b-repaint#/ shows that one.
const asked = typeof location !== "undefined" ? new URLSearchParams(location.search).get("footer") : null;

const PHONE = 599; // px: matches the phone anchor's media query in pond.css

// "0 7%" -> [0, 0.07], object-position fractions (the fallback framing)
const fractions = (pos: string): [number, number] => {
  const [x, y] = pos.split(" ").map((v) => (v.endsWith("%") ? parseFloat(v) / 100 : 0));
  return [x ?? 0, y ?? 0];
};

// Where the painting's top-left sits in a w x h band ("cover" scale), CSS px.
function frameFor(p: Painting, w: number, h: number): [number, number] | null {
  if (!p.size || !p.lilies) return null;
  const [iw, ih] = p.size;
  const sc = Math.max(w / iw, h / ih);
  const dw = iw * sc;
  const offY = (h - ih * sc) * (p.y ?? 0);
  if (dw - w < 0.5) return [0, offY];
  let best = { off: 0, cut: Infinity, shown: -1, room: -1 };
  for (let cx = 0; cx <= iw; cx += 8) {
    const off = Math.min(0, Math.max(w - dw, w / 2 - cx * sc));
    let cut = 0;
    let shown = 0;
    let room = Infinity;
    for (const [a, b] of p.lilies) {
      const l = a * sc + off;
      const r = b * sc + off;
      if (r <= 0 || l >= w) continue;
      if (l >= 0 && r <= w) {
        shown++;
        room = Math.min(room, l, w - r);
      } else cut++;
    }
    if (cut < best.cut || (cut === best.cut && (shown > best.shown || (shown === best.shown && room > best.room)))) best = { off, cut, shown, room };
  }
  return [Math.round(best.off), offY];
}

/** `painting`: which painting this page ends on (Home: the skyline; About and
    the case studies: the lilies). ?footer=<key> on the URL overrides it, for
    comparing. */
export default function PaintingFooter({ painting }: { painting?: string } = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const key = asked && asked in PAINTINGS ? asked : painting && painting in PAINTINGS ? painting : DEFAULT;
  const p = PAINTINGS[key];

  useEffect(() => {
    const root = ref.current;
    const img = root?.querySelector("img");
    if (!root || !img) return;
    const canvas = root.querySelector("canvas");
    const fx = p.fx;
    const live = !!canvas && !!fx && !prefersReducedMotion();

    let gl: PaintGL | null = null;
    let disposed = false;
    let running = false;
    let size = { w: 0, h: 0 };
    const lamp = { x: 0, y: 0, z: 220, on: 0 };
    let pointer: { x: number; y: number } | null = null;
    let tapUntil = 0;
    const t0 = performance.now();
    let last = t0;

    // Frame the still (and the live layer, once it exists) for this band size.
    const resize = () => {
      const r = root.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      size = { w: r.width, h: r.height };
      const off = frameFor(p, r.width, r.height);
      if (off) img.style.objectPosition = `${off[0]}px ${off[1]}px`;
      if (!gl) return;
      let o = off;
      if (!o && p.size) {
        const [fx0, fy0] = fractions(r.width <= PHONE ? p.phone : p.pos);
        const sc = Math.max(r.width / p.size[0], r.height / p.size[1]);
        o = [(r.width - p.size[0] * sc) * fx0, (r.height - p.size[1] * sc) * fy0];
      }
      if (!o) return;
      gl.resize(r.width, r.height, Math.min(window.devicePixelRatio || 1, 2), o);
      lamp.z = Math.max(160, r.height * 0.85);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(root);
    resize();

    // Each lily bobs and sways on its own rhythm (soft body wobble); the
    // cursor never moves them. Painting px and radians, scaled per lily.
    const flowers = p.live?.flowers ?? [];
    const sway = p.live?.sway ?? [];
    const moves = new Float32Array(20);
    const stepLilies = (t: number) => {
      const T = 2 * Math.PI;
      flowers.forEach((_, i) => {
        const ph = i * 1.618;
        const amp = sway[i] ?? 1;
        moves[i * 4] = amp * (3.2 * Math.sin((t * T) / 5.3 + ph) + 1.2 * Math.sin((t * T) / 2.9 + ph * 2));
        moves[i * 4 + 1] = amp * 2.4 * Math.sin((t * T) / 4.1 + ph * 1.3);
        moves[i * 4 + 2] = amp * 0.018 * Math.sin((t * T) / 6.7 + ph * 0.7);
      });
    };
    // The paint's soft shading follows its own slow light, never the cursor:
    // on hover only the gold responds.
    const ambient = { x: 0, y: 0 };

    // The footer and painted titles share one gold-leaf light model. Only the
    // cadence differs by surface.
    const goldShine = createGoldShine({ firstDelay: 1.2, interval: [4, 9] });

    const paint = () => {
      if (!gl) return;
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = (now - t0) / 1000;
      // The light follows the cursor; otherwise it drifts slowly on its own, dimmer.
      const held = !pointer && now < tapUntil;
      const drift = {
        x: size.w * (0.5 + 0.4 * Math.sin((t * 2 * Math.PI) / 26)),
        y: size.h * (0.45 + 0.3 * Math.sin((t * 2 * Math.PI) / 17 + 1.1)),
      };
      const target = pointer
        ? { x: pointer.x, y: pointer.y, on: 1, k: 7 }
        : held
          ? { x: lamp.x, y: lamp.y, on: 1, k: 7 }
          : { ...drift, on: 0.45, k: 1.1 };
      stepGoldLamp(lamp, target, dt);
      const ka = 1 - Math.exp(-dt * 1.1);
      ambient.x += (drift.x - ambient.x) * ka;
      ambient.y += (drift.y - ambient.y) * ka;
      stepLilies(t);
      gl.render(t, [lamp.x, lamp.y, lamp.z, lamp.on], moves, [ambient.x, ambient.y, lamp.z, 0.6], goldShine.sample(t, size));
      if (!root.dataset.live) root.dataset.live = "1"; // fades the canvas in over the still
    };

    const start = () => {
      if (running || !gl) return;
      running = true;
      last = performance.now();
      // the light first catches the leaf a moment after the pond comes into view
      goldShine.reset((last - t0) / 1000, 1);
      frame.render(paint, true);
    };
    const stop = () => {
      if (!running) return;
      running = false;
      cancelFrame(paint);
    };

    const local = (e: PointerEvent) => {
      const r = root.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse") pointer = local(e);
    };
    const onLeave = () => {
      pointer = null;
    };
    // Touch: a tap moves the light there for a moment.
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      const q = local(e);
      lamp.x = q.x;
      lamp.y = q.y;
      tapUntil = performance.now() + 2500;
    };
    const onLost = (e: Event) => {
      e.preventDefault();
      stop();
      gl = null;
      delete root.dataset.live;
    };

    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { rootMargin: "120px 0px" });

    if (live)
      createPaintGL(canvas!, p.src, fx!, p.live)
        .then((made) => {
          if (disposed || !made) {
            made?.destroy();
            return;
          }
          gl = made;
          const r = root.getBoundingClientRect();
          lamp.x = ambient.x = r.width * 0.5;
          lamp.y = ambient.y = r.height * 0.45;
          resize();
          io.observe(root);
        })
        .catch(() => {});

    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("pointerdown", onDown);
    canvas?.addEventListener("webglcontextlost", onLost);

    return () => {
      disposed = true;
      stop();
      ro.disconnect();
      io.disconnect();
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointerdown", onDown);
      canvas?.removeEventListener("webglcontextlost", onLost);
      gl?.destroy();
      delete root.dataset.live;
      img.style.objectPosition = "";
    };
  }, [p]);

  const style = { "--pos": p.pos, "--pos-phone": p.phone } as CSSProperties;
  return (
    <div className="pond pond--painting" ref={ref} aria-hidden="true" style={style}>
      <img src={p.src} alt="" decoding="async" draggable={false} />
      {p.fx && <canvas />}
    </div>
  );
}
