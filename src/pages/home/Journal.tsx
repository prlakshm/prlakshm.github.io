import { useLayoutEffect, useRef } from "react";
import { animate } from "motion";
import { SPRING_HEAVY } from "./interactions.js";
import type { Journal as JournalData } from "./journals.js";

/* A single journal on the worktable.

   Open/close runs through Motion (motion.dev) rather than CSS transitions, so
   the cover cross-fade and the artifact splay share one timeline. It is driven
   by pointer AND focus, so keyboard users get the identical interaction.

   The closed and open photographs cross-fade — they are separate real assets,
   never one image distorted. Artifacts rest tucked behind the covers and deal
   outwards on a stagger. Everything animated is transform/opacity only. */

type Props = {
  journal: JournalData;
  /** Index in the row, used to stagger the scroll-in reveal. */
  index: number;
};

/** Matches the --splay steps in home.css: the gutter between journals narrows
 *  at smaller viewports, so the artifacts have to travel less far. */
function splayFor(width: number) {
  if (width <= 1023) return 0.6;
  if (width <= 1439) return 0.78;
  return 1;
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
    title,
    descriptor,
    tooltipMeta,
    closed,
    open,
    trimClosed,
    trimOpen,
    alt,
    href,
    width,
    offsetY,
    rotate,
    artifacts,
  } = journal;

  const rootRef = useRef<HTMLLIElement>(null);
  const isOpenRef = useRef(false);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const openImg = root.querySelector<HTMLElement>(".jr-img--open");
    const tooltip = root.querySelector<HTMLElement>(".jr-tooltip");
    const cards = Array.from(root.querySelectorAll<HTMLElement>(".jr-artifact"));

    // Touch has no hover: the notebook stays closed and nothing splays, which
    // matches the mobile CSS. Checked live so a resize is picked up.
    const isTouchLayout = () => window.matchMedia("(max-width: 767px)").matches;
    const isReduced = () =>
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const setOpen = (open: boolean) => {
      if (isTouchLayout() || isOpenRef.current === open) return;
      isOpenRef.current = open;

      const reduced = isReduced();
      const splay = splayFor(window.innerWidth);
      // Heavier spring than the contact tiles — same character, a touch longer,
      // because the notebooks are a weightier component (no stepped easing;
      // a spring is still a plain start→end move).
      const motion = reduced ? { duration: 0 } : SPRING_HEAVY;

      if (openImg) animate(openImg, { opacity: open ? 1 : 0 }, motion);
      if (tooltip) {
        animate(
          tooltip,
          { opacity: open ? 1 : 0, y: open ? 0 : 6 },
          reduced
            ? { duration: 0 }
            : { ...SPRING_HEAVY, delay: open ? 0.06 : 0 }
        );
      }

      cards.forEach((card, i) => {
        const a = artifacts[i];
        if (!a) return;
        animate(
          card,
          {
            opacity: open ? 1 : 0,
            x: open ? a.x * splay : 0,
            y: open ? a.y * splay : 0,
            rotate: open ? a.rotate : 0,
            scale: open ? 1 : 0.72,
          },
          reduced
            ? { duration: 0 }
            : {
                ...SPRING_HEAVY,
                // A light stagger so they don't all snap at once.
                delay: open ? i * 0.04 : 0,
              }
        );
      });
    };

    // Establish the closed state before first paint so nothing flashes open.
    // These must mirror the resting values in home.css exactly.
    if (openImg) openImg.style.opacity = "0";
    if (tooltip) {
      tooltip.style.opacity = "0";
      // X-centring lives on the `translate` property, so `transform` is free
      // to carry only the y offset Motion animates.
      tooltip.style.transform = "translateY(6px)";
    }
    cards.forEach((card) => {
      card.style.opacity = "0";
      card.style.transform = "scale(0.72)";
    });

    const enter = () => setOpen(true);
    const leave = () => setOpen(false);
    const target = root.querySelector<HTMLElement>(".jr-link");
    if (!target) return;

    target.addEventListener("pointerenter", enter);
    target.addEventListener("pointerleave", leave);
    // focusin/out rather than focus/blur: these bubble, and the link is the
    // element that actually receives focus.
    target.addEventListener("focusin", enter);
    target.addEventListener("focusout", leave);

    return () => {
      target.removeEventListener("pointerenter", enter);
      target.removeEventListener("pointerleave", leave);
      target.removeEventListener("focusin", enter);
      target.removeEventListener("focusout", leave);
    };
  }, [artifacts]);

  // With the caption gone, this is the only text naming the project.
  const accessibleName = href
    ? `${title} — ${descriptor}. View case study.`
    : `${title} — ${descriptor}. Case study in progress.`;

  const inner = (
    <>
      <span className="jr-stage">
        {/* Artifacts sit behind the covers so they read as coming from inside. */}
        <span className="jr-artifacts" aria-hidden="true">
          {artifacts.map((a, i) => (
            <span
              key={i}
              className={`jr-artifact jr-artifact--${a.treatment}`}
              style={
                {
                  "--aw": `${a.w}px`,
                  "--ah": `${a.h}px`,
                } as React.CSSProperties
              }
            >
              {a.src ? (
                <img src={a.src} alt="" loading="lazy" decoding="async" />
              ) : a.note ? (
                <span className="jr-note">{a.note}</span>
              ) : null}
            </span>
          ))}
        </span>

        <span className="jr-shadow" aria-hidden="true" />

        {/* translateY of a % resolves against the image's own height, so this
            cancels each PNG's transparent footer exactly, at any width. */}
        <img
          className="jr-img jr-img--closed"
          src={closed}
          alt={alt}
          width={width}
          decoding="async"
          style={{ transform: `translateY(${trimClosed})` }}
        />
        <img
          className="jr-img jr-img--open"
          src={open}
          alt=""
          aria-hidden="true"
          decoding="async"
          style={{ transform: `translateY(${trimOpen})` }}
        />
      </span>

      <span className="jr-tooltip" aria-hidden="true">
        <span className="jr-tooltip-title">{title}</span>
        <span className="jr-tooltip-meta">{tooltipMeta}</span>
        {href && (
          <span className="jr-tooltip-cta">
            VIEW CASE STUDY
            <ExternalArrow />
          </span>
        )}
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

  return (
    <li className="jr" style={style} ref={rootRef}>
      {href ? (
        <a className="jr-link" href={`#${href}`} aria-label={accessibleName}>
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
  );
}

export default Journal;
