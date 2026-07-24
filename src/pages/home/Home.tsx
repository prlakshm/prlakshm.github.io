import { useEffect, useLayoutEffect, useRef } from "react";
import { animate, scroll, stagger, steps } from "motion";
import "../../styles/tokens.css";
import "./home.css";
import Journal from "./Journal.js";
import ContactIcons from "./ContactIcons.js";
import { attachUnderlineWipe, prefersReducedMotion } from "./interactions.js";
import { journals } from "./journals.js";

// Matches the link the global Header already uses. public/docs also holds
// Resume_2026.pdf and "New Grad 2026 Resume.pdf" — switch here if this is stale.
const RESUME_URL = "/docs/Pranavi_Lakshminarayanan_AI_Product_Resume.pdf";

/* Fabric scraps. Colors stand in until the real textile photography exists —
   add `src` here and the markup is unchanged. */
const scraps = [
  { id: "s1", label: "my grad dress", color: "#D8B98A", rotate: -7 },
  { id: "s2", label: "curtains from my childhood bedroom", color: "#C9A24B", rotate: 4 },
  { id: "s3", label: "my fav kurti from india", color: "#B3542E", rotate: -3 },
  { id: "s4", label: "my sister's fav dress from high school", color: "#31556B", rotate: 6 },
  { id: "s5", label: "purple top my mom stitched 4 me", color: "#6E4E8C", rotate: -5 },
];

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
  const archiveRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pocketRef = useRef<HTMLDivElement>(null);
  const shelfRef = useRef<HTMLUListElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  const scrollToWork = () => {
    document.getElementById("work")?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
  };

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

    // Pronunciation note: springs in with a slight overshoot.
    const title = heroRef.current?.querySelector<HTMLElement>(".hero-title");
    const pron = title?.querySelector<HTMLElement>(".hero-pron");
    if (title && pron) {
      const reduced = prefersReducedMotion();
      const show = (on: boolean) =>
        animate(
          pron,
          { opacity: on ? 1 : 0, y: on ? 0 : 4, scale: on ? 1 : 0.96 },
          reduced ? { duration: 0 } : { type: "spring", stiffness: 460, damping: 24 }
        );
      const on = () => show(true);
      const off = () => show(false);
      title.addEventListener("pointerenter", on);
      title.addEventListener("pointerleave", off);
      cleanups.push(() => {
        title.removeEventListener("pointerenter", on);
        title.removeEventListener("pointerleave", off);
      });
    }

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
    } else if (archive && timelines.length > 0) {
      // One scroll subscription driving all five timelines, not five listeners.
      stopScroll = scroll(
        (progress: number) => {
          timelines.forEach((t, i) => {
            const local = progress * span - i * STAGGER;
            t.time = Math.min(DURATION, Math.max(0, local));
          });
        },
        // Runs as the section rises through the lower half of the viewport,
        // which is a comfortable distance for the whole dance.
        { target: archive, offset: ["start 0.95", "start 0.45"] }
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
              {/* A button, not <a href="#work">. This is a HashRouter, so the
                  hash is the route: an in-page anchor would navigate to a
                  non-existent "/work" route and blank the page. */}
              <li>
                <button type="button" onClick={scrollToWork}>
                  WORK
                  <span className="nav-rule" aria-hidden="true" />
                </button>
              </li>
              {/* Points at the existing /about route, since the homepage's own
                  about section was removed in the simplification pass. */}
              <li>
                <a href="#/about">
                  ABOUT
                  <span className="nav-rule" aria-hidden="true" />
                </a>
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
              <svg
                className="pocket"
                viewBox="0 0 400 406"
                role="img"
                aria-label="A denim pocket holding folded fabric scraps."
              >
                <path
                  d="M14 26 L390 26 L356 262 L202 398 L46 262 Z"
                  transform="translate(4,8)"
                  fill="rgb(58 40 22 / 20%)"
                />
                <path d="M10 18 L386 18 L352 254 L198 390 L42 254 Z" fill="#3C5A79" />
                <path d="M10 18 L386 18 L380 62 L16 62 Z" fill="rgb(20 34 52 / 28%)" />
                <path
                  d="M22 32 L374 32 L342 246 L198 372 L54 246 Z"
                  fill="none"
                  stroke="#C9A25E"
                  strokeWidth="2"
                  strokeDasharray="7 5"
                />
                <path
                  d="M30 42 L366 42 L335 240 L198 360 L61 240 Z"
                  fill="none"
                  stroke="#C9A25E"
                  strokeWidth="1.5"
                  strokeDasharray="6 5"
                  opacity="0.75"
                />
                <path
                  d="M60 120 Q198 190 336 120"
                  fill="none"
                  stroke="#C9A25E"
                  strokeWidth="2"
                  strokeDasharray="7 5"
                  opacity="0.85"
                />
                <path
                  d="M60 140 Q198 210 336 140"
                  fill="none"
                  stroke="#C9A25E"
                  strokeWidth="1.5"
                  strokeDasharray="6 5"
                  opacity="0.6"
                />
                <circle cx="26" cy="30" r="6" fill="#A8794A" />
                <circle cx="370" cy="30" r="6" fill="#A8794A" />
              </svg>
            </div>

            <ul className="scrap-row">
              {scraps.map((s, i) => (
                <li
                  key={s.id}
                  className="scrap"
                  aria-label={s.label}
                  style={
                    {
                      background: s.color,
                      "--sr": `${s.rotate}deg`,
                      "--si": i,
                    } as React.CSSProperties
                  }
                />
              ))}
            </ul>
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
