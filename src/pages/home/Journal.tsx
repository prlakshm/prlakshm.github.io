import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { animate } from "motion";
import { SPRING_HEAVY, joinShelf } from "./interactions.js";
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

/** One `[label](href)` inside a note. Deliberately the whole of the "markdown"
 *  supported here — a note is a handwritten scrap, not a document. */
const NOTE_LINK = /\[([^\]]+)\]\(([^)]+)\)/;

/** Note copy with its one optional link turned into a real anchor.
 *  tabIndex -1 on purpose: the spill layer is aria-hidden (it is decoration
 *  that appears and vanishes on a pointer), and a focusable node inside an
 *  aria-hidden subtree is a trap for a screen reader — reachable by Tab,
 *  unannounced when it lands. The link is a pointer affordance only. */
function renderNote(note: string) {
  const m = note.match(NOTE_LINK);
  if (!m) return note;
  const [full, label, href] = m;
  const at = m.index ?? 0;
  return (
    <>
      {note.slice(0, at)}
      <a
        className="jr-spill-link"
        href={href}
        target="_blank"
        rel="noreferrer"
        tabIndex={-1}
      >
        {label}
      </a>
      {note.slice(at + full.length)}
    </>
  );
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
    hit,
    open,
    trimClosed,
    trimOpen,
    alt,
    href,
    cta,
    width,
    offsetY,
    rotate,
    openTilt,
    openLift,
    spill,
  } = journal;

  const rootRef = useRef<HTMLLIElement>(null);
  const spillRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(false);
  /** Bumped on every open/close so a settle timer from an earlier toggle can
   *  recognise that it has been superseded and do nothing. */
  const settleRef = useRef(0);
  /** Does the pointer want this notebook open right now? Re-read when a handoff
   *  elapses — by then the pointer may have swept on to another notebook, or
   *  off the shelf entirely. */
  const wantsRef = useRef(false);
  /** Serialises open/close across the whole shelf, so two notebooks are never
   *  animating at once. See joinShelf in interactions.ts. */
  const shelfRef = useRef(joinShelf(id));

  /* The open covers are half the shelf's image weight and none of it is needed
     until someone hovers, so they stay out of the document until the browser
     is idle. Holding them back is what lets the CLOSED covers — the ones that
     are actually on screen — have the connection to themselves and finish
     sooner. `loading="lazy"` cannot do this: these sit in the viewport, so it
     fetches them immediately.

     Hover also flips it, for the case where someone reaches the shelf before
     idle fires. That path is a fallback, not the norm: idle lands within a
     frame or two of first paint, long before a pointer arrives. */
  const [openReady, setOpenReady] = useState(false);
  useEffect(() => {
    if (openReady) return;
    type WithIdle = { requestIdleCallback?: (cb: () => void) => number };
    const idle = (window as unknown as WithIdle).requestIdleCallback;
    const arm = () => {
      /* The torn sheets are background-images, and the spill layer is
         display:none until a hover — so nothing in a display:none subtree is
         ever fetched, and adding .is-ready alone would leave them to start
         downloading at the exact moment they need to be on screen. Warm them
         here instead, so idle pays for them and the first hover finds them in
         cache. Only the sheets this journal actually uses. */
      new Set(
        spill.filter((s) => !s.src).map((s) => s.sheet ?? 1),
      ).forEach((n) => {
        new Image().src = `/home/journals/notes/torn-${n}.webp`;
      });
      setOpenReady(true);
    };
    if (idle) {
      const handle = idle.call(window, arm);
      return () => (window as unknown as {
        cancelIdleCallback?: (h: number) => void;
      }).cancelIdleCallback?.(handle);
    }
    /* Safari has no requestIdleCallback. A timeout after first paint is the
       same bargain: the closed covers are already in flight by then. */
    const t = window.setTimeout(arm, 1200);
    return () => window.clearTimeout(t);
  }, [openReady, spill]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const layer = spillRef.current;
    if (!root || !layer) return;

    const target = root.querySelector<HTMLElement>(".jr-link");
    if (!target) return;

    const shelf = shelfRef.current;

    const openImg = root.querySelector<HTMLElement>(".jr-img--open");
    const closedImg = root.querySelector<HTMLElement>(".jr-img--closed");
    const scrim = layer.querySelector<HTMLElement>(".jr-spill-scrim");
    const tooltip = layer.querySelector<HTMLElement>(".jr-tooltip");
    const cards = Array.from(
      layer.querySelectorAll<HTMLElement>(".jr-spill-item")
    );
    /* Scraps carrying a link. The spill normally lives and dies with the
       pointer being on the BOOK, which would make a link in a note that lands
       at the middle of the screen unreachable — the overlay closes on the way
       there. These cards therefore also hold it open (see releaseSoon). */
    const linkedCards = cards.filter((c) =>
      c.classList.contains("jr-spill-item--linked")
    );

    /* A notebook with no case study to open. It is the only one that may spill
       on a tap: the other two are links, so a tap navigates and their overlay
       would flash and vanish behind the new page. */
    const inert = !href;

    /* Capability, not width. A tablet, a foldable, or a phone in landscape is
       wider than the phone breakpoint and still cannot hover.
       Checked live so a resize or a device change is picked up. */
    const canHover = () =>
      window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const narrow = () => window.matchMedia("(max-width: 767px)").matches;

    /* May the spill open at all right now? CSS hides the layer for a coarse
       pointer or a narrow window — except on the inert notebook, which stays
       available everywhere because tapping it costs nothing. */
    const spillAllowed = () => inert || (canHover() && !narrow());

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
       and on resize, since every number is derived from the live viewport.

       clientWidth/clientHeight, NOT innerWidth/innerHeight. A fixed element
       resolves against the initial containing block, which excludes the
       scrollbar — innerWidth includes it. Centring on innerWidth/2 puts the
       whole spread half a scrollbar off to one side, every card shifted by the
       same amount in the same direction. */
    const measure = () => {
      const vw = document.documentElement.clientWidth;
      const vh = document.documentElement.clientHeight;
      const base = spillBase(vw, vh);

      /* THREE passes, not one loop. Sizing a card and then reading its height
         in the same iteration is write-read-write, and every read after a write
         forces a synchronous layout — four cards meant four reflows, landing on
         exactly the frame the spill starts. Batched, the first read costs one
         layout and the rest are free. */
      const widths: number[] = [];
      const heights: number[] = [];

      cards.forEach((card, i) => {
        const item = spill[i];
        if (!item) return;
        let w = item.cw * base;
        if (!item.src) {
          /* A note has to stay readable. These widths are fractions tuned on a
             desktop, and on a phone the base collapses far enough that the
             fraction leaves a scrap barely wider than one word. Floor it. */
          w = Math.max(w, Math.min(vw * 0.74, 320));
        }
        widths[i] = w;
        card.style.width = `${w}px`;
        // Notes hug their copy, so they have to be let go before being read.
        if (!item.src) card.style.height = "auto";
      });

      // ── reads ──
      cards.forEach((card, i) => {
        const item = spill[i];
        if (!item) return;
        const w = widths[i];
        let h: number;
        if (item.src) {
          /* The aspect ratio belongs to the PICTURE, not to the card, and the
             card is border-box with a photo mount around it. Sizing the card to
             `ar` leaves the image area a slightly different shape from the
             source, and object-fit: cover then crops the difference off — which
             is how a border deliberately added to a shot ends up shaved. Take
             the mount out first, apply the ratio, put it back. */
          const cs = getComputedStyle(card);
          const padX =
            parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
          const padY =
            parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
          h = (w - padX) / (item.ar ?? 1) + padY;
        } else {
          /* Notes hug their copy. Sizing the sheet to the text is what stops a
             short note from being a big empty rectangle — the torn background
             stretches to whatever height the words need, and the padding is
             then the only margin around them. */
          h = card.offsetHeight;
        }
        heights[i] = h;
      });

      // ── writes ──
      cards.forEach((card, i) => {
        const item = spill[i];
        if (!item) return;
        const w = widths[i];
        const h = heights[i];
        if (item.src) card.style.height = `${h}px`;

        const landX = vw / 2 + item.cx * vw;
        const landY = vh / 2 + item.cy * vh;
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
      if (!spillAllowed() || isOpenRef.current === visible) return;
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
            y: visible ? openLift ?? -7 : 0,
            /* Composes with the journal's resting rotation — the net lean is
               their sum, which is why a journal resting clockwise needs a
               stronger negative here to read as tilting left at all. */
            rotate: visible ? openTilt ?? -1.5 : 0,
          },
          reduced ? { duration: 0 } : SPRING_HEAVY
        );
      }
      /* The closed cover has to leave, or it sits at full opacity behind the
         open one for the whole interaction — the two carry different footer
         trims, so it shows around the edges rather than hiding underneath.

         NO DELAY on the way back in, and this is the whole reason the notebook
         used to vanish. The closed cover used to wait 120ms for the open one to
         clear, but the open one rides a spring that is most of the way to zero
         inside 100ms — so for a moment BOTH covers were transparent and the
         notebook was simply not there. Interrupt that window with a re-entry
         and it could stay that way. They cross-fade over each other now, so
         their opacities always sum to about one. */
      if (closedImg) {
        animate(
          closedImg,
          { opacity: visible ? 0 : 1 },
          reduced
            ? { duration: 0 }
            : visible
              ? { duration: 0.2, ease: [0.4, 0, 1, 1] }
              : { duration: 0.3, ease: [0, 0, 0.2, 1] }
        );
      }

      /* Belt to that brace. Motion animations get cancelled mid-flight every
         time the pointer crosses the edge twice in quick succession, and a
         cancelled fade leaves the element wherever it happened to be. This
         forces the canonical resting state once the transition has had time to
         land — and the generation check means a stale timer from an older
         toggle can never stomp a newer one. */
      const settleAt = ++settleRef.current;
      window.setTimeout(
        () => {
          if (settleRef.current !== settleAt || isOpenRef.current !== visible)
            return;
          if (closedImg) closedImg.style.opacity = visible ? "0" : "1";
          if (openImg) openImg.style.opacity = visible ? "1" : "0";
        },
        reduced ? 30 : 520
      );

      if (scrim) {
        /* Blur off before the fade starts, back on only once it has landed.
           See .jr-spill-scrim.is-blurred — a backdrop-filter re-blurs the whole
           viewport on every frame its element's alpha moves. */
        if (!visible) scrim.classList.remove("is-blurred");
        /* No delay on the way out. The scrim used to wait 240ms for the cards
           to get clear, and since it is the largest thing on screen that read
           as the whole overlay ignoring the cursor for a quarter of a second.
           It starts lifting immediately now and holds its darkness through a
           slow-start curve instead, which protects the in-flight paper the same
           way without the dead beat. */
        animate(
          scrim,
          { opacity: visible ? 1 : 0 },
          reduced
            ? { duration: 0 }
            : visible
              ? { duration: 0.46, ease: [0.22, 0.61, 0.36, 1] }
              : { duration: 0.56, ease: [0.65, 0, 0.6, 1] }
        );
        if (visible) {
          /* Reuses the settle generation so a fade that got interrupted by the
             pointer leaving can never switch the blur on afterwards. */
          const blurAt = settleAt;
          window.setTimeout(
            () => {
              if (settleRef.current !== blurAt || !isOpenRef.current) return;
              scrim.classList.add("is-blurred");
            },
            reduced ? 0 : 480
          );
        }
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
          /* TWO keyframes per property, never three. A cubic-bezier ease is
             applied to each SEGMENT of a keyframe list independently, so a
             three-stop path eases in and out twice — the card decelerates at
             the midpoint and sets off again, which is the two-step motion this
             used to have. One segment, one ease, one throw.
             Deliberately unhurried at nearly a second, with a stagger, so the
             spill reads as paper being laid out rather than a layout snapping
             into place. Opacity gets its own much shorter timing: on the full
             curve the card spends half its flight semi-transparent. */
          animate(
            card,
            {
              opacity: [0, 1],
              x: [ox, 0],
              y: [oy, 0],
              rotate: [0, item.rotate],
              scale: [0.16, 1],
            },
            {
              duration: 0.88,
              ease: [0.17, 0.72, 0.24, 1],
              delay: 0.08 + i * 0.09,
              opacity: {
                duration: 0.3,
                ease: [0.4, 0, 0.4, 1],
                delay: 0.08 + i * 0.09,
              },
            }
          );
        } else {
          /* Single target values, so Motion runs one segment from wherever the
             card currently is — one curve, no stagger, no delay, and it starts
             on the same frame the pointer left. */
          animate(
            card,
            { opacity: 0, x: ox, y: oy, rotate: 0, scale: 0.16 },
            { duration: 0.54, ease: [0.4, 0, 0.2, 1] }
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

    /* Is the pointer over the BOOK, as opposed to the column the book sits in?
       The hover target has to be the whole journal for the click area to make
       sense, but each cover PNG carries a different amount of transparent
       margin — Mixr's book sits left in its frame with the fanned pages on the
       right, leaving 47px of dead column on one side and 101px on the other.
       Hovering was therefore released a long way past the notebook, and by a
       different distance on each side of each book. `hit` is the cover's alpha
       box, so this is the real silhouette. */
    const GRACE = 6; // a hair of slack so the edge is not twitchy
    const overBook = (x: number, y: number) => {
      if (!closedImg) return true;
      const r = closedImg.getBoundingClientRect();
      return (
        x >= r.left + hit.x0 * r.width - GRACE &&
        x <= r.left + hit.x1 * r.width + GRACE &&
        y >= r.top + hit.y0 * r.height - GRACE &&
        y <= r.top + hit.y1 * r.height + GRACE
      );
    };

    /* Runs only while the pointer is somewhere in this journal's column, so it
       is not a global mousemove tax. It both opens and closes: entering the
       column is not enough, and leaving the book has to release even though
       pointerleave will not fire for another half a notebook's width. */
    /* Is the pointer on a scrap that carries a link? Only meaningful while the
       spill is open — the cards keep their landing spots when closed. */
    const overLink = (x: number, y: number) =>
      isOpenRef.current &&
      linkedCards.some((card) => {
        const r = card.getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      });

    /* How long the spill survives the pointer being on neither the book nor a
       linked scrap. Nothing but a corridor: the cursor has to cross dead desk
       to get from the notebook out to a scrap at the middle of the screen, and
       without this the overlay closes somewhere in that gap and the link can
       never be clicked. Journals with no linked scrap release instantly, as
       before. */
    const LINK_GRACE = 500;
    let graceTimer = 0;
    const clearGrace = () => {
      if (!graceTimer) return;
      window.clearTimeout(graceTimer);
      graceTimer = 0;
    };
    const closeNow = () => {
      clearGrace();
      wantsRef.current = false;
      shelf.want(false, () => false, setOpen);
    };
    const releaseSoon = () => {
      if (!linkedCards.length || !isOpenRef.current) return closeNow();
      if (graceTimer) return; // already counting down
      graceTimer = window.setTimeout(() => {
        graceTimer = 0;
        closeNow();
      }, LINK_GRACE);
    };

    let tracking = false;
    const track = (e: PointerEvent) => {
      const on = overBook(e.clientX, e.clientY);
      if (on) placeTooltip(e.clientX, e.clientY);
      if (on || overLink(e.clientX, e.clientY)) {
        clearGrace();
        wantsRef.current = true;
        shelf.want(true, () => wantsRef.current, setOpen);
        return;
      }
      releaseSoon();
    };
    const enter = (e: PointerEvent) => {
      // Touch fires pointerenter on tap too. That path is handled by onTap
      // below, which toggles rather than tracking a cursor that is not there.
      if (!canHover()) return;
      // Fallback for a pointer that beats the idle callback. Cheap after the
      // first call — React bails out of a set to the value already held.
      setOpenReady(true);
      if (!tracking) {
        tracking = true;
        window.addEventListener("pointermove", track, { passive: true });
      }
      track(e);
    };
    const leave = () => {
      if (!canHover()) return;
      /* With a linked scrap on screen the column is no longer the boundary:
         the pointer is allowed to carry on out to the scrap, so tracking stays
         armed and `track` above is what eventually releases. */
      if (linkedCards.length && isOpenRef.current) {
        releaseSoon();
        return;
      }
      if (tracking) {
        tracking = false;
        window.removeEventListener("pointermove", track);
      }
      closeNow();
    };
    /* The pointer left the window altogether — no more pointermove will arrive
       to end the grace above, so end it here. Hover only: on touch this fires
       the instant a finger lifts, which would shut the tapped spill. */
    const leaveWindow = () => {
      if (!canHover()) return;
      closeNow();
    };

    /* Touch, inert notebook only: tap toggles the spill, and a tap anywhere
       else puts it away.
       Deliberately NOT built on pointerenter/pointerleave. A touch pointer
       "leaves" the instant the finger lifts, so the hover path would open the
       overlay on touchdown and close it on touchup — a flash. A tap is a
       discrete event and wants discrete handling. */
    const onTap = (e: Event) => {
      if (canHover() || !inert) return;
      e.preventDefault();
      setOpenReady(true);
      const next = !isOpenRef.current;
      if (next) {
        const rect = target.getBoundingClientRect();
        placeTooltip(rect.left + rect.width * 0.5, rect.top + 24);
      }
      wantsRef.current = next;
      // A tap has already happened, so the intent cannot go stale — the gate
      // only has to wait for whatever is open to get out of the way.
      shelf.want(next, () => true, setOpen);
    };
    const onTapOutside = (e: PointerEvent) => {
      if (canHover() || !isOpenRef.current) return;
      if (target.contains(e.target as Node)) return; // onTap owns that case
      wantsRef.current = false;
      shelf.want(false, () => false, setOpen);
    };
    const onFocus = () => {
      setOpenReady(true);
      // No cursor on keyboard focus — anchor near the top centre of the link.
      const rect = target.getBoundingClientRect();
      placeTooltip(rect.left + rect.width * 0.5, rect.top + 24);
      wantsRef.current = true;
      // Focus, not the cursor, is the thing that can move on during a handoff.
      shelf.want(true, () => target.contains(document.activeElement), setOpen);
    };
    /* A resize mid-spill invalidates every number measure() produced. Because
       left/top now carry the landing spot, re-measuring is enough — the cards
       are sitting at transform 0 and simply follow their new spots. */
    const onResize = () => {
      if (!isOpenRef.current) return;
      if (!spillAllowed()) {
        wantsRef.current = false;
        shelf.want(false, () => false, setOpen);
        return;
      }
      measure();
    };

    /* pointerenter/leave still bound to the column, not the book: they are what
       start and stop the tracking above. Leaving the column is a hard release
       on a journal with no linked scrap — and the document-level pointerleave
       covers the pointer leaving the window, which never produces a
       pointermove. */
    target.addEventListener("pointerenter", enter);
    target.addEventListener("pointerleave", leave);
    target.addEventListener("focusin", onFocus);
    // Keyboard focus has no cursor to travel to a scrap, so this one is a hard
    // release even where the pointer would get a corridor.
    target.addEventListener("focusout", closeNow);
    target.addEventListener("click", onTap);
    // Capture, so a tap on anything else closes before that thing handles it.
    document.addEventListener("pointerdown", onTapOutside, true);
    document.addEventListener("pointerleave", leaveWindow);
    window.addEventListener("resize", onResize);

    return () => {
      target.removeEventListener("pointerenter", enter);
      target.removeEventListener("pointerleave", leave);
      target.removeEventListener("focusin", onFocus);
      target.removeEventListener("focusout", closeNow);
      target.removeEventListener("click", onTap);
      document.removeEventListener("pointerdown", onTapOutside, true);
      document.removeEventListener("pointerleave", leaveWindow);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", track);
      clearGrace();
      shelf.release();
    };
  }, [spill, hit, href, id]);

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
          fetchPriority="high"
          style={{ translate: `0 ${trimClosed}` }}
        />
        <img
          className="jr-img jr-img--open"
          src={openReady ? open : undefined}
          alt=""
          aria-hidden="true"
          decoding="async"
          fetchPriority="low"
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
    /* The cover's alpha box, so CSS can lay the shelf out by the BOOKS rather
       than by their picture frames — see the negative margins on .jr. */
    "--hx0": hit.x0,
    "--hx1": hit.x1,
  } as React.CSSProperties;

  /* Decorative in full: every word in here is either already in the link's
     accessible name or is a caption for a picture of a prototype. Marking the
     whole layer hidden keeps a screen reader from walking a pile of images and
     pull quotes that appear and vanish on a pointer it does not have. */
  const spillLayer = (
    <div
      className={`jr-spill${openReady ? " is-ready" : ""}`}
      data-journal={id}
      /* Marks the layer that survives on a touch device: with no case study to
         navigate to, a tap can open it without stealing anything. */
      data-inert={href ? undefined : "true"}
      aria-hidden="true"
      ref={spillRef}
    >
      <div className="jr-spill-scrim" />
      {spill.map((item, i) => (
        <div
          key={i}
          className={`jr-spill-item ${
            item.src ? "jr-spill-item--shot" : "jr-spill-item--note"
          }${
            // The one card in the layer that takes the pointer, so the CSS can
            // hand it back its clicks while everything else stays transparent.
            !item.src && item.note && NOTE_LINK.test(item.note)
              ? " jr-spill-item--linked"
              : ""
          }`}
          data-sheet={item.sheet ?? 1}
        >
          {item.src ? (
            /* NOT lazy. These cards have no size or position until the first
               hover runs measure(), so a lazy image sits at 0x0 off the top of
               the document and the loader never fires — the first hover would
               spill empty frames. Held back to idle instead, on the same gate
               as the open covers, then fetched at low priority. Nothing here
               is on screen until a hover, and a hover cannot arrive before the
               idle callback in any realistic session. */
            <img
              src={openReady ? item.src : undefined}
              alt=""
              decoding="async"
              fetchPriority="low"
            />
          ) : (
            <span className="jr-spill-note">
              {renderNote(item.note ?? "")}
            </span>
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
