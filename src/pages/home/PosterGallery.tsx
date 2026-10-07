import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { animate, frame, motionValue, type MotionValue } from "motion";
import type { BadgeId } from "../../components/badges/badgeStore.js";
import {
  beginConceptJourney,
  opensInNewTab,
} from "../../components/badges/conceptJourney.js";
import { ExternalArrow } from "./WtNav.js";
import { prefersReducedMotion } from "./interactions.js";
import "./gallery.css";

/* The gallery: every poster on one wall, case studies then concepts, each
   group under its own placard. Under each print a museum label: the project,
   what and when, and one line on what it is. The prints are glass: hover one
   and it leans toward the cursor, the light catching it, while the white chip
   that rides the cursor says where a click goes. Below desktop widths the wall
   becomes a rail you swipe along. */

export type GalleryItem = {
  id: string;
  title: string;
  /** "Name · what · year": the first part is the label's name line. */
  tag: string;
  href: string;
  external?: boolean;
  /** Tooltip line. Defaults to "VIEW CASE STUDY", like the notebooks did. */
  cta?: string;
  badge: BadgeId;
  posterAlt: string;
  /** The UV varnish's two inks, from the poster's own palette. */
  tint?: [string, string];
};

export type GalleryGroup = { index: string; title: string; items: GalleryItem[] };

const ASSET = "/home/work/";
/* Hover: the print leans toward the cursor and drifts a few pixels with it.
   No scale, so even at full lean it stays inside its own column's gap. */
const TILT = 6; // degrees at the print's edge
const DRIFT = 4; // px at the print's edge
const LIFT = 3; // px straight up while held
const LEAN = { type: "spring", stiffness: 240, damping: 22 } as const;

/* The light on the glass. The shine under the cursor rides the same LEAN
   spring as the tilt, so light and pane move as one body; its brightness has
   springs of its own: a quick, critically damped bloom on touch and a slower
   fade on release (no overshoot, so it never flashes). */
const GLOW_IN = { type: "spring", stiffness: 300, damping: 35 } as const;
const GLOW_OUT = { type: "spring", stiffness: 110, damping: 21 } as const;
const GLOW_OFF_PRINT = 0.35; // cursor on the label below: the glass dims, not dark

type Glass = {
  print: HTMLElement;
  uv: HTMLElement;
  glare: HTMLElement;
  // the lean (cursor position over the print, -0.5..0.5, and the lift 0..1)
  px: MotionValue<number>;
  py: MotionValue<number>;
  lift: MotionValue<number>;
  // the light (where it sits over the print, and how bright, 0..1)
  lx: MotionValue<number>;
  ly: MotionValue<number>;
  glow: MotionValue<number>;
  glowTo: number;
  on: boolean;
  render: () => void;
  off: () => void;
};

const fmt = (n: number) => Math.round(n * 1000) / 1000;

export default function PosterGallery({ groups }: { groups: GalleryGroup[] }) {
  const reduced = prefersReducedMotion();
  const tipRef = useRef<HTMLSpanElement>(null);
  const tipOn = useRef(false);
  const [tipText, setTipText] = useState("VIEW CASE STUDY");
  const glasses = useRef(new Map<string, Glass>());

  useEffect(() => {
    const all = glasses.current;
    return () => {
      all.forEach((g) => g.off());
      all.clear();
    };
  }, []);

  /* --- glass ----------------------------------------------------------------
     One render per frame writes the pane's lean and every light layer from
     the same spring state, so nothing can drift out of step. */
  const glassFor = (id: string, card: HTMLElement): Glass | null => {
    const known = glasses.current.get(id);
    if (known && known.print.isConnected) return known;
    const print = card.querySelector<HTMLElement>(".gl-print");
    const uv = card.querySelector<HTMLElement>(".gl-uv");
    const glare = card.querySelector<HTMLElement>(".gl-glare");
    if (!print || !uv || !glare) return null;
    const g = {
      print, uv, glare,
      px: motionValue(0), py: motionValue(0), lift: motionValue(0),
      lx: motionValue(0), ly: motionValue(0), glow: motionValue(0),
      glowTo: 0,
      on: false,
    } as Glass;
    g.render = () => {
      const px = g.px.get(), py = g.py.get(), lift = g.lift.get();
      const lx = g.lx.get(), ly = g.ly.get();
      const glow = Math.min(1, Math.max(0, g.glow.get()));
      const still = !g.on && px === 0 && py === 0 && lift === 0 && glow === 0;

      // The lean: exactly what Motion wrote for it before, perspective first.
      print.style.transform = still
        ? ""
        : `perspective(900px) translateX(${fmt(px * 2 * DRIFT)}px) translateY(${fmt(py * 2 * DRIFT * 0.6 - LIFT * lift)}px) rotateX(${fmt(-py * 2 * TILT * 0.8)}deg) rotateY(${fmt(px * 2 * TILT)}deg)`;

      // The shine: a soft pool of light under the cursor.
      glare.style.transform = `translate3d(${fmt(lx * 50)}%, ${fmt(ly * 50)}%, 0)`;
      glare.style.opacity = `${fmt(glow)}`;

      // The varnish: its colour band waits off the left edge, slides in as
      // the glass lights, drifts against the cursor, and slides back out as
      // the glow fades. (Its old background-position, as a 250% layer:
      // 120% at rest, 50% - 80% x the cursor while lit.)
      const at = 1.2 - (0.7 + 0.8 * lx) * glow;
      uv.style.transform = `translate3d(${fmt(-60 * at)}%, 0, 0)`;
      uv.style.opacity = `${fmt(0.14 + 0.56 * glow)}`;

      print.classList.toggle("is-live", !still);
    };
    const subs = [g.px, g.py, g.lift, g.lx, g.ly, g.glow].map((v) => v.on("change", () => frame.render(g.render)));
    g.off = () => {
      subs.forEach((u) => u());
      [g.px, g.py, g.lift, g.lx, g.ly, g.glow].forEach((v) => v.stop());
    };
    glasses.current.set(id, g);
    return g;
  };

  /* Where the cursor is over the print, -0.5..0.5 each way, and whether it is
     on the print at all (not the label below). Measured against the card,
     which never moves, not the leaning print. */
  const aim = (card: HTMLElement, print: HTMLElement, e: React.PointerEvent) => {
    const r = card.getBoundingClientRect();
    const fx = (e.clientX - r.left) / print.offsetWidth - 0.5;
    const fy = (e.clientY - r.top) / print.offsetHeight - 0.5;
    const clamp = (n: number) => Math.max(-0.5, Math.min(0.5, n));
    return { x: clamp(fx), y: clamp(fy), over: fy <= 0.5 };
  };

  const glowTo = (g: Glass, to: number) => {
    if (g.glowTo === to) return;
    g.glowTo = to;
    animate(g.glow, to, reduced ? { duration: 0 } : to > g.glow.get() ? GLOW_IN : GLOW_OUT);
  };

  /* --- tooltip: the landing page's white chip, desktop pointers only --- */
  const placeTip = (x: number, y: number) => {
    const el = tipRef.current;
    if (!el) return;
    // Measured each time: the line changes with the print under the cursor.
    const pad = 8;
    el.style.left = `${Math.min(Math.max(pad, x + 14), window.innerWidth - el.offsetWidth - pad)}px`;
    el.style.top = `${Math.min(Math.max(pad, y + 18), window.innerHeight - el.offsetHeight - pad)}px`;
  };
  const showTip = (on: boolean) => {
    const el = tipRef.current;
    if (!el || tipOn.current === on) return;
    tipOn.current = on;
    animate(el, { opacity: on ? 1 : 0 }, reduced ? { duration: 0 } : { type: "spring", stiffness: 460, damping: 24 });
  };

  const onEnter = (item: GalleryItem, e: React.PointerEvent<HTMLAnchorElement>) => {
    if (e.pointerType !== "mouse") return;
    setTipText(item.cta ?? "VIEW CASE STUDY");
    const g = glassFor(item.id, e.currentTarget);
    if (g) {
      g.on = true;
      const a = aim(e.currentTarget, g.print, e);
      // The light blooms where the cursor touches, not at the centre. If the
      // last glow is still fading it glides over instead of jumping.
      if (g.glow.get() < 0.02 || reduced) {
        g.lx.jump(reduced ? 0 : a.x);
        g.ly.jump(reduced ? 0 : a.y);
      }
      glowTo(g, a.over ? 1 : GLOW_OFF_PRINT);
      frame.render(g.render);
    }
  };
  const onMove = (item: GalleryItem, e: React.PointerEvent<HTMLAnchorElement>) => {
    if (e.pointerType !== "mouse") return;
    placeTip(e.clientX, e.clientY);
    showTip(true);
    const g = glassFor(item.id, e.currentTarget);
    if (!g) return;
    g.on = true;
    const a = aim(e.currentTarget, g.print, e);
    glowTo(g, a.over ? 1 : GLOW_OFF_PRINT);
    if (reduced) return;
    // Pane and light chase the same point on the same spring.
    animate(g.px, a.x, LEAN);
    animate(g.py, a.y, LEAN);
    animate(g.lift, 1, LEAN);
    animate(g.lx, a.x, LEAN);
    animate(g.ly, a.y, LEAN);
  };
  const onLeave = (item: GalleryItem) => {
    showTip(false);
    const g = glasses.current.get(item.id);
    if (!g) return;
    g.on = false;
    // The pane settles flat; the shine fades where it was, it doesn't slide
    // back to the middle.
    glowTo(g, 0);
    if (!reduced) {
      animate(g.px, 0, LEAN);
      animate(g.py, 0, LEAN);
      animate(g.lift, 0, LEAN);
    }
    frame.render(g.render);
  };

  /* A concept starts a journey here, but Reimagine is not awarded until its
     destination confirms opening and the visitor returns. */
  const onOpen = (item: GalleryItem, e: React.MouseEvent<HTMLAnchorElement>) => {
    if (item.badge !== "reimagine") return;
    beginConceptJourney(new URL(item.href, window.location.href).pathname, {
      newTab: opensInNewTab(e),
    });
  };

  /* Desktop columns: one per print, plus a spacer between groups so each
     placard's rule ends where its group does. Narrower, each group is its own
     row (see gallery.css), so placement goes through custom properties. */
  const cols = groups.map((g) => `repeat(${g.items.length}, var(--gl-col))`).join(" var(--gl-split) ");
  const widest = Math.max(...groups.map((g) => g.items.length));
  let col = 1;

  return (
    <>
      <div className="gl-wall" style={{ "--gl-cols": cols, "--gl-max": widest } as React.CSSProperties}>
        {groups.map((g) => {
          const start = col;
          col += g.items.length + 1;
          return (
            <div className="gl-group" key={g.index} style={{ "--n": g.items.length } as React.CSSProperties}>
              <h2 className="gl-placard" style={{ "--c": `${start} / span ${g.items.length}` } as React.CSSProperties}>
                <span className="gl-index">{g.index}</span>
                <span className="gl-placard-title">{g.title}</span>
              </h2>
              {g.items.map((item, j) => {
                const [name, ...what] = item.tag.split(" · ");
                return (
                  <a
                    key={item.id}
                    className="gl-card"
                    style={{ "--c": start + j } as React.CSSProperties}
                    href={item.href}
                    aria-label={`${name}: ${item.title}`}
                    onPointerEnter={(e) => onEnter(item, e)}
                    onPointerMove={(e) => onMove(item, e)}
                    onPointerLeave={() => onLeave(item)}
                    onClick={(e) => onOpen(item, e)}
                    onAuxClick={(e) => onOpen(item, e)}
                    {...(item.external ? { target: "_blank", rel: "noreferrer" } : {})}
                  >
                    <span
                      className="gl-print"
                      style={item.tint ? ({ "--t1": item.tint[0], "--t2": item.tint[1] } as React.CSSProperties) : undefined}
                    >
                      <img src={`${ASSET}${item.id}-poster.webp`} alt={item.posterAlt} loading="eager" {...{ fetchpriority: "high" }} decoding="async" />
                      {/* Glass, in order: UV varnish, print stock, the shine
                          under the cursor, the pane's edge. */}
                      <span className="gl-uv" aria-hidden="true" />
                      <span className="gl-tex" aria-hidden="true" />
                      <span className="gl-glare" aria-hidden="true" />
                      <span className="gl-rim" aria-hidden="true" />
                    </span>
                    <span className="gl-label" aria-hidden="true">
                      <span className="gl-name">{name}</span>
                      <span className="gl-meta">
                        {what.join(" · ")}
                        {item.external && <ExternalArrow />}
                      </span>
                      <span className="gl-desc">{item.title}</span>
                    </span>
                  </a>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* On <body>, like the deck tooltips, so no ancestor transform captures
          its fixed positioning. */}
      {typeof document !== "undefined" &&
        createPortal(
          <span className="deck-tooltip gl-tooltip wt-tip" aria-hidden="true" ref={tipRef}>
            {tipText}
            <svg className="jr-arrow" viewBox="0 0 10 10" aria-hidden="true" focusable="false">
              <path d="M2.5 7.5 L7.5 2.5 M3.6 2.5 H7.5 V6.4" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
            </svg>
          </span>,
          document.body
        )}
    </>
  );
}
