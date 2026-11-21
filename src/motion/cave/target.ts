import { PIECES, applyLayout, applyPhone, pieceBounds, portraitLayout, type Layout } from "../../pages/gallery/clusters.js";
import SAVED from "../../pages/gallery/layout.json";
import { BAGEL_HOLE, PHONE_QUERY, openingCam } from "../../pages/gallery/opening.js";

/* Where the bagel's hole will be on screen when Everything opens in a window
   this size: the cave-in opens its hole there. Loaded lazily (it carries the
   canvas's layout), from the page being left. */
export function holeAt(w: number, h: number, navBottom: number) {
  const phone = window.matchMedia(PHONE_QUERY).matches;
  const layout = SAVED as Layout;
  const arranged = applyLayout(PIECES, layout);
  const pieces = phone ? applyPhone(portraitLayout(arranged), layout.phone) : arranged;
  const cam = openingCam(w, h, navBottom, phone, pieceBounds(pieces));
  return { x: cam.x + BAGEL_HOLE.x * cam.z, y: cam.y + BAGEL_HOLE.y * cam.z };
}
