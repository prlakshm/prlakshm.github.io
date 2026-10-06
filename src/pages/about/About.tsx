import { useEffect, useLayoutEffect, useRef } from "react";
import { animate, inView } from "motion";
import "../../styles/tokens.css";
import "../home/home.css";
import "./about.css";
import WtNav from "../home/WtNav.js";
import SiteFooter from "../home/SiteFooter.js";
import { earn } from "../../components/badges/badgeStore.js";
import { mountPortraitPop } from "./portraitPop.js";
import { prefersReducedMotion } from "../home/interactions.js";

// public/about/"Profile picture.webp" — space encoded for the URL.
const PORTRAIT = "/about/Profile%20picture.webp";

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

  /* The experience table runs exactly as wide as the title's longest line
     (the h1 box itself is wider than its words). */
  useLayoutEffect(() => {
    const h = aboutRef.current?.querySelector<HTMLElement>(".ab-heading");
    const text = h?.closest<HTMLElement>(".ab-text");
    if (!h || !text) return;
    const fit = () => {
      const range = document.createRange();
      range.selectNodeContents(h);
      const w = Math.max(...Array.from(range.getClientRects()).map((r) => r.width));
      text.style.setProperty("--ab-title-w", `${Math.ceil(w)}px`);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(h);
    document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, []);

  /* One soft settle in 0.15s steps (0.3 felt slow, 0.06 too fast to see):
     the title, then the copy and the portrait together, then the experience
     table one step after. */
  useLayoutEffect(() => {
    const about = aboutRef.current;
    if (!about) return;
    const targets = [
      about.querySelector<HTMLElement>(".ab-heading"),
      about.querySelector<HTMLElement>(".ab-body"),
      about.querySelector<HTMLElement>(".ab-portrait"),
      about.querySelector<HTMLElement>(".ab-exp"),
    ].filter((el): el is HTMLElement => el !== null);

    const applyVisible = () =>
      targets.forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
      });
    if (prefersReducedMotion()) {
      applyVisible();
      return;
    }
    targets.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(9px)";
    });

    let controls: ReturnType<typeof animate> | undefined;
    const stop = inView(
      about,
      () => {
        controls = animate(
          targets,
          { opacity: 1, y: 0 },
          { duration: 0.7, delay: (i: number) => [0, 0.15, 0.15, 0.3][i] ?? 0, ease: [0.22, 0.61, 0.36, 1] }
        );
        controls.finished.then(applyVisible).catch(applyVisible);
      },
      { amount: 0.1 }
    );
    return () => {
      stop();
      if (controls) controls.complete();
      applyVisible();
    };
  }, []);

  /* Celebrate design: the portrait tilts up and the party frame tucked under
     it blooms out (portraitPop.ts). Hover opens it with a mouse; on touch a tap
     opens it and a tap anywhere else (or on it again) tucks it away. */
  useEffect(() => {
    const fig = portraitRef.current;
    const img = fig?.querySelector<HTMLElement>("img");
    if (!fig || !img) return;
    const pop = mountPortraitPop(fig, img, prefersReducedMotion());
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
    fig.addEventListener("click", tap);
    document.addEventListener("pointerdown", outside);
    return () => {
      fig.removeEventListener("pointerdown", down);
      fig.removeEventListener("pointerenter", on);
      fig.removeEventListener("pointerleave", off);
      fig.removeEventListener("click", tap);
      document.removeEventListener("pointerdown", outside);
      pop.destroy();
    };
  }, []);

  return (
    <div className="wt wt--about">
      <WtNav />
      <main>
        <section className="ab ab--page" id="about" ref={aboutRef} aria-labelledby="ab-title">
          <div className="ab-grid">
            <div className="ab-text">
              {/* "designer" takes the second line when the two don't fit */}
              <h1 className="ab-heading" id="ab-title">
                an&nbsp;interdisciplinary designer
              </h1>
              <div className="ab-body">
                <p className="line">
                  I grew up going to the Museum of Modern Art in D.C., and now I go to one in NYC. I wanted to bring a
                  piece of that into my portfolio. I studied UI<span className="ab-slash">/</span>UX design at Brown
                  University and come from a film background. I&rsquo;ve worked on short films, written, directed,
                  and acted.
                </p>
                <p className="line">
                  I design to challenge what is possible. If we always designed by the rulebook, there would be no
                  change. We are a house for creative spirit. So let&rsquo;s be intentional about what we create.
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
            <figure className="ab-portrait" ref={portraitRef}>
              <img
                src={PORTRAIT}
                alt="Pranavi Ram, smiling, on the Brown University campus green."
                decoding="async"
              />
            </figure>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

export default About;
