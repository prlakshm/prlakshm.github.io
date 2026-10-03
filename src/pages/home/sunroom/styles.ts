/* ==========================================================================
   Sunroom — three studies of the same light.

   The room, the sketch and the sun's angle never change. What changes is the
   glass the light comes through, and so everything it does afterwards.
   ========================================================================== */

import { PANE_COLS, PANE_ROWS, type LightStyle } from "./light.js";
import type { V3 } from "./scene.js";

export type RoomVariant = "golden" | "stained" | "moon";
export const VARIANTS: RoomVariant[] = ["golden", "stained", "moon"];

export interface RoomStyle {
  /** Shown beside the picker. */
  label: string;
  light: LightStyle;
  /** The colour of a mote of dust catching the light, 0–255. */
  mote: [number, number, number];
  /** What the light does to white paper at the far end of the room, where the
      furniture stands, 0–255. */
  sun: [number, number, number];
}

/** 20 panes: index = column * 5 + row. Columns run left to right along the
    wall (two per leaf); row 0 is nearest the floor. */
const grid = (at: (col: number, row: number) => V3): V3[] => {
  const out: V3[] = [];
  for (let c = 0; c < PANE_COLS; c++) for (let r = 0; r < PANE_ROWS; r++) out.push(at(c, r));
  return out;
};

/* Clear glass shows the sky at the top of the doors and the garden's warmth
   toward the bottom. */
const CLEAR_GLASS: V3[] = [
  [1.0, 0.985, 0.94],
  [0.99, 0.985, 0.955],
  [0.97, 0.98, 0.98],
  [0.945, 0.967, 0.993],
  [0.92, 0.955, 1.0],
];

const GOLDEN: LightStyle = {
  paneLight: grid(() => [1.0, 0.89, 0.69]),
  paneGlass: grid((_, r) => CLEAR_GLASS[r]),
  wall: [0.94, 0.94, 0.962],
  shade: [0.9, 0.906, 0.948],
  room: 1,
  beam: 1.05,
  streak: 0.85,
  soft: 0.0046,
  ripple: 0.004,
  mottle: 0.2,
  chroma: 0.001,
  bloom: 0.2,
  gloss: 0.85,
  grade: [0.6, 0.25],
  lace: 0,
  stars: 0,
  leaf: 1,
  drift: 0.1,
};

/* The hour after golden, leaded on the diagonal: gold at the head of the
   left-hand leaf, through apricot and rose to lilac and sky at the foot of
   the right. The top row is the one whose light crosses the whole room, and
   each column of it is a ray of its own — so the four rays that reach the
   chairs arrive gold, apricot, rose and lilac, side by side.
   Every colour is a multiplier: what that pane's light does to white paper. */
const DUSK: V3[] = [
  [1.0, 0.86, 0.55], // gold
  [1.0, 0.77, 0.6], // apricot
  [1.0, 0.69, 0.77], // rose
  [0.86, 0.74, 1.0], // lilac
  [0.74, 0.78, 1.0], // periwinkle
  [0.64, 0.83, 1.0], // sky
];
const DUSK_GLASS: V3[] = [
  [1.0, 0.89, 0.62],
  [1.0, 0.81, 0.67],
  [1.0, 0.75, 0.82],
  [0.88, 0.79, 1.0],
  [0.78, 0.82, 1.0],
  [0.7, 0.86, 1.0],
];
/** One step along for each pane across, and for each pane down. */
const dusk = (col: number, row: number) => Math.min(DUSK.length - 1, PANE_ROWS - 1 - row + col);

const STAINED: LightStyle = {
  ...GOLDEN,
  paneLight: grid((c, r) => DUSK[dusk(c, r)]),
  paneGlass: grid((c, r) => DUSK_GLASS[dusk(c, r)]),
  shade: [0.905, 0.905, 0.94],
  beam: 1.15,
  streak: 0.7,
  // softer sun, so neighbouring colours run into each other across the room
  soft: 0.007,
  // cathedral glass: rolled, never flat
  ripple: 0.007,
  mottle: 0.62,
  chroma: 0.0016,
  bloom: 0.26,
  // the colours are the point: let them stay themselves across the room
  grade: [0.06, 0.03],
  leaf: 0,
};

/* The same doors at night. The room is deep blue; what comes through the
   glass is the moon — silver, a little cool — and it is the only thing in the
   room that is not blue. The glass itself holds the night sky. */
const MOON: LightStyle = {
  ...GOLDEN,
  paneLight: grid((_, r) => [0.86 + r * 0.01, 0.92 + r * 0.008, 1.0]),
  paneGlass: grid((_, r) => [0.4 - r * 0.02, 0.48 - r * 0.02, 0.74 - r * 0.01]),
  // the walls are left alone; the floor falls into night around the light,
  // which is what makes the pale moonlight read as light at all
  shade: [0.5, 0.56, 0.8],
  room: 1,
  stars: 1,
  beam: 1.0,
  streak: 0.7,
  // the moon is the sun's size in the sky, and there is no haze to soften it
  soft: 0.0042,
  mottle: 0.12,
  chroma: 0.0004,
  bloom: 0.12,
  gloss: 0.95,
  grade: [0, 0],
  leaf: 1,
  drift: 0.16,
};

/** The far end of the floor is lit through the top row of panes, and has had
    the whole room to deepen in. */
function farLight(light: LightStyle): [number, number, number] {
  const top = Array.from({ length: PANE_COLS }, (_, c) => light.paneLight[c * PANE_ROWS + PANE_ROWS - 1]);
  const avg = (c: number) => top.reduce((sum, p) => sum + p[c], 0) / top.length;
  const deepen = [1, 1 + light.grade[0], 1 + light.grade[1]];
  return [0, 1, 2].map((c) => Math.round(255 * (1 - Math.min(1, (1 - avg(c)) * deepen[c])))) as [number, number, number];
}

export const STYLES: Record<RoomVariant, RoomStyle> = {
  golden: { label: "Golden hour", light: GOLDEN, mote: [255, 252, 240], sun: farLight(GOLDEN) },
  stained: { label: "Stained glass", light: STAINED, mote: [255, 255, 255], sun: farLight(STAINED) },
  moon: { label: "Moonlight", light: MOON, mote: [228, 238, 255], sun: farLight(MOON) },
};

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mix3 = (a: V3, b: V3, t: number): V3 => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

/** One light turning into another, for the change of glass. */
export function mixLight(a: LightStyle, b: LightStyle, t: number): LightStyle {
  if (t <= 0) return a;
  if (t >= 1) return b;
  return {
    paneLight: a.paneLight.map((c, i) => mix3(c, b.paneLight[i], t)),
    paneGlass: a.paneGlass.map((c, i) => mix3(c, b.paneGlass[i], t)),
    wall: mix3(a.wall, b.wall, t),
    shade: mix3(a.shade, b.shade, t),
    room: mix(a.room, b.room, t),
    beam: mix(a.beam, b.beam, t),
    streak: mix(a.streak, b.streak, t),
    soft: mix(a.soft, b.soft, t),
    ripple: mix(a.ripple, b.ripple, t),
    mottle: mix(a.mottle, b.mottle, t),
    chroma: mix(a.chroma, b.chroma, t),
    bloom: mix(a.bloom, b.bloom, t),
    gloss: mix(a.gloss, b.gloss, t),
    grade: [mix(a.grade[0], b.grade[0], t), mix(a.grade[1], b.grade[1], t)],
    lace: mix(a.lace, b.lace, t),
    stars: mix(a.stars, b.stars, t),
    leaf: mix(a.leaf, b.leaf, t),
    drift: mix(a.drift, b.drift, t),
  };
}

export const mixRgb = (a: RoomStyle["mote"], b: RoomStyle["mote"], t: number): RoomStyle["mote"] => [
  Math.round(mix(a[0], b[0], t)),
  Math.round(mix(a[1], b[1], t)),
  Math.round(mix(a[2], b[2], t)),
];
