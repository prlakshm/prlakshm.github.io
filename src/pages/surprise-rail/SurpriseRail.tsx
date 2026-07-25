import { useEffect, useLayoutEffect, useRef } from "react";
import { animate, inView } from "motion";
import "../../styles/tokens.css";
import "./surprise-rail.css";
import { chapters } from "./chapters.js";
import DescriptorMap from "./DescriptorMap.js";

/* Surprise Rail — case study.

   The homepage is the archive; this is the exhibition. The worktable grid,
   parchment and journal props stay behind: this page takes on the project's own
   environment (cinematic black, pearl, frosted light). What carries over is the
   connective tissue only — Berkeley Mono metadata, the display face, the
   12-column measure, the warm brass accent used once, and the same easing.

   Scroll rhythm follows the reference: sticky project metadata, one idea per
   section, very large media, generous negative space, and exactly two sticky
   sequences. Native scrolling throughout — no snapping, every section skimmable. */

const A = "/case-study-hbo-max1";

const reduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function SurpriseRail() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  /* Entrances. Text lifts ~20px, media settles from 0.97 — small enough to read
     as the page composing itself rather than as an effect. inView fires once. */
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const rise = Array.from(root.querySelectorAll<HTMLElement>("[data-rise]"));
    const settle = Array.from(root.querySelectorAll<HTMLElement>("[data-settle]"));

    if (reduced()) {
      [...rise, ...settle].forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
      return;
    }

    rise.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(20px)";
    });
    settle.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "scale(0.97)";
    });

    const stops: Array<() => void> = [];

    rise.forEach((el) => {
      stops.push(
        inView(
          el,
          () => {
            animate(
              el,
              { opacity: 1, y: 0 },
              { duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }
            );
          },
          { margin: "0px 0px -12% 0px" }
        )
      );
    });

    settle.forEach((el) => {
      stops.push(
        inView(
          el,
          () => {
            animate(
              el,
              { opacity: 1, scale: 1 },
              { duration: 0.9, ease: [0.22, 0.61, 0.36, 1] }
            );
          },
          { margin: "0px 0px -8% 0px" }
        )
      );
    });

    return () => stops.forEach((stop) => stop());
  }, []);

  /* Chapter progress: the rail marks which chapter is in view. Cheap, and it
     doubles as the "where am I" affordance that replaces heavy page chrome. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const marks = new Map<string, HTMLElement>();
    root.querySelectorAll<HTMLElement>("[data-mark]").forEach((el) => {
      if (el.dataset.mark) marks.set(el.dataset.mark, el);
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = (entry.target as HTMLElement).dataset.chapter;
          if (!id) return;
          const mark = marks.get(id);
          if (mark) mark.classList.toggle("is-current", entry.isIntersecting);
        });
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );

    root
      .querySelectorAll<HTMLElement>("[data-chapter]")
      .forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  /* Sticky sequence 01 — the hidden state.
     The thesis holds on the left while three iterations pass on the right, then
     both release. Scroll-linked so it can be scrubbed in either direction. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduced()) return;

    const seq = root.querySelector<HTMLElement>("[data-seq='hidden']");
    if (!seq) return;

    const frames = Array.from(seq.querySelectorAll<HTMLElement>(".sr-seq-frame"));
    if (frames.length === 0) return;

    /* Progress is computed from the section's own rect rather than handed to a
       library offset string: the sticky child is exactly one viewport tall, so
       the travel is (height - viewportHeight) and the maths is unambiguous.
       Verifiable, and it cannot drift if the section height changes. */
    let ticking = false;

    const paint = () => {
      ticking = false;
      const rect = seq.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      if (travel <= 0) return;

      const progress = Math.max(0, Math.min(1, -rect.top / travel));

      /* Weight each frame by its distance from a continuous position. Adjacent
         frames always sum to 1, so the stage never dips toward empty
         mid-transition the way a slice-per-frame approach does at boundaries. */
      const pos = progress * (frames.length - 1);
      frames.forEach((frame, i) => {
        frame.style.opacity = String(
          Math.max(0, Math.min(1, 1 - Math.abs(pos - i)))
        );
      });
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(paint);
    };

    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="sr" ref={rootRef}>
      {/* --- Persistent chrome ------------------------------------------- */}
      <header className="sr-top">
        <a className="sr-back" href="#/">
          <span aria-hidden="true">&larr;</span> INDEX
        </a>
        <p className="sr-top-id">
          <span>03</span>
          <span className="sr-top-sep" aria-hidden="true" />
          <span>SURPRISE RAIL</span>
        </p>
      </header>

      <nav className="sr-rail" aria-label="Chapters">
        <ul>
          {chapters.map((c) => (
            <li key={c.id}>
              <span className="sr-rail-mark" data-mark={c.id}>
                <span className="sr-rail-num">{c.id}</span>
                <span className="sr-rail-label">{c.label}</span>
              </span>
            </li>
          ))}
        </ul>
      </nav>

      <main>
        {/* --- Hero: year, title, one description, disciplines ------------ */}
        <section className="sr-hero">
          <div className="sr-hero-meta">
            <p className="sr-year" data-rise>
              2025
            </p>
            <h1 className="sr-title" data-rise>
              Surprise Rail
            </h1>
          </div>

          <div className="sr-hero-side">
            <p className="sr-lede" data-rise>
              A streaming discovery concept that hides the cover art and offers a
              clue instead &mdash; testing whether showing less could make people
              more curious. Designed during my product design internship at HBO Max.
            </p>
            <ul className="sr-disciplines" data-rise>
              <li>Product design</li>
              <li>Interaction design</li>
              <li>Prototyping</li>
            </ul>
          </div>
        </section>

        {/* Opening product moment — the mechanic, immediately, at full scale. */}
        <figure className="sr-plate sr-plate--full" data-settle>
          <img
            src={`${A}/film-reel-tiles.png`}
            alt="An HBO Max connected-TV home screen. Three rails of cover art are interrupted by film-strip tiles whose artwork is frosted over, each showing only a clue: Dystopian Wars, NYC Punk Dream, Magic and Mayhem."
            decoding="async"
          />
          <figcaption>
            The rail in context. Hidden tiles sit inline with ordinary cover art
            &mdash; visibly withholding, never broken.
          </figcaption>
        </figure>

        {/* --- 01 The problem --------------------------------------------- */}
        <section className="sr-chapter" data-chapter="01">
          <ChapterHead index={0} />
          {/* Redrawn from the research chart rather than screenshotted, so the
              finding arrives in this page's language instead of a deck's. */}
          <figure className="sr-plate sr-plate--wide sr-diagram" data-settle>
            <DescriptorMap />
            <figcaption>
              How participants described what they wanted. Four categories
              emerged &mdash; and the ones that moved a decision were rarely the
              ones that described the title.
            </figcaption>
          </figure>
        </section>

        {/* --- 02 The turn ------------------------------------------------- */}
        <section className="sr-chapter" data-chapter="02">
          <ChapterHead index={1} />
          <div className="sr-pull" data-rise>
            <p>See less. Want more.</p>
          </div>
          <figure className="sr-plate sr-plate--wide" data-settle>
            <img
              src={`${A}/blind-date-book.png`}
              alt="Inspiration artefact: a blind-date-with-a-book display, where books are wrapped in paper printed with only a few descriptive words."
              loading="lazy"
              decoding="async"
            />
            <figcaption>
              The precedent I kept returning to: a wrapped book sells itself on
              three words and nothing else.
            </figcaption>
          </figure>
        </section>

        {/* --- 03 Hidden state — STICKY SEQUENCE --------------------------- */}
        <section className="sr-chapter" data-chapter="03">
          <ChapterHead index={2} />
        </section>

        <section className="sr-seq" data-seq="hidden" aria-label="Hidden state iterations">
          <div className="sr-seq-inner">
            <aside className="sr-seq-aside">
              <p className="sr-seq-kicker">Hidden state</p>
              <p className="sr-seq-note">
                Three passes. The frame had to read as a deliberate object at
                thumbnail size, on a screen ten feet away.
              </p>
            </aside>
            <div className="sr-seq-stage" aria-hidden="true">
              <div className="sr-seq-frame">
                <img src={`${A}/tile-testing-options.png`} alt="" loading="lazy" decoding="async" />
              </div>
              <div className="sr-seq-frame">
                <img
                  src={`${A}/generated/final-suburban-secrets-tile.png`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="sr-seq-frame">
                <img src={`${A}/CTV-Themed-Rail.png`} alt="" loading="lazy" decoding="async" />
              </div>
            </div>
          </div>
        </section>

        <p className="sr-seq-alt">
          Tile explorations, the resolved Suburban Secrets frame, and the rail in
          a themed row.
        </p>

        {/* --- 04 The reveal ----------------------------------------------- */}
        <section className="sr-chapter" data-chapter="04">
          <ChapterHead index={3} />
          <div className="sr-storyboard">
            {[
              { src: "storyboard-1-default.png", cap: "Rest" },
              { src: "storyboard-2-focus.png", cap: "Focus" },
              { src: "storyboard-3-reveal.png", cap: "Reveal" },
              { src: "storyboard-4-preview.png", cap: "Preview" },
            ].map((f) => (
              <figure key={f.src} className="sr-frame" data-settle>
                <img
                  src={`${A}/generated-v4/${f.src}`}
                  alt={`Reveal storyboard: ${f.cap}.`}
                  loading="lazy"
                  decoding="async"
                />
                <figcaption>{f.cap}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <figure className="sr-plate sr-plate--full" data-settle>
          <video
            src={`${A}/surprise-rail-overview.mp4`}
            controls
            playsInline
            preload="metadata"
            aria-label="Walkthrough of the Surprise Rail experience."
          />
          <figcaption>Prototype walkthrough.</figcaption>
        </figure>

        {/* --- 05 Identity -------------------------------------------------- */}
        <section className="sr-chapter" data-chapter="05">
          <ChapterHead index={4} />
          <figure className="sr-plate sr-plate--wide" data-settle>
            <img
              src={`${A}/name-options.png`}
              alt="Naming exploration for the rail."
              loading="lazy"
              decoding="async"
            />
            <figcaption>Naming studies.</figcaption>
          </figure>
          <p className="sr-pending">
            Campaign identity in development &mdash; direction under review.
          </p>
        </section>

        {/* --- Contribution -------------------------------------------------- */}
        <section className="sr-contrib">
          <h2 className="sr-h2" data-rise>
            What I did
          </h2>
          <ul className="sr-contrib-list">
            {[
              "Framed decision paralysis as the product opportunity",
              "Developed the Surprise Rail concept end to end",
              "Designed the hidden and revealed states",
              "Wrote and tested the teaser clue language",
              "Prototyped the rail across streaming surfaces",
            ].map((item) => (
              <li key={item} data-rise>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* --- 06 Next -------------------------------------------------------- */}
        <section className="sr-chapter sr-chapter--last" data-chapter="06">
          <ChapterHead index={5} />
        </section>
      </main>

      <footer className="sr-foot">
        <a className="sr-foot-back" href="#/">
          <span aria-hidden="true">&larr;</span> Back to index
        </a>
        <p>An internship design concept, not a shipped HBO Max feature.</p>
      </footer>
    </div>
  );
}

function ChapterHead({ index }: { index: number }) {
  const c = chapters[index];
  return (
    <div className="sr-head">
      <p className="sr-head-id" data-rise>
        <span>{c.id}</span>
        <span className="sr-head-label">{c.label}</span>
      </p>
      <h2 className="sr-thesis" data-rise>
        {c.thesis}
      </h2>
      <div className="sr-body">
        {c.body.map((p) => (
          <p key={p} data-rise>
            {p}
          </p>
        ))}
      </div>
    </div>
  );
}

export default SurpriseRail;
