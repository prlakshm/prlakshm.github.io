import { useLayoutEffect, useRef } from "react";
import { animate } from "motion";
import { CornerUpLeft, CornerUpRight } from "lucide-react";
import { SPRING_HEAVY } from "./interactions.js";
import type { Journal as JournalData } from "./journals.js";

/* A single journal on the worktable. Its cover opens while project artifacts
   spill outward and the tooltip follows the pointer or keyboard focus. */

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

function AnnotationArrow({ variant }: { variant: JournalData["arrow"] }) {
  const common = {
    "aria-hidden": true,
    focusable: false,
    size: 48,
    strokeWidth: 0.8,
    absoluteStrokeWidth: true,
  } as const;

  if (variant === "dotted-reverse") {
    return (
      <CornerUpRight
        {...common}
        className="jr-annotation-arrow jr-annotation-arrow--dotted jr-annotation-arrow--reverse"
        strokeDasharray="0.7 3.4"
      />
    );
  }

  return (
    <CornerUpLeft
      {...common}
      className={`jr-annotation-arrow jr-annotation-arrow--${variant}`}
      strokeDasharray={variant === "dotted" ? "0.7 3.4" : undefined}
    />
  );
}

function Journal({ journal, index }: Props) {
  const {
    id,
    number,
    title,
    descriptor,
    annotation,
    arrow,
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
  const isTooltipVisibleRef = useRef(false);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const openImg = root.querySelector<HTMLElement>(".jr-img--open");
    const closedImg = root.querySelector<HTMLElement>(".jr-img--closed");
    const tooltip = root.querySelector<HTMLElement>(".jr-tooltip");
    const cards = Array.from(root.querySelectorAll<HTMLElement>(".jr-artifact"));

    // Touch has no hover, which matches the mobile CSS. Checked live so a
    // resize is picked up.
    const isTouchLayout = () => window.matchMedia("(max-width: 767px)").matches;
    const isReduced = () =>
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const setTooltipVisible = (visible: boolean) => {
      if (isTouchLayout() || isTooltipVisibleRef.current === visible) return;
      isTooltipVisibleRef.current = visible;

      const reduced = isReduced();
      const splay = splayFor(window.innerWidth);
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
      if (tooltip) {
        // Opacity only — left/top track the cursor via pointermove.
        animate(
          tooltip,
          { opacity: visible ? 1 : 0 },
          reduced
            ? { duration: 0 }
            : { ...SPRING_HEAVY, delay: visible ? 0.06 : 0 }
        );
      }

      cards.forEach((card, i) => {
        const artifact = artifacts[i];
        if (!artifact) return;

        const finalX = artifact.x * splay;
        const finalY = artifact.y * splay;
        const finalRotate = artifact.rotate;

        if (reduced) {
          animate(
            card,
            {
              opacity: visible ? 1 : 0,
              x: visible ? finalX : 0,
              y: visible ? finalY : 0,
              rotate: visible ? finalRotate : 0,
              scale: visible ? 1 : 0.72,
            },
            { duration: 0 }
          );
          return;
        }

        if (visible) {
          animate(
            card,
            {
              opacity: [0, 1, 1, 1],
              x: [0, finalX * 0.55, finalX * 1.07, finalX],
              y: [0, finalY * 0.45 - 22, finalY * 1.06, finalY],
              rotate: [0, finalRotate * 1.85, finalRotate * 0.92, finalRotate],
              scale: [0.72, 1, 1.07, 1],
            },
            {
              duration: 0.52,
              ease: [0.33, 0.9, 0.4, 1],
              delay: i * 0.11,
            }
          );
        } else {
          animate(
            card,
            { opacity: 0, x: 0, y: 0, rotate: 0, scale: 0.72 },
            SPRING_HEAVY
          );
        }
      });
    };

    const target = root.querySelector<HTMLElement>(".jr-link");
    if (!target) return;

    const placeTooltip = (clientX: number, clientY: number) => {
      if (!tooltip) return;
      const rect = target.getBoundingClientRect();
      // Nudge past the cursor so the chip doesn't sit under the pointer.
      tooltip.style.left = `${clientX - rect.left + 14}px`;
      tooltip.style.top = `${clientY - rect.top + 18}px`;
    };

    // Establish the closed state before first paint.
    if (openImg) openImg.style.opacity = "0";
    if (tooltip) {
      tooltip.style.opacity = "0";
    }
    cards.forEach((card) => {
      card.style.opacity = "0";
      card.style.transform = "scale(0.72)";
    });

    const enter = (e: PointerEvent) => {
      placeTooltip(e.clientX, e.clientY);
      setTooltipVisible(true);
    };
    const move = (e: PointerEvent) => {
      if (!isTooltipVisibleRef.current) return;
      placeTooltip(e.clientX, e.clientY);
    };
    const leave = () => setTooltipVisible(false);
    const onFocus = () => {
      // No cursor on keyboard focus — anchor near the top centre of the link.
      const rect = target.getBoundingClientRect();
      placeTooltip(rect.left + rect.width * 0.5, rect.top + 24);
      setTooltipVisible(true);
    };

    target.addEventListener("pointerenter", enter);
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerleave", leave);
    target.addEventListener("focusin", onFocus);
    target.addEventListener("focusout", leave);

    return () => {
      target.removeEventListener("pointerenter", enter);
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerleave", leave);
      target.removeEventListener("focusin", onFocus);
      target.removeEventListener("focusout", leave);
    };
  }, [artifacts]);

  // With the caption gone, this is the only text naming the project.
  const accessibleName = href
    ? `${title} — ${descriptor}. View case study.`
    : `${title} — ${descriptor}. Case study in progress.`;

  const inner = (
    <>
      <span className="jr-annotation" aria-hidden="true">
        <span className="jr-annotation-kicker">
          {number} / {title}
        </span>
        <span className="jr-annotation-copy">{annotation}</span>
        <AnnotationArrow variant={arrow} />
      </span>

      <span className="jr-stage">
        <span className="jr-artifacts" aria-hidden="true">
          {artifacts.map((artifact, i) => (
            <span
              key={i}
              className={`jr-artifact jr-artifact--${artifact.treatment}`}
              style={
                {
                  "--aw": `${artifact.w}px`,
                  "--ah": `${artifact.h}px`,
                } as React.CSSProperties
              }
            >
              {artifact.src ? (
                <img src={artifact.src} alt="" loading="lazy" decoding="async" />
              ) : artifact.note ? (
                <span className="jr-note">{artifact.note}</span>
              ) : null}
            </span>
          ))}
        </span>

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
    <li className="jr" data-journal={id} style={style} ref={rootRef}>
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
