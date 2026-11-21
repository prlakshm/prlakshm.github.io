/* THE POCKET-SIZE CAVE-IN (shape.ts mode "canvas"). On Everything the pieces
   that fly are not moved at all. Moving sixty elements means the browser
   keeps sixty separate pictures in memory while they move, and that is what
   an iPhone cannot afford. Here each piece is drawn once, small, at the size
   it has on screen (a "sprite", from the light copy already on the page),
   and every frame all of them are painted into ONE canvas the size of the
   screen. The memory is that one canvas plus the sprites, about a screenful
   each, however many pieces there are.

   The path is the very same one (shape.ts fallPath: the same numbers the
   elements are given elsewhere). The tilt is drawn as a squash toward the
   hole: a 2D canvas has no perspective, and at these sizes a tile tipping
   away is, to the eye, a tile getting narrower.

   The clock is a real animation (on the canvas element), so the drawing
   keeps time with the hole and the nav, which are still elements, and
   "finish everything" finishes this too. */

import type { Pose } from "./shape.js";

export type Flyer = {
  sprite: HTMLCanvasElement | null;
  /** its centre at rest, in the canvas, CSS pixels */
  cx: number;
  cy: number;
  w: number;
  h: number;
  /** the sprite's margin around the piece (its shadow) */
  pad: number;
  /** what it scales about, from its centre (the bagel grows from its hole) */
  ox?: number;
  oy?: number;
  poses: Pose[];
  flat: boolean;
  /** the line from the hole through the piece, degrees */
  turn: number;
  delay: number;
  dur: number;
};

// cubic-bezier(x1, y1, x2, y2) as a function of time 0..1
const curves = new Map<string, (t: number) => number>();
const curve = (easing?: string): ((t: number) => number) | null => {
  if (!easing || easing === "linear") return null;
  let fn = curves.get(easing);
  if (fn) return fn;
  const m = /cubic-bezier\(([^)]+)\)/.exec(easing);
  const [x1, y1, x2, y2] = m ? m[1].split(",").map(Number) : [0, 0, 1, 1];
  const at = (a: number, b: number, s: number) => 3 * a * s * (1 - s) * (1 - s) + 3 * b * s * s * (1 - s) + s * s * s;
  fn = (t: number) => {
    let lo = 0, hi = 1, s = t;
    for (let i = 0; i < 18; i++) {
      const x = at(x1, x2, s);
      if (Math.abs(x - t) < 1e-4) break;
      if (x < t) lo = s;
      else hi = s;
      s = (lo + hi) / 2;
    }
    return at(y1, y2, s);
  };
  curves.set(easing, fn);
  return fn;
};

/* Where a flyer is, a share p (0..1) of the way through its own timeline. */
function sample(poses: Pose[], p: number, out: { tx: number; ty: number; sc: number; tilt: number; opacity: number }) {
  let i = 0;
  const last = poses.length - 1;
  if (p >= poses[last].offset) i = last;
  else while (i < last - 1 && poses[i + 1].offset <= p) i++;
  const a = poses[i], b = poses[Math.min(last, i + 1)];
  const span = b.offset - a.offset;
  let k = span > 0 ? Math.min(1, Math.max(0, (p - a.offset) / span)) : p >= b.offset ? 1 : 0;
  const ease = curve(a.easing);
  if (ease) k = ease(k);
  out.tx = a.tx + (b.tx - a.tx) * k;
  out.ty = a.ty + (b.ty - a.ty) * k;
  out.sc = a.sc + (b.sc - a.sc) * k;
  out.tilt = a.tilt + (b.tilt - a.tilt) * k;
  out.opacity = a.opacity + (b.opacity - a.opacity) * k;
}

/** device pixels per CSS pixel the drawing is made at */
export const drawScale = () => Math.min(3, Math.max(1, window.devicePixelRatio || 1));

/* A piece, drawn once at the size it has on screen, with its paper and its
   shadow. `fig` is the piece's own element (its styles are gallery.css
   .gx-piece and .gx-piece--sticker, copied here by hand: keep in step);
   w, h its size on screen; k the canvas's zoom (its shadow is that much
   smaller); `still` a picture to use where the piece is a film that has no
   frame to show yet (its poster). */
export function sprite(fig: HTMLElement, w: number, h: number, k: number, still?: HTMLImageElement | null): { c: HTMLCanvasElement; pad: number } | null {
  const sticker = fig.classList.contains("gx-piece--sticker");
  const pad = Math.ceil((sticker ? 16 : 30) * k) + 2;
  // (a piece zoomed far past the screen is drawn no bigger than it can be seen)
  const s = Math.min(drawScale(), 1600 / Math.max(1, w + 2 * pad, h + 2 * pad));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil((w + 2 * pad) * s));
  c.height = Math.max(1, Math.ceil((h + 2 * pad) * s));
  const g = c.getContext("2d");
  if (!g) return null;
  g.scale(s, s);
  g.translate(pad, pad);
  const ink = (a: number) => `rgba(15, 23, 42, ${a})`;

  let src: CanvasImageSource | null = null, sw = 0, sh = 0;
  const img = fig.querySelector("img"), film = fig.querySelector("video");
  if (img && img.complete && img.naturalWidth) [src, sw, sh] = [img, img.naturalWidth, img.naturalHeight];
  else if (film && film.readyState >= 2 && film.videoWidth) [src, sw, sh] = [film, film.videoWidth, film.videoHeight];
  else if (still && still.complete && still.naturalWidth) [src, sw, sh] = [still, still.naturalWidth, still.naturalHeight];

  try {
    if (sticker) {
      // a cut-out: no paper, a shadow that follows its own edge
      if (src) {
        const f = Math.min(w / sw, h / sh), dw = sw * f, dh = sh * f;
        g.shadowColor = ink(0.22);
        g.shadowBlur = 10 * k * s;
        g.shadowOffsetY = 6 * k * s;
        g.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
      }
    } else {
      // the paper's two shadows (the paper is laid over the shapes that cast them)
      g.fillStyle = "#fff";
      g.shadowColor = ink(0.12);
      g.shadowBlur = 2 * k * s;
      g.shadowOffsetY = 1 * k * s;
      g.fillRect(0, 0, w, h);
      const inset = 14 * k;
      if (w > 2 * inset && h > 2 * inset) {
        g.shadowColor = ink(0.32);
        g.shadowBlur = 30 * k * s;
        g.shadowOffsetY = 14 * k * s;
        g.fillRect(inset, inset, w - 2 * inset, h - 2 * inset);
      }
      g.shadowColor = "transparent";
      g.shadowBlur = 0;
      g.shadowOffsetY = 0;
      g.fillRect(0, 0, w, h);
      if (src) {
        // object-fit: cover
        const f = Math.max(w / sw, h / sh), cw = w / f, ch = h / f;
        g.drawImage(src, (sw - cw) / 2, (sh - ch) / 2, cw, ch, 0, 0, w, h);
      }
    }
  } catch {
    /* a picture that can't be drawn (still loading, or broken): the paper alone */
  }
  return { c, pad };
}

/* Several pictures stacked in one box (the bagel: its line, then itself). */
export function stack(imgs: HTMLImageElement[], w: number, h: number): { c: HTMLCanvasElement; pad: number } | null {
  const s = Math.min(drawScale(), 1600 / Math.max(1, w, h));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w * s));
  c.height = Math.max(1, Math.ceil(h * s));
  const g = c.getContext("2d");
  if (!g) return null;
  g.scale(s, s);
  imgs.forEach((img) => {
    try {
      if (img.complete && img.naturalWidth) g.drawImage(img, 0, 0, w, h);
    } catch {
      /* skipped */
    }
  });
  return { c, pad: 0 };
}

export type Pocket = {
  el: HTMLCanvasElement;
  add: (f: Flyer) => void;
  /** begins drawing; the animation returned is its clock (finish it to land everything) */
  start: () => Animation;
  /** the real page is back underneath: let it paint, then lift the drawing off it */
  lift: () => Promise<void>;
  destroy: () => void;
};

/* The one canvas, over `host` (the canvas's view), as big as it. Null where
   a canvas can't be had: the caller moves the elements instead. */
export function pocket(host: HTMLElement): Pocket | null {
  const r = host.getBoundingClientRect(), s = drawScale();
  const el = document.createElement("canvas");
  el.width = Math.max(1, Math.round(r.width * s));
  el.height = Math.max(1, Math.round(r.height * s));
  el.className = "gx-cave-pocket";
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = `position:absolute;left:0;top:0;width:${r.width}px;height:${r.height}px;pointer-events:none`;
  const g = el.getContext("2d");
  if (!g) return null;
  const flyers: Flyer[] = [];
  const q = { tx: 0, ty: 0, sc: 1, tilt: 0, opacity: 1 };
  const RAD = Math.PI / 180;
  let raf = 0, clock: Animation | null = null, total = 0, dead = false;

  const paint = (t: number) => {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, el.width, el.height);
    for (const f of flyers) {
      if (!f.sprite) continue;
      sample(f.poses, f.dur > 0 ? Math.min(1, Math.max(0, (t - f.delay) / f.dur)) : 1, q);
      if (q.opacity < 0.004 || q.sc < 0.002) continue;
      const ox = f.ox ?? 0, oy = f.oy ?? 0;
      g.setTransform(s, 0, 0, s, 0, 0);
      g.translate(f.cx + ox + q.tx, f.cy + oy + q.ty);
      if (!f.flat && q.tilt) {
        const a = f.turn * RAD;
        g.rotate(a);
        g.scale(Math.max(0.02, Math.cos(q.tilt * RAD)), 1);
        g.rotate(-a);
      }
      g.scale(q.sc, q.sc);
      g.globalAlpha = Math.min(1, q.opacity);
      g.drawImage(f.sprite, -(f.w / 2 + f.pad) - ox, -(f.h / 2 + f.pad) - oy, f.w + 2 * f.pad, f.h + 2 * f.pad);
    }
    g.globalAlpha = 1;
  };

  const frame = () => {
    raf = 0;
    if (dead || !clock) return;
    const done = clock.playState === "finished";
    paint(done ? total : Number(clock.currentTime) || 0);
    if (!done) raf = requestAnimationFrame(frame);
  };

  const destroy = () => {
    if (dead) return;
    dead = true;
    if (raf) cancelAnimationFrame(raf);
    try { clock?.cancel(); } catch { /* fine */ }
    el.remove();
    // (give the memory back now, not whenever the collector gets to it)
    el.width = el.height = 0;
    flyers.forEach((f) => { if (f.sprite) f.sprite.width = f.sprite.height = 0; });
    flyers.length = 0;
  };

  return {
    el,
    add: (f) => flyers.push(f),
    start: () => {
      total = Math.max(1, ...flyers.map((f) => f.delay + f.dur));
      clock = el.animate([{ opacity: 1 }, { opacity: 1 }], { duration: total, fill: "forwards" });
      // a finish from outside (a tap lands everything) has to reach the drawing too
      clock.finished.then(() => { if (!dead) paint(total); }, () => {});
      paint(0);
      raf = requestAnimationFrame(frame);
      return clock;
    },
    lift: () =>
      new Promise<void>((done) => {
        const end = () => { destroy(); done(); };
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (dead) return done();
          el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: "linear", fill: "forwards" }).finished.then(end, end);
        }));
      }),
    destroy,
  };
}
