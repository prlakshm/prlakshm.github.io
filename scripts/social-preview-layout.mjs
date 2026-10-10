export const SOCIAL_CANVAS = Object.freeze({ width: 1200, height: 630 });

export const SOCIAL_PREVIEW_BADGES = Object.freeze(["name", "read", "reimagine"]);

export const PAGE_PREVIEWS = Object.freeze([
  Object.freeze({ name: "portfolio-landing-v5.png", url: "/" }),
  Object.freeze({ name: "about-v5.png", url: "/about/" }),
  Object.freeze({ name: "everything-v1.png", url: "/everything/" }),
]);

export const CODEX_FULL_BLEED_CSS = `
  .slide[data-slide="01"] { padding: 0 !important; }
  .slide[data-slide="01"] .hx-frame { inset: 0 !important; }
  .slide[data-slide="01"] .concept-credit { display: none !important; }
`;
