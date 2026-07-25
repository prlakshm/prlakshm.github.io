import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { animate, scroll, stagger, steps } from "motion";
import "../../styles/tokens.css";
import "./home.css";
import "../about/about.css";
import Journal from "./Journal.js";
import ContactIcons from "./ContactIcons.js";
import { attachUnderlineWipe, prefersReducedMotion } from "./interactions.js";
import { journals } from "./journals.js";

// Matches the link the global Header already uses. public/docs also holds
// Resume_2026.pdf and "New Grad 2026 Resume.pdf" — switch here if this is stale.
const RESUME_URL = "/docs/Pranavi_Lakshminarayanan_AI_Product_Resume.pdf";

// public/about/"Profile picture.png" — space encoded for the URL.
const PORTRAIT = "/about/Profile%20picture.png";

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
    src: "/home/scraps/pink%20floral%20fabric/grad-dress.png?v=2",
    color: "#D8B98A",
    rotate: -7,
    h: 0.83,
    ar: 0.555,
  },
  {
    id: "s3",
    label: "my fav kurti from india",
    src: "/home/scraps/red%20kurta/kurti.png?v=3",
    mesh: true,
    color: "#B3542E",
    rotate: -3,
    h: 0.945,
    ar: 0.385,
  },
  {
    id: "s5",
    label: "purple top my mom stitched 4 me",
    src: "/home/scraps/purple%20top/purple-top.png?v=2",
    color: "#6E4E8C",
    rotate: -5,
    h: 0.911,
    ar: 0.441,
  },
  {
    id: "s4",
    label: "my sister's fav dress from high school",
    src: "/home/scraps/green%20plaid%20fabric/sister-dress.png?v=2",
    color: "#31556B",
    rotate: 5,
    plaid: true,
    h: 0.909,
    ar: 0.531,
  },
  {
    id: "s2",
    label: "curtains from my childhood bedroom",
    src: "/home/scraps/golden%20fabric/curtains.png?v=2",
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

/* The seam the denim is sewn along, in the pocket PNG's own 716x690 space.
   Runs outside the silhouette and terminates on the top-edge corners (where
   the bar tacks sit) — open at the mouth, like a real patch pocket. */
const POCKET_SEAM =
  "M 8,8 L -10,22 L 0.1,79.2 L 9.1,140.1 L 18.1,200.8 L 26.1,261.9 " +
  "L 32.1,323.9 L 38.1,386.2 L 45.1,448.0 L 52.2,510.8 L 93.2,563.9 " +
  "L 150.7,594.2 L 208.2,623.4 L 266.2,651.9 L 322.6,681.1 L 358,698 " +
  "L 396.0,682.8 L 452.4,652.1 L 508.5,622.0 L 564.3,591.2 L 620.9,560.3 " +
  "L 665.4,510.0 L 673.9,447.2 L 681.9,386.2 L 688.9,325.0 L 695.0,262.8 " +
  "L 699.9,201.2 L 705.9,139.6 L 712.9,78.9 L 726,22 L 708,8";

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
  const surfaceRef = useRef<HTMLDivElement>(null);

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

  /* Hero entrance. The title, each line and the contact tiles rise and fade on
     a tight stagger. Runs in useLayoutEffect so the hidden starting state is
     committed before first paint — a plain useEffect runs after paint and the
     hero would flash in fully formed before dropping to opacity 0. */
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

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    targets.forEach((el) => {
      el.style.opacity = "0";
      if (!reduced) el.style.transform = "translateY(9px)";
    });

    const controls = animate(
      targets,
      { opacity: 1, y: 0 },
      reduced
        ? { duration: 0 }
        : { duration: 0.7, delay: stagger(0.06), ease: [0.22, 0.61, 0.36, 1] }
    );

    return () => controls.stop();
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
      const place = (clientX: number, clientY: number) => {
        const rect = title.getBoundingClientRect();
        pron.style.left = `${clientX - rect.left + 14}px`;
        pron.style.top = `${clientY - rect.top + 18}px`;
      };
      const show = (on: boolean) =>
        animate(
          pron,
          { opacity: on ? 1 : 0 },
          reduced ? { duration: 0 } : { type: "spring", stiffness: 460, damping: 24 }
        );
      const enter = (e: PointerEvent) => {
        place(e.clientX, e.clientY);
        show(true);
      };
      const move = (e: PointerEvent) => place(e.clientX, e.clientY);
      const leave = () => show(false);
      title.addEventListener("pointerenter", enter);
      title.addEventListener("pointermove", move);
      title.addEventListener("pointerleave", leave);
      cleanups.push(() => {
        title.removeEventListener("pointerenter", enter);
        title.removeEventListener("pointermove", move);
        title.removeEventListener("pointerleave", leave);
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

    stage.querySelectorAll<HTMLElement>(".scrap").forEach((scrap) => {
      const tip = scrap.querySelector<HTMLElement>(".scrap-tooltip");
      if (!tip) return;

      /* Motion (and the cutting-mat parallax) put `transform` on ancestors,
         which makes `position: fixed` resolve to that box — not the viewport.
         Park the tip on `document.body` while visible so +14 / +18 matches
         the hero-title chip distance. */
      const place = (clientX: number, clientY: number) => {
        tip.style.left = `${clientX + 14}px`;
        tip.style.top = `${clientY + 18}px`;
      };
      const show = (on: boolean) =>
        animate(
          tip,
          { opacity: on ? 1 : 0 },
          reduced ? { duration: 0 } : { type: "spring", stiffness: 460, damping: 24 }
        );

      const enter = (e: PointerEvent) => {
        if (tip.parentElement !== document.body) document.body.appendChild(tip);
        place(e.clientX, e.clientY);
        show(true);
      };
      const move = (e: PointerEvent) => place(e.clientX, e.clientY);
      const leave = () => show(false);

      scrap.addEventListener("pointerenter", enter);
      scrap.addEventListener("pointermove", move);
      scrap.addEventListener("pointerleave", leave);
      cleanups.push(() => {
        scrap.removeEventListener("pointerenter", enter);
        scrap.removeEventListener("pointermove", move);
        scrap.removeEventListener("pointerleave", leave);
        if (tip.parentElement !== scrap) scrap.appendChild(tip);
      });
    });

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

    const measure = () => {
      // Scrap height is 130% of the denim — publish it before reading offsets
      // so layout (and thus dx/dy) sees the settled sizes.
      stage.style.setProperty(
        "--pocket-h",
        `${Math.round(pocket.offsetHeight)}px`
      );

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
    };

    // Measure synchronously: useLayoutEffect runs before paint, so this is both
    // flash-free and reliable. Deferring the first measure to rAF would break in
    // a background tab, where rAF is throttled indefinitely and the scraps would
    // never receive their offsets.
    measure();

    // Re-measure on resize, via rAF to coalesce bursts. A ResizeObserver on the
    // stage alone can miss viewport changes that reflow the row without
    // changing the stage's own box.
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    const observer = new ResizeObserver(schedule);
    observer.observe(stage);
    observer.observe(pocket);
    const row = stage.querySelector(".scrap-row");
    if (row) observer.observe(row);
    window.addEventListener("resize", schedule);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
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

    // The shelf reveals once and stays.
    const shelfObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          shelfObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
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

    const timelines = els.map((el, i) => {
      const dx = Number(el.dataset.dx ?? 0);
      const dy = Number(el.dataset.dy ?? 0);
      const settled = Number(
        getComputedStyle(el).getPropertyValue("--sr").replace("deg", "")
      );
      // Fanned inside the pocket mouth, so five scraps read as a handful.
      const fanX = dx + (i - 2) * 17;
      const fanR = (i - 2) * 5;

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

    let stopScroll: (() => void) | undefined;

    if (reduced) {
      // Arrive laid out, with no travel.
      timelines.forEach((t) => {
        t.time = DURATION;
      });
    } else if (pocket && timelines.length > 0) {
      // One scroll subscription driving all five timelines, not five listeners.
      stopScroll = scroll(
        (progress: number) => {
          timelines.forEach((t, i) => {
            const local = progress * span - i * STAGGER;
            t.time = Math.min(DURATION, Math.max(0, local));
          });
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
      timelines.forEach((t) => t.stop());
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
                  Design engineer building in public on X{" "}
                  <a href="https://x.com/pranavibuilds" target="_blank" rel="noreferrer">
                    @pranavibuilds
                    <span className="line-rule" aria-hidden="true" />
                  </a>
                </p>
                <p className="line">CS + Literary Arts @ Brown University</p>
              </div>

              <div className="hero-col hero-col--prev">
                <p className="line line--label">PREV:</p>
                <p className="line">Product Design @ HBO Max</p>
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
              <img
                className="pocket"
                src="/home/denim-pocket.png"
                alt="A denim pocket holding folded fabric scraps."
                width={716}
                height={690}
                decoding="async"
              />
              {/* Running stitch attaching the denim to the page. Path hugs the
                  outside of the silhouette and lands on the top-edge corners
                  (bar-tack points). Open across the mouth — sewing that shut
                  would close the pocket. viewBox matches the image. */}
              <svg
                className="pocket-stitch"
                viewBox="0 0 716 690"
                aria-hidden="true"
                focusable="false"
              >
                <path className="pocket-stitch-holes" d={POCKET_SEAM} />
                <path className="pocket-stitch-thread" d={POCKET_SEAM} />
              </svg>
            </div>

            <ul className="scrap-row">
              {scraps.map((s, i) => (
                <li
                  key={s.id}
                  className={`scrap${s.src ? " scrap--photo" : ""}${
                    s.mesh ? " scrap--mesh" : ""
                  }${s.plaid ? " scrap--plaid" : ""}`}
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

        <section className="ab" id="about" aria-labelledby="ab-title">
          <div className="ab-grid">
            <div className="ab-text">
              <h2 className="ab-title" id="ab-title">
                Design Manifesto
              </h2>
              <div className="ab-body">
                <p>
                  I studied Computer Science and Literary Arts at Brown &mdash; which
                  sounds like two degrees and is really one habit: take a thing
                  apart, learn how it holds together, and put it back with the
                  seams showing.
                </p>
                <p>
                  Every project starts as a sentence before it starts as a screen.
                  If I can&rsquo;t say what a thing is for in one line, the
                  interface is usually covering for a decision I haven&rsquo;t made
                  yet.
                </p>
                <p>
                  I build in public because finishing in private taught me nothing.
                  I&rsquo;d rather show the drafts, the dead ends, the version that
                  argued back.
                </p>
                <p>
                  And I keep a drawer of fabric &mdash; my mother&rsquo;s, my
                  sister&rsquo;s, my own &mdash; because material memory is the only
                  design education I never had to pay for. I want software to carry
                  that much texture: things you can feel the weight of before you
                  know what they do.
                </p>
              </div>
              <p className="ab-sign">&mdash; Pranavi</p>
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
