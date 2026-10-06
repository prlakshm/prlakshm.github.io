/* The pond's shaders (GLSL ES 1.00 / WebGL1).

   Two stages, the way mesq's "jelly painting" works (https://mesq.me/jelly-painting/,
   reverse-engineered from its shipped PostFX bundle):

   1. The scene, into one texture: the water's colour field, then every piece of
      confetti drawn INTO it as lit foil (so nothing sits on top of the water).
   2. His paint passes over the whole picture: a structure tensor of the colour,
      blurred twice, gives a flow field; brush strokes are swept along it (a line
      integral with procedural dabs); an edge-preserving smear and dry-brush
      flecks blend them in; a fixed 10-level dither is the paper grain.

   The foil (gold glitter, holographic film, curling ribbon) follows Ann Nguyen's
   Foil Studio / Sticker Pack lighting: metal is a coloured mirror of a few soft
   studio lights plus a lamp that follows the cursor; glitter is a mosaic of tiny
   tilted mirrors that each flash when they catch a light.

   Units are CSS px throughout, x right, y DOWN, z up out of the water. */

export const COMMON = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uOut;    // this target, px
uniform vec2 uView;   // the band, CSS px
uniform float uDpr;
uniform float uSeed;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
// MaterialX-style Perlin noise (what three.js's mx_noise_float is): quintic fade, 0.6616 scale.
float mxFade(float t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }
float mxGrad(vec2 cell, vec2 f) {
  float h = floor(hash12(cell + 0.5) * 8.0);
  float u = h < 4.0 ? f.x : f.y;
  float v = 2.0 * (h < 4.0 ? f.y : f.x);
  return (mod(h, 2.0) >= 1.0 ? -u : u) + (mod(floor(h * 0.5), 2.0) >= 1.0 ? -v : v);
}
float mxNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  float a = mxGrad(i, f);
  float b = mxGrad(i + vec2(1.0, 0.0), f - vec2(1.0, 0.0));
  float c = mxGrad(i + vec2(0.0, 1.0), f - vec2(0.0, 1.0));
  float d = mxGrad(i + vec2(1.0, 1.0), f - vec2(1.0, 1.0));
  vec2 u = vec2(mxFade(f.x), mxFade(f.y));
  return 0.6616 * mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
`;

/* How fast the water moves: the surface drifts right at DRIFT px/s (scene.ts
   moves the confetti at the same speed, so it rides the water), and the colour
   field changes shape over FIELD_TIME s. */
export const DRIFT = 3.5;
export const FIELD_TIME = 42;

/* The water, shared by the field pass and the confetti (which hazes toward it
   and sways with it). His table recipe: two broad octaves and a warp, three
   colours, so the whole band holds one or two soft changes. */
export const WATER = `
uniform float uTime;
uniform vec3 uBase;
uniform vec3 uDark;
uniform vec3 uLight;
uniform vec3 uSunTint;
uniform vec4 uRipple[6];   // x, y, start time, strength

const float DRIFT = ${DRIFT.toFixed(2)};   // px/s, the whole surface moves as one
const float VSCALE = 800.0;

// How far the surface has moved at p: a slow swell, and the cursor's rings.
vec2 waterWob(vec2 p, float t, out float crest) {
  float ph = 6.2831853 * (p.x / 700.0 - t / 9.0);
  vec2 w = vec2(0.6 * cos(ph), 2.0 * sin(ph));
  crest = 0.0;
  for (int i = 0; i < 6; i++) {
    vec4 r = uRipple[i];
    float age = t - r.z;
    if (r.w <= 0.0 || age < 0.0 || age > 2.5) continue;
    vec2 d = p - r.xy;
    float dist = length(d);
    float ring = exp(-pow((dist - age * 60.0) / 10.0, 2.0)) * exp(-age * 1.4) * r.w;
    w += (dist > 0.001 ? d / dist : vec2(0.0)) * ring * 3.0;
    crest += ring;
  }
  return w;
}

vec3 waterColour(vec2 p, float t) {
  vec2 c = vec2(p.x - t * DRIFT, p.y / 0.54);   // his table, seen at ~32 degrees
  float l = uSeed * 7.31;
  float tt = t / ${FIELD_TIME.toFixed(1)};   // the field changes shape slowly
  vec2 warp = vec2(mxNoise(c / VSCALE * 1.12 + vec2(l, 1.7 + tt)), mxNoise(c / VSCALE * 1.12 + vec2(4.1 + tt, l))) * 0.069 * VSCALE;
  vec2 d = c + warp;
  float f = mxNoise(d / VSCALE + vec2(l * 0.37, 0.5 + tt * 0.6)) + mxNoise(d / (VSCALE * 0.45) + vec2(2.3 - tt * 0.5, l * 0.21)) * 0.35;
  // Flat zones that reach their colour, with soft ~190 px borders, like his.
  vec3 col = mix(uBase, uDark, smoothstep(0.06, 0.48, -f));
  col = mix(col, uLight, smoothstep(-0.06, 0.36, f));
  // The sun on the water: a faint aqua lift toward the right.
  vec2 s = (p / uView - vec2(0.74, 0.34)) / vec2(0.16, 0.36);
  col = mix(col, uSunTint, exp(-dot(s, s)) * 0.12);
  return col;
}
`;

export const VS_FULL = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/* --- Stage 1a: the water field -------------------------------------------- */
export const FS_FIELD = COMMON + WATER + `
void main() {
  vec2 uv = gl_FragCoord.xy / uOut;
  vec2 p = vec2(uv.x, 1.0 - uv.y) * uView;
  float crest;
  vec2 w = waterWob(p, uTime, crest);
  vec3 col = waterColour(p + w, uTime);
  col += crest * 0.09;                           // a ring's crest catches a little light
  // Alpha 0: the scene's alpha is the confetti mask (pieces add it), so the
  // paint passes can keep them out of the water's strokes and flecks.
  gl_FragColor = vec4(col, 0.0);
}
`;

/* --- Stage 1b: the confetti, drawn into the scene as lit foil ---------------- */
export const VS_QUAD = `
attribute vec2 aCorner;   // CSS px
attribute vec4 aA;        // x, y, size, angle
attribute vec4 aB;        // kind, seed, depth (0 floating .. 1 sunk), hue
attribute vec4 aC;        // tilt x, tilt y, phase, extra (flare | coil radius | brightness)
uniform vec2 uView;
varying vec2 vP;
varying vec4 vA;
varying vec4 vB;
varying vec4 vC;
void main() {
  vP = aCorner;
  vA = aA;
  vB = aB;
  vC = aC;
  gl_Position = vec4(aCorner.x / uView.x * 2.0 - 1.0, 1.0 - aCorner.y / uView.y * 2.0, 0.0, 1.0);
}
`;

export const FS_CONFETTI = COMMON + WATER + `
varying vec2 vP;
varying vec4 vA;
varying vec4 vB;
varying vec4 vC;
uniform vec3 uSunDir;     // unit vector toward the sun
uniform vec4 uLamp;       // cursor lamp: x, y, height (CSS px), strength
uniform vec2 uEnvShift;   // the pointer nudges the sky's lights, like Ann's
uniform vec3 uEye;
uniform vec2 uKey;       // the key light's angles: over the sun patch

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
float sbox(vec2 a, vec2 c, vec2 hs, float soft) {
  vec2 d = abs(a - c) - hs;
  return 1.0 - smoothstep(-soft, soft, max(d.x, d.y));
}
vec3 bump3(vec3 x, vec3 yo) { return clamp(1.0 - x * x - yo, 0.0, 1.0); }
vec3 spectral(float w) {   // wavelength (nm) to RGB, Zucconi's fit
  float x = clamp((w - 400.0) / 300.0, 0.0, 1.0);
  return bump3(vec3(3.54585104, 2.93225262, 2.41593945) * (x - vec3(0.69549072, 0.49228336, 0.27699880)), vec3(0.02312639, 0.15225084, 0.52607955))
       + bump3(vec3(3.90307140, 3.21182957, 3.96587128) * (x - vec3(0.11748627, 0.86755042, 0.66077860)), vec3(0.84897130, 0.88445281, 0.73949448));
}

// What a mirror lying in the pond sees: an overcast sky brighter toward the
// sun, a soft key light, a narrow window strip, a low bounce, the sun.
// ~0.25 is open sky (foil sits dark there), ~2.4 a light (foil comes up full).
float studio(vec3 r) {
  vec2 a = vec2(atan(r.x, r.z), asin(clamp(r.y, -1.0, 1.0))) - uEnvShift;
  float e = 0.45 + 0.55 * smoothstep(-0.9, 0.9, dot(r.xy, normalize(uSunDir.xy + vec2(1e-4, 0.0))));
  vec2 k = (a - uKey) / vec2(0.20, 0.07);
  e += 2.4 * sbox(a, uKey, vec2(0.20, 0.07), 0.08) * (1.0 - 0.45 * dot(k, k));
  e += 1.9 * sbox(a, vec2(0.46, 0.10), vec2(0.045, 0.45), 0.06);
  e += 0.6 * sbox(a, vec2(0.0, 0.62), vec2(0.9, 0.07), 0.18);
  float sd = max(dot(r, uSunDir), 0.0);
  e += 30.0 * smoothstep(0.9985, 0.9996, sd) + 0.8 * pow(sd, 90.0);
  return e;
}

// Irregular (jittered-cell) flakes: which one p is in, and how far from its edge.
vec2 flakeCell(vec2 g, float seed, out float edge) {
  vec2 gi = floor(g);
  vec2 gf = fract(g);
  float m1 = 8.0;
  float m2 = 8.0;
  vec2 cell = gi;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 o = vec2(float(i), float(j));
      vec2 r = o + hash22(gi + o + seed * 37.0) - gf;
      float dd = dot(r, r);
      if (dd < m1) { m2 = m1; m1 = dd; cell = gi + o; } else if (dd < m2) { m2 = dd; }
    }
  }
  edge = sqrt(m2) - sqrt(m1);
  return cell;
}

// Inigo Quilez's five-point star (MIT), points along +y.
float sdStar5(vec2 p, float r, float rf) {
  const vec2 k1 = vec2(0.809016994375, -0.587785252292);
  const vec2 k2 = vec2(-0.809016994375, -0.587785252292);
  p.x = abs(p.x);
  p -= 2.0 * max(dot(k1, p), 0.0) * k1;
  p -= 2.0 * max(dot(k2, p), 0.0) * k2;
  p.x = abs(p.x);
  p.y -= r;
  vec2 ba = rf * vec2(-k1.y, k1.x) - vec2(0.0, 1.0);
  float h = clamp(dot(p, ba) / dot(ba, ba), 0.0, r);
  return length(p - ba * h) * sign(p.y * ba.x - p.x * ba.y);
}
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}
// A punched confetti star: slim points, tips just softened, a little hand-cut
// wobble and a fibrous edge. No outline: the edge is only where it ends.
float confettiStar(vec2 q, float R, float seed, float inner) {
  vec2 p = vec2(q.x, -q.y);
  float ang = atan(p.x, p.y);
  float jig = 1.0 + 0.03 * sin(5.0 * ang + seed * 6.283) + 0.02 * sin(3.0 * ang + seed * 17.0);
  float rr = 0.09 * R;
  float d = sdStar5(p / jig, R - rr, inner) * jig - rr;
  float valley = (R - rr) * inner + 0.6 * rr;
  return smin(d, length(p) - valley, 0.06 * R) + 0.25 * (vnoise(q * 0.9 + seed * 7.0) - 0.5);
}

vec3 pastel(float i) {
  if (i < 0.5) return vec3(0.78, 0.66, 0.84);   // lilac
  if (i < 1.5) return vec3(0.92, 0.70, 0.79);   // pink
  if (i < 2.5) return vec3(0.62, 0.78, 0.92);   // sky
  if (i < 3.5) return vec3(0.66, 0.72, 0.86);   // slate blue, like the fairy photos' steel-blue stars
  if (i < 4.5) return vec3(0.95, 0.80, 0.74);   // peach
  return vec3(0.84, 0.89, 0.93);                // pearl
}

const vec3 GOLD_INK = vec3(0.95, 0.84, 0.50);
const vec3 GOLD_TINT = vec3(1.00, 0.86, 0.50);

// --- gold glitter foil star (Ann's flakes on an embossed plate) ---
vec4 goldStar(vec2 q, float R, float seed, float aa, vec3 N, vec3 T, vec3 B, vec3 V, vec3 P, float t, vec3 Lp) {
  float d = confettiStar(q, R, seed, 0.54);
  if (d > aa) return vec4(0.0);
  float cover = 1.0 - smoothstep(-aa, aa, d);
  // emboss: a plateau whose shoulder rolls off (from the SDF), a crumple, a crinkle
  float bevel = max(1.8, R * 0.2);
  float s = clamp(-d / bevel, 0.0, 1.0);
  float dh = 6.0 * s * (1.0 - s) / bevel;
  vec2 e = vec2(0.5, 0.0);
  vec2 grad = vec2(confettiStar(q + e.xy, R, seed, 0.54) - confettiStar(q - e.xy, R, seed, 0.54),
                   confettiStar(q + e.yx, R, seed, 0.54) - confettiStar(q - e.yx, R, seed, 0.54)) / (2.0 * e.x);
  vec2 slope = -grad * dh * 2.6;
  vec2 cq = q / R;
  slope += (vec2(vnoise(cq * 2.0 + seed * 9.0), vnoise(cq * 2.0 + seed * 9.0 + 5.3)) - 0.5) * 0.14;
  slope += (vec2(vnoise(q * 0.42 + seed * 3.0), vnoise(q * 0.42 + seed * 3.0 + 11.1)) - 0.5) * 0.30;
  vec3 Nb = normalize(N - T * slope.x - B * slope.y);
  // every flake a tiny mirror with its own tilt
  float edge;
  vec2 cell = flakeCell(q / max(0.6, R * 0.034), seed, edge);
  float spot = mix(0.96, 1.0, smoothstep(0.0, 0.08, edge));
  vec2 rnd = hash22(cell + seed * 37.0 + 0.5);
  float tw = t * (0.5 + rnd.x);
  // neighbouring flakes lean together a little: real glitter flashes in clumps
  vec2 clump = vec2(vnoise(cell * 0.3 + seed * 13.0), vnoise(cell * 0.3 + seed * 13.0 + 7.7)) - 0.5;
  vec2 tilt = (rnd - 0.5) * 0.75 + clump * 1.2 + 0.07 * vec2(sin(tw + rnd.y * 6.28), cos(tw * 1.3));
  vec3 Nf = normalize(Nb + T * tilt.x + B * tilt.y);
  float envF = studio(reflect(-V, Nf));
  float caughtF = smoothstep(0.3, 2.4, envF);
  float hotF = pow(max(dot(Nf, normalize(Lp + V)), 0.0), 90.0) * uLamp.w;
  float r3 = hash12(cell + seed * 3.1);
  vec3 tone = mix(vec3(1.02, 1.01, 0.92), vec3(0.93, 0.87, 0.66), r3);
  vec3 col = GOLD_INK * tone * mix(0.92, 1.04, caughtF) + GOLD_TINT * (0.6 * caughtF * caughtF * caughtF + hotF * 1.0);
  float flash = smoothstep(1.8, 3.4, envF) * step(0.72, hash12(cell + 7.31));
  col += mix(vec3(1.0), GOLD_TINT, 0.7) * flash * 0.8;
  col *= spot;
  // Real glitter foil is smooth in grain but mottled in tone: clumps of
  // brighter and darker flakes drift across the star (measured off the
  // embossing reference: coarse tone variation ~0.10, mean luminance ~0.60).
  float mott = vnoise(q / max(1.2, R * 0.1) + seed * 17.0) * 0.65 + vnoise(q / max(2.0, R * 0.2) + seed * 5.0) * 0.35;
  // darker clumps stay warm (ochre-brown, not olive): red holds up as the gold dims
  col *= mix(vec3(0.66, 0.54, 0.46), vec3(1.32, 1.34, 1.36), smoothstep(0.12, 0.88, mott)) * 0.86;
  // the cursor's lamp warms the plate under the flakes
  col += GOLD_INK * tone * 0.3 * pow(max(dot(Nb, normalize(Lp + V)), 0.0), 10.0) * uLamp.w;
  // the raised shoulder: lit top-left, shaded bottom-right
  vec3 key = normalize(vec3(-0.45, -0.55, 0.7));
  col *= mix(1.0, clamp(dot(Nb, key) / max(dot(N, key), 0.2), 0.55, 1.5), 0.3);
  // highlights stay gold instead of clipping to white
  float mx = max(col.r, max(col.g, col.b));
  if (mx > 0.9) col *= (0.9 + 0.1 * (1.0 - exp((0.9 - mx) * 6.0))) / mx;
  return vec4(col, cover);
}

// --- holographic film star: a coloured mirror with a diffraction grating ---
vec3 grating(vec3 L, float I, vec3 V, vec3 T, vec3 B, vec2 gdir, float width) {
  vec3 S3 = L + V;
  vec2 S = vec2(dot(S3, T), dot(S3, B));
  float along = abs(dot(S, gdir));
  float across = dot(S, vec2(-gdir.y, gdir.x));
  float line = exp(-across * across / width);
  return I * line * (spectral(1100.0 * along) + 0.5 * spectral(550.0 * along));
}
vec4 holoStar(vec2 q, float R, float seed, float hue, float aa, vec3 N, vec3 T, vec3 B, vec3 V, vec3 P, float t, vec3 Lp, float flare) {
  float d = confettiStar(q, R, seed, 0.42);
  if (d > aa) return vec4(0.0);
  float cover = 1.0 - smoothstep(-aa, aa, d);
  vec2 cq = q / R;
  vec2 slope = cq * 0.07 + (vec2(vnoise(cq * 1.6 + seed * 9.0), vnoise(cq * 1.6 + seed * 9.0 + 5.3)) - 0.5) * 0.12;
  vec3 Nb = normalize(N - T * slope.x - B * slope.y);
  vec3 Tb = normalize(T - Nb * dot(T, Nb));
  vec3 Bb = cross(Nb, Tb);
  vec3 dye = pastel(hue);
  float caught = smoothstep(0.3, 2.4, studio(reflect(-V, Nb)));
  float nh = max(dot(Nb, normalize(Lp + V)), 0.0);
  vec3 deep = mix(dye, dye * dye, 0.6);
  vec3 col = mix(deep, dye, caught) + mix(dye, vec3(1.0), 0.4) * (0.25 * caught * caught * caught)
           + mix(dye, vec3(1.0), 0.5) * pow(nh, 30.0) * uLamp.w * 0.25;
  // the rainbow that slides with tilt, view, lamp, position and time
  float phase = dot(Nb.xy, vec2(1.3, 0.9)) * 1.7 + dot(V.xy, vec2(0.9, -0.5)) + dot(Lp.xy, vec2(0.5, 0.4)) * 0.8
              + (q.x * 0.8 - q.y * 0.55) / (6.0 * R) + vnoise(cq * 1.75 + seed * 4.0) * 0.15 + seed * 1.3 + t * 0.03;
  vec3 rainbow = vec3(0.80, 0.80, 0.88) + vec3(0.20, 0.16, 0.12) * cos(6.2831853 * (phase + vec3(0.0, 0.33, 0.67)));
  col = mix(col, col * rainbow * 1.3, 0.35);
  col += rainbow * 0.3 * caught * caught;
  float ga = seed * 6.2831853;
  vec2 gdir = vec2(cos(ga), sin(ga));
  vec3 rb = grating(uSunDir, 1.0, V, Tb, Bb, gdir, 0.15) + grating(Lp, 0.9 * uLamp.w, V, Tb, Bb, gdir, 0.15);
  col += rb * mix(dye, vec3(1.0), 0.7) * 0.2;
  float he;
  vec2 hc = flakeCell(q / max(1.2, R * 0.12), seed + 0.37, he);
  float on = step(0.94, hash12(hc + seed * 11.0)) * smoothstep(0.05, 0.2, he);
  float ha = hash12(hc + seed * 5.0) * 3.14159;
  vec2 hdir = vec2(cos(ha), sin(ha));
  col += (grating(uSunDir, 1.0, V, Tb, Bb, hdir, 0.004) + grating(Lp, uLamp.w, V, Tb, Bb, hdir, 0.004)) * on * 0.6;
  // caught light lifts the film toward white but never past its own tint; only a flare blazes white
  col = min(col, mix(min(dye * mix(vec3(1.0), rainbow * 1.3, 0.35), 1.0), vec3(1.0), 0.5));
  // a flare: the whole piece blazes as it tips into the light
  col = mix(col, vec3(0.99, 0.97, 0.93), flare * 0.75);
  return vec4(col, cover);
}

// A four-point glint (for flares and hero flakes).
float glint(vec2 l, float size) {
  vec2 a = abs(l) / size;
  float arms = max(0.0, 1.0 - a.x * 9.0 - a.y) + max(0.0, 1.0 - a.y * 9.0 - a.x);
  float core = exp(-dot(l, l) / (size * size * 0.03));
  return arms * 0.8 + core;
}

// --- curling foil ribbon: lies in a long S on the water, one open loop, a
//     ringlet at its cut end, twisting as it goes (edge-on goes thin) ---
const int RSEG = 128;
const int RWIN = 36;
// r2 picks the motif: 0 = one open loop and a coil, 1 = a long S and a coil.
vec3 ribbonPt(float s, float L, float rc, float ph, float sweep, float r2, out float th) {
  th = 6.2831853 * (2.4 * s + 0.55 * (1.0 - r2) * smoothstep(0.26, 0.44, s) + 1.4 * smoothstep(0.84, 1.0, s)) + ph;
  float rad = rc * 0.42 + rc * 2.0 * (1.0 - r2) * (smoothstep(0.24, 0.31, s) - smoothstep(0.39, 0.47, s)) + rc * 0.6 * smoothstep(0.84, 0.93, s);
  float z = rad * sin(th);
  float y = sweep * sin(6.2831853 * mix(0.85, 1.3, r2) * s + ph * 0.3) + rad * cos(th);
  return vec3((s - 0.5 - 0.11 * smoothstep(0.84, 1.0, s)) * 2.0 * L + 0.85 * z, y, z);
}
vec3 ribbonFace(float i) { return i < 0.5 ? vec3(0.80, 0.71, 0.95) : vec3(0.97, 0.71, 0.81); }
vec3 ribbonBack(float i) { return i < 0.5 ? vec3(0.64, 0.58, 0.86) : vec3(0.95, 0.79, 0.70); }
vec4 ribbon(vec2 q, float L, float rc, float seed, float hue, float ph, float aa, vec3 V, vec3 P, mat2 toWorld, float t, vec3 Lp, out float under) {
  under = 0.0;
  float r2 = step(0.5, hue);
  float sweep = (20.0 + 14.0 * seed) * mix(1.0, 1.5, r2);
  float w = 6.4;
  float bestZ = -1e5;
  float bestS = 0.0;
  float bestD = 1e5;
  float bestHW = 1.0;
  float sc = q.x / (2.0 * L) + 0.5;
  float win = (0.85 * rc * 2.42 + w) / (2.0 * L);
  float k0 = clamp(floor((sc - win) * float(RSEG)), 0.0, float(RSEG - RWIN));
  float th0;
  vec3 a = ribbonPt(k0 / float(RSEG), L, rc, ph, sweep, r2, th0);
  for (int k = 1; k <= RWIN; k++) {
    float s1 = (k0 + float(k)) / float(RSEG);
    float th1;
    vec3 b = ribbonPt(s1, L, rc, ph, sweep, r2, th1);
    vec2 pa = q - a.xy;
    vec2 ba = b.xy - a.xy;
    float hh = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
    float dist = length(pa - ba * hh);
    float s = s1 + (hh - 1.0) / float(RSEG);
    float th = mix(th0, th1, hh);
    float hw = 0.5 * w * (0.34 + 0.66 * abs(sin(th)));
    float z = mix(a.z, b.z, hh);
    float tol = 2.5;
    if (dist < hw + aa && (z > bestZ + tol || (z > bestZ - tol && dist - hw < bestD - bestHW))) {
      bestZ = z; bestS = s; bestD = dist; bestHW = hw;
    }
    a = b;
    th0 = th1;
  }
  if (bestZ < -1e4) return vec4(0.0);
  float cover = 1.0 - smoothstep(bestHW - aa, bestHW + aa, bestD);
  float th;
  vec3 c0 = ribbonPt(bestS, L, rc, ph, sweep, r2, th);
  vec2 dirW = toWorld * vec2(1.0, 0.0);
  vec2 norW = toWorld * vec2(0.0, 1.0);
  vec3 n = normalize(vec3(norW * cos(th), sin(th) + 0.35));
  vec3 c1;
  float thb;
  c1 = ribbonPt(bestS + 0.004, L, rc, ph, sweep, r2, thb);
  vec3 tl = c1 - c0;
  vec3 Tg = normalize(vec3(dirW * tl.x + norW * tl.y, tl.z) + 1e-5);
  float back = step(dot(n, V), 0.0);
  n = mix(n, -n, back);
  vec3 base = mix(ribbonFace(hue), ribbonBack(hue), back);
  float caught = smoothstep(0.35, 2.4, studio(reflect(-V, n)));
  float spec = 0.0;
  for (int j = 0; j < 2; j++) {
    vec3 Lj = j == 0 ? uSunDir : Lp;
    float Ij = j == 0 ? 1.0 : uLamp.w;
    vec3 Hj = normalize(Lj + V);
    float th2 = dot(Tg, Hj);
    spec += Ij * pow(sqrt(max(1.0 - th2 * th2, 0.0)), 320.0) * smoothstep(-0.1, 0.3, dot(n, Hj));
  }
  vec3 col = base * mix(0.74, 0.98, caught) + mix(base, vec3(1.0), 0.3) * 0.15 * caught * caught * caught
           + mix(base, vec3(1.0), 0.3) * spec * mix(0.55, 0.2, back);
  col = min(col, mix(base, vec3(1.0), 0.6));
  // one stretch dips under the water
  float dip = smoothstep(0.58, 0.64, bestS) * (1.0 - smoothstep(0.72, 0.78, bestS));
  under = clamp(max(-bestZ / max(rc, 1.0), 0.0) * 0.2 + dip * 0.65, 0.0, 0.75);
  return vec4(col, cover);
}

// --- mesq's sparkle: a chunky, embossed four-point mark, warm white ---
float sparkleSd(vec2 q, float s) {
  vec2 a = abs(q);
  float armV = max(a.x - s * (0.24 - 0.14 * clamp(a.y / s, 0.0, 1.0)), a.y - s * 0.92);
  float armH = max(a.y - s * (0.24 - 0.14 * clamp(a.x / s, 0.0, 1.0)), a.x - s * 0.9);
  return smin(min(armV, armH), length(q) - s * 0.26, s * 0.12);
}
vec4 sparkle(vec2 q, float s, float bright, float aa) {
  float d = sparkleSd(q, s);
  if (d > aa) return vec4(0.0);
  float cover = 1.0 - smoothstep(-aa, aa, d);
  float h = smoothstep(0.0, s * 0.16, -d);
  vec2 e = vec2(0.4, 0.0);
  vec2 g = vec2(smoothstep(0.0, s * 0.16, -sparkleSd(q + e.xy, s)) - smoothstep(0.0, s * 0.16, -sparkleSd(q - e.xy, s)),
                smoothstep(0.0, s * 0.16, -sparkleSd(q + e.yx, s)) - smoothstep(0.0, s * 0.16, -sparkleSd(q - e.yx, s))) / 0.8;
  vec3 n = normalize(vec3(-g * s * 0.22 * 0.67, 1.0));
  vec3 L = normalize(vec3(-0.857, -0.515, 0.9));
  float k = clamp((dot(n, L) - L.z) * 2.4, -1.0, 1.0);
  vec3 lit = vec3(1.0, 0.973, 0.937);
  vec3 shade = vec3(0.91, 0.79, 0.54);
  vec3 col = mix(lit, mix(lit, vec3(1.0), 0.55), max(k, 0.0) * 0.8);
  col = mix(col, shade, max(-k, 0.0) * 0.3);
  col += vec3(1.0, 0.97, 0.88) * pow(max(dot(n, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0), 28.0) * 0.5;
  col = mix(col, shade * 0.95, smoothstep(0.32, 0.0, h) * 0.18);
  return vec4(col, cover);
}

// --- micro confetti: an irregular foil fleck ---
vec4 fleck(vec2 q, float r, float seed, float hue, float aa, vec3 N, vec3 V) {
  float ang = atan(q.y, q.x);
  float d = length(q) - r * (1.0 + 0.22 * sin(3.0 * ang + seed * 9.0) + 0.12 * sin(5.0 * ang + seed * 3.0));
  if (d > aa) return vec4(0.0);
  float cover = 1.0 - smoothstep(-aa, aa, d);
  vec3 tint = hue > 5.5 ? GOLD_INK : pastel(hue);
  float caught = smoothstep(0.3, 2.4, studio(reflect(-V, normalize(N + vec3((hash22(vec2(seed * 91.0, 3.0)) - 0.5) * 0.9, 0.0)))));
  return vec4(tint * mix(0.78, 1.18, caught), cover);
}

// --- a snipped crescent of ribbon ---
vec4 crescent(vec2 q, float len, float seed, float hue, float aa, vec3 N, vec3 V) {
  float r = len * 0.5;
  vec2 c = vec2(0.0, r * 0.55);
  float ring = abs(length(q - c) - r) - 1.1;
  float cut = q.y - r * 0.15;
  float d = max(ring, cut);
  if (d > aa) return vec4(0.0);
  float cover = 1.0 - smoothstep(-aa, aa, d);
  vec3 base = ribbonFace(mod(hue, 2.0));
  float caught = smoothstep(0.35, 2.4, studio(reflect(-V, normalize(N + vec3((hash22(vec2(seed * 57.0, 1.0)) - 0.5) * 0.9, 0.0)))));
  return vec4(base * mix(0.74, 0.98, caught) + mix(base, vec3(1.0), 0.3) * 0.15 * caught * caught * caught, cover);
}

void main() {
  vec2 p = vP;
  float kind = vB.x;
  float seed = vB.y;
  float depth = vB.z;
  float hue = vB.w;
  float t = uTime;
  vec3 water = waterColour(p, t);
  float crest;
  vec2 wob = waterWob(p, t, crest);
  // seen through the water: deeper pieces sway with it more
  vec2 dp = p - vA.xy + wob * (0.25 + 1.2 * depth);
  // lying flat, seen at an angle: nearer (lower) pieces less foreshortened
  float squash = (kind > 3.5 && kind < 4.5) ? 1.0 : mix(0.62, 0.9, clamp(vA.y / uView.y, 0.0, 1.0));
  vec2 du = vec2(dp.x, dp.y / squash);
  float ca = cos(vA.w);
  float sa = sin(vA.w);
  vec2 q = vec2(ca * du.x + sa * du.y, -sa * du.x + ca * du.y);
  vec3 P = vec3(p, 0.0);
  vec3 V = normalize(uEye - P);
  vec3 N = normalize(vec3(vC.xy, 1.0));
  vec3 T0 = vec3(ca, sa, 0.0);
  vec3 T = normalize(T0 - N * dot(N, T0));
  vec3 B = cross(N, T);
  vec3 Lp = normalize(uLamp.xyz - P);
  float aa = 0.7 / uDpr + depth * 2.6;

  vec4 c = vec4(0.0);
  vec3 flare = vec3(0.0);
  float under = depth;
  if (kind < 1.5) {
    c = goldStar(q, vA.z, seed, aa, N, T, B, V, P, t, Lp);
    // a couple of flakes big enough to throw a star of light when they catch it
    for (int k = 0; k < 2; k++) {
      vec2 hp = (hash22(vec2(seed * 91.0, float(k) * 7.0)) - 0.5) * vA.z * 0.8;
      vec2 ht = (hash22(vec2(float(k) * 3.0, seed * 53.0)) - 0.5) * 0.9 + 0.07 * vec2(sin(t * 0.7 + float(k)), cos(t * 0.9));
      vec3 Nh = normalize(N + T * ht.x + B * ht.y);
      float e = studio(reflect(-V, Nh));
      float lamp = pow(max(dot(Nh, normalize(Lp + V)), 0.0), 120.0) * uLamp.w;
      float f = smoothstep(2.0, 6.0, e) + lamp * 1.5;
      vec2 hw = vec2(ca * hp.x - sa * hp.y, (sa * hp.x + ca * hp.y) * squash);
      flare += vec3(1.0, 0.95, 0.82) * glint(p - (vA.xy + hw), vA.z * 0.5) * f * (1.0 - 0.7 * depth);
    }
  } else if (kind < 2.5) {
    float fl = vC.w;
    c = holoStar(q, vA.z, seed, hue, aa, N, T, B, V, P, t, Lp, fl);
    float dd = length(dp);
    flare += mix(pastel(hue), vec3(1.0, 0.97, 0.92), 0.7) * fl * (exp(-dd / (vA.z * 0.45)) * 0.35 + glint(dp, vA.z * 1.5) * 0.6) * (1.0 - 0.6 * depth);
  } else if (kind < 3.5) {
    mat2 toWorld = mat2(ca, sa, -sa, ca);
    c = ribbon(q, vA.z, vC.w, seed, hue, vC.z, aa, V, P, toWorld, t, Lp, under);
    under = max(under, depth);
  } else if (kind < 4.5) {
    c = sparkle(q, vA.z, vC.w, aa);
    under = 0.0;
  } else if (kind < 5.5) {
    c = fleck(q, vA.z, seed, hue, aa, N, V);
  } else {
    c = crescent(q, vA.z, seed, hue, aa, N, V);
  }

  // In the water: a little red absorbed, then the milky body in front. Far
  // (higher) pieces sit under more of it; deeper ones much more.
  vec3 absorb = mix(vec3(1.0), vec3(0.86, 0.94, 0.99), under);
  vec3 deepW = water * vec3(0.82, 0.88, 0.96);
  vec3 veil = mix(water, deepW, smoothstep(0.3, 0.9, under));
  float haze = 0.05 + 0.10 * (1.0 - clamp(vA.y / uView.y, 0.0, 1.0)) + 0.30 * under;
  // gold hazes toward a neutral veil: blue haze over gold reads olive
  if (kind < 1.5) { veil = vec3(dot(veil, vec3(0.299, 0.587, 0.114))); haze *= 0.4; }
  if (kind > 3.5 && kind < 4.5) haze = 0.0;
  vec3 col = mix(c.rgb * absorb, veil, clamp(haze, 0.0, 0.7));
  float alpha = c.a * (kind < 1.5 ? 1.0 : mix(0.96, 0.9, depth));
  flare *= 1.0 - 0.6 * under;
  gl_FragColor = vec4(col * alpha + flare, alpha);
}
`;

/* --- Stage 2: mesq's paint passes ----------------------------------------- */

// Stroke shapes: one soft disc per 51 px cell (static, CSS px).
export const FS_NOISE = COMMON + `
const float SW = 30.0;
void main() {
  vec2 e = gl_FragCoord.xy / uOut * uView;
  float n = SW * 1.7;
  vec2 r = e / n;
  vec2 i = floor(r);
  vec2 a = hash22(i + uSeed * 13.7) * 0.4 + 0.3;
  float o = length(fract(r) - a) * n;
  float c = (hash12(i + uSeed * 2.3 + 41.9) * 0.28 + 0.32) * SW;
  float disc = 1.0 - smoothstep(c - SW * 0.1, c + SW * 0.06, o);
  float u = hash12(i + uSeed * 5.1 + 3.7);
  float paint = mxNoise(e / (SW * 0.1 + 1.6) + 41.3) * 0.35 + mxNoise(e / (SW * 0.03 + 0.9) + 17.9) * 0.15 + 0.5;
  gl_FragColor = vec4(disc, u, paint, 0.0);
}
`;

// Structure tensor of the colour (half CSS px).
export const FS_TENSOR = COMMON + `
uniform sampler2D uSrc;
vec3 s(vec2 uv, float x, float y) { return texture2D(uSrc, uv + vec2(x, y) / uView).rgb; }
void main() {
  vec2 uv = gl_FragCoord.xy / uOut;
  vec3 gx = (s(uv, 1.0, -1.0) + 2.0 * s(uv, 1.0, 0.0) + s(uv, 1.0, 1.0) - s(uv, -1.0, -1.0) - 2.0 * s(uv, -1.0, 0.0) - s(uv, -1.0, 1.0)) * 0.25;
  vec3 gy = (s(uv, -1.0, 1.0) + 2.0 * s(uv, 0.0, 1.0) + s(uv, 1.0, 1.0) - s(uv, -1.0, -1.0) - 2.0 * s(uv, 0.0, -1.0) - s(uv, 1.0, -1.0)) * 0.25;
  vec3 J = vec3(dot(gx, gx), dot(gy, gy), dot(gx, gy));
  float tr = J.x + J.y;
  gl_FragColor = vec4(J / (tr + 0.02), tr);
}
`;

export const blurFS = (taps: number) => COMMON + `
uniform sampler2D uSrc;
uniform vec2 uDir;
uniform float uW[${taps}];
void main() {
  vec2 uv = gl_FragCoord.xy / uOut;
  vec2 st = uDir / uOut;
  vec4 s = texture2D(uSrc, uv) * uW[0];
  for (int i = 1; i < ${taps}; i++) {
    vec2 o = st * float(i);
    s += (texture2D(uSrc, uv + o) + texture2D(uSrc, uv - o)) * uW[i];
  }
  gl_FragColor = s;
}
`;
export const W5 = [0.24084, 0.20117, 0.11723, 0.04766, 0.01352];
export const W11 = [0.10925, 0.10526, 0.09415, 0.07817, 0.06025, 0.04311, 0.02864, 0.01766, 0.01011, 0.00537, 0.00265];

// The brush orientation: along the colour's contours, horizontal where flat.
export const FS_FLOW = COMMON + `
uniform sampler2D uT1;
uniform sampler2D uT2;
const float HALO = 8.0;
const float STEP = 6.4;
void main() {
  vec2 uv = gl_FragCoord.xy / uOut;
  vec4 n = texture2D(uT1, uv);
  vec4 r = texture2D(uT2, uv);
  vec2 i = uv * uView;
  float a = mxNoise(i * 0.004 + uSeed * 1.9 + 23.1) * 0.35;
  vec2 o = vec2(-sin(a), cos(a));
  vec3 c = n.xyz + r.xyz * HALO + vec3(o.x * o.x, o.y * o.y, o.x * o.y) * 0.08;
  vec2 l = -vec2(c.x - c.y, 2.0 * c.z);
  float d = mxNoise(i / (STEP * 50.0) + uSeed * 3.1 + 77.7) * 0.42;
  vec2 h = l / max(length(l), 1e-9);
  float cd = cos(d);
  float sd = sin(d);
  gl_FragColor = vec4(h.x * cd - h.y * sd, h.x * sd + h.y * cd, sqrt(max(n.w, 0.0)), sqrt(max(r.w, 0.0)));
}
`;

// Fallback without half-float targets: the flat-water flow only, encoded.
export const FS_FLOW_FLAT = COMMON + `
const float STEP = 6.4;
void main() {
  vec2 uv = gl_FragCoord.xy / uOut;
  vec2 i = uv * uView;
  float a = mxNoise(i * 0.004 + uSeed * 1.9 + 23.1) * 0.35 + mxNoise(i / (STEP * 50.0) + uSeed * 3.1 + 77.7) * 0.42;
  vec2 h = vec2(cos(2.0 * a), sin(2.0 * a));   // doubled angle, like the tensor's
  gl_FragColor = vec4(h * 0.5 + 0.5, 0.0, 0.0);
}
`;

const FLOW_READ = `
#ifdef ENC
vec4 flowAt(vec2 uv) { vec4 r = texture2D(uFlow, uv); return vec4(r.xy * 2.0 - 1.0, 0.0, 0.0); }
#else
vec4 flowAt(vec2 uv) { return texture2D(uFlow, uv); }
#endif
`;

// Brush strokes: a line integral along the flow, with procedural dabs.
export const FS_STROKES = (enc: boolean) => (enc ? "#define ENC 1\n" : "") + COMMON + `
uniform sampler2D uSrc;
uniform sampler2D uFlow;
uniform sampler2D uNoise;
const float STEP = 6.4;
const float DENSITY = 0.3;
const float SW = 30.0;
` + FLOW_READ + `
vec2 dirAt(vec2 p) { vec4 r = flowAt(p / uView); float a = atan(r.y, r.x) * 0.5; return vec2(cos(a), sin(a)); }
float strokeW(vec4 e, float t) {
  float on = step(e.y, DENSITY);
  float k = fract(e.y / max(DENSITY, 1e-3) * 7.31) * 0.45 + 0.55;
  return e.x * on * k * (1.0 - smoothstep(0.55, 1.0, t));
}
float bright(vec4 e) { return (fract(e.y * 13.7) - 0.5) * 0.07 + 1.0; }
vec2 cellCentre(vec2 p) { float c = SW * 1.7; vec2 n = floor(p / c); return (n + hash22(n + uSeed * 13.7) * 0.4 + 0.3) * c; }
void main() {
  vec2 uv = gl_FragCoord.xy / uOut;
  vec2 o = uv * uView;
  vec2 d0 = dirAt(o);
  vec4 n0 = texture2D(uNoise, uv);
  vec4 a0 = texture2D(uSrc, uv);
  vec3 c0 = a0.rgb;
  float own = a0.a;   // this pixel's confetti coverage
  float jit = (n0.z - 0.5) * 0.5;
  float best = strokeW(n0, 0.0);
  vec2 bestP = o;
  float bestB = bright(n0);
  vec3 acc = c0;
  float wsum = 1.0;
  for (int side = 0; side < 2; side++) {
    float sgn = side == 0 ? 1.0 : -1.0;
    vec2 p = o;
    vec2 prev = d0 * sgn;
    for (int i = 1; i <= 10; i++) {
      float l = float(i) / 10.0;
      vec2 x = dirAt(p);
      if (dot(x, prev) < 0.0) x = -x;
      p += x * STEP;
      prev = x;
      vec2 q = p / uView;
      vec4 w = texture2D(uNoise, q);
      vec4 Dv = texture2D(uSrc, q);
      float O = strokeW(w, l + jit);
      if (O > best) { bestP = p; bestB = bright(w); }
      best = max(best, O);
      // water strokes never pick up confetti (and a piece is painted only by itself)
      float k = (cos(l * 3.14159265) * 0.5 + 0.5) * (1.0 - Dv.a * (1.0 - own));
      acc += Dv.rgb * k;
      wsum += k;
    }
  }
  vec4 dv = texture2D(uSrc, cellCentre(bestP) / uView);
  float useDab = smoothstep(0.02, 0.2, best) * (1.0 - dv.a * (1.0 - own));
  gl_FragColor = vec4(mix(acc / wsum, dv.rgb * bestB, useDab), 1.0);
}
`;

// The composite: smear, dry-brush flecks, and the fixed 10-level dither.
export const FS_COMPOSITE = (enc: boolean) => (enc ? "#define ENC 1\n" : "") + COMMON + `
uniform sampler2D uSrc;
uniform sampler2D uStrokes;
uniform sampler2D uFlow;
uniform float uLevels;
const float SMEAR = 0.297;
const float STYLE = 2.0;
const float SPECKLE = 1.5;
const float SPECKLE_SIZE = 0.9;
` + FLOW_READ + `
float speckleMask(vec2 e) { return smoothstep(-0.1, 0.55, mxNoise(e * 0.045 + uSeed + 12.7) + mxNoise(e * 0.14 + 3.3) * 0.35); }
float fleckDot(vec2 e, float t, vec2 n) { float r = t * 0.3 + 0.15; return 1.0 - smoothstep(r - 0.08, r + 0.04, length(fract(e) - (n * 0.5 + 0.25))); }
float ditherT(vec2 e) { return clamp(mxNoise(e / (SPECKLE_SIZE * 1.3) * 0.85 + uSeed * 9.1) * 0.6 + hash12(floor(e * uDpr) + 3.7) * 0.4 + 0.2, 0.0, 1.0); }
void main() {
  vec2 uv = gl_FragCoord.xy / uOut;
  vec2 c = uv * uView;
  vec4 b4 = texture2D(uSrc, uv);
  vec3 base = clamp(b4.rgb, 0.0, 1.0);
  float oA = b4.a;
  vec3 s = clamp(texture2D(uStrokes, uv).rgb, 0.0, 1.0);
  vec4 fl = flowAt(uv);
  float ang = atan(fl.y, fl.x) * 0.5;
  vec2 across = vec2(-sin(ang), cos(ang));
  float g = SPECKLE_SIZE * 2.1;
  vec2 cg = c / g;
  vec2 cell = floor(cg);
  float b = hash12(cell + uSeed * 3.3);
  float x = hash12(cell + uSeed * 1.7 + 71.1);
  float side = x < 0.5 ? 1.0 : -1.0;
  vec2 fuv = uv + across * side * g * (b * 3.0 + 1.2) / uView;
  fuv.y = min(fuv.y, 1.0 - 0.5 / uOut.y);   // never borrow from above the top edge
  vec4 f4 = texture2D(uSrc, fuv);
  vec3 fleckCol = f4.rgb;
  float oB = f4.a;
  vec3 col = base;
  vec3 dd = s - col;
  col = mix(col, s, clamp(SMEAR * STYLE * exp(dot(dd, dd) * -10.0), 0.0, 1.0));
  float edge = smoothstep(0.02, 0.1, fl.w) * 0.85 + smoothstep(0.03, 0.2, fl.z) * 0.3 + 0.04;
  float amt = SPECKLE * STYLE * edge * speckleMask(c) * 1.4;
  col = mix(col, fleckCol, (1.0 - max(oA, oB)) * step(b, amt) * fleckDot(cg, x, hash22(cell + 5.5)));
  float lv = uLevels * (1.0 + 3.0 * oA);   // pieces get a much finer grain, so the foil stays smooth
  col = mix(col, floor(col * lv + ditherT(c)) / lv, clamp(SPECKLE * STYLE * 0.7, 0.0, 1.0));
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
