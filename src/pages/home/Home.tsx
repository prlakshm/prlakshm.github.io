import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { animate, inView, stagger } from "motion";
import "../../styles/tokens.css";
import "./home.css";
import ContactIcons from "./ContactIcons.js";
import WtNav, { scrollToId } from "./WtNav.js";
import WorkGrid from "./WorkGrid.js";
import SiteFooter from "./SiteFooter.js";
import { earn } from "../../components/badges/badgeStore.js";
import { attachUnderlineWipe, prefersReducedMotion, PIN_MS, PIN_SLOP } from "./interactions.js";

/* The homepage is the work: a plain centred hero, then the grid. The sketched
   sunroom, the notebooks, the concept decks and the fabric archive are no
   longer mounted here (their components are kept); About is its own page. */

function Home() {
  const { pathname, state } = useLocation();
  const heroRef = useRef<HTMLElement>(null);

  /* #/projects, and WORK pressed on another page, land here and scroll to the
     grid once it is in the tree. */
  useEffect(() => {
    const wantsWork =
      pathname === "/projects" ||
      (state as { scrollTo?: string } | null)?.scrollTo === "work";
    if (wantsWork) scrollToId("work");
  }, [pathname, state]);

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
    const tiles = hero.querySelector<HTMLElement>(".wt-tiles--hero");
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

    /* The poster wall comes in the same way, continuing the hero's steps: each
       section (its placard and its prints together) is one step. (.gl-group
       carries no transform of its own; the lean lives on .gl-print.) */
    const STEP = 0.06;
    // the sections step slower than the hero's lines, so each reads as its own beat (as About's 0.15s steps)
    const SECTION_STEP = 0.15;
    const wall = document.querySelector<HTMLElement>(".wk");
    // Held hidden by CSS until it comes in (home.css: .wk[data-enter]); the
    // cards are found when it starts, as the gallery may re-render them.
    if (wall) wall.dataset.enter = "pending";
    let wallTargets: HTMLElement[] = [];
    const showWall = () => {
      if (wall) delete wall.dataset.enter;
      wallTargets.forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
    };
    let heroAt = 0;
    let wallControls: ReturnType<typeof animate> | undefined;
    // registered after the hero's, so the hero's start is known when it fires
    let stopWall = () => {};
    const startWall = () => {
      stopWall = wall
      ? inView(
          wall,
          () => {
            wallTargets = Array.from(wall.querySelectorAll<HTMLElement>(".gl-group"));
            wallTargets.forEach((el) => {
              el.style.opacity = "0";
              el.style.transform = "translateY(9px)";
            });
            delete wall.dataset.enter;
            // right after the hero's last step, if the hero is still coming in
            // (both fire in the same frame, in no set order: if the hero hasn't
            // started yet, it is starting now)
            const after = Math.max(0, (heroAt || performance.now() / 1000) + STEP * targets.length - performance.now() / 1000);
            // explicit from-values: Motion remembers each card's last value
            // (a Strict Mode first pass), which would start them near 1
            wallControls = animate(
              wallTargets,
              { opacity: [0, 1], y: [9, 0] },
              { duration: 0.7, delay: stagger(SECTION_STEP, { startDelay: after + SECTION_STEP }), ease: [0.22, 0.61, 0.36, 1] }
            );
            wallControls.finished.then(showWall).catch(showWall);
          },
          { margin: "0px 0px -8% 0px" }
        )
      : () => {};
    };

    let controls: ReturnType<typeof animate> | undefined;
    const stopInView = inView(
      hero,
      () => {
        heroAt = performance.now() / 1000;
        controls = animate(
          targets,
          { opacity: 1, y: 0 },
          { duration: 0.7, delay: stagger(STEP), ease: [0.22, 0.61, 0.36, 1] }
        );
        const commit = () => {
          heroEnteredRef.current = true;
          applyVisible();
        };
        controls.finished.then(commit).catch(commit);
      },
      { margin: "0px 0px -8% 0px" }
    );
    startWall();

    return () => {
      stopInView();
      stopWall();
      // complete() jumps to the end instead of stop()'s mid-hide freeze, so a
      // Strict Mode remount never inherits a half-hidden hero.
      if (controls) {
        controls.complete();
        heroEnteredRef.current = true;
        applyVisible();
      }
      wallControls?.complete();
      showWall();
    };
  }, []);

  /* Underline wipes (nav links + the @handle) and the pronunciation tooltip.
     Every rule element is paired with the link that triggers it. */
  useEffect(() => {
    const cleanups: Array<() => void> = [];

    heroRef.current?.querySelectorAll<HTMLElement>(".line a").forEach((link) => {
      const rule = link.querySelector<HTMLElement>(".line-rule");
      if (rule) cleanups.push(attachUnderlineWipe(link, rule));
    });

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
      /* Hidden interaction: reading the note long enough to learn her name. */
      let learnTimer = 0;
      let lastX = 0;
      let lastY = 0;
      const learnSoon = (x: number, y: number) => {
        lastX = x;
        lastY = y;
        window.clearTimeout(learnTimer);
        learnTimer = window.setTimeout(() => earn("name", { x: lastX, y: lastY }), 700);
      };
      const show = (on: boolean) => {
        title.classList.toggle("is-pron", on);
        if (!on) window.clearTimeout(learnTimer);
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
        learnSoon(e.clientX, e.clientY);
      };
      const move = (e: PointerEvent) => {
        if (pinned) return; // a pinned note stays where it was put
        byTouch = e.pointerType === "touch";
        place(e.clientX, e.clientY);
        lastX = e.clientX;
        lastY = e.clientY;
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
        learnSoon(e.clientX, e.clientY);
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
        window.clearTimeout(learnTimer);
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return (
    <div className="wt wt--home">
      <WtNav />

      <main>
        <section className="hero" ref={heroRef}>
          {/* hero-block width is driven only by the title; intro uses
              width:0;min-width:100% so it shares those left/right edges
              without expanding the block past the title. */}
          <div className="hero-block">
            <h1 className="hero-title">
              hi, i&rsquo;m pranavi ram
              <span className="hero-pron wt-tip" aria-hidden="true">
                Pronounced <em>Pren-Uh-Vi Ram</em> (Like Palm)
              </span>
            </h1>

            <div className="hero-intro">
              <div className="hero-col hero-col--copy">
                <p className="line">Product Designer reimagining the interfaces people love</p>
                <p className="line">
                  Building, animating, and sharing on X{" "}
                  <a href="https://x.com/pranavibuilds" target="_blank" rel="noreferrer">
                    @pranavibuilds
                    <span className="line-rule" aria-hidden="true" />
                  </a>
                </p>
              </div>

              <div className="hero-col hero-col--prev">
                <p className="line line--label">Prev:</p>
                <p className="line">Design @ hbo max</p>
              </div>

              {/* Desktop: under copy. Stacked: below all text (copy → PREV → tiles). */}
              <ContactIcons className="wt-tiles--hero" />
            </div>
          </div>
        </section>

        <WorkGrid />
      </main>

      <SiteFooter painting="skyline" />
    </div>
  );
}

export default Home;
