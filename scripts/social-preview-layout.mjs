export const SOCIAL_CANVAS = Object.freeze({ width: 1200, height: 630 });

export const COLLAGE_WINDOWS = Object.freeze([
  Object.freeze({
    name: "desktop",
    browser: "chrome",
    x: 18,
    y: 18,
    width: 466,
    height: 230,
    viewportWidth: 1280,
    viewportHeight: 544,
  }),
  Object.freeze({
    name: "tablet",
    browser: "chrome",
    x: 498,
    y: 18,
    width: 316,
    height: 230,
    viewportWidth: 768,
    viewportHeight: 481,
  }),
  Object.freeze({
    name: "safari",
    browser: "safari",
    x: 828,
    y: 18,
    width: 354,
    height: 230,
    viewportWidth: 1024,
    viewportHeight: 573,
  }),
  Object.freeze({
    name: "phone",
    browser: "chrome",
    x: 18,
    y: 262,
    width: 260,
    height: 350,
    viewportWidth: 390,
    viewportHeight: 477,
  }),
  Object.freeze({
    name: "wide",
    browser: "chrome",
    x: 292,
    y: 262,
    width: 890,
    height: 350,
    viewportWidth: 1440,
    viewportHeight: 515,
  }),
]);

export const CODEX_FULL_BLEED_CSS = `
  .slide[data-slide="01"] { padding: 0 !important; }
  .slide[data-slide="01"] .hx-frame { inset: 0 !important; }
  .slide[data-slide="01"] .concept-credit { display: none !important; }
`;
