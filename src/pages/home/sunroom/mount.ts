/* ==========================================================================
   Sunroom — mounting.

   Measures the hero, lays the room out around it, and runs it: the sketch
   draws itself in, the sun arrives, the dust drifts, the light leans a little
   toward the pointer, and one kind of glass can be swapped for another.
   ========================================================================== */

import { animate } from "motion";
import { computeLayout, sunFrom, type Layout } from "./scene.js";
import { buildModel, curtainsAt, type Model } from "./model.js";
import { GROUP_ORDER, curtainPaths, renderSketch, type LineStyle } from "./sketch.js";
import { readHand, renderHand } from "./hands.js";
import { createLight, type LightRenderer, type LightStyle } from "./light.js";
import { leavesAt } from "./leaves.js";
import { createMotes, type Motes } from "./motes.js";
import { STYLES, mixLight, mixRgb, type RoomStyle, type RoomVariant } from "./styles.js";

const INK: LineStyle = {
  color: "#1c1b19",
  width: { bold: 1.25, main: 1.05, fine: 0.85, hair: 0.7 },
  opacity: { bold: 0.92, main: 0.84, fine: 0.7, hair: 0.4 },
  jitter: 1.2,
  bow: 2.4,
  over: [2.5, 8],
  double: 0.28,
};

const WIDE = "(min-width: 1100px)";
/** The light is ambient: it does not need the display's full refresh rate. */
const FRAME_MS = 1000 / 34;

/* The entrance, in seconds. Each part of the room is drawn over [start,
   start + spread] — wall, then doors, drapery, table, chairs: the order you
   would sketch them in — and then the sun comes out. */
const DRAW: Record<number, [number, number]> = {
  [GROUP_ORDER.wall]: [0.05, 0.45],
  [GROUP_ORDER.door]: [0.25, 0.75],
  [GROUP_ORDER.curtain]: [0.8, 0.45],
  [GROUP_ORDER.table]: [1.0, 0.45],
  [GROUP_ORDER.chairs]: [1.15, 0.6],
};
const LINE_FOR = 0.55;
/** A single unbroken line takes its time. */
const ONE_LINE_FOR = 2.8;
const FILL_FOR = 0.6;
/* The sun comes out only once the doors are drawn: nothing of the glass
   may show colour before there is a door to hold it. */
const LIGHT_AT = 1.5;
const LIGHT_AT_ONE_LINE = 3.1;
const LIGHT_FOR = 2.4;
/** How long to hold the entrance for the hero's web font before going anyway. */
const FONT_WAIT_MS = 1200;

/* A GPU that cannot keep up shows as frames arriving late. Past SLOW_MS a
   frame, the light's resolution is stepped down — it is soft, so the loss
   reads as nothing — and if the lowest step is still slow, it stops moving. */
const SLOW_MS = 42;
const QUALITY_STEP = 0.66;
const QUALITY_FLOOR = 0.3;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** A pen stroke: quick off the mark, easing as it lands. */
const easeLine = (u: number) => 1 - Math.pow(1 - u, 2.4);
const easeLight = (u: number) => u * u * (3 - 2 * u);

export interface Sunroom {
  setVariant(variant: RoomVariant): void;
  destroy(): void;
}

export function mountSunroom(root: HTMLElement, initial: RoomVariant): Sunroom {
  const host = root.parentElement;
  const block = host?.querySelector<HTMLElement>(".hero-block") ?? null;
  const lastCol = host?.querySelector<HTMLElement>(".hero-col--prev") ?? block;
  const svg = root.querySelector<SVGSVGElement>(".sunroom-sketch");
  const lightCanvas = root.querySelector<HTMLCanvasElement>(".sunroom-light");
  const moteCanvas = root.querySelector<HTMLCanvasElement>(".sunroom-motes");
  if (!host || !block || !lastCol || !svg || !lightCanvas || !moteCanvas) {
    return { setVariant() {}, destroy() {} };
  }

  const wide = window.matchMedia(WIDE);
  // the room's hand is curly; `?hand=ink|line` tries the others
  const hand = readHand();
  const lightAt = hand === "line" ? LIGHT_AT_ONE_LINE : LIGHT_AT;
  const ENTRANCE = lightAt + LIGHT_FOR;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let destroyed = false;

  let light: LightRenderer | null = null;
  let lightFailed = false;
  const motes: Motes | null = createMotes(moteCanvas);
  let layout: Layout | null = null;
  let model: Model | null = null;
  let key = "";
  /** Share of the light's pixel budget in use; stepped down on a slow GPU. */
  let quality = 1;
  /* Still: the light is painted when something changes and otherwise left
     alone — no drifting leaves, no dust, no lean. For reduced motion, for a
     browser drawing WebGL in software, and for a GPU that could not keep up. */
  let still = reduced;

  // the glass
  let from: RoomStyle = STYLES[initial];
  let to: RoomStyle = STYLES[initial];
  let current: LightStyle = to.light;
  let moteTint = to.mote;
  let sunTint = to.sun;
  let sunCss = "";
  let styleDirty = true;

  /* The entrance is one clock. Every line's progress and the light's arrival
     are read off it, so the sketch can be rebuilt mid-entrance — the web font
     landing moves the whole room — and simply carry on from where it was. */
  let clock = reduced ? ENTRANCE : -1;
  let fontsReady = reduced;
  let strokes: { el: SVGPathElement; at: number }[] = [];
  let curtains: SVGPathElement[] = [];
  let fills: { el: SVGPathElement; at: number }[] = [];
  let sketchSettled = reduced;
  const running: Array<{ stop(): void }> = [];

  // the pointer, as a lean of -1..1 each way, eased
  const lean = { x: 0, y: 0, tx: 0, ty: 0 };

  let raf = 0;
  let visible = true;
  let last = 0;
  let prevRaf = 0;
  let pace = 16;
  let sinceStep = 0;
  const t0 = performance.now();

  /** How far the sun has come out, 0–1. Held still, it is simply out or not,
      and the canvas fades between the two in CSS. */
  const intro = () =>
    still ? (clock >= lightAt ? 1 : 0) : easeLight(clamp01((clock - lightAt) / LIGHT_FOR));

  const collect = () => {
    const lines = Array.from(svg.querySelectorAll<SVGPathElement>(".sr-l"));
    const counts: Record<string, number> = {};
    for (const p of lines) {
      const g = p.dataset.g ?? "0";
      counts[g] = Math.max(counts[g] ?? 0, Number(p.dataset.i));
    }
    strokes = lines.map((el) => {
      const g = el.dataset.g ?? "0";
      const [start, spread] = DRAW[Number(g)] ?? [0, 0.4];
      return { el, at: start + (Number(el.dataset.i) / (counts[g] || 1)) * spread };
    });
    fills = Array.from(svg.querySelectorAll<SVGPathElement>(".sr-f")).map((el) => ({
      el,
      at: (DRAW[Number(el.dataset.g)] ?? [0, 0])[0] + 0.25,
    }));
  };

  const drawSketch = (t: number) => {
    if (sketchSettled) return;
    let done = true;
    for (const s of strokes) {
      const u = clamp01((t - s.at) / (hand === "line" ? ONE_LINE_FOR : LINE_FOR));
      if (u < 1) done = false;
      s.el.style.strokeDashoffset = String(1 - easeLine(u));
    }
    for (const f of fills) {
      const u = clamp01((t - f.at) / FILL_FOR);
      if (u < 1) done = false;
      f.el.style.opacity = String(u);
    }
    if (done) {
      // hand the finished drawing back to the stylesheet
      sketchSettled = true;
      for (const s of strokes) s.el.style.strokeDashoffset = "";
      for (const f of fills) f.el.style.opacity = "";
    }
  };

  /** Draw one frame of light and dust for this moment. */
  const paint = (now: number) => {
    if (!layout) return;
    const t = still ? 4 : (now - t0) / 1000;
    const i = intro();
    // the curtains in the breeze
    if (!still && curtains.length) {
      const ds = curtainPaths(layout, curtainsAt(t), INK);
      if (ds.length === curtains.length) ds.forEach((d, n) => curtains[n].setAttribute("d", d));
    }
    /* Pointer to the right draws the sun lower, so the light reaches further
       across the room; to the left it lifts a little, but never so far that
       the light lets go of the chairs. Pointer down swings it toward the viewer.
       The floor is seen so nearly edge-on that a hair's change in the sun is
       a long way on the page, hence the small numbers. */
    const lift = lean.x > 0 ? -0.008 * lean.x : -0.006 * lean.x;
    const sun = sunFrom(layout.sun.elev * (1 + lift), layout.sun.azim - 0.045 * lean.y);
    if (light) {
      if (styleDirty) {
        light.setStyle(current);
        styleDirty = false;
      }
      light.setSun(sun.dir);
      if (current.leaf > 0) light.setLeaves(leavesAt(t));
      light.render(t, i);
    }
    if (still) motes?.clear();
    else motes?.render(t, sun.dir, i, moteTint);
    lightCanvas.classList.toggle("is-out", still && i === 0);
    /* The furniture's lit feet: paper until the light has crossed the room,
       then whatever colour it arrives in. */
    const reached = clamp01((i - 0.7) / 0.3);
    const css = light ? `rgb(${mixRgb([255, 255, 255], sunTint, reached).join(" ")})` : "#fff";
    if (css !== sunCss) {
      sunCss = css;
      root.style.setProperty("--sr-sun", css);
    }
  };

  const holdStill = () => {
    if (still) return;
    still = true;
    lean.x = lean.y = lean.tx = lean.ty = 0;
    lightCanvas.classList.add("is-still");
    paint(performance.now());
  };

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const gap = now - prevRaf;
    prevRaf = now;
    if (still || !visible || !layout) return;

    // Gaps over a quarter-second are a tab coming back, not a slow frame.
    if (gap < 250 && light) {
      pace += (gap - pace) * 0.08;
      sinceStep++;
      if (pace > SLOW_MS && sinceStep > 45) {
        sinceStep = 0;
        pace = 16;
        if (quality <= QUALITY_FLOOR) {
          holdStill();
          return;
        }
        quality = Math.max(QUALITY_FLOOR, quality * QUALITY_STEP);
        light.resize(layout, layout.width, layout.height, quality);
        last = 0;
      }
    }

    const dt = now - last;
    if (dt < FRAME_MS) return;
    last = now;
    const ease = 1 - Math.exp(-Math.min(dt, 100) / 260);
    lean.x += (lean.tx - lean.x) * ease;
    lean.y += (lean.ty - lean.y) * ease;
    paint(now);
  };

  /** The room sketches itself, then the sun comes out. Runs once. */
  const enter = () => {
    if (clock >= 0 || !fontsReady || !layout || destroyed) return;
    clock = 0;
    drawSketch(0);
    svg.classList.remove("is-waiting");
    let out = false;
    const tick = (t: number) => {
      clock = t;
      drawSketch(t);
      // held still, nothing else will paint the moment the sun comes out
      if (still && !out && t >= lightAt) {
        out = true;
        paint(performance.now());
      }
    };
    running.push(
      animate(0, ENTRANCE, {
        duration: ENTRANCE,
        ease: "linear",
        onUpdate: tick,
        onComplete: () => tick(ENTRANCE),
      })
    );
  };

  const rebuild = () => {
    if (destroyed) return;
    if (!wide.matches) {
      layout = null;
      model = null;
      key = "";
      host.style.removeProperty("--sr-floor");
      svg.innerHTML = "";
      strokes = [];
      fills = [];
      return;
    }
    const rr = root.getBoundingClientRect();
    const br = block.getBoundingClientRect();
    const cr = lastCol.getBoundingClientRect();
    const metrics = {
      width: rr.width,
      blockTop: br.top - rr.top,
      blockLeft: br.left - rr.left,
      blockRight: br.right - rr.left,
      blockBottom: br.bottom - rr.top,
      textRight: cr.right - rr.left,
      textBottom: cr.bottom - rr.top,
    };
    const k = Object.values(metrics)
      .map((n) => Math.round(n))
      .join(",");
    if (k === key) return;
    key = k;

    layout = computeLayout(metrics);
    model = buildModel(layout);
    root.style.height = `${layout.height}px`;
    /* Tell the hero how much floor the room needs beneath the text: down to
       the lower edge of the light or the nearest chair's feet, whichever is
       lower. The hero pads itself by this, so the notebooks start below the
       room at every size. (Padding sits under the block, so this cannot move
       the block and re-run the layout.) */
    const floor = Math.max(layout.bandBottom, model.bottom) - metrics.blockBottom;
    host.style.setProperty("--sr-floor", `${Math.round(floor)}px`);
    svg.setAttribute("viewBox", `0 0 ${layout.width} ${layout.height}`);
    svg.innerHTML = hand === "ink" ? renderSketch(layout, model, INK) : renderHand(layout, model, INK, hand);
    curtains = Array.from(svg.querySelectorAll<SVGPathElement>("[data-c]"));
    // Nothing of the sketch shows until the entrance starts it.
    svg.classList.toggle("is-waiting", clock < 0);
    if (!reduced && clock < ENTRANCE) {
      collect();
      sketchSettled = false;
      if (clock >= 0) drawSketch(clock);
    }

    if (!light && !lightFailed) {
      light = createLight(lightCanvas);
      lightFailed = !light;
      // Without WebGL the sketch stands on its own.
      lightCanvas.style.display = light ? "" : "none";
      if (light?.caveat) {
        still = true;
        lightCanvas.classList.add("is-still");
      }
    }
    if (light) {
      light.resize(layout, layout.width, layout.height, quality);
      light.setScene(layout, model.occluders);
      styleDirty = true;
    }
    motes?.resize(layout);
    /* Resizing a canvas clears it, and this runs after the frame's rAF: paint
       now, or the browser shows one frame of cleared canvas. */
    paint(performance.now());
    enter();
  };

  rebuild();

  if (!reduced) {
    /* The hero block is sized by its title, and the title's web font lands
       after first paint. Hold the entrance for it so the room is drawn once,
       where it will stay. */
    const go = () => {
      if (fontsReady || destroyed) return;
      fontsReady = true;
      rebuild();
      enter();
    };
    const timer = window.setTimeout(go, FONT_WAIT_MS);
    const title = block.querySelector<HTMLElement>(".hero-title");
    const face = title ? getComputedStyle(title).fontFamily.split(",")[0].trim() : "";
    Promise.resolve(face ? document.fonts.load(`700 1em ${face}`) : null)
      .then(() => document.fonts.ready)
      .then(() => {
        window.clearTimeout(timer);
        go();
      })
      .catch(go);
    running.push({ stop: () => window.clearTimeout(timer) });
  }

  const ro = new ResizeObserver(rebuild);
  ro.observe(block);
  ro.observe(host);
  wide.addEventListener("change", rebuild);

  const io = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
  });
  io.observe(root);

  const onMove = (e: PointerEvent) => {
    if (still || e.pointerType === "touch") return;
    const r = root.getBoundingClientRect();
    if (e.clientY > r.bottom + 80) {
      lean.tx = lean.ty = 0;
      return;
    }
    lean.tx = clamp01((e.clientX - r.left) / r.width) * 2 - 1;
    lean.ty = clamp01((e.clientY - r.top) / Math.max(1, r.height)) * 2 - 1;
  };
  const onLeave = () => {
    lean.tx = lean.ty = 0;
  };

  /* A lost context leaves the canvas blank — and a blank opaque canvas,
     multiplied over the page, is a black hero. Take it out until it is back. */
  const onLost = (e: Event) => {
    e.preventDefault();
    light = null;
    lightCanvas.style.display = "none";
  };
  const onRestored = () => {
    lightFailed = false;
    key = "";
    rebuild();
  };
  lightCanvas.addEventListener("webglcontextlost", onLost);
  lightCanvas.addEventListener("webglcontextrestored", onRestored);

  if (!reduced) {
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(frame);
  }

  return {
    setVariant(variant) {
      const next = STYLES[variant];
      if (next === to) return;
      from = { label: to.label, light: current, mote: moteTint, sun: sunTint };
      to = next;
      const blend = (t: number) => {
        current = mixLight(from.light, to.light, t);
        moteTint = mixRgb(from.mote, to.mote, t);
        sunTint = mixRgb(from.sun, to.sun, t);
        styleDirty = true;
      };
      if (still) {
        blend(1);
        paint(performance.now());
        return;
      }
      running.push(animate(0, 1, { duration: 0.9, ease: [0.4, 0, 0.2, 1], onUpdate: blend }));
    },

    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      running.forEach((a) => a.stop());
      ro.disconnect();
      io.disconnect();
      wide.removeEventListener("change", rebuild);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      lightCanvas.removeEventListener("webglcontextlost", onLost);
      lightCanvas.removeEventListener("webglcontextrestored", onRestored);
      lightCanvas.classList.remove("is-out", "is-still");
      light?.destroy();
      motes?.clear();
      host.style.removeProperty("--sr-floor");
      svg.innerHTML = "";
    },
  };
}
