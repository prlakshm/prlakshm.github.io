import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { animate, cubicBezier } from "motion";
import {
  armBadges,
  BADGES,
  getFound,
  holdBadges,
  nextHint,
  hintOf,
  onEarn,
  subscribe,
  titleOf,
  type BadgeId,
} from "./badgeStore.js";
import { Bulb, CROOKED, Popper, Stamp, StarSlot } from "./BadgeArt.js";
import { prefersReducedMotion } from "../../pages/home/interactions.js";
import { createStampLight, type StampLight } from "./stampLight.js";
import "./badges.css";

/* The star card: the museum's ticket.

   A thin white card, always open in the nav's top-left slot: five dotted star
   slots, and under them the count and a hint bulb. Hover (or tap) and the full
   card grows out of it with the welcome note. Earn a badge and the card opens
   by itself, a gold-leaf star flies into the next empty slot and lands a little
   crooked, and the card tucks away again. On a first visit the full card is
   introduced in the middle of the screen, then flies into its slot, so the
   visitor sees where it went. */

const TOTAL = BADGES.length;
const INTRO_KEY = "pr-badge-intro";
const CARD_W = 356; // .bc-card width — the compact card scales to/from this
// how long the intro card stays open after it lands: enough to take in its
// line (1.6s wasn't, 3.5s held a beat too long); any scroll, tap or key
// folds it early, so it never holds anyone up
const HOLD_MS = 2500;
// after a tap on it, or the pointer leaving it: a little longer, not the full time
const TAP_HOLD_MS = 2000;
// after a long hover, how long it waits once the pointer leaves
const LEAVE_GRACE_MS = 300;
const FOUND_TIP_MS = 2400; // how long a freshly stamped card stays open, its new star's tooltip naming the find
const STAMP_SPRITE = "/home/card/stamps.webp";
const LIGHT_PAD = 6; // the light layer overhangs the row, so tilted corners are lit too
const TIP_MS = 2600; // how long a tapped tip (touch) stays up

/* The card is the way home, as the wordmark it replaced was. Pages with a
   router hand in their own onHome; the static case studies just load this. */
const HOME_HREF = "/#/";
const loadHome = () => window.location.assign(HOME_HREF);

const isKeyboardFocus = (el: Element) => {
  try {
    return el.matches(":focus-visible");
  } catch {
    return false;
  }
};

/* Berkeley Mono Trial draws "/" as a backslash; the slash comes from the
   fallback mono instead. */
const Slash = () => <span className="bc-slash">/</span>;

/* The popper pops: the cone kicks (or, the first time, springs in) and the
   confetti flies out of its mouth to where it rests, the streamer unfurling.
   Used when the fifth star lands and again whenever the popper is hovered or
   tapped. A pop already in progress plays out instead of restarting. */
const MOUTH = { x: 8.85, y: 7.15 }; // the cone's open end, in the popper's 16-unit box
function popConfetti(svg: SVGSVGElement | null, enter = false) {
  if (!svg || prefersReducedMotion()) return;
  const now = performance.now();
  if (now - Number(svg.dataset.poppedAt || 0) < 700) return;
  svg.dataset.poppedAt = String(now);
  const ease = [0.2, 0.8, 0.2, 1] as const;
  const cone = svg.querySelector<SVGGElement>(".bc-pop-cone");
  if (cone)
    animate(
      cone,
      enter
        ? { originX: 0, originY: 1, scale: [0.35, 1.12, 1], rotate: [-22, 6, 0] }
        : { originX: 0, originY: 1, scale: [1, 0.86, 1.07, 1], rotate: [0, -12, 4, 0] },
      { duration: enter ? 0.55 : 0.5, ease, originX: { duration: 0 }, originY: { duration: 0 } }
    );
  const streamer = svg.querySelector<SVGPathElement>(".bc-pop-streamer");
  if (streamer) animate(streamer, { pathLength: [0, 1] }, { duration: 0.45, delay: enter ? 0.16 : 0.05, ease });
  svg.querySelectorAll<SVGGElement>(".bc-bit").forEach((bit, i) => {
    const dx = MOUTH.x - Number(bit.dataset.x);
    const dy = MOUTH.y - Number(bit.dataset.y);
    // start tucked in the mouth, then burst out past where it rests and settle
    animate(bit, { x: dx, y: dy, scale: 0.2, opacity: 0 }, { duration: 0 });
    animate(
      bit,
      { x: [dx, -dx * 0.12, 0], y: [dy, -dy * 0.12, 0], scale: [0.2, 1.2, 1], opacity: [0, 1, 1] },
      { duration: 0.55, delay: (enter ? 0.2 : 0.06) + i * 0.035, ease, times: [0, 0.65, 1] }
    );
  });
}

const Count = ({ n }: { n: number }) => (
  <span className="bc-count">
    {n}
    <Slash />
    {TOTAL}
  </span>
);

/* The five slots, filled in the order they were found. On the full card an
   earned star shows its tip (hover, or a tap on touch): the badge found
   there. Empty stars show nothing, so the finds stay hidden; the bulb is the
   way to ask, and its hint appears above the leftmost empty star. */
type StarTips = { tips: string[]; at: number | null; set: (i: number | null) => void };

function Slots({
  landed,
  cellRefs,
  starTips,
  light,
}: {
  landed: BadgeId[];
  cellRefs?: React.MutableRefObject<Array<HTMLSpanElement | null>>;
  starTips?: StarTips;
  /** a light layer over the row (stampLight.ts) */
  light?: boolean;
}) {
  return (
    <div className="bc-slots" aria-hidden="true">
      {Array.from({ length: TOTAL }, (_, i) => (
        <span
          key={i}
          className={`bc-slot${landed[i] ? " is-found" : ""}`}
          data-i={i}
          style={{ "--tilt": `${CROOKED[i]}deg` } as React.CSSProperties}
          ref={cellRefs ? (el) => (cellRefs.current[i] = el) : undefined}
          onPointerEnter={starTips && landed[i] ? (e) => e.pointerType === "mouse" && starTips.set(i) : undefined}
          onPointerLeave={starTips ? (e) => e.pointerType === "mouse" && starTips.set(null) : undefined}
        >
          {landed[i] ? <Stamp index={i} /> : <StarSlot />}
          {starTips && <span className="bc-star-tip wt-tip">{starTips.tips[i]}</span>}
        </span>
      ))}
      {light && <canvas className="bc-light" aria-hidden="true" />}
    </div>
  );
}

function CardFace({
  landed,
  slotRefs,
  onHint,
  hintOpen,
  starTips,
  light,
}: {
  landed: BadgeId[];
  slotRefs?: React.MutableRefObject<Array<HTMLSpanElement | null>>;
  onHint?: () => void;
  hintOpen?: boolean;
  starTips?: StarTips;
  light?: boolean;
}) {
  const complete = landed.length >= TOTAL;
  return (
    <div className={`bc-card${complete ? " is-complete" : ""}`}>
      <div className="bc-note">
        {complete ? (
          <>
            <p className="bc-note-lead">You found them all!</p>
            <p>Thank you for visiting.</p>
          </>
        ) : (
          <>
            <p className="bc-note-lead">Welcome to my museum of fine art!</p>
            <p>Can you find all 5 hidden interactions?</p>
          </>
        )}
      </div>
      <Slots landed={landed} cellRefs={slotRefs} starTips={starTips} light={light} />
      <div className="bc-foot">
        <Count n={landed.length} />
        {complete ? (
          <span
            className="bc-hint bc-hint--pop"
            onPointerEnter={(e) => popConfetti(e.currentTarget.querySelector("svg"))}
            onPointerDown={(e) => popConfetti(e.currentTarget.querySelector("svg"))}
          >
            <Popper />
          </span>
        ) : onHint ? (
          <button type="button" className="bc-hint" aria-label="Hint" aria-expanded={hintOpen} onClick={onHint}>
            <Bulb />
          </button>
        ) : (
          <span className="bc-hint bc-hint--still">
            <Bulb />
          </span>
        )}
      </div>
    </div>
  );
}

/* Always visible in the nav: the slots, then the count and the bulb. */
function CompactCard({ landed, light = true }: { landed: BadgeId[]; light?: boolean }) {
  return (
    <span className="bc-compact" aria-hidden="true">
      <Slots landed={landed} light={light} />
      <span className="bc-foot">
        <Count n={landed.length} />
        {landed.length >= TOTAL ? <Popper /> : <Bulb />}
      </span>
    </span>
  );
}

type Flight = { key: number; id: BadgeId; slot: number; from: { x: number; y: number } };

function FlyingBadge({
  flight,
  target,
  onLanded,
}: {
  flight: Flight;
  target: () => DOMRect | null;
  onLanded: (f: Flight) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !target()) {
      onLanded(flight);
      return;
    }
    const size = 30;
    const sx = flight.from.x - size / 2;
    const sy = flight.from.y - size / 2;
    el.style.left = `${sx}px`;
    el.style.top = `${sy}px`;
    const tilt = CROOKED[flight.slot] ?? 0;
    // One progress value drives a thrown arc: across at an even, eased pace,
    // down with gravity (u²) under a small lift. The slot is re-read every
    // frame, so the star lands true even while the card is still opening, and
    // it can leave at once. One transform string per frame.
    const across = cubicBezier(0.45, 0, 0.25, 1);
    const LIFT = 56;
    let last = target();
    const controls = animate(0, 1, {
      duration: 0.65,
      ease: "linear",
      onUpdate: (u) => {
        const rect = target() ?? last;
        if (!rect) return;
        last = rect;
        const tx = rect.left + rect.width / 2 - size / 2 - sx;
        const ty = rect.top + rect.height / 2 - size / 2 - sy;
        const land = rect.height / size; // lands at the slot's star size
        const x = tx * across(u);
        const y = ty * u * u - LIFT * 4 * u * (1 - u);
        // pops to 1.35 by u = 0.3 (ease-out), then shrinks into the slot
        const grow = 1 - Math.pow(1 - Math.min(1, u / 0.3), 2);
        const shrink = u <= 0.3 ? 0 : (u - 0.3) / 0.7;
        const scale = u <= 0.3 ? 0.6 + 0.75 * grow : 1.35 + (land - 1.35) * shrink * shrink;
        const r = -24 + (tilt + 24) * (1 - Math.pow(1 - u, 3));
        el.style.transform = `translate(${x}px, ${y}px) rotate(${r}deg) scale(${scale})`;
      },
    });
    controls.finished.then(() => onLanded(flight)).catch(() => onLanded(flight));
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="bc-fly" ref={ref}>
      <Stamp index={flight.slot} />
    </div>
  );
}

export default function BadgeCard({ onHome }: { onHome?: () => void } = {}) {
  const reduced = prefersReducedMotion();

  /* `landed` is what the card shows. It trails the store by the length of a
     flight: a badge is in the store the moment it is earned, but its slot only
     fills when the stamp arrives. */
  const inFlight = useRef<Set<BadgeId>>(new Set());
  const [landed, setLanded] = useState<BadgeId[]>(() =>
    getFound().filter((id) => !inFlight.current.has(id))
  );
  const [open, setOpen] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [tipAt, setTipAt] = useState<number | null>(null);
  const [intro, setIntro] = useState(false);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [announce, setAnnounce] = useState("");

  const slotRef = useRef<HTMLDivElement>(null);
  const miniRef = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const introCardRef = useRef<HTMLDivElement>(null);
  const slotCells = useRef<Array<HTMLSpanElement | null>>([]);
  const hovering = useRef(false);
  const closeTimer = useRef(0);
  const autoCloseTimer = useRef(0);
  const hintTimer = useRef(0);
  const tipTimer = useRef(0);
  const lastPointer = useRef("mouse");
  const byKeyboard = useRef(false); // opened by keyboard focus, so focus leaving closes it
  const flightKey = useRef(0);
  const queuedRemote = useRef<BadgeId[]>([]);

  /* --- the light on the stamps -------------------------------------------- */
  /* The stamps catch the light as the footer painting's gold does: a lamp
     that follows the cursor (or drifts, dimmer), twinkling glints, and now
     and then a light gliding across the row (stampLight.ts). Without WebGL,
     or with reduced motion, the baked cross-fade below stays in charge. */
  const lights = useRef<{ mini: StampLight | null; card: StampLight | null }>({ mini: null, card: null });
  const [glOn, setGlOn] = useState(false);

  const sync = useCallback(() => {
    setLanded(getFound().filter((id) => !inFlight.current.has(id)));
  }, []);
  useEffect(() => subscribe(sync), [sync]);

  /* --- open / close ------------------------------------------------------ */
  const miniScale = () => {
    const w = miniRef.current?.getBoundingClientRect().width ?? 44;
    return w / (popRef.current?.offsetWidth || CARD_W);
  };

  const miniHidden = useRef(false);
  useLayoutEffect(() => {
    const pop = popRef.current;
    if (!pop) return;
    // The full card IS the compact one, grown: hide the compact card while it's
    // open, or its corner shows through the full card's bitten corner.
    const mini = miniRef.current;
    if (open) {
      pop.style.visibility = "visible";
      pop.style.pointerEvents = "auto";
      if (mini) animate(mini, { opacity: 0 }, { duration: reduced ? 0 : 0.12 });
      miniHidden.current = true;
      const c = animate(
        pop,
        { opacity: [0, 1], scale: [miniScale(), 1] },
        reduced
          ? { duration: 0 }
          : { scale: { type: "spring", stiffness: 420, damping: 32 }, opacity: { duration: 0.12 } }
      );
      return () => c.stop();
    }
    pop.style.pointerEvents = "none";
    // only after a real open (on mount this would undo the intro's hiding)
    if (mini && miniHidden.current) {
      miniHidden.current = false;
      animate(mini, { opacity: 1 }, { duration: reduced ? 0 : 0.18, ease: [0.4, 0, 0.6, 1] });
    }
    const c = animate(
      pop,
      { opacity: 0, scale: miniScale() },
      { duration: reduced ? 0 : 0.18, ease: [0.4, 0, 0.6, 1] }
    );
    c.finished
      .then(() => {
        if (popRef.current && !popRef.current.style.pointerEvents.includes("auto")) {
          popRef.current.style.visibility = "hidden";
        }
      })
      .catch(() => {});
    setHintOpen(false);
    setTipAt(null);
    byKeyboard.current = false;
    return () => c.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (reduced) return;
    const make = (root: HTMLElement | null) => {
      const c = root?.querySelector<HTMLCanvasElement>(".bc-light");
      return c ? createStampLight(c, STAMP_SPRITE) : null;
    };
    const mini = make(miniRef.current);
    const card = make(popRef.current);
    lights.current = { mini, card };
    setGlOn(!!(mini || card));
    return () => {
      mini?.destroy();
      card?.destroy();
      lights.current = { mini: null, card: null };
    };
  }, [reduced]);

  // where each stamp sits in its row, as the light layer sees it
  const layoutLights = useCallback(() => {
    const go = (root: HTMLElement | null, l: StampLight | null) => {
      const row = root?.querySelector<HTMLElement>(".bc-slots");
      if (!row || !l) return;
      const pad = LIGHT_PAD;
      const cells = Array.from(row.querySelectorAll<HTMLElement>(".bc-slot"));
      l.layout(
        cells.map((el, i) => ({
          cx: el.offsetLeft + el.offsetWidth / 2 + pad,
          cy: el.offsetTop + el.offsetHeight / 2 + pad,
          size: el.offsetWidth,
          tilt: ((CROOKED[i] ?? 0) * Math.PI) / 180,
          on: el.classList.contains("is-found"),
        })),
        row.offsetWidth + 2 * pad,
        row.offsetHeight + 2 * pad
      );
    };
    go(miniRef.current, lights.current.mini);
    go(popRef.current, lights.current.card);
  }, []);

  useEffect(() => {
    if (!glOn) return;
    const ro = new ResizeObserver(() => layoutLights());
    [miniRef.current, popRef.current].forEach((el) => el && ro.observe(el));
    return () => ro.disconnect();
  }, [glOn, layoutLights]);

  // only the card you can see renders: the compact one, or the open one over it
  useEffect(() => {
    lights.current.mini?.setActive(!open);
    lights.current.card?.setActive(open);
  }, [open, glOn]);

  const openNow = () => {
    window.clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const closeSoon = (ms = 220) => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), ms);
  };

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (slotRef.current && !slotRef.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    // On touch there is no pointerleave, so scrolling away tucks the card in.
    const startY = window.scrollY;
    const scrolled = () => {
      if (!hovering.current && Math.abs(window.scrollY - startY) > 40) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", esc);
    window.addEventListener("scroll", scrolled, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("scroll", scrolled);
    };
  }, [open]);

  /* --- hint --------------------------------------------------------------- */
  const hint = nextHint(landed);
  // Every press of the bulb shows the hint, and a press while it's already up
  // pops it again and restarts its time (it used to toggle it off, which read
  // as the press not registering).
  const [hintPop, setHintPop] = useState(0);
  const toggleHint = () => {
    window.clearTimeout(hintTimer.current);
    setHintOpen(true);
    setHintPop((n) => n + 1);
    hintTimer.current = window.setTimeout(() => setHintOpen(false), 2600);
  };
  useEffect(() => {
    if (hintOpen && hint) setAnnounce(`Hint: ${hintOf(hint)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hintOpen]);

  /* Tips fade like the nav's "Coming soon": in 0.16s, out 0.22s. They stay
     mounted (opacity 0) so they can fade out as well as in. */
  useLayoutEffect(() => {
    const pop = popRef.current;
    if (!pop) return;
    // the bulb's hint is the next empty star's own tip, shown where it always
    // sits, above that star (the next badge to find is the one it names)
    const next = landed.length;
    const showing = (i: number) => i === tipAt || (hintOpen && tipAt === null && i === next);
    const tips = pop.querySelectorAll(".bc-star-tip");
    const anyOn = Array.from(tips).some((_, i) => showing(i));
    // Only ever one tip at a time: they sit close enough to overlap, so when
    // another star's tip takes over (sweeping along the row), the old one goes
    // at once; it only fades out when nothing replaces it.
    const fade = (el: Element, on: boolean) => {
      const now = Number(getComputedStyle(el).opacity);
      if ((on && now === 1) || (!on && now === 0)) return;
      animate(el, { opacity: on ? 1 : 0 }, reduced || (!on && anyOn) ? { duration: 0 } : { duration: on ? 0.16 : 0.22 });
    };
    tips.forEach((el, i) => fade(el, showing(i)));
  }, [hintOpen, tipAt, reduced, landed.length]);

  // a press while the hint is already up: acknowledge it
  const hintPopped = useRef(0);
  useLayoutEffect(() => {
    if (hintPop === hintPopped.current) return;
    const again = hintPopped.current > 0 && hintOpen;
    hintPopped.current = hintPop;
    if (!again || reduced || tipAt !== null) return;
    const el = popRef.current?.querySelectorAll(".bc-star-tip")[landed.length];
    // Feedback, not a second entrance: the hint hasn't changed, so it never
    // leaves. It dips to 40% and settles from a touch smaller, fast (0.2s),
    // so the press visibly registers and the text stays readable throughout.
    if (el) animate(el, { opacity: [null, 0.4, 1], scale: [null, 0.97, 1] }, { duration: 0.2, times: [0, 0.35, 1], ease: [0.23, 1, 0.32, 1] });
  }, [hintPop, hintOpen, reduced, tipAt, landed.length]);

  /* --- star tips ------------------------------------------------------------ */
  /* Found stars in the order they were found, then the missing badges in
     canonical order (the order the bulb hints them in). */
  const tips = [
    ...landed.map(titleOf),
    ...BADGES.filter((b) => !landed.includes(b.id)).map(hintOf),
  ];
  const showTip = (i: number | null) => {
    window.clearTimeout(tipTimer.current);
    setTipAt(i);
  };

  /* --- home ------------------------------------------------------------------ */
  // Touch and pen have no hover, so their first tap does what hovering does.
  const fromTouch = (e: React.MouseEvent) =>
    e.detail > 0 && (lastPointer.current === "touch" || lastPointer.current === "pen");
  const goHome = () => {
    if (!hovering.current) setOpen(false);
    (onHome ?? loadHome)();
  };
  const onMiniClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // a new tab
    e.preventDefault();
    if (fromTouch(e) && !open) {
      openNow();
      return;
    }
    goHome();
  };
  /* The open card covers the compact one, so a click anywhere on it goes home
     too, except on the bulb, the popper and the hint, which keep their own
     jobs. On touch a tapped star shows its tip instead. */
  const onCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const t = e.target as Element;
    if (t.closest(".bc-hint")) return;
    const slot = t.closest<HTMLElement>(".bc-slot");
    if (slot && fromTouch(e)) {
      const i = Number(slot.dataset.i);
      if (i >= landed.length) return; // an empty star keeps its secret
      showTip(tipAt === i ? null : i);
      tipTimer.current = window.setTimeout(() => setTipAt(null), TIP_MS);
      return;
    }
    goHome();
  };

  /* --- earning ------------------------------------------------------------ */
  const celebrate = useCallback(
    (id: BadgeId, from: { x: number; y: number } | null) => {
      inFlight.current.add(id);
      sync();
      window.clearTimeout(autoCloseTimer.current);
      setOpen(true);
      const start = from ?? { x: window.innerWidth / 2, y: window.innerHeight * 0.42 };
      if (reduced) {
        window.setTimeout(() => {
          inFlight.current.delete(id);
          sync();
          setAnnounce(`Found: ${titleOf(id)}. ${getFound().length} of ${TOTAL}.`);
          nameTheFind(getFound().indexOf(id));
        }, 120);
        return;
      }
      // It leaves at once: the flight re-aims at the slot every frame, so it
      // lands true while the card is still opening.
      flightKey.current += 1;
      setFlights((f) => [...f, { key: flightKey.current, id, slot: getFound().indexOf(id), from: start }]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sync]
  );

  // A star found in another tab while this one was in the background goes
  // straight onto the card here, without its landing (see showQueued).
  const quietLanding = useRef(false);

  /* The landing glint: the stamp flashes and, with the light layer, a light
     crosses it. */
  const glint = useCallback((i: number) => {
    [
      slotCells.current[i]?.querySelector<HTMLElement>(".bc-stamp"),
      miniRef.current?.querySelectorAll<HTMLElement>(".bc-slot")[i]?.querySelector<HTMLElement>(".bc-stamp"),
    ].forEach((el) => {
      if (!el) return;
      el.classList.remove("is-landing");
      void el.offsetWidth; // restart the flash
      el.classList.add("is-landing");
    });
    window.setTimeout(() => {
      lights.current.mini?.flash(i);
      lights.current.card?.flash(i);
    }, 120);
  }, []);

  const confetti = useCallback(() => {
    [popRef.current, miniRef.current].forEach((root) => {
      const svg = root?.querySelector<SVGSVGElement>(".bc-popper") ?? null;
      // tuck the confetti into the mouth now, so the popper's first frame is
      // the start of the burst, never the finished confetti for a beat
      svg?.querySelectorAll<SVGGElement>(".bc-bit").forEach((bit) => {
        animate(bit, { x: MOUTH.x - Number(bit.dataset.x), y: MOUTH.y - Number(bit.dataset.y), scale: 0.2, opacity: 0 }, { duration: 0 });
      });
      window.setTimeout(() => popConfetti(svg, true), 250);
    });
  }, []);

  useEffect(
    () =>
      onEarn(({ id, from, remote }) => {
        if (remote && document.visibilityState === "hidden") {
          // already on the card when the visitor comes back: the find was
          // celebrated in the tab it happened in
          quietLanding.current = true;
          queuedRemote.current.push(id);
          sync();
          return;
        }
        celebrate(id, from);
      }),
    [celebrate, sync]
  );

  /* A background tab takes another tab's finds straight onto its card, with
     no flight or tooltip (that find was already celebrated where it
     happened). When the visitor comes back, each new stamp just glints once,
     so they can see what changed; completing the set still pops the confetti
     here, once. Snapshot joins never enter this queue, so opening or
     duplicating a tab never replays old finds. */
  useEffect(() => {
    const showQueued = () => {
      if (document.visibilityState === "hidden" || !queuedRemote.current.length) return;
      const queued = queuedRemote.current.splice(0);
      quietLanding.current = false;
      if (reduced) return;
      const order = getFound().filter((f) => !inFlight.current.has(f));
      queued.forEach((id, index) => {
        const i = order.indexOf(id);
        if (i >= 0) window.setTimeout(() => glint(i), 250 + index * 180);
      });
      if (order.length >= TOTAL) window.setTimeout(confetti, 250 + queued.length * 180);
    };
    document.addEventListener("visibilitychange", showQueued);
    window.addEventListener("focus", showQueued);
    return () => {
      document.removeEventListener("visibilitychange", showQueued);
      window.removeEventListener("focus", showQueued);
    };
  }, [glint, confetti, reduced]);

  /* A stamp just landed: its star's tooltip names what was found, so the
     visitor knows what they did, then card and tip go together. */
  const nameTheFind = (slot: number) => {
    window.setTimeout(() => showTip(slot), reduced ? 0 : 260); // once the stamp has pressed in
    window.clearTimeout(autoCloseTimer.current);
    autoCloseTimer.current = window.setTimeout(() => {
      if (hovering.current) return;
      setTipAt(null);
      setOpen(false);
    }, FOUND_TIP_MS);
  };

  const landedFlight = (f: Flight) => {
    setFlights((all) => all.filter((x) => x.key !== f.key));
    inFlight.current.delete(f.id);
    sync();
    setAnnounce(`Found: ${titleOf(f.id)}. ${getFound().length} of ${TOTAL}.`);
    nameTheFind(getFound().indexOf(f.id));
  };

  useLayoutEffect(() => {
    if (glOn) layoutLights();
  }, [landed, glOn, layoutLights]);

  /* Stamp: the slot that just filled presses in and catches the light. */
  const prevCount = useRef(landed.length);
  useLayoutEffect(() => {
    if (quietLanding.current) {
      prevCount.current = landed.length;
      return;
    }
    if (landed.length > prevCount.current && !reduced) {
      const i = landed.length - 1;
      [
        slotCells.current[i]?.querySelector<HTMLElement>(".bc-stamp"),
        miniRef.current?.querySelectorAll<HTMLElement>(".bc-slot")[i]?.querySelector<HTMLElement>(".bc-stamp"),
      ].forEach((el) => {
        if (el) animate(el, { scale: [1.45, 0.92, 1] }, { duration: 0.55, ease: [0.2, 0.8, 0.2, 1] });
      });
      glint(i);
    }
    if (landed.length >= TOTAL && prevCount.current < TOTAL && !reduced) confetti();
    prevCount.current = landed.length;
  }, [landed.length, reduced, glint, confetti]);

  /* --- first-visit intro --------------------------------------------------- */
  useLayoutEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(INTRO_KEY) === "1";
    } catch {
      seen = true;
    }
    if (!seen && !reduced && getFound().length < TOTAL) setIntro(true);
  }, [reduced]);

  useLayoutEffect(() => {
    if (!intro) return;
    const card = introCardRef.current;
    if (!card) return;
    let flown = false;
    let holdTimer = 0;

    holdBadges(); // nothing counts while the ticket is up (badgeStore.ts)
    // one card only: the compact card waits while the ticket is up and
    // flies home to become it (fly())
    const miniEl = miniRef.current;
    if (miniEl) miniEl.style.opacity = "0";
    /* In place, not a takeover: the ticket opens where the card lives (its
       top-left on the compact card's), over the page, which stays usable
       underneath (no veil). It settles in with a small drop, reads for a
       few seconds, then folds into the compact card right there (fly()). */
    const home = miniRef.current?.getBoundingClientRect();
    if (home) Object.assign(card.style, { position: "fixed", left: `${home.left}px`, top: `${home.top}px`, margin: "0" });
    card.style.transformOrigin = "0 0";
    const enter = animate(
      card,
      { opacity: [0, 1], y: [-10, 0], scale: [0.96, 1] },
      // an entrance: strong ease-out on the fade, a spring with no bounce on the drop
      { type: "spring", duration: 0.45, bounce: 0, opacity: { duration: 0.2, ease: [0.23, 1, 0.32, 1] } }
    );

    const fly = () => {
      if (flown) return;
      flown = true;
      window.clearTimeout(holdTimer);
      detach();
      const mini = miniRef.current?.getBoundingClientRect();
      const from = card.getBoundingClientRect();
      const done = () => {
        try {
          sessionStorage.setItem(INTRO_KEY, "1");
        } catch {
          /* no-op */
        }
        setIntro(false);
        armBadges(); // the hunt starts a moment after the ticket lands
        // (the landing press is timed to the handover, in fly())
      };
      if (!mini) {
        if (miniRef.current) miniRef.current.style.opacity = "";
        done();
        return;
      }
      enter.complete();
      /* THE TRANSFORMATION. One card: the ticket flies home and becomes the
         compact card on the way. Its frame narrows from the ticket's shape
         (~2:1) to the compact's (~3:1) as it goes, the bites and tear lines
         resizing with it (--k, --stub), while inside it the welcome note and
         big stars fade out (first 40%) and the compact row fades in (last
         half). It arrives looking exactly like the compact card, which then
         takes over in the same frame and gives its small press. All on the
         flight's one spring. */
      const face = card.querySelector<HTMLElement>(".bc-card");
      const compactLayer = card.querySelector<HTMLElement>(".bc-intro-compact");
      const fullBits = face ? Array.from(face.children) as HTMLElement[] : [];
      // freeze the welcome contents at their size, so they never rewrap
      fullBits.forEach((el) => {
        const r = el.getBoundingClientRect();
        el.style.width = `${r.width}px`;
        el.style.flexShrink = "0";
      });
      const W0 = from.width, H0 = from.height, W1 = mini.width, H1 = mini.height;
      const dx = mini.left - from.left, dy = mini.top - from.top;
      // Pin the ticket where it is first. It was centred in the intro
      // overlay, so as it narrowed in flight the overlay re-centred it, and
      // its starting point slid under the flight: a visible jump, worse on
      // some screen sizes. Pinned, its top-left is fixed, so the path is
      // exact at any size: from its own top-left to the compact card's.
      Object.assign(card.style, { position: "fixed", left: `${from.left}px`, top: `${from.top}px`, margin: "0" });
      card.style.transformOrigin = "0 0";
      if (face) {
        face.style.boxSizing = "border-box";
        face.style.width = `${W0}px`;
        face.style.height = `${H0}px`;
      }
      const clamp = (v: number) => Math.min(1, Math.max(0, v));
      let landedNow = false;
      const land = () => {
        if (landedNow) return;
        landedNow = true;
        if (miniRef.current) miniRef.current.style.opacity = "";
        done();
        if (miniRef.current) animate(miniRef.current, { scale: [1, 1.06, 1] }, { duration: 0.32, times: [0, 0.35, 1], ease: [0.23, 1, 0.32, 1] });
      };
      // a morph on the spot: quicker than the old flight across the screen
      // (no distance to cover), no bounce, so it settles once
      animate(0, 1, {
        type: "spring",
        duration: 0.5,
        bounce: 0,
        onUpdate: (v) => {
          const lerp = (a: number, b: number) => a + (b - a) * v;
          // a lean only when it actually travels (it folds in place now)
          const lean = Math.min(1, Math.hypot(dx, dy) / 200) * -4 * Math.sin(Math.PI * clamp(v));
          card.style.transform = `translate(${lerp(0, dx)}px, ${lerp(0, dy)}px) rotate(${lean.toFixed(2)}deg)`;
          if (face) {
            face.style.width = `${lerp(W0, W1)}px`;
            face.style.height = `${lerp(H0, H1)}px`;
            face.style.setProperty("--k", lerp(1, 0.55).toFixed(3));
            face.style.setProperty("--stub", `${lerp(28, 15.2).toFixed(2)}px`);
          }
          const out = (1 - clamp(v / 0.4)).toFixed(3);
          fullBits.forEach((el) => (el.style.opacity = out));
          if (compactLayer) compactLayer.style.opacity = clamp((v - 0.5) / 0.4).toFixed(3);
          if (v >= 0.998) land(); // home: hand over now, not when the spring finally rests
        },
      })
        .finished.then(land)
        .catch(land);
    };

    /* Interest keeps it open. A tap on the card isn't a dismissal: it gives
       a small press back (like a star's tip does) and restarts the time, and
       a pointer resting on it holds it open (the time starts again when it
       leaves). Anything else (a tap elsewhere, a scroll, a key) is
       intent to use the page, and sends it home early. */
    const onCard = (e: Event) => e.target instanceof Node && card.contains(e.target);
    const restart = (ms = HOLD_MS) => {
      window.clearTimeout(holdTimer);
      holdTimer = window.setTimeout(fly, ms);
    };
    const onAny = (e: Event) => {
      if (onCard(e)) return;
      fly();
    };
    const onPress = (e: PointerEvent) => {
      if (!onCard(e)) return fly();
      if (!reduced) animate(card, { scale: [1, 0.97, 1] }, { duration: 0.2, times: [0, 0.35, 1], ease: [0.23, 1, 0.32, 1] });
      restart(TAP_HOLD_MS);
    };
    // A pointer resting on it holds it. Leaving after a real read (as long
    // as a tap's extra time) folds it after a short grace, as the hover card
    // closes when you leave it; a brief pass still gets the extra time, so it
    // never vanishes before it's read. The grace forgives a pointer slipping
    // off the edge.
    let enteredAt = 0;
    const onEnter = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      enteredAt = performance.now();
      window.clearTimeout(holdTimer);
    };
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      restart(performance.now() - enteredAt >= TAP_HOLD_MS ? LEAVE_GRACE_MS : TAP_HOLD_MS);
    };
    const detach = () => {
      window.removeEventListener("wheel", onAny);
      window.removeEventListener("touchmove", onAny);
      window.removeEventListener("keydown", onAny);
      window.removeEventListener("pointerdown", onPress);
      card.removeEventListener("pointerenter", onEnter);
      card.removeEventListener("pointerleave", onLeave);
      card.style.pointerEvents = "";
    };
    card.style.pointerEvents = "auto"; // it can be touched (the overlay around it passes through)
    window.addEventListener("wheel", onAny, { passive: true });
    window.addEventListener("touchmove", onAny, { passive: true });
    window.addEventListener("keydown", onAny);
    window.addEventListener("pointerdown", onPress);
    card.addEventListener("pointerenter", onEnter);
    card.addEventListener("pointerleave", onLeave);
    holdTimer = window.setTimeout(fly, HOLD_MS);

    return () => {
      window.clearTimeout(holdTimer);
      detach();
      enter.stop();
      if (!flown) armBadges();
      if (miniRef.current) miniRef.current.style.opacity = "";
    };
  }, [intro]);

  /* --- the light: follows the cursor over the card ------------------------ */
  /* Each stamp cross-fades its three lit bakes (lamp upper left, above, upper
     right) by where the cursor is relative to it: the side the light is on
     wins, and the light fades with distance. Without a cursor the light drifts
     across the card on its own (badges.css). */
  const lightFrame = useRef(0);
  const lightFor = (root: HTMLElement | null) =>
    root && miniRef.current && root.contains(miniRef.current) ? lights.current.mini : lights.current.card;
  const light = (e: React.PointerEvent<HTMLElement>, root: HTMLElement | null) => {
    if (reduced || e.pointerType !== "mouse" || !root) return;
    const gl = lightFor(root);
    if (gl?.isReady()) {
      const c = root.querySelector<HTMLCanvasElement>(".bc-light");
      if (!c) return;
      const r = c.getBoundingClientRect();
      gl.lamp(((e.clientX - r.left) * c.offsetWidth) / (r.width || 1), ((e.clientY - r.top) * c.offsetHeight) / (r.height || 1));
      return;
    }
    const x = e.clientX;
    const y = e.clientY;
    cancelAnimationFrame(lightFrame.current);
    lightFrame.current = requestAnimationFrame(() => {
      root.classList.add("is-lit");
      root.querySelectorAll<HTMLElement>(".bc-stamp").forEach((st) => {
        const r = st.getBoundingClientRect();
        const size = Math.max(r.width, 1);
        const dx = (x - (r.left + r.width / 2)) / size;
        const dy = (y - (r.top + r.height / 2)) / size;
        const near = Math.max(0.2, 1 - Math.hypot(dx, dy * 1.3) / 4);
        const w = (at: number) => (near * Math.exp(-((dx - at) ** 2) / 0.9)).toFixed(3);
        st.style.setProperty("--wl", w(-1.2));
        st.style.setProperty("--wc", w(0));
        st.style.setProperty("--wr", w(1.2));
      });
    });
  };
  const unlight = (root: HTMLElement | null) => {
    const gl = lightFor(root);
    if (gl?.isReady()) gl.lamp(null);
    cancelAnimationFrame(lightFrame.current);
    root?.classList.remove("is-lit");
  };

  /* --- pointer tilt on the open card -------------------------------------- */
  const onCardMove = (e: React.PointerEvent<HTMLDivElement>) => {
    light(e, e.currentTarget);
    if (reduced || e.pointerType !== "mouse") return;
    const card = e.currentTarget.querySelector<HTMLElement>(".bc-card");
    if (!card) return;
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    animate(card, { rotateY: px * 8, rotateX: -py * 6 }, { type: "spring", stiffness: 260, damping: 26 });
  };
  const onCardLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    unlight(e.currentTarget);
    showTip(null);
    const card = e.currentTarget.querySelector<HTMLElement>(".bc-card");
    if (card) animate(card, { rotateY: 0, rotateX: 0 }, { type: "spring", stiffness: 260, damping: 26 });
  };

  const count = landed.length;
  const label = `Home. Hidden interactions: ${count} of ${TOTAL} found.`;

  return (
    <div
      className="bc"
      ref={slotRef}
      data-open={open ? "true" : "false"}
      // keyboard: focusing the card opens it, so the note and the hint are reachable
      onFocus={(e) => {
        if (!isKeyboardFocus(e.target)) return;
        byKeyboard.current = true;
        openNow();
      }}
      // Only a keyboard-opened card closes when focus leaves it: a tap moves
      // focus off the link too, and that must not shut a card being used.
      onBlur={(e) => {
        if (byKeyboard.current && !slotRef.current?.contains(e.relatedTarget as Node | null)) closeSoon();
      }}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        hovering.current = true;
        window.clearTimeout(autoCloseTimer.current);
        openNow();
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== "mouse") return;
        hovering.current = false;
        closeSoon();
      }}
    >
      <a
        className="bc-mini"
        href={HOME_HREF}
        aria-label={label}
        onPointerDown={(e) => (lastPointer.current = e.pointerType)}
        onClick={onMiniClick}
        onPointerMove={(e) => light(e, e.currentTarget)}
        onPointerLeave={(e) => unlight(e.currentTarget)}
      >
        <span ref={miniRef} className="bc-mini-anchor">
          <CompactCard landed={landed} />
        </span>
      </a>

      <div
        className="bc-pop"
        ref={popRef}
        onPointerDown={(e) => {
          lastPointer.current = e.pointerType;
          // the press registers: the card gives a little (the bulb has its own)
          if (reduced || (e.target as Element).closest(".bc-hint")) return;
          const face = popRef.current?.querySelector(".bc-card");
          if (face) animate(face, { scale: [1, 0.97, 1] }, { duration: 0.2, times: [0, 0.35, 1], ease: [0.23, 1, 0.32, 1] });
        }}
        onClick={onCardClick}
        onPointerMove={onCardMove}
        onPointerLeave={onCardLeave}
      >
        <CardFace
          landed={landed}
          slotRefs={slotCells}
          onHint={toggleHint}
          hintOpen={hintOpen}
          starTips={{ tips, at: tipAt, set: showTip }}
          light
        />
      </div>

      <p className="bc-sr" aria-live="polite">
        {announce}
      </p>

      {typeof document !== "undefined" &&
        createPortal(
          <>
            {intro && (
              <div className="bc-intro" aria-hidden="true">
                <div className="bc-intro-card" ref={introCardRef}>
                  <CardFace landed={landed} />
                  {/* the compact card's contents, faded in as the ticket
                      becomes it in flight (fly(), below) */}
                  <span className="bc-intro-compact">
                    <CompactCard landed={landed} light={false} />
                  </span>
                </div>
              </div>
            )}
            {flights.map((f) => (
              <FlyingBadge
                key={f.key}
                flight={f}
                target={() => {
                  const i = getFound().indexOf(f.id);
                  return slotCells.current[i]?.getBoundingClientRect() ?? null;
                }}
                onLanded={landedFlight}
              />
            ))}
          </>,
          document.body
        )}
    </div>
  );
}
