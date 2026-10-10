import { useEffect, useLayoutEffect, useRef } from "react";
import { revealOnView } from "../../motion/reveal.js";
import "../../styles/tokens.css";
import "../home/home.css";
import "./about.css";
import WtNav from "../home/WtNav.js";
import SiteFooter from "../home/SiteFooter.js";
import { earn } from "../../components/badges/badgeStore.js";
import { mountPortraitPop } from "./portraitPop.js";
import { mountPortraitGlass } from "./portraitGlass.js";
import { prefersReducedMotion } from "../home/interactions.js";
import { mountTitleGoldLight } from "../home/titleGoldLight.js";

// public/about/profile-picture.webp: the same photo, saved lossy (q88). The
// original lossless webp was 1.5 MB, so on a phone it nearly always ran out
// the reveal's 1.2 s image wait before the photo could come in.
const PORTRAIT = "/about/profile-picture.webp";

const EXPERIENCE: { org: string; kind?: string; role: string; year: string }[] = [
  { org: "HBO Max, Warner Bros. Discovery", role: "AI Product Design", year: "2025" },
  { org: "CareerDay", kind: "Startup", role: "Product Design", year: "2024" },
  { org: "Mi Fonda", kind: "Startup", role: "Product Design", year: "2024" },
];

/* About: who she is, beside her portrait. The title is a window onto the
   lily painting (as Home's title is onto the skyline); the copy is the site's
   mono. Hover the portrait to celebrate design. */
function About() {
  const aboutRef = useRef<HTMLElement>(null);
  const portraitRef = useRef<HTMLElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const heading = aboutRef.current?.querySelector<HTMLElement>(".ab-heading");
    if (!heading) return;
    return mountTitleGoldLight(heading, { firstDelay: 1.9, interval: [7, 10] });
  }, []);

  /* The experience table runs exactly as wide as the title's longest line
     (the h1 box itself is wider than its words). */
  useLayoutEffect(() => {
    const h = aboutRef.current?.querySelector<HTMLElement>(".ab-heading");
    const text = h?.closest<HTMLElement>(".ab-text");
    if (!h || !text) return;
    const fit = () => {
      const titleText = h.firstChild;
      if (!titleText) return;
      const range = document.createRange();
      range.selectNodeContents(titleText);
      const w = Math.max(...Array.from(range.getClientRects()).map((r) => r.width));
      text.style.setProperty("--ab-title-w", `${Math.ceil(w)}px`);

    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(h);
    document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, []);

  /* Entrance, the case studies' way (src/motion/reveal.ts): the text column
     comes in as one block, the photo one step after it, once its image has
     loaded. Stacked under the table (phones), the photo comes in when it is
     scrolled to, and develops (about.css): it rises with the text's rise and
     settles from a touch larger, like a print easing into its frame, as the
     Figma Sound case study's art does. Hidden by CSS (.enter) from the first
     paint. */
  useEffect(() => {
    const about = aboutRef.current;
    const text = about?.querySelector<HTMLElement>(".ab-text");
    const portrait = portraitRef.current;
    if (!text || !portrait) return;
    const beside = portrait.getBoundingClientRect().top < text.getBoundingClientRect().bottom;
    return revealOnView([
      { el: text },
      { el: portrait, delay: beside ? 0.09 : 0, image: portrait.querySelector<HTMLImageElement>(".ab-glass > img") }, // the photo, not a pop-out piece (those load late)
    ]);
  }, []);

  /* Celebrate design: the portrait tilts up and the party frame tucked under
     it blooms out (portraitPop.ts). Hover opens it with a mouse; on touch a tap
     opens it and a tap anywhere else (or on it again) tucks it away. */
  useEffect(() => {
    const fig = portraitRef.current;
    const pane = fig?.querySelector<HTMLElement>(".ab-pane");
    const glassEl = fig?.querySelector<HTMLElement>(".ab-glass");
    if (!fig || !pane || !glassEl) return;
    const pop = mountPortraitPop(fig, pane, prefersReducedMotion());
    const glass = mountPortraitGlass(fig, glassEl, prefersReducedMotion());
    let touch = false;
    const celebrate = (e: PointerEvent | MouseEvent) => earn("celebrate", { x: e.clientX, y: e.clientY });
    const down = (e: PointerEvent) => {
      touch = e.pointerType !== "mouse" && e.pointerType !== "pen";
    };
    const on = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      pop.open();
      celebrate(e);
    };
    const off = (e: PointerEvent) => {
      if (e.pointerType === "mouse" || e.pointerType === "pen") pop.close();
      glass.leave();
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === "mouse" || e.pointerType === "pen") glass.aim(e.clientX, e.clientY);
    };
    const tap = (e: MouseEvent) => {
      if (!touch) return;
      if (pop.isOpen) pop.close();
      else {
        pop.open();
        celebrate(e);
      }
    };
    const outside = (e: PointerEvent) => {
      if (pop.isOpen && !fig.contains(e.target as Node)) pop.close();
    };
    fig.addEventListener("pointerdown", down);
    fig.addEventListener("pointerenter", on);
    fig.addEventListener("pointerleave", off);
    fig.addEventListener("pointermove", move);
    fig.addEventListener("click", tap);
    document.addEventListener("pointerdown", outside);
    return () => {
      fig.removeEventListener("pointerdown", down);
      fig.removeEventListener("pointerenter", on);
      fig.removeEventListener("pointerleave", off);
      fig.removeEventListener("pointermove", move);
      fig.removeEventListener("click", tap);
      document.removeEventListener("pointerdown", outside);
      pop.destroy();
      glass.destroy();
    };
  }, []);

  return (
    <div className="wt wt--about">
      <WtNav />
      <main>
        <section className="ab ab--page" id="about" ref={aboutRef} aria-labelledby="ab-title">
          <div className="ab-grid">
            <div className="ab-text enter">
              {/* "designer" takes the second line when the two don't fit */}
              <h1 className="ab-heading" id="ab-title">
                an&nbsp;interdisciplinary designer
                <span className="ab-heading-gold ab-heading-gold--auto" aria-hidden="true">an&nbsp;interdisciplinary designer</span>
                <span className="ab-heading-gold ab-heading-gold--pointer" aria-hidden="true">an&nbsp;interdisciplinary designer</span>
              </h1>
              <div className="ab-body">
                <p className="line">
                  I grew up going to the Museum of Modern Art in D.C., and now I go to one in NYC. I wanted to bring a
                  piece of that into my portfolio. I studied UI<span className="ab-slash">/</span>UX Design at Brown
                  University and come from a film background. I&rsquo;ve worked on short films, written, directed,
                  and acted.
                </p>
                <p className="line">
                  I design to challenge what&rsquo;s possible. If we always designed by the rulebook, there would be no
                  change. We are a house for creative spirit. Let&rsquo;s be intentional about what we create.
                </p>
              </div>
              <section className="ab-exp" aria-labelledby="ab-exp-h">
                <h2 className="ab-exp-h" id="ab-exp-h">Experience</h2>
                <ul className="ab-exp-list">
                  {EXPERIENCE.map((x) => (
                    <li className="ab-exp-row" key={x.org}>
                      <span className="ab-exp-org">
                        {x.org}
                        {x.kind && <span className="ab-exp-kind"> ({x.kind})</span>}
                      </span>
                      <span className="ab-exp-role">{x.role}</span>
                      <span className="ab-exp-year">{x.year}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
            <figure className="ab-portrait enter" ref={portraitRef}>
              {/* the pane lifts for the celebration; the glass inside it leans
                  toward the cursor and catches the light, as the posters do */}
              <div className="ab-pane">
                <div className="ab-glass">
                  <img
                    src={PORTRAIT}
                    alt="Pranavi Ram, smiling, on the Brown University campus green."
                    loading="eager"
                    {...{ fetchpriority: "high" }}
                    decoding="async"
                  />
                  <span className="ab-sheen" aria-hidden="true" />
                  <span className="ab-glare" aria-hidden="true" />
                  <span className="ab-rim" aria-hidden="true" />
                </div>
              </div>
            </figure>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

export default About;
