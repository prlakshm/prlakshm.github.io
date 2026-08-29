import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { animate } from "motion";
import { SPRING_HEAVY, prefersReducedMotion } from "./interactions.js";

/* Two speculative concept decks, each shown in a small macOS window sitting on
   the worktable between the notebooks and the fabric. The window plays the
   deck's PDF export as a slideshow — the slides are pre-rendered WebP frames in
   public/home/decks/<id>/ (regeneration: scripts/deck_slides/README.md) — and the whole window is the
   link into the full HTML deck. The traffic lights are decorative; only the
   arrows flip slides.

   The interaction grammar is the shelf's: a Motion spring answers the hover, a
   parchment chip rides the cursor, and the tooltip lives on document.body
   because the frame carries a transform while scaled — position:fixed would
   resolve against it, not the viewport. */

export type Deck = {
  id: string;
  number: string;
  title: string;
  /** Reads on the label after the title ("CURSOR LOVES INDIE · SPECULATIVE
   *  BRAND CAMPAIGN") — same slot as the journals' `client`. */
  client: string;
  /** Small body-type note under the label, in the study's sentence voice. */
  annotation: string;
  href: string;
  /** Tooltip line, uppercase like the journal CTAs. */
  cta: string;
  /** Slides are /home/decks/<id>/slide-01.webp … slide-NN.webp, all 16:9. */
  slideCount: number;
  /** Per-slide zoom, tuned by eye against two limits: big enough that the
   *  slide's text reads at window scale, small enough that nothing the slide
   *  needs lands under the flip arrows (the outer ~9% at mid-height) or off
   *  the crop. Full-bleed photographs get only a whisper; title art stays 1.
   *  The screen clips the overflow — see .deck-screen. */
  zooms: number[];
};

const decks: Deck[] = [
  {
    id: "cursor",
    number: "04",
    title: "CURSOR LOVES INDIE",
    client: "SPECULATIVE BRAND CAMPAIGN",
    annotation: "Cursor as a creative tool for independent artists.",
    href: "/cursor/",
    cta: "CURSOR REIMAGINED",
    slideCount: 9,
    /* 1/9: wordmark scribbles, enlarged as far as the arrow lanes allow.
       2/5/8: full-bleed photographs — a whisper, cropping is all zoom buys.
       3/4/6/7: centred copy on black; the paragraphs (4, 7) run wider than
       the one-liners, so they take less before touching the lanes. */
    zooms: [1.4, 1.15, 1.35, 1.28, 1.15, 1.4, 1.2, 1.15, 1.35],
  },
  {
    id: "figma",
    number: "05",
    title: "FIGMA SOUND",
    client: "SPECULATIVE PRODUCT CONCEPT",
    annotation: "Sound as a new design system material.",
    href: "/figma/",
    cta: "FIGMA REIMAGINED",
    slideCount: 9,
    /* 1: the dotted title already fills the frame — untouched, per the user.
       9: closing photograph with the performer against the right edge — any
       zoom pushes her off the crop. 7: the mock rides the left edge, so 1.1
       is all it can take before the left arrow sits on it. 3/4/8: small
       centred lines, zoomed hardest. 5/6: centred UI mocks. */
    zooms: [1, 1.12, 1.45, 1.45, 1.35, 1.4, 1.1, 1.45, 1],
  },
];

const slideSrc = (id: string, n: number) =>
  `/home/decks/${id}/slide-${String(n + 1).padStart(2, "0")}.webp`;

/* Berkeley Mono Trial is ASCII-only — no arrows, no chevrons worth having — so
   both affordances are drawn, in the ExternalArrow stroke style. */
function Chevron({ dir }: { dir: -1 | 1 }) {
  return (
    <svg
      className="deck-nav-icon"
      viewBox="0 0 10 10"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={dir === -1 ? "M6.1 1.9 L3 5 L6.1 8.1" : "M3.9 1.9 L7 5 L3.9 8.1"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="square"
      />
    </svg>
  );
}

/* The case-study tooltips' arrow, stroke for stroke — same .jr-arrow chrome so
   the two chips cannot drift apart. */
function TipArrow() {
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

function DeckWindow({ deck, index }: { deck: Deck; index: number }) {
  const { id, number, title, client, annotation, href, cta, slideCount, zooms } =
    deck;

  /* The kicker breaks after the client's first word, per the user: the title
     line ends "· SPECULATIVE" and the remainder (BRAND CAMPAIGN / PRODUCT
     CONCEPT) sits under the hanging indent. An explicit break, not wrap math —
     the width at which this wraps naturally sits inside the metric variance of
     the platform monos, so a cap could never hold it on every machine. */
  const [clientLead, ...clientRestWords] = client.split(" ");
  const clientRest = clientRestWords.join(" ");

  const frameRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(0);

  /* Cover first, the rest at idle — same bargain as the journals' open covers:
     nothing beyond slide one is needed until someone reaches for an arrow, so
     the closed covers above keep the connection to themselves. A hover or an
     early click flips it as the fallback for a pointer that beats idle. */
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (ready) return;
    type WithIdle = { requestIdleCallback?: (cb: () => void) => number };
    const idle = (window as unknown as WithIdle).requestIdleCallback;
    const arm = () => setReady(true);
    if (idle) {
      const handle = idle.call(window, arm);
      return () => (window as unknown as {
        cancelIdleCallback?: (h: number) => void;
      }).cancelIdleCallback?.(handle);
    }
    const t = window.setTimeout(arm, 1200);
    return () => window.clearTimeout(t);
  }, [ready]);

  const flip = (dir: -1 | 1) => {
    setReady(true);
    setActive((a) => (a + dir + slideCount) % slideCount);
  };

  /* Hover: the window swells and lifts off the mat on a spring, and the CTA
     chip rides the cursor — desktop pointers only. On touch there is no hover
     to answer: a tap on the window navigates, a tap on an arrow flips (the
     arrows are always visible there, see .deck-nav). */
  useEffect(() => {
    const frame = frameRef.current;
    const tip = tipRef.current;
    if (!frame || !tip) return;

    const canHover = () =>
      window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    let tipW = 0;
    let tipH = 0;
    let tipOn = false;
    const measure = () => {
      tipW = tip.offsetWidth;
      tipH = tip.offsetHeight;
    };
    const place = (clientX: number, clientY: number) => {
      const pad = 8;
      let x = clientX + 14;
      let y = clientY + 18;
      x = Math.min(Math.max(pad, x), window.innerWidth - tipW - pad);
      y = Math.min(Math.max(pad, y), window.innerHeight - tipH - pad);
      tip.style.left = `${x}px`;
      tip.style.top = `${y}px`;
    };
    /* The window swells and rises off the mat — "out of its socket". The
       deepening shadow is CSS (.is-lifted on the link's box-shadow), which
       cannot fight Motion: Motion owns only transform here. */
    const setLift = (on: boolean) => {
      frame.classList.toggle("is-lifted", on);
      return animate(
        frame,
        { scale: on ? 1.07 : 1, y: on ? -14 : 0 },
        prefersReducedMotion() ? { duration: 0 } : SPRING_HEAVY
      );
    };
    const showTip = (on: boolean) => {
      tipOn = on;
      return animate(
        tip,
        { opacity: on ? 1 : 0 },
        prefersReducedMotion()
          ? { duration: 0 }
          : { type: "spring", stiffness: 460, damping: 24 }
      );
    };
    const overNav = (e: Event) =>
      e.target instanceof Element && e.target.closest(".deck-nav") !== null;

    const enter = (e: PointerEvent) => {
      if (!canHover()) return;
      setReady(true); // fallback for a pointer that beats the idle callback
      setLift(true);
      if (overNav(e)) return; // arrived straight onto an arrow — no chip
      measure();
      place(e.clientX, e.clientY);
      showTip(true);
    };
    const move = (e: PointerEvent) => {
      if (!canHover()) return;
      /* The chip names where the window goes, and the arrows go nowhere — over
         them it ducks out of the way rather than promising the wrong thing. */
      if (overNav(e)) {
        if (tipOn) showTip(false);
        return;
      }
      place(e.clientX, e.clientY);
      if (!tipOn) showTip(true);
    };
    const leave = () => {
      if (!canHover()) return;
      setLift(false);
      showTip(false);
    };
    const focusIn = (e: FocusEvent) => {
      setReady(true);
      setLift(true);
      /* The chip names where the LINK goes, so it only follows focus on the
         link itself. The arrows also land here — a click focuses the button —
         and showing the chip then parked it at the top of the window on every
         arrow press. */
      if (e.target instanceof Element && e.target.closest(".deck-nav")) {
        if (tipOn) showTip(false);
        return;
      }
      // No cursor on keyboard focus — anchor near the top centre, as the
      // journals do.
      const rect = frame.getBoundingClientRect();
      measure();
      place(rect.left + rect.width * 0.5, rect.top + 12);
      showTip(true);
    };
    const focusOut = (e: FocusEvent) => {
      // Focus hopping between the link and the arrows stays inside the frame.
      if (e.relatedTarget instanceof Node && frame.contains(e.relatedTarget))
        return;
      setLift(false);
      showTip(false);
    };

    frame.addEventListener("pointerenter", enter);
    frame.addEventListener("pointermove", move);
    frame.addEventListener("pointerleave", leave);
    frame.addEventListener("focusin", focusIn);
    frame.addEventListener("focusout", focusOut);
    return () => {
      frame.removeEventListener("pointerenter", enter);
      frame.removeEventListener("pointermove", move);
      frame.removeEventListener("pointerleave", leave);
      frame.removeEventListener("focusin", focusIn);
      frame.removeEventListener("focusout", focusOut);
    };
  }, []);

  // The annotation is aria-hidden like the shelf labels, so the link carries
  // the whole name.
  const accessibleName = `${title} — ${client}. ${annotation} ${cta}.`;

  return (
    <li
      className="deck"
      data-deck={id}
      style={{ "--di": index } as React.CSSProperties}
    >
      <span className="deck-annotation" aria-hidden="true">
        <span className="deck-kicker">
          <span className="deck-num">{number}</span>
          {title} · {clientLead}
          {clientRest && (
            <>
              <br />
              {clientRest}
            </>
          )}
        </span>
        <span className="deck-copy">{annotation}</span>
        <span className="deck-leader" />
      </span>

      <div className="deck-frame" ref={frameRef}>
        <a className="deck-link" href={href} aria-label={accessibleName}>
          {/* Decorative macOS chrome — the lights do nothing on purpose. */}
          <span className="deck-chrome">
            <span className="deck-light deck-light--red" />
            <span className="deck-light deck-light--yellow" />
            <span className="deck-light deck-light--green" />
          </span>
          <span className="deck-screen">
            {Array.from({ length: slideCount }, (_, n) => (
              <img
                key={n}
                className={`deck-slide${n === active ? " is-active" : ""}`}
                src={n === 0 || ready ? slideSrc(id, n) : undefined}
                alt=""
                draggable={false}
                decoding="async"
                fetchPriority={n === 0 ? undefined : "low"}
                style={
                  (zooms[n] ?? 1) !== 1
                    ? { transform: `scale(${zooms[n]})` }
                    : undefined
                }
              />
            ))}
          </span>
        </a>

        {/* Siblings of the link, not children — a button nested in an anchor is
            both invalid and a mis-tap waiting to happen. They sit over it, so a
            click flips the slide and never navigates. */}
        <button
          type="button"
          className="deck-nav deck-nav--prev"
          aria-label={`Previous ${title} slide`}
          onClick={() => flip(-1)}
        >
          <Chevron dir={-1} />
        </button>
        <button
          type="button"
          className="deck-nav deck-nav--next"
          aria-label={`Next ${title} slide`}
          onClick={() => flip(1)}
        >
          <Chevron dir={1} />
        </button>
      </div>

      {/* On <body> so the scaled frame's transform cannot capture its fixed
          positioning — same reason the scrap tooltips park there. */}
      {typeof document !== "undefined" &&
        createPortal(
          <span className="deck-tooltip" aria-hidden="true" ref={tipRef}>
            {cta}
            <TipArrow />
          </span>,
          document.body
        )}
    </li>
  );
}

function Decks() {
  const rowRef = useRef<HTMLUListElement>(null);

  /* Reveal on scroll, the shelf's mechanism: the observer only adds a class
     and CSS owns the (opacity-only) motion. The trigger line sits much lower
     than the shelf's -34%, though — the row's top edge is the LABELS, with
     the windows well below, so the shelf's line left a long stretch of empty
     section on screen before anything faded in. But -12% overshot: it fired
     while the WINDOWS were still under the fold, the fade finished off
     screen, and they arrived already opaque — no visible entrance at all.
     -22% is the line where the windows' top edge has just cleared the fold
     as the fade begins, so the same staggered fade the notebooks make is
     actually seen. (Top-edge + rootMargin rather than a ratio threshold for
     the shelf's reason: a ratio is unsatisfiable once the stacked phone
     layout grows taller than the screen.) */
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    if (typeof IntersectionObserver === "undefined") {
      row.classList.add("is-in");
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0, rootMargin: "0px 0px -22% 0px" }
    );
    observer.observe(row);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="decks" aria-label="Speculative concept decks">
      <ul className="decks-row" ref={rowRef}>
        {decks.map((deck, i) => (
          <DeckWindow key={deck.id} deck={deck} index={i} />
        ))}
      </ul>
    </section>
  );
}

export default Decks;
