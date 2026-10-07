/* The living painting: Pranavi's water-lily painting drawn by one WebGL1 pass.

   Two textures, both baked offline from the painting (scratchpad paint/masks.py):
     paint  the painting itself, sRGB, shown as-is
     fx     half size · R gold leaf · G how much the pixel may ripple (open
            water only, fading out ~10 px before pads and lilies) · B the gold's
            raised shoulder. Opaque RGB on purpose: data kept under alpha 0 can
            be premultiplied away by the image decoder, or rewritten by WebP.
            The leaf's fine crinkle isn't stored: it is the painting's own
            brightness detail, read straight from paint (Ann Nguyen's recipe).

   What moves ("soft body wobble", mesq's phrase): the water wobbles in place,
   the way reflections shimmer; the whole surface breathes on a slow swell
   (pads and gold drift ~1px); each lily bobs and sways on its own, rigid in
   its petals and easing out into the water, and its reflection ripples under
   it. The cursor never moves anything: it is a lamp for the gold alone.
   Optional soft normals (mesq's "hand-painted normals") let a slow light of
   their own shade the broad forms of the paint. The gold catches a
   light: a soft sheen and sparse glints where the light meets its relief. The
   light follows the cursor and drifts slowly on its own. At rest the gold looks
   exactly as painted; light only ever adds. */

const VS = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FS = `
precision highp float;
uniform sampler2D uPaint;
uniform sampler2D uFx;
uniform vec2 uOut;      // canvas, device px
uniform float uDpr;
uniform vec2 uImg;      // painting, px
uniform vec2 uFxImg;    // fx map, px
uniform vec2 uOff;      // where the painting's top-left sits in the band, CSS px
uniform float uScale;   // CSS px per painting px
uniform float uTime;
uniform vec4 uLamp;     // x, y (CSS px), height (CSS px), strength
uniform float uRipple;  // wobble amplitude, painting px
uniform vec3 uWater;    // hue turn (rad), chroma scale, lightness shift (OKLab), water only
uniform sampler2D uNorm; // soft normals, RG = slope * 0.5 + 0.5 (quarter size)
uniform float uNormOn;
uniform float uSwell;   // the surface's slow drift, painting px
uniform vec4 uFlower[5]; // each lily: left, top, right, base (painting px)
uniform vec4 uMove[5];   // each lily now: dx, dy (painting px), turn (rad), 0
uniform vec4 uAmbient;   // the soft normals' own slow light: x, y, height (CSS px), strength
uniform vec4 uShine;     // a light catching the leaf: centre x, y (CSS px), half-width, strength
uniform vec4 uShineDir;  // its direction of travel (x, y), and how far it reaches along its length (CSS px)
uniform sampler2D uCloud; // the sky's own cloud layer: R = cloud (0.5 = none), G = how much is sky (half size)
uniform float uCloudOn;
uniform vec4 uCloudMotion; // primary x, secondary x, vertical y (UV), colour gain
uniform vec3 uCloudRGB;   // what one unit of cloud does to the sky's colour (sRGB)

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}

// OKLab, for colour changes that stay even (sRGB in, sRGB out)
vec3 toLin(vec3 c) { return pow(max(c, 0.0), vec3(2.2)); }
vec3 toSrgb(vec3 c) { return pow(max(c, 0.0), vec3(1.0 / 2.2)); }
vec3 linToOklab(vec3 c) {
  vec3 lms = vec3(0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b,
                  0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b,
                  0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b);
  lms = pow(max(lms, 0.0), vec3(1.0 / 3.0));
  return vec3(0.2104542553 * lms.x + 0.7936177850 * lms.y - 0.0040720468 * lms.z,
              1.9779984951 * lms.x - 2.4285922050 * lms.y + 0.4505937099 * lms.z,
              0.0259040371 * lms.x + 0.7827717662 * lms.y - 0.8086757660 * lms.z);
}
vec3 oklabToLin(vec3 c) {
  vec3 l = vec3(c.x + 0.3963377774 * c.y + 0.2158037573 * c.z,
                c.x - 0.1055613458 * c.y - 0.0638541728 * c.z,
                c.x - 0.0894841775 * c.y - 1.2914855480 * c.z);
  l = l * l * l;
  return vec3(4.0767416621 * l.x - 3.3077115913 * l.y + 0.2309699292 * l.z,
             -1.2684380046 * l.x + 2.6097574011 * l.y - 0.3413193965 * l.z,
             -0.0041960863 * l.x - 0.7034186147 * l.y + 1.7076147010 * l.z);
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uOut.y - gl_FragCoord.y) / uDpr;   // CSS px, y down
  vec2 px = (p - uOff) / uScale;                                    // painting px
  vec2 texel = 1.0 / uImg;

  // the water wobbles in place: two slow noise fields, mostly sideways
  float w = texture2D(uFx, px * texel).g;
  float t = uTime;
  vec2 a = px * vec2(0.006, 0.022);
  vec2 b = px * vec2(0.017, 0.05);
  vec2 n1 = vec2(vnoise(a + vec2(t * 0.09, t * 0.03)), vnoise(a + vec2(7.3 - t * 0.06, 2.1 + t * 0.05))) - 0.5;
  vec2 n2 = vec2(vnoise(b + vec2(-t * 0.15, t * 0.07)), vnoise(b + vec2(3.7 + t * 0.12, 9.2 - t * 0.04))) - 0.5;
  vec2 disp = (n1 * vec2(1.0, 0.3) + n2 * vec2(0.55, 0.18)) * 2.0 * uRipple * w;

  // the surface breathes: everything drifts a little on a slow swell
  vec2 src = px + uSwell * vec2(sin(px.y * 0.006 + t * 0.31) + 0.6 * sin(px.x * 0.004 - t * 0.23), cos(px.x * 0.005 + t * 0.27));
  for (int i = 0; i < 5; i++) {
    vec4 f = uFlower[i];
    vec4 m = uMove[i];
    vec2 size = f.zw - f.xy;
    vec2 c = 0.5 * (f.xy + f.zw);
    // the lily moves as one piece inside, easing out into the water around it
    float e = length((px - c) / (size * 0.62 + vec2(14.0, 12.0)));
    float k = 1.0 - smoothstep(0.75, 1.35, e);
    vec2 piv = vec2(c.x, f.w);
    vec2 q = px - piv - m.xy;
    float cr = cos(m.z), sr = sin(m.z);
    vec2 rigid = piv + vec2(cr * q.x + sr * q.y, -sr * q.x + cr * q.y);
    src = mix(src, rigid, k);
    // its reflection follows it and ripples, more the further down it goes
    float down = clamp((px.y - f.w) / max(size.y * 1.1, 1.0), 0.0, 1.0);
    float under = smoothstep(f.w - 6.0, f.w + 12.0, px.y) * (1.0 - smoothstep(0.75, 1.0, down))
                * (1.0 - smoothstep(size.x * 0.5, size.x * 0.8, abs(px.x - c.x)));
    src.x += under * (sin(px.y * 0.12 - t * 2.1 + float(i) * 1.7) * (1.0 + 2.2 * down) - m.x * 0.6);
    src.y -= under * m.y * 0.4;
  }
  vec2 uv = (src + disp) * texel;

  vec3 col = texture2D(uPaint, uv).rgb;
  vec4 fx = texture2D(uFx, uv);

  // Two broad cloud currents cross at different speeds, with just a few
  // painting pixels of vertical meander. The original sample is subtracted so
  // this changes the sky without brightening it continuously; towers stay put.
  if (uCloudOn > 0.5) {
    vec4 c0 = texture2D(uCloud, uv);
    float sky = smoothstep(0.04, 0.96, c0.g);
    if (sky > 0.001) {
      float here = c0.r - 0.5;
      float primary = texture2D(uCloud, vec2(fract(uv.x - uCloudMotion.x), clamp(uv.y + uCloudMotion.z, 0.0, 1.0))).r - 0.5;
      float secondary = texture2D(uCloud, vec2(fract(uv.x - uCloudMotion.y), clamp(uv.y - uCloudMotion.z * 0.55, 0.0, 1.0))).r - 0.5;
      float there = mix(primary, secondary, 0.28);
      // Move the cloud value, but shade the painting's own colour. Adding a
      // neutral RGB delta made stronger shadows look pasted-on grey; screen
      // light and proportional shade preserve the sky's local painted hue.
      float cloudScale = (uCloudRGB.r + uCloudRGB.g + uCloudRGB.b) / 3.0;
      float cloudDelta = (there - here) * 8.0 * cloudScale * sky * uCloudMotion.w;
      float light = max(cloudDelta, 0.0);
      float shade = max(-cloudDelta, 0.0) * 0.55;
      col += (vec3(1.0) - col) * light;
      col *= 1.0 - shade;
    }
  }

  // optional colour turn for the water only (off by default)
  float water = w * (1.0 - fx.r);
  if (water > 0.001 && (uWater.x != 0.0 || uWater.y != 1.0 || uWater.z != 0.0)) {
    vec3 lab = linToOklab(toLin(col));
    float c = cos(uWater.x), s = sin(uWater.x);
    vec3 lab2 = vec3(lab.x + uWater.z, (c * lab.y - s * lab.z) * uWater.y, (s * lab.y + c * lab.z) * uWater.y);
    col = mix(col, toSrgb(oklabToLin(lab2)), water);
  }

  // soft "hand-painted" normals: a slow light of their own gently shades the
  // paint's broad forms (the cursor's lamp is for the gold only)
  if (uNormOn > 0.5 && uAmbient.w > 0.001) {
    vec2 sn = (texture2D(uNorm, uv).rg - 0.5) * 2.0;
    vec3 Nn = normalize(vec3(-sn * 2.2, 1.0));
    vec2 dl = uAmbient.xy - p;
    vec3 Ln = normalize(vec3(dl, uAmbient.z * 1.4));
    float near = exp(-dot(dl / vec2(420.0, 360.0), dl / vec2(420.0, 360.0)));
    float lit = (dot(Nn, Ln) - Ln.z) * near;
    float sh = pow(max(dot(Nn, normalize(Ln + vec3(0.0, 0.0, 1.0))), 0.0), 40.0) * near;
    float notGold = 1.0 - fx.r;
    col *= 1.0 + 0.55 * lit * uAmbient.w * notGold;
    col += vec3(1.0, 0.98, 0.94) * 0.05 * sh * uAmbient.w * notGold;
  }

  // gold catching the light. At rest the leaf sits a touch below the painting
  // (x0.88) so the light has somewhere to go; light only ever lifts it. Two
  // lights: the cursor's lamp, and now and then a light catching the leaf (a
  // soft streak gliding across part of the painting, the way gold leaf catches
  // the light as you walk past it).
  float gold = fx.r;
  col *= 1.0 - 0.12 * gold;
  vec2 sq = p - uShine.xy;
  float across = dot(sq, uShineDir.xy);
  float along = dot(sq, vec2(-uShineDir.y, uShineDir.x));
  float shine = uShine.w * exp(-across * across / (uShine.z * uShine.z) - along * along / (uShineDir.z * uShineDir.z));
  if (gold > 0.01 && (uLamp.w > 0.001 || shine > 0.002)) {
    // two normals: the leaf's broad shapes catch the soft sheen; its fine
    // crinkle throws the glints
    vec3 lw = vec3(0.2126, 0.7152, 0.0722);
    float fl = dot(texture2D(uPaint, uv - vec2(texel.x, 0.0)).rgb, lw), fr = dot(texture2D(uPaint, uv + vec2(texel.x, 0.0)).rgb, lw);
    float fu = dot(texture2D(uPaint, uv - vec2(0.0, texel.y)).rgb, lw), fd = dot(texture2D(uPaint, uv + vec2(0.0, texel.y)).rgb, lw);
    vec2 e2 = 2.0 / uFxImg;
    float bl = texture2D(uFx, uv - vec2(e2.x, 0.0)).b, br = texture2D(uFx, uv + vec2(e2.x, 0.0)).b;
    float bu = texture2D(uFx, uv - vec2(0.0, e2.y)).b, bd = texture2D(uFx, uv + vec2(0.0, e2.y)).b;
    vec3 Nf = normalize(vec3(-(fr - fl) * 11.0, -(fd - fu) * 11.0, 1.0));   // y down, z toward you
    vec3 Nb = normalize(vec3(-(br - bl) * 0.6, -(bd - bu) * 0.6, 1.0));
    vec3 leaf = texture2D(uPaint, uv).rgb;
    vec3 add = vec3(0.0);
    if (uLamp.w > 0.001) {
      vec2 d = uLamp.xy - p;
      vec3 L = normalize(vec3(d, uLamp.z));
      vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
      // the light's reach: wide, a little taller than wide, like a sun path on water
      vec2 dr = d / vec2(260.0, 320.0);
      vec2 dn = d / vec2(140.0, 180.0);
      float reach = exp(-dot(dr, dr));
      float near = exp(-dot(dn, dn));
      float sheen = pow(max(dot(Nb, H), 0.0), 8.0) * reach;
      float glint = pow(max(dot(Nf, H), 0.0), 90.0) * near;
      float twinkle = 0.7 + 0.3 * sin(t * 2.3 + hash12(floor(px / 3.0)) * 6.2832);
      add += (leaf * (0.9 * sheen + 0.45 * reach) + vec3(1.0, 0.9, 0.68) * 1.4 * glint * twinkle) * uLamp.w;
    }
    if (shine > 0.002) {
      // the passing light comes from a little ahead of the streak and above, so
      // the crinkles facing it flash as it goes by while the rest just warm
      vec3 Hs = normalize(normalize(vec3(uShineDir.xy * 0.6, 1.0)) + vec3(0.0, 0.0, 1.0));
      float sSheen = pow(max(dot(Nb, Hs), 0.0), 6.0);
      float sGlint = pow(max(dot(Nf, Hs), 0.0), 40.0);
      add += (leaf * (0.42 + 0.5 * sSheen) + vec3(1.0, 0.92, 0.74) * 1.25 * sGlint) * shine;
    }
    // screen, not add: light lifts the leaf toward its highlight without
    // flattening bright paint into a white slab
    col = 1.0 - (1.0 - col) * (1.0 - clamp(add * gold, 0.0, 1.0));
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

export type PaintGL = {
  /* off: where the painting's top-left sits in the band (CSS px), at "cover" scale */
  resize: (w: number, h: number, dpr: number, off: [number, number]) => void;
  /* moves: per lily dx, dy (painting px), turn (rad), unused — 4 floats each.
     ambient: the light the soft normals use (x, y, height, strength); the
     lamp lights the gold only.
     shine: a light catching the leaf (see the shader): centre x, y, half-width,
     strength, then its direction of travel x, y and its reach along its length. */
  render: (
    t: number,
    lamp: [number, number, number, number],
    moves?: Float32Array,
    ambient?: [number, number, number, number],
    shine?: [number, number, number, number, number, number, number]
  ) => void;
  destroy: () => void;
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });

export type PaintOptions = {
  normals?: string; // soft normal map (see the shader's uNorm)
  flowers?: [number, number, number, number][]; // up to 5 lilies: left, top, right, base (painting px)
  sway?: number[]; // how much each lily sways (1 = full); used by the footer
  swell?: number; // the whole surface's slow drift, painting px (default 2.2: the pond breathes; 0 for a city)
  clouds?: {
    src: string;
    rgb: [number, number, number];
    speed: number;
    secondarySpeed?: number;
    vertical?: number;
    verticalPeriod?: number;
    gain?: number;
  }; // drifting sky: cloud layer (R cloud, G sky), two speeds and a small vertical meander in painting px
};

export async function createPaintGL(canvas: HTMLCanvasElement, paintSrc: string, fxSrc: string, opts: PaintOptions = {}): Promise<PaintGL | null> {
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false });
  if (!gl) return null;
  const [paint, fx, norm, cloud] = await Promise.all([
    loadImage(paintSrc),
    loadImage(fxSrc),
    opts.normals ? loadImage(opts.normals) : Promise.resolve(null),
    opts.clouds ? loadImage(opts.clouds.src) : Promise.resolve(null),
  ]);
  if (gl.isContextLost()) return null;
  const max = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
  if (paint.width > max || fx.width > max) return null;

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn("painting shader:", gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, VS);
  const fs = compile(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return null;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.bindAttribLocation(prog, 0, "aPos");
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn("painting program:", gl.getProgramInfoLog(prog));
    return null;
  }
  gl.useProgram(prog);
  const u = (n: string) => gl.getUniformLocation(prog, n);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // Non-power-of-two textures: clamp, no mipmaps. The fx masks are data, so no
  // colour conversion and no premultiply touches them.
  const texture = (img: HTMLImageElement, unit: number, data: boolean) => {
    const tex = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, data ? gl.NONE : gl.BROWSER_DEFAULT_WEBGL);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  };
  const tPaint = texture(paint, 0, false);
  const tFx = texture(fx, 1, true);
  const tNorm = norm ? texture(norm, 2, true) : null;
  const tCloud = cloud ? texture(cloud, 3, true) : null;
  gl.uniform1i(u("uCloud"), 3);
  gl.uniform1f(u("uCloudOn"), tCloud && opts.clouds ? 1 : 0);
  if (opts.clouds) gl.uniform3f(u("uCloudRGB"), ...opts.clouds.rgb);
  gl.uniform1i(u("uPaint"), 0);
  gl.uniform1i(u("uFx"), 1);
  gl.uniform1i(u("uNorm"), 2);
  gl.uniform1f(u("uNormOn"), tNorm ? 1 : 0);
  gl.uniform1f(u("uSwell"), opts.swell ?? 2.2);
  // lilies off-canvas (and no movement) unless given
  const flowers = new Float32Array(20).fill(-1e5);
  (opts.flowers ?? []).slice(0, 5).forEach((f, i) => flowers.set(f, i * 4));
  gl.uniform4fv(u("uFlower[0]") ?? u("uFlower"), flowers);
  const still = new Float32Array(20);
  gl.uniform4fv(u("uMove[0]") ?? u("uMove"), still);
  gl.uniform2f(u("uImg"), paint.width, paint.height);
  gl.uniform2f(u("uFxImg"), fx.width, fx.height);
  gl.uniform1f(u("uRipple"), 4.8); // painting px; the blended water needs a little more to read
  gl.uniform3f(u("uWater"), 0, 1, 0);

  // React's dev double-mount can leave two of these on one context: always
  // draw with our own program, buffer and textures, never what's bound.
  const bind = () => {
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tPaint);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, tFx);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, tNorm);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, tCloud);
  };

  return {
    resize(w, h, dpr, off) {
      bind();
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      // "cover", placed where the footer framed it
      const scale = Math.max(w / paint.width, h / paint.height);
      gl.uniform1f(u("uScale"), scale);
      gl.uniform2f(u("uOff"), off[0], off[1]);
      gl.uniform2f(u("uOut"), canvas.width, canvas.height);
      gl.uniform1f(u("uDpr"), dpr);
    },
    render(t, lamp, moves, ambient, shine) {
      if (gl.isContextLost()) return;
      bind();
      gl.uniform1f(u("uTime"), t);
      if (opts.clouds) {
        const primary = ((t * opts.clouds.speed) / paint.width) % 1;
        const secondary = ((t * (opts.clouds.secondarySpeed ?? opts.clouds.speed * 0.4)) / paint.width) % 1;
        const vertical = Math.sin((t * 2 * Math.PI) / (opts.clouds.verticalPeriod ?? 24)) * (opts.clouds.vertical ?? 0) / paint.height;
        gl.uniform4f(u("uCloudMotion"), primary, secondary, vertical, opts.clouds.gain ?? 1);
      }
      const sh = shine ?? [0, 0, 1, 0, 1, 0, 1];
      gl.uniform4f(u("uShine"), sh[0], sh[1], sh[2], sh[3]);
      gl.uniform4f(u("uShineDir"), sh[4], sh[5], sh[6], 0);
      gl.uniform4f(u("uAmbient"), ...(ambient ?? ([0, 0, 1, 0] as [number, number, number, number])));
      gl.uniform4fv(u("uMove[0]") ?? u("uMove"), moves ?? still);
      gl.uniform4f(u("uLamp"), lamp[0], lamp[1], lamp[2], lamp[3]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    destroy() {
      gl.deleteTexture(tPaint);
      gl.deleteTexture(tFx);
      if (tNorm) gl.deleteTexture(tNorm);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
}
