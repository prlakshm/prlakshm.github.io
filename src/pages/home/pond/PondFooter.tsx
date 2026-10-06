import { useEffect, useRef } from "react";
import { cancelFrame, frame } from "motion";
import { prefersReducedMotion } from "../interactions.js";
import { createPainter, type Ripple } from "./painter.js";
import { createScene } from "./scene.js";
import "./pond.css";

/* The pond: the last thing on the page, under the © line and the contact
   gears, a little under one poster tall, with a clean straight top edge (like
   Emmi Wu's footer block). Water painted the way mesq paints his jelly cup,
   with foil confetti from the pixie-water photos painted into it.

   One WebGL canvas (painter.ts runs the passes; scene.ts moves the confetti),
   drawn from Motion's frame loop. It only runs while on screen, drops to 30
   fps by itself if a machine can't hold 60, and is one still painting with
   reduced motion. Decorative, so hidden from assistive tech. */

const RIPPLE_GAP = 40; // px the cursor travels between rings
const RIPPLE_LIFE = 2.5; // s, matches the shader

export default function PondFooter() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    const canvas = root?.querySelector<HTMLCanvasElement>("canvas");
    if (!root || !canvas) return;

    const reduced = prefersReducedMotion();
    let painter = createPainter(canvas);
    root.classList.toggle("is-flat", !painter);
    const scene = createScene();
    const onLost = (e: Event) => {
      e.preventDefault();
      painter = null;
      root.classList.add("is-flat");
    };
    canvas.addEventListener("webglcontextlost", onLost);

    // The water's clock runs only while the pond is on screen, so every visitor
    // arrives at teal and blue with a periwinkle shadow (not wherever the water
    // had drifted to since page load). 31834 was searched with a model of the
    // field at this drift (shaders.ts DRIFT, FIELD_TIME): it holds that balance
    // for the first two minutes, with the sun within 0.3° of where the foil
    // was tuned.
    let tBase = 31834;
    let tRun = 0; // performance.now() when the clock last started; 0 while paused
    const clock = () => tBase + (tRun ? (performance.now() - tRun) / 1000 : 0);
    let last = performance.now();
    let pointer: { x: number; y: number } | null = null;
    const velocity = { x: 0, y: 0 };
    let lastMove = { x: 0, y: 0, at: 0 };
    let ripples: Ripple[] = [];
    let lastRing = { x: -1e4, y: -1e4, t: -1e4 };

    // Frame pacing: if frames run long, paint at 30 fps. Paced by time, not every
    // other frame, so a browser already capped at 30 (Chrome's battery saver)
    // still gets every frame instead of 15.
    let slow = 0;

    const paint = () => {
      if (!painter) return;
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = clock();
      ripples = ripples.filter((r) => t - r.t < RIPPLE_LIFE);
      velocity.x *= Math.exp(-dt / 0.12);
      velocity.y *= Math.exp(-dt / 0.12);
      scene.step(t, reduced ? 0 : dt, { pointer: reduced ? null : pointer, velocity });
      const built = scene.build(t);
      painter.render({ t, ripples, ...built });
    };
    const loop = () => {
      const now = performance.now();
      const gap = now - last;
      slow = gap > 22 ? Math.min(60, slow + 1) : Math.max(0, slow - 1);
      if (slow > 20 && gap < 29) return;
      paint();
    };

    const size = () => {
      const r = root.getBoundingClientRect();
      if (r.width < 1 || r.height < 1 || !painter) return;
      scene.resize(r.width, r.height);
      painter.resize(r.width, r.height, Math.min(window.devicePixelRatio || 1, 2));
      paint();
    };

    let running = false;
    const start = () => {
      if (running || reduced || !painter) return;
      running = true;
      tRun = performance.now();
      last = tRun;
      frame.render(loop, true);
    };
    const stop = () => {
      if (!running) return;
      running = false;
      tBase = clock();
      tRun = 0;
      cancelFrame(loop);
    };

    size();
    const ro = new ResizeObserver(size);
    ro.observe(root);
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { rootMargin: "120px 0px" });
    io.observe(root);

    const local = (e: PointerEvent) => {
      const r = root.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const ring = (p: { x: number; y: number }, strength: number) => {
      const t = clock();
      ripples = [...ripples, { x: p.x, y: p.y, t, strength }].slice(-6);
      lastRing = { ...p, t };
    };
    const onMove = (e: PointerEvent) => {
      if (reduced || e.pointerType !== "mouse") return;
      const p = local(e);
      const now = performance.now();
      if (pointer && now > lastMove.at) {
        const k = 1000 / Math.max(8, now - lastMove.at);
        velocity.x = velocity.x * 0.5 + (p.x - lastMove.x) * k * 0.5;
        velocity.y = velocity.y * 0.5 + (p.y - lastMove.y) * k * 0.5;
      }
      lastMove = { ...p, at: now };
      pointer = p;
      if (Math.hypot(p.x - lastRing.x, p.y - lastRing.y) > RIPPLE_GAP && clock() - lastRing.t > 0.14) ring(p, 0.7);
    };
    const onDown = (e: PointerEvent) => {
      if (reduced) return;
      const p = local(e);
      ring(p, 1.1);
      scene.poke(p.x, p.y, clock());
    };
    const onLeave = () => {
      pointer = null;
    };
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerdown", onDown);
    root.addEventListener("pointerleave", onLeave);

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("webglcontextlost", onLost);
      painter?.destroy();
    };
  }, []);

  return (
    <div className="pond" ref={ref} aria-hidden="true">
      <canvas />
    </div>
  );
}
