import { animate } from "motion";

/* Shared Motion micro-interactions.

   These exist because the same two gestures recur across the page: a rule that
   wipes in from the left (nav links and the @handle), and a tile that springs
   and presses (the contact icons). Keeping them here means the nav and the
   handle cannot drift apart. */

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Spring for light gestures — contact-tile lift, underline wipes. */
export const SPRING = { type: "spring", stiffness: 420, damping: 30 } as const;

/** Heavier spring for the notebooks (Journal.tsx). Same damping, lower
 *  stiffness, so the period is ~10% longer and the motion settles a touch more
 *  deliberately — the notebooks are a weightier component than the tiles. */
export const SPRING_HEAVY = { type: "spring", stiffness: 340, damping: 30 } as const;

/**
 * Wipes a rule in from the left on hover and focus.
 *
 * `rule` must be a real element — this deliberately does not use a ::after
 * pseudo-element, because JS cannot animate pseudo-elements.
 *
 * Returns a cleanup that removes every listener.
 */
export function attachUnderlineWipe(trigger: HTMLElement, rule: HTMLElement) {
  const reduced = prefersReducedMotion();
  const to = (scaleX: number) =>
    animate(rule, { scaleX }, reduced ? { duration: 0 } : SPRING);

  const on = () => to(1);
  const off = () => to(0);

  trigger.addEventListener("pointerenter", on);
  trigger.addEventListener("pointerleave", off);
  // focusin/out bubble, so they fire for the link itself and anything inside.
  trigger.addEventListener("focusin", on);
  trigger.addEventListener("focusout", off);

  return () => {
    trigger.removeEventListener("pointerenter", on);
    trigger.removeEventListener("pointerleave", off);
    trigger.removeEventListener("focusin", on);
    trigger.removeEventListener("focusout", off);
  };
}

/**
 * Lifts a tile on hover/focus and presses it down on pointerdown, so it reads
 * as a physical button rather than a rectangle that changes colour.
 * Gear tiles also rotate clockwise on lift (see .tile--gear).
 */
export function attachTilePress(tile: HTMLElement) {
  const reduced = prefersReducedMotion();
  const opts = reduced ? { duration: 0 } : SPRING;
  const isGear = tile.classList.contains("tile--gear");
  const hoverRotate = isGear ? 18 : 0;

  const lift = () =>
    animate(tile, { y: -3, scale: 1.05, rotate: hoverRotate }, opts);
  const rest = () => animate(tile, { y: 0, scale: 1, rotate: 0 }, opts);
  const press = () =>
    animate(
      tile,
      { scale: 0.93, rotate: isGear ? 10 : 0 },
      reduced ? { duration: 0 } : { type: "spring", stiffness: 700, damping: 28 }
    );

  tile.addEventListener("pointerenter", lift);
  tile.addEventListener("pointerleave", rest);
  tile.addEventListener("pointerdown", press);
  tile.addEventListener("pointerup", lift);
  // Releasing outside the tile still has to return it to rest.
  tile.addEventListener("pointercancel", rest);
  tile.addEventListener("focusin", lift);
  tile.addEventListener("focusout", rest);

  return () => {
    tile.removeEventListener("pointerenter", lift);
    tile.removeEventListener("pointerleave", rest);
    tile.removeEventListener("pointerdown", press);
    tile.removeEventListener("pointerup", lift);
    tile.removeEventListener("pointercancel", rest);
    tile.removeEventListener("focusin", lift);
    tile.removeEventListener("focusout", rest);
  };
}
