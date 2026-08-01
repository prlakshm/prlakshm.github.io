import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { animate } from "motion";
import { SPRING_HEAVY } from "./interactions.js";
import type { Journal as JournalData } from "./journals.js";

/* A single journal on the worktable. Hovering it opens the cover and spills the
   project across the whole screen: a scrim drops over the page, and stills from
   the case-study prototype glide out of the notebook and land big and crooked,
   with torn paper notes carrying the selling points.

   The spill CANNOT live inside the notebook. It has to cover the sticky nav
   (z-index 30) and the neighbouring journals, and every ancestor from .shelf
   down sits inside the z-index:1 layer that `.wt > *` establishes — so no
   z-index here could ever escape it. It renders through a portal on <body>
   instead, and everything in it is position:fixed — the page goes on scrolling
   underneath while the scrim, the cards and the tooltip hold still. */

type Props = {
  journal: JournalData;
  /** Index in the row, used to stagger the scroll-in reveal. */
  index: number;
};

/** Cards are sized off this rather than off the viewport width alone: on a
 *  short, wide window a percentage of width alone would push the top and bottom
 *  rows off screen. Clamping against height x 1.6 keeps the spread inside the
 *  glass at any proportion. */
function spillBase(vw: number, vh: number) {
  return Math.min(vw * 0.96, vh * 1.6);
}

function ExternalArrow() {
  // Berkeley Mono has no ↗, so the affordance is drawn rather than typed.
  return (
    <svg
      className="jr-arrow"
      viewBox="0 0 10 10"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M2.5 7.5 L7.5 2.5 M3.6 2.5 H7.5 V6.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="square"
      />
    </svg>
  );
}

function Journal({ journal, index }: Props) {
  const {
    id,
    number,
    title,
    descriptor,
    client,
    annotation,
    closed,
    open,
    trimClosed,
    trimOpen,
    alt,
    href,
    cta,
    width,
    offsetY,
    rotate,
    spill,
  } = journal;

  const rootRef = useRef<HTMLLIElement>(null);
  const spillRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(false);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const layer = spillRef.current;
    if (!root || !layer) return;

    const target = root.querySelector<HTMLElement>(".jr-link");
    if (!target) return;

    const openImg = root.querySelector<HTMLElement>(".jr-img--open");
    const closedImg = root.querySelector<HTMLElement>(".jr-img--closed");
    const scrim = layer.querySelector<HTMLElement>(".jr-spill-scrim");
    const tooltip = layer.querySelector<HTMLElement>(".jr-tooltip");
    const cards = Array.from(
      layer.querySelectorAll<HTMLElement>(".jr-spill-item")
    );

    // Touch has no hover, which matches the mobile CSS. Checked live so a
    // resize is picked up.
    const isTouchLayout = () => window.matchMedia("(max-width: 767px)").matches;
    const isReduced = () =>
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* Where the notebook's middle sits in the viewport right now — the point
       every card flies out of and returns into. Stored as an offset FROM each
       card's landing spot, so a card that has landed is always at transform 0
       and this can be refreshed under it without moving anything. */
    const trackOrigin = () => {
      const rect = target.getBoundingClientRect();
      const originX = rect.left + rect.width / 2;
      const originY = rect.top + rect.height * 0.46;
      cards.forEach((card) => {
        const landX = Number(card.dataset.lx ?? 0);
        const landY = Number(card.dataset.ly ?? 0);
        card.dataset.ox = String(originX - landX);
        card.dataset.oy = String(originY - landY);
      });
    };

    /* Sizes the cards and fixes their landing spots in VIEWPORT pixels. The
       whole overlay is position:fixed, so the page scrolls underneath it and
       the spread stays put — nothing here is in document space. Re-run on open
       and on resize, since every number is derived from the live viewport. */
    const measure = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const base = spillBase(vw, vh);

      cards.forEach((card, i) => {
        const item = spill[i];
        if (!item) return;
        const w = item.cw * base;
        const h = w / item.ar;
        const landX = vw / 2 + item.cx * vw;
        const landY = vh / 2 + item.cy * vh;
        card.style.width = `${w}px`;
        card.style.height = `${h}px`;
        // left/top ARE the landing spot. Motion only ever drives the offset
        // back to the notebook, which is what keeps a landed card immune to
        // the origin moving under it.
        card.style.left = `${landX - w / 2}px`;
        card.style.top = `${landY - h / 2}px`;
        card.dataset.lx = String(landX);
        card.dataset.ly = String(landY);
      });
      trackOrigin();
    };

    const setOpen = (visible: boolean) => {
      if (isTouchLayout() || isOpenRef.current === visible) return;
      isOpenRef.current = visible;
      /* Opening measures everything. Closing only re-reads where the notebook
         is now: the overlay is fixed, so any scrolling since it opened has
         slid the notebook somewhere else, and the cards have to fly home to
         where it actually is rather than where it was. Doing this here instead
         of on a scroll listener means it cannot be missed. */
      if (visible) measure();
      else trackOrigin();

      const reduced = isReduced();
      layer.classList.toggle("is-open", visible);

      if (openImg) {
        animate(
          openImg,
          {
            opacity: visible ? 1 : 0,
            y: visible ? -7 : 0,
            rotate: visible ? -1.5 : 0,
          },
          reduced ? { duration: 0 } : SPRING_HEAVY
        );
      }
      /* The closed cover has to leave, or it sits at full opacity behind the
         open one for the whole interaction — the two carry different footer
         trims, so it shows around the edges rather than hiding underneath.
         Deliberately not a symmetric cross-fade: opening, it clears fast so the
         two covers are never both readable; closing, it waits for the open one
         to get out of the way before coming back. */
      if (closedImg) {
        animate(
          closedImg,
          { opacity: visible ? 0 : 1 },
          reduced
            ? { duration: 0 }
            : visible
              ? { duration: 0.16, ease: [0.4, 0, 1, 1] }
              : { duration: 0.26, ease: [0, 0, 0.2, 1], delay: 0.12 }
        );
      }

      if (scrim) {
        // Going out, the scrim waits for the cards to be most of the way home
        // before it starts lifting, so the page never reappears under paper
        // that is still in flight.
        animate(
          scrim,
          { opacity: visible ? 1 : 0 },
          reduced
            ? { duration: 0 }
            : visible
              ? { duration: 0.46, ease: [0.22, 0.61, 0.36, 1] }
              : { duration: 0.4, ease: [0.4, 0, 0.2, 1], delay: 0.24 }
        );
      }

      if (tooltip) {
        // Opacity only — left/top track the cursor via pointermove.
        animate(
          tooltip,
          { opacity: visible ? 1 : 0 },
          reduced
            ? { duration: 0 }
            : { ...SPRING_HEAVY, delay: visible ? 0.1 : 0 }
        );
      }

      cards.forEach((card, i) => {
        const item = spill[i];
        if (!item) return;
        // Offset from the card's landing spot back into the notebook. Landed is
        // transform 0; the notebook end of the journey is (ox, oy).
        const ox = Number(card.dataset.ox ?? 0);
        const oy = Number(card.dataset.oy ?? 0);

        if (reduced) {
          /* No travel and no scaling: the cards are already at their landing
             spot and only fade. Someone who asked the OS for less motion should
             not get half the screen sliding at them — but a hard cut is its own
             kind of jolt, so it is still a fade. */
          card.style.transform = `rotate(${item.rotate}deg)`;
          animate(card, { opacity: visible ? 1 : 0 }, { duration: 0.2 });
          return;
        }

        if (visible) {
          /* Deliberately unhurried — nearly a second per card with a real
             stagger, so the spill reads as paper being laid out rather than a
             layout snapping into place. The mid keyframe overshoots the
             rotation and undershoots the travel, which is what gives it the
             flick of something tossed onto a desk. */
          animate(
            card,
            {
              opacity: [0, 1, 1],
              x: [ox, ox * 0.38, 0],
              y: [oy, oy * 0.42 - 30, 0],
              rotate: [0, item.rotate * 1.7, item.rotate],
              scale: [0.16, 0.88, 1],
            },
            {
              duration: 0.86,
              ease: [0.22, 0.68, 0.28, 1],
              delay: 0.08 + i * 0.09,
            }
          );
        } else {
          /* One curve, one duration, no stagger and no delay. The exit used to
             stagger like the entrance and ride a hard ease-in, and between the
             cards leaving at five different moments and each one whipping at
             the end it read as stepping rather than gliding. Everything leaves
             together on a symmetric ease now, slower than it arrived. */
          animate(
            card,
            { opacity: 0, x: ox, y: oy, rotate: 0, scale: 0.16 },
            { duration: 0.62, ease: [0.4, 0, 0.2, 1] }
          );
        }
      });
    };

    const placeTooltip = (clientX: number, clientY: number) => {
      if (!tooltip) return;
      // Viewport coordinates — the tooltip is fixed like the rest of the layer.
      tooltip.style.left = `${clientX + 16}px`;
      tooltip.style.top = `${clientY + 20}px`;
    };

    // Establish the closed state before first paint.
    if (openImg) openImg.style.opacity = "0";
    if (scrim) scrim.style.opacity = "0";
    if (tooltip) tooltip.style.opacity = "0";
    cards.forEach((card) => {
      card.style.opacity = "0";
      card.style.transform = "scale(0.16)";
    });

    const enter = (e: PointerEvent) => {
      placeTooltip(e.clientX, e.clientY);
      setOpen(true);
    };
    const move = (e: PointerEvent) => {
      if (!isOpenRef.current) return;
      placeTooltip(e.clientX, e.clientY);
    };
    const leave = () => setOpen(false);
    const onFocus = () => {
      // No cursor on keyboard focus — anchor near the top centre of the link.
      const rect = target.getBoundingClientRect();
      placeTooltip(rect.left + rect.width * 0.5, rect.top + 24);
      setOpen(true);
    };
    /* A resize mid-spill invalidates every number measure() produced. Because
       left/top now carry the landing spot, re-measuring is enough — the cards
       are sitting at transform 0 and simply follow their new spots. */
    const onResize = () => {
      if (!isOpenRef.current) return;
      if (isTouchLayout()) {
        setOpen(false);
        return;
      }
      measure();
    };

    target.addEventListener("pointerenter", enter);
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerleave", leave);
    target.addEventListener("focusin", onFocus);
    target.addEventListener("focusout", leave);
    window.addEventListener("resize", onResize);

    return () => {
      target.removeEventListener("pointerenter", enter);
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerleave", leave);
      target.removeEventListener("focusin", onFocus);
      target.removeEventListener("focusout", leave);
      window.removeEventListener("resize", onResize);
    };
  }, [spill]);

  const isExternal = href?.startsWith("http") ?? false;
  const ctaLabel = cta ?? "VIEW CASE STUDY";

  // With the caption gone, this is the only text naming the project.
  const accessibleName = href
    ? `${title} — ${descriptor}. ${ctaLabel}${
        // The tooltip can say "IN PROGRESS", which tells a screen reader
        // nothing about where the link goes — so name the destination.
        isExternal ? `, opens ${new URL(href).hostname} in a new tab` : ""
      }.`
    : `${title} — ${descriptor}. Case study in progress.`;

  const inner = (
    <>
      {/* Number, then straight into the heading — no separator glyph. The
          dotted leader is a bare span; everything about it is CSS (see
          .jr-leader), because its length is a per-journal variable. */}
      <span className="jr-annotation" aria-hidden="true">
        <span className="jr-annotation-kicker">
          <span className="jr-annotation-num">{number}</span>
          {client ? `${title} · ${client}` : title}
        </span>
        <span className="jr-annotation-copy">{annotation}</span>
        <span className="jr-leader" />
      </span>

      <span className="jr-stage">
        <span className="jr-shadow" aria-hidden="true" />

        {/* PNG-footer trim lives on the `translate` property as a percentage of
            the source image's own height. */}
        <img
          className="jr-img jr-img--closed"
          src={closed}
          alt={alt}
          width={width}
          decoding="async"
          style={{ translate: `0 ${trimClosed}` }}
        />
        <img
          className="jr-img jr-img--open"
          src={open}
          alt=""
          aria-hidden="true"
          decoding="async"
          style={{ translate: `0 ${trimOpen}` }}
        />
      </span>

      {/* No visible caption — the shelf is just the notebooks. The name still
          reaches assistive tech through the link's accessible name. */}
    </>
  );

  const style = {
    "--jw": `${width}px`,
    "--joffset": `${offsetY}px`,
    "--jrot": `${rotate}deg`,
    "--ji": index,
  } as React.CSSProperties;

  /* Decorative in full: every word in here is either already in the link's
     accessible name or is a caption for a picture of a prototype. Marking the
     whole layer hidden keeps a screen reader from walking a pile of images and
     pull quotes that appear and vanish on a pointer it does not have. */
  const spillLayer = (
    <div className="jr-spill" data-journal={id} aria-hidden="true" ref={spillRef}>
      <div className="jr-spill-scrim" />
      {spill.map((item, i) => (
        <div
          key={i}
          className={`jr-spill-item ${
            item.src ? "jr-spill-item--shot" : "jr-spill-item--note"
          }`}
          data-sheet={item.sheet ?? 1}
        >
          {item.src ? (
            /* NOT lazy. These cards have no size or position until the first
               hover runs measure(), so a lazy image sits at 0x0 off the top of
               the document and the loader never fires — the first hover would
               spill empty frames. Low priority instead: they queue behind the
               covers and the hero, and are decoded long before anyone reaches
               the shelf. */
            <img
              src={item.src}
              alt=""
              decoding="async"
              /* Lowercase, spread as a raw attribute: React 18.3 does not know
                 the camelCase `fetchPriority` prop and warns on every render
                 while still emitting nothing useful. */
              {...{ fetchpriority: "low" }}
            />
          ) : (
            <span className="jr-spill-note">{item.note}</span>
          )}
        </div>
      ))}

      {/* One line, and always the topmost thing on screen — the images land
          around it, never over it. */}
      <span className="jr-tooltip">
        {href ? (
          <span className="jr-tooltip-cta">
            {ctaLabel}
            <ExternalArrow />
          </span>
        ) : (
          <span className="jr-tooltip-cta">IN PROGRESS</span>
        )}
      </span>
    </div>
  );

  return (
    <>
      <li className="jr" data-journal={id} style={style} ref={rootRef}>
        {href ? (
          <a
            className="jr-link"
            href={href}
            aria-label={accessibleName}
            {...(isExternal ? { target: "_blank", rel: "noreferrer" } : null)}
          >
            {inner}
          </a>
        ) : (
          // No case study yet: still focusable so the interaction is reachable,
          // but it does not pretend to navigate anywhere.
          <div
            className="jr-link jr-link--inert"
            tabIndex={0}
            role="group"
            aria-label={accessibleName}
          >
            {inner}
          </div>
        )}
      </li>
      {typeof document !== "undefined" &&
        createPortal(spillLayer, document.body)}
    </>
  );
}

export default Journal;
