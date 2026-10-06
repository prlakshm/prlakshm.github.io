import { loadConcept, type Concept } from "./concept";
import { createGiltPainter, ShaderError, type GiltPainter } from "./gilt-painter";
import { bandHeight, createGiltScene, type GiltScene } from "./gilt-scene";
import { DEBUG_MODES } from "./gilt-shaders";

/* The lab page (poster-lab/gilt/index.html?c=<id>). In production this wiring
   moves into PondFooter.tsx (Motion's frame loop instead of rAF).

   URL
     c=<id>            concept folder under concepts/ (default test)
     t=<s>             frozen time (default 0); ignored with &live
     lamp=idle|off|hero|water|far|smallest|x,y   (x,y in CSS px, or fractions <= 1.5)
     w=<css px>        band width (height = clamp(180, 0.194 w, 340)); h=<css px> forces height
     dpr=<n>           device pixel ratio override (default min(devicePixelRatio, 2))
     live              animated: real clock, cursor lamp, ripples on click
     arrive            (live) run the one-time arrival sweep immediately
     debug=caught|hot|glow|height|near|coverage|normal|env
     ab=<param>:<value>[,...]   override any concept.json number (see concept.ts applyAB)
     noHalf            force the no-half-float fallback

   window.__gilt = { ready, frame(dt), setPointer(x,y), stats(), pieces(), spots(),
                     snapshot(), bench(n), measure(), setDebug(name), setLamp(mode) }
   window.__error = message (+ shader logs) on failure. */

declare global {
  interface Window {
    __gilt?: Record<string, unknown> & { ready: boolean };
    __error?: string;
  }
}

const qs = new URLSearchParams(location.search);
const id = qs.get("c") ?? "test";
const live = qs.has("live");
const tParam = Number(qs.get("t") ?? 0) || 0;
let lampMode = qs.get("lamp") ?? "idle";
const wParam = qs.get("w") ? Number(qs.get("w")) : null;
const hParam = qs.get("h") ? Number(qs.get("h")) : null;
const dprParam = qs.get("dpr") ? Number(qs.get("dpr")) : null;
let debugName = qs.get("debug") ?? "";
const ab = qs.getAll("ab");

const band = document.getElementById("band") as HTMLDivElement;
const canvas = band.querySelector("canvas") as HTMLCanvasElement;
const status = document.getElementById("status") as HTMLDivElement;

const fail = (msg: string, log = "") => {
  const text = log ? `${msg}\n${log}` : msg;
  window.__error = text;
  status.textContent = text;
  band.classList.add("is-flat");
  console.error(text);
};

const pct = (a: number[], p: number) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

async function main() {
  let concept: Concept & { applied: string[]; mapped: string[]; warnings: string[] };
  try {
    concept = await loadConcept(id, new URL("../concepts", import.meta.url).pathname.replace(/\/$/, ""), ab);
  } catch (e) {
    fail(`concept "${id}" failed to load: ${(e as Error).message}`);
    return;
  }
  const cfg = concept.config;
  const Mo = cfg.motion;
  (document.getElementById("title") as HTMLElement).textContent = `${concept.id} · ${cfg.name ?? ""}`;
  (document.getElementById("pitch") as HTMLElement).textContent = (cfg.pitch as string) ?? "";
  const nav = document.getElementById("nav") as HTMLElement;
  ["A", "B", "C", "D", "E", "test"].forEach((c) => {
    const a = document.createElement("a");
    const u = new URLSearchParams(qs);
    u.set("c", c);
    a.href = `?${u}`;
    a.textContent = c;
    if (c === id) a.className = "on";
    nav.appendChild(a);
  });

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // --- size
  const sizeBand = () => {
    const w = wParam ?? band.parentElement!.clientWidth ?? window.innerWidth;
    const W = Math.round(w);
    const H = Math.round(hParam ?? bandHeight(W));
    band.style.width = `${W}px`;
    band.style.height = `${H}px`;
    return { W, H };
  };

  let painter: GiltPainter;
  try {
    painter = createGiltPainter(canvas, concept);
  } catch (e) {
    fail(`engine failed: ${(e as Error).message}`, e instanceof ShaderError ? e.log : String((e as Error).stack ?? ""));
    return;
  }
  const scene: GiltScene = createGiltScene(concept);
  let dpr = dprParam ?? Math.min(window.devicePixelRatio || 1, 2);
  let lost = false;
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    lost = true;
    band.classList.add("is-flat");
    stop();
  });

  const pickUnder = () => painter.setUnder(scene.mobile ? concept.underM ?? concept.underD : concept.underD ?? concept.underM);
  const layoutNow = () => {
    const { W, H } = sizeBand();
    painter.resize(W, H, dpr);
    scene.resize(W, H);
    const g = scene.geometry();
    painter.setPieces(g.verts, g.count);
    pickUnder();
  };
  try {
    layoutNow();
  } catch (e) {
    fail(`engine failed: ${(e as Error).message}`, e instanceof ShaderError ? e.log : "");
    return;
  }

  // --- state
  let t = tParam; // lighting clock
  let pointer: { x: number; y: number } | null = null;
  let frames = 0;
  let paints = 0;
  let lastPaintT = -1e9;
  const intervals: number[] = [];
  const cpu: number[] = [];

  const lampPointer = (): { x: number; y: number } | null => {
    const W = scene.W;
    const H = scene.H;
    if (lampMode === "idle" || lampMode === "off") return null;
    const sp = scene.spots();
    if (lampMode === "hero") return { x: sp.hero.spot[0], y: sp.hero.spot[1] };
    if (lampMode === "water") return { x: sp.water.spot[0], y: sp.water.spot[1] };
    if (lampMode === "far" && sp.far) return { x: sp.far.centre[0], y: sp.far.centre[1] };
    if (lampMode === "smallest" && sp.smallest) return { x: sp.smallest.centre[0], y: sp.smallest.centre[1] };
    const m = /^(-?[\d.]+),(-?[\d.]+)$/.exec(lampMode);
    if (m) {
      let x = Number(m[1]);
      let y = Number(m[2]);
      if (Math.abs(x) <= 1.5 && Math.abs(y) <= 1.5) {
        x *= W;
        y *= H;
      }
      return { x, y };
    }
    return null;
  };

  const draw = (paint: boolean, still = false) => {
    if (lost) return;
    const t0 = performance.now();
    const f = scene.frame(t, { still, lampOff: lampMode === "off" });
    const grainSeed = still || reduced ? 0 : Math.floor(t * cfg.lighting.GRAIN_HZ);
    painter.render({
      t,
      waterT: Mo.T0 + t,
      paint,
      ripples: scene.ripples(t).map((r) => ({ ...r, t: r.t + Mo.T0 })),
      shift: f.shift,
      lamp: f.lamp,
      sunX: f.sunX,
      tilt: f.tilt,
      grainSeed,
      debug: DEBUG_MODES[debugName] ?? 0,
    });
    frames++;
    if (paint) {
      paints++;
      lastPaintT = t;
    }
    cpu.push(performance.now() - t0);
    if (cpu.length > 2000) cpu.shift();
  };

  // Advance the clock by dt in small steps (followers are rate-based), render once.
  const advance = (dt: number) => {
    const n = Math.max(1, Math.ceil(dt / (1 / 60)));
    const h = dt / n;
    const ptr = pointer ?? lampPointer();
    for (let i = 0; i < n; i++) {
      t += h;
      scene.step(t, h, { pointer: ptr });
    }
  };

  // Frozen render at the current t: replay from the parked start so any t is reproducible.
  const renderFrozen = () => {
    scene.reset();
    const target = t;
    t = 0;
    advance(target);
    t = target;
    const ptr = pointer ?? lampPointer();
    if (ptr) scene.settle(t, { pointer: ptr });
    draw(true, reduced);
  };

  // --- live loop
  let running = false;
  let raf = 0;
  let tBase = t;
  let tRun = 0;
  let lastNow = 0;
  let lastStep = 0;
  let lastPaintNow = -1e9;
  let slow = 0;
  const clock = (now: number) => tBase + (tRun ? (now - tRun) / 1000 : 0);
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    const gap = now - lastNow;
    slow = gap > 22 ? Math.min(60, slow + 1) : Math.max(0, slow - 1);
    const minGap = slow > 20 ? 29 : 1000 / Mo.FINISH_HZ - 3;
    if (gap < minGap) return;
    if (lastNow) intervals.push(gap);
    if (intervals.length > 5000) intervals.shift();
    lastNow = now;
    t = clock(now);
    const dt = Math.min(0.05, (now - lastStep) / 1000);
    lastStep = now;
    scene.step(t, dt, { pointer });
    const paintGap = slow > 20 ? 1000 / (Mo.PAINT_HZ / 2) : 1000 / Mo.PAINT_HZ;
    const paint = now - lastPaintNow >= paintGap - 4;
    if (paint) lastPaintNow = now;
    draw(paint);
  };
  const start = () => {
    if (running || !live || reduced || lost) return;
    running = true;
    tRun = performance.now();
    lastNow = 0;
    lastStep = tRun;
    raf = requestAnimationFrame(loop);
  };
  function stop() {
    if (!running) return;
    running = false;
    tBase = clock(performance.now());
    tRun = 0;
    cancelAnimationFrame(raf);
  }

  let visible = false;
  const io = new IntersectionObserver(
    ([e]) => {
      visible = e.isIntersecting;
      if (visible && !document.hidden) start();
      else stop();
    },
    { rootMargin: "120px 0px" },
  );
  io.observe(band);
  const ioArrive = new IntersectionObserver(
    ([e]) => {
      if (e.intersectionRatio >= Mo.ARRIVAL_VIS && live && !reduced) {
        scene.arrive(t);
        ioArrive.disconnect();
      }
    },
    { threshold: [0, Mo.ARRIVAL_VIS, 0.6, 1] },
  );
  ioArrive.observe(band);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (visible) start();
  });

  const local = (e: PointerEvent) => {
    const r = band.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  if (live && !reduced) {
    band.addEventListener("pointermove", (e) => {
      if (e.pointerType === "mouse") pointer = local(e);
    });
    band.addEventListener("pointerleave", () => (pointer = null));
    band.addEventListener("pointerdown", (e) => {
      const p = local(e);
      scene.ripple(p.x, p.y, t, 1.1);
      if (e.pointerType !== "mouse") scene.tapAt(p.x, p.y, t);
    });
    if (qs.has("arrive")) scene.arrive(t);
  }

  let resizeTimer = 0;
  new ResizeObserver(() => {
    if (wParam) return;
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const { W, H } = sizeBand();
      if (W === scene.W && H === scene.H) return;
      layoutNow();
      if (!running) renderFrozen();
    }, 60);
  }).observe(band.parentElement!);

  // --- first frame
  if (reduced) {
    t = 0;
    scene.reset();
    draw(true, true);
  } else {
    renderFrozen();
  }
  status.textContent = [
    concept.applied.length ? `ab: ${concept.applied.join("  ")}` : "",
    concept.warnings.length ? `concept.json: ${concept.warnings.join("; ")}` : "",
  ].filter(Boolean).join("\n");
  if (concept.warnings.length) console.warn("gilt concept warnings:", concept.warnings);

  const gl = painter.gl;
  const syncFinish = () => {
    const px = new Uint8Array(4);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  };

  window.__gilt = {
    ready: true,
    id,
    config: cfg,
    applied: concept.applied,
    mapped: concept.mapped,
    warnings: concept.warnings,
    /* advance the frozen clock by dt (s), simulating the followers in 1/60 s steps, and render */
    frame(dt = 1 / 60) {
      if (dt > 0) advance(dt);
      draw(true, reduced);
      return t;
    },
    /* jump to absolute time s from the parked start (reproducible) */
    at(s: number) {
      t = s;
      renderFrozen();
      return t;
    },
    setPointer(x: number | null, y?: number) {
      pointer = x === null || x === undefined ? null : { x, y: y ?? 0 };
      if (pointer) scene.settle(t, { pointer });
      if (!running) draw(true, reduced);
    },
    setLamp(mode: string) {
      lampMode = mode;
      pointer = null;
      if (!running) renderFrozen();
    },
    setDebug(name: string) {
      debugName = name;
      if (!running) draw(false, reduced);
    },
    resize(w: number, h?: number) {
      band.style.width = `${w}px`;
      band.style.height = `${h ?? bandHeight(w)}px`;
      painter.resize(w, h ?? bandHeight(w), dpr);
      scene.resize(w, h ?? bandHeight(w));
      const g = scene.geometry();
      painter.setPieces(g.verts, g.count);
      pickUnder();
      if (!running) renderFrozen();
    },
    setDpr(d: number) {
      dpr = d;
      layoutNow();
      if (!running) renderFrozen();
    },
    pieces: () =>
      scene.pieces().map((p) => ({ index: p.index, id: p.id, centre: p.visCentre, bbox: p.bbox, area: p.area, kind: p.def.kind ?? null })),
    spots: () => scene.spots(),
    /* render the current state and return the canvas as a PNG data URL (exact pixels) */
    snapshot() {
      draw(false, reduced);
      return canvas.toDataURL("image/png");
    },
    stats() {
      const ps = painter.stats();
      return {
        t,
        running,
        visible,
        reduced,
        lost,
        frames,
        paints,
        lastPaintT,
        drawCalls: ps.drawCalls,
        half: ps.half,
        targetsMB: ps.targetsMB,
        finishReads: ps.finishReads,
        W: scene.W,
        H: scene.H,
        dpr,
        mobile: scene.mobile,
        pieces: scene.pieces().length,
        scene: scene.state(),
        lampMode, // &lamp= / setLamp: 'off' renders the lamp at 0 even though scene.lamp.on keeps its idle value
        lampOnRendered: lampMode === "off" ? 0 : scene.state().lamp.on,
        pointer,
        intervals: { n: intervals.length, p50: pct(intervals, 50), p95: pct(intervals, 95), max: Math.max(0, ...intervals) },
        cpu: { n: cpu.length, p50: pct(cpu, 50), p95: pct(cpu, 95) },
      };
    },
    resetIntervals() {
      intervals.length = 0;
      cpu.length = 0;
    },
    /* GPU cost with gl.finish-style sync (readPixels): FINISH alone, and FINISH + paint */
    bench(n = 120) {
      const fin: number[] = [];
      const full: number[] = [];
      syncFinish();
      for (let i = 0; i < n; i++) {
        let a = performance.now();
        draw(false);
        syncFinish();
        fin.push(performance.now() - a);
        a = performance.now();
        draw(true);
        syncFinish();
        full.push(performance.now() - a);
      }
      return { finish: { p50: pct(fin, 50), p95: pct(fin, 95) }, paintPlusFinish: { p50: pct(full, 50), p95: pct(full, 95) } };
    },
    /* coverage and foil fractions of the band (reads the debug=coverage view) */
    measure() {
      const keep = debugName;
      debugName = "coverage";
      draw(false, true);
      const w = canvas.width;
      const h = canvas.height;
      const buf = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      let foil = 0;
      let cov = 0;
      for (let i = 0; i < w * h; i++) {
        foil += buf[i * 4];
        cov += buf[i * 4 + 1];
      }
      debugName = keep;
      draw(false, reduced);
      return { coverage: cov / 255 / (w * h), foil: foil / 255 / (w * h) };
    },
    start,
    stop,
    loseContext() {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      return true;
    },
  };
}

main().catch((e) => fail(`lab crashed: ${(e as Error).message}`, String((e as Error).stack ?? "")));
