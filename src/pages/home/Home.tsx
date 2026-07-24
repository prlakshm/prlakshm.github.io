import { useEffect, useLayoutEffect, useRef } from "react";
import "../../styles/tokens.css";
import "./home.css";
import Journal from "./Journal.js";
import ContactIcons from "./ContactIcons.js";
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

  /* Each scrap lives in its final position in the row, then is pushed back into
     the pocket with a per-element transform. Measuring gives us that offset.
     offsetLeft/offsetTop are layout positions, so they are unaffected by the
     transforms already sitting on these elements — no need to reset anything. */
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
        el.style.setProperty("--dx", `${Math.round(px - cx)}px`);
        el.style.setProperty("--dy", `${Math.round(py - cy)}px`);
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

    // The fabric toggles, so scrolling back up dances it into the pocket again.
    // `has-played` gates the return animation so it cannot fire on first paint,
    // when the section is legitimately out of view and still tucked.
    const archiveObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target;
          if (entry.isIntersecting) {
            el.classList.add("has-played", "is-in");
          } else {
            el.classList.remove("is-in");
          }
        });
      },
      { threshold: 0.25 }
    );
    if (archive) archiveObserver.observe(archive);

    return () => {
      shelfObserver.disconnect();
      archiveObserver.disconnect();
    };
  }, []);

  return (
    <div className="wt">
      <div className="wt-surface" aria-hidden="true" />

      <header className="wt-nav">
        <div className="wt-nav-inner">
          <a className="wt-wordmark" href="#/">
            PRANAVI RAM
          </a>
          <nav aria-label="Primary">
            <ul className="wt-nav-links">
              <li>
                <a href="#work">WORK</a>
              </li>
              {/* Points at the existing /about route, since the homepage's own
                  about section was removed in the simplification pass. */}
              <li>
                <a href="#/about">ABOUT</a>
              </li>
              <li>
                <a href={RESUME_URL} target="_blank" rel="noreferrer">
                  RESUME
                  <ExternalArrow />
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
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
                  </a>
                </p>
                <p className="line">CS + Literary Arts @ Brown University</p>
              </div>

              <div className="hero-col hero-col--prev">
                <p className="line line--label">PREV:</p>
                <p className="line">Design Partner @ OpenAI</p>
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
          {/* © is outside Berkeley Mono Trial's ASCII range, so this one glyph
              comes from the fallback mono. It is a symbol, not a letterform,
              so the seam is invisible at this size. */}
          <p className="foot-name">
            <span className="foot-copy" aria-hidden="true">
              &copy;
            </span>{" "}
            2026 Coded by Pranavi
          </p>
          <ContactIcons className="tiles--foot" />
        </div>
      </footer>
    </div>
  );
}

export default Home;
