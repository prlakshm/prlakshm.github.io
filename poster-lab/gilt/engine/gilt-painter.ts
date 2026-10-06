import * as M from "./mesq";
import { FLOATS_PER_VERTEX, FS_FINISH, FS_NEAR_BLUR, FS_NEAR_DOWN, FS_PIECE, SEG, VS_PIECE, gaussWeights } from "./gilt-shaders";
import { hexToLin, hexToRGB, type Concept } from "./concept";

/* The gilded sheet's renderer (WebGL1, one canvas). Plan §2.1-2.3.

     paint tick (30 Hz)    FIELD -> A, mesq tensor/blur/flow/strokes, COMPOSITE -> G
     on layout / resize    PIECES -> FA, FX;  NEAR (coverage blurred, CSS/2)
                           (every frame for FOIL_WARP; NEAR then on paint ticks)
     every frame (60 Hz)   FINISH (G, FA, FX, NEAR, tilt) -> canvas

   Targets (W x H CSS px, dpr <= 2):
     A   water field        W·dpr x H·dpr   RGBA8
     N   stroke shapes      W x H           RGBA8   (static)
     T, B1a, B1, B2a, B2, F tensor/blur/flow  W/2, W/4  half float (if renderable)
     S   strokes            W x H           RGBA8
     G   painted ground     W·dpr x H·dpr   RGBA8
     FA  print + coverage   W·dpr x H·dpr   RGBA8
     FX  foil/pearl/height/id  W·dpr x H·dpr RGBA8
     NEAR(a,b)              W/2 x H/2       RGBA8

   Height in FX: with EXT_blend_minmax each piece is drawn twice (MAX, then over by
   coverage) = mix(max(dst, h), h, coverage). Without it, one premultiplied "over"
   by max(coverage, shoulder) approximates the same (a slight rise where two
   shoulders overlap). */

export type Ripple = { x: number; y: number; t: number; strength: number };

export type GiltFrame = {
  t: number; // lighting clock, s
  waterT: number; // water clock, s (T0 + t)
  paint: boolean; // run the paint passes this frame
  ripples: Ripple[];
  shift: [number, number];
  lamp: [number, number, number, number]; // x, y (CSS, y down), z, on
  sunX: number;
  tilt: Uint8Array; // 256 x RGBA
  grainSeed: number;
  debug: number;
};

export type GiltPainter = {
  resize: (w: number, h: number, dpr: number) => void;
  setPieces: (verts: Float32Array, vertexCount: number) => void;
  setUnder: (img: HTMLImageElement | null) => void;
  render: (f: GiltFrame) => void;
  destroy: () => void;
  stats: () => { drawCalls: number; half: boolean; targetsMB: number; finishReads: number };
  gl: WebGLRenderingContext;
};

type Target = { tex: WebGLTexture; fb: WebGLFramebuffer; w: number; h: number };
type Tex = { tex: WebGLTexture };
type Prog = { p: WebGLProgram; loc: Map<string, WebGLUniformLocation | null> };

export class ShaderError extends Error {
  log: string;
  constructor(msg: string, log: string) {
    super(msg);
    this.log = log;
  }
}

export function createGiltPainter(canvas: HTMLCanvasElement, concept: Concept): GiltPainter {
  const cfg = concept.config;
  const L = cfg.lighting;
  const Wt = cfg.water;
  const Mo = cfg.motion;
  const flags = cfg.flags;
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false });
  if (!gl || gl.isContextLost()) throw new ShaderError("no WebGL", "getContext('webgl') returned null");
  const hf = gl.getExtension("OES_texture_half_float");
  const hfLinear = gl.getExtension("OES_texture_half_float_linear");
  gl.getExtension("EXT_color_buffer_half_float");
  const minmax = gl.getExtension("EXT_blend_minmax");
  const forceFlat = /[?&]noHalf\b/.test(location.search);
  let half = !!(hf && hfLinear) && !forceFlat;
  let drawCalls = 0;

  const logs: string[] = [];
  const compile = (type: number, src: string, name: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) {
      const log = gl.getShaderInfoLog(s) ?? "";
      logs.push(`[${name}] ${log}`);
      return null;
    }
    return s;
  };
  const shaders: WebGLShader[] = [];
  const programs: WebGLProgram[] = [];
  const program = (vs: string, fs: string, name: string, attribs: string[] = ["aPos"]): Prog | null => {
    const v = compile(gl.VERTEX_SHADER, vs, name + ".vs");
    const f = compile(gl.FRAGMENT_SHADER, fs, name + ".fs");
    if (!v || !f) return null;
    shaders.push(v, f);
    const p = gl.createProgram()!;
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    attribs.forEach((a, i) => gl.bindAttribLocation(p, i, a));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) {
      logs.push(`[${name}.link] ${gl.getProgramInfoLog(p)}`);
      return null;
    }
    programs.push(p);
    return { p, loc: new Map() };
  };
  const uni = (pr: Prog, name: string) => {
    if (!pr.loc.has(name)) pr.loc.set(name, gl.getUniformLocation(pr.p, name));
    return pr.loc.get(name) ?? null;
  };

  const SW = Wt.SW;
  const STEP = Wt.STEP;
  const P = {
    field: program(M.VS_FULL, M.FS_FIELD, "field"),
    noise: program(M.VS_FULL, M.FS_NOISE(SW, Wt.BRISTLE, Wt.PERSP_TOP), "noise"),
    tensor: program(M.VS_FULL, M.FS_TENSOR, "tensor"),
    blur5: program(M.VS_FULL, M.blurFS(5), "blur5"),
    blur11: program(M.VS_FULL, M.blurFS(11), "blur11"),
    flow: program(M.VS_FULL, M.FS_FLOW(STEP, Wt.FLOW_ANGLE, Wt.FLOW_CURL), "flow"),
    flowFlat: program(M.VS_FULL, M.FS_FLOW_FLAT(STEP, Wt.FLOW_ANGLE, Wt.FLOW_CURL), "flowFlat"),
    strokes: program(M.VS_FULL, M.FS_STROKES(false, SW, STEP, Wt.PERSP_TOP), "strokes"),
    strokesEnc: program(M.VS_FULL, M.FS_STROKES(true, SW, STEP, Wt.PERSP_TOP), "strokesEnc"),
    comp: program(M.VS_FULL, M.FS_COMPOSITE(false), "comp"),
    compEnc: program(M.VS_FULL, M.FS_COMPOSITE(true), "compEnc"),
    piece: program(VS_PIECE(flags), FS_PIECE, "piece", ["aPos", "aUV", "aMeta"]),
    nearDown: program(M.VS_FULL, FS_NEAR_DOWN, "nearDown"),
    nearBlur: program(M.VS_FULL, FS_NEAR_BLUR, "nearBlur"),
    finish: program(M.VS_FULL, FS_FINISH(flags), "finish"),
  };
  const required = [P.field, P.noise, P.flowFlat, P.strokesEnc, P.compEnc, P.piece, P.nearDown, P.nearBlur, P.finish];
  if (required.some((x) => !x)) throw new ShaderError("shader compile failed", logs.join("\n"));
  if (!P.tensor || !P.blur5 || !P.blur11 || !P.flow || !P.strokes || !P.comp) half = false;

  const tri = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, tri);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const pieceBuf = gl.createBuffer();
  let pieceVerts = 0;

  // --- textures from the concept
  const imageTex = (img: HTMLImageElement, premult: boolean, mip: boolean): Tex => {
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premult);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    const pow2 = (n: number) => (n & (n - 1)) === 0;
    const canMip = mip && pow2(img.naturalWidth) && pow2(img.naturalHeight);
    if (canMip) gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, canMip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return { tex };
  };
  const dataTex = (w: number, h: number, data: Uint8Array, nearest: boolean): Tex => {
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    const f = nearest ? gl.NEAREST : gl.LINEAR;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return { tex };
  };
  const atlasPrint = imageTex(concept.print, true, true);
  const atlasFx = imageTex(concept.fx, false, true);
  const tiltTex = dataTex(256, 1, new Uint8Array(256 * 4).fill(128), true);
  const blankUnder = dataTex(1, 1, new Uint8Array([0, 0, 0, 0]), false);
  let underTex: Tex = blankUnder;
  const underCache = new Map<HTMLImageElement, Tex>();

  // --- render targets
  let W = 0;
  let H = 0;
  let dpr = 1;
  let targets: Record<string, Target> = {};
  let piecesDirty = true;
  let nearDirty = true;
  let groundReady = false;

  const makeTarget = (w: number, h: number, isHalf: boolean, nearest = false): Target | null => {
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, isHalf && hf ? hf.HALF_FLOAT_OES : gl.UNSIGNED_BYTE, null);
    const f = nearest ? gl.NEAREST : gl.LINEAR;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
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

  type U = number | number[] | Float32Array;
  const setUniforms = (pr: Prog, uniforms: Record<string, U>) => {
    for (const [name, v] of Object.entries(uniforms)) {
      const loc = uni(pr, name);
      if (!loc) continue;
      if (typeof v === "number") gl.uniform1f(loc, v);
      else if (name.endsWith("[0]")) gl.uniform1fv(loc, v as Float32List);
      else if (name.startsWith("uRipple")) gl.uniform4fv(loc, v as Float32List);
      else if (v.length === 2) gl.uniform2f(loc, v[0], v[1]);
      else if (v.length === 3) gl.uniform3f(loc, v[0], v[1], v[2]);
      else if (v.length === 4) gl.uniform4f(loc, v[0], v[1], v[2], v[3]);
    }
  };
  const begin = (pr: Prog, out: Target | null, tex: Record<string, Tex>, uniforms: Record<string, U>) => {
    gl.useProgram(pr.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, out ? out.fb : null);
    const w = out ? out.w : canvas.width;
    const h = out ? out.h : canvas.height;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uni(pr, "uOut"), w, h);
    gl.uniform2f(uni(pr, "uView"), W, H);
    gl.uniform1f(uni(pr, "uDpr"), dpr);
    gl.uniform1f(uni(pr, "uSeed"), Wt.SEED);
    Object.entries(tex).forEach(([name, t], i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, t.tex);
      gl.uniform1i(uni(pr, name), i);
    });
    setUniforms(pr, uniforms);
  };
  // One full-screen pass.
  const run = (pr: Prog, out: Target | null, tex: Record<string, Tex> = {}, uniforms: Record<string, U> = {}) => {
    begin(pr, out, tex, uniforms);
    gl.bindBuffer(gl.ARRAY_BUFFER, tri);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.disableVertexAttribArray(1);
    gl.disableVertexAttribArray(2);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    drawCalls++;
  };

  // --- constant uniforms
  const lin = (h: string) => hexToLin(h);
  const rgb = (h: string) => hexToRGB(h);
  const waterPalette = {
    uBase: rgb(Wt.BASE),
    uDark: rgb(Wt.DARK),
    uLight: rgb(Wt.LIGHT),
    uSunTint: rgb(Wt.SUN_TINT),
    uCloudA: rgb(Wt.CLOUD[0]),
    uCloudB: rgb(Wt.CLOUD[1]),
    uWillowA: rgb(Wt.WILLOW[0]),
    uWillowB: rgb(Wt.WILLOW[1]),
    uLavA: rgb(Wt.LAVENDER[0]),
    uLavB: rgb(Wt.LAVENDER[1]),
    uSunCol: rgb(Wt.SUN),
    uUnderK: Wt.UNDER_K as number[],
    uBroken: Wt.BROKEN as number[],
    uAccA: rgb(Wt.ACCENTS[0]),
    uAccB: rgb(Wt.ACCENTS[1]),
    uAccC: rgb(Wt.ACCENTS[2]),
    uDabBroken: Wt.DAB_BROKEN as number[],
    uDrift: Mo.DRIFT,
    uFieldTime: Mo.FIELD_TIME,
  };
  const finishConst = () => ({
    uRelief: L.RELIEF,
    uTap: L.NORMAL_TAP,
    uFloor: L.FLOOR,
    uPersp: L.PERSP,
    uEyeZ: L.EYE_Z,
    uAmbient: L.AMBIENT,
    uKey: [L.key.strength, L.key.c[0], L.key.c[1], L.key.soft],
    uKeyHS: [L.key.hs[0], L.key.hs[1], L.key.fall],
    uStrip: [L.strip.strength, L.strip.c[0], L.strip.c[1], L.strip.soft],
    uStripHS: L.strip.hs as number[],
    uBounce: [L.bounce.strength, L.bounce.c[0], L.bounce.c[1], L.bounce.soft],
    uBounceHS: L.bounce.hs as number[],
    uDome: [L.dome.strength, L.dome.dir[0], L.dome.dir[1], 0],
    uDomeR: L.dome.range as number[],
    uCaught: L.CAUGHT as number[],
    uTint: L.TINT as number[],
    uMetalK: [L.GLOW_K, L.CAUGHT3_K, L.HOT_K, L.PAPER_GLOW],
    uExp: [L.HOT_EXP, L.GLOW_EXP],
    uTooth: L.TOOTH,
    uPaper: L.PAPER as number[],
    uKeyDir: L.KEY_DIR as number[],
    uPool: [L.POOL, L.POOL_K, L.POOL_SCALE, L.POOL_NOISE],
    uPoolCol: lin(L.POOL_COL),
    uContact: [L.CONTACT, L.CONTACT_OFF],
    uPearl: [L.PEARL, L.PEARL_MIX],
    uGrain: L.GRAIN,
    uInv: [L.INV_PAINT, L.INV_K, L.IMPASTO],
  });
  const FINISH_CONST = finishConst();

  const rippleData = new Float32Array(24);

  // --- passes
  const drawPieces = (warpT: number) => {
    const { FA, FX } = targets;
    if (!FA || !FX) return;
    const pr = P.piece!;
    const vPer = SEG * 6;
    const draw = (out: Target, mode: number, mask: [boolean, boolean, boolean, boolean], blend: boolean | "height", clear: boolean) => {
      gl.useProgram(pr.p);
      gl.bindFramebuffer(gl.FRAMEBUFFER, out.fb);
      gl.viewport(0, 0, out.w, out.h);
      if (clear) {
        gl.colorMask(true, true, true, true);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      if (pieceVerts === 0) return;
      gl.colorMask(...mask);
      gl.uniform2f(uni(pr, "uView"), W, H);
      gl.uniform4f(uni(pr, "uWarp"), Mo.WARP_AMP, Mo.WARP_LEN, Mo.WARP_PERIOD, warpT);
      gl.uniform1f(uni(pr, "uMode"), mode);
      gl.uniform1f(uni(pr, "uPaperH"), 0.08);
      gl.uniform1f(uni(pr, "uPlateau"), 0.51);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, atlasPrint.tex);
      gl.uniform1i(uni(pr, "uPrint"), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, atlasFx.tex);
      gl.uniform1i(uni(pr, "uFx"), 1);
      gl.bindBuffer(gl.ARRAY_BUFFER, pieceBuf);
      const stride = FLOATS_PER_VERTEX * 4;
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, stride, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 8);
      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, 16);
      if (blend === "height" && minmax) {
        // exact: per piece, dst = max(dst, h) outside, then over by coverage (a lily
        // painted over a pad replaces its height; a shoulder never dents a plateau)
        gl.enable(gl.BLEND);
        gl.uniform1f(uni(pr, "uMode"), 2);
        for (let v = 0; v < pieceVerts; v += vPer) {
          gl.blendEquation(minmax.MAX_EXT);
          gl.drawArrays(gl.TRIANGLES, v, vPer);
          gl.blendEquation(gl.FUNC_ADD);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          gl.uniform1f(uni(pr, "uMode"), 2.6);
          gl.drawArrays(gl.TRIANGLES, v, vPer);
          gl.uniform1f(uni(pr, "uMode"), 2);
          drawCalls += 2;
        }
      } else {
        if (blend) {
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        } else gl.disable(gl.BLEND);
        gl.drawArrays(gl.TRIANGLES, 0, pieceVerts);
        drawCalls++;
      }
      gl.blendEquation(gl.FUNC_ADD);
      gl.disable(gl.BLEND);
      gl.disableVertexAttribArray(1);
      gl.disableVertexAttribArray(2);
      gl.colorMask(true, true, true, true);
    };
    draw(FA, 0, [true, true, true, true], true, true);
    draw(FX, 1, [true, true, false, false], true, true);
    draw(FX, 2, [false, false, true, false], "height", false);
    draw(FX, 3, [false, false, false, true], false, false);
  };

  const drawNear = () => {
    const { FA, NEARa, NEARb, NEAR } = targets;
    if (!FA || !NEARa || !NEARb || !NEAR) return;
    // NEAR is CSS/2: one texel = 2 CSS px. Tight sigma 2 CSS px = 1 texel, wide 8 CSS px = 4 texels.
    const wt = gaussWeights(L.NEAR_R / 2);
    const ww = gaussWeights(L.NEAR_G / 2);
    run(P.nearDown!, NEARa, { uSrc: FA });
    run(P.nearBlur!, NEARb, { uSrc: NEARa }, { uDir: [1, 0], "uWT[0]": wt, "uWW[0]": ww });
    run(P.nearBlur!, NEAR, { uSrc: NEARb }, { uDir: [0, 1], "uWT[0]": wt, "uWW[0]": ww });
  };

  const paintGround = (f: GiltFrame) => {
    const { A, N, S, F, G, NEAR } = targets;
    if (!A || !N || !S || !F || !G || !NEAR) return;
    rippleData.fill(0);
    f.ripples.slice(-6).forEach((r, i) => rippleData.set([r.x, r.y, r.t, r.strength], i * 4));
    run(P.field!, A, { uUnder: underTex }, { uTime: f.waterT, ...waterPalette, uRipple: rippleData });
    const compU = { uSpeckle: Wt.SPECKLE, uLevels: Wt.LEVELS, uDitherAmt: Wt.DITHER_AMT, uDitherNear: Wt.DITHER_NEAR as number[] };
    if (half) {
      const { T, B1a, B1, B2a, B2 } = targets;
      run(P.tensor!, T, { uSrc: A });
      run(P.blur5!, B1a, { uSrc: T }, { uDir: [1, 0], "uW[0]": M.W5 });
      run(P.blur5!, B1, { uSrc: B1a }, { uDir: [0, 1], "uW[0]": M.W5 });
      run(P.blur11!, B2a, { uSrc: B1 }, { uDir: [1, 0], "uW[0]": M.W11 });
      run(P.blur11!, B2, { uSrc: B2a }, { uDir: [0, 1], "uW[0]": M.W11 });
      run(P.flow!, F, { uT1: B1, uT2: B2, uUnder: underTex }, { uVert: Wt.WILLOW_VERT as number[] });
      run(P.strokes!, S, { uSrc: A, uFlow: F, uNoise: N }, waterPalette);
      run(P.comp!, G, { uSrc: A, uStrokes: S, uFlow: F, uNear: NEAR }, compU);
    } else {
      run(P.flowFlat!, F, { uUnder: underTex }, { uVert: Wt.WILLOW_VERT as number[] });
      run(P.strokesEnc!, S, { uSrc: A, uFlow: F, uNoise: N }, waterPalette);
      run(P.compEnc!, G, { uSrc: A, uStrokes: S, uFlow: F, uNear: NEAR }, compU);
    }
    groundReady = true;
  };

  const finish = (f: GiltFrame) => {
    const { G, FA, FX, NEAR } = targets;
    if (!G || !FA || !FX || !NEAR) return;
    gl.bindTexture(gl.TEXTURE_2D, tiltTex.tex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 256, 1, gl.RGBA, gl.UNSIGNED_BYTE, f.tilt);
    run(P.finish!, null, { uG: G, uFA: FA, uFX: FX, uNear: NEAR, uTilt: tiltTex }, {
      ...FINISH_CONST,
      uShift: f.shift,
      uLamp: f.lamp,
      uSunX: f.sunX,
      uGrainSeed: f.grainSeed,
      uDebug: f.debug,
      uSwell: [L.SWELL_AMP, f.waterT],
    });
  };

  return {
    gl,
    resize(w, h, d) {
      W = Math.max(1, Math.round(w));
      H = Math.max(1, Math.round(h));
      dpr = d;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      freeTargets();
      const cw = canvas.width;
      const ch = canvas.height;
      const A = makeTarget(cw, ch, false);
      const N = makeTarget(W, H, false);
      const S = makeTarget(W, H, false);
      const G = makeTarget(cw, ch, false);
      const FA = makeTarget(cw, ch, false);
      const FX = makeTarget(cw, ch, false);
      const nw = Math.max(1, Math.round(W / 2));
      const nh = Math.max(1, Math.round(H / 2));
      const NEARa = makeTarget(nw, nh, false);
      const NEARb = makeTarget(nw, nh, false);
      const NEAR = makeTarget(nw, nh, false);
      if (!A || !N || !S || !G || !FA || !FX || !NEARa || !NEARb || !NEAR) throw new ShaderError("render targets", "framebuffer incomplete");
      targets = { A, N, S, G, FA, FX, NEARa, NEARb, NEAR };
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
      run(P.noise!, targets.N);
      piecesDirty = true;
      nearDirty = true;
      groundReady = false;
    },

    setPieces(verts, count) {
      gl.bindBuffer(gl.ARRAY_BUFFER, pieceBuf);
      gl.bufferData(gl.ARRAY_BUFFER, verts.subarray(0, count * FLOATS_PER_VERTEX), gl.DYNAMIC_DRAW);
      pieceVerts = count;
      piecesDirty = true;
      nearDirty = true;
    },

    setUnder(img) {
      if (!img) {
        underTex = blankUnder;
        return;
      }
      let t = underCache.get(img);
      if (!t) {
        t = imageTex(img, false, false);
        underCache.set(img, t);
      }
      if (underTex !== t) groundReady = false;
      underTex = t;
    },

    render(f) {
      if (gl.isContextLost()) return;
      if (piecesDirty || flags.FOIL_WARP) {
        drawPieces(f.t);
        piecesDirty = false;
        if (!flags.FOIL_WARP) nearDirty = true;
      }
      if (nearDirty || (flags.FOIL_WARP && f.paint)) {
        drawNear();
        nearDirty = false;
      }
      if (f.paint || !groundReady) paintGround(f);
      finish(f);
    },

    destroy() {
      freeTargets();
      gl.deleteBuffer(tri);
      gl.deleteBuffer(pieceBuf);
      [atlasPrint, atlasFx, tiltTex, blankUnder, ...underCache.values()].forEach((t) => gl.deleteTexture(t.tex));
      programs.forEach((p) => gl.deleteProgram(p));
      shaders.forEach((s) => gl.deleteShader(s));
    },

    stats() {
      const cw = canvas.width;
      const ch = canvas.height;
      const dev = cw * ch * 4;
      const css = W * H * 4;
      const mb = (4 * dev + 2 * css + 3 * (css / 4) + (half ? (css / 4) * 8 * 5 + (css / 16) * 8 * 2 : css / 4)) / 1e6;
      return { drawCalls, half, targetsMB: Math.round(mb * 10) / 10, finishReads: flags.INVERT_RELIEF ? 18 : 14 };
    },
  };
}
