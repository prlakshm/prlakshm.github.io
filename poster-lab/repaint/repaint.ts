/* Repaint lab: Pranavi's water-lily painting run through mesq's paint passes
   (the same GLSL the old pond used, src/pages/home/pond/shaders.ts): structure
   tensor -> flow -> line-integral brush strokes -> smear, dry-brush flecks and
   the fixed dither. Renders once, at the painting's own resolution, and exposes
   the result as a PNG data URL for capture (window.__png).

   /poster-lab/repaint/index.html?scene=softer
     scene   scenes/<name>.png (original | strong | softer | ...)
     gold    keep (default: the leaf stays crisp, painted around) | paint
     sw      brush width scale (1 = mesq's 30 CSS px at a 1440 band)
     levels  dither levels (default 9, mesq's)
     smear   smear scale (1 = mesq's)
     speckle fleck scale (1 = mesq's)
     mask    scenes/<name>.png whose red channel is the gold to keep crisp
             (default: the footer's fx map) */

import { COMMON, FS_COMPOSITE, FS_FLOW, FS_NOISE, FS_STROKES, FS_TENSOR, W11, W5, blurFS } from "../../src/pages/home/pond/shaders";

const q = new URLSearchParams(location.search);
const scene = q.get("scene") || "softer";
const keepGold = (q.get("gold") || "keep") !== "paint";
const sw = +(q.get("sw") || 1);
const levels = +(q.get("levels") || 9);
const smear = +(q.get("smear") || 1);
const speckle = +(q.get("speckle") || 1);
const mask = q.get("mask");

const VS = `attribute vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;
// The scene: the painting, with alpha = the gold leaf (so the passes paint around it).
const FS_SCENE = COMMON + `
uniform sampler2D uImg;
uniform sampler2D uGold;
uniform float uKeep;
void main() {
  vec2 uv = gl_FragCoord.xy / uOut;
  gl_FragColor = vec4(texture2D(uImg, uv).rgb, uKeep * smoothstep(0.25, 0.75, texture2D(uGold, uv).r));
}
`;
const scaleSW = (src: string) =>
  src
    .replace("const float SW = 30.0;", `const float SW = ${(30 * sw).toFixed(2)};`)
    .replace(/const float STEP = 6\.4;/g, `const float STEP = ${(6.4 * sw).toFixed(2)};`)
    .replace("const float SMEAR = 0.297;", `const float SMEAR = ${(0.297 * smear).toFixed(4)};`)
    .replace("const float SPECKLE = 1.5;", `const float SPECKLE = ${(1.5 * speckle).toFixed(3)};`);

const load = (src: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("could not load " + src));
    i.src = src;
  });

async function main() {
  const fail = (m: string) => {
    (window as any).__error = m;
    document.getElementById("status")!.textContent = m;
  };
  const [img, goldImg] = await Promise.all([load(`./scenes/${scene}.png`), load(mask ? `./scenes/${mask}.png` : "/home/footer/water-lilies-5b-wide-fx.webp")]);
  const W = 1440;
  const H = Math.round((img.height * W) / img.width);
  const dpr = img.width / W;
  const canvas = document.querySelector("canvas")!;
  canvas.width = img.width;
  canvas.height = Math.round(H * dpr);
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: false })!;
  const hf = gl.getExtension("OES_texture_half_float");
  gl.getExtension("OES_texture_half_float_linear");
  gl.getExtension("EXT_color_buffer_half_float");
  if (!hf) return fail("no half float");

  const prog = (fs: string) => {
    const mk = (t: number, s: string) => {
      const sh = gl.createShader(t)!;
      gl.shaderSource(sh, s);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || "shader");
      return sh;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, mk(gl.VERTEX_SHADER, VS));
    gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, "aPos");
    gl.linkProgram(p);
    return p;
  };
  let P: Record<string, WebGLProgram>;
  try {
    P = {
      scene: prog(FS_SCENE),
      noise: prog(scaleSW(FS_NOISE)),
      tensor: prog(FS_TENSOR),
      blur5: prog(blurFS(5)),
      blur11: prog(blurFS(11)),
      flow: prog(scaleSW(FS_FLOW)),
      strokes: prog(scaleSW(FS_STROKES(false))),
      comp: prog(scaleSW(FS_COMPOSITE(false))),
    };
  } catch (e) {
    return fail(String(e));
  }

  const tex = (w: number, h: number, half: boolean, src?: TexImageSource) => {
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    if (src) {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    } else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, half ? hf.HALF_FLOAT_OES : gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  type T = { tex: WebGLTexture; fb: WebGLFramebuffer | null; w: number; h: number };
  const target = (w: number, h: number, half: boolean): T => {
    const t = tex(w, h, half);
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    return { tex: t, fb, w, h };
  };
  const tri = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, tri);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const run = (p: WebGLProgram, out: T | null, texs: Record<string, WebGLTexture>, uni: Record<string, number | number[]> = {}) => {
    gl.useProgram(p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, out ? out.fb : null);
    const w = out ? out.w : canvas.width;
    const h = out ? out.h : canvas.height;
    gl.viewport(0, 0, w, h);
    const L = (n: string) => gl.getUniformLocation(p, n);
    gl.uniform2f(L("uOut"), w, h);
    gl.uniform2f(L("uView"), W, H);
    gl.uniform1f(L("uDpr"), dpr);
    gl.uniform1f(L("uSeed"), 10);
    Object.entries(texs).forEach(([n, t], i) => {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.uniform1i(L(n), i);
    });
    Object.entries(uni).forEach(([n, v]) => {
      const l = L(n);
      if (!l) return;
      if (Array.isArray(v)) {
        if (n.endsWith("[0]")) gl.uniform1fv(l, v);
        else gl.uniform2f(l, v[0], v[1]);
      } else gl.uniform1f(l, v);
    });
    gl.bindBuffer(gl.ARRAY_BUFFER, tri);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const tImg = tex(0, 0, false, img);
  const tGold = tex(0, 0, false, goldImg);
  const A = target(canvas.width, canvas.height, false);
  const N = target(W, H, false);
  const S = target(W, H, false);
  const hw = Math.round(W / 2), hh = Math.round(H / 2), qw = Math.round(W / 4), qh = Math.round(H / 4);
  const Tt = target(hw, hh, true), B1a = target(hw, hh, true), B1 = target(hw, hh, true);
  const B2a = target(qw, qh, true), B2 = target(qw, qh, true), F = target(hw, hh, true);

  run(P.scene, A, { uImg: tImg, uGold: tGold }, { uKeep: keepGold ? 1 : 0 });
  run(P.noise, N, {});
  run(P.tensor, Tt, { uSrc: A.tex });
  run(P.blur5, B1a, { uSrc: Tt.tex }, { uDir: [1, 0], "uW[0]": W5 });
  run(P.blur5, B1, { uSrc: B1a.tex }, { uDir: [0, 1], "uW[0]": W5 });
  run(P.blur11, B2a, { uSrc: B1.tex }, { uDir: [1, 0], "uW[0]": W11 });
  run(P.blur11, B2, { uSrc: B2a.tex }, { uDir: [0, 1], "uW[0]": W11 });
  run(P.flow, F, { uT1: B1.tex, uT2: B2.tex });
  run(P.strokes, S, { uSrc: A.tex, uFlow: F.tex, uNoise: N.tex });
  run(P.comp, null, { uSrc: A.tex, uStrokes: S.tex, uFlow: F.tex }, { uLevels: levels });
  gl.finish();
  (window as any).__png = canvas.toDataURL("image/png");
  (window as any).__ready = true;
  document.getElementById("status")!.textContent = `${scene} · gold ${keepGold ? "kept" : "painted"} · brush ×${sw}`;
}

main().catch((e) => {
  (window as any).__error = String(e);
});
