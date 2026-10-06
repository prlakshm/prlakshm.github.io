import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { animate } from "motion";
import { decoded, enterOnView, fontsReady, lineCount, type Step } from "../../motion/entrance.js";
import "../../styles/tokens.css";
import "./home.css";
import ContactIcons from "./ContactIcons.js";
import WtNav, { scrollToId } from "./WtNav.js";
import WorkGrid from "./WorkGrid.js";
import SiteFooter from "./SiteFooter.js";
import { badgesArmed, earn } from "../../components/badges/badgeStore.js";
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

  /* Entrance, in groups: the title, then the sub (its lines together), then the
     contact row, then the whole poster wall, one
     beat apiece in the site's rhythm (src/motion/entrance.ts). Each wall
     section starts when its prints scroll into view and their art has
     decoded, so one below the fold plays when it is seen and no print fades
     in empty. Hidden before paint; cleanup always leaves everything at rest. */
  useLayoutEffect(() => {
    const hero = heroRef.current;
    if (!hero || prefersReducedMotion()) return;

    const title = hero.querySelector<HTMLElement>(".hero-title");
    const heroSteps = (): Step[] => {
      const out: Step[] = [];
      if (title) out.push({ el: title, beats: lineCount(title) });
      const sub = Array.from(hero.querySelectorAll<HTMLElement>(".line"));
      if (sub.length) out.push({ el: sub, rows: true });
      hero.querySelectorAll<HTMLElement>(".wt-tiles--hero").forEach((el) => out.push({ el }));
      return out;
    };
    const stops = [enterOnView(hero, heroSteps, () => fontsReady())];

    // the whole poster wall, both sections, as one group (.gl-group has no
    // box on the one-row wall, so the placards and prints move, not it)
    const wall = Array.from(document.querySelectorAll<HTMLElement>(".gl-placard, .gl-card"));
    if (wall.length)
      stops.push(
        enterOnView(wall[0].closest(".gl-wall") ?? wall[0], () => [{ el: Array.from(document.querySelectorAll<HTMLElement>(".gl-placard, .gl-card")), rows: 0.09, large: true }], () =>
          decoded(Array.from(document.querySelectorAll<HTMLImageElement>(".gl-print img")))
        )
      );

    return () => stops.forEach((stop) => stop());
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
      // A hover only counts if it started after the hunt began: a cursor that
      // was already resting on her name when the page opened hasn't found it.
      let fresh = false;
      const learnSoon = (x: number, y: number) => {
        if (!fresh) return;
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
        fresh = badgesArmed();
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
        fresh = badgesArmed(); // a tap is deliberate
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
