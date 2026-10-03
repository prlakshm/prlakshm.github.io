/* ==========================================================================
   Sunroom — the light.

   A fragment shader that works out, for every pixel of the page, what the
   late sun is doing there. It is physically simple and deliberately literal:

     · Floor. Each floor point looks back along the sun's direction to the door
       wall. If that ray passes through a pane it is lit; the edge softens with
       the distance travelled, because the sun is a disc, not a point. That is
       why the bars are crisp by the threshold and feathered across the room.
     · Shade. Where the sun does not reach, the floor is lit only by the sky,
       which is cooler and dimmer — so the light reads as brighter than its
       surroundings, not as paint on white.
     · Air. The view ray is marched through the room and gathers light
       wherever it crosses a shaft, with forward scattering: the beams glow
       most where you look back toward the doors.
     · Glass. Old panes are never flat: a slow ripple bends the rays slightly,
       more the further they travel, and splits the edges into a warm fringe.
     · Leaves. An olive branch hangs just outside the doors. It is a shadow on
       the glass first, and whatever the glass does, the floor and the air
       inherit.
     · Furniture. Chair legs, rails, seats and the table top are intersected
       against the same sun ray, so the sketched pieces cast real shadows.
     · Polish. The floor mirrors the bright glass just under the doors, and
       light spills a little past every edge.

   The eye faces the back wall square-on (scene.ts), so a view ray always runs
   straight at that wall: its direction is (x, y, −1).

   The canvas is composited with `mix-blend-mode: multiply`, so the shader's
   output is a tint — white where nothing happens — and the page's dot grid
   and type show through the light untouched.
   ========================================================================== */

import type { Layout, V3 } from "./scene.js";
import { CB, DOOR, SB, SP, paneCols, paneRows } from "./scene.js";
import type { Occluders } from "./model.js";

export interface LightStyle {
  /** What full sun does to white paper, per pane (4 columns × 5 rows, row 0 at
      the floor). Multiplier colours: 1 leaves the paper white. */
  paneLight: V3[];
  /** How each pane looks in the door itself. */
  paneGlass: V3[];
  /** Shaded wall, and the tone of floor that only the sky reaches. */
  wall: V3;
  shade: V3;
  /** How far the room's own shade spreads around the light, 0–1. Past 1 it
      covers the whole floor: night. */
  room: number;
  /** Strength of the shafts in the air, and how streaked they are. */
  beam: number;
  streak: number;
  /** Sun softness: tangent of the disc's angular radius. The real sun is
      about 0.0047; a little haze makes it kinder. */
  soft: number;
  /** Ripple in the glass, how strongly it gathers the light into bright and
      dim patches, and the colour fringe it throws. */
  ripple: number;
  mottle: number;
  chroma: number;
  /** Light spilling past its own edges. */
  bloom: number;
  /** How much of the doors the polished floor mirrors, 0–1. */
  gloss: number;
  /** How much the light deepens across the room: extra green and blue taken
      out by the far end. [0.6, 0.2] turns gold to amber. */
  grade: [number, number];
  /** Lace laid across the light: 0 none, 1 full. */
  lace: number;
  /** Stars in the glass, 0–1: a night sky behind the panes. */
  stars: number;
  /** How dark the olive branch's shadow is, 0–1. */
  leaf: number;
  /** Slow breathing of the light, as if thin cloud were passing. */
  drift: number;
  /** How much of the glass's colour the beams in the air carry, 0–1. The
      floor can be as deep as it likes; the air crosses the hero text, so it
      is kept pale enough to read through. */
  air: number;
}

/** A leaf, in the plane of the doors (x along the wall, y up): centre, unit
    long axis, half-length, and width as a fraction of length. See leaves.ts. */
export interface LeafShadow {
  u: number;
  v: number;
  du: number;
  dv: number;
  half: number;
  ratio: number;
}

const MAX_STICKS = 40;
const MAX_FEET = 14;
const MAX_POOLS = 4;
const MAX_SLABS = 3;
/** Columns and rows of panes. The shader's loops are written to these. */
export const PANE_COLS = 4;
export const PANE_ROWS = 5;
export const MAX_LEAVES = 40;

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;

uniform vec2 uRes;
uniform float uPx;
uniform vec2 uVP;
uniform float uFocal;
uniform vec3 uEye;
uniform float uFadeY;
uniform vec4 uHero;      // the hero's text block on the page
uniform vec3 uSun;
uniform float uSoft;
uniform vec2 uCol[4];
uniform vec2 uRow[5];
uniform vec2 uReveal;
uniform vec3 uAbs[20];
uniform vec3 uGlass[20];
uniform vec3 uWall;      // the corner's x, where the back wall gives out, height
uniform float uSide;     // how far the left wall comes toward the eye
uniform float uSideA;    // its splay: the wall's plane is (x - corner) + uSideA * z = 0
uniform vec2 uDoor;      // half-width and height of the doors with their casing
uniform vec3 uWallCol;
uniform vec3 uShade;
uniform float uRoom;
uniform float uTime;
uniform float uIntro;
uniform float uBeam;
uniform float uStreak;
uniform float uRipple;
uniform float uMottle;
uniform float uChroma;
uniform float uBloom;
uniform float uGloss;
uniform vec2 uGrade;
uniform float uTanAz;
uniform float uLace;
uniform float uStars;
uniform float uLeaf;
uniform float uDrift;
uniform float uAir;

uniform vec4 uStA[${MAX_STICKS}];
uniform vec4 uStB[${MAX_STICKS}];
uniform int uNSt;
uniform vec4 uSlabA[${MAX_SLABS}];   // centre x, z, height, round
uniform vec4 uSlabB[${MAX_SLABS}];   // floor plan -> the slab's own unit square
uniform vec2 uSlabC[${MAX_SLABS}];   // its half-sizes, metres
uniform int uNSlab;
uniform vec3 uLoc;       // the furniture's origin on the page, and its px per metre
uniform vec3 uAxo;       // its projection: sin and cos of the yaw, sin of the pitch
uniform vec2 uFeet[${MAX_FEET}];
uniform int uNFeet;
uniform vec4 uPool[${MAX_POOLS}];
uniform vec4 uFurn;      // x0, z0, x1, z1: the only floor a shadow can reach
uniform vec4 uLeafA[${MAX_LEAVES}];
uniform float uLeafR[${MAX_LEAVES}];
uniform int uNLeaf;
uniform vec4 uLeafBox;   // u0, v0, u1, v1

// --- noise ---------------------------------------------------------------
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
// interleaved gradient noise, for dithering
float ign(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

// --- the panes -------------------------------------------------------------
// Coverage of the interval [a, b] seen through a blur of half-width w.
float span(vec2 ab, float w, float u) {
  return smoothstep(ab.x - w, ab.x + w, u) - smoothstep(ab.y - w, ab.y + w, u);
}
// k = 1 for sunlight (the muntins' depth shades a sliver of each pane),
// k = 0 for anything that just needs the pane outlines.
vec4 colCover(float x, float w, float k) {
  vec2 r = vec2(uReveal.x * k, 0.0);
  return vec4(span(uCol[0] + r, w, x), span(uCol[1] + r, w, x),
              span(uCol[2] + r, w, x), span(uCol[3] + r, w, x));
}
float sum4(vec4 v) { return v.x + v.y + v.z + v.w; }
float rowSum(float y, float w) {
  float s = 0.0;
  for (int j = 0; j < 5; j++) s += span(uRow[j], w, y);
  return s;
}

// What the panes let through at wall point h, blurred by w: c is how much of
// the sun gets in, the return value how much of it the glass keeps back.
vec3 panes(vec2 h, vec2 w, out float c) {
  vec4 cx = colCover(h.x, w.x, 1.0);
  vec2 rv = vec2(0.0, uReveal.y);
  vec3 a = vec3(0.0);
  float rs = 0.0;
  for (int j = 0; j < 5; j++) {
    float r = span(uRow[j] - rv, w.y, h.y);
    rs += r;
    for (int i = 0; i < 4; i++) a += uAbs[i * 5 + j] * (cx[i] * r);
  }
  c = sum4(cx) * rs;
  return a;
}
float paneCov(vec2 h, vec2 w) {
  return sum4(colCover(h.x, w.x, 0.0)) * rowSum(h.y, w.y);
}
vec3 paneTint(vec2 h, vec2 w) {
  vec4 cx = colCover(h.x, w.x, 0.0);
  vec3 a = vec3(0.0);
  for (int j = 0; j < 5; j++) {
    float r = span(uRow[j], w.y, h.y);
    for (int i = 0; i < 4; i++) a += uGlass[i * 5 + j] * (cx[i] * r);
  }
  return a;
}

// Where the waves in a sheet of glass gather the light. 0..1, mostly low, with
// thin bright threads; stretched upright, the way drawn glass runs.
float glassNet(vec2 h) {
  vec2 p = h * vec2(5.2, 2.5);
  p += (vec2(vnoise(p * 1.6 + 3.1), vnoise(p * 1.6 + 17.9)) - 0.5) * 1.1;
  float a = 1.0 - abs(2.0 * vnoise(p * 1.9) - 1.0);
  float b = 1.0 - abs(2.0 * vnoise(p * 4.3 + 8.0) - 1.0);
  return a * a * a * 0.7 + b * b * b * b * 0.3 + 0.18 * vnoise(p * 0.8 + 2.0);
}

// --- things in the light's way -------------------------------------------
// The olive branch against the glass (leaves.ts): how much of the sun a point
// of the doors' plane loses to it.
float leafShadow(vec2 q, float pen) {
  if (q.x < uLeafBox.x || q.x > uLeafBox.z || q.y < uLeafBox.y || q.y > uLeafBox.w) return 0.0;
  float s = 0.0;
  for (int i = 0; i < ${MAX_LEAVES}; i++) {
    if (i >= uNLeaf) break;
    vec4 l = uLeafA[i];
    vec2 p = q - l.xy;
    float hl = 1.0 / length(l.zw);
    float a = dot(p, l.zw);
    float b = dot(p, vec2(-l.w, l.z));
    // a pointed oval: widest in the middle, closing to a tip at each end
    float d = (uLeafR[i] * (1.0 - a * a) - abs(b)) * hl;
    s = max(s, smoothstep(-pen, pen, d) * step(abs(a), 1.0));
  }
  return s;
}

// Lace: an open net with a flower cut into every cell — six petal-shaped
// eyelets round a heart — and a smaller eyelet where four cells meet. Returns
// how much sun gets through: the cloth passes some, the eyelets all of it.
// soft is the sun's penumbra in cells: near the cloth the eyelets are crisp,
// across the room they melt into each other.
float lacePattern(vec2 p, float soft) {
  vec2 g = p;
  g.x += 0.5 * mod(floor(g.y), 2.0);
  vec2 c = fract(g) - 0.5;
  float r = length(c);
  float ang = atan(c.y, c.x);
  float e = 0.03 + soft;
  // one petal, repeated six times round the centre
  float a6 = mod(ang + 0.5236, 1.0472) - 0.5236;
  vec2 q = vec2((r - 0.245) / 0.115, (a6 * r) / 0.062);
  float petal = smoothstep(1.0 + e * 6.0, 1.0 - e * 6.0, length(q));
  float heart = smoothstep(e, -e, r - 0.07);
  // the corners of the cell, shared with its neighbours
  vec2 k = abs(c) - 0.5;
  float corner = smoothstep(e, -e, length(k) - 0.085);
  float holes = max(max(petal, heart), corner);
  float mesh = 0.5 + 0.5 * cos(g.x * 50.3) * cos(g.y * 50.3);
  float cloth = 0.2 + 0.14 * smoothstep(0.3, 0.7, mesh) * exp(-soft * 40.0);
  // a blurred eyelet lets the same light through, spread wider and thinner
  float open = mix(cloth, 1.0, holes);
  return mix(open, 0.46, 1.0 - exp(-soft * soft * 34.0));
}
// The panel hangs against the glass, so the light carries its pattern from
// the point of the doors it came through.
const float LACE_CELL = 0.15;
float lace(vec2 h, float blur) {
  return lacePattern(h / LACE_CELL, blur / LACE_CELL * 0.7);
}

float stickShadow(vec3 F, vec4 a, vec3 b) {
  vec3 d = b - a.xyz;
  vec3 w0 = F - a.xyz;
  float bb = dot(uSun, d);
  float c = dot(d, d);
  float dd = dot(uSun, w0);
  float e = dot(d, w0);
  float den = max(c - bb * bb, 1e-5);
  float tau = clamp((e - bb * dd) / den, 0.0, 1.0);
  float mu = max(bb * tau - dd, 0.0);
  float dist = length(w0 + uSun * mu - d * tau);
  float pen = 0.003 + mu * uSoft * 1.3;
  return 1.0 - smoothstep(a.w - pen, a.w + pen, dist);
}
float box1(float u, float hw, float pen) {
  return 1.0 - smoothstep(hw - pen, hw + pen, abs(u));
}
bool nearFurniture(vec3 F) {
  return F.x > uFurn.x && F.x < uFurn.z && F.z > uFurn.y && F.z < uFurn.w;
}
float furnitureShadow(vec3 F) {
  if (!nearFurniture(F)) return 0.0;
  float occ = 0.0;
  for (int i = 0; i < ${MAX_STICKS}; i++) {
    if (i >= uNSt) break;
    occ = max(occ, stickShadow(F, uStA[i], uStB[i].xyz));
  }
  for (int i = 0; i < ${MAX_SLABS}; i++) {
    if (i >= uNSlab) break;
    vec4 a = uSlabA[i];
    vec4 b = uSlabB[i];
    float mu = a.z / uSun.y;
    vec2 q = F.xz + uSun.xz * mu - a.xy;
    float pen = 0.002 + mu * uSoft * 1.3;
    vec2 ab = vec2(dot(q, b.xy), dot(q, b.zw));
    vec2 pn = pen / uSlabC[i];
    float sq = box1(ab.x, 1.0, pn.x) * box1(ab.y, 1.0, pn.y);
    float pr = 0.5 * (pn.x + pn.y);
    float rd = 1.0 - smoothstep(1.0 - pr, 1.0 + pr, length(ab));
    occ = max(occ, mix(sq, rd, a.w));
  }
  return occ;
}
// The soft shade that gathers under things. It belongs to the drawing, not the
// sun, so it is worked out on the furniture's own floor: undo its projection.
float ambient(vec2 px) {
  vec2 d = vec2(px.x - uLoc.x, uLoc.y - px.y) / uLoc.z;
  vec2 q = vec2(d.x * uAxo.x + d.y * uAxo.y / uAxo.z, d.x * uAxo.y - d.y * uAxo.x / uAxo.z);
  if (dot(q, q) > 6.0) return 0.0;
  float ao = 0.0;
  for (int i = 0; i < ${MAX_POOLS}; i++) {
    vec4 p = uPool[i];
    vec2 e = q - p.xy;
    ao += p.w * exp(-dot(e, e) / (p.z * p.z));
  }
  for (int i = 0; i < ${MAX_FEET}; i++) {
    if (i >= uNFeet) break;
    vec2 e = q - uFeet[i];
    ao += 0.55 * exp(-dot(e, e) / 0.0012);
  }
  return ao;
}

// --- surfaces ------------------------------------------------------------
// The light arrives from the doors outward, like a cloud moving off.
float introAt(float lam) {
  return smoothstep(0.0, 0.3, uIntro * 1.3 - lam * 0.105);
}
// Thin cloud: the whole room breathes a little.
float weather() {
  return 1.0 - uDrift * (0.5 + 0.5 * sin(uTime * 0.21) * sin(uTime * 0.083 + 1.3));
}

vec3 shadeFloor(vec3 F, vec3 dir, vec2 px) {
  float lam = F.z / max(-uSun.z, 1e-3);
  vec2 h = (F + uSun * lam).xy;

  // old glass: the further the ray has come, the more its wobble shows
  vec2 rp = vec2(vnoise(h * 5.3 + 11.3), vnoise(h * 5.3 + 47.1)) - 0.5;
  h += rp * lam * uRipple;
  // and gathers it: the waves in hand-made glass are weak lenses, so the light
  // lands as a net of brighter threads with dimmer pools between them. The
  // pattern needs a little distance to come into focus.
  float focus = min(0.3 + lam * 0.28, 1.0);
  float caustic = 1.0 + uMottle * focus * (glassNet(h) * 1.1 - 0.52);

  vec2 w = vec2(lam * uSoft) * vec2(1.25, 1.1) + 0.0016;
  vec2 dsp = vec2(0.55, 0.83) * lam * uChroma;
  float cr;
  float cg;
  float cb;
  vec3 A = vec3(panes(h - dsp, w, cr).r, panes(h, w, cg).g, panes(h + dsp, w, cb).b);
  vec3 C = vec3(cr, cg, cb);

  // what is left of the sun by the time it lands here
  float pen = 0.006 + lam * uSoft * 0.9;
  float sun = caustic * weather() * exp(-lam * 0.02) * introAt(lam);
  if (uLeaf > 0.0) sun *= 1.0 - 0.5 * uLeaf * leafShadow(h, 0.004 + lam * uSoft * 1.6);
  if (uLace > 0.0) sun *= mix(1.0, lace(h, pen), uLace);
  sun *= 1.0 - furnitureShadow(F);
  // paper tooth, which only shows where the light rakes across it
  sun *= 1.0 + (hash(gl_FragCoord.xy * 0.71) - 0.5) * 0.05;
  sun = clamp(sun, 0.0, 1.0);

  // The sun's limb is redder than its centre, so the penumbra is the warmest
  // part of any edge; and the light deepens the further it has skimmed.
  float far = smoothstep(0.4, 5.8, lam);
  vec3 warm = vec3(1.0, 1.0 + uGrade.x * far, 1.0 + uGrade.y * far);
  A *= warm * mix(vec3(1.0, 1.55, 1.3), vec3(1.0), smoothstep(0.0, 1.0, C));

  // the room's own shade, pooled around the light and against the wall
  float halo = clamp(paneCov(h, w + vec2(0.75, 0.55)), 0.0, 1.0);
  float nearWall = exp(-F.z / 2.2) * smoothstep(uWall.y + 1.4, uWall.y - 0.4, F.x);
  // the left wall is only drawn near the corner: further out, the floor's
  // shade lets go before it reaches where that wall would be
  float open = smoothstep(uSide * 0.5, uSide * 1.5, F.z);
  float offWall = (F.x - uWall.x + uSideA * F.z) / sqrt(1.0 + uSideA * uSideA);
  nearWall *= mix(1.0, smoothstep(0.0, 0.5 + F.z * 0.6, offWall), open);
  float room = min(uRoom, 1.0) * clamp(halo * 0.9 + nearWall * 0.7 + max(uRoom - 1.0, 0.0), 0.0, 1.0) * uIntro;
  vec3 shade = mix(vec3(1.0), uShade, room);

  // lit floor against shaded floor
  vec3 m = shade * (1.0 - C * sun) + (C - A) * sun;

  // spill: light bounced off the floor warms the shade around it, tightly at
  // first and then in a wide, faint breath
  float cs;
  vec3 spill = panes(h, w + vec2(0.13, 0.1), cs) * 0.55 + panes(h, w + vec2(0.42, 0.3), cs) * 0.45;
  m *= 1.0 - clamp(spill * warm * (uBloom * introAt(lam) * weather()), 0.0, 1.0);

  // The doors, mirrored in the polish of the floor beneath them. A waxed floor
  // is not a mirror: the image smears down the boards, and the higher up the
  // door it comes from, the less of it there is.
  if (uGloss > 0.0) {
    float tr = F.z;
    vec2 Rp = vec2(F.x + dir.x * tr, -dir.y * tr);
    float path = tr * length(dir);
    Rp.x += (vnoise(vec2(F.x * 34.0, F.z * 1.4)) - 0.5) * 0.012 * path;
    vec2 rough = vec2(0.005 + path * 0.006, 0.01 + path * 0.032);
    float rc = clamp(paneCov(Rp, rough), 0.0, 1.0);
    vec3 rt = paneTint(Rp, rough) / max(rc, 1e-3);
    float fres = uGloss * exp(-Rp.y * 0.85) * uIntro;
    m = mix(m, mix(vec3(1.0), rt * rt * vec3(1.0, 0.972, 0.9), 0.9), rc * fres);
    // and the deeper shade the mirrored door frame brings with it
    float frame = clamp(paneCov(Rp, rough + vec2(0.1, 0.16)), 0.0, 1.0) - rc;
    m *= 1.0 - 0.045 * max(frame, 0.0) * fres;
  }

  // ambient shade: along the skirting, under the furniture
  float wallAo = 0.36 * exp(-F.z / 0.3) * smoothstep(uWall.y + 0.3, uWall.y - 0.3, F.x)
               + 0.3 * exp(-max(0.0, F.x - uWall.x + uSideA * F.z) / 0.14) * (1.0 - smoothstep(uSide * 0.5, uSide, F.z));
  float ao = clamp(wallAo + ambient(px), 0.0, 1.0) * uIntro;
  m *= mix(vec3(1.0), uShade * uShade, ao);
  return m;
}

vec3 shadeWall(vec3 Wp) {
  float x = Wp.x;
  float y = Wp.y;
  float fade = (1.0 - smoothstep(uWall.y - 0.25, uWall.y + 0.3, x))
             * (1.0 - smoothstep(uWall.z - 0.03, uWall.z + 0.01, y));
  float glass = clamp(paneCov(vec2(x, y), vec2(0.003)), 0.0, 1.0);
  float glow = clamp(paneCov(vec2(x, y), vec2(0.2, 0.22)), 0.0, 1.0);

  // backlit: the wall is in shade, lifted near the glass
  vec3 shade = mix(uWallCol, vec3(1.0, 0.975, 0.92), glow * 0.7 * uIntro);
  // the doors and their casing are painted white: paler than the boarding
  float wood = step(abs(x), uDoor.x) * step(y, uDoor.y);
  shade = mix(shade, vec3(1.0, 0.99, 0.965), wood * 0.72);
  // the lit floor bounces a little warmth back up the wall
  float bounce = exp(-y / 0.55) * exp(-abs(x) / 1.5) * uIntro;
  shade = mix(shade, vec3(1.0, 0.95, 0.86), bounce * 0.3);

  vec3 m = mix(vec3(1.0), shade, fade * (1.0 - glass) * uIntro);
  vec3 g = mix(vec3(1.0), paneTint(vec2(x, y), vec2(0.003)) / max(glass, 1e-3), uIntro);
  // the olive branch, seen against the sky
  // the olive branch, seen against the sky: a grey silhouette, no colour of its own
  if (uLeaf > 0.0) g *= mix(vec3(1.0), vec3(0.84, 0.85, 0.87), 0.45 * uLeaf * uIntro * leafShadow(vec2(x, y), 0.004));
  // a night sky: a scatter of stars, each on its own slow twinkle
  if (uStars > 0.0) {
    vec2 sp = vec2(x, y) * 70.0;
    vec2 cell = floor(sp);
    float h = hash(cell);
    vec2 centre = cell + 0.5 + (vec2(hash(cell + 7.0), hash(cell + 13.0)) - 0.5) * 0.8;
    float dist = length(sp - centre);
    float tw = 0.55 + 0.45 * sin(uTime * (0.8 + h * 1.6) + h * 40.0);
    float star = step(0.93, h) * (1.0 - smoothstep(0.0, 0.16 + 0.14 * h, dist)) * tw;
    g = mix(g, vec3(1.0, 0.98, 0.94), clamp(star, 0.0, 1.0) * uStars * uIntro);
  }
  // a sheer lace panel hung against the glass
  if (uLace > 0.0) {
    float veil = lacePattern(vec2(x, y) / LACE_CELL, 0.0);
    g = mix(g, vec3(1.0, 0.985, 0.955) * mix(0.875, 1.0, veil), uLace * uIntro);
  }
  m = mix(m, g, glass * fade);
  return m;
}

// The left wall faces away from the sun: the room's own shade, a little
// deeper into the corner, and let go of as it nears the viewer.
vec3 shadeSide(vec3 P) {
  float fade = (1.0 - smoothstep(uSide * 0.4, uSide, P.z))
             * (1.0 - smoothstep(uWall.z - 0.03, uWall.z + 0.01, P.y));
  vec3 shade = uWallCol * mix(vec3(0.99), vec3(0.955, 0.955, 0.968), exp(-P.z / 0.45));
  return mix(vec3(1.0), shade, fade * uIntro);
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uPx;
  vec3 dir = vec3((px.x - uVP.x) / uFocal, (uVP.y - px.y) / uFocal, -1.0);
  vec3 m = vec3(1.0);
  // the ray ends on the back wall's plane unless something is in the way
  float tEnd = uEye.z;
  bool hit = false;

  float sideDen = dir.x + uSideA * dir.z;
  if (sideDen < -1e-4) {
    float tS = -((uEye.x - uWall.x) + uSideA * uEye.z) / sideDen;
    vec3 P = uEye + dir * tS;
    if (tS < tEnd && P.y >= 0.0) {
      tEnd = tS;
      hit = true;
      if (P.y < uWall.z + 0.02) m = shadeSide(P);
    }
  }
  if (!hit && dir.y < -1e-4) {
    float tF = uEye.y / (-dir.y);
    if (tF < tEnd) {
      m = shadeFloor(uEye + dir * tF, dir, px);
      tEnd = tF;
      hit = true;
    }
  }
  if (!hit) {
    vec3 Wp = uEye + dir * tEnd;
    if (Wp.y > -0.01 && Wp.y < uWall.z + 0.02) m = shadeWall(Wp);
  }

  // Shafts in the air. The light from one column of panes is a sheet standing
  // on the floor, leaning the way the sun does; the view ray crosses each
  // sheet once. Three samples through each column keep the rows of panes
  // readable as separate rays without banding. Looking nearly along the
  // sheets, the ray stays inside them longer, and they brighten.
  float den = dir.x + uTanAz;
  if (uBeam > 0.0 && den > 1e-3) {
    vec3 accA = vec3(0.0);
    float accC = 0.0;
    float jit = ign(gl_FragCoord.xy) - 0.5;
    float base = uEye.x - uTanAz * uEye.z;
    vec2 rv = vec2(0.0, uReveal.y);
    for (int i = 0; i < 4; i++) {
      float cw = (uCol[i].y - uCol[i].x) / 3.0;
      for (int s = 0; s < 3; s++) {
        float xc = uCol[i].x + (float(s) + 0.5 + jit * 0.9) * cw;
        float t = (xc - base) / den;
        if (t > 0.25 && t < tEnd) {
          vec3 P = uEye + dir * t;
          float lam = P.z / max(-uSun.z, 1e-3);
          float hy = P.y + uSun.y * lam;
          float rw = lam * uSoft * 1.1 + 0.012;
          // nothing to see right against the glass: the shaft gathers as it
          // leaves the door, and thins out across the room
          float k = smoothstep(0.05, 1.5, P.z) * exp(-lam * 0.075) * introAt(lam) * cw / max(den, 0.42);
          if (uLeaf > 0.0) k *= 1.0 - 0.6 * uLeaf * leafShadow(vec2(xc, hy), 0.02 + lam * uSoft);
          for (int j = 0; j < 5; j++) {
            float r = span(uRow[j] - rv, rw, hy) * k;
            accA += uAbs[i * 5 + j] * r;
            accC += r;
          }
        }
      }
    }
    float len = length(dir);
    vec3 vn = dir / len;
    // forward scattering: brightest looking back toward the sun
    float cosT = dot(uSun, vn);
    float g = 0.45;
    float phase = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * cosT, 1.5);
    // dust hangs in sheets: streaks that run with the light as the eye sees it
    float u = dot(cross(dir, uSun), normalize(vec3(-uSun.z, 0.0, uSun.x)));
    float st = vnoise(vec2(u * 38.0 + uTime * 0.011, 3.0)) * 0.55
             + vnoise(vec2(u * 97.0 - uTime * 0.017, 9.0)) * 0.3
             + vnoise(vec2(u * 260.0 + uTime * 0.03, 5.0)) * 0.15;
    float streak = mix(1.0, smoothstep(0.2, 0.8, st) * 1.6, uStreak);
    float amt = 1.0 - exp(-uBeam * accC * len * phase * streak * weather());
    vec3 tint = vec3(1.0) - uAir * accA / max(accC, 1e-4);
    // in shade the beam lifts the page back toward lit paper; on bare white it
    // can only warm it — and over the hero's block (title, lines and icons)
    // it all but stops, feathered out past the edges, so the words stay crisp
    vec2 hp = smoothstep(vec2(-70.0), vec2(24.0), px - uHero.xy) * smoothstep(vec2(-70.0), vec2(24.0), uHero.zw - px);
    amt *= 1.0 - 0.9 * hp.x * hp.y;
    m = mix(m, mix(vec3(1.0), tint, 0.7), amt);
  }

  // nothing may end in a hard line where the canvas does
  float edge = 1.0 - smoothstep(uFadeY - 90.0, uFadeY, px.y);
  m = mix(vec3(1.0), m, edge);
  m += (ign(gl_FragCoord.xy + 13.7) - 0.5) / 255.0;
  gl_FragColor = vec4(m, 1.0);
}
`;

export interface LightRenderer {
  /** The browser can only draw this in software. Paint it once and hold it
      still; animating it would take the page's frames with it. */
  readonly caveat: boolean;
  /** `quality` scales the pixel budget, 0–1; the mount lowers it on a slow GPU.
      Resizing clears the canvas, so always render straight afterwards. */
  resize(layout: Layout, cssW: number, cssH: number, quality: number): void;
  setScene(layout: Layout, occ: Occluders): void;
  setStyle(style: LightStyle): void;
  setSun(dir: V3): void;
  setLeaves(leaves: LeafShadow[]): void;
  render(time: number, intro: number): void;
  destroy(): void;
}

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    // eslint-disable-next-line no-console
    console.warn("sunroom shader:", gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

/** Returns null when WebGL is unavailable; the sketch then stands on its own. */
export function createLight(canvas: HTMLCanvasElement): LightRenderer | null {
  const attrs: WebGLContextAttributes = {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    powerPreference: "low-power",
  };
  /* Ask for a real GPU first. If there is none, take the software renderer
     but say so. The answer is kept on the canvas, because a second mount
     (React's dev double-mount) is simply handed the context that exists. */
  const hard = canvas.getContext("webgl", { ...attrs, failIfMajorPerformanceCaveat: true });
  if (!hard) canvas.dataset.software = "true";
  const gl = hard ?? canvas.getContext("webgl", attrs);
  if (!gl) return null;
  const caveat = canvas.dataset.software === "true";
  const hi = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
  if (!hi || hi.precision === 0) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    // eslint-disable-next-line no-console
    console.warn("sunroom program:", gl.getProgramInfoLog(prog));
    return null;
  }
  gl.useProgram(prog);
  /* An opaque WebGL canvas that has not been drawn to is black, and black
     multiplied over the page is a black hero. Start from white. */
  gl.clearColor(1, 1, 1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const loc: Record<string, WebGLUniformLocation | null> = {};
  const U = (name: string) => (loc[name] ??= gl.getUniformLocation(prog, name));

  const leafA = new Float32Array(MAX_LEAVES * 4);
  const leafR = new Float32Array(MAX_LEAVES);
  const PANES = PANE_COLS * PANE_ROWS;
  const abs = new Float32Array(PANES * 3);
  const glass = new Float32Array(PANES * 3);
  let solids: Occluders | null = null;
  gl.uniform1i(U("uNLeaf"), 0);
  gl.uniform4f(U("uLeafBox"), 1, 1, -1, -1);
  gl.uniform3f(U("uAxo"), SB, CB, SP);

  return {
    caveat,

    resize(layout, cssW, cssH, quality) {
      /* The light is soft, so it does not need the full device resolution;
         a pixel budget keeps very large displays from paying for it. */
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const budget = 1_400_000 * quality;
      const scale = Math.min(dpr, Math.sqrt(budget / Math.max(1, cssW * cssH)));
      const w = Math.max(1, Math.round(cssW * scale));
      const h = Math.max(1, Math.round(cssH * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      gl.viewport(0, 0, w, h);
      gl.uniform2f(U("uRes"), w, h);
      gl.uniform1f(U("uPx"), w / cssW);
      const v = layout.view;
      gl.uniform2f(U("uVP"), v.cx, v.hy);
      gl.uniform1f(U("uFocal"), v.f);
      gl.uniform3f(U("uEye"), v.ex, v.eye, v.ez);
      gl.uniform1f(U("uFadeY"), cssH);
      gl.uniform4fv(U("uHero"), layout.hero);
    },

    setStyle(style) {
      for (let i = 0; i < PANES; i++) {
        for (let c = 0; c < 3; c++) {
          abs[i * 3 + c] = 1 - style.paneLight[i][c];
          glass[i * 3 + c] = style.paneGlass[i][c];
        }
      }
      gl.uniform3fv(U("uAbs"), abs);
      gl.uniform3fv(U("uGlass"), glass);
      gl.uniform3fv(U("uWallCol"), style.wall);
      gl.uniform3fv(U("uShade"), style.shade);
      gl.uniform1f(U("uRoom"), style.room);
      gl.uniform1f(U("uSoft"), style.soft);
      gl.uniform1f(U("uBeam"), style.beam);
      gl.uniform1f(U("uStreak"), style.streak);
      gl.uniform1f(U("uRipple"), style.ripple);
      gl.uniform1f(U("uMottle"), style.mottle);
      gl.uniform1f(U("uChroma"), style.chroma);
      gl.uniform1f(U("uBloom"), style.bloom);
      gl.uniform1f(U("uGloss"), style.gloss);
      gl.uniform2f(U("uGrade"), style.grade[0], style.grade[1]);
      gl.uniform1f(U("uLace"), style.lace);
      gl.uniform1f(U("uStars"), style.stars);
      gl.uniform1f(U("uLeaf"), style.leaf);
      gl.uniform1f(U("uDrift"), style.drift);
      gl.uniform1f(U("uAir"), style.air);
    },

    setScene(layout, occ) {
      gl.uniform2fv(U("uCol"), new Float32Array(paneCols().flat()));
      gl.uniform2fv(U("uRow"), new Float32Array(paneRows().flat()));
      gl.uniform3f(U("uWall"), layout.wallL, layout.wallR, layout.wallH);
      gl.uniform1f(U("uSide"), layout.sideZ);
      gl.uniform1f(U("uSideA"), layout.sideA);
      gl.uniform2f(U("uDoor"), DOOR.half + DOOR.casing, DOOR.height + DOOR.casing);
      gl.uniform3f(U("uLoc"), layout.furn.ox, layout.furn.oy, layout.furn.s);

      const a = new Float32Array(MAX_STICKS * 4);
      const b = new Float32Array(MAX_STICKS * 4);
      const n = Math.min(MAX_STICKS, occ.sticks.length);
      for (let i = 0; i < n; i++) {
        const st = occ.sticks[i];
        a.set([st.a[0], st.a[1], st.a[2], st.r], i * 4);
        b.set([st.b[0], st.b[1], st.b[2], 0], i * 4);
      }
      gl.uniform4fv(U("uStA"), a);
      gl.uniform4fv(U("uStB"), b);
      gl.uniform1i(U("uNSt"), n);

      const sa = new Float32Array(MAX_SLABS * 4);
      const sb = new Float32Array(MAX_SLABS * 4);
      const sc = new Float32Array(MAX_SLABS * 2);
      const slabs = occ.slabs.slice(0, MAX_SLABS);
      slabs.forEach((sl, i) => {
        const det = sl.u[0] * sl.v[1] - sl.v[0] * sl.u[1] || 1e-6;
        sa.set([sl.c[0], sl.c[2], sl.c[1], sl.round ? 1 : 0], i * 4);
        sb.set([sl.v[1] / det, -sl.v[0] / det, -sl.u[1] / det, sl.u[0] / det], i * 4);
        sc.set([Math.hypot(sl.u[0], sl.u[1]), Math.hypot(sl.v[0], sl.v[1])], i * 2);
      });
      gl.uniform4fv(U("uSlabA"), sa);
      gl.uniform4fv(U("uSlabB"), sb);
      gl.uniform2fv(U("uSlabC"), sc);
      gl.uniform1i(U("uNSlab"), slabs.length);

      const feet = new Float32Array(MAX_FEET * 2);
      const nf = Math.min(MAX_FEET, occ.feet.length);
      for (let i = 0; i < nf; i++) feet.set(occ.feet[i], i * 2);
      gl.uniform2fv(U("uFeet"), feet);
      gl.uniform1i(U("uNFeet"), nf);

      const pools = new Float32Array(MAX_POOLS * 4);
      occ.pools.slice(0, MAX_POOLS).forEach((p, i) => pools.set([p.cx, p.cz, p.r, p.a * 0.5], i * 4));
      gl.uniform4fv(U("uPool"), pools);

      solids = occ;
    },

    setSun(dir) {
      gl.uniform3fv(U("uSun"), dir);
      gl.uniform1f(U("uTanAz"), dir[0] / dir[2]);
      /* Muntins have depth, so light arriving at an angle is shaded by their
         sides as well as their faces: every pane loses a sliver on the side the
         sun comes from, and off its top. */
      const depth = 0.034;
      gl.uniform2f(U("uReveal"), (depth * -dir[0]) / -dir[2], (depth * dir[1]) / -dir[2]);

      /* The patch of floor the furniture can shade: every solid, and the point
         its shadow lands at. Everywhere else skips the shadow loops. */
      if (solids) {
        let x0 = 1e9;
        let z0 = 1e9;
        let x1 = -1e9;
        let z1 = -1e9;
        const add = (x: number, y: number, z: number) => {
          const mu = y / dir[1];
          for (const [px, pz] of [
            [x, z],
            [x - dir[0] * mu, z - dir[2] * mu],
          ]) {
            x0 = Math.min(x0, px);
            x1 = Math.max(x1, px);
            z0 = Math.min(z0, pz);
            z1 = Math.max(z1, pz);
          }
        };
        for (const st of solids.sticks) {
          add(st.a[0], st.a[1], st.a[2]);
          add(st.b[0], st.b[1], st.b[2]);
        }
        for (const sl of solids.slabs) add(sl.c[0], sl.c[1], sl.c[2]);
        const pad = 0.3;
        gl.uniform4f(U("uFurn"), x0 - pad, z0 - pad, x1 + pad, z1 + pad);
      }
    },

    setLeaves(leaves) {
      const n = Math.min(MAX_LEAVES, leaves.length);
      let u0 = 1e9;
      let v0 = 1e9;
      let u1 = -1e9;
      let v1 = -1e9;
      for (let i = 0; i < n; i++) {
        const l = leaves[i];
        leafA.set([l.u, l.v, l.du / l.half, l.dv / l.half], i * 4);
        leafR[i] = l.ratio;
        u0 = Math.min(u0, l.u - l.half);
        u1 = Math.max(u1, l.u + l.half);
        v0 = Math.min(v0, l.v - l.half);
        v1 = Math.max(v1, l.v + l.half);
      }
      gl.uniform4fv(U("uLeafA"), leafA);
      gl.uniform1fv(U("uLeafR"), leafR);
      gl.uniform1i(U("uNLeaf"), n);
      gl.uniform4f(U("uLeafBox"), u0 - 0.1, v0 - 0.1, u1 + 0.1, v1 + 0.1);
    },

    render(time, intro) {
      gl.uniform1f(U("uTime"), time);
      gl.uniform1f(U("uIntro"), intro);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },

    destroy() {
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
      /* Deliberately not losing the context: React's dev double-mount hands
         this same canvas straight back, and a lost context cannot compile. */
    },
  };
}
