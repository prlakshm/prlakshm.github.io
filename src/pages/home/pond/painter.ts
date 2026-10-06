import {
  FS_COMPOSITE,
  FS_CONFETTI,
  FS_FIELD,
  FS_FLOW,
  FS_FLOW_FLAT,
  FS_NOISE,
  FS_STROKES,
  FS_TENSOR,
  VS_FULL,
  VS_QUAD,
  W11,
  W5,
  blurFS,
} from "./shaders.js";

/* The pond's renderer: the scene into one texture (water field, then the
   confetti as lit foil quads), then mesq's paint passes over all of it, then
   the composite onto the canvas. See shaders.ts for what each pass does.

   Targets (W x H in CSS px; dpr capped at 2):
     A  scene              W·dpr × H·dpr   RGBA8
     N  stroke shapes      W × H           RGBA8   (static: drawn on resize)
     T  tensor             W/2 × H/2       half float
     B1 blur σ1 (H, V)     W/2 × H/2       half float
     B2 blur σ4 (H, V)     W/4 × H/4       half float
     F  flow               W/2 × H/2       half float
     S  strokes            W × H           RGBA8
   Without renderable half floats, the tensor and blurs are skipped and the
   flow is the flat-water one (strokes stay horizontal-ish everywhere). */

export type Ripple = { x: number; y: number; t: number; strength: number };

export type Frame = {
  t: number;
  ripples: Ripple[];
  quads: Float32Array; // 6 vertices per piece, FLOATS_PER_VERTEX each
  quadCount: number;
  sun: [number, number, number];
  lamp: [number, number, number, number];
  env: [number, number];
};

export const FLOATS_PER_VERTEX = 14; // corner(2) A(4) B(4) C(4)

export type Painter = {
  resize: (w: number, h: number, dpr: number) => void;
  render: (f: Frame) => void;
  destroy: () => void;
};

type Target = { tex: WebGLTexture; fb: WebGLFramebuffer; w: number; h: number };
type Prog = { p: WebGLProgram; loc: Map<string, WebGLUniformLocation | null> };

/* Water palette: his Cherry blue, lifted and de-greened, with his Kiwi teal
   kept only in the light pole (aqua), lavender in the shadows. */
const hex = (s: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16) / 255) as [number, number, number];
const PALETTE = {
  uBase: hex("#87c1f0"), // blue body
  uDark: hex("#9cb3ea"), // periwinkle-blue shadow (bluer than Cherry's lavender: the brief is teal and blue)
  uLight: hex("#a1d6df"), // teal light (hue ~218, never mint)
  uSunTint: hex("#c6e7ec"),
};
const SEED = 10;

/* For the texture lab (poster-lab/pond): render with another confetti shader
   or composite in place of the shipped ones. */
export type ShaderSwap = { confetti?: string; composite?: (enc: boolean) => string };

export function createPainter(canvas: HTMLCanvasElement, swap: ShaderSwap = {}): Painter | null {
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
  if (!gl || gl.isContextLost()) return null;
  const hf = gl.getExtension("OES_texture_half_float");
  const hfLinear = gl.getExtension("OES_texture_half_float_linear");
  gl.getExtension("EXT_color_buffer_half_float");
  let half = !!(hf && hfLinear);

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn("pond shader:", gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  };
  const shaders: WebGLShader[] = [];
  const programs: WebGLProgram[] = [];
  const program = (vs: string, fs: string): Prog | null => {
    const v = compile(gl.VERTEX_SHADER, vs);
    const f = compile(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return null;
    shaders.push(v, f);
    const p = gl.createProgram()!;
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.bindAttribLocation(p, 0, "aPos");
    gl.bindAttribLocation(p, 0, "aCorner");
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.warn("pond program:", gl.getProgramInfoLog(p));
      return null;
    }
    programs.push(p);
    return { p, loc: new Map() };
  };
  const uni = (pr: Prog, name: string) => {
    if (!pr.loc.has(name)) pr.loc.set(name, gl.getUniformLocation(pr.p, name));
    return pr.loc.get(name) ?? null;
  };

  const P = {
    field: program(VS_FULL, FS_FIELD),
    confetti: program(VS_QUAD, swap.confetti ?? FS_CONFETTI),
    noise: program(VS_FULL, FS_NOISE),
    tensor: program(VS_FULL, FS_TENSOR),
    blur5: program(VS_FULL, blurFS(5)),
    blur11: program(VS_FULL, blurFS(11)),
    flow: program(VS_FULL, FS_FLOW),
    flowFlat: program(VS_FULL, FS_FLOW_FLAT),
    strokes: program(VS_FULL, FS_STROKES(false)),
    strokesEnc: program(VS_FULL, FS_STROKES(true)),
    comp: program(VS_FULL, (swap.composite ?? FS_COMPOSITE)(false)),
    compEnc: program(VS_FULL, (swap.composite ?? FS_COMPOSITE)(true)),
  };
  if (!P.field || !P.confetti || !P.noise || !P.flowFlat || !P.strokesEnc || !P.compEnc) return null;
  if (!P.tensor || !P.blur5 || !P.blur11 || !P.flow || !P.strokes || !P.comp) half = false;

  const tri = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, tri);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const quadBuf = gl.createBuffer();

  const confettiLoc = {
    aA: gl.getAttribLocation(P.confetti.p, "aA"),
    aB: gl.getAttribLocation(P.confetti.p, "aB"),
    aC: gl.getAttribLocation(P.confetti.p, "aC"),
  };

  let W = 0;
  let H = 0;
  let dpr = 1;
  let targets: Record<string, Target> = {};

  const makeTarget = (w: number, h: number, isHalf: boolean): Target | null => {
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, isHalf && hf ? hf.HALF_FLOAT_OES : gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      gl.deleteFramebuffer(fb);
      gl.deleteTexture(tex);
      return null;
    }
    return { tex, fb, w, h };
  };
  const freeTargets = () => {
    Object.values(targets).forEach((t) => {
      gl.deleteFramebuffer(t.fb);
      gl.deleteTexture(t.tex);
    });
    targets = {};
  };

  // One full-screen pass.
  const run = (pr: Prog, out: Target | null, tex: Record<string, Target>, uniforms: Record<string, number | number[]> = {}) => {
    gl.useProgram(pr.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, out ? out.fb : null);
    const w = out ? out.w : canvas.width;
    const h = out ? out.h : canvas.height;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uni(pr, "uOut"), w, h);
    gl.uniform2f(uni(pr, "uView"), W, H);
    gl.uniform1f(uni(pr, "uDpr"), dpr);
    gl.uniform1f(uni(pr, "uSeed"), SEED);
    Object.entries(tex).forEach(([name, t], i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, t.tex);
      gl.uniform1i(uni(pr, name), i);
    });
    Object.entries(uniforms).forEach(([name, v]) => {
      const loc = uni(pr, name);
      if (!loc) return;
      if (Array.isArray(v)) {
        if (name.endsWith("[0]")) gl.uniform1fv(loc, v);
        else if (name.startsWith("uRipple")) gl.uniform4fv(loc, v);
        else if (v.length === 2) gl.uniform2f(loc, v[0], v[1]);
        else if (v.length === 3) gl.uniform3f(loc, v[0], v[1], v[2]);
        else if (v.length === 4) gl.uniform4f(loc, v[0], v[1], v[2], v[3]);
      } else gl.uniform1f(loc, v);
    });
    gl.bindBuffer(gl.ARRAY_BUFFER, tri);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const rippleData = new Float32Array(24);
  const waterUniforms = (f: Frame) => {
    rippleData.fill(0);
    f.ripples.slice(-6).forEach((r, i) => rippleData.set([r.x, r.y, r.t, r.strength], i * 4));
    return { uTime: f.t, ...PALETTE, uRipple: Array.from(rippleData) } as Record<string, number | number[]>;
  };

  return {
    resize(w, h, d) {
      W = Math.max(1, Math.round(w));
      H = Math.max(1, Math.round(h));
      dpr = d;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      freeTargets();
      const A = makeTarget(canvas.width, canvas.height, false);
      const N = makeTarget(W, H, false);
      const S = makeTarget(W, H, false);
      if (!A || !N || !S) return;
      targets = { A, N, S };
      const hw = Math.max(1, Math.round(W / 2));
      const hh = Math.max(1, Math.round(H / 2));
      const qw = Math.max(1, Math.round(W / 4));
      const qh = Math.max(1, Math.round(H / 4));
      if (half) {
        const T = makeTarget(hw, hh, true);
        const B1a = makeTarget(hw, hh, true);
        const B1 = makeTarget(hw, hh, true);
        const B2a = makeTarget(qw, qh, true);
        const B2 = makeTarget(qw, qh, true);
        const F = makeTarget(hw, hh, true);
        if (T && B1a && B1 && B2a && B2 && F) Object.assign(targets, { T, B1a, B1, B2a, B2, F });
        else half = false;
      }
      if (!half) {
        const F = makeTarget(hw, hh, false);
        if (F) targets.F = F;
      }
      run(P.noise!, targets.N, {});
    },

    render(f) {
      const { A, N, S, F } = targets;
      if (!A || !N || !S || !F) return;
      const wu = waterUniforms(f);

      // 1. The scene: water, then the confetti drawn into it.
      run(P.field!, A, {}, wu);
      if (f.quadCount > 0) {
        const pr = P.confetti!;
        gl.useProgram(pr.p);
        gl.bindFramebuffer(gl.FRAMEBUFFER, A.fb);
        gl.viewport(0, 0, A.w, A.h);
        gl.uniform2f(uni(pr, "uOut"), A.w, A.h);
        gl.uniform2f(uni(pr, "uView"), W, H);
        gl.uniform1f(uni(pr, "uDpr"), dpr);
        gl.uniform1f(uni(pr, "uSeed"), SEED);
        gl.uniform1f(uni(pr, "uTime"), f.t);
        gl.uniform3f(uni(pr, "uBase"), ...PALETTE.uBase);
        gl.uniform3f(uni(pr, "uDark"), ...PALETTE.uDark);
        gl.uniform3f(uni(pr, "uLight"), ...PALETTE.uLight);
        gl.uniform3f(uni(pr, "uSunTint"), ...PALETTE.uSunTint);
        gl.uniform4fv(uni(pr, "uRipple"), rippleData);
        gl.uniform3f(uni(pr, "uSunDir"), ...f.sun);
        gl.uniform4f(uni(pr, "uLamp"), ...f.lamp);
        gl.uniform2f(uni(pr, "uEnvShift"), ...f.env);
        gl.uniform3f(uni(pr, "uEye"), W / 2, H / 2, 900);
        // the key light sits over the sun patch, so the rest of the band rests dark
        gl.uniform2f(uni(pr, "uKey"), Math.atan2(0.24 * W, 900), (-0.16 * H) / 1000);
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
        gl.bufferData(gl.ARRAY_BUFFER, f.quads.subarray(0, f.quadCount * 6 * FLOATS_PER_VERTEX), gl.DYNAMIC_DRAW);
        const stride = FLOATS_PER_VERTEX * 4;
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, stride, 0);
        [confettiLoc.aA, confettiLoc.aB, confettiLoc.aC].forEach((loc, i) => {
          if (loc < 0) return;
          gl.enableVertexAttribArray(loc);
          gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, stride, (2 + i * 4) * 4);
        });
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.drawArrays(gl.TRIANGLES, 0, f.quadCount * 6);
        gl.disable(gl.BLEND);
        [confettiLoc.aA, confettiLoc.aB, confettiLoc.aC].forEach((loc) => loc >= 0 && gl.disableVertexAttribArray(loc));
      }

      // 2. The paint passes.
      if (half) {
        const { T, B1a, B1, B2a, B2 } = targets;
        run(P.tensor!, T, { uSrc: A });
        run(P.blur5!, B1a, { uSrc: T }, { uDir: [1, 0], "uW[0]": W5 });
        run(P.blur5!, B1, { uSrc: B1a }, { uDir: [0, 1], "uW[0]": W5 });
        run(P.blur11!, B2a, { uSrc: B1 }, { uDir: [1, 0], "uW[0]": W11 });
        run(P.blur11!, B2, { uSrc: B2a }, { uDir: [0, 1], "uW[0]": W11 });
        run(P.flow!, F, { uT1: B1, uT2: B2 });
        run(P.strokes!, S, { uSrc: A, uFlow: F, uNoise: N });
        run(P.comp!, null, { uSrc: A, uStrokes: S, uFlow: F }, { uLevels: 9 });
      } else {
        run(P.flowFlat!, F, {});
        run(P.strokesEnc!, S, { uSrc: A, uFlow: F, uNoise: N });
        run(P.compEnc!, null, { uSrc: A, uStrokes: S, uFlow: F }, { uLevels: 9 });
      }
    },

    // Frees what it made but leaves the context alive, so the same canvas can
    // be mounted again (React's dev double-mount does exactly that).
    destroy() {
      freeTargets();
      gl.deleteBuffer(tri);
      gl.deleteBuffer(quadBuf);
      programs.forEach((p) => gl.deleteProgram(p));
      shaders.forEach((s) => gl.deleteShader(s));
    },
  };
}
