import { animate } from "motion";

/* Tissue-paper confetti.

   Streamers, triangles, dots and squares cut from thin coloured tissue: a
   little see-through (multiply, so overlaps darken the way real tissue does),
   with a fibre grain on top, fluttering because each piece turns in 3D as it
   falls. Palette from the "playing with type" reference plus a baby blue. */

const COLORS = ["#c090f0", "#c0e460", "#e45478", "#f49a62", "#f2dc52", "#a9d8ff", "#b9c8d2"];

type Shape = "streamer" | "triangle" | "dot" | "square" | "ribbon";
const SHAPES: Shape[] = ["streamer", "streamer", "triangle", "triangle", "dot", "square", "ribbon"];

let layer: HTMLDivElement | null = null;
const getLayer = () => {
  if (layer && document.body.contains(layer)) return layer;
  layer = document.createElement("div");
  layer.className = "tissue-layer";
  layer.setAttribute("aria-hidden", "true");
  document.body.appendChild(layer);
  return layer;
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export function tissueBurst(from: DOMRect, count = 46) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const host = getLayer();
  const cx = from.left + from.width / 2;
  const cy = from.top + from.height * 0.38;

  for (let i = 0; i < count; i++) {
    const piece = document.createElement("span");
    const shape = SHAPES[i % SHAPES.length];
    piece.className = `tissue tissue--${shape}`;
    const size = rand(10, 20);
    const w = shape === "streamer" ? size * 0.42 : shape === "ribbon" ? size * 1.9 : size;
    const h = shape === "streamer" ? size * 2.8 : shape === "ribbon" ? size * 0.5 : size;
    piece.style.width = `${w}px`;
    piece.style.height = `${h}px`;
    piece.style.background = COLORS[(i * 3 + Math.floor(rand(0, 7))) % COLORS.length];
    // Start somewhere across the photo, not one point — it bursts out of it.
    const sx = cx + rand(-from.width * 0.35, from.width * 0.35);
    const sy = cy + rand(-from.height * 0.25, from.height * 0.2);
    piece.style.left = `${sx - w / 2}px`;
    piece.style.top = `${sy - h / 2}px`;
    host.appendChild(piece);

    const angle = Math.atan2(sy - cy, sx - cx) + rand(-0.6, 0.6);
    const power = rand(150, 340);
    const dx = Math.cos(angle) * power;
    const lift = Math.sin(angle) * power - rand(120, 220);
    const fall = rand(260, 520);
    const spin = rand(-540, 540);
    const duration = rand(1.9, 2.8);

    animate(
      piece,
      {
        x: [0, dx * 0.85, dx + rand(-50, 50)],
        y: [0, lift, lift + fall],
        rotate: [rand(-40, 40), spin * 0.6, spin],
        rotateX: [0, rand(180, 540)],
        rotateY: [0, rand(-360, 360)],
        opacity: [0, 0.86, 0.86, 0],
        scale: [0.4, 1, 1, 0.9],
      },
      {
        duration,
        ease: [0.16, 0.7, 0.3, 1],
        times: [0, 0.32, 1],
        opacity: { duration, times: [0, 0.08, 0.72, 1] },
        scale: { duration, times: [0, 0.15, 0.8, 1] },
        rotateX: { duration, ease: "linear" },
        rotateY: { duration, ease: "linear" },
      }
    )
      .finished.then(() => piece.remove())
      .catch(() => piece.remove());
  }
}
