import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { animate } from "motion";
import {
  awardOnArrival,
  earn,
  type BadgeId,
} from "../../components/badges/badgeStore.js";
import {
  beginConceptJourney,
  mountConceptReturnListener,
  opensInNewTab,
} from "../../components/badges/conceptJourney.js";
import { ExternalArrow } from "./WtNav.js";
import { prefersReducedMotion } from "./interactions.js";
import PosterGallery from "./PosterGallery.js";
import PosterRail, { type RailItem } from "./PosterRail.js";
import "./work.css";

/* The work grid.

   Two columns at the nav's own width (Rachel Chen's proportions: the page is
   the grid, gutters are narrow). Every card is ONE 16:10 stage — the product
   loop — and the poster she designed rides on it as a printed card. Order is
   reading order: a heading cell opens each section, and the bagel closes the
   grid so every row is full.

   The default is the gallery (PosterGallery.tsx): all five posters on one
   wall. The poster rail and the earlier single-card treatments stay reachable
   for comparison with ?cards= on the route
   (#/?cards=gallery | rail | still | print | reveal). */

type Variant = "gallery" | "rail" | "print" | "still" | "reveal";
const VARIANTS: Variant[] = ["gallery", "rail", "print", "still", "reveal"];
type CardVariant = Exclude<Variant, "gallery" | "rail">;

type Work = {
  cta?: string;
  id: string;
  title: string;
  tag: string;
  href: string;
  external?: boolean;
  tint: [string, string];
  loopBg: string;
  badge: BadgeId;
  posterAlt: string;
};

const ASSET = "/home/work/";

const CASE_STUDIES: Work[] = [
  {
    id: "surprise-rail",
    title: "Designing a themed rail for HBO Max",
    tag: "Surprise Rail · HBO Max · 2025",
    href: "/surprise-rail/",
    tint: ["#c9b8ff", "#8fa2ff"],
    loopBg: "#0b0b0f",
    badge: "read",
    posterAlt: "Surprise Rail poster: a chrome HBO Max logo.",
  },
  {
    id: "mixr",
    title: "Building a DJ app for beginners",
    tag: "Mixr · iOS DJ App · 2026",
    href: "/mixr/",
    tint: ["#ff5fa2", "#38c6ff"],
    loopBg: "#0a0c18",
    badge: "read",
    posterAlt: "Mixr poster: MIXR DJ App set over glass tiles of heat-map colour.",
  },
  {
    id: "pinnables",
    title: "Sending browser annotations to coding agents",
    tag: "Pinnables · Devtool · 2026",
    href: "https://github.com/prlakshm/pinnables",
    external: true,
    cta: "IN PROGRESS · VIEW TOOL",
    tint: ["#89c7f7", "#2451d4"],
    loopBg: "#ffffff",
    badge: "read",
    posterAlt: "Pinnables poster: PINNABLES spelled in a dot-matrix of pins.",
  },
];

const CONCEPTS: Work[] = [
  {
    id: "figma-sound",
    title: "Sound as a new design system material",
    tag: "Figma Sound · Concept · 2026",
    href: "/figma/",
    cta: "VIEW CONCEPT",
    tint: ["#b79cff", "#f4c430"],
    loopBg: "#ededed",
    badge: "reimagine",
    posterAlt: "Figma Sound poster: the wordmark with the launch film's sound icons orbiting it.",
  },
  {
    id: "codex-bookmarks",
    title: "Bookmarking messages in long AI chats",
    tag: "Codex Bookmarks · Concept · 2026",
    href: "/codex/",
    cta: "VIEW CONCEPT",
    tint: ["#a7a6ff", "#3b46ff"],
    loopBg: "#ffffff",
    badge: "reimagine",
    posterAlt: "Codex Bookmarks poster: the word Bookmarks balanced like a seesaw on a doodled Codex cloud, with Codex on one end and a pink bookmark on the other.",
  },
];

/* The third poster of the concepts row: the way into Everything. */
const EVERYTHING_ITEM: RailItem = {
  id: "everything",
  title: "Everything else I make",
  tag: "Posters · Motion · On X",
  href: "https://x.com/pranavibuilds",
  external: true,
  cta: "COMING SOON · VIEW ON X",
  badge: "bagel",
  posterAlt: "",
  everything: true,
};

const centre = (el: Element) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

/* Resting pose of the print, per treatment. Motion owns the print's transform,
   so the rest pose lives here rather than in CSS. */
const PRINT_REST: Record<CardVariant, { rotate: number; x: string | number; y: number; z: number; scale: number }> = {
  print: { rotate: -3, x: 0, y: 0, z: 0, scale: 1 },
  still: { rotate: -2.5, x: 0, y: 0, z: 0, scale: 1 },
  reveal: { rotate: -8, x: "-135%", y: 0, z: 0, scale: 1 },
};
const PRINT_LIT: Record<CardVariant, { rotate: number; x: string | number; y: number; z: number; scale: number }> = {
  print: { rotate: 0, x: 0, y: -6, z: 46, scale: 1.035 },
  still: { rotate: 0, x: 0, y: -4, z: 34, scale: 1.03 },
  reveal: { rotate: -3, x: 0, y: 0, z: 30, scale: 1 },
};

function WorkCard({ work, variant }: { work: Work; variant: CardVariant }) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  /* Loops play on their own while on screen and rest off it. With reduced
     motion they hold their first frame until hovered. */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (prefersReducedMotion()) {
      v.removeAttribute("autoplay");
      v.pause();
      return;
    }
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { rootMargin: "160px 0px" }
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  /* Glass: the stage tilts toward the cursor while the light stays put, and
     the printed poster floats above the screen, so the tilt gives parallax. */
  useEffect(() => {
    const card = cardRef.current;
    const stage = stageRef.current;
    const print = printRef.current;
    if (!card || !stage || !print) return;
    const reduced = prefersReducedMotion();
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const spec = stage.querySelector<HTMLElement>(".wk-spec");
    const pspec = print.querySelector<HTMLElement>(".wk-pspec");
    const uv = print.querySelector<HTMLElement>(".wk-uv");
    const MAX = 5;
    const spring = { type: "spring", stiffness: 220, damping: 24 } as const;
    const printSpring = { type: "spring", stiffness: 260, damping: 22 } as const;

    // Touch screens have no hover, so a revealed print simply rests in view.
    const rest = variant === "reveal" && !fine ? PRINT_LIT.reveal : PRINT_REST[variant];
    animate(print, rest, { duration: 0 });

    const enter = (e: PointerEvent) => {
      card.classList.add("is-lit");
      if (reduced && videoRef.current) videoRef.current.play().catch(() => {});
      if (fine) animate(print, PRINT_LIT[variant], reduced ? { duration: 0 } : printSpring);
    };
    const move = (e: PointerEvent) => {
      if (reduced || !fine) return;
      const r = stage.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      animate(stage, { rotateY: px * MAX * 2, rotateX: -py * MAX * 1.6 }, spring);
      const glare = `${50 - px * 120 + py * 14}% 0`;
      if (spec) spec.style.backgroundPosition = glare;
      if (pspec) pspec.style.backgroundPosition = glare;
      if (uv) uv.style.backgroundPosition = `${50 - px * 80}% 0`;
    };
    const leave = () => {
      card.classList.remove("is-lit");
      if (reduced && videoRef.current) videoRef.current.pause();
      if (fine) {
        animate(print, PRINT_REST[variant], reduced ? { duration: 0 } : printSpring);
        if (!reduced) animate(stage, { rotateY: 0, rotateX: 0 }, spring);
      }
    };
    const focus = () => card.classList.add("is-lit");
    const blur = () => card.classList.remove("is-lit");

    card.addEventListener("pointerenter", enter);
    card.addEventListener("pointermove", move);
    card.addEventListener("pointerleave", leave);
    card.addEventListener("focus", focus);
    card.addEventListener("blur", blur);
    return () => {
      card.removeEventListener("pointerenter", enter);
      card.removeEventListener("pointermove", move);
      card.removeEventListener("pointerleave", leave);
      card.removeEventListener("focus", focus);
      card.removeEventListener("blur", blur);
    };
  }, [work.badge, variant]);

  /* Opening a concept starts a visit. Its destination and the later return
     complete the award; ordinary case-study links do not earn on landing. */
  const onOpen = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (work.badge !== "reimagine") return;
    beginConceptJourney(new URL(work.href, window.location.href).pathname, {
      newTab: opensInNewTab(e),
    });
  };

  const poster = `${ASSET}${work.id}-poster.webp`;

  return (
    <a
      className={`wk-card wk-card--${variant}`}
      ref={cardRef}
      href={work.href}
      onClick={onOpen}
      onAuxClick={onOpen}
      {...(work.external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      <div
        className="wk-stage"
        ref={stageRef}
        style={
          {
            "--t1": work.tint[0],
            "--t2": work.tint[1],
            "--loop-bg": work.loopBg,
            "--poster": `url("${poster}")`,
          } as React.CSSProperties
        }
      >
        <span className="wk-glow" aria-hidden="true" />
        {variant === "still" && <span className="wk-backdrop" aria-hidden="true" />}
        <div className="wk-screen">
          <video
            ref={videoRef}
            src={`${ASSET}wide/${work.id}.mp4`}
            poster={`${ASSET}wide/${work.id}.jpg`}
            muted
            loop
            playsInline
            autoPlay
            preload="metadata"
            aria-label={`${work.tag.split(" · ")[0]} prototype, looping`}
          />
          <span className="wk-spec" aria-hidden="true" />
          <span className="wk-rim" aria-hidden="true" />
        </div>
        <div className="wk-print" ref={printRef}>
          <img src={poster} alt={work.posterAlt} loading="lazy" decoding="async" />
          <span className="wk-uv" aria-hidden="true" />
          <span className="wk-tex" aria-hidden="true" />
          <span className="wk-pspec" aria-hidden="true" />
          <span className="wk-rim" aria-hidden="true" />
        </div>
      </div>
      <div className="wk-meta">
        <span className="wk-title">{work.title}</span>
        <span className="wk-tag">
          {work.tag}
          {work.external && <ExternalArrow />}
        </span>
      </div>
    </a>
  );
}

function SectionHead({ index, title, sub }: { index: string; title: string; sub: string }) {
  return (
    <div className="wk-head">
      <p className="wk-kicker">{index}</p>
      <h2 className="wk-h">{title}</h2>
      <p className="wk-sub">{sub}</p>
    </div>
  );
}

const EVERYTHING = [
  { src: "petal-press", style: { left: "6%", top: "10%", width: "15%", rotate: "-7deg" } },
  { src: "cursor-loves-indie", style: { left: "17%", top: "60%", width: "23%", rotate: "4deg" } },
  { src: "mixr-cloud", style: { right: "21%", top: "7%", width: "14%", rotate: "6deg" } },
  { src: "shell-drop", style: { right: "6%", top: "44%", width: "15%", rotate: "-5deg" } },
  { src: "emotion", style: { left: "41%", top: "66%", width: "12%", rotate: "-3deg" } },
];

function EverythingCard() {
  const bagelRef = useRef<HTMLSpanElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bagel = bagelRef.current;
    const stage = stageRef.current;
    if (!bagel || !stage) return;
    const reduced = prefersReducedMotion();
    const spring = { type: "spring", stiffness: 300, damping: 14 } as const;
    let t = 0;
    const minis = Array.from(stage.querySelectorAll<HTMLElement>(".wk-mini"));
    const on = () => {
      if (!reduced) {
        animate(bagel, { rotate: -12, y: -8, scale: 1.06 }, spring);
        minis.forEach((m, i) =>
          animate(m, { y: i % 2 ? 6 : -6, x: i % 2 ? -4 : 4 }, { type: "spring", stiffness: 160, damping: 16 })
        );
      }
      // Finding the bagel: rest on it for a beat.
      t = window.setTimeout(() => earn("bagel", centre(bagel)), 600);
    };
    const off = () => {
      window.clearTimeout(t);
      if (reduced) return;
      animate(bagel, { rotate: 0, y: 0, scale: 1 }, spring);
      minis.forEach((m) => animate(m, { y: 0, x: 0 }, { type: "spring", stiffness: 160, damping: 18 }));
    };
    bagel.addEventListener("pointerenter", on);
    bagel.addEventListener("pointerleave", off);
    return () => {
      window.clearTimeout(t);
      bagel.removeEventListener("pointerenter", on);
      bagel.removeEventListener("pointerleave", off);
    };
  }, []);

  return (
    <a
      className="wk-card wk-every"
      href="https://x.com/pranavibuilds"
      target="_blank"
      rel="noreferrer"
      onClick={() => bagelRef.current && earn("bagel", centre(bagelRef.current))}
    >
      <div className="wk-stage wk-stage--canvas" ref={stageRef}>
        {EVERYTHING.map((m) => (
          <span key={m.src} className="wk-mini" style={m.style as React.CSSProperties}>
            <img src={`${ASSET}everything/${m.src}.webp`} alt="" loading="lazy" decoding="async" />
          </span>
        ))}
        <span className="wk-bagel" ref={bagelRef}>
          <svg viewBox="0 0 120 92" aria-hidden="true" focusable="false">
            <ellipse cx="60" cy="52" rx="54" ry="33" fill="#c98a4b" />
            <ellipse cx="60" cy="46" rx="54" ry="33" fill="#e3a866" stroke="#3a2a1d" strokeWidth="2" />
            <ellipse cx="60" cy="44" rx="45" ry="25" fill="#edbb7c" />
            <ellipse cx="60" cy="46" rx="13" ry="7.5" fill="#fafafa" stroke="#3a2a1d" strokeWidth="2" />
            <g fill="#3a2a1d">
              <circle cx="33" cy="32" r="1.7" />
              <circle cx="44" cy="25" r="1.5" />
              <circle cx="79" cy="27" r="1.7" />
              <circle cx="91" cy="40" r="1.5" />
              <circle cx="28" cy="50" r="1.6" />
              <circle cx="85" cy="57" r="1.7" />
              <circle cx="51" cy="63" r="1.5" />
              <circle cx="68" cy="22" r="1.4" />
            </g>
            <g fill="#f7eedc" stroke="#3a2a1d" strokeWidth="0.8">
              <ellipse cx="40" cy="38" rx="2.4" ry="1.3" transform="rotate(-20 40 38)" />
              <ellipse cx="72" cy="31" rx="2.4" ry="1.3" transform="rotate(25 72 31)" />
              <ellipse cx="95" cy="49" rx="2.4" ry="1.3" transform="rotate(-10 95 49)" />
              <ellipse cx="64" cy="64" rx="2.4" ry="1.3" transform="rotate(15 64 64)" />
              <ellipse cx="22" cy="44" rx="2.4" ry="1.3" transform="rotate(30 22 44)" />
            </g>
          </svg>
        </span>
        <span className="wk-rim" aria-hidden="true" />
      </div>
      <div className="wk-meta">
        <span className="wk-title">Everything else I make</span>
        <span className="wk-tag">
          Posters · Motion · On X
          <ExternalArrow />
        </span>
      </div>
    </a>
  );
}

export default function WorkGrid() {
  const { search } = useLocation();
  useEffect(
    () => mountConceptReturnListener(() => awardOnArrival("reimagine")),
    [],
  );
  const asked = new URLSearchParams(search).get("cards") as Variant | null;
  const variant: Variant = asked && VARIANTS.includes(asked) ? asked : "gallery";

  if (variant === "gallery") {
    return (
      <section className="wk wk--gallery" id="work" aria-label="Work">
        <PosterGallery
          groups={[
            { index: "01", title: "Case studies", items: CASE_STUDIES },
            { index: "02", title: "Products reimagined", items: CONCEPTS },
          ]}
        />
      </section>
    );
  }

  if (variant === "rail") {
    return (
      <section className="wk wk--rail" id="work" aria-label="Work">
        <PosterRail
          index="01"
          title="Case studies"
          sub="Real products, real constraints, from research to built."
          items={CASE_STUDIES}
        />
        <PosterRail
          index="02"
          title="Products reimagined"
          sub="Interfaces I love, redesigned and built as concepts."
          items={[...CONCEPTS, EVERYTHING_ITEM]}
        />
      </section>
    );
  }

  return (
    <section className="wk" id="work" aria-label="Work" data-cards={variant}>
      <div className="wk-grid">
        <SectionHead
          index="01"
          title="Case studies"
          sub="Real products, real constraints, from research to built."
        />
        {CASE_STUDIES.map((w) => (
          <WorkCard key={`${w.id}-${variant}`} work={w} variant={variant} />
        ))}
        <SectionHead
          index="02"
          title="Products reimagined"
          sub="Interfaces I love, redesigned and built as concepts."
        />
        {CONCEPTS.map((w) => (
          <WorkCard key={`${w.id}-${variant}`} work={w} variant={variant} />
        ))}
        <EverythingCard />
      </div>
    </section>
  );
}
