/* ==========================================================================
   Sunroom — dust.

   A few dozen motes drifting through the room. They are invisible until they
   wander into a shaft of light, where they catch it — which is the only
   reason anyone ever sees a sunbeam. Each is a point in the same 3D room as
   everything else, so a mote lights up exactly when it crosses a pane's light
   and goes dark in the shadow of a glazing bar.

   They are drawn near-white. On the bare page that is nothing at all; against
   the gold on the floor or the warmth of a shaft it is a glint, which is the
   only place dust ever shows.
   ========================================================================== */

import { DOOR, paneCols, paneRows, project, type Layout, type Span, type V3 } from "./scene.js";

interface Mote {
  p: V3;
  /** Phase offsets for its wander, and how big and bright it is. */
  a: number;
  b: number;
  size: number;
  glow: number;
}

const COUNT = 64;

const rand = (n: number) => {
  const s = Math.sin(n * 91.7 + 13.3) * 43758.5453;
  return s - Math.floor(s);
};

const within = (spans: Span[], v: number, soft: number) => {
  let best = 0;
  for (const [a, b] of spans) {
    const d = Math.min(v - a, b - v);
    best = Math.max(best, Math.min(1, Math.max(0, d / soft + 0.5)));
  }
  return best;
};

export interface Motes {
  resize(layout: Layout): void;
  /** `tint` is the colour of a glint, as 0–255 RGB. */
  render(time: number, sun: V3, intro: number, tint: [number, number, number]): void;
  clear(): void;
}

export function createMotes(canvas: HTMLCanvasElement): Motes | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const cols = paneCols();
  const rows = paneRows();
  const x0 = cols[0][0];
  const x1 = cols[cols.length - 1][1];
  const top = DOOR.height - DOOR.head;
  let layout: Layout | null = null;
  let dpr = 1;
  let reach = 7;

  const motes: Mote[] = [];
  for (let i = 0; i < COUNT; i++) {
    motes.push({
      p: [x0 + rand(i) * (x1 - x0), rand(i + 100), rand(i + 200)],
      a: rand(i + 300) * 6.28,
      b: rand(i + 400) * 6.28,
      size: 0.7 + rand(i + 500) * rand(i + 700) * 1.5,
      glow: 0.45 + rand(i + 600) * 0.55,
    });
  }

  return {
    resize(lay) {
      layout = lay;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(lay.width * dpr);
      const h = Math.round(lay.height * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      // as far into the room as the light gets, short of the eye
      reach = Math.min(lay.view.ez * 0.9, (top * Math.cos(lay.sun.azim)) / Math.tan(lay.sun.elev));
    },

    render(time, sun, intro, tint) {
      if (!layout) return;
      const v = layout.view;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, layout.width, layout.height);
      if (intro <= 0.02) return;
      const tanE = sun[1] / -sun[2];
      const tanA = sun[0] / sun[2];
      const [r, g, b] = tint;

      for (const m of motes) {
        // a slow wander on top of the seed position: rising a little in the
        // warm air by the doors, turning over, coming back down
        const z = (m.p[2] * 0.9 + 0.06 + 0.035 * Math.sin(time * 0.05 + m.a)) * reach;
        const x = m.p[0] + 0.1 * Math.sin(time * 0.11 + m.b) + tanA * z;
        const yTop = Math.max(0.05, top - z * tanE);
        const y = (0.08 + 0.84 * ((m.p[1] + time * 0.006 * (0.4 + m.glow)) % 1)) * yTop + 0.03 * Math.sin(time * 0.3 + m.a);

        // is it in a pane's light? follow the sun back to the wall
        const hx = x - tanA * z;
        const hy = y + z * tanE;
        const lit = within(cols, hx, 0.03) * within(rows, hy, 0.03);
        if (lit <= 0.01) continue;

        const [sx, sy] = project(v, [x, y, z]);
        if (sx < -20 || sx > layout.width + 20) continue;
        // nearer the eye a mote is larger, but it is still a mote
        const scale = Math.min(2.6, v.ez / Math.max(0.5, v.ez - z)) * 0.72;
        // twinkle as it turns
        const tw = 0.55 + 0.45 * Math.sin(time * (0.9 + m.glow) + m.a * 3);
        const alpha = lit * intro * tw * m.glow * Math.min(1, z / 0.8) * Math.min(1, (reach - z) / 1.2 + 0.25);
        if (alpha <= 0.01) continue;
        const rad = m.size * scale * layout.k;

        // a glint, and a soft bloom around it
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.globalAlpha = alpha * 0.22;
        ctx.beginPath();
        ctx.arc(sx, sy, rad * 3, 0, 6.2832);
        ctx.fill();
        ctx.globalAlpha = Math.min(1, alpha * 1.1);
        ctx.beginPath();
        ctx.arc(sx, sy, rad, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },

    clear() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
}
