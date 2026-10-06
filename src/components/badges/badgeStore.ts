/* Hidden-interaction badges.

   A tiny store rather than React context: badges are earned from places that
   have nothing to do with each other (the hero title, a work card, the About
   portrait), and the card that shows them lives in the nav. Anything can call
   earn(); the card subscribes.

   Order matters twice, and they are different orders:
   - BADGES is the canonical order. The hint always names the first badge in
     this list that is still missing.
   - `found` is the order they were actually earned. The card fills its slots
     left to right in this order, regardless of which badge it was. */

export type BadgeId = "name" | "read" | "reimagine" | "celebrate" | "bagel";

/* `title` names a found star; `hint` (when given) is what the hint and an
   empty star say instead, as an action you can guess. */
export const BADGES: ReadonlyArray<{ id: BadgeId; title: string; hint?: string }> = [
  { id: "name", title: "Learn my name" },
  { id: "read", title: "Read a case study" },
  { id: "reimagine", title: "Reimagine", hint: "Linger on a reimagined product" },
  { id: "celebrate", title: "Celebrate design" },
  { id: "bagel", title: "Find my bagel" },
];

const KEY = "pr-badges-v1";
// A badge earned on the way out of the page (a case-study link) is celebrated
// when the visitor comes back, since they never saw it land.
const PENDING = "pr-badges-pending";

const isBadge = (v: unknown): v is BadgeId => BADGES.some((b) => b.id === v);

function load(): BadgeId[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter(isBadge).filter((v, i, a) => a.indexOf(v) === i);
  } catch {
    return [];
  }
}

let found: BadgeId[] = typeof window === "undefined" ? [] : load();

const listeners = new Set<() => void>();

export type EarnEvent = { id: BadgeId; from: { x: number; y: number } | null; deferred?: boolean };

// The page a badge was earned on: it lands there, when the visitor comes back.
const here = () => location.pathname + (location.hash || "#/");
const earnListeners = new Set<(e: EarnEvent) => void>();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(found));
  } catch {
    // Private mode or blocked storage: badges still work for this page view.
  }
}

export const getFound = () => found;

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function onEarn(fn: (e: EarnEvent) => void) {
  earnListeners.add(fn);
  return () => {
    earnListeners.delete(fn);
  };
}

/**
 * Earn a badge. Returns false if it was already found.
 * `from` is where the stamp should fly from (viewport coordinates).
 * `defer` is for links that leave the page: the badge is saved now and its
 * celebration plays when the visitor returns.
 */
/* Badges only count once the visitor has had a moment to look around: until
   the intro ticket has flown home and settled (+ARM_MS), or ARM_MS after the
   page loads when there is no intro. A cursor that just happens to rest on
   her name while the page opens hasn't found anything. */
const ARM_MS = 1500;
let armedAt = (typeof performance !== "undefined" ? performance.now() : 0) + ARM_MS;
/** The intro is showing: nothing counts until it is done (see armBadges). */
export const holdBadges = () => {
  armedAt = Infinity;
};
/** Start counting `delay` ms from now. */
export const armBadges = (delay = ARM_MS) => {
  armedAt = performance.now() + delay;
};
export const badgesArmed = () => performance.now() >= armedAt;

export function earn(
  id: BadgeId,
  from: { x: number; y: number } | null = null,
  opts: { defer?: boolean } = {}
) {
  if (found.includes(id)) return false;
  // a click on the way out (defer) is always deliberate
  if (!opts.defer && !badgesArmed()) return false;
  found = [...found, id];
  save();
  if (opts.defer) {
    try {
      sessionStorage.setItem(PENDING, JSON.stringify({ id, at: here() }));
    } catch {
      /* no-op */
    }
  }
  // Flight listeners first: the card marks the badge as in flight before the
  // state listeners re-render it, so the slot stays empty until the stamp lands.
  earnListeners.forEach((fn) => fn({ id, from, deferred: opts.defer }));
  listeners.forEach((fn) => fn());
  return true;
}

/** A badge earned on the way out of a page, still waiting to land there:
    `home` is true back on that page, where it is cleared and should land.
    Elsewhere (the case study it led to) it stays hidden and waits. */
export function takePending(): { id: BadgeId; home: boolean } | null {
  try {
    const raw = JSON.parse(sessionStorage.getItem(PENDING) || "null");
    const id = raw?.id;
    if (!isBadge(id) || !found.includes(id)) {
      sessionStorage.removeItem(PENDING);
      return null;
    }
    const home = raw.at === here();
    if (home) sessionStorage.removeItem(PENDING);
    return { id, home };
  } catch {
    return null;
  }
}

/** The first badge, in canonical order, that is still missing. */
export const nextHint = (list: BadgeId[] = found) =>
  BADGES.find((b) => !list.includes(b.id)) ?? null;

export const hintOf = (b: { title: string; hint?: string }) => b.hint ?? b.title;

export const titleOf = (id: BadgeId) =>
  BADGES.find((b) => b.id === id)?.title ?? id;

/* Another tab earning a badge (or the console reset below) stays in sync. */
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    found = load();
    listeners.forEach((fn) => fn());
  });
  // Handy while designing: resetBadges() in the console starts over.
  (window as unknown as { resetBadges: () => void }).resetBadges = () => {
    found = [];
    save();
    try {
      sessionStorage.removeItem("pr-badge-intro");
    } catch {
      /* no-op */
    }
    listeners.forEach((fn) => fn());
  };
}
