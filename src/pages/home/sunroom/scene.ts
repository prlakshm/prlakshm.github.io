/* ==========================================================================
   Sunroom — the scene.

   One small room, described in metres, that everything else reads from: the
   ink sketch (sketch.ts) projects it to lines, and the light (light.ts)
   traces the same panes and the same chair legs to decide where the sun
   lands. Nothing is placed by eye twice, so the doodle and the light cannot
   drift apart.

   World axes (the back wall's own frame)
     x  along the back wall, to the right
     y  up
     z  out of the wall, into the room, toward the viewer
   The origin is the middle of the French doors' threshold.

   The room is seen the way the photograph it is drawn from was taken: facing
   the back wall square-on, so the doors are a true elevation, with the left
   wall running back to the corner beside them. It is a one-point perspective
   with the verticals kept vertical. The horizon is set low — a camera on the
   floorboards — because that is what lets a low sun throw its light from the
   doors, under the hero, all the way across to the chairs.

   The chairs and table are the exception. So far off to one side, a true
   perspective would stretch them out of shape, so they are drawn as an
   architect draws a detail — in parallel projection, from above — and then
   stood on the perspective floor: `liftFurn` finds, for every point of the
   furniture, the point of the room that lands on the same spot of the page.
   The light is worked out with those, so the shadows start at the drawn feet.
   ========================================================================== */

export type V2 = [number, number];
export type V3 = [number, number, number];

export interface View {
  /** Vanishing point on the page, CSS px. */
  cx: number;
  hy: number;
  /** Focal length, CSS px. */
  f: number;
  /** Eye position: `ex` along the wall, `eye` above the floor, `ez` out from the wall. */
  ex: number;
  eye: number;
  ez: number;
}

export function project(v: View, p: V3): V2 {
  const d = Math.max(0.05, v.ez - p[2]);
  return [v.cx + (v.f * (p[0] - v.ex)) / d, v.hy - (v.f * (p[1] - v.eye)) / d];
}

/** The floor point (y = 0) under a page position below the horizon. */
export function floorAt(v: View, sx: number, sy: number): V3 {
  const d = (v.f * v.eye) / Math.max(1e-3, sy - v.hy);
  return [v.ex + (d * (sx - v.cx)) / v.f, 0, v.ez - d];
}

/* --- The furniture's own projection --------------------------------------
   An axonometric: yawed `beta` off the wall and pitched `pitch` down, so
   parallel lines stay parallel. Its axes are the room's — x to the right
   along the back wall, z toward the viewer — with its own origin and scale. */
const rad = (deg: number) => (deg * Math.PI) / 180;
const FURN_VIEW = { beta: 40, pitch: 33 };
export const SB = Math.sin(rad(FURN_VIEW.beta));
export const CB = Math.cos(rad(FURN_VIEW.beta));
export const SP = Math.sin(rad(FURN_VIEW.pitch));
export const CP = Math.cos(rad(FURN_VIEW.pitch));

export interface Furn {
  /** Page position of the furniture's origin (the far chair's centre, on the floor). */
  ox: number;
  oy: number;
  /** CSS px per metre. */
  s: number;
}

export function projectFurn(b: Furn, p: V3): V2 {
  return [b.ox + b.s * (p[0] * SB + p[2] * CB), b.oy - b.s * (p[0] * SP * CB + p[1] * CP - p[2] * SP * SB)];
}

/* --- The French doors (measured off the photograph) ----------------------- */
export const DOOR = {
  /** Half the opening: each leaf is this wide. */
  half: 0.6,
  height: 2.14,
  stile: 0.075,
  /** Half the gap where the two leaves meet. */
  meet: 0.004,
  /** Bottom rail and its panel — the glass starts above them. */
  kick: 0.5,
  /** Top rail. */
  head: 0.08,
  muntin: 0.028,
  casing: 0.13,
  cols: 2,
  rows: 5,
};

/** Width of the wall each tied-back curtain hangs over. */
export const CURTAIN = 0.3;
/** The narrow windows either side of the doors, behind the curtains: their
    inner and outer edges as distances from the doors' centre. */
export const SIDELIGHT: [number, number] = [DOOR.half + DOOR.casing + 0.03, DOOR.half + DOOR.casing + CURTAIN - 0.02];
/** The boxed valance the curtains hang from: its underside, its top, and how
    far it stands off the wall. */
/** The curtain rod, and the crown moulding above it: picture rail, the
    decorated band, and the cove up to the ceiling. */
export const ROD_Y = 2.28;
export const CROWN = { rail: 2.32, band0: 2.38, band1: 2.5 };
export const WALL_H = 2.6;

export type Span = [number, number];

/** The four glazed columns, left to right, as x intervals along the wall. */
export function paneCols(): Span[] {
  const d = DOOR;
  const glass = d.half - d.meet - 2 * d.stile;
  const w = (glass - (d.cols - 1) * d.muntin) / d.cols;
  const out: Span[] = [];
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? -d.half + d.stile : d.meet + d.stile;
    for (let c = 0; c < d.cols; c++) {
      const a = x0 + c * (w + d.muntin);
      out.push([a, a + w]);
    }
  }
  return out;
}

/** The glazed rows, bottom to top, as y intervals. */
export function paneRows(): Span[] {
  const d = DOOR;
  const y0 = d.kick;
  const y1 = d.height - d.head;
  const h = (y1 - y0 - (d.rows - 1) * d.muntin) / d.rows;
  const out: Span[] = [];
  for (let r = 0; r < d.rows; r++) {
    const a = y0 + r * (h + d.muntin);
    out.push([a, a + h]);
  }
  return out;
}

/* --- The sun ------------------------------------------------------------- */
export interface Sun {
  /** Unit vector from the room toward the sun (it sits behind the back wall). */
  dir: V3;
  /** Elevation above the horizon, radians. */
  elev: number;
  /** Azimuth off the wall normal, radians: positive sends the light to the right. */
  azim: number;
}

export function sunFrom(elev: number, azim: number): Sun {
  const ce = Math.cos(elev);
  return {
    dir: [-Math.sin(azim) * ce, Math.sin(elev), -Math.cos(azim) * ce],
    elev,
    azim,
  };
}

/* --- Furniture poses ----------------------------------------------------- */
export interface Pose {
  /** Floor position of the piece's centre, in the furniture's own frame. */
  x: number;
  z: number;
  /** Rotation about y, radians. 0 faces −x, back to the right-hand wall;
      positive turns the piece in toward the room and the viewer. */
  yaw: number;
}

export interface Layout {
  width: number;
  height: number;
  /** Uniform scale of the whole scene against its 1440px design size. */
  k: number;
  view: View;
  /** The view the walls and doors are drawn with. Same vanishing point and
      floor line as `view`, but a standing eye: the light needs its horizon
      down by the floor (see DESIGN.horizon), and a wall drawn from down there
      runs off nearly flat. The doors are a flat elevation either way. */
  sketch: View;
  /** The splay of the left wall in the light's own view, so that its foot
      lands where the drawing puts it: the wall's plane is (x − wallL) + sideA·z = 0. */
  sideA: number;
  furn: Furn;
  sun: Sun;
  /** The corner: where the left wall meets the back wall, along x. */
  wallL: number;
  /** Where the back wall's drawing gives out on the right — there is no wall there. */
  wallR: number;
  wallH: number;
  /** How far toward the viewer the left wall is drawn. */
  sideZ: number;
  chairs: Pose[];
  table: Pose;
  /** What stands on the table: the vase and its branch, the vase alone, or
      nothing — whichever leaves the hero's text clear. */
  tableTop: "branch" | "vase" | "bare";
  /** Outer edge of each curtain, as a distance from the doors' centre. */
  curtainOuter: number;
  /** Page y of the back wall's floor line. */
  floorY: number;
  /** The hero's text block on the page: x0, y0, x1, y1. The light goes easy there. */
  hero: [number, number, number, number];
  /** Page y of the lower edge of the light on the floor. */
  bandBottom: number;
}

export interface Metrics {
  /** Layer width (the page). */
  width: number;
  /** Top of the hero block, in layer coordinates. */
  blockTop: number;
  /** Hero text block, in layer coordinates. */
  blockLeft: number;
  blockRight: number;
  blockBottom: number;
  /** The corner of the hero's text nearest the furniture: the right edge and
      the bottom of its last column. */
  textRight: number;
  textBottom: number;
}

/** A furniture point, as the point of the room that lands on the same spot of
    the page. Uprights stay upright in both projections, so a leg's foot and
    its top both arrive where they were drawn. */
export function liftFurn(lay: Pick<Layout, "view" | "furn">, p: V3): V3 {
  const foot = projectFurn(lay.furn, [p[0], 0, p[2]]);
  const w = floorAt(lay.view, foot[0], foot[1]);
  const d = lay.view.ez - w[2];
  return [w[0], (p[1] * CP * lay.furn.s * d) / lay.view.f, w[2]];
}

/** Metres of room per metre of furniture, at a furniture point. */
export function furnScale(lay: Pick<Layout, "view" | "furn">, p: V3): number {
  const foot = projectFurn(lay.furn, [p[0], 0, p[2]]);
  const w = floorAt(lay.view, foot[0], foot[1]);
  return (lay.furn.s * (lay.view.ez - w[2])) / lay.view.f;
}

/** How tall the sunlight stands, in page px, over a spot on the floor — 0
    where the sun does not reach. Follows the sun back from the top of the
    glass to that spot. */
export function sunReach(lay: Pick<Layout, "view" | "sun">, sx: number, sy: number): number {
  const w = floorAt(lay.view, sx, sy);
  const { elev, azim } = lay.sun;
  const xw = w[0] - w[2] * Math.tan(azim);
  // through a pane, not a bar
  if (!paneCols().some(([a, b]) => xw > a && xw < b)) return 0;
  const rows = paneRows();
  const foot = (w[2] * Math.tan(elev)) / Math.cos(azim);
  // the light here came through the glass between `foot` and the top of the
  // glass; a bar in that span is a dark band up the leg, but the leg is lit
  // as high as the highest pane reaches
  const top = rows[rows.length - 1][1] - foot;
  if (top <= 0 || !rows.some(([a, b]) => b > foot && a < rows[rows.length - 1][1])) return 0;
  return (top * lay.view.f) / (lay.view.ez - w[2]);
}

/* --- Composition ----------------------------------------------------------
   Page px at the design size (hero block 786px wide); they scale together
   with the block, so the room keeps one shape at every width. */
const DESIGN = {
  block: 786,
  /** Where the corner sits (negative: off the page, so the room is cut off
      by the left edge), and clear air between the far curtain and the title. */
  sideWall: 22,
  gap: 64,
  /** The back wall's floor line, below the hero block. */
  floorGap: 50,
  /** How far the horizon sits above that floor line. This is the eye's
      height, and it IS the spread of the light: every ray on the floor runs
      out from one point on the horizon, and the lower that is, the closer it
      sits to the foot of the doors and the wider the rays fan as they cross
      the page. */
  horizon: 16,
  /** The standing eye the walls are drawn from. */
  sketchRise: 112,
  /** px per metre on the back wall, at most, and how much larger than that
      budget the doors are drawn (see computeLayout). */
  maxScale: 135,
  doorGrow: 1.15,
  doorRight: 0.08,
  /** px per metre for the furniture. */
  furn: 160,
  /** The light gives out this far past the nearest chair's feet. */
  past: 56,
};
/** The eye's distance from the back wall. */
const DEPTH = 5;

export function computeLayout(m: Metrics): Layout {
  const block = m.blockRight - m.blockLeft;
  const k = Math.max(0.55, Math.min(1, block / DESIGN.block));
  const floorY = m.blockBottom + DESIGN.floorGap * k;

  /* The back wall — corner, plain wall, curtain, doors, curtain — has to fit
     between the left wall and the title. That margin sets the scale, and
     whatever is left over once the scale is capped goes to plain back wall:
     the corner moves out, and the left wall stays a sliver. */
  const curtainOuter = DOOR.half + DOOR.casing + CURTAIN;
  const sideWall = DESIGN.sideWall * k + 0.1 * Math.max(0, m.blockLeft - 327 * k);
  const avail0 = m.blockLeft - sideWall - DESIGN.gap * k;
  // the doors are scaled as if the corner were a little off the page, so the
  // corner being on it costs plain wall, not window
  const base = Math.max(40, Math.min(DESIGN.maxScale, (avail0 + 30 * k) / (2 * curtainOuter + 0.25), (floorY - 58) / (WALL_H * 1.1)));
  /* The doors are drawn larger than that budget allows, growing to the left
     into the plain wall and, by `doorRight`, to the right into the gap
     before the title. */
  const S = DESIGN.doorGrow * base;
  const avail = avail0 + 2 * curtainOuter * DESIGN.doorRight * base;
  const span = Math.max(2 * curtainOuter + 0.02, avail / S);
  const wallL = curtainOuter - span;
  const corner = sideWall;
  const rise = DESIGN.horizon * k;
  /* The vanishing point sits under the middle of the hero, not the doors: the
     doors are a flat elevation either way, but it lays the left wall out long
     and shallow to the page edge instead of shooting it up into the nav. */
  const cx = (m.blockLeft + m.blockRight) / 2;
  const doorX = corner - wallL * S;
  const view: View = { cx, hy: floorY - rise, f: S * DEPTH, ex: (cx - doorX) / S, eye: rise / S, ez: DEPTH };
  const rise2 = DESIGN.sketchRise * k;
  const sketch: View = { ...view, hy: floorY - rise2, eye: rise2 / S };
  /* The drawn wall's foot drops at rise2 per (cx − corner) px. For the light's
     low eye to put a floor line through the corner at that slope, the wall has
     to splay outward: its direction's vanishing point sits rise/slope px left
     of the corner. */
  const slope = rise2 / Math.max(40, cx - corner);
  const sideA = (rise / slope + cx - corner) / view.f;

  /* The left wall comes toward the viewer until it runs off the page's left
     edge; its top runs off the top of the page before that, which is fine. */
  const grow = Math.max(1.04, Math.min((sketch.cx + 30) / (S * (sketch.ex - wallL)), (sketch.hy - 50) / (S * (WALL_H - sketch.eye)), 9));
  // (off the page, the left wall is still there for the light to end against)
  const sideZ = DEPTH * (1 - 1 / grow);

  /* Furniture: in the right margin, the far chair's centre a little below the
     floor line so both stand in the light. */
  const rightMargin = m.width - m.blockRight;
  // never so far out that the room stops reading as one room with the text
  const reach = Math.max(128 * k, Math.min(rightMargin - 152 * k, rightMargin * 0.45, 330 * k));
  const furn: Furn = { ox: m.blockRight + reach, oy: floorY + 80 * k, s: DESIGN.furn * k };
  const chairs: Pose[] = [
    // 50° is the yaw that reads as dead level on the page: facing straight left
    // seen from the side, seats to the room, backs to the right-hand wall —
    // not quite in line: the far one turned toward the table, the near one
    // a little the other way, as if someone had just got up
    // (−50° is as far as the drawing can turn before its front is lost)
    { x: -0.04, z: 0, yaw: rad(-50) },
    { x: 0.1, z: 0.78, yaw: rad(-37) },
  ];
  const table: Pose = { x: 0.3, z: -0.86, yaw: 0 };

  /* On a narrow page the table stands under the end of the hero's last line.
     Take the branch out of the vase, or the vase off the table, before
     letting either draw through the text. */
  const clears = (height: number, halfWidth: number) => {
    const top = projectFurn(furn, [table.x, height, table.z]);
    return top[0] - halfWidth * furn.s > m.textRight + 12 || top[1] > m.textBottom + 8;
  };
  const tableTop = clears(0.72 + 0.66, 0.26) ? "branch" : clears(0.72 + 0.22, 0.14) ? "vase" : "bare";

  /* Aim the sun. Sideways: the light through the right-hand edge of the
     glass passes just behind the far chair, so both chairs stand inside the
     fan. Downward: the ray from the top of the glass — the last of the light
     — lands a little past the near chair's feet. */
  const aim = projectFurn(furn, [-0.1, 0, -0.35]);
  const target = floorAt(view, aim[0], aim[1]);
  const azim = Math.atan2(target[0] - (DOOR.half - DOOR.stile), target[2]);
  const bandBottom = furn.oy + 0.4 * furn.s + DESIGN.past * k;
  const zMax = DEPTH - (view.f * view.eye) / (bandBottom - view.hy);
  const elev = Math.atan(((DOOR.height - DOOR.head) * Math.cos(azim)) / zMax);
  const height = Math.ceil(bandBottom + 70 * k + 24);

  return {
    width: m.width,
    height,
    k,
    view,
    sketch,
    sideA,
    furn,
    sun: sunFrom(elev, azim),
    wallL,
    wallR: curtainOuter + 0.14,
    wallH: WALL_H,
    sideZ,
    chairs,
    table,
    tableTop,
    curtainOuter,
    floorY,
    hero: [m.blockLeft, m.blockTop, m.blockRight, m.blockBottom],
    bandBottom,
  };
}
