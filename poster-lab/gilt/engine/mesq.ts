/* The water: mesq's "jelly painting" passes, COPIED from
   src/pages/home/pond/shaders.ts and retuned for the gilded sheet (plan §2.6).
   GLSL ES 1.00 / WebGL1.

   What changed from the production copy:
   - No confetti. The pieces never enter the scene texture A, so the paint
     passes (strokes, smear, flecks, dither) never touch the gold.
   - FIELD: a band-space composition map uUnder (Monet's zones) is laid over the
     drifting noise: R cloud reflection (pale), G willow reflection (cobalt),
     B lavender shadow, A sun path. DRIFT / FIELD_TIME are uniforms (concept data).
   - FLOW: flatter, more horizontal dabs (angle noise x0.35 -> x0.15, curl 0.42 -> 0.25).
   - STROKES: bigger, calmer dabs (SW 30 -> 40, STEP 6.4 -> 8).
   - COMPOSITE: writes the painted ground G (a texture), not the canvas. Dither is
     16 levels (was 9) at 0.6 strength, and fades to nothing within ~6 CSS px of
     any piece (NEAR.g), so the metal sits on calm paper.

   Units are CSS px throughout, x right, y DOWN. */

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

/* Production numbers (shaders.ts DRIFT / FIELD_TIME), kept as Pranavi asked. */
export const DRIFT = 3.5;
export const FIELD_TIME = 42;

/* The swell, shared with gilt-scene.ts (which tilts each piece by its slope). */
export const SWELL = { length: 700, period: 9 };

export const WATER = `
uniform float uTime;
uniform float uDrift;       // px/s, the whole surface moves as one
uniform float uFieldTime;   // s, how slowly the colour field changes shape
uniform vec3 uBase;
uniform vec3 uDark;
uniform vec3 uLight;
uniform vec3 uSunTint;
uniform vec4 uRipple[6];   // x, y, start time, strength

const float VSCALE = 800.0;

// How far the surface has moved at p: a slow swell, and the click rings.
vec2 waterWob(vec2 p, float t, out float crest) {
  float ph = 6.2831853 * (p.x / ${SWELL.length.toFixed(1)} - t / ${SWELL.period.toFixed(1)});
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

// The drifting body colour; f (the field's value) is returned for the under-painting.
vec3 waterColour(vec2 p, float t, out float f) {
  vec2 c = vec2(p.x - t * uDrift, p.y / 0.54);   // his table, seen at ~32 degrees
  float l = uSeed * 7.31;
  float tt = t / uFieldTime;   // the field changes shape slowly
  vec2 warp = vec2(mxNoise(c / VSCALE * 1.12 + vec2(l, 1.7 + tt)), mxNoise(c / VSCALE * 1.12 + vec2(4.1 + tt, l))) * 0.069 * VSCALE;
  vec2 d = c + warp;
  f = mxNoise(d / VSCALE + vec2(l * 0.37, 0.5 + tt * 0.6)) + mxNoise(d / (VSCALE * 0.45) + vec2(2.3 - tt * 0.5, l * 0.21)) * 0.35;
  vec3 col = mix(uBase, uDark, smoothstep(0.06, 0.48, -f));
  col = mix(col, uLight, smoothstep(-0.06, 0.36, f));
  vec2 s = (p / uView - vec2(0.74, 0.34)) / vec2(0.16, 0.36);
  col = mix(col, uSunTint, exp(-dot(s, s)) * 0.12);
  return col;
}
`;

export const VS_FULL = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/* --- FIELD: the water colour plus Monet's composition ----------------------- */
export const FS_FIELD = COMMON + WATER + `
uniform sampler2D uUnder;   // band space, y down: R cloud, G willow, B lavender, A sun path
uniform vec4 uUnderK;       // strength of each
uniform vec3 uCloudA;
uniform vec3 uCloudB;
uniform vec3 uWillowA;
uniform vec3 uWillowB;
uniform vec3 uLavA;
uniform vec3 uLavB;
uniform vec3 uSunCol;
uniform vec4 uBroken;       // strength, dab scale (CSS px), aspect (w:h), far flattening
void main() {
  vec2 uv = gl_FragCoord.xy / uOut;
  vec2 p = vec2(uv.x, 1.0 - uv.y) * uView;
  float crest;
  vec2 w = waterWob(p, uTime, crest);
  float f;
  vec3 col = waterColour(p + w, uTime, f);
  // The under-painting does not drift (a reflection stays where the sky is),
  // but the moving water breaks its edges up, like broken brushwork.
  vec4 u = texture2D(uUnder, (p + w * 2.0) / uView);
  vec2 c = vec2(p.x - uTime * uDrift, p.y / 0.54);
  float b1 = mxNoise(c / vec2(140.0, 60.0) + uSeed * 1.3) * 0.5 + 0.5;
  float b2 = mxNoise(c / vec2(48.0, 22.0) + uSeed * 2.9 + 7.1) * 0.5 + 0.5;
  float brk = clamp(0.55 + 0.6 * (b1 - 0.5) + 0.45 * (b2 - 0.5) + 0.35 * f, 0.0, 1.2);
  col = mix(col, mix(uLavB, uLavA, b1), clamp(u.b * uUnderK.z * brk, 0.0, 1.0));
  col = mix(col, mix(uCloudB, uCloudA, smoothstep(0.3, 0.8, b2)), clamp(u.r * uUnderK.x * brk, 0.0, 1.0));
  col = mix(col, mix(uWillowB, uWillowA, b2), clamp(u.g * uUnderK.y * (0.7 + 0.5 * b1), 0.0, 1.0));
  col = mix(col, uSunCol, clamp(u.a * uUnderK.w * (0.6 + 0.6 * b2), 0.0, 1.0));
  // Broken colour: dab-sized horizontal patches of the neighbouring colours
  // (lavender, pale sky, cobalt) that the stroke pass turns into flickering
  // dabs. Flatter and smaller toward the top (further away).
  float far = mix(uBroken.w, 1.0, clamp(p.y / uView.y, 0.0, 1.0));
  vec2 bc = vec2(c.x / (uBroken.y * far), p.y / (uBroken.y / uBroken.z * far)) + uSeed * 3.7;
  float k1 = mxNoise(bc);
  float k2 = mxNoise(bc * vec2(0.7, 1.3) + 19.3) + 0.35 * b1 - 0.175;
  vec3 accent = k2 < -0.12 ? mix(uLavA, uLavB, b2) : (k2 > 0.14 ? mix(uCloudB, uCloudA, b1) : mix(uDark, uWillowA, 0.35 + 0.3 * b2));
  col = mix(col, accent, uBroken.x * smoothstep(0.08, 0.32, abs(k1)));
  col += crest * 0.09;
  gl_FragColor = vec4(col, 0.0);
}
`;

/* --- Stroke shapes: one soft disc per 1.7*SW px cell (static, CSS px) ------- */
export const FS_NOISE = (SW: number, BRISTLE = 1, PTOP = 1) => COMMON + `
const float SW = ${SW.toFixed(2)};
const float BRISTLE = ${BRISTLE.toFixed(3)};   // the 2 px bristle jitter (1 = mesq; lower = calmer ground)
const float PTOP = ${PTOP.toFixed(3)};         // dab size at the top edge (far) relative to the bottom
void main() {
  vec2 e0 = gl_FragCoord.xy / uOut * uView;
  float yd = uView.y - e0.y;                     // y down
  vec2 e = vec2(e0.x, -yd) / mix(PTOP, 1.0, yd / uView.y);   // smaller, flatter dabs toward the top
  float n = SW * 1.7;
  vec2 r = e / n;
  vec2 i = floor(r);
  vec2 a = hash22(i + uSeed * 13.7) * 0.4 + 0.3;
  float o = length(fract(r) - a) * n;
  float c = (hash12(i + uSeed * 2.3 + 41.9) * 0.28 + 0.32) * SW;
  float disc = 1.0 - smoothstep(c - SW * 0.1, c + SW * 0.06, o);
  float u = hash12(i + uSeed * 5.1 + 3.7);
  float paint = mxNoise(e / (SW * 0.1 + 1.6) + 41.3) * 0.35 + mxNoise(e / (SW * 0.03 + 0.9) + 17.9) * 0.15 * BRISTLE + 0.5;
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

/* The brush orientation: along the colour's contours, horizontal where flat.
   Retuned flatter (Monet's water dabs lie along the surface). */
/* Willow reflections hang from the top edge as VERTICAL strokes (Monet's
   Water Lilies 1906): where the under map's G (willow) is strong near the top,
   the brush turns vertical. uVert = strength, fade-out y (band fraction). */
const WILLOW_VERT = `
uniform sampler2D uUnder;
uniform vec2 uVert;
vec2 willowVert(vec2 h, vec2 uv) {
  vec2 p = vec2(uv.x, 1.0 - uv.y);                 // band space, y down
  float wv = texture2D(uUnder, p).g * (1.0 - smoothstep(uVert.y * 0.45, uVert.y, p.y)) * uVert.x;
  // doubled-angle space: vertical is (-1, 0); a little wobble so streaks are not ruled lines
  float j = mxNoise(p * uView / vec2(9.0, 60.0) + 5.3) * 0.5;
  vec2 v = vec2(-cos(j), sin(j));
  vec2 m = mix(h, v, clamp(wv, 0.0, 1.0));
  return m / max(length(m), 1e-6);
}
`;
export const FS_FLOW = (STEP: number, ANGLE: number, CURL: number) => COMMON + WILLOW_VERT + `
uniform sampler2D uT1;
uniform sampler2D uT2;
const float HALO = 8.0;
const float STEP = ${STEP.toFixed(2)};
void main() {
  vec2 uv = gl_FragCoord.xy / uOut;
  vec4 n = texture2D(uT1, uv);
  vec4 r = texture2D(uT2, uv);
  vec2 i = uv * uView;
  float a = mxNoise(i * 0.004 + uSeed * 1.9 + 23.1) * ${ANGLE.toFixed(3)};
  vec2 o = vec2(-sin(a), cos(a));
  vec3 c = n.xyz + r.xyz * HALO + vec3(o.x * o.x, o.y * o.y, o.x * o.y) * 0.08;
  vec2 l = -vec2(c.x - c.y, 2.0 * c.z);
  float d = mxNoise(i / (STEP * 50.0) + uSeed * 3.1 + 77.7) * ${CURL.toFixed(3)};
  vec2 h = l / max(length(l), 1e-9);
  float cd = cos(d);
  float sd = sin(d);
  vec2 hv = willowVert(vec2(h.x * cd - h.y * sd, h.x * sd + h.y * cd), uv);
  gl_FragColor = vec4(hv, sqrt(max(n.w, 0.0)), sqrt(max(r.w, 0.0)));
}
`;

// Fallback without half-float targets: the flat-water flow only, encoded.
export const FS_FLOW_FLAT = (STEP: number, ANGLE: number, CURL: number) => COMMON + WILLOW_VERT + `
const float STEP = ${STEP.toFixed(2)};
void main() {
  vec2 uv = gl_FragCoord.xy / uOut;
  vec2 i = uv * uView;
  float a = mxNoise(i * 0.004 + uSeed * 1.9 + 23.1) * ${ANGLE.toFixed(3)} + mxNoise(i / (STEP * 50.0) + uSeed * 3.1 + 77.7) * ${CURL.toFixed(3)};
  vec2 h = willowVert(vec2(cos(2.0 * a), sin(2.0 * a)), uv);   // doubled angle, like the tensor's
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
export const FS_STROKES = (enc: boolean, SW: number, STEP: number, PTOP = 1) => (enc ? "#define ENC 1\n" : "") + COMMON + `
uniform sampler2D uSrc;
uniform sampler2D uFlow;
uniform sampler2D uNoise;
uniform vec3 uAccA;         // broken colour, per dab: lavender
uniform vec3 uAccB;         // pale sky
uniform vec3 uAccC;         // cobalt
uniform vec4 uDabBroken;    // share of dabs that take an accent, strength, lavender share, pale share
const float STEP = ${STEP.toFixed(2)};
const float DENSITY = 0.3;
const float SW = ${SW.toFixed(2)};
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
  vec3 c0 = texture2D(uSrc, uv).rgb;
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
      p += x * STEP * mix(${PTOP.toFixed(3)}, 1.0, clamp(1.0 - p.y / uView.y, 0.0, 1.0));
      prev = x;
      vec2 q = p / uView;
      q.y = clamp(q.y, 0.5 / uOut.y, 1.0 - 0.5 / uOut.y);
      vec4 w = texture2D(uNoise, q);
      float O = strokeW(w, l + jit);
      if (O > best) { bestP = p; bestB = bright(w); }
      best = max(best, O);
      float k = cos(l * 3.14159265) * 0.5 + 0.5;
      acc += texture2D(uSrc, q).rgb * k;
      wsum += k;
    }
  }
  float sP = mix(${PTOP.toFixed(3)}, 1.0, clamp(1.0 - bestP.y / uView.y, 0.0, 1.0));
  vec2 eP = vec2(bestP.x, bestP.y - uView.y) / sP;            // the dab grid's (perspective) space
  vec2 cc = cellCentre(eP) * sP + vec2(0.0, uView.y);
  vec3 dv = texture2D(uSrc, clamp(cc / uView, vec2(0.0), vec2(1.0))).rgb;
  // Broken colour, Monet's way: some whole dabs are laid in a neighbouring colour.
  vec2 cellId = floor(eP / (SW * 1.7));
  float h1 = hash12(cellId + uSeed * 7.7);
  float h2 = hash12(cellId + uSeed * 3.1 + 19.1);
  vec3 acc3 = h2 < uDabBroken.z ? uAccA : (h2 < uDabBroken.z + uDabBroken.w ? uAccB : uAccC);
  dv = mix(dv, acc3, uDabBroken.y * step(h1, uDabBroken.x) * (0.6 + 0.4 * hash12(cellId + 5.3)));
  float useDab = smoothstep(0.02, 0.2, best);
  gl_FragColor = vec4(mix(acc / wsum, dv * bestB, useDab), 1.0);
}
`;

/* COMPOSITE -> G (the painted ground): smear, dry-brush flecks, and a calmer
   dither that fades out next to the pieces. */
export const FS_COMPOSITE = (enc: boolean) => (enc ? "#define ENC 1\n" : "") + COMMON + `
uniform sampler2D uSrc;
uniform sampler2D uStrokes;
uniform sampler2D uFlow;
uniform sampler2D uNear;     // R tight blurred coverage, G wide
uniform float uLevels;       // 16
uniform float uDitherAmt;    // 0.6
uniform vec2 uDitherNear;    // NEAR.g band over which the dither fades out (0.05, 0.4)
const float SMEAR = 0.297;
const float STYLE = 2.0;
uniform float uSpeckle;      // dry-brush flecks (mesq: 1.5)
const float SPECKLE_SIZE = 0.9;
` + FLOW_READ + `
float speckleMask(vec2 e) { return smoothstep(-0.1, 0.55, mxNoise(e * 0.045 + uSeed + 12.7) + mxNoise(e * 0.14 + 3.3) * 0.35); }
float fleckDot(vec2 e, float t, vec2 n) { float r = t * 0.3 + 0.15; return 1.0 - smoothstep(r - 0.08, r + 0.04, length(fract(e) - (n * 0.5 + 0.25))); }
float ditherT(vec2 e) { return clamp(mxNoise(e / (SPECKLE_SIZE * 1.3) * 0.85 + uSeed * 9.1) * 0.6 + hash12(floor(e * uDpr) + 3.7) * 0.4 + 0.2, 0.0, 1.0); }
void main() {
  vec2 uv = gl_FragCoord.xy / uOut;
  vec2 c = uv * uView;
  vec3 base = clamp(texture2D(uSrc, uv).rgb, 0.0, 1.0);
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
  vec3 fleckCol = texture2D(uSrc, fuv).rgb;
  vec3 col = base;
  vec3 dd = s - col;
  col = mix(col, s, clamp(SMEAR * STYLE * exp(dot(dd, dd) * -10.0), 0.0, 1.0));
  float edge = smoothstep(0.02, 0.1, fl.w) * 0.85 + smoothstep(0.03, 0.2, fl.z) * 0.3 + 0.04;
  float amt = uSpeckle * STYLE * edge * speckleMask(c) * 1.4;
  float near = texture2D(uNear, uv).g;
  float calm = 1.0 - smoothstep(uDitherNear.x, uDitherNear.y, near);
  col = mix(col, fleckCol, step(b, amt) * fleckDot(cg, x, hash22(cell + 5.5)) * (0.4 + 0.6 * calm));
  col = mix(col, floor(col * uLevels + ditherT(c)) / uLevels, uDitherAmt * calm);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
