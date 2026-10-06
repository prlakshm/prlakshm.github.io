import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { animate } from "motion";
import {
  BADGES,
  getFound,
  nextHint,
  hintOf,
  onEarn,
  subscribe,
  takePending,
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
const HOLD_MS = 2900; // how long the intro card sits before flying home
const AUTO_CLOSE_MS = 1700; // how long a freshly stamped card stays open
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

/* Captured once per page load, before React renders. Under Strict Mode effects
   run twice; reading the pending badge inside an effect would consume it on
   the first pass and lose the celebration on the second. */
let bootPending: BadgeId | null = typeof window === "undefined" ? null : takePending();

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

/* The five slots, filled in the order they were found. On the full card each
   star has its own tip (hover, or a tap on touch): the badge found there, or
   for an empty slot the hint for one still to find. */
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
          onPointerEnter={starTips ? (e) => e.pointerType === "mouse" && starTips.set(i) : undefined}
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
function CompactCard({ landed }: { landed: BadgeId[] }) {
  return (
    <span className="bc-compact" aria-hidden="true">
      <Slots landed={landed} light />
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
    const rect = target();
    if (!el || !rect) {
      onLanded(flight);
      return;
    }
    const size = 30;
    const sx = flight.from.x - size / 2;
    const sy = flight.from.y - size / 2;
    el.style.left = `${sx}px`;
    el.style.top = `${sy}px`;
    const tx = rect.left + rect.width / 2 - size / 2 - sx;
    const ty = rect.top + rect.height / 2 - size / 2 - sy;
    const land = rect.height / size; // lands at the slot's star size
    const controls = animate(
      el,
      {
        x: [0, tx * 0.08, tx],
        y: [0, -54, ty],
        scale: [0.2, 2.1, land],
        rotate: [-28, 10, CROOKED[flight.slot] ?? 0],
      },
      { duration: 1, times: [0, 0.3, 1], ease: [0.3, 0.7, 0.2, 1] }
    );
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
  const inFlight = useRef<Set<BadgeId>>(new Set(bootPending ? [bootPending] : []));
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
  const introVeilRef = useRef<HTMLDivElement>(null);
  const slotCells = useRef<Array<HTMLSpanElement | null>>([]);
  const hovering = useRef(false);
  const closeTimer = useRef(0);
  const autoCloseTimer = useRef(0);
  const hintTimer = useRef(0);
  const tipTimer = useRef(0);
  const lastPointer = useRef("mouse");
  const byKeyboard = useRef(false); // opened by keyboard focus, so focus leaving closes it
  const flightKey = useRef(0);

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

  useLayoutEffect(() => {
    const pop = popRef.current;
    if (!pop) return;
    if (open) {
      pop.style.visibility = "visible";
      pop.style.pointerEvents = "auto";
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
  const toggleHint = () => {
    window.clearTimeout(hintTimer.current);
    setHintOpen((v) => {
      if (!v) hintTimer.current = window.setTimeout(() => setHintOpen(false), 2600);
      return !v;
    });
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
    const fade = (el: Element | null, on: boolean) => {
      if (!el) return;
      const now = Number(getComputedStyle(el).opacity);
      if ((on && now === 1) || (!on && now === 0)) return;
      animate(el, { opacity: on ? 1 : 0 }, reduced ? { duration: 0 } : { duration: on ? 0.16 : 0.22 });
    };
    fade(pop.querySelector(".bc-tip"), hintOpen);
    pop.querySelectorAll(".bc-star-tip").forEach((el, i) => fade(el, i === tipAt));
  }, [hintOpen, tipAt, reduced]);

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
    if (t.closest(".bc-hint, .bc-tip")) return;
    const slot = t.closest<HTMLElement>(".bc-slot");
    if (slot && fromTouch(e)) {
      const i = Number(slot.dataset.i);
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
          autoCloseTimer.current = window.setTimeout(() => {
            if (!hovering.current) setOpen(false);
          }, AUTO_CLOSE_MS);
        }, 120);
        return;
      }
      // Let the card finish growing before the stamp aims at it.
      window.setTimeout(() => {
        flightKey.current += 1;
        setFlights((f) => [...f, { key: flightKey.current, id, slot: getFound().indexOf(id), from: start }]);
      }, 380);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sync]
  );

  useEffect(() => onEarn(({ id, from }) => celebrate(id, from)), [celebrate]);

  const landedFlight = (f: Flight) => {
    setFlights((all) => all.filter((x) => x.key !== f.key));
    inFlight.current.delete(f.id);
    sync();
    setAnnounce(`Found: ${titleOf(f.id)}. ${getFound().length} of ${TOTAL}.`);
    window.clearTimeout(autoCloseTimer.current);
    autoCloseTimer.current = window.setTimeout(() => {
      if (!hovering.current) setOpen(false);
    }, AUTO_CLOSE_MS);
  };

  useLayoutEffect(() => {
    if (glOn) layoutLights();
  }, [landed, glOn, layoutLights]);

  /* Stamp: the slot that just filled presses in and catches the light. */
  const prevCount = useRef(landed.length);
  useLayoutEffect(() => {
    if (landed.length > prevCount.current && !reduced) {
      const i = landed.length - 1;
      const stamps = [
        slotCells.current[i]?.querySelector<HTMLElement>(".bc-stamp"),
        miniRef.current?.querySelectorAll<HTMLElement>(".bc-slot")[i]?.querySelector<HTMLElement>(".bc-stamp"),
      ];
      stamps.forEach((el) => {
        if (!el) return;
        animate(el, { scale: [1.45, 0.92, 1] }, { duration: 0.55, ease: [0.2, 0.8, 0.2, 1] });
        el.classList.remove("is-landing");
        void el.offsetWidth; // restart the flash
        el.classList.add("is-landing");
      });
      // with the light layer, the landing flash is a light crossing that stamp
      window.setTimeout(() => {
        lights.current.mini?.flash(i);
        lights.current.card?.flash(i);
      }, 120);
    }
    if (landed.length >= TOTAL && prevCount.current < TOTAL && !reduced) {
      [popRef.current, miniRef.current].forEach((root) => {
        const svg = root?.querySelector<SVGSVGElement>(".bc-popper") ?? null;
        window.setTimeout(() => popConfetti(svg, true), 250);
      });
    }
    prevCount.current = landed.length;
  }, [landed.length, reduced]);

  /* A badge earned on the way out (a case-study link) lands on return. */
  useEffect(() => {
    if (!bootPending) return;
    const id = bootPending;
    const t = window.setTimeout(() => {
      bootPending = null;
      celebrate(id, null);
    }, 900);
    return () => window.clearTimeout(t);
  }, [celebrate]);

  /* --- first-visit intro --------------------------------------------------- */
  useLayoutEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(INTRO_KEY) === "1";
    } catch {
      seen = true;
    }
    if (!seen && !reduced && getFound().length < TOTAL && !bootPending) setIntro(true);
  }, [reduced]);

  useLayoutEffect(() => {
    if (!intro) return;
    const card = introCardRef.current;
    if (!card) return;
    let flown = false;
    let holdTimer = 0;

    card.style.transformOrigin = "50% 50%";
    const enter = animate(
      card,
      { opacity: [0, 1], y: [34, 0], scale: [0.92, 1], rotateX: [18, 0] },
      { type: "spring", stiffness: 160, damping: 20, opacity: { duration: 0.3 } }
    );
    const veil = introVeilRef.current;
    if (veil) animate(veil, { opacity: [0, 1] }, { duration: 0.35 });

    const fly = () => {
      if (flown) return;
      flown = true;
      window.clearTimeout(holdTimer);
      detach();
      const mini = miniRef.current?.getBoundingClientRect();
      const from = card.getBoundingClientRect();
      if (introVeilRef.current) animate(introVeilRef.current, { opacity: 0 }, { duration: 0.45 });
      const done = () => {
        try {
          sessionStorage.setItem(INTRO_KEY, "1");
        } catch {
          /* no-op */
        }
        setIntro(false);
        if (miniRef.current)
          animate(miniRef.current, { scale: [1.22, 1] }, { type: "spring", stiffness: 520, damping: 16 });
      };
      if (!mini) {
        done();
        return;
      }
      enter.complete();
      card.style.transformOrigin = "0 0";
      const s = mini.width / from.width;
      animate(
        card,
        { x: mini.left - from.left, y: mini.top - from.top, scale: s, rotate: [0, -4, 0] },
        { type: "spring", stiffness: 150, damping: 21, mass: 0.9 }
      )
        .finished.then(done)
        .catch(done);
      // the full card hands over to the compact one as it arrives
      animate(card, { opacity: [1, 1, 0] }, { duration: 0.55, times: [0, 0.6, 1] });
    };

    const onAny = () => fly();
    const detach = () => {
      window.removeEventListener("wheel", onAny);
      window.removeEventListener("touchmove", onAny);
      window.removeEventListener("keydown", onAny);
      window.removeEventListener("pointerdown", onAny);
    };
    // Any intent to use the page sends the card home early.
    window.addEventListener("wheel", onAny, { passive: true });
    window.addEventListener("touchmove", onAny, { passive: true });
    window.addEventListener("keydown", onAny);
    window.addEventListener("pointerdown", onAny);
    holdTimer = window.setTimeout(fly, HOLD_MS);

    return () => {
      window.clearTimeout(holdTimer);
      detach();
      enter.stop();
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
    const gl = glOn ? lightFor(root) : null;
    if (gl) {
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
    if (glOn) lightFor(root)?.lamp(null);
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
      className={`bc${glOn ? " bc-gl" : ""}`}
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
        onPointerDown={(e) => (lastPointer.current = e.pointerType)}
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
        {hint && (
          <span className="bc-tip wt-tip" aria-hidden="true">
            {hintOf(hint)}
          </span>
        )}
      </div>

      <p className="bc-sr" aria-live="polite">
        {announce}
      </p>

      {typeof document !== "undefined" &&
        createPortal(
          <>
            {intro && (
              <div className="bc-intro" aria-hidden="true">
                <div className="bc-intro-veil" ref={introVeilRef} />
                <div className="bc-intro-card" ref={introCardRef}>
                  <CardFace landed={landed} />
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
