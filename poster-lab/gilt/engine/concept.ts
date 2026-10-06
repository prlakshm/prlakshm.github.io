/* A concept is data, not code: concept.json + layout.json + two atlases + the
   under-painting maps, all in concepts/<id>/. This file holds the engine's
   defaults (plan §2.4 / §2.5 / §2.6), the loader, and the &ab= overrides.

   Asset contract (engine <-> bake):
   - atlas_print.png  RGBA8 straight alpha, power of two, 2 texels per CSS px.
                      RGB = printed colour (sRGB), A = coverage.
   - atlas_fx.png     RGB8 lossless, same size: R foil 0..1, G pearl 0..1,
                      B height (0.08 paper .. ~0.59 foil plateau; the shoulder
                      spills ~2 CSS px past coverage).
   - layout.json      { atlas:{w,h}, pieces:[{ id, rect:[x,y,w,h] (atlas px incl.
                      a 6-texel margin), anchor:[ax,ay] (fraction of rect),
                      desktop:{x,y (band fractions, y down), h (rect height in band
                      heights), rot (rad), flip}, mobile: same | null, z, keep,
                      phase, breathe }] }
   - under_d.png / under_m.png  band-space RGBA: R cloud, G willow, B lavender, A sun path.
   - concept.json     { name, pitch, lighting, motion, flags, water, coverage, ... } */

export type Placement = { x: number; y: number; h: number; rot?: number; flip?: boolean };
export type PieceDef = {
  id: string;
  rect: [number, number, number, number];
  anchor?: [number, number];
  desktop: Placement | null;
  mobile?: Placement | null;
  z?: number;
  keep?: number;
  phase?: number;
  breathe?: number;
  kind?: string;
  tilt?: [number, number]; // base tilt of the piece's normal, rad (+x right, +y up)
  warp?: number; // FOIL_WARP: how much this piece bends (0..1, default 1)
  warpAnchor?: number; // FOIL_WARP: 1 = top pinned, bend grows down the piece (default 0 = uniform)
};
export type HeroSpec = string | { desktop?: [number, number]; mobile?: [number, number] };
export type Layout = { atlas: { w: number; h: number }; pieces: PieceDef[]; hero?: HeroSpec };

type Num = number;
export const DEFAULTS = {
  lighting: {
    RELIEF: 2.1 as Num, // slope gain per CSS px (Ann's 2.6 per texel at 0.41 CSS px/texel)
    FLOOR: 0.42 as Num, // metal at rest = print x FLOOR (linear)
    NORMAL_TAP: 1 as Num, // normal = central difference over +-this many device px (1.5 calms pixel glitter, keeps the shoulder)
    PERSP: 0.25 as Num, // view-vector perspective (1 = true; 0.25 keeps the band's ends alive)
    EYE_Z: 900 as Num,
    LAMP_Z_K: 1.6 as Num, // lamp height = clamp(K * H, MIN, MAX) CSS px
    LAMP_Z_MIN: 290 as Num,
    LAMP_Z_MAX: 540 as Num,
    AMBIENT: 0.25 as Num,
    key: { strength: 2.4, c: [-0.22, 0.16], hs: [0.3, 0.17], soft: 0.12, fall: 0.45 },
    strip: { strength: 1.9, c: [0.4, -0.02], hs: [0.045, 0.55], soft: 0.06 },
    bounce: { strength: 0.7, c: [0.0, -0.5], hs: [0.9, 0.06], soft: 0.18 },
    // not in Ann's studio: a soft sky toward the key side, seen only by steep facets
    // (the shoulder). Gives a lit rim up-left and a dark rim down-right. 0 = plan studio.
    dome: { strength: 1.6, dir: [-0.45, 0.55], range: [0.32, 1.0] },
    CAUGHT: [0.35, 2.4],
    TINT: [1.0, 0.72, 0.3],
    GLOW_K: 0.95 as Num,
    CAUGHT3_K: 0.6 as Num,
    HOT_K: 2.4 as Num,
    PAPER_GLOW: 0.03 as Num,
    HOT_EXP: 220 as Num,
    GLOW_EXP: 28 as Num,
    TOOTH: 0.08 as Num, // paper tooth slope
    PAPER: [0.8, 0.26], // ground shading: paperCol * (a + b * N.Lkey), normalised so flat paper keeps its painted value
    NEAR_R: 2 as Num, // tight blurred-coverage sigma, CSS px (contact step, pool inner edge)
    NEAR_G: 8 as Num, // wide blurred-coverage sigma, CSS px (pooled shade, dither fade)
    KEY_DIR: [-0.45, 0.55, 0.7], // the paper's key light (y up)
    POOL: 0.32 as Num, // pooled periwinkle shade around pieces
    POOL_K: 0.8 as Num, // how much of the tight blur is subtracted (keeps the pool off the very edge)
    POOL_COL: "#6F86C6",
    POOL_NOISE: 0.4 as Num,
    POOL_SCALE: 9 as Num,
    CONTACT: 0.6 as Num, // contact step on the shadow side (x the blurred-coverage difference, ~0.2 at the edge -> ~12%)
    CONTACT_OFF: 1.2 as Num, // CSS px toward the key light
    PEARL: 1.0 as Num,
    PEARL_MIX: 0.35 as Num,
    GRAIN: 0.03 as Num, // plan value; 0.025 (with DITHER_AMT 0.45) brings the ground's fine grain to ~0.0116 (<= 0.012)
    GRAIN_HZ: 24 as Num,
    SWELL_AMP: 0.06 as Num, // SWELL_TILT: rad of swell slope added to foil normals
    INV_PAINT: 0.32 as Num, // INVERT_RELIEF: paint plateau above the leaf
    INV_K: 0.5 as Num, // INVERT_RELIEF: how deep the leaf sits
    IMPASTO: 0.35 as Num, // INVERT_RELIEF: paint ridges from the painted ground's value
  },
  motion: {
    T0: 31834 as Num, // water clock start (balanced teal / blue)
    DRIFT: 3.5 as Num,
    FIELD_TIME: 42 as Num,
    SWAY_YAW: [0.07, 7.0, 0.018, 2.7], // amp1, period1, amp2, period2 (rad, s)
    SWAY_PITCH: [0.035, 8.6],
    POINTER_SHIFT: [0.14, 0.09],
    SHIFT_RATE: 4 as Num,
    LAMP_HOVER_RATE: 9 as Num,
    LAMP_IDLE_RATE: 3 as Num,
    LAMP_ON_RATE: 4 as Num,
    LAMP_IDLE_ON: 0.7 as Num,
    LAMP_HOVER_ON: 1.0 as Num,
    IDLE_PATH: [0.5, 0.36, 25, 0.4, 0.25, 17, 1.3], // x0, xA, xT, y0, yA, yT, yPhase
    IDLE_FROM_HERO: true, // phase the idle path so it starts over the hero (else the plan's phases)
    SUN_DRIFT: 0.06 as Num,
    SUN_PERIOD: 75 as Num,
    ARRIVAL: 2.2 as Num, // s for the one-time left-to-right sweep
    ARRIVAL_VIS: 0.3 as Num,
    BREATHE: 0.021 as Num, // rad of per-piece tilt from the swell
    RIPPLE_TILT: 0.026 as Num,
    RIPPLE_SPEED: 60 as Num,
    RIPPLE_LIFE: 2.5 as Num,
    TAP_HOLD: 3 as Num,
    WARP_AMP: 1.25 as Num, // FOIL_WARP: CSS px sideways
    WARP_LEN: 140 as Num, // CSS px wavelength down a strand
    WARP_PERIOD: 7.5 as Num, // s
    FINISH_HZ: 60 as Num,
    PAINT_HZ: 30 as Num,
  },
  flags: { FOIL_WARP: false, SWELL_TILT: false, INVERT_RELIEF: false },
  water: {
    SEED: 10 as Num,
    BASE: "#87C1F0",
    DARK: "#9CB3EA",
    LIGHT: "#A1D6DF",
    SUN_TINT: "#C6E7EC",
    CLOUD: ["#E4EAF2", "#BFD5EA"],
    WILLOW: ["#5D85BD", "#4F7398"],
    LAVENDER: ["#BCA9DB", "#D3B7DD"],
    SUN: "#C6E7EC",
    UNDER_K: [0.75, 0.5, 0.55, 0.4], // cloud, willow, lavender, sun
    BROKEN: [0.12, 90, 2.4, 0.6], // broken colour in the field: strength, patch scale CSS px, aspect, size at the top edge
    DAB_BROKEN: [0.65, 0.45, 0.4, 0.35], // broken colour per dab: share of dabs, strength, lavender share, pale share (rest cobalt)
    ACCENTS: ["#B9A6DA", "#DCE6F2", "#6E92C8"], // lavender, pale sky, cobalt
    SPECKLE: 1.5 as Num, // mesq's dry-brush flecks (1-2 px specks of a neighbouring colour) in COMPOSITE
    LEVELS: 16 as Num,
    DITHER_AMT: 0.6 as Num, // mesq's dither x0.6 (plan). Ground hp std measures ~0.014 with this; 0.45 meets <= 0.012
    DITHER_NEAR: [0.05, 0.4], // NEAR.g band over which the dither fades to 0 (~6 CSS px from a piece)
    SW: 16 as Num, // brush (dab) size, CSS px at the bottom edge. Plan said 40; at 279 px tall that paints 150 px bars, not Monet touches
    BRISTLE: 1 as Num, // mesq's fine bristle jitter inside each dab (0 = smooth dabs)
    STEP: 4.5 as Num, // stroke integration step (stroke length ~ 2 x 10 x STEP)
    PERSP_TOP: 0.6 as Num, // dab size and stroke length at the top edge relative to the bottom (the pond recedes)
    FLOW_ANGLE: 0.15 as Num,
    FLOW_CURL: 0.25 as Num,
    WILLOW_VERT: [0.0, 0.6], // willow channel turns the brush vertical: strength 0..1, fades out by this band fraction (y)
  },
  coverage: [0.13, 0.2],
  breakpoint: 900 as Num, // desktop placements at >= this band width
};

export type Config = typeof DEFAULTS & {
  name?: string;
  pitch?: string;
  hero?: string;
  layers?: Record<string, unknown>;
  [k: string]: unknown;
};

export type Concept = {
  id: string;
  base: string;
  config: Config;
  layout: Layout;
  print: HTMLImageElement;
  fx: HTMLImageElement;
  underD: HTMLImageElement | null;
  underM: HTMLImageElement | null;
};

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export function deepMerge<T>(base: T, over: unknown): T {
  if (!isObj(over)) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over)) {
    const b = out[k];
    out[k] = isObj(b) && isObj(v) ? deepMerge(b, v) : v;
  }
  return out as T;
}

/* Concept files may use the plan's / the bake's longer names. Each alias is
   copied onto the engine's name (an explicit engine name in the file wins). */
type Alias = [string, string, ((v: unknown, root: Record<string, unknown>) => unknown)?];
const ALIASES: Alias[] = [
  ["lighting.ambient", "lighting.AMBIENT"],
  ["lighting.caught", "lighting.CAUGHT"],
  ["lighting.key.centre", "lighting.key.c"],
  ["lighting.key.half", "lighting.key.hs"],
  ["lighting.key.falloff", "lighting.key.fall"],
  ["lighting.strip.centre", "lighting.strip.c"],
  ["lighting.strip.half", "lighting.strip.hs"],
  ["lighting.strip.drift", "motion.SUN_DRIFT"],
  ["lighting.strip.period", "motion.SUN_PERIOD"],
  ["lighting.bounce.centre", "lighting.bounce.c"],
  ["lighting.bounce.half", "lighting.bounce.hs"],
  ["lighting.POOL_COLOR", "lighting.POOL_COL"],
  ["lighting.POOL_NOISE", "lighting.POOL_SCALE", (v) => (typeof v === "number" && v > 1.5 ? v : undefined)],
  ["lighting.CONTACT_OFFSET", "lighting.CONTACT_OFF"],
  ["lighting.LKEY", "lighting.KEY_DIR"],
  ["lighting.PEARL.mix", "lighting.PEARL_MIX"],
  ["motion.water.DRIFT", "motion.DRIFT"],
  ["motion.water.FIELD_TIME", "motion.FIELD_TIME"],
  ["motion.water.START_T", "motion.T0"],
  ["motion.sway.yaw", "motion.SWAY_YAW", (v) => (Array.isArray(v) ? (v as unknown[]).flat() : v)],
  ["motion.sway.pitch", "motion.SWAY_PITCH", (v) => (Array.isArray(v) ? (v as unknown[]).flat() : v)],
  ["motion.pointer_shift.k", "motion.POINTER_SHIFT"],
  ["motion.pointer_shift.rate", "motion.SHIFT_RATE"],
  ["motion.lamp_hover.follow", "motion.LAMP_HOVER_RATE"],
  ["motion.lamp_hover.on", "motion.LAMP_HOVER_ON"],
  ["motion.lamp_hover.on_rate", "motion.LAMP_ON_RATE"],
  ["motion.idle.on", "motion.LAMP_IDLE_ON"],
  ["motion.idle.follow", "motion.LAMP_IDLE_RATE"],
  ["motion.idle", "motion.IDLE_PATH", (v) => {
    const o = v as { x?: number[]; y?: number[] };
    return Array.isArray(o?.x) && Array.isArray(o?.y) ? [o.x[0], o.x[1], o.x[2], o.y[0], o.y[1], o.y[2], o.y[3] ?? 1.3] : undefined;
  }],
  ["motion.sun.drift", "motion.SUN_DRIFT"],
  ["motion.sun.period", "motion.SUN_PERIOD"],
  ["motion.arrival_sweep.visible", "motion.ARRIVAL_VIS"],
  ["motion.arrival_sweep.duration", "motion.ARRIVAL"],
  ["motion.breathe.amp", "motion.BREATHE"],
  ["motion.ripple.speed", "motion.RIPPLE_SPEED"],
  ["motion.ripple.tilt", "motion.RIPPLE_TILT"],
  ["motion.ripple.life", "motion.RIPPLE_LIFE"],
  ["motion.touch.tap_hold", "motion.TAP_HOLD"],
  ["motion.grain_hz", "lighting.GRAIN_HZ"],
  ["motion.pacing.finish_hz", "motion.FINISH_HZ"],
  ["motion.pacing.paint_hz", "motion.PAINT_HZ"],
  ["water.base", "water.BASE"],
  ["water.dark", "water.DARK"],
  ["water.light", "water.LIGHT"],
  ["water.sunTint", "water.SUN_TINT"],
  ["water.under.cloud.colours", "water.CLOUD"],
  ["water.under.willow.colours", "water.WILLOW"],
  ["water.under.lavender.colours", "water.LAVENDER"],
  ["water.under.sun.colour", "water.SUN"],
  ["water.under", "water.UNDER_K", (v) => {
    const u = v as Record<string, { strength?: number }>;
    const k = ["cloud", "willow", "lavender", "sun"].map((n) => u?.[n]?.strength);
    return k.every((x) => typeof x === "number") ? k : undefined;
  }],
  ["water.flow.angle_noise", "water.FLOW_ANGLE"],
  ["water.flow.curl", "water.FLOW_CURL"],
  ["water.strokes.SW", "water.SW"],
  ["water.strokes.STEP", "water.STEP"],
  ["water.dither.levels", "water.LEVELS"],
  ["water.dither.amount", "water.DITHER_AMT"],
  ["water.dither.fade_near_foil", "water.DITHER_NEAR"],
  ["assets.print", "layers.print"],
  ["assets.fx", "layers.fx"],
  ["assets.under.desktop", "layers.under_d"],
  ["assets.under.mobile", "layers.under_m"],
  ["assets.breakpoint_css", "breakpoint"],
];
const getPath = (o: unknown, path: string) => path.split(".").reduce<unknown>((a, k) => (isObj(a) ? a[k] : undefined), o);
const setPath = (o: Record<string, unknown>, path: string, v: unknown) => {
  const ks = path.split(".");
  let a = o;
  for (const k of ks.slice(0, -1)) {
    if (!isObj(a[k])) a[k] = {};
    a = a[k] as Record<string, unknown>;
  }
  a[ks[ks.length - 1]] = v;
};
export function normalizeConfig(raw: unknown): { cfg: Record<string, unknown>; mapped: string[] } {
  const cfg = structuredClone((isObj(raw) ? raw : {}) as Record<string, unknown>);
  const mapped: string[] = [];
  for (const [from, to, fn] of ALIASES) {
    const v = getPath(raw, from);
    if (v === undefined) continue;
    const explicit = getPath(raw, to);
    if (explicit !== undefined && to !== from && !isObj(explicit)) continue;
    const val = fn ? fn(v, cfg) : v;
    if (val === undefined) continue;
    setPath(cfg, to, val);
    mapped.push(`${from}->${to}`);
  }
  // PEARL given as an object of weights: its amount is 1
  const pl = getPath(cfg, "lighting.PEARL");
  if (isObj(pl)) setPath(cfg, "lighting.PEARL", 1);
  return { cfg, mapped };
}

/* Every value the engine reads must have its default's type (and length, for
   arrays); anything else falls back to the default, with a warning. */
export function validateConfig(cfg: Record<string, unknown>, def: unknown = DEFAULTS, path = ""): string[] {
  const warn: string[] = [];
  if (!isObj(def)) return warn;
  for (const [k, dv] of Object.entries(def)) {
    const p = path ? `${path}.${k}` : k;
    const v = cfg[k];
    if (v === undefined) {
      cfg[k] = structuredClone(dv);
      continue;
    }
    if (isObj(dv)) {
      if (!isObj(v)) {
        warn.push(`${p}: expected an object, kept the default`);
        cfg[k] = structuredClone(dv);
      } else warn.push(...validateConfig(v, dv, p));
      continue;
    }
    const ok =
      typeof dv === "number" ? typeof v === "number" && isFinite(v)
      : typeof dv === "boolean" ? typeof v === "boolean"
      : typeof dv === "string" ? typeof v === "string" && (!dv.startsWith("#") || /^#[0-9a-f]{6}$/i.test(v))
      : Array.isArray(dv) ? Array.isArray(v) && v.length === dv.length && v.every((x, i) => typeof x === typeof dv[i] && (typeof x !== "number" || isFinite(x)))
      : true;
    if (!ok) {
      warn.push(`${p}: ${JSON.stringify(v)} is not like ${JSON.stringify(dv)}, kept the default`);
      cfg[k] = structuredClone(dv);
    }
  }
  return warn;
}

const parseVal = (s: string): unknown => {
  const t = s.trim();
  if (t === "true") return true;
  if (t === "false") return false;
  if (/^\[.*\]$/.test(t)) {
    try {
      return JSON.parse(t);
    } catch {
      /* fall through */
    }
  }
  if (t.includes("|")) return t.split("|").map((x) => (isNaN(Number(x)) ? x : Number(x)));
  if (t !== "" && !isNaN(Number(t))) return Number(t);
  return t;
};

/* &ab=RELIEF:2.6,key.strength:3,flags.FOIL_WARP:true,water.DITHER_AMT:0.4
   An unqualified name is looked for in lighting, motion, water, flags, then top level. */
export function applyAB(cfg: Config, specs: string[]): { cfg: Config; applied: string[] } {
  const applied: string[] = [];
  const root = cfg as unknown as Record<string, unknown>;
  // split on commas that are not inside [ ] so arrays can be given as [a,b,c]
  for (const spec of specs.flatMap((s) => s.split(/,(?![^[]*\])/))) {
    const i = spec.indexOf(":");
    if (i < 1) continue;
    const path = spec.slice(0, i).trim().split(".");
    const val = parseVal(spec.slice(i + 1));
    let full = path;
    if (!["lighting", "motion", "water", "flags", "coverage", "breakpoint", "hero"].includes(path[0])) {
      const group = ["lighting", "motion", "water", "flags"].find((g) => {
        let o: unknown = root[g];
        for (const k of path) {
          if (!isObj(o) || !(k in o)) return false;
          o = (o as Record<string, unknown>)[k];
        }
        return true;
      });
      full = group ? [group, ...path] : path;
    }
    let o = root;
    for (const k of full.slice(0, -1)) {
      if (!isObj(o[k])) o[k] = {};
      o = o[k] as Record<string, unknown>;
    }
    const last = full[full.length - 1];
    const cur = o[last];
    // a single number into an indexed array element: name[i]
    const m = /^(.*)\[(\d+)\]$/.exec(last);
    if (m && Array.isArray(o[m[1]])) {
      (o[m[1]] as unknown[])[Number(m[2])] = val;
    } else {
      o[last] = Array.isArray(cur) && !Array.isArray(val) && typeof val === "number" ? cur.map(() => val) : val;
    }
    applied.push(`${full.join(".")}=${JSON.stringify(val)}`);
  }
  return { cfg, applied };
}

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const im = new Image();
    im.decoding = "async";
    im.onload = () => res(im);
    im.onerror = () => rej(new Error(`could not load ${url}`));
    im.src = url;
  });

export async function loadConcept(id: string, base: string, ab: string[] = []): Promise<Concept & { applied: string[]; mapped: string[]; warnings: string[] }> {
  const dir = `${base}/${id}`;
  const bust = `?v=${Date.now()}`;
  const getJSON = async (name: string) => {
    const r = await fetch(`${dir}/${name}${bust}`);
    if (!r.ok) throw new Error(`${dir}/${name}: HTTP ${r.status}`);
    const text = await r.text();
    // the dev server answers a missing file with its HTML shell (200), not a 404
    if (/^\s*</.test(text)) throw new Error(`${dir}/${name} not found`);
    return JSON.parse(text);
  };
  const [cj, layout] = await Promise.all([getJSON("concept.json"), getJSON("layout.json")]);
  const { cfg: norm, mapped } = normalizeConfig(cj);
  const merged = deepMerge(structuredClone(DEFAULTS) as Config, norm);
  const { cfg, applied } = applyAB(merged, ab);
  const warnings = validateConfig(cfg as unknown as Record<string, unknown>);
  const layers = (cfg.layers ?? {}) as Record<string, string>;
  const [print, fx, underD, underM] = await Promise.all([
    loadImage(`${dir}/${layers.print ?? "atlas_print.png"}${bust}`),
    loadImage(`${dir}/${layers.fx ?? "atlas_fx.png"}${bust}`),
    loadImage(`${dir}/${layers.under_d ?? "under_d.png"}${bust}`).catch(() => null),
    loadImage(`${dir}/${layers.under_m ?? "under_m.png"}${bust}`).catch(() => null),
  ]);
  return { id, base, config: cfg, layout: layout as Layout, print, fx, underD, underM, applied, mapped, warnings };
}

export const hexToLin = (h: string): [number, number, number] => {
  const s = h.replace("#", "");
  return [0, 2, 4].map((i) => Math.pow(parseInt(s.slice(i, i + 2), 16) / 255, 2.2)) as [number, number, number];
};
export const hexToRGB = (h: string): [number, number, number] => {
  const s = h.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255) as [number, number, number];
};
