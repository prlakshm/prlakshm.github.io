/* The gilded sheet's own passes (GLSL ES 1.00 / WebGL1). Plan §2.3-2.4.

   PIECES  atlas quads from layout.json, drawn back to front into two targets:
           FA = print (sRGB, premultiplied) + coverage
           FX = R foil, G pearl, B height above the paper, A piece id / 255
   NEAR    coverage blurred at CSS/2: R tight (sigma ~2 CSS px), G wide (~8 CSS px)
   FINISH  all the lighting, in linear light: normals from FX height, an
           achromatic studio seen in reflection-angle space, the cursor lamp,
           gold as a coloured mirror (dark at rest), the painted ground as matte
           paper with the emboss shading, pooled shade and a contact step from
           NEAR, then sRGB and film grain.

   The lighting MODEL follows the measured numbers of Ann Nguyen's foil cards
   (plan §2.4); the code is our own.

   Coordinates: p = CSS px in the band (x right, y DOWN). Lighting runs y-up:
   q = (p.x, -p.y), z out of the sheet toward the viewer. */

import { COMMON } from "./mesq";

export type Flags = { FOIL_WARP?: boolean; SWELL_TILT?: boolean; INVERT_RELIEF?: boolean };
const defs = (f: Flags) =>
  (f.FOIL_WARP ? "#define FOIL_WARP 1\n" : "") + (f.SWELL_TILT ? "#define SWELL_TILT 1\n" : "") + (f.INVERT_RELIEF ? "#define INVERT_RELIEF 1\n" : "");

/* Vertices per piece: a strip of SEG segments down the piece's local v, so
   FOIL_WARP can bend strands. 6 vertices per segment, 8 floats per vertex. */
export const SEG = 8;
/* The per-piece tilt texture stores +-TILT_RANGE rad in a byte (0.5 = 0). */
export const TILT_RANGE = 0.25;
export const FLOATS_PER_VERTEX = 8; // pos(2) uv(2) meta(4)

export const VS_PIECE = (f: Flags) => defs(f) + `
attribute vec2 aPos;    // CSS px, y down
attribute vec2 aUV;     // atlas uv (y down, as the image)
attribute vec4 aMeta;   // piece index, phase 0..1, local v 0..1, warp weight
uniform vec2 uView;
uniform vec4 uWarp;     // amp CSS px, wavelength CSS px, period s, time s
varying vec2 vUV;
varying vec4 vMeta;
void main() {
  vec2 p = aPos;
#ifdef FOIL_WARP
  // a slow wave travelling DOWN each strand (reflections shimmer, like liquid metal)
  float ph = 6.2831853 * (p.y / uWarp.y - uWarp.w / uWarp.z + aMeta.y);
  p.x += uWarp.x * aMeta.w * (0.8 * sin(ph) + 0.3 * sin(2.3 * ph + 6.2831853 * aMeta.y));
#endif
  vUV = aUV;
  vMeta = aMeta;
  gl_Position = vec4(p.x / uView.x * 2.0 - 1.0, 1.0 - p.y / uView.y * 2.0, 0.0, 1.0);
}
`;

/* One fragment shader, four modes (one draw of all pieces per mode):
   0  FA: premultiplied print + coverage, blended over
   1  FX.rg: foil and pearl, blended over by coverage (colorMask r,g)
   2  FX.b: height above the paper, blended over by max(coverage, shoulder) so a
      piece's shoulder never dents a neighbour's plateau (colorMask b)
   3  FX.a: piece id, no blending, only where coverage >= 0.5 (colorMask a) */
export const FS_PIECE = `
precision highp float;
uniform sampler2D uPrint;   // premultiplied on upload
uniform sampler2D uFx;
uniform float uMode;
uniform float uPaperH;      // 0.08
uniform float uPlateau;     // 0.51 = 0.59 - 0.08
varying vec2 vUV;
varying vec4 vMeta;
void main() {
  vec4 pr = texture2D(uPrint, vUV);
  float cov = pr.a;
  if (uMode < 0.5) { gl_FragColor = pr; return; }
  vec4 fx = texture2D(uFx, vUV);
  if (uMode < 1.5) { gl_FragColor = vec4(min(fx.r, cov), fx.g * cov, 0.0, cov); return; }
  if (uMode < 2.5) {
    float hr = max(fx.b - uPaperH, 0.0);
    gl_FragColor = vec4(0.0, 0.0, hr, max(cov, clamp(hr / uPlateau, 0.0, 1.0)));
    return;
  }
  if (uMode < 2.9) {   // the "over by coverage" half of the exact height blend
    gl_FragColor = vec4(0.0, 0.0, max(fx.b - uPaperH, 0.0), cov);
    return;
  }
  if (cov < 0.5) discard;
  gl_FragColor = vec4(0.0, 0.0, 0.0, (vMeta.x + 1.0) / 255.0);
}
`;

/* NEAR, step 1: box-average the coverage (FA.a) down to CSS/2. */
export const FS_NEAR_DOWN = COMMON + `
uniform sampler2D uSrc;
void main() {
  vec2 base = floor(gl_FragCoord.xy);
  float c = 0.0;
  for (int j = 0; j < 4; j++) {
    for (int i = 0; i < 4; i++) {
      vec2 uv = (base + (vec2(float(i), float(j)) + 0.5) / 4.0) / uOut;
      c += texture2D(uSrc, uv).a;
    }
  }
  c /= 16.0;
  gl_FragColor = vec4(c, c, 0.0, 1.0);
}
`;

/* NEAR, step 2: separable Gaussian, R tight and G wide in the same pass. */
export const NEAR_TAPS = 13;
export const FS_NEAR_BLUR = COMMON + `
uniform sampler2D uSrc;
uniform vec2 uDir;
uniform float uWT[${NEAR_TAPS}];
uniform float uWW[${NEAR_TAPS}];
void main() {
  vec2 uv = gl_FragCoord.xy / uOut;
  vec2 st = uDir / uOut;
  vec4 c = texture2D(uSrc, uv);
  vec2 s = vec2(c.r * uWT[0], c.g * uWW[0]);
  for (int i = 1; i < ${NEAR_TAPS}; i++) {
    vec2 o = st * float(i);
    vec4 a = texture2D(uSrc, uv + o);
    vec4 b = texture2D(uSrc, uv - o);
    s += vec2((a.r + b.r) * uWT[i], (a.g + b.g) * uWW[i]);
  }
  gl_FragColor = vec4(s, 0.0, 1.0);
}
`;

export const gaussWeights = (sigma: number, taps = NEAR_TAPS) => {
  const w = Array.from({ length: taps }, (_, i) => Math.exp(-0.5 * (i / Math.max(sigma, 1e-3)) ** 2));
  const sum = w[0] + 2 * w.slice(1).reduce((a, b) => a + b, 0);
  return w.map((x) => x / sum);
};

/* FINISH: the whole lighting model, once per displayed frame. */
export const FS_FINISH = (f: Flags) => defs(f) + COMMON + `
uniform sampler2D uG;       // painted ground (sRGB)
uniform sampler2D uFA;      // print (sRGB, premultiplied) + coverage
uniform sampler2D uFX;      // foil, pearl, height above paper, id/255
uniform sampler2D uNear;    // R tight, G wide blurred coverage
uniform sampler2D uTilt;    // 256x1: each piece's tilt (rad), 0.5 = 0
uniform vec2 uShift;        // the studio's shift (sway + pointer), rad
uniform vec4 uLamp;         // x, y (CSS, y down), height, on
uniform float uSunX;        // strip light centre (rad), drifting
uniform float uGrainSeed;
uniform float uDebug;
uniform float uRelief;
uniform float uTap;          // normal taps, device px
uniform float uFloor;
uniform float uPersp;
uniform float uEyeZ;
uniform float uAmbient;
uniform vec4 uKey;          // strength, cx, cy, soft
uniform vec3 uKeyHS;        // half size x, y, falloff
uniform vec4 uStrip;        // strength, (cx = uSunX), cy, soft
uniform vec2 uStripHS;
uniform vec4 uBounce;       // strength, cx, cy, soft
uniform vec2 uBounceHS;
uniform vec4 uDome;         // strength, direction (az, el) in angle space, -
uniform vec2 uDomeR;        // smoothstep range along that direction (rad)
uniform vec2 uCaught;       // smoothstep range of the studio radiance
uniform vec3 uTint;
uniform vec4 uMetalK;       // glow, caught^3, hot, paper glow
uniform vec2 uExp;          // hot, glow exponents
uniform float uTooth;
uniform vec2 uPaper;        // ground shading a + b * N.Lkey
uniform vec3 uKeyDir;       // the paper's key light, y up
uniform vec4 uPool;         // strength, tight-subtract, noise scale CSS px, noise amount
uniform vec3 uPoolCol;      // linear
uniform vec2 uContact;      // strength, offset CSS px
uniform vec2 uPearl;        // amount, spectrum mix
uniform float uGrain;
uniform vec2 uSwell;        // SWELL_TILT amp (rad), water time
uniform vec3 uInv;          // INVERT_RELIEF: paint plateau, leaf depth, impasto

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}
// Paper tooth: two stretched value noises, static.
vec2 tooth(vec2 p) {
  return vec2(vnoise(p / vec2(1.3, 3.5) + 3.1), vnoise(p / vec2(3.5, 1.3) + 17.7)) * 2.0 - 1.0;
}
float sbox(vec2 a, vec2 c, vec2 hs, float soft) {
  vec2 d = abs(a - c) - hs;
  return 1.0 - smoothstep(-soft, soft, max(d.x, d.y));
}
// The studio a mirror sees, in angle space (azimuth, elevation) minus the shift.
float studio(vec3 r) {
  vec2 a = vec2(atan(r.x, r.z), asin(clamp(r.y, -1.0, 1.0))) - uShift;
  float e = uAmbient;
  vec2 k = (a - uKey.yz) / uKeyHS.xy;
  e += uKey.x * sbox(a, uKey.yz, uKeyHS.xy, uKey.w) * (1.0 - uKeyHS.z * min(dot(k, k), 1.96));
  e += uStrip.x * sbox(a, vec2(uSunX, uStrip.z), uStripHS, uStrip.w);
  e += uBounce.x * sbox(a, uBounce.yz, uBounceHS, uBounce.w);
  // the sky dome: steep facets that face up-left (the emboss shoulder on that
  // side) see open sky; without it every rim sits at the floor and reads as an outline
  e += uDome.x * smoothstep(uDomeR.x, uDomeR.y, dot(a, normalize(uDome.yz)));
  return e;
}
vec3 rainbow(float ph) { return 0.5 + 0.5 * cos(6.2831853 * (ph + vec3(0.0, 0.33, 0.67))); }

#ifdef INVERT_RELIEF
// The leaf sits low; the paint around it is raised impasto whose ridges follow
// the painted ground's value.
float hAt(vec2 uv) {
  float f = texture2D(uFX, uv).b;
  float pl = 1.0 - smoothstep(0.0, 0.25, f);
  float v = dot(texture2D(uG, uv).rgb, vec3(0.299, 0.587, 0.114));
  return uInv.x * pl - uInv.y * f + uInv.z * v * pl;
}
#else
float hAt(vec2 uv) { return texture2D(uFX, uv).b; }
#endif

#ifdef SWELL_TILT
// The water's swell under each foil pixel: the glitter path shimmers and travels.
vec2 swellSlope(vec2 p, float t) {
  float ph1 = 6.2831853 * (p.x / 700.0 - t / 9.0) + p.y / 37.0;
  float ph2 = 6.2831853 * (p.x / 230.0 + t / 3.7) - p.y / 23.0;
  float ph3 = 6.2831853 * (p.x / 97.0 - t / 2.3) + p.y / 11.0;
  return uSwell.x * vec2(cos(ph1) + 0.5 * cos(ph2) + 0.3 * cos(ph3),
                         0.6 * sin(0.8 * ph1 + 1.3) + 0.4 * sin(ph2 + 0.7) + 0.3 * sin(ph3 + 2.0));
}
#endif

void main() {
  vec2 fc = gl_FragCoord.xy;
  vec2 uv = fc / uOut;
  vec2 px = 1.0 / uOut;
  vec2 p = vec2(fc.x, uOut.y - fc.y) / uDpr;   // CSS px, y down
  vec2 q = vec2(p.x, -p.y);                    // y up
  vec4 g4 = texture2D(uG, uv);
  vec4 fa = texture2D(uFA, uv);
  vec4 fx = texture2D(uFX, uv);
  float cov = fa.a;
  float foil = fx.r;
  float pearl = fx.g;

  // --- normal: emboss relief from the height, paper tooth, per-piece tilt
  float hC = hAt(uv);
  // central difference over +-uTap device px (1 = finest; 1.5 low-passes the crinkle
  // a little through bilinear taps, which calms pixel glitter but keeps the shoulder)
  vec2 tp = px * uTap;
  vec2 s = vec2(hAt(uv + vec2(tp.x, 0.0)) - hAt(uv - vec2(tp.x, 0.0)),
                hAt(uv + vec2(0.0, tp.y)) - hAt(uv - vec2(0.0, tp.y))) * uDpr * 0.5 / uTap;   // per CSS px, y up
  float id = floor(fx.a * 255.0 + 0.5);
  vec2 tilt = (texture2D(uTilt, vec2((id + 0.5) / 256.0, 0.5)).rg - 0.5) * ${(2 * 0.25).toFixed(3)};
  vec2 bump = s * uRelief + tooth(p) * uTooth * (1.0 - foil);
#ifdef SWELL_TILT
  bump -= swellSlope(p, uSwell.y) * foil;
#endif
  vec3 N = normalize(vec3(-bump + tilt * foil, 1.0));

  // --- what the metal reflects
  vec3 E = vec3(uView.x * 0.5, -uView.y * 0.5, uEyeZ);
  vec3 V = normalize(vec3((E.xy - q) * uPersp, E.z));
  vec3 R = reflect(-V, N);
  float env = studio(R);
  float caught = smoothstep(uCaught.x, uCaught.y, env);
  vec3 Lp = vec3(uLamp.x, -uLamp.y, uLamp.z);
  vec3 Lm = normalize(Lp - vec3(q, 0.0));
  vec3 Hh = normalize(Lm + V);
  float nh = max(dot(N, Hh), 0.0);
  float hot = pow(nh, uExp.x) * uLamp.w;
  float glow = pow(nh, uExp.y) * uLamp.w;

  // --- the painted ground, with pooled shade and a contact step around pieces
  vec4 nr = texture2D(uNear, uv);
  vec3 kd = normalize(uKeyDir);
  float nOff = texture2D(uNear, uv + normalize(kd.xy) * uContact.y / uView).r;
  float top = smoothstep(0.0, 3.0, p.y);       // the top edge stays a clean cut
  float pn = vnoise(p / uPool.z) * 0.6 + vnoise(p / (uPool.z * 2.7) + 9.1) * 0.4;
  float w = clamp(nr.g - uPool.y * nr.r, 0.0, 1.0) * uPool.x * (1.0 + uPool.w * (2.0 * pn - 1.0)) * top;
  vec3 gL = pow(g4.rgb, vec3(2.2));
  gL = mix(gL, uPoolCol, clamp(w, 0.0, 1.0));
  gL *= 1.0 - uContact.x * clamp(nOff - nr.r, 0.0, 1.0) * top;

  vec3 printS = cov > 0.002 ? clamp(fa.rgb / cov, 0.0, 1.0) : vec3(0.0);
  vec3 printL = pow(printS, vec3(2.2));
  float ink = clamp((cov - foil) / max(1.0 - foil, 1e-3), 0.0, 1.0);
  vec3 paperCol = mix(gL, printL, ink);
  vec3 Lk = normalize(vec3(uKeyDir.xy + uShift, uKeyDir.z));
  float ndl = max(dot(N, Lk), 0.0);
  vec3 paper = paperCol * (uPaper.x + uPaper.y * ndl) / (uPaper.x + uPaper.y * Lk.z) + uMetalK.w * glow;

  // --- gold: a coloured mirror, dark until it catches a light
  vec3 metal = printL * (mix(uFloor, 1.0, caught) + uMetalK.x * glow)
             + uTint * (uMetalK.y * caught * caught * caught + uMetalK.z * hot);
  vec3 col = mix(paper, metal, foil);

  // --- pearl (satin petals)
  float ph = dot(N.xy, vec2(1.3, 0.9)) * 1.7 + dot(V.xy, vec2(0.9, -0.5)) * 2.0 + p.y / uView.y * 0.6 + uShift.x * 2.0;
  vec3 satin = mix(vec3(1.0), rainbow(ph), uPearl.y) * (0.7 * hot + 0.22 * glow + 0.12 * caught);
  col += satin * pearl * uPearl.x;

  if (uDebug > 0.5) {
    vec3 d;
    if (uDebug < 1.5) d = vec3(caught);
    else if (uDebug < 2.5) d = vec3(hot);
    else if (uDebug < 3.5) d = vec3(glow);
    else if (uDebug < 4.5) d = vec3(hC * 1.6);
    else if (uDebug < 5.5) d = vec3(nr.r, nr.g, clamp(w * 3.0, 0.0, 1.0));
    else if (uDebug < 6.5) d = vec3(foil, cov, nr.g);
    else if (uDebug < 7.5) d = N * 0.5 + 0.5;
    else d = vec3(env / 3.0);
    gl_FragColor = vec4(d, 1.0);
    return;
  }

  // --- display: sRGB, then film grain in the midtones
  col = pow(max(col, 0.0), vec3(1.0 / 2.2));
  float l = dot(min(col, 1.0), vec3(0.299, 0.587, 0.114));
  col += uGrain * (hash12(fc + uGrainSeed * 37.13) - 0.5) * smoothstep(0.02, 0.3, l) * (1.0 - smoothstep(0.85, 1.0, l));
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

export const DEBUG_MODES: Record<string, number> = { caught: 1, hot: 2, glow: 3, height: 4, near: 5, coverage: 6, normal: 7, env: 8 };
