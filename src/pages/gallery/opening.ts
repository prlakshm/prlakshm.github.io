import { BAGEL } from "./clusters.js";

/* The opening view of the Everything canvas, as plain arithmetic, so the
   canvas (Gallery.tsx fit) and the cave-in on other pages (which has to know
   where the bagel will be before Everything has loaded) agree.

   One camera: screen = world * z + (x, y). `b` is the bounds of every piece
   and the bagel (pieceBounds); w and h are the window's; navBottom is the
   nav bar's bottom edge. */
export const Z_MIN = 0.03;
export const Z_MAX = 4;

export function openingCam(
  w: number,
  h: number,
  navBottom: number,
  phone: boolean,
  b: { x: number; y: number; w: number; h: number },
) {
  // on a phone: equal space between the nav's bottom edge and the canvas,
  // and between the canvas and the bottom of the screen
  const side = phone ? 16 : 48, top = phone ? navBottom + 16 : 48, bottom = phone ? 16 : 12;
  const zw = (w - side * 2) / b.w, zh = (h - top - bottom) / b.h;
  // a little further out than a tight fit, for air: ~7% on a phone.
  // desktop, from her framing (2026-11-03): the canvas takes 88% of the
  // window's height, or 79% of its width when the window is the narrower
  // fit, and sits a touch right of centre (its middle at 52.9% across)
  const z = Math.min(Z_MAX, Math.max(Z_MIN, phone ? Math.min(zw, zh) * 0.927 : Math.min((w * 0.791) / b.w, (h * 0.881) / b.h)));
  const x = w * (phone ? 0.53 : 0.529) - (b.w * z) / 2 - b.x * z; // a touch right of centre reads as centred, on both
  const y = phone
    ? navBottom + (h - navBottom - b.h * z) * 0.28 - b.y * z // under the nav, a touch above centre
    : navBottom + (h - navBottom - b.h * z) / 2 - b.y * z - h * 0.015; // centred under the nav, then lifted 1.5%
  return { x, y, z };
}

/* The middle of the bagel's hole, in world units from the bagel's centre
   (measured on bagel-body.webp, 2552 x 1798: the hole sits at 590, 1000). */
export const BAGEL_HOLE = {
  x: (590 / 2552 - 0.5) * BAGEL.w,
  y: (1000 / 1798 - 0.5) * BAGEL.w * BAGEL.aspect,
  // the same point as a share of the bagel's own box (its transform origin)
  fx: 590 / 2552,
  fy: 1000 / 1798,
};

export const PHONE_QUERY = "(orientation: portrait) and (max-width: 900px)";
