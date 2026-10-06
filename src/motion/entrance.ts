import { animate, inView } from "motion";

/* The site's one entrance rhythm. Every element that comes in takes one BEAT
   in a single queue, top to bottom, so the hero's lines, the poster wall and
   About all step at the same interval. The fade is quick (so even pale text,
   like the painted titles, reads at once) and the rise settles longer, so
   each element arrives and then lands. */
export const BEAT = 0.15;
const RISE = 14;
const FADE = { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] as const };
const SETTLE = { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const };

/** A unit in the queue: an element (or a group that comes in as one) and how many beats it holds (a two-line
    title holds two, so what follows waits for its second line). */
export type Step = {
  el: HTMLElement | HTMLElement[];
  beats?: number;
  rows?: boolean | number;
  large?: boolean;
  weight?: "heavy";
  /** Optional offset from this sequence's start, allowing related groups to overlap. */
  at?: number;
};
// Large dark blocks (the posters) are a big jump in brightness on the light
// page: a text-speed fade flashes them in. They fade slower and settle longer.
const FADE_LARGE = { duration: 0.5, ease: [0.33, 0, 0.2, 1] as const };
const SETTLE_LARGE = { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const };
// A single large focal object needs slightly more time than a repeating card
// rail, but keeps the same decisive easing and entrance distance.
const FADE_HEAVY = { duration: 0.65, ease: [0.33, 0, 0.2, 1] as const };
const SETTLE_HEAVY = { duration: 0.9, ease: [0.16, 1, 0.3, 1] as const };
// Rows inside a group (the hero's sub lines, About's paragraphs and table
// rows) ripple in this close behind one another: close enough to read as one
// block arriving, apart enough to feel it cascade. The next group waits for
// the last row.
export const ROW = 0.06;
const flat = (steps: Step[]) => steps.flatMap((s) => s.el);

// When the next beat is free (seconds, performance clock). Shared across the
// page, so sections that come into view together continue one another.
let nextFree = 0;
const now = () => performance.now() / 1000;

/** Lines a text block wraps to: its height over its line height (its own
    line boxes, so an absolute tooltip inside it never counts). */
export function lineCount(el: HTMLElement) {
  const cs = getComputedStyle(el);
  const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
  const h = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  return Math.max(1, Math.round(h / lh));
}

export function hide(els: HTMLElement[]) {
  els.forEach((el) => {
    el.style.opacity = "0";
    el.style.transform = `translateY(${RISE}px)`;
  });
}

export function show(els: HTMLElement[]) {
  els.forEach((el) => {
    el.style.opacity = "1";
    el.style.transform = "none";
  });
}

/** Plays the steps in the queue; returns a stop that jumps them to rest. */
export function play(steps: Step[]) {
  const sequenceStart = Math.max(now(), nextFree);
  let cursor = sequenceStart;
  const controls = steps.flatMap((s) => {
    const els = Array.isArray(s.el) ? s.el : [s.el];
    const ripple = typeof s.rows === "number" ? s.rows : s.rows ? ROW : 0;
    const fade = s.weight === "heavy" ? FADE_HEAVY : s.large ? FADE_LARGE : FADE;
    const settle = s.weight === "heavy" ? SETTLE_HEAVY : s.large ? SETTLE_LARGE : SETTLE;
    const stepAt = s.at == null ? cursor : sequenceStart + s.at;
    const start = stepAt - now();
    cursor = Math.max(cursor, stepAt + BEAT * (s.beats ?? 1) + ripple * Math.max(0, els.length - 1));
    // explicit from-values: Motion otherwise starts from a remembered value.
    // The delay goes inside each value's transition: a per-value transition
    // replaces the shared one, delay included.
    return els.map((el, j) => {
      const delay = start + ripple * j;
      return animate(el, { opacity: [0, 1], y: [RISE, 0] }, { opacity: { ...fade, delay }, y: { ...settle, delay } });
    });
  });
  nextFree = cursor;
  const els = flat(steps);
  Promise.all(controls.map((c) => c.finished)).then(() => show(els), () => show(els));
  return () => {
    controls.forEach((c) => c.complete());
    show(els);
  };
}

/** Waits (briefly) for images to decode, so a print never fades in empty. */
export function decoded(imgs: HTMLImageElement[], cap = 700) {
  return within(Promise.all(imgs.map((i) => (i.complete ? Promise.resolve() : i.decode().catch(() => {})))), cap);
}

/** Webfonts loaded (briefly; a slow font never holds the page back). */
export const fontsReady = (cap = 500) => within(document.fonts?.ready ?? Promise.resolve(), cap);

const within = (p: Promise<unknown>, cap: number) =>
  Promise.race([p, new Promise((r) => setTimeout(r, cap))]);

// Sections that come into view together play in page order: each waits for
// the one before it to be ready and queued (the hero waits on its fonts, the
// wall on its prints' art, and the wall must still follow the hero).
let chain: Promise<unknown> = Promise.resolve();
// The browser reports sections entering view in no set order, so the ones
// that enter in the same frame are queued in page (registration) order.
let order = 0;
let entering: { i: number; run: () => Promise<unknown> }[] = [];
function enqueue(i: number, run: () => Promise<unknown>) {
  if (!entering.length)
    requestAnimationFrame(() => {
      entering.sort((a, b) => a.i - b.i).forEach((e) => (chain = chain.then(e.run).catch(() => {})));
      entering = [];
    });
  entering.push({ i, run });
}

/** Hides the steps now and plays them once `watch` scrolls into view (and
    `ready` has resolved). Returns a cleanup that leaves them at rest. */
export function enterOnView(watch: Element, steps: () => Step[], ready?: () => Promise<unknown>) {
  const first = steps();
  hide(flat(first));
  let stopPlay = () => {};
  let dead = false;
  const i = order++;
  const stopView = inView(
    watch,
    () => {
      enqueue(i, () =>
        Promise.resolve(ready?.()).then(() => {
          if (!dead) stopPlay = play(steps());
        })
      );
    },
    { margin: "0px 0px -10% 0px" }
  );
  return () => {
    dead = true;
    stopView();
    stopPlay();
    show(flat(first));
  };
}
