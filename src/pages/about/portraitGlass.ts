import { animate, frame, motionValue } from "motion";

/* The About portrait as a pane of glass, as the gallery's posters are
   (PosterGallery.tsx): on hover it leans toward the cursor in 3D, a soft pool of
   light follows the cursor, and a band of light sweeps across as it tilts. Its own
   element (.ab-glass) carries the lean, so the celebration's lift on the pane
   around it (portraitPop.ts) never fights it. */

const TILT = 7; // deg at the edge
const LEAN = { type: "spring", stiffness: 170, damping: 22, mass: 0.7 } as const;
const GLOW_IN = { duration: 0.45, ease: [0.22, 0.61, 0.36, 1] } as const;
const GLOW_OUT = { duration: 0.6, ease: [0.22, 0.61, 0.36, 1] } as const;
const fmt = (n: number) => Math.round(n * 1000) / 1000;

export function mountPortraitGlass(fig: HTMLElement, glass: HTMLElement, reduced: boolean) {
  const glare = glass.querySelector<HTMLElement>(".ab-glare");
  const sheen = glass.querySelector<HTMLElement>(".ab-sheen");
  const px = motionValue(0), py = motionValue(0), glow = motionValue(0);
  let lit = false;

  const render = () => {
    const x = px.get(), y = py.get(), g = Math.min(1, Math.max(0, glow.get()));
    glass.style.transform =
      x === 0 && y === 0 ? "" : `perspective(900px) rotateX(${fmt(-y * 2 * TILT * 0.8)}deg) rotateY(${fmt(x * 2 * TILT)}deg)`;
    if (glare) {
      glare.style.transform = `translate3d(${fmt(x * 50)}%, ${fmt(y * 50)}%, 0)`;
      glare.style.opacity = `${fmt(g)}`;
    }
    if (sheen) {
      const at = 1.2 - (0.7 + 0.8 * x) * g;
      sheen.style.transform = `translate3d(${fmt(-60 * at)}%, 0, 0)`;
      sheen.style.opacity = `${fmt(0.4 * g)}`; // a visible band, never a wash
    }
  };
  const subs = [px, py, glow].map((v) => v.on("change", () => frame.render(render)));

  return {
    /** the cursor, in client px */
    aim(cx: number, cy: number) {
      const r = fig.getBoundingClientRect();
      const x = Math.max(-0.5, Math.min(0.5, (cx - r.left) / r.width - 0.5));
      const y = Math.max(-0.5, Math.min(0.5, (cy - r.top) / r.height - 0.5));
      if (!lit) {
        lit = true;
        if (glow.get() < 0.02) {
          px.jump(reduced ? 0 : x);
          py.jump(reduced ? 0 : y);
        }
        animate(glow, 1, reduced ? { duration: 0 } : GLOW_IN);
      }
      if (reduced) return;
      animate(px, x, LEAN);
      animate(py, y, LEAN);
    },
    leave() {
      lit = false;
      animate(glow, 0, reduced ? { duration: 0 } : GLOW_OUT);
      if (!reduced) {
        animate(px, 0, LEAN);
        animate(py, 0, LEAN);
      }
    },
    destroy() {
      subs.forEach((u) => u());
      [px, py, glow].forEach((v) => v.stop());
    },
  };
}
