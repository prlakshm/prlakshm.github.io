import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { animate, inView, scroll, stagger, steps } from "motion";
import "../../styles/tokens.css";
import "./home.css";
import "../about/about.css";
import Journal from "./Journal.js";
import ContactIcons from "./ContactIcons.js";
import Manifesto from "../about/Manifesto.js";
import { attachUnderlineWipe, prefersReducedMotion, PIN_MS, PIN_SLOP } from "./interactions.js";
import { journals } from "./journals.js";

// Matches the link the global Header already uses. public/docs also holds
const RESUME_URL = "/docs/Pranavi_Ram_Resume_2026.pdf";

// public/about/"Profile picture.png" — space encoded for the URL.
const PORTRAIT = "/about/Profile%20picture.webp";

/* Fabric scraps, in the order and relative proportions of the reference
   photograph of the real textiles laid out side by side.

   `h`  — height relative to the tallest piece (the curtains), read off that
          photograph. Height is what carries the relationship between the
          pieces, so it drives the sizing.
   `ar` — the textile's own width/height, measured from the alpha bounds of the
          trimmed asset. Width is derived from it so no photograph is stretched.

   The assets were trimmed to their alpha bounds first: the kurti carried 51%
   transparent side padding, which is why it used to need a 179% "optical
   scale" hack to look right. With the padding gone the numbers below are the
   real thing and no per-textile fudge factors are needed. */
const scraps = [
  {
    id: "s1",
    label: "my grad dress",
    src: "/home/scraps/pink%20floral%20fabric/grad-dress.webp?v=2",
    color: "#D8B98A",
    rotate: -7,
    h: 0.83,
    ar: 0.555,
  },
  {
    id: "s3",
    label: "my fav kurti from india",
    src: "/home/scraps/red%20kurta/kurti.webp?v=3",
    mesh: true,
    color: "#B3542E",
    rotate: -3,
    h: 0.945,
    ar: 0.385,
  },
  {
    id: "s5",
    label: "purple top my mom stitched 4 me",
    src: "/home/scraps/purple%20top/purple-top.webp?v=2",
    color: "#6E4E8C",
    rotate: -5,
    h: 0.911,
    ar: 0.441,
  },
  {
    id: "s4",
    label: "my sister's fav dress from high school",
    src: "/home/scraps/green%20plaid%20fabric/sister-dress.webp?v=2",
    color: "#31556B",
    rotate: 6,
    h: 0.909,
    ar: 0.531,
  },
  {
    id: "s2",
    label: "curtains from my childhood bedroom",
    src: "/home/scraps/golden%20fabric/curtains.webp?v=2",
    color: "#C9A24B",
    rotate: 4,
    h: 1,
    ar: 0.308,
  },
];

/* Sum of (aspect x height) across the archive. Used to turn each textile's
   proportions into a share of the row, so the whole set scales to fit without
   overlapping while holding the reference's relative sizing. */
const SHARE_TOTAL = scraps.reduce((sum, s) => sum + s.ar * s.h, 0);

/* Same sum across only the first three textiles — the top row of the 3 + 2
   layout. Deriving both rows from this single basis is what keeps every strip
   on one height scale when the archive wraps. */
const TOP_ROW_TOTAL = scraps
  .slice(0, 3)
  .reduce((sum, s) => sum + s.ar * s.h, 0);

/* Patch-pocket sew-on, in the PNG's 716×690 space:
   1. outer running stitch (hand-wobbled) ending on the top-edge corners,
   2. inner double-needle line ~3.5px toward the denim,
   3. bar-tack clusters at the mouth corners. */
const POCKET_SEAM =
  "M 8.0,8.0 L -1.1,14.9 L -10.3,21.9 L -7.7,37.7 L -5.4,53.4 L -2.1,68.9 L 0.4,8" +
  "4.3 L 2.0,99.7 L 4.3,114.9 L 6.8,130.1 L 9.4,145.2 L 12.6,160.3 L 15.5,175.3 L" +
  " 15.3,190.9 L 19.0,205.9 L 19.5,221.3 L 23.3,236.4 L 24.1,251.8 L 25.6,267.2 L" +
  " 28.5,282.5 L 29.9,298.0 L 30.4,313.6 L 33.7,329.0 L 33.5,344.7 L 35.5,360.3 L" +
  " 38.5,375.7 L 37.5,391.5 L 41.0,406.7 L 42.3,422.2 L 44.4,437.6 L 45.4,453.3 L" +
  " 48.2,468.9 L 50.1,484.5 L 51.8,500.2 L 56.1,514.3 L 65.6,526.6 L 75.4,538.6 L" +
  " 83.7,551.7 L 93.2,563.9 L 107.5,571.7 L 122.0,579.0 L 137.1,585.2 L 150.3,595" +
  ".0 L 165.5,600.6 L 179.0,609.7 L 193.8,616.1 L 207.9,624.1 L 222.4,631.1 L 237" +
  ".9,636.3 L 251.4,645.3 L 266.3,651.7 L 280.3,659.1 L 294.2,667.0 L 308.6,673.7" +
  " L 322.2,681.8 L 332.3,686.8 L 343.0,690.4 L 352.9,695.7 L 367.8,694.9 L 381.6" +
  ",688.1 L 396.6,684.0 L 409.6,674.3 L 424.0,667.1 L 437.6,658.6 L 452.4,652.1 L" +
  " 466.1,643.9 L 480.1,636.3 L 495.0,630.5 L 509.0,622.9 L 522.0,613.5 L 536.7,6" +
  "07.2 L 550.1,598.5 L 564.2,591.1 L 578.7,583.9 L 592.4,575.3 L 607.1,568.8 L 6" +
  "20.7,560.0 L 631.0,548.5 L 642.1,537.7 L 651.0,524.8 L 662.4,514.2 L 667.6,499" +
  ".6 L 669.5,483.9 L 671.6,468.2 L 672.6,452.3 L 674.8,437.0 L 678.6,422.0 L 678" +
  ".3,406.4 L 680.8,391.2 L 683.2,376.0 L 684.6,360.7 L 686.5,345.4 L 689.4,330.2" +
  " L 688.6,314.5 L 692.4,299.2 L 693.2,283.6 L 693.5,267.9 L 696.9,252.6 L 697.6" +
  ",237.2 L 697.1,221.6 L 699.5,206.3 L 700.2,190.9 L 703.1,175.6 L 704.7,160.2 L" +
  " 705.0,144.7 L 708.3,129.6 L 708.4,114.3 L 710.9,99.2 L 713.1,84.0 L 714.4,68." +
  "3 L 718.5,53.0 L 722.1,37.4 L 726.3,21.9 L 717.0,15.0 L 708.0,8.0";

const POCKET_SEAM_INNER =
  "M 8.5,11.2 L 1.0,17.7 L -7.0,22.8 L -4.2,37.1 L -2.0,52.7 L 1.4,68.2 L 3.9,83." +
  "9 L 5.5,99.2 L 7.7,114.3 L 10.2,129.5 L 12.8,144.6 L 16.0,159.6 L 19.0,175.0 L" +
  " 18.8,190.5 L 22.5,205.4 L 23.0,220.8 L 26.8,235.9 L 27.6,251.5 L 29.1,266.7 L" +
  " 32.0,282.0 L 33.3,297.8 L 33.9,313.2 L 37.2,328.6 L 37.0,344.5 L 38.9,359.7 L" +
  " 42.0,375.5 L 41.0,391.2 L 44.5,406.2 L 45.8,421.9 L 47.9,437.3 L 48.9,452.9 L" +
  " 51.6,468.3 L 53.5,484.1 L 55.2,499.6 L 59.2,512.7 L 68.3,524.4 L 78.2,536.5 L" +
  " 86.5,549.7 L 95.4,561.2 L 109.1,568.6 L 123.4,575.8 L 138.8,582.2 L 152.0,591" +
  ".9 L 167.1,597.5 L 180.7,606.6 L 195.4,612.9 L 209.5,621.0 L 223.7,627.8 L 239" +
  ".4,633.1 L 253.1,642.2 L 267.8,648.5 L 282.0,656.1 L 295.8,663.9 L 310.2,670.6" +
  " L 323.9,678.8 L 333.6,683.5 L 344.4,687.2 L 353.5,692.3 L 366.9,691.5 L 380.4" +
  ",684.8 L 395.0,680.9 L 407.8,671.3 L 422.3,664.1 L 436.0,655.5 L 450.8,649.0 L" +
  " 464.3,640.9 L 478.6,633.1 L 493.5,627.4 L 507.1,620.0 L 520.3,610.5 L 535.1,6" +
  "04.1 L 548.4,595.5 L 562.6,588.0 L 577.0,580.9 L 590.7,572.2 L 605.5,565.7 L 6" +
  "18.4,557.3 L 628.4,546.1 L 639.5,535.4 L 648.3,522.5 L 659.5,512.3 L 664.2,498" +
  ".8 L 666.0,483.5 L 668.2,467.9 L 669.1,452.0 L 671.3,436.3 L 675.1,421.6 L 674" +
  ".9,406.2 L 677.4,390.7 L 679.7,375.6 L 681.1,360.3 L 683.0,344.8 L 685.9,330.0" +
  " L 685.1,314.2 L 689.0,298.7 L 689.7,283.4 L 690.0,267.5 L 693.5,252.2 L 694.1" +
  ",237.2 L 693.6,221.4 L 696.0,206.0 L 696.7,190.5 L 699.6,175.1 L 701.2,160.0 L" +
  " 701.5,144.3 L 704.8,129.2 L 704.9,114.0 L 707.5,98.6 L 709.6,83.7 L 710.9,67." +
  "7 L 715.2,52.1 L 718.7,36.6 L 722.8,22.7 L 714.9,17.8 L 707.5,11.2";

const POCKET_BARTACK =
  "M -6.7,5.6 L 6.0,-0.4 M -5.9,4.6 L 8.7,0.6 M -3.5,3.8 L 9.8,1.4 M -1.9,3.8 L 1" +
  "1.7,1.4 M 0.5,5.5 L 12.8,-0.3 M 1.3,5.5 L 15.5,-0.3 M 3.2,5.8 L 17.1,-0.6 M 72" +
  "3.2,4.2 L 709.5,1.1 M 721.6,5.5 L 707.6,-0.3 M 718.9,5.8 L 706.8,-0.5 M 717.2," +
  "5.8 L 705.0,-0.6 M 716.0,4.1 L 702.7,1.1 M 714.9,4.7 L 700.3,0.5 M 713.3,4.4 L" +
  " 698.4,0.8";

/* Faint radial creases in the parchment just outside the sew line. */
const POCKET_PUCKER =
  "M -2.1,84.6 Q -11.0,84.2 -20.9,87.5 M 13.0,175.5 Q 7.7,174.8 -0.4,175.6 M 26.0" +
  ",282.8 Q 18.9,284.9 7.1,283.8 M 36.0,375.9 Q 31.0,377.2 22.6,377.6 M 45.7,469." +
  "3 Q 39.0,469.4 31.6,470.6 M 91.6,565.8 Q 87.6,568.6 81.8,573.8 M 177.8,611.9 Q" +
  " 174.4,619.3 167.9,629.2 M 265.2,654.0 Q 264.2,658.7 258.3,664.7 M 352.5,698.2" +
  " Q 349.8,704.5 350.7,719.4 M 438.8,660.8 Q 441.8,665.9 446.0,671.4 M 523.2,615" +
  ".7 Q 526.2,621.9 531.6,634.4 M 622.3,561.9 Q 624.4,566.8 631.6,572.3 M 672.0,4" +
  "84.2 Q 675.8,485.0 684.3,486.7 M 683.3,391.6 Q 686.5,393.2 697.7,392.9 M 695.7" +
  ",283.7 Q 701.9,284.3 714.4,285.4 M 702.7,191.2 Q 709.0,192.4 720.3,192.8 M 713" +
  ".4,99.6 Q 717.4,98.9 727.5,101.0";

function ExternalArrow() {
  return (
    <svg className="ext-arrow" viewBox="0 0 10 10" aria-hidden="true" focusable="false">
      <path
        d="M2.5 7.5 L7.5 2.5 M3.6 2.5 H7.5 V6.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="square"
      />
    </svg>
  );
}

function Home() {
  const { pathname } = useLocation();
  const archiveRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pocketRef = useRef<HTMLDivElement>(null);
  const shelfRef = useRef<HTMLUListElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const aboutRef = useRef<HTMLElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  /* Lets measure() rebuild the fabric timelines with fresh offsets, and lets a
     rebuild re-seat itself at the current scroll position without jumping. */
  const rebuildRef = useRef<(() => void) | null>(null);
  const progressRef = useRef(0);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
  };

  /* Deep links (#/about, #/projects) land on this page and scroll to the
     matching section once it is in the tree. */
  useEffect(() => {
    if (pathname === "/about") scrollToSection("about");
    if (pathname === "/projects") scrollToSection("work");
  }, [pathname]);

  /* Hero entrance. Hidden before paint (useLayoutEffect), then revealed once
     when the hero is in view. A mount-only animate() was easy to interrupt
     (Strict Mode stop(), route remount while scrolled down) and never retried,
     so scrolling back up could find the hero stuck at opacity 0. inView fires
     once; after that we keep the resting styles and never re-hide. */
  const heroEnteredRef = useRef(false);
  useLayoutEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    const title = hero.querySelector<HTMLElement>(".hero-title");
    const lines = Array.from(hero.querySelectorAll<HTMLElement>(".line"));
    const tiles = hero.querySelector<HTMLElement>(".tiles--hero");
    const targets = [title, ...lines, tiles].filter(
      (el): el is HTMLElement => el !== null
    );
    if (targets.length === 0) return;

    const applyVisible = () => {
      targets.forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
    };

    if (heroEnteredRef.current) {
      applyVisible();
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      heroEnteredRef.current = true;
      applyVisible();
      return;
    }

    targets.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(9px)";
    });

    let controls: ReturnType<typeof animate> | undefined;
    const stopInView = inView(
      hero,
      () => {
        controls = animate(
          targets,
          { opacity: 1, y: 0 },
          { duration: 0.7, delay: stagger(0.06), ease: [0.22, 0.61, 0.36, 1] }
        );
        const commit = () => {
          heroEnteredRef.current = true;
          applyVisible();
        };
        controls.finished.then(commit).catch(commit);
      },
      { margin: "0px 0px -8% 0px" }
    );

    return () => {
      stopInView();
      // complete() jumps to the end instead of stop()'s mid-hide freeze, so a
      // Strict Mode remount never inherits a half-hidden hero.
      if (controls) {
        controls.complete();
        heroEnteredRef.current = true;
        applyVisible();
      }
    };
  }, []);

  /* Underline wipes (nav links + the @handle) and the pronunciation tooltip.
     Every rule element is paired with the link that triggers it. */
  useEffect(() => {
    const cleanups: Array<() => void> = [];

    document
      .querySelectorAll<HTMLElement>(
        ".wt-nav-links a, .wt-nav-links button, .line a"
      )
      .forEach((link) => {
        const rule = link.querySelector<HTMLElement>(".nav-rule, .line-rule");
        if (rule) cleanups.push(attachUnderlineWipe(link, rule));
      });

    // The RESUME arrow nudges along its own diagonal on hover.
    const resume = document.querySelector<HTMLElement>(
      ".wt-nav-links a[target='_blank']"
    );
    const arrow = resume?.querySelector<HTMLElement>(".ext-arrow");
    if (resume && arrow) {
      const reduced = prefersReducedMotion();
      const nudge = (on: boolean) =>
        animate(
          arrow,
          { x: on ? 1.5 : 0, y: on ? -1.5 : 0 },
          reduced ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 24 }
        );
      const on = () => nudge(true);
      const off = () => nudge(false);
      resume.addEventListener("pointerenter", on);
      resume.addEventListener("pointerleave", off);
      resume.addEventListener("focusin", on);
      resume.addEventListener("focusout", off);
      cleanups.push(() => {
        resume.removeEventListener("pointerenter", on);
        resume.removeEventListener("pointerleave", off);
        resume.removeEventListener("focusin", on);
        resume.removeEventListener("focusout", off);
      });
    }

    // Pronunciation note: follows the cursor, opacity only (no y/scale — those
    // would fight left/top placement).
    const title = heroRef.current?.querySelector<HTMLElement>(".hero-title");
    const pron = title?.querySelector<HTMLElement>(".hero-pron");
    if (title && pron) {
      const reduced = prefersReducedMotion();
      let byTouch = false;
      let pinned = false;
      let pinTimer = 0;
      let pinX = 0;
      let pinY = 0;
      let pinByTouch = false;
      let pronW = 0;
      let pronH = 0;

      /* Absolute inside .hero-title, so the clamp is worked out in viewport
         space and then converted back — the note has to stay on screen, not
         merely inside the heading. */
      const place = (clientX: number, clientY: number) => {
        const rect = title.getBoundingClientRect();
        const pad = 8;
        let vx = clientX + 14;
        // Above the finger on touch: +18 puts it under the thumb that tapped.
        let vy = byTouch ? clientY - pronH - 16 : clientY + 18;
        vx = Math.min(Math.max(pad, vx), window.innerWidth - pronW - pad);
        vy = Math.min(Math.max(pad, vy), window.innerHeight - pronH - pad);
        pron.style.left = `${vx - rect.left}px`;
        pron.style.top = `${vy - rect.top}px`;
      };
      const show = (on: boolean) => {
        title.classList.toggle("is-pron", on);
        return animate(
          pron,
          { opacity: on ? 1 : 0 },
          reduced ? { duration: 0 } : { type: "spring", stiffness: 460, damping: 24 }
        );
      };
      const measure = () => {
        pronW = pron.offsetWidth;
        pronH = pron.offsetHeight;
      };
      const unpin = () => {
        if (pinTimer) {
          window.clearTimeout(pinTimer);
          pinTimer = 0;
        }
        if (!pinned) return;
        pinned = false;
        show(false);
      };

      const enter = (e: PointerEvent) => {
        byTouch = e.pointerType === "touch";
        measure();
        place(e.clientX, e.clientY);
        show(true);
      };
      const move = (e: PointerEvent) => {
        if (pinned) return; // a pinned note stays where it was put
        byTouch = e.pointerType === "touch";
        place(e.clientX, e.clientY);
        if (!title.classList.contains("is-pron")) show(true);
      };
      const leave = () => {
        if (pinned) return;
        show(false);
      };
      const down = (e: PointerEvent) => {
        byTouch = e.pointerType === "touch";
      };
      /* Tap to raise it, exactly as the fabric strips do — on a phone there is
         no hover, so without this the note is unreachable. */
      const click = (e: MouseEvent) => {
        if (pinned) {
          unpin();
          return;
        }
        measure();
        place(e.clientX, e.clientY);
        show(true);
        pinned = true;
        pinX = e.clientX;
        pinY = e.clientY;
        pinByTouch = byTouch;
        pinTimer = window.setTimeout(unpin, PIN_MS);
      };
      /* A pin made by a finger ends on the timer alone: browsers emit a
         compatibility mouse move after a tap, and reacting to it would dismiss
         the note before it could be read. */
      const drift = (e: PointerEvent) => {
        if (!pinned || pinByTouch || e.pointerType === "touch") return;
        const dx = e.clientX - pinX;
        const dy = e.clientY - pinY;
        if (dx * dx + dy * dy < PIN_SLOP * PIN_SLOP) return;
        unpin();
      };

      title.addEventListener("pointerdown", down);
      title.addEventListener("pointerenter", enter);
      title.addEventListener("pointermove", move);
      title.addEventListener("pointerleave", leave);
      title.addEventListener("click", click);
      document.addEventListener("pointermove", drift, { passive: true });
      cleanups.push(() => {
        title.removeEventListener("pointerdown", down);
        title.removeEventListener("pointerenter", enter);
        title.removeEventListener("pointermove", move);
        title.removeEventListener("pointerleave", leave);
        title.removeEventListener("click", click);
        document.removeEventListener("pointermove", drift);
        if (pinTimer) window.clearTimeout(pinTimer);
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  /* Fabric scrap tooltips — follow the cursor, same chip as journal tips. */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const cleanups: Array<() => void> = [];
    const reduced = prefersReducedMotion();

    /* Which scrap is pinned open by a click, if any. Hover alone is not enough
       on a touch screen — there is no hover to give — and on a mouse a click
       that behaved exactly like a hover would not be worth having. So a click
       pins the label until it is dismissed, and a pinned label ignores the
       pointer leaving. Shared across every scrap so pinning one releases the
       last, and only one label is ever up. */
    let pinned: HTMLElement | null = null;
    let pinTimer = 0;
    let pinX = 0;
    let pinY = 0;
    /* Whether the pin came from a finger. Touch pins are ended by the timer
       ALONE: after a tap, browsers emit a compatibility mouse move, which
       arrives as a pointermove with pointerType "mouse" — guarding on the
       event's type instead of the pin's would dismiss the label on a phone
       before it had been read. */
    let pinByTouch = false;

    const unpin = () => {
      if (pinTimer) {
        window.clearTimeout(pinTimer);
        pinTimer = 0;
      }
      if (!pinned) return;
      pinned.dispatchEvent(new CustomEvent("scrap:hide"));
      pinned = null;
    };

    /* Moving the cursor at all releases the pin. Touch is excluded — there is
       no cursor to move, so on a phone the timer is what ends it. */
    const onDrift = (e: PointerEvent) => {
      if (!pinned || pinByTouch || e.pointerType === "touch") return;
      const dx = e.clientX - pinX;
      const dy = e.clientY - pinY;
      if (dx * dx + dy * dy < PIN_SLOP * PIN_SLOP) return;
      unpin();
    };
    document.addEventListener("pointermove", onDrift, { passive: true });
    cleanups.push(() => document.removeEventListener("pointermove", onDrift));

    stage.querySelectorAll<HTMLElement>(".scrap").forEach((scrap) => {
      const tip = scrap.querySelector<HTMLElement>(".scrap-tooltip");
      if (!tip) return;

      /* Motion (and the cutting-mat parallax) put `transform` on ancestors,
         which makes `position: fixed` resolve to that box — not the viewport.
         Park the tip on `document.body` while visible so +14 / +18 matches
         the hero-title chip distance. */
      /* Measured when the label is raised, not on every move — place() runs on
         each pointermove, and reading offsetWidth there is a layout per frame. */
      let tipW = 0;
      let tipH = 0;
      const measureTip = () => {
        tipW = tip.offsetWidth;
        tipH = tip.offsetHeight;
      };

      /* Set from the pointer that actually raised the label, not from a media
         query. A touchscreen laptop answers `(hover: hover)` yes and would then
         place a tapped label under the finger. */
      let byTouch = false;

      const place = (clientX: number, clientY: number) => {
        /* Below-right of the cursor on a mouse. Above it on touch, because
           +18px puts the label directly under the finger that just tapped it. */
        const coarse = byTouch || !window.matchMedia("(hover: hover)").matches;
        const pad = 8;
        let x = clientX + 14;
        let y = coarse ? clientY - tipH - 16 : clientY + 18;
        // A strip at either end of the row would otherwise push its label off
        // the side, which is most of them on a phone.
        x = Math.min(Math.max(pad, x), window.innerWidth - tipW - pad);
        y = Math.min(Math.max(pad, y), window.innerHeight - tipH - pad);
        tip.style.left = `${x}px`;
        tip.style.top = `${y}px`;
      };
      const show = (on: boolean) => {
        /* State on the strip as well as the animation. The opacity lives on a
           tip that has been reparented to <body>, which leaves nothing on the
           scrap itself to hang a style off — and a pinned strip wants to look
           pinned. */
        scrap.classList.toggle("is-tip", on);
        return animate(
          tip,
          { opacity: on ? 1 : 0 },
          reduced ? { duration: 0 } : { type: "spring", stiffness: 460, damping: 24 }
        );
      };

      const enter = (e: PointerEvent) => {
        byTouch = e.pointerType === "touch";
        if (tip.parentElement !== document.body) document.body.appendChild(tip);
        measureTip();
        place(e.clientX, e.clientY);
        show(true);
      };
      const move = (e: PointerEvent) => {
        if (pinned === scrap) return; // a pinned label stays where it was put
        byTouch = e.pointerType === "touch";
        place(e.clientX, e.clientY);
        /* Hover takes back over after a pin is released. Without this, drifting
           the cursor while still on the strip would kill the label and leave a
           dead patch until you moved off and came back. */
        if (!scrap.classList.contains("is-tip")) show(true);
      };
      const leave = () => {
        if (pinned === scrap) return;
        show(false);
      };

      // Lets `unpin` close a scrap it does not hold a closure over.
      const hide = () => show(false);

      const click = (e: MouseEvent) => {
        if (pinned === scrap) {
          unpin();
          return;
        }
        unpin(); // release whichever one was up
        if (tip.parentElement !== document.body) document.body.appendChild(tip);
        measureTip();
        place(e.clientX, e.clientY);
        show(true);
        pinned = scrap;
        pinX = e.clientX;
        pinY = e.clientY;
        pinByTouch = byTouch;
        pinTimer = window.setTimeout(unpin, PIN_MS);
      };

      const down = (e: PointerEvent) => {
        byTouch = e.pointerType === "touch";
      };

      scrap.addEventListener("pointerdown", down);
      scrap.addEventListener("pointerenter", enter);
      scrap.addEventListener("pointermove", move);
      scrap.addEventListener("pointerleave", leave);
      scrap.addEventListener("click", click);
      scrap.addEventListener("scrap:hide", hide);
      cleanups.push(() => {
        scrap.removeEventListener("pointerdown", down);
        scrap.removeEventListener("pointerenter", enter);
        scrap.removeEventListener("pointermove", move);
        scrap.removeEventListener("pointerleave", leave);
        scrap.removeEventListener("click", click);
        scrap.removeEventListener("scrap:hide", hide);
        if (tip.parentElement !== scrap) scrap.appendChild(tip);
      });
    });

    /* A click anywhere else puts the pinned label away. Capture, so it lands
       before whatever was clicked gets to handle it. */
    const onOutside = (e: PointerEvent) => {
      if (!pinned) return;
      if (pinned.contains(e.target as Node)) return; // the scrap's own click owns that
      unpin();
    };
    document.addEventListener("pointerdown", onOutside, true);
    cleanups.push(() =>
      document.removeEventListener("pointerdown", onOutside, true)
    );

    return () => cleanups.forEach((fn) => fn());
  }, []);

  /* Cutting-mat parallax. The fixed grid drifts slightly slower than the page,
     so the mat reads as a surface the content sits on rather than wallpaper
     locked to the viewport. .wt-surface is inset past the viewport edges in CSS
     precisely so this translation has bleed to move into. */
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    return scroll(animate(surface, { y: [0, -48] }, { ease: "linear" }));
  }, []);

  /* Each scrap lives in its final position in the row, then is pushed back into
     the pocket by a per-element transform. Measuring gives us that offset.
     offsetLeft/offsetTop are layout positions, so they are unaffected by the
     transforms already sitting on these elements — no need to reset anything.
     The measurements are stashed on the element so the Motion timeline below
     can read them without measuring again. */
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const pocket = pocketRef.current;
    if (!stage || !pocket) return;

    /* Guards the one layout-affecting write below so it cannot feed back into
       the ResizeObserver that triggered it. --pocket-h drives the row's
       margin-bottom, so rewriting it unconditionally inside an RO callback
       could re-fire the observer forever; skipping the no-op write makes the
       loop converge on the first pass. */
    let lastPocketH = -1;

    const measure = () => {
      // Scrap height is a multiple of the denim's — publish it before reading
      // offsets so layout (and thus dx/dy) sees the settled sizes.
      const h = Math.round(pocket.offsetHeight);
      if (h !== lastPocketH) {
        lastPocketH = h;
        stage.style.setProperty("--pocket-h", `${h}px`);
      }

      // Sit them high in the pocket so their tops clear the denim lip and the
      // fabric is visibly stuffed in there before the scroll pulls it out.
      const px = pocket.offsetLeft + pocket.offsetWidth * 0.5;
      const py = pocket.offsetTop + pocket.offsetHeight * 0.16;
      stage.querySelectorAll<HTMLElement>(".scrap").forEach((el) => {
        const cx = el.offsetLeft + el.offsetWidth * 0.5;
        const cy = el.offsetTop + el.offsetHeight * 0.5;
        const dx = Math.round(px - cx);
        const dy = Math.round(py - cy);
        el.style.setProperty("--dx", `${dx}px`);
        el.style.setProperty("--dy", `${dy}px`);
        el.dataset.dx = String(dx);
        el.dataset.dy = String(dy);
      });
      stage.classList.add("is-measured");

      /* Hand the fresh offsets to the scroll timelines. Without this the
         animation keeps the dx/dy it was built with and aims at the pocket's
         old position after any resize or layout-tier change. */
      rebuildRef.current?.();
    };

    // Measure synchronously: useLayoutEffect runs before paint, so this is both
    // flash-free and reliable. Deferring the first measure to rAF would break in
    // a background tab, where rAF is throttled indefinitely and the scraps would
    // never receive their offsets.
    measure();

    /* Re-measure SYNCHRONOUSLY, not on a rAF.

       This used to defer to requestAnimationFrame to coalesce bursts, which
       meant any environment that throttles rAF — a background tab, a heavily
       loaded frame — skipped the re-measure entirely and left the fabric
       aiming at the pocket's previous position. Layout is already up to date
       inside a ResizeObserver callback, and the write above is guarded, so
       measuring here is both safe and reliable.

       A rAF pass still follows the window resize event, because some browsers
       fire `resize` before the new layout has settled. */
    let frame = 0;
    const measureNow = () => measure();
    const measureSoon = () => {
      measure();
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    const observer = new ResizeObserver(measureNow);
    observer.observe(stage);
    observer.observe(pocket);
    const row = stage.querySelector(".scrap-row");
    if (row) observer.observe(row);
    window.addEventListener("resize", measureSoon);

    /* The denim is an <img>: until it decodes, its box comes from the width and
       height attributes. Re-measure on load so the target is the real pocket. */
    const img = pocket.querySelector("img");
    if (img && !img.complete) img.addEventListener("load", measureNow);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", measureSoon);
      img?.removeEventListener("load", measureNow);
    };
  }, []);

  /* Reveal on scroll. The observer only toggles a class; all motion lives in
     CSS so prefers-reduced-motion is handled in one place. */
  useEffect(() => {
    const shelf = shelfRef.current;
    const archive = archiveRef.current;
    // The fabric timeline below is anchored to the pocket, not the section.
    const pocket = pocketRef.current;

    if (typeof IntersectionObserver === "undefined") {
      shelf?.classList.add("is-in");
      archive?.classList.add("is-in");
      return;
    }

    /* The shelf reveals once and stays.
       Triggered on the shelf's top edge crossing a line two thirds down the
       viewport — NOT on a fraction of the shelf being visible. A ratio
       threshold is unsatisfiable whenever the element is taller than the
       viewport, and on a phone the row stacks into a ~1700px column: at
       390x640 the most of it that can ever be on screen at once is 35.0%
       against a 0.35 threshold, so the observer never fired and all three
       notebooks stayed at opacity 0. The rootMargin below reproduces the old
       desktop trigger point, where the shelf is shorter than the viewport and
       the ratio was never the binding constraint. */
    const shelfObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          shelfObserver.unobserve(entry.target);
        });
      },
      { threshold: 0, rootMargin: "0px 0px -34% 0px" }
    );
    if (shelf) shelfObserver.observe(shelf);

    /* The fabric, scrubbed by scroll position rather than triggered on entry.
       Scrolling down deals the scraps out of the pocket into the row; scrolling
       back up runs the identical choreography backwards, frame for frame,
       because progress is bound to scroll rather than to a clock.
       `steps` easing is what gives it the stop-motion read. */
    const stage = stageRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const els = stage
      ? Array.from(stage.querySelectorAll<HTMLElement>(".scrap"))
      : [];

    const DURATION = 1; // seconds of timeline per scrap
    const STAGGER = 0.12; // offset between neighbours
    const span = DURATION + STAGGER * Math.max(0, els.length - 1);

    let timelines: Array<ReturnType<typeof animate>> = [];

    /* Built from whatever dx/dy the last measure() wrote, and REBUILT whenever
       a new measurement lands.

       This is the fix for scraps flying to empty space: the keyframes below
       bake dx/dy in as numbers, and this effect only runs once. So a resize or
       a switch between the one-row and 3+2 layouts moved the pocket while the
       animation kept aiming at the pocket's original spot. Rebuilding on every
       re-measure keeps the target rooted to where the denim actually is. */
    const build = () => {
      timelines.forEach((t) => t.stop());
      timelines = els.map((el, i) => {
        const dx = Number(el.dataset.dx ?? 0);
        const dy = Number(el.dataset.dy ?? 0);
        const settled = Number(
          getComputedStyle(el).getPropertyValue("--sr").replace("deg", "")
        );
        // Fanned inside the pocket mouth, so five scraps read as a handful.
        const fanX = dx + (i - 2) * 17;
        const fanR = (i - 2) * 5;

        /* Travel is expressed as fractions of dx/dy, so the arc always resolves
           onto the pocket no matter how far away it currently is — the path
           scales to the real distance instead of a remembered one. */
        const controls = animate(
          el,
          {
            x: [fanX, dx * 0.86, dx * 0.5, dx * 0.22, dx * 0.06, 0],
            y: [dy, dy - 46, dy * 0.42 - 30, dy * 0.12 + 14, -9, 0],
            rotate: [fanR, -13, 16, -11, 6, settled],
            scale: [0.84, 0.96, 1.07, 0.97, 1.02, 1],
          },
          // "start", not the default "end": with "end" the easing holds the
          // previous step and never lands the final frame, which on a *scrubbed*
          // timeline becomes the permanent resting state — the scraps settle
          // several px and a couple of degrees off. Invisible on a timed
          // animation, obvious here.
          { duration: DURATION, ease: steps(7, "start") }
        );
        controls.pause();
        return controls;
      });
      // Re-seat at the current scroll position so a rebuild never visibly jumps.
      apply(progressRef.current);
    };

    const apply = (progress: number) => {
      if (reduced) {
        timelines.forEach((t) => {
          t.time = DURATION;
        });
        return;
      }
      timelines.forEach((t, i) => {
        const local = progress * span - i * STAGGER;
        t.time = Math.min(DURATION, Math.max(0, local));
      });
    };

    build();
    // measure() calls this after each re-measure (see the layout effect above).
    rebuildRef.current = build;

    let stopScroll: (() => void) | undefined;

    if (reduced) {
      // Arrive laid out, with no travel.
      apply(1);
    } else if (pocket && timelines.length > 0) {
      // One scroll subscription driving all five timelines, not five listeners.
      stopScroll = scroll(
        (progress: number) => {
          progressRef.current = progress;
          apply(progress);
        },
        /* Anchored to the POCKET, not the section. The section's top sits well
           above the pocket, so the old range ran the whole dance before the
           pocket had entered the viewport — you arrived to fabric already laid
           out. Tracking the pocket instead means the deal-out plays while the
           thing it comes out of is on screen.

           The timeline is scrubbed, so this one range governs both directions:
           scrolling back up re-tucks over exactly the same travel. The 0.5
           spread between the two stops is kept from the previous setup. */
        { target: pocket, offset: ["start 0.9", "start 0.4"] }
      );
    }

    return () => {
      shelfObserver.disconnect();
      stopScroll?.();
      rebuildRef.current = null;
      timelines.forEach((t) => t.stop());
    };
  }, []);

  /* Manifesto: one soft settle after the fabric act — no stagger, no scrub. */
  const aboutEnteredRef = useRef(false);
  useLayoutEffect(() => {
    const about = aboutRef.current;
    if (!about) return;

    /* The manifesto and the portrait arrive as separate parts rather than as
       one block — .ab-grid animating whole was the odd one out on the page.
       Two beats: the title lands on its own, then the body copy and the
       portrait together 0.3s later, each moving for 0.7s like the hero.

       The body is the exception. It is a tall block of handwriting, and fading
       it at one opacity made the last rows arrive with the first, so its words
       are split into three chunks in reading order and faded top to bottom.
       Opacity only — .mf-line--body .mf-word-wrap carries a translateY and a
       skewX that position each word, and animating transform here would
       replace both. */
    const targets = [
      about.querySelector<HTMLElement>(".mf-line--title"),
      about.querySelector<HTMLElement>(".mf-line--body"),
      about.querySelector<HTMLElement>(".ab-portrait"),
    ].filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    /* Three chunks of body words, in reading order, so the split runs down the
       block rather than across it. */
    const bodyWords = Array.from(
      about.querySelectorAll<HTMLElement>(".mf-line--body .mf-word-wrap")
    );
    const CHUNKS = 3;
    const per = Math.ceil(bodyWords.length / CHUNKS) || 1;
    const chunks = Array.from({ length: CHUNKS }, (_, i) =>
      bodyWords.slice(i * per, (i + 1) * per)
    ).filter((c) => c.length > 0);

    const applyVisible = () => {
      targets.forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
      bodyWords.forEach((el) => (el.style.opacity = "1"));
    };

    if (aboutEnteredRef.current) {
      applyVisible();
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      aboutEnteredRef.current = true;
      applyVisible();
      return;
    }

    targets.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(9px)";
    });
    bodyWords.forEach((el) => (el.style.opacity = "0"));

    let controls: ReturnType<typeof animate> | undefined;
    const stopInView = inView(
      about,
      () => {
        controls = animate(
          targets,
          { opacity: 1, y: 0 },
          {
            duration: 0.7,
            // title first; body and portrait share the second beat
            delay: (i: number) => [0, 0.3, 0.3][i] ?? 0,
            ease: [0.22, 0.61, 0.36, 1],
          }
        );
        /* Chunks ride the body's own 0.3s beat and then step down it at 0.15s.
           The step compounds, so the last chunk gains twice whatever the step
           loses. Their parent line still lifts as one; this only controls when
           each third appears. */
        chunks.forEach((chunk, i) =>
          animate(
            chunk,
            { opacity: 1 },
            { duration: 0.55, delay: 0.3 + i * 0.15, ease: [0.22, 0.61, 0.36, 1] }
          )
        );
        const commit = () => {
          aboutEnteredRef.current = true;
          applyVisible();
        };
        controls.finished.then(commit).catch(commit);
      },
      { margin: "0px 0px -12% 0px", amount: 0.2 }
    );

    return () => {
      stopInView();
      if (controls) {
        controls.complete();
        aboutEnteredRef.current = true;
        applyVisible();
      }
    };
  }, []);

  return (
    <div className="wt">
      <div className="wt-surface" aria-hidden="true" ref={surfaceRef} />

      <header className="wt-nav">
        <div className="wt-nav-inner">
          <a className="wt-wordmark" href="#/">
            PRANAVI RAM
          </a>
          <nav aria-label="Primary">
            <ul className="wt-nav-links">
              {/* Buttons, not <a href="#…">. This is a HashRouter, so the hash
                  is the route: an in-page anchor would navigate away. */}
              <li>
                <button type="button" onClick={() => scrollToSection("work")}>
                  WORK
                  <span className="nav-rule" aria-hidden="true" />
                </button>
              </li>
              <li>
                <button type="button" onClick={() => scrollToSection("about")}>
                  ABOUT
                  <span className="nav-rule" aria-hidden="true" />
                </button>
              </li>
              <li>
                <a href={RESUME_URL} target="_blank" rel="noreferrer">
                  RESUME
                  <ExternalArrow />
                  <span className="nav-rule" aria-hidden="true" />
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero" ref={heroRef}>
          {/* hero-block width is driven only by the title; intro uses
              width:0;min-width:100% so it shares those left/right edges
              without expanding the block past the title. */}
          <div className="hero-block">
            <h1 className="hero-title">
              hi, i&rsquo;m pranavi ram
              <span className="hero-pron" aria-hidden="true">
                pronounced <em>pren-uh-vi ram</em> (like palm)
              </span>
            </h1>

            <div className="hero-intro">
              <div className="hero-col hero-col--copy">
                <p className="line">
                Design Engineer inventing 0 → 1 experiences
                </p>
                <p className="line">
                  Building apps + sharing the process on X{" "}
                  <a href="https://x.com/pranavibuilds" target="_blank" rel="noreferrer">
                    @pranavibuilds
                    <span className="line-rule" aria-hidden="true" />
                  </a>
                </p>
              </div>

              <div className="hero-col hero-col--prev">
                <p className="line line--label">Prev:</p>
                <p className="line">Product Design @ hbo max</p>
              </div>

              {/* Desktop: under copy. Stacked: below all text (copy → PREV → tiles). */}
              <ContactIcons className="tiles--hero" />
            </div>
          </div>
        </section>

        <section className="shelf" id="work" aria-label="Selected work">
          <ul className="shelf-row" ref={shelfRef}>
            {journals.map((journal, i) => (
              <Journal key={journal.id} journal={journal} index={i} />
            ))}
          </ul>
        </section>

        <section
          className="archive"
          ref={archiveRef}
          aria-label="Fabric scraps I keep"
        >
          <div className="archive-stage" ref={stageRef}>
            <div className="pocket-wrap" ref={pocketRef}>
              {/* Paper compressed under the sew + grid killed locally so the
                  denim sits in the mat instead of floating over it. */}
              <div className="pocket-mat" aria-hidden="true" />

              {/* Pucker / gather creases in the parchment outside the seam. */}
              <svg
                className="pocket-pucker"
                viewBox="0 0 716 690"
                aria-hidden="true"
                focusable="false"
              >
                <path d={POCKET_PUCKER} />
              </svg>

              <img
                className="pocket"
                src="/home/denim-pocket.webp"
                alt="A denim pocket holding folded fabric scraps."
                width={716}
                height={690}
                decoding="async"
              />

              {/* Shared paper grain over the denim (masked to its alpha). */}
              <div className="pocket-grain" aria-hidden="true" />

              {/* Sew-on stitching + edge shade + thread highlight.
                  Open across the top — sewing that shut would close the pocket. */}
              <svg
                className="pocket-stitch"
                viewBox="0 0 716 690"
                aria-hidden="true"
                focusable="false"
              >
                <defs>
                  <mask
                    id="pocket-denim-mask"
                    maskUnits="userSpaceOnUse"
                    x="0"
                    y="0"
                    width="716"
                    height="690"
                  >
                    <image
                      href="/home/denim-pocket.webp"
                      width="716"
                      height="690"
                      preserveAspectRatio="xMidYMid meet"
                    />
                  </mask>
                </defs>

                {/* Inner shade along sewn sides only (masked to denim). */}
                <g mask="url(#pocket-denim-mask)">
                  <path className="pocket-edge-shade" d={POCKET_SEAM_INNER} />
                </g>

                <path className="pocket-stitch-holes" d={POCKET_SEAM} />
                <path className="pocket-stitch-thread" d={POCKET_SEAM} />
                <path className="pocket-stitch-highlight" d={POCKET_SEAM} />
                <path className="pocket-stitch-holes pocket-stitch-holes--inner" d={POCKET_SEAM_INNER} />
                <path className="pocket-stitch-thread pocket-stitch-thread--inner" d={POCKET_SEAM_INNER} />
                <path className="pocket-stitch-highlight pocket-stitch-highlight--inner" d={POCKET_SEAM_INNER} />
                <path className="pocket-stitch-holes pocket-stitch-holes--tack" d={POCKET_BARTACK} />
                <path className="pocket-stitch-thread pocket-stitch-thread--tack" d={POCKET_BARTACK} />
                <path className="pocket-stitch-highlight pocket-stitch-highlight--tack" d={POCKET_BARTACK} />
              </svg>
            </div>

            <ul className="scrap-row">
              {scraps.map((s, i) => (
                <li
                  key={s.id}
                  className={`scrap${s.src ? " scrap--photo" : ""}${
                    s.mesh ? " scrap--mesh" : ""
                  }`}
                  aria-label={s.label}
                  style={
                    {
                      background: s.src ? undefined : s.color,
                      "--sr": `${s.rotate}deg`,
                      "--si": i,
                      "--ar": s.ar,
                      /* Height relative to the tallest textile, from the
                         reference photo. Drives the stacked layout. */
                      "--sh": s.h,
                      /* Share of the row this textile occupies. Derived so it
                         cannot drift from h/ar: width = share x available, and
                         height = width / ar = available x h / SHARE_TOTAL, so
                         the heights stay in the reference's proportions at any
                         container width. The five shares sum to 1. */
                      "--wf": (s.ar * s.h) / SHARE_TOTAL,
                      /* Same idea for the two-row (3 + 2) layout, but measured
                         against the TOP row's total. Both rows use this one
                         basis, so all five keep a single height scale — the
                         second row simply comes out narrower and centres,
                         nesting between the three above it. */
                      "--wf3": (s.ar * s.h) / TOP_ROW_TOTAL,
                    } as React.CSSProperties
                  }
                >
                  {s.src && (
                    <img
                      className="scrap-img"
                      src={s.src}
                      alt=""
                      draggable={false}
                      decoding="async"
                    />
                  )}
                  <span className="scrap-tooltip" aria-hidden="true">
                    {s.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          className="ab"
          id="about"
          ref={aboutRef}
          aria-labelledby="ab-title"
        >
          <div className="ab-grid">
            <div className="ab-text">
              <Manifesto />
            </div>

            <figure className="ab-portrait">
              <img
                src={PORTRAIT}
                alt="Pranavi Ram, smiling, on the Brown University campus green."
                decoding="async"
              />
            </figure>
          </div>
        </section>
      </main>

      <footer className="wt-foot">
        <div className="wt-foot-inner">
          <p className="foot-name">
            <span className="foot-copy" aria-hidden="true">
              &copy;
            </span>{" "}
            2026 PRANAVI RAM
          </p>
          <ContactIcons className="tiles--foot" />
        </div>
      </footer>
    </div>
  );
}

export default Home;
