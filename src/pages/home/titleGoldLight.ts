import { cancelFrame, frame } from "motion";
import { prefersReducedMotion } from "./interactions.js";
import { createGoldShine, stepGoldLamp } from "./goldLight.js";

type TitleGoldLightOptions = {
  firstDelay: number;
  interval: [number, number];
};

/* The clipped titles use the paintings' real gold masks in CSS. Their light is
   sampled from the same model as the footer; only the quieter title cadence is
   supplied here. */
export function mountTitleGoldLight(el: HTMLElement, options: TitleGoldLightOptions) {
  if (prefersReducedMotion()) return () => {};

  const autoLayer = el.querySelector<HTMLElement>("[class*='-gold--auto']");
  const pointerLayer = el.querySelector<HTMLElement>("[class*='-gold--pointer']");
  if (!autoLayer || !pointerLayer) return () => {};

  const shine = createGoldShine({ ...options, duration: [1.05, 1.45] });
  const lamp = { x: 0, y: 0, on: 0 };
  const idle = { x: 0, y: 0, on: 0.26, k: 1.1 };
  const pointerTarget = { x: 0, y: 0, on: 1, k: 7 };
  let pointer: { x: number; y: number } | null = null;
  let running = false;
  let started = 0;
  let last = 0;

  const paint = () => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const box = el.getBoundingClientRect();
    const t = (now - started) / 1000;
    idle.x = box.width * (0.5 + 0.34 * Math.sin((t * 2 * Math.PI) / 11));
    idle.y = box.height * (0.5 + 0.22 * Math.sin((t * 2 * Math.PI) / 15 + 0.9));
    if (pointer) {
      pointerTarget.x = pointer.x;
      pointerTarget.y = pointer.y;
    }
    const target = pointer ? pointerTarget : idle;
    stepGoldLamp(lamp, target, dt);

    const auto = shine.sample(t, { w: box.width, h: box.height });
    autoLayer.style.setProperty("--title-shine-a", `${auto?.[3] ?? 0}`);
    if (auto) {
      autoLayer.style.setProperty("--title-shine-x", `${auto[0]}px`);
      autoLayer.style.setProperty("--title-shine-y", `${auto[1]}px`);
      autoLayer.style.setProperty("--title-shine-w", `${auto[2]}px`);
      autoLayer.style.setProperty("--title-shine-reach", `${auto[6]}px`);
    }
    pointerLayer.style.setProperty("--title-light-x", `${lamp.x}px`);
    pointerLayer.style.setProperty("--title-light-y", `${lamp.y}px`);
    pointerLayer.style.setProperty("--title-light-a", `${lamp.on}`);
  };

  const start = () => {
    if (running) return;
    running = true;
    started = last = performance.now();
    const box = el.getBoundingClientRect();
    lamp.x = box.width * 0.5;
    lamp.y = box.height * 0.5;
    shine.reset(0);
    frame.render(paint, true);
  };
  const stop = () => {
    if (!running) return;
    running = false;
    cancelFrame(paint);
    autoLayer.style.setProperty("--title-shine-a", "0");
    pointerLayer.style.setProperty("--title-light-a", "0");
  };

  const place = (event: PointerEvent) => {
    const box = el.getBoundingClientRect();
    pointer = { x: event.clientX - box.left, y: event.clientY - box.top };
  };
  const enter = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    place(event);
  };
  const move = (event: PointerEvent) => {
    if (event.pointerType !== "touch") place(event);
  };
  const leave = () => {
    pointer = null;
  };

  const observer = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()), {
    rootMargin: "80px 0px",
  });
  observer.observe(el);
  el.addEventListener("pointerenter", enter);
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerleave", leave);

  return () => {
    observer.disconnect();
    stop();
    el.removeEventListener("pointerenter", enter);
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerleave", leave);
    ["--title-shine-x", "--title-shine-y", "--title-shine-w", "--title-shine-reach", "--title-shine-a"].forEach(
      (name) => autoLayer.style.removeProperty(name)
    );
    ["--title-light-x", "--title-light-y", "--title-light-a"].forEach((name) =>
      pointerLayer.style.removeProperty(name)
    );
  };
}
