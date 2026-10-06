import { useEffect, useRef, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { animate } from "motion";
import BadgeCard from "../../components/badges/BadgeCard.js";
import { attachUnderlineWipe, prefersReducedMotion } from "./interactions.js";
import "./chrome.css";

/* The site nav. Top-left is the hidden-interactions card (it replaced the
   wordmark), then WORK · GALLERY · ABOUT · RESUME.
   NavBar is the bar itself and knows nothing of the router; WtNav (Home,
   About) hands it router-aware WORK and ABOUT items, and the static case
   studies hand it plain links (src/static-chrome.tsx). */

export const RESUME_URL = "/docs/Pranavi_Ram_Resume_2026.pdf";

export function ExternalArrow() {
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

export const scrollToId = (id: string) =>
  document.getElementById(id)?.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "start",
  });

type NavBarProps = {
  /** The WORK and ABOUT items, each with its .nav-rule. */
  work: ReactNode;
  about: ReactNode;
  /** Tuck the bar away while reading down and bring it back on the way up
      (the case studies). Home and About keep it pinned: the card has to stay
      on screen for stamps to land in it. */
  autoHide?: boolean;
  /** What the star card does when clicked: go home. The app hands in a
      router-aware version; the static pages fall back to loading /#/. */
  onHome?: () => void;
};

export function NavBar({ work, about, autoHide = false, onHome }: NavBarProps) {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const cleanups: Array<() => void> = [];

    root.querySelectorAll<HTMLElement>(".wt-nav-links a, .wt-nav-links button").forEach((link) => {
      const rule = link.querySelector<HTMLElement>(".nav-rule");
      if (rule) cleanups.push(attachUnderlineWipe(link, rule));
    });

    // The RESUME arrow nudges along its own diagonal on hover.
    const resume = root.querySelector<HTMLElement>(".wt-nav-links a[target='_blank']");
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

    // GALLERY (everything else, on the dot canvas) is a mock for now: it says
    // so instead of doing nothing.
    const mock = root.querySelector<HTMLElement>(".nav-mock");
    const soon = root.querySelector<HTMLElement>(".nav-soon");
    if (mock && soon) {
      const reduced = prefersReducedMotion();
      let hideTimer = 0;
      const show = (on: boolean) =>
        animate(soon, { opacity: on ? 1 : 0 }, reduced ? { duration: 0 } : { duration: on ? 0.16 : 0.22 });
      const on = () => {
        window.clearTimeout(hideTimer);
        show(true);
      };
      const off = () => show(false);
      const tap = () => {
        on();
        hideTimer = window.setTimeout(off, 1600);
      };
      mock.addEventListener("pointerenter", on);
      mock.addEventListener("pointerleave", off);
      mock.addEventListener("focus", on);
      mock.addEventListener("blur", off);
      mock.addEventListener("click", tap);
      cleanups.push(() => {
        window.clearTimeout(hideTimer);
        mock.removeEventListener("pointerenter", on);
        mock.removeEventListener("pointerleave", off);
        mock.removeEventListener("focus", on);
        mock.removeEventListener("blur", off);
        mock.removeEventListener("click", tap);
      });
    }

    /* The bar's wall-coloured backing fades in only once something scrolls
       under it; at the top of the page nothing sits behind the bar. */
    const glass = root.querySelector<HTMLElement>(".wt-nav-glass");
    if (glass) {
      let frosted: boolean | null = null;
      const frost = (instant = false) => {
        const now = window.scrollY > 4;
        if (now === frosted) return;
        frosted = now;
        animate(
          glass,
          { opacity: now ? 1 : 0 },
          instant || prefersReducedMotion() ? { duration: 0 } : { duration: 0.24, ease: [0.33, 1, 0.68, 1] }
        );
      };
      frost(true);
      const onScroll = () => frost();
      window.addEventListener("scroll", onScroll, { passive: true });
      cleanups.push(() => window.removeEventListener("scroll", onScroll));
    }

    /* Auto-hide (case studies): the bar slides up out of the way while you
       read down and comes back the moment you scroll up, which is when you
       are looking for it. Direction is judged from the last position that
       actually moved the bar, not the last scroll event: sampled per event, a
       slow drag flaps, because sub-pixel jitter keeps changing sign. It never
       goes while it holds keyboard focus or while the card is open (a hover,
       or a stamp landing), and at the very top it is always there. */
    if (autoHide) {
      const reduced = prefersReducedMotion();
      const STEP = 8; // px of travel before it reacts
      let anchor = window.scrollY;
      let away = false;
      const tuck = (on: boolean) => {
        if (on === away) return;
        away = on;
        // its own height, plus a little for the card's shadow
        animate(
          root,
          { y: on ? -(root.offsetHeight + 4) : 0 },
          reduced ? { duration: 0 } : { duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }
        );
      };
      const card = root.querySelector<HTMLElement>(".bc");
      const cardOpen = () => card?.dataset.open === "true";
      const keyboardIn = () => {
        const el = document.activeElement;
        if (!el || !root.contains(el)) return false;
        try {
          return el.matches(":focus-visible");
        } catch {
          return true; // no :focus-visible support: treat any focus as keyboard
        }
      };
      const held = () => keyboardIn() || cardOpen();
      // The card opening (a stamp about to land, or a tap) brings the bar back
      // even without a scroll, so the stamp never flies into a hidden bar.
      const watch = new MutationObserver(() => {
        if (cardOpen()) tuck(false);
      });
      if (card) watch.observe(card, { attributes: true, attributeFilter: ["data-open"] });
      cleanups.push(() => watch.disconnect());
      const onScroll = () => {
        const y = window.scrollY;
        if (y <= 4) {
          tuck(false);
          anchor = y;
          return;
        }
        if (held()) {
          tuck(false);
          anchor = y;
          return;
        }
        const dy = y - anchor;
        if (Math.abs(dy) < STEP) return;
        tuck(dy > 0);
        anchor = y;
      };
      // tabbing into a tucked bar brings it back
      const onFocus = () => tuck(false);
      window.addEventListener("scroll", onScroll, { passive: true });
      root.addEventListener("focusin", onFocus);
      cleanups.push(() => {
        window.removeEventListener("scroll", onScroll);
        root.removeEventListener("focusin", onFocus);
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, [autoHide]);

  return (
    <header className="wt-nav" ref={rootRef}>
      <span className="wt-nav-glass" aria-hidden="true" />
      <div className="wt-nav-inner">
        <BadgeCard onHome={onHome} />
        <nav aria-label="Primary">
          <ul className="wt-nav-links">
            <li>{work}</li>
            <li className="nav-soon-wrap">
              <button type="button" className="nav-mock" aria-describedby="nav-soon">
                GALLERY
                <span className="nav-rule" aria-hidden="true" />
              </button>
              <span id="nav-soon" role="tooltip" className="nav-soon wt-tip">
                Coming soon
              </span>
            </li>
            <li>{about}</li>
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
  );
}

export default function WtNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  /* WORK is a button, not <a href="#work">: this is a HashRouter, so the hash
     is the route. From another page it goes home and asks Home to scroll. */
  const goWork = () => {
    if (pathname === "/" || pathname === "/projects") scrollToId("work");
    else navigate("/", { state: { scrollTo: "work" } });
  };

  /* The star card goes home: from another page it opens Home at the top
     (Home keeps no scroll of its own); on Home it glides back to the top. */
  const goHome = () => {
    const here = pathname === "/";
    if (!here) navigate("/");
    window.scrollTo({ top: 0, behavior: here && !prefersReducedMotion() ? "smooth" : "auto" });
  };

  return (
    <NavBar
      onHome={goHome}
      work={
        <button type="button" onClick={goWork}>
          WORK
          <span className="nav-rule" aria-hidden="true" />
        </button>
      }
      about={
        <Link to="/about" aria-current={pathname === "/about" ? "page" : undefined}>
          ABOUT
          <span className="nav-rule" aria-hidden="true" />
        </Link>
      }
    />
  );
}
