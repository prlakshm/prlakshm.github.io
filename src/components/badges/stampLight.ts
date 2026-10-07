/* Stamp light: the star card's gold-leaf stamps catch the light the way the
   footer painting's gold does (pond/paintGL.ts), with the same model scaled
   from a painting to a row of stamps:
     - a lamp that follows the cursor: a broad sheen from the stamp's shoulders
       and pinpoint glints from its crinkle, each glint twinkling on its own;
       with no cursor it drifts slowly on its own, dimmer (as in the painting)
     - now and then a light catching the leaf: a soft band glides across the
       row and the flakes flash as it passes (on landing, across that stamp)
   The stamps themselves stay the baked sprite in the DOM (their tilt, flight
   and landing are untouched); this is a thin WebGL layer over the row that
   only adds light, screen-blended in CSS exactly as the painting screens its
   light in the shader. Lengths are in CSS px; the light's reach is measured
   in stamps (uUnit) rather than in painting pixels. */

export type StampSlot = { cx: number; cy: number; size: number; tilt: number; on: boolean };

export type StampLight = {
  /** where each stamp sits in the canvas (CSS px) and the canvas's own size */
  layout(slots: StampSlot[], w: number, h: number): void;
  /** the cursor, in canvas CSS px; null lets the light go back to drifting */
  lamp(x: number | null, y?: number): void;
  /** a light crossing one stamp (it just landed) */
  flash(i: number): void;
  /** only the visible card renders */
  setActive(on: boolean): void;
  /** true only after a drawn frame has crossed a browser paint boundary */
  isReady(): boolean;
  destroy(): void;
};

const LIGHT_READY_CLASS = "is-light-ready";

/**
 * Keep the opaque WebGL backing out of the compositor until one completed
 * draw has had a full paint to settle its screen-blend layer. The row class
 * swaps the baked highlight and the canvas in the same style calculation.
 */
export function createStampLightRevealGate(
  canvas: Pick<HTMLCanvasElement, "parentElement">,
  requestFrame: (callback: FrameRequestCallback) => number = requestAnimationFrame,
  cancelFrame: (id: number) => void = cancelAnimationFrame
) {
  let ready = false;
  let pending = 0;
  const hide = () => {
    if (pending) cancelFrame(pending);
    pending = 0;
    ready = false;
    canvas.parentElement?.classList.remove(LIGHT_READY_CLASS);
  };
  return {
    afterDraw() {
      if (ready || pending) return;
      pending = requestFrame(() => {
        pending = 0;
        const row = canvas.parentElement;
        if (!row) return;
        row.classList.add(LIGHT_READY_CLASS);
        ready = true;
      });
    },
    hide,
    isReady: () => ready,
    destroy: hide,
  };
}

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;
uniform sampler2D uSprite;   // 5 stamps across x 4 lights down; row 0 is the leaf at rest
uniform vec2 uTexel;         // 1 / sprite size
uniform vec2 uView;          // canvas, CSS px
uniform float uDpr;
uniform float uUnit;         // a stamp's size, CSS px: the light's reach is measured in stamps
uniform vec4 uStamp[5];      // centre x, y, size (CSS px), tilt (rad)
uniform float uOn[5];
uniform vec4 uLamp;          // x, y, height (CSS px), strength
uniform vec2 uPool;          // the lamp's pool, in stamps: sheen reach, glint reach
uniform vec4 uShine;        // centre x, y, half-width (CSS px), strength
uniform vec4 uShineDir;      // direction of travel x, y; reach along its length
uniform float uTime;
uniform vec2 uStep;          // normal baselines in sprite texels: fine crinkle, broad shoulder
uniform vec4 uTune;          // lamp gain, shine gain, lamp glint exponent, shine glint exponent
varying vec2 vUv;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 rot(vec2 v, float a) { float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }

void main() {
  vec2 p = vec2(vUv.x, 1.0 - vUv.y) * uView;          // CSS px, y down
  vec3 add = vec3(0.0);
  vec3 lw = vec3(0.2126, 0.7152, 0.0722);
  for (int i = 0; i < 5; i++) {
    if (uOn[i] < 0.5) continue;
    vec4 s = uStamp[i];
    vec2 l = rot(p - s.xy, -s.w) / s.z + 0.5;         // into the stamp's own square
    if (l.x < 0.0 || l.y < 0.0 || l.x > 1.0 || l.y > 1.0) continue;
    vec2 uv = (vec2(float(i), 0.0) + l) * vec2(0.2, 0.25);
    vec4 st = texture2D(uSprite, uv);
    if (st.a < 0.02) continue;
    vec3 leaf = st.rgb;
    float lc = dot(leaf, lw);
    // fine normal from the leaf's own shading (as the painting takes it from
    // the paint); neighbours off the leaf count as flat, so the outline
    // doesn't read as a crease
    // measured over ~half a CSS px of the stamp as it is shown, as the painting
    // measures its paint, so glints land at a visible size on either card
    vec2 f1 = uTexel * uStep.x;
    vec4 sl = texture2D(uSprite, uv - vec2(f1.x, 0.0)), sr = texture2D(uSprite, uv + vec2(f1.x, 0.0));
    vec4 su = texture2D(uSprite, uv - vec2(0.0, f1.y)), sd = texture2D(uSprite, uv + vec2(0.0, f1.y));
    float fl = mix(lc, dot(sl.rgb, lw), sl.a), fr = mix(lc, dot(sr.rgb, lw), sr.a);
    float fu = mix(lc, dot(su.rgb, lw), su.a), fd = mix(lc, dot(sd.rgb, lw), sd.a);
    vec3 Nf = normalize(vec3(rot(vec2(-(fr - fl) * 11.0, -(fd - fu) * 11.0), s.w), 1.0));
    // broad normal from the leaf's shoulders (its alpha, a few texels out)
    vec2 e2 = uStep.y * uTexel;
    float al = texture2D(uSprite, uv - vec2(e2.x, 0.0)).a, ar = texture2D(uSprite, uv + vec2(e2.x, 0.0)).a;
    float au = texture2D(uSprite, uv - vec2(0.0, e2.y)).a, ad = texture2D(uSprite, uv + vec2(0.0, e2.y)).a;
    vec3 Nb = normalize(vec3(rot(vec2(-(ar - al) * 0.6, -(ad - au) * 0.6), s.w), 1.0));
    vec3 a = vec3(0.0);
    if (uLamp.w > 0.001) {
      vec2 d = uLamp.xy - p;
      vec3 L = normalize(vec3(d, uLamp.z));
      vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
      // a pool of light sized in stamps (POOL), a little taller than wide
      vec2 dr = d / (uUnit * uPool.x * vec2(1.0, 1.18));
      vec2 dn = d / (uUnit * uPool.y * vec2(1.0, 1.25));
      float reach = exp(-dot(dr, dr));
      float near = exp(-dot(dn, dn));
      float sheen = pow(max(dot(Nb, H), 0.0), 8.0) * reach;
      float glint = pow(max(dot(Nf, H), 0.0), uTune.z) * near;
      float twinkle = 0.7 + 0.3 * sin(uTime * 2.3 + hash12(floor(p / 1.3)) * 6.2832);   // cells as big as the painting's
      a += (leaf * (0.9 * sheen + 0.45 * reach) + vec3(1.0, 0.9, 0.68) * 1.4 * glint * twinkle) * uLamp.w * uTune.x;
    }
    vec2 sq = p - uShine.xy;
    float across = dot(sq, uShineDir.xy);
    float along = dot(sq, vec2(-uShineDir.y, uShineDir.x));
    float shine = uShine.w * exp(-across * across / (uShine.z * uShine.z) - along * along / (uShineDir.z * uShineDir.z));
    if (shine > 0.002) {
      vec3 Hs = normalize(normalize(vec3(uShineDir.xy * 0.6, 1.0)) + vec3(0.0, 0.0, 1.0));
      float sSheen = pow(max(dot(Nb, Hs), 0.0), 6.0);
      float sGlint = pow(max(dot(Nf, Hs), 0.0), uTune.w);
      a += (leaf * (0.42 + 0.5 * sSheen) + vec3(1.0, 0.92, 0.74) * 1.25 * sGlint) * shine * uTune.y;
    }
    add = max(add, clamp(a * st.a, 0.0, 1.0));
  }
  // black elsewhere: under CSS screen blending, black changes nothing
  gl_FragColor = vec4(add, 1.0);
}
`;

/* The painting's light, a little warmer on the stamps. They keep their bright
   resting gold (the painting dims its leaf x0.88 so its light reads; she
   didn't want that), so the light is lifted just past the painting's own:
   restrained under the cursor (x1.2; x1.7 was "too bright"), a touch more on
   the passing light (x1.35), glints a little broader so a few more facets
   catch (^75 / ^34 against the painting's ^90 / ^40). */
const TUNE = { lampGain: 1.2, shineGain: 1.35, lampGlint: 75, shineGlint: 34 };

/* The lamp's pool of light, in stamps (sheen reach, glint reach). Under the
   cursor it is about a stamp across: it lights the star it is on and only
   brushes the next ones. At two stamps across it lit each neighbour two-thirds
   as much as the star under the cursor ("too big a zone"). Drifting on its
   own, it keeps the painting's broad pool. */
const POOL = { cursor: [1.0, 0.7], drift: [2.2, 1.2] };

export function createStampLight(canvas: HTMLCanvasElement, spriteUrl: string): StampLight | null {
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) return null;
  const reveal = createStampLightRevealGate(canvas);

  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader");
    return s;
  };
  let prog: WebGLProgram;
  try {
    prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  } catch {
    return null;
  }
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const tex = gl.createTexture();
  const u = (n: string) => gl.getUniformLocation(prog, n);
  const bind = () => {
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
  };

  let ready = false;
  let sprite = { w: 1, h: 1 };
  const img = new Image();
  img.decoding = "async";
  img.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    sprite = { w: img.naturalWidth, h: img.naturalHeight };
    ready = true;
    kick();
  };
  img.src = spriteUrl;

  let view = { w: 1, h: 1, dpr: 1 };
  let slots: StampSlot[] = [];
  let unit = 20;
  let active = false;
  let raf = 0;
  let last = 0;
  let contextLost = false;
  const t0 = performance.now();

  const onContextLost = () => {
    contextLost = true;
    reveal.hide();
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
  canvas.addEventListener("webglcontextlost", onContextLost);

  // the lamp: follows the cursor, else drifts on its own, dimmer and broader
  const lamp = { x: 0, y: 0, z: 40, on: 0, reach: POOL.drift[0], near: POOL.drift[1] };
  let pointer: { x: number; y: number } | null = null;

  // the passing light
  const shine = { on: false, start: 0, dur: 1, x: 0, y: 0, dx: 1, dy: 0, len: 0, w: 10, reach: 20, gain: 1 };
  let nextShine = 1.6;
  const startShine = (t: number, opts?: { x0: number; len: number; dur: number; gain: number }) => {
    const ltr = opts ? true : Math.random() < 0.7; // mostly left to right, like a passing glance
    const a = (Math.random() - 0.5) * 0.6; // a slight tilt
    shine.dx = Math.cos(a) * (ltr ? 1 : -1);
    shine.dy = Math.sin(a);
    shine.len = opts ? opts.len : view.w + 2 * unit;
    shine.x = opts ? opts.x0 : ltr ? -unit : view.w + unit;
    shine.y = view.h / 2 + (Math.random() - 0.5) * unit * 0.5 - shine.dy * shine.len * 0.5;
    shine.w = unit * 1.0; // as wide, against a stamp, as the painting's band against its leaf
    shine.reach = unit * 2.2;
    shine.dur = opts ? opts.dur : 1.0 + Math.random() * 0.5;
    shine.gain = opts ? opts.gain : 1;
    shine.start = t;
    shine.on = true;
  };
  const shineNow = (t: number) => {
    if (!shine.on && t >= nextShine && slots.some((s) => s.on)) startShine(t);
    if (!shine.on) return null;
    const q = (t - shine.start) / shine.dur;
    if (q >= 1) {
      shine.on = false;
      nextShine = t + 4 + Math.random() * 5;
      return null;
    }
    const e = q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2;
    const fade = Math.min(1, q / 0.25) * Math.min(1, (1 - q) / 0.3);
    return [shine.x + shine.dx * shine.len * e, shine.y + shine.dy * shine.len * e, shine.w, fade * shine.gain, shine.dx, shine.dy, shine.reach];
  };

  const frame = (now: number) => {
    raf = 0;
    if (!active || !ready || contextLost || document.hidden) return;
    // ~30fps is plenty for a slow twinkle, and kind to the battery
    if (now - last < 31) {
      raf = requestAnimationFrame(frame);
      return;
    }
    const dt = Math.min(0.1, (now - (last || now)) / 1000);
    last = now;
    const t = (now - t0) / 1000;
    const drift = {
      x: view.w * (0.5 + 0.42 * Math.sin(t * 0.13 + 0.7)),
      y: view.h * (0.5 + 0.35 * Math.sin(t * 0.21)),
    };
    const target = pointer ? { ...pointer, on: 1, k: 7, pool: POOL.cursor } : { ...drift, on: 0.45, k: 1.1, pool: POOL.drift };
    const k = 1 - Math.exp(-dt * target.k);
    lamp.x += (target.x - lamp.x) * k;
    lamp.y += (target.y - lamp.y) * k;
    lamp.on += (target.on - lamp.on) * (1 - Math.exp(-dt * 3));
    const kp = 1 - Math.exp(-dt * 6);
    lamp.reach += (target.pool[0] - lamp.reach) * kp;
    lamp.near += (target.pool[1] - lamp.near) * kp;
    const s = shineNow(t);

    bind();
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1i(u("uSprite"), 0);
    gl.uniform2f(u("uTexel"), 1 / sprite.w, 1 / sprite.h);
    gl.uniform2f(u("uView"), view.w, view.h);
    gl.uniform1f(u("uDpr"), view.dpr);
    gl.uniform1f(u("uUnit"), unit);
    gl.uniform1f(u("uTime"), t);
    gl.uniform4f(u("uTune"), TUNE.lampGain, TUNE.shineGain, TUNE.lampGlint, TUNE.shineGlint);
    // sprite texels per CSS px of a stamp as shown: the painting's fine normal
    // spans ~0.45 CSS px and its shoulder ~1.7 CSS px
    const tpp = sprite.w / 5 / Math.max(unit, 1);
    gl.uniform2f(u("uStep"), Math.max(1, 0.45 * tpp), Math.max(2, 1.7 * tpp));
    const st = new Float32Array(20);
    const on = new Float32Array(5);
    slots.slice(0, 5).forEach((sl, i) => {
      st.set([sl.cx, sl.cy, sl.size, sl.tilt], i * 4);
      on[i] = sl.on ? 1 : 0;
    });
    gl.uniform4fv(u("uStamp"), st);
    gl.uniform1fv(u("uOn"), on);
    gl.uniform4f(u("uLamp"), lamp.x, lamp.y, lamp.z, lamp.on);
    gl.uniform2f(u("uPool"), lamp.reach, lamp.near);
    if (s) {
      gl.uniform4f(u("uShine"), s[0], s[1], s[2], s[3]);
      gl.uniform4f(u("uShineDir"), s[4], s[5], s[6], 0);
    } else {
      gl.uniform4f(u("uShine"), 0, 0, 1, 0);
      gl.uniform4f(u("uShineDir"), 1, 0, 1, 0);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (!reveal.isReady() && gl.getError() === gl.NO_ERROR) reveal.afterDraw();
    raf = requestAnimationFrame(frame);
  };
  const kick = () => {
    if (!raf && active && ready && !contextLost) raf = requestAnimationFrame(frame);
  };
  const onVis = () => kick();
  document.addEventListener("visibilitychange", onVis);

  return {
    layout(next, w, h) {
      slots = next;
      unit = next.find((x) => x.size > 0)?.size ?? unit;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      view = { w, h, dpr };
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      // the painting's lamp sits about 0.85 of its band's height up; here a
      // little over two stamps, so the light rakes across the row
      lamp.z = unit * 2.2;
      if (!lamp.x) {
        lamp.x = w * 0.5;
        lamp.y = h * 0.5;
      }
      kick();
    },
    lamp(x, y) {
      pointer = x === null || y === undefined ? null : { x, y };
      kick();
    },
    flash(i) {
      const sl = slots[i];
      if (!sl) return;
      const t = (performance.now() - t0) / 1000;
      startShine(t, { x0: sl.cx - 1.6 * sl.size, len: 3.2 * sl.size, dur: 0.75, gain: 1.15 });
      kick();
    },
    setActive(on) {
      active = on;
      if (on) {
        // a fresh card shows its first glimmer soon, not up to nine seconds in
        const t = (performance.now() - t0) / 1000;
        nextShine = Math.min(nextShine, t + 1.2);
        kick();
      } else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    },
    isReady() {
      return reveal.isReady();
    },
    destroy() {
      active = false;
      if (raf) cancelAnimationFrame(raf);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      document.removeEventListener("visibilitychange", onVis);
      reveal.destroy();
    },
  };
}
