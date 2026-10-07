/* Hidden-interaction badges.

   The public adapter stays tiny: UI code earns and subscribes here while the
   session coordinator owns the tab lifetime and live-tab synchronization. */

import { createBadgeSession } from "./badgeSession.js";

export type BadgeId = "name" | "read" | "reimagine" | "celebrate" | "bagel";

export const BADGES: ReadonlyArray<{ id: BadgeId; title: string; hint?: string }> = [
  { id: "name", title: "Learn my name" },
  { id: "read", title: "Read a case study" },
  {
    id: "reimagine",
    title: "Reimagine",
    hint: "Visit a reimagined product and come back",
  },
  { id: "celebrate", title: "Celebrate design" },
  { id: "bagel", title: "Find my bagel" },
];

const isBadge = (value: unknown): value is BadgeId =>
  BADGES.some(({ id }) => id === value);

const makeChannel = (name: string) => {
  const channel = new BroadcastChannel(name);
  return {
    postMessage: (message: unknown) => channel.postMessage(message),
    addEventListener: (
      _type: "message",
      listener: (event: { data: unknown }) => void,
    ) => channel.addEventListener("message", listener),
    removeEventListener: (
      _type: "message",
      listener: (event: { data: unknown }) => void,
    ) => channel.removeEventListener("message", listener),
    close: () => channel.close(),
  };
};

const session = createBadgeSession({
  storage: typeof window === "undefined" ? null : window.sessionStorage,
  channelFactory: typeof BroadcastChannel === "undefined" ? null : makeChannel,
});

const listeners = new Set<() => void>();
export type EarnEvent = {
  id: BadgeId;
  from: { x: number; y: number } | null;
  remote: boolean;
};
const earnListeners = new Set<(event: EarnEvent) => void>();
const localOrigins = new Map<BadgeId, { x: number; y: number } | null>();

session.subscribeEarn(({ id, remote }) => {
  if (!isBadge(id)) return;
  const from = remote ? null : localOrigins.get(id) ?? null;
  localOrigins.delete(id);
  earnListeners.forEach((listener) => listener({ id, from, remote }));
});
session.subscribeState(() => listeners.forEach((listener) => listener()));

export const getFound = () => session.getFound().filter(isBadge);

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function onEarn(listener: (event: EarnEvent) => void) {
  earnListeners.add(listener);
  return () => {
    earnListeners.delete(listener);
  };
}

/* Badges only count once the visitor has had a moment to look around: until
   the intro ticket has flown home and settled (+ARM_MS), or ARM_MS after the
   page loads when there is no intro. Explicit destination/return awards use
   awardOnArrival and bypass only this timing guard. */
const ARM_MS = 1500;
let armedAt = (typeof performance !== "undefined" ? performance.now() : 0) + ARM_MS;

export const holdBadges = () => {
  armedAt = Infinity;
};

export const armBadges = (delay = ARM_MS) => {
  armedAt = performance.now() + delay;
};

export const badgesArmed = () => performance.now() >= armedAt;

function award(id: BadgeId, from: { x: number; y: number } | null) {
  if (getFound().includes(id)) return false;
  localOrigins.set(id, from);
  const earned = session.earn(id);
  if (!earned) localOrigins.delete(id);
  return earned;
}

export function earn(
  id: BadgeId,
  from: { x: number; y: number } | null = null,
) {
  if (!badgesArmed()) return false;
  return award(id, from);
}

export function awardOnArrival(
  id: BadgeId,
  from: { x: number; y: number } | null = null,
) {
  return award(id, from);
}

export const nextHint = (list: BadgeId[] = getFound()) =>
  BADGES.find(({ id }) => !list.includes(id)) ?? null;

export const hintOf = (badge: { title: string; hint?: string }) =>
  badge.hint ?? badge.title;

export const titleOf = (id: BadgeId) =>
  BADGES.find((badge) => badge.id === id)?.title ?? id;

if (typeof window !== "undefined") {
  // The old collection was permanent. Retire it without ever importing it.
  try {
    window.localStorage.removeItem("pr-badges-v1");
  } catch {
    // Storage may be blocked; the new in-memory/session behavior still works.
  }

  (window as unknown as { resetBadges: () => void }).resetBadges = () => {
    session.reset();
    try {
      sessionStorage.removeItem("pr-badge-intro");
      sessionStorage.removeItem("pr-badge-concept-journey-v2");
    } catch {
      // Keep the live reset even when storage is blocked.
    }
  };
}
