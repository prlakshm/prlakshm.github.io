import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { animate, inView, scroll, stagger } from "motion";
import "../../styles/tokens.css";
import "./home.css";
import "../about/about.css";
import Journal from "./Journal.js";
import Decks from "./Decks.js";
import ContactIcons from "./ContactIcons.js";
import Manifesto from "../about/Manifesto.js";
import Sunroom, { GlassPicker, readRoom, rememberRoom } from "./sunroom/Sunroom.js";
import type { RoomVariant } from "./sunroom/styles.js";
import { attachUnderlineWipe, prefersReducedMotion, PIN_MS, PIN_SLOP } from "./interactions.js";
import { journals } from "./journals.js";

// Matches the link the global Header already uses. public/docs also holds
const RESUME_URL = "/docs/Pranavi_Ram_Resume_2026.pdf";

// public/about/"Profile picture.png" — space encoded for the URL.
const PORTRAIT = "/about/Profile%20picture.webp";

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
  /* The sketched room behind the hero, and which glass its light comes
     through. */
  const [room, setRoom] = useState<RoomVariant>(readRoom);
  const chooseRoom = (variant: RoomVariant) => {
    setRoom(variant);
    rememberRoom(variant);
  };
  const shelfRef = useRef<HTMLUListElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const aboutRef = useRef<HTMLElement>(null);
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
      /* Tap to raise it — on a phone there is no hover, so without this the
         note is unreachable. */
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

  /* Reveal on scroll. The observer only toggles a class; all motion lives in
     CSS so prefers-reduced-motion is handled in one place. */
  useEffect(() => {
    const shelf = shelfRef.current;

    if (typeof IntersectionObserver === "undefined") {
      shelf?.classList.add("is-in");
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

    return () => shelfObserver.disconnect();
  }, []);

  /* Manifesto: one soft settle — no stagger, no scrub. */
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
    <div className="wt wt--sunroom">
      <div className="wt-surface" aria-hidden="true" ref={surfaceRef} />
      <Sunroom variant={room} />

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
          <GlassPicker value={room} onChange={chooseRoom} />
        </section>

        <section className="shelf" id="work" aria-label="Selected work">
          <ul className="shelf-row" ref={shelfRef}>
            {journals.map((journal, i) => (
              <Journal key={journal.id} journal={journal} index={i} />
            ))}
          </ul>
        </section>

        <Decks shelfRef={shelfRef} />

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
