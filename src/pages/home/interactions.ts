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

/* ── Shelf handoff ──────────────────────────────────────────────────────────
   The notebooks on the worktable each own their own hover state, so moving
   from one to the next used to run two animations at once: the one you left
   still closing while the one you arrived at was already opening. That overlap
   reads as mush rather than as a notebook answering you — the cause of the
   motion stops being legible.

   This serialises the handoff. The outgoing notebook closes, and only then, if
   the pointer is STILL on the incoming one, does that one open. The wait does
   double duty as hover intent: sweep across the shelf on the way somewhere
   else and nothing opens at all, because the pointer has moved on before the
   gate fires.

   Deliberately module-level rather than React context — the rest of this file
   is plain DOM, and the journals talk to it from inside a useLayoutEffect that
   never re-runs on render. */

/** The full settle, not just the cover cross-fade. The scrim is the slowest
 *  thing leaving at 0.56s (cards 0.54s, cover 0.3s), so waiting for it means
 *  the page is genuinely back — no overlay, no scrim, nothing in flight —
 *  before the next notebook starts. That dead beat is the point: it is what
 *  makes the two notebooks read as two separate actions rather than a
 *  cross-fade between them. */
const HANDOFF_MS = 580;

let openId: string | null = null;
/* The open journal's own setOpen. The controller has to be able to close the
   outgoing notebook itself: relying on that notebook's pointerleave is a race —
   if the incoming pointerenter lands first, the outgoing one is dropped from
   the slot and its own leave then finds nothing to close, leaving it open for
   good. */
let openApply: ((open: boolean) => void) | null = null;
let pendingId: string | null = null;
let pendingTimer: number | null = null;
/* When the shelf will actually be at rest again. An empty slot is NOT the same
   as a settled shelf: the outgoing notebook releases the slot from its own
   pointerleave, which in a real mouse move lands a frame BEFORE the incoming
   pointerenter. Gating on "is the slot free" therefore let the next notebook
   open instantly, which is the bug this whole controller exists to fix. Gate on
   time instead, so it does not matter which event arrives first. */
let restAt = 0;
/* Which notebook the shelf is settling FROM. Coming back to the one you just
   left is a continuation, not a handoff — there is no second notebook to tell
   apart, and making it serve the full wait reads as the shelf sticking. */
let restingFrom: string | null = null;

const waitMs = () => (prefersReducedMotion() ? 0 : HANDOFF_MS);

function clearPending() {
  if (pendingTimer !== null) window.clearTimeout(pendingTimer);
  pendingTimer = null;
  pendingId = null;
}

export type ShelfHandle = {
  /**
   * @param open        whether this journal now wants to be open
   * @param stillWanted re-checked when the handoff elapses — the pointer may
   *                    have moved on while the previous notebook was closing
   * @param apply       the journal's own setOpen
   */
  want: (open: boolean, stillWanted: () => boolean, apply: (open: boolean) => void) => void;
  /** Unmount: drop the slot and any pending open belonging to this journal. */
  release: () => void;
};

export function joinShelf(id: string): ShelfHandle {
  return {
    want(open, stillWanted, apply) {
      if (!open) {
        if (pendingId === id) clearPending();
        if (openId === id) {
          openId = null;
          openApply = null;
          restAt = Date.now() + waitMs();
          restingFrom = id;
          apply(false);
        }
        return;
      }

      if (openId === id) return; // already open; nothing to do

      // Re-entering the notebook that is still settling skips the gate.
      const returning = openId === null && restingFrom === id;
      const remaining = openId === null ? restAt - Date.now() : waitMs();

      if (openId === null && (remaining <= 0 || returning)) {
        // Genuinely at rest — nothing to hand off from, so no reason to wait.
        clearPending();
        openId = id;
        openApply = apply;
        restingFrom = null;
        apply(true);
        return;
      }

      /* Another notebook holds the slot. Close it now, then gate this one.
         A newer request replaces an older pending one, so sweeping A → B → C
         coalesces to C without any of them opening on the way. */
      if (pendingId === id) return; // already queued behind the same close
      clearPending();
      /* Still holding the slot means this notebook got here before the outgoing
         one's pointerleave — close it here rather than trusting an event that
         may never come. */
      if (openApply) {
        const outgoing = openApply;
        const openingFrom = openId;
        openId = null;
        openApply = null;
        restAt = Date.now() + waitMs();
        restingFrom = openingFrom;
        outgoing(false);
      }

      const wait = Math.max(0, remaining);
      pendingId = id;
      pendingTimer = window.setTimeout(() => {
        pendingTimer = null;
        pendingId = null;
        // The whole point of the gate: is the pointer still here?
        if (!stillWanted()) return;
        openId = id;
        openApply = apply;
        restingFrom = null;
        apply(true);
      }, wait);
    },

    release() {
      if (pendingId === id) clearPending();
      if (openId === id) {
        openId = null;
        openApply = null;
      }
    },
  };
}

/** Test seam — lets a harness assert which notebook the shelf thinks is open. */
export const __shelfState = () => ({ openId, pendingId, restIn: restAt - Date.now() });
