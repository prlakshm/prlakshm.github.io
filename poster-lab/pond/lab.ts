/* Pond texture lab: the real pond (scene, paint passes, composite) with the
   star material swapped for one option from ./tex/<id>.js.

   /poster-lab/pond/lab.html?v=<id>            still frame, for captures
     &t=<s>          seconds after the pond's start time (default 0)
     &lamp=x,y|gold  where the cursor's lamp sits (default: its idle spot)
     &w=<css px>     band width (default 1440)
   /poster-lab/pond/lab.html?v=<id>&live       animated, the cursor works

   An option module exports default { title, blurb, glsl, patch?, compositePatch? }.
   `glsl` replaces FS_CONFETTI from `const vec3 GOLD_INK` up to the glint
   helper (GOLD_INK, GOLD_TINT, goldStar, holoStar and anything they use);
   `patch` / `compositePatch` are [from, to] string replacements applied after. */

import { createPainter, FLOATS_PER_VERTEX } from "../../src/pages/home/pond/painter";
import { createScene } from "../../src/pages/home/pond/scene";
import { FS_COMPOSITE, FS_CONFETTI } from "../../src/pages/home/pond/shaders";

type Option = {
  title: string;
  blurb: string;
  glsl?: string;
  patch?: [string, string][];
  compositePatch?: [string, string][];
};

const T0 = 31834; // PondFooter's start time
const START = "const vec3 GOLD_INK";
const END = "// A four-point glint";

const options = import.meta.glob("./tex/*.js") as Record<string, () => Promise<{ default: Option }>>;
const ids = Object.keys(options)
  .map((k) => k.replace("./tex/", "").replace(".js", ""))
  .sort((a, b) => (a === "now" ? -1 : b === "now" ? 1 : a.localeCompare(b)));

const q = new URLSearchParams(location.search);
const id = q.get("v") || "now";
const live = q.has("live");
const W = Math.round(+(q.get("w") || 1440));
const H = Math.floor(Math.min(340, Math.max(180, W * 0.194)));

const apply = (src: string, patches: [string, string][] = [], what: string) => {
  for (const [from, to] of patches) {
    if (!src.includes(from)) throw new Error(`${what} patch not found: ${from.slice(0, 80)}`);
    src = src.split(from).join(to);
  }
  return src;
};

async function main() {
  const status = document.getElementById("status")!;
  const fail = (m: string) => {
    status.textContent = m;
    (window as any).__error = m;
  };
  const load = options[`./tex/${id}.js`];
  if (!load) return fail(`no option "${id}" (have: ${ids.join(", ")})`);
  const opt = (await load()).default;

  let confetti = FS_CONFETTI;
  if (opt.glsl) {
    const a = confetti.indexOf(START);
    const b = confetti.indexOf(END);
    if (a < 0 || b < 0) return fail("FS_CONFETTI markers moved");
    confetti = confetti.slice(0, a) + opt.glsl + "\n" + confetti.slice(b);
  }
  try {
    confetti = apply(confetti, opt.patch, "confetti");
  } catch (e) {
    return fail(String(e));
  }
  const cp = opt.compositePatch;
  const composite = cp ? (enc: boolean) => apply(FS_COMPOSITE(enc), cp, "composite") : undefined;

  // shader compile errors arrive as console warnings from the painter
  const warn = console.warn;
  const errors: string[] = [];
  console.warn = (...a: unknown[]) => {
    errors.push(a.map(String).join(" "));
    warn(...a);
  };

  const band = document.getElementById("band")!;
  band.style.width = `${W}px`;
  band.style.height = `${H}px`;
  const canvas = band.querySelector("canvas")!;
  const painter = createPainter(canvas, { confetti, composite });
  if (!painter) return fail("painter failed:\n" + errors.join("\n"));
  if (errors.length) return fail(errors.join("\n"));
  const scene = createScene();
  scene.resize(W, H);
  painter.resize(W, H, 2);

  document.getElementById("title")!.textContent = `${id} · ${opt.title}`;
  document.getElementById("blurb")!.textContent = opt.blurb;
  const nav = document.getElementById("nav")!;
  for (const o of ids) {
    const a = document.createElement("a");
    a.href = `?v=${o}${live ? "&live" : ""}`;
    a.textContent = o;
    if (o === id) a.className = "on";
    nav.append(a);
  }

  const pieces = (quads: Float32Array, n: number) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const o = i * 6 * FLOATS_PER_VERTEX;
      out.push({ x: quads[o + 2], y: quads[o + 3], size: quads[o + 4], angle: quads[o + 5], kind: quads[o + 6], seed: quads[o + 7], depth: quads[o + 8], hue: quads[o + 9] });
    }
    return out;
  };

  if (!live) {
    const t = T0 + +(q.get("t") || 0);
    // settle the scene up to t (fixed steps, so every option sees the same frame)
    for (let s = T0; s < t; s += 1 / 30) scene.step(s, 1 / 30, { pointer: null, velocity: { x: 0, y: 0 } });
    const f = scene.build(t);
    const list = pieces(f.quads, f.quadCount);
    const lampQ = q.get("lamp");
    if (lampQ === "gold") {
      // over the raft's gold star, a little up and left of it
      const g = list.filter((p) => p.kind === 1).sort((a, b) => Math.abs(a.x - 0.27 * W) - Math.abs(b.x - 0.27 * W))[0];
      f.lamp = [g.x - g.size * 0.4, g.y - g.size * 0.5, 160, 1];
    } else if (lampQ) {
      const [x, y] = lampQ.split(",").map(Number);
      f.lamp = [x, y, 160, 1];
    }
    painter.render({ t, ripples: [], ...f });
    (window as any).__pieces = list;
    (window as any).__band = { W, H };
    (window as any).__ready = true;
    status.textContent = "";
    return;
  }

  // live: the pond's own loop, minus ripples
  let pointer: { x: number; y: number } | null = null;
  const velocity = { x: 0, y: 0 };
  let lastMove = { x: 0, y: 0, at: 0 };
  let last = performance.now();
  const t0 = last;
  band.addEventListener("pointermove", (e) => {
    const r = band.getBoundingClientRect();
    const s = r.width / W;
    const p = { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s };
    const now = performance.now();
    if (pointer && now > lastMove.at) {
      const k = 1000 / Math.max(8, now - lastMove.at);
      velocity.x = velocity.x * 0.5 + (p.x - lastMove.x) * k * 0.5;
      velocity.y = velocity.y * 0.5 + (p.y - lastMove.y) * k * 0.5;
    }
    lastMove = { ...p, at: now };
    pointer = p;
  });
  band.addEventListener("pointerleave", () => (pointer = null));
  const tick = () => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = T0 + (now - t0) / 1000;
    velocity.x *= Math.exp(-dt / 0.12);
    velocity.y *= Math.exp(-dt / 0.12);
    scene.step(t, dt, { pointer, velocity });
    painter.render({ t, ripples: [], ...scene.build(t) });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  status.textContent = "";
}

main();
