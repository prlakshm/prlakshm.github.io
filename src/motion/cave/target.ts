import { BAGEL, PIECES, applyLayout, applyPhone, pieceBounds, portraitLayout, thumbOf, type Layout } from "../../pages/gallery/clusters.js";
import SAVED from "../../pages/gallery/layout.json";
import { BAGEL_HOLE, PHONE_QUERY, openingCam } from "../../pages/gallery/opening.js";

/* Where the bagel's hole will be on screen when Everything opens in a window
   this size: the cave-in opens its hole there. Loaded lazily (it carries the
   canvas's layout), from the page being left. */
const laidOut = () => {
  const phone = window.matchMedia(PHONE_QUERY).matches;
  const layout = SAVED as Layout;
  const arranged = applyLayout(PIECES, layout);
  return { phone, pieces: phone ? applyPhone(portraitLayout(arranged), layout.phone) : arranged };
};

export function holeAt(w: number, h: number, navBottom: number) {
  const { phone, pieces } = laidOut();
  const cam = openingCam(w, h, navBottom, phone, pieceBounds(pieces));
  return { x: cam.x + BAGEL_HOLE.x * cam.z, y: cam.y + BAGEL_HOLE.y * cam.z };
}

/* The canvas's light copies in the order Everything will throw the pieces
   out: nearest the hole first, then the bagel (it rises last). The page being
   left fetches them in this order while it falls (exit.ts), so that what
   Everything needs first is there first. */
export function picturesInOrder(): string[] {
  const { pieces } = laidOut();
  const near = [...pieces].sort((a, b) => Math.hypot(a.x - BAGEL_HOLE.x, a.y - BAGEL_HOLE.y) - Math.hypot(b.x - BAGEL_HOLE.x, b.y - BAGEL_HOLE.y));
  const list = near.map((p) => (p.kind === "video" ? (p.poster ? thumbOf(p.poster) : "") : thumbOf(p.src))).filter(Boolean);
  return [...new Set([...list, BAGEL.body, BAGEL.shout])];
}
