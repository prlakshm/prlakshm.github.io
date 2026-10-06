export type GoldSurface = { w: number; h: number };

export type GoldLamp = { x: number; y: number; on: number };
export type GoldLampTarget = GoldLamp & { k: number };

export type GoldShineFrame = [
  x: number,
  y: number,
  halfWidth: number,
  strength: number,
  dx: number,
  dy: number,
  reach: number,
];

type GoldShineOptions = {
  firstDelay: number;
  interval: [number, number];
  duration?: [number, number];
};

/* One light model for every gilded surface. The footer passes this frame to
   WebGL; the painted titles translate the same frame into CSS variables. */
export function createGoldShine({ firstDelay, interval, duration }: GoldShineOptions) {
  const shine = { start: 0, dur: 0, x: 0, y: 0, dx: 1, dy: 0, len: 0, on: false };
  let nextShine = firstDelay;

  const reset = (t = 0, delay = firstDelay) => {
    shine.on = false;
    nextShine = t + delay;
  };

  const sample = (t: number, size: GoldSurface): GoldShineFrame | undefined => {
    if (!shine.on && t >= nextShine && size.w > 0 && size.h > 0) {
      const leftToRight = Math.random() < 0.7;
      const angle = (Math.random() - 0.5) * 0.6;
      shine.len = Math.min(size.w * 0.5, 240 + Math.random() * 220);
      shine.dx = Math.cos(angle) * (leftToRight ? 1 : -1);
      shine.dy = Math.sin(angle);
      const lo = leftToRight ? 0.04 * size.w : 0.04 * size.w + shine.len;
      const hi = leftToRight ? 0.96 * size.w - shine.len : 0.96 * size.w;
      shine.x = lo + Math.random() * Math.max(0, hi - lo);
      shine.y = size.h * (0.3 + Math.random() * 0.4);
      shine.start = t;
      shine.dur = duration
        ? duration[0] + Math.random() * (duration[1] - duration[0])
        : shine.len / (230 + Math.random() * 70);
      shine.on = true;
    }

    if (!shine.on) return undefined;
    const q = (t - shine.start) / shine.dur;
    if (q >= 1) {
      shine.on = false;
      nextShine = t + interval[0] + Math.random() * (interval[1] - interval[0]);
      return undefined;
    }

    const eased = q * q * (3 - 2 * q);
    const fade = Math.min(1, q / 0.25) * Math.min(1, (1 - q) / 0.3);
    return [
      shine.x + shine.dx * shine.len * eased,
      shine.y + shine.dy * shine.len * eased,
      44,
      fade,
      shine.dx,
      shine.dy,
      size.h * 0.55,
    ];
  };

  return { reset, sample };
}

/* Exponential damping is frame-rate independent. Both title and footer lamps
   therefore pick up and release the pointer with the same physical feel. */
export function stepGoldLamp(lamp: GoldLamp, target: GoldLampTarget, dt: number) {
  const positionMix = 1 - Math.exp(-dt * target.k);
  lamp.x += (target.x - lamp.x) * positionMix;
  lamp.y += (target.y - lamp.y) * positionMix;
  lamp.on += (target.on - lamp.on) * (1 - Math.exp(-dt * 3));
}
