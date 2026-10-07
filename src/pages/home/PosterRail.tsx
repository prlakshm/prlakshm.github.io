import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { animate } from "motion";
import { earn, type BadgeId } from "../../components/badges/badgeStore.js";
import {
  beginConceptJourney,
  opensInNewTab,
} from "../../components/badges/conceptJourney.js";
import { ExternalArrow } from "./WtNav.js";
import { prefersReducedMotion } from "./interactions.js";
import "./rail.css";

/* A row of three posters that opens like a streaming rail.

   At rest: three 4:5 posters, each with its label. Hover one and the whole
   strip advances so that poster lands in slot 1, while a screen slides in from
   the right over slots 2–3 (two poster widths plus the gap ≈ 16:10, the shape
   of the loops) and plays its prototype. The three labels fold into one bar:
   the open project on the left, a switcher of mini posters on the right —
   hover one and the strip slides to it. Leave the row and it all slides back.

   Everything moves leftward to open (the rail advances) and rightward to
   close. The strip moves as one piece, so any project is always exactly one
   strip offset away. */

export type RailItem = {
  id: string;
  title: string;
  tag: string;
  href: string;
  external?: boolean;
  badge: BadgeId;
  posterAlt: string;
  /** Tooltip line. Defaults to "VIEW CASE STUDY", like the notebooks did. */
  cta?: string;
  everything?: boolean;
};

const ASSET = "/home/work/";
/* One curve for everything that moves, so the posters and the screen start
   together, ease together and land together. Symmetric ease-in-out: no
   spring kick at the start, no snap at the end. */
const GLIDE = { duration: 0.72, ease: [0.65, 0, 0.35, 1] } as const;
const SWAP = { duration: 0.6, ease: [0.65, 0, 0.35, 1] } as const;
/* The screen arrives from a little to the right as it fades in — a short
   travel, so it never outruns the posters. */
const SCREEN_ENTER = 0.35; // of one poster step
const OPEN_DWELL = 260; // a pass of the cursor across the row should not open it
const SWITCH_DWELL = 90;
const CLOSE_GRACE = 200;
const LABEL_H = 58;

const centre = (el: Element) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

const MINIS = [
  { src: "petal-press", style: { left: "5%", top: "9%", width: "14%", rotate: "-7deg" } },
  { src: "cursor-loves-indie", style: { left: "15%", top: "58%", width: "22%", rotate: "4deg" } },
  { src: "mixr-cloud", style: { right: "22%", top: "7%", width: "13%", rotate: "6deg" } },
  { src: "shell-drop", style: { right: "5%", top: "42%", width: "14%", rotate: "-5deg" } },
  { src: "emotion", style: { left: "42%", top: "64%", width: "11%", rotate: "-3deg" } },
];

function Bagel({ className = "" }: { className?: string }) {
  return (
    <svg className={`pr-bagel-svg ${className}`.trim()} viewBox="0 0 120 92" aria-hidden="true" focusable="false">
      <ellipse cx="60" cy="52" rx="54" ry="33" fill="#c98a4b" />
      <ellipse cx="60" cy="46" rx="54" ry="33" fill="#e3a866" stroke="#3a2a1d" strokeWidth="2" />
      <ellipse cx="60" cy="44" rx="45" ry="25" fill="#edbb7c" />
      <ellipse cx="60" cy="46" rx="13" ry="7.5" fill="#fafafa" stroke="#3a2a1d" strokeWidth="2" />
      <g fill="#3a2a1d">
        <circle cx="33" cy="32" r="1.7" />
        <circle cx="44" cy="25" r="1.5" />
        <circle cx="79" cy="27" r="1.7" />
        <circle cx="91" cy="40" r="1.5" />
        <circle cx="28" cy="50" r="1.6" />
        <circle cx="85" cy="57" r="1.7" />
        <circle cx="51" cy="63" r="1.5" />
        <circle cx="68" cy="22" r="1.4" />
      </g>
      <g fill="#f7eedc" stroke="#3a2a1d" strokeWidth="0.8">
        <ellipse cx="40" cy="38" rx="2.4" ry="1.3" transform="rotate(-20 40 38)" />
        <ellipse cx="72" cy="31" rx="2.4" ry="1.3" transform="rotate(25 72 31)" />
        <ellipse cx="95" cy="49" rx="2.4" ry="1.3" transform="rotate(-10 95 49)" />
        <ellipse cx="64" cy="64" rx="2.4" ry="1.3" transform="rotate(15 64 64)" />
        <ellipse cx="22" cy="44" rx="2.4" ry="1.3" transform="rotate(30 22 44)" />
      </g>
    </svg>
  );
}

/* The Everything "poster": a 4:5 peek at the dotted canvas, bagel in the middle. */
function EverythingPoster() {
  return (
    <div className="pr-canvas pr-canvas--poster" aria-hidden="true">
      <span className="pr-mini" style={{ left: "8%", top: "8%", width: "30%", rotate: "-6deg" }}>
        <img src={`${ASSET}everything/petal-press.webp`} alt="" loading="lazy" decoding="async" />
      </span>
      <span className="pr-mini" style={{ right: "7%", top: "13%", width: "27%", rotate: "5deg" }}>
        <img src={`${ASSET}everything/mixr-cloud.webp`} alt="" loading="lazy" decoding="async" />
      </span>
      <span className="pr-mini" style={{ left: "12%", bottom: "9%", width: "29%", rotate: "4deg" }}>
        <img src={`${ASSET}everything/shell-drop.webp`} alt="" loading="lazy" decoding="async" />
      </span>
      <span className="pr-mini" style={{ right: "9%", bottom: "11%", width: "25%", rotate: "-4deg" }}>
        <img src={`${ASSET}everything/emotion.webp`} alt="" loading="lazy" decoding="async" />
      </span>
      <span className="pr-bagel pr-bagel--poster">
        <Bagel />
      </span>
      <span className="pr-everything-word">Everything</span>
    </div>
  );
}

export default function PosterRail({
  index,
  title,
  sub,
  items,
}: {
  index: string;
  title: string;
  sub: string;
  items: RailItem[];
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLAnchorElement>(null);
  const layerRefs = useRef<Array<HTMLDivElement | null>>([]);
  const labelRefs = useRef<Array<HTMLDivElement | null>>([]);
  const barRef = useRef<HTMLDivElement>(null);
  const barTextRef = useRef<HTMLDivElement>(null);

  const [geo, setGeo] = useState({ w: 0, g: 16, h: 0, step: 0, spread: false });
  const [open, setOpen] = useState<number | null>(null);
  // What the screen and the bar show. Lags `open` on close, so the last
  // project stays on screen while it slides away.
  const [shown, setShown] = useState(0);

  const reduced = prefersReducedMotion();
  const tipRef = useRef<HTMLSpanElement>(null);
  const wasOpen = useRef<number | null>(null);
  const timers = useRef({ dwell: 0, close: 0, badge: 0 });
  const armed = useRef(false); // the pointer has really moved since the last scroll
  const firstPaint = useRef(true);

  /* --- geometry ------------------------------------------------------------ */
  useLayoutEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const measure = () => {
      const rw = rail.clientWidth;
      const g = Math.round(Math.min(20, Math.max(12, window.innerWidth * 0.0125)));
      const w = (rw - 2 * g) / 3;
      const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      setGeo({ w, g, h: w * 1.25, step: w + g, spread: fine && rw >= 860 });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(rail);
    return () => ro.disconnect();
  }, []);

  /* A row that is open when the layout stops supporting it just closes. */
  useEffect(() => {
    if (!geo.spread) setOpen(null);
  }, [geo.spread]);

  /* --- choreography --------------------------------------------------------- */
  useLayoutEffect(() => {
    const strip = stripRef.current;
    const screen = screenRef.current;
    if (!strip || !screen || !geo.spread) return;
    const instant = firstPaint.current || reduced;
    firstPaint.current = false;
    const prev = wasOpen.current;
    wasOpen.current = open;
    const switching = prev !== null && open !== null;
    const curve = instant ? { duration: 0 } : switching ? SWAP : GLIDE;

    /* Both run as full `transform` strings, which Motion hands to the
       browser's compositor (WAAPI). The `x` shorthand would animate on the main
       thread, where a video starting or a React render can stall it — that is
       what made the screen trail the posters. Same curve, same clock. */
    const tx = (x: number) => `translateX(${Math.round(x * 100) / 100}px)`;

    // The strip advances so the open poster lands in slot 1.
    animate(strip, { transform: tx(open === null ? 0 : -open * geo.step) }, curve);

    // The screen fades in over slots 2–3 from a short way right; switching
    // projects leaves it where it is.
    if (!switching) {
      const rest = geo.step;
      const away = geo.step * (1 + SCREEN_ENTER);
      animate(
        screen,
        open === null
          ? { transform: tx(away), opacity: 0 }
          : { transform: [tx(away), tx(rest)], opacity: [0, 1] },
        curve
      );
      screen.style.pointerEvents = open === null ? "none" : "auto";
    }

    // Labels fold into the bar.
    labelRefs.current.forEach(
      (el) => el && animate(el, { opacity: open === null ? 1 : 0 }, { duration: instant ? 0 : 0.24 })
    );
    if (barRef.current)
      animate(
        barRef.current,
        { opacity: open === null ? 0 : 1 },
        { duration: instant ? 0 : 0.3, delay: open === null || instant ? 0 : 0.18 }
      );
  }, [open, geo]);

  useEffect(() => {
    if (open !== null) setShown(open);
  }, [open]);

  /* The screen crossfades between projects; only the one on screen plays. */
  useEffect(() => {
    layerRefs.current.forEach((layer, i) => {
      if (!layer) return;
      animate(layer, { opacity: i === shown ? 1 : 0 }, reduced ? { duration: 0 } : SWAP);
      const v = layer.querySelector("video");
      if (!v) return;
      if (i === shown && open !== null) v.play().catch(() => {});
      else v.pause();
    });
    if (barTextRef.current && open !== null && !reduced)
      animate(barTextRef.current, { opacity: [0.2, 1] }, { duration: 0.35, ease: [0.65, 0, 0.35, 1] });
  }, [shown, open, reduced]);

  /* Load the row's loops once it is near the viewport, so opening is instant. */
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        section.querySelectorAll<HTMLVideoElement>(".pr-layer video").forEach((v) => {
          v.preload = "auto";
        });
        io.disconnect();
      },
      { rootMargin: "400px 0px" }
    );
    io.observe(section);
    return () => io.disconnect();
  }, []);

  /* The bagel remains a dwell find. Concept visits are confirmed explicitly
     by their destination pages instead of by resting on this preview. */
  useEffect(() => {
    window.clearTimeout(timers.current.badge);
    if (open === null) return;
    const item = items[open];
    if (item.everything) {
      timers.current.badge = window.setTimeout(() => {
        const bagel = screenRef.current?.querySelectorAll(".pr-bagel")[open];
        earn("bagel", bagel ? centre(bagel) : null);
      }, 700);
    }
    return () => window.clearTimeout(timers.current.badge);
  }, [open, items]);

  /* Scrolling moves the row under a still cursor; that is not a hover. */
  useEffect(() => {
    const disarm = () => {
      armed.current = false;
    };
    window.addEventListener("scroll", disarm, { passive: true });
    return () => window.removeEventListener("scroll", disarm);
  }, []);

  useEffect(() => {
    const t = timers.current;
    return () => {
      window.clearTimeout(t.dwell);
      window.clearTimeout(t.close);
      window.clearTimeout(t.badge);
    };
  }, []);

  /* --- tooltip ---------------------------------------------------------------
     The landing page's white chip: it rides the cursor over a poster or the
     screen and says where a click goes. Desktop pointers only. */
  const tip = useRef({ on: false, w: 0, h: 0 });
  const placeTip = (x: number, y: number) => {
    const el = tipRef.current;
    if (!el) return;
    const pad = 8;
    el.style.left = `${Math.min(Math.max(pad, x + 14), window.innerWidth - tip.current.w - pad)}px`;
    el.style.top = `${Math.min(Math.max(pad, y + 18), window.innerHeight - tip.current.h - pad)}px`;
  };
  const showTip = (on: boolean) => {
    const el = tipRef.current;
    if (!el || tip.current.on === on) return;
    tip.current.on = on;
    if (on) {
      tip.current.w = el.offsetWidth;
      tip.current.h = el.offsetHeight;
    }
    animate(el, { opacity: on ? 1 : 0 }, reduced ? { duration: 0 } : { type: "spring", stiffness: 460, damping: 24 });
  };
  const onTipMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const over = (e.target as Element).closest(".pr-poster, .pr-screen");
    if (over) placeTip(e.clientX, e.clientY);
    showTip(!!over);
  };
  // The chip names whichever project is under the cursor: the open one on
  // the screen, or the poster itself.
  const [tipItem, setTipItem] = useState(0);

  /* --- input --------------------------------------------------------------- */
  const later = (i: number, ms: number) => {
    window.clearTimeout(timers.current.dwell);
    timers.current.dwell = window.setTimeout(() => setOpen(i), ms);
  };
  const onPosterHover = (i: number) => {
    if (!geo.spread || open !== null || !armed.current) return;
    later(i, OPEN_DWELL);
  };
  const onRailMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    onTipMove(e);
    const slot = (e.target as Element).closest<HTMLElement>("[data-slot]");
    if (slot) setTipItem(Number(slot.dataset.slot));
    else if ((e.target as Element).closest(".pr-screen")) setTipItem(shown);
    if (!armed.current) {
      armed.current = true;
      // Arrived by scrolling and then moved: start the dwell for whatever is under it.
      const el = (e.target as Element).closest<HTMLElement>("[data-slot]");
      if (el && open === null) onPosterHover(Number(el.dataset.slot));
    }
  };
  const onRailEnter = () => window.clearTimeout(timers.current.close);
  const onRailLeave = () => {
    showTip(false);
    window.clearTimeout(timers.current.dwell);
    timers.current.close = window.setTimeout(() => setOpen(null), CLOSE_GRACE);
  };
  const onBlurRow = (e: React.FocusEvent) => {
    if (!sectionRef.current?.contains(e.relatedTarget as Node)) setOpen(null);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (open === null) return;
    if (e.key === "Escape") {
      setOpen(null);
      (sectionRef.current?.querySelectorAll<HTMLElement>(".pr-poster")[open])?.focus();
    }
    if (e.key === "ArrowRight") setOpen((v) => (v === null ? v : Math.min(items.length - 1, v + 1)));
    if (e.key === "ArrowLeft") setOpen((v) => (v === null ? v : Math.max(0, v - 1)));
  };

  const go = (
    item: RailItem,
    from: Element | null,
    event: React.MouseEvent<HTMLAnchorElement>,
  ) => {
    if (item.everything) {
      earn("bagel", from ? centre(from) : null);
      return;
    }
    if (item.badge === "reimagine") {
      beginConceptJourney(new URL(item.href, window.location.href).pathname, {
        newTab: opensInNewTab(event),
      });
    }
  };

  const linkProps = (item: RailItem) => (item.external ? { target: "_blank", rel: "noreferrer" } : {});
  const current = items[shown];

  return (
    <section
      className={`pr${geo.spread ? " is-spread" : " is-static"}${open !== null ? " is-open" : ""}`}
      ref={sectionRef}
      aria-labelledby={`pr-h-${index}`}
      onKeyDown={onKey}
      onBlur={onBlurRow}
      style={
        {
          "--pr-w": `${geo.w}px`,
          "--pr-h": `${geo.h}px`,
          "--pr-g": `${geo.g}px`,
          "--pr-label-h": `${LABEL_H}px`,
        } as React.CSSProperties
      }
    >
      <div className="pr-head">
        <p className="pr-kicker">{index}</p>
        <h2 className="pr-h" id={`pr-h-${index}`}>
          {title}
        </h2>
        <p className="pr-sub">{sub}</p>
      </div>

      <div
        className="pr-rail"
        ref={railRef}
        onPointerMove={onRailMove}
        onPointerEnter={onRailEnter}
        onPointerLeave={onRailLeave}
      >
        <div className="pr-strip" ref={stripRef}>
          {items.map((item, i) => (
            <div className="pr-item" key={item.id}>
              <a
                className="pr-poster"
                data-slot={i}
                href={item.href}
                tabIndex={open !== null && open !== i ? -1 : 0}
                aria-label={`${item.tag.split(" · ")[0]} — ${item.title}`}
                onPointerEnter={(e) => e.pointerType === "mouse" && onPosterHover(i)}
                onPointerLeave={() => open === null && window.clearTimeout(timers.current.dwell)}
                onFocus={(e) => {
                  if (geo.spread && e.currentTarget.matches(":focus-visible")) setOpen(i);
                }}
                onClick={(e) => go(item, e.currentTarget, e)}
                onAuxClick={(e) => go(item, e.currentTarget, e)}
                {...linkProps(item)}
              >
                {item.everything ? (
                  <EverythingPoster />
                ) : (
                  <img src={`${ASSET}${item.id}-poster.webp`} alt={item.posterAlt} loading="lazy" decoding="async" />
                )}
                <span className="pr-rim" aria-hidden="true" />
              </a>
              <div className="pr-label" ref={(el) => (labelRefs.current[i] = el)}>
                <span className="pr-title">{item.title}</span>
                <span className="pr-tag">
                  {item.tag}
                  {item.external && <ExternalArrow />}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* The screen: one layer per project, crossfaded. A link to whichever
            project is on screen. */}
        <a
          className="pr-screen"
          ref={screenRef}
          href={current.href}
          tabIndex={-1}
          aria-hidden="true"
          onClick={(e) => go(current, e.currentTarget, e)}
          onAuxClick={(e) => go(current, e.currentTarget, e)}
          {...linkProps(current)}
        >
          {items.map((item, i) => (
            <div className="pr-layer" key={item.id} ref={(el) => (layerRefs.current[i] = el)}>
              {item.everything ? (
                <div className="pr-canvas pr-canvas--wide">
                  {MINIS.map((m) => (
                    <span key={m.src} className="pr-mini" style={m.style as React.CSSProperties}>
                      <img src={`${ASSET}everything/${m.src}.webp`} alt="" loading="lazy" decoding="async" />
                    </span>
                  ))}
                  <span className="pr-bagel pr-bagel--wide">
                    <Bagel />
                  </span>
                </div>
              ) : (
                <video
                  src={`${ASSET}wide/${item.id}.mp4`}
                  poster={`${ASSET}wide/${item.id}.jpg`}
                  muted
                  loop
                  playsInline
                  preload="none"
                />
              )}
            </div>
          ))}
          <span className="pr-rim" aria-hidden="true" />
        </a>

        {/* Open: the project on screen, and the switcher. */}
        <div className="pr-bar" ref={barRef} aria-hidden={open === null}>
          <div className="pr-bar-text" ref={barTextRef}>
            <a className="pr-title" href={current.href} tabIndex={-1} onClick={(e) => go(current, e.currentTarget, e)} onAuxClick={(e) => go(current, e.currentTarget, e)} {...linkProps(current)}>
              {current.title}
            </a>
            <span className="pr-tag">
              {current.tag}
              {current.external && <ExternalArrow />}
            </span>
          </div>
          <div className="pr-switch" role="group" aria-label={`${title}: switch project`}>
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                className={`pr-chip${i === shown ? " is-on" : ""}`}
                aria-label={`Show ${item.tag.split(" · ")[0]}`}
                aria-pressed={i === shown}
                tabIndex={open === null ? -1 : 0}
                onPointerEnter={(e) => e.pointerType === "mouse" && open !== null && later(i, SWITCH_DWELL)}
                onPointerLeave={() => window.clearTimeout(timers.current.dwell)}
                onClick={() => setOpen(i)}
              >
                {item.everything ? (
                  <span className="pr-chip-canvas">
                    <Bagel />
                  </span>
                ) : (
                  <img src={`${ASSET}${item.id}-poster.webp`} alt="" loading="lazy" decoding="async" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* On <body>: the strip's transform would otherwise capture its fixed
          positioning — same reason the deck tooltips park there. */}
      {typeof document !== "undefined" &&
        createPortal(
          <span className="deck-tooltip pr-tooltip wt-tip" aria-hidden="true" ref={tipRef}>
            {items[tipItem]?.cta ?? "VIEW CASE STUDY"}
            <svg className="jr-arrow" viewBox="0 0 10 10" aria-hidden="true" focusable="false">
              <path d="M2.5 7.5 L7.5 2.5 M3.6 2.5 H7.5 V6.4" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
            </svg>
          </span>,
          document.body
        )}
    </section>
  );
}
