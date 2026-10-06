import { animate } from "motion";
import { ART, PH, framePieces, type Piece } from "./portraitFrame.js";

/* The frame under the About portrait, live. Every piece sits hidden under the
   photo; when the photo tilts up they bloom out on critically damped springs
   (no overshoot, no bounce back), tissue first, gold last, then drift gently
   while it stays open. Gold catches the light: a glint as it lands, then the
   cursor acts as a lamp. Positions are percentages of the photo, and the tuck
   is a percentage of each piece's own size, so it scales with the portrait. */

const PHOTO_GLIDE = { type: "spring", bounce: 0, duration: 0.7 } as const;

type Live = {
  p: Piece;
  el: HTMLElement;
  inner: HTMLElement;
  lit: HTMLElement | null;
  imgs: { el: HTMLImageElement; src: string }[];
  tucked: Record<string, number | string>;
  open: Record<string, number | string>;
};

const pct = (n: number) => `${+n.toFixed(3)}%`;

export function mountPortraitPop(fig: HTMLElement, photo: HTMLElement, reduced: boolean) {
  const layer = document.createElement("div");
  layer.className = "ab-pop";
  layer.setAttribute("aria-hidden", "true");
  fig.insertBefore(layer, fig.firstChild);

  const pieces: Live[] = framePieces().map((p) => {
    const el = document.createElement("div");
    el.className = `ab-pc ab-pc--${p.kind}`;
    Object.assign(el.style, {
      left: pct(p.x - p.w / 2),
      top: pct(((p.y - p.h / 2) / PH) * 100),
      width: pct(p.w),
      height: pct((p.h / PH) * 100),
      zIndex: String(p.z),
    });
    if (p.opacity && p.opacity < 1) el.style.opacity = String(p.opacity);
    const inner = document.createElement("div");
    inner.className = "ab-pc-in";
    el.appendChild(inner);
    const imgs: Live["imgs"] = [];
    const sprite = (name: string, cls: string) => {
      const img = document.createElement("img");
      img.className = cls;
      img.alt = "";
      img.decoding = "async";
      img.draggable = false;
      inner.appendChild(img);
      imgs.push({ el: img, src: `${ART}${name}.webp` });
      return img;
    };
    let lit: HTMLElement | null = null;
    if (p.kind === "curl") inner.innerHTML = p.svg!;
    else {
      sprite(p.s!, "rest");
      if (p.kind === "gold") lit = sprite(`${p.s}-lit`, "lit");
    }
    layer.appendChild(el);
    const t = p.tuck;
    const tucked = { x: pct(((t.x - p.x) / p.w) * 100), y: pct(((t.y - p.y) / p.h) * 100), rotate: t.r, scale: t.s };
    const open = { x: "0%", y: "0%", rotate: p.r, scale: 1 };
    animate(el, tucked, { duration: 0 });
    return { p, el, inner, lit, imgs, tucked, open };
  });

  // The sprites wait until the page has settled (or the first hover), so the
  // frame never competes with the manifesto and portrait for the first paint.
  let loaded = false;
  const load = () => {
    if (loaded) return;
    loaded = true;
    pieces.forEach((q) => q.imgs.forEach((i) => (i.el.src = i.src)));
  };
  const idle = window.setTimeout(load, 1600);

  let isOpen = false;
  let glintUntil = 0;
  let sways: { stop: () => void }[] = [];
  let swayTimer = 0;

  const startSway = () => {
    pieces.forEach((q, i) => {
      const amp = q.p.sway;
      const dur = 5.5 + ((i * 0.37) % 1.6);
      // null: start from wherever the piece is, so nothing snaps
      sways.push(animate(q.inner, { rotate: [null, amp * 1.6, 0, -amp * 1.6, 0], y: [null, -0.6, 0, 0.6, 0] },
        { duration: dur, repeat: Infinity, ease: "easeInOut", delay: (i % 5) * 0.11 }));
    });
  };
  const stopSway = () => {
    window.clearTimeout(swayTimer);
    sways.forEach((a) => a.stop());
    sways = [];
    pieces.forEach((q) => animate(q.inner, { rotate: 0, y: 0 }, { duration: 0.25 }));
  };

  const open = () => {
    if (isOpen) return;
    isOpen = true;
    load();
    if (reduced) {
      // no travel: the frame is simply there, faded in
      pieces.forEach((q) => animate(q.el, q.open, { duration: 0 }));
      animate(layer, { opacity: [0, 1] }, { duration: 0.25 });
      pieces.forEach((q) => q.lit && (q.lit.style.opacity = "0.35"));
      return;
    }
    // a gentler turn than the old -3deg: the glass now leans with the cursor too
    animate(photo, { rotate: -1.5, scale: 1.05, y: -6 }, PHOTO_GLIDE);
    pieces.forEach((q) => {
      animate(q.el, q.open, { type: "spring", bounce: 0, duration: q.p.dur, delay: q.p.delay });
      if (q.lit) animate(q.lit, { opacity: [0, 0.95, 0.35] }, { duration: 1.1, delay: q.p.delay + 0.12, times: [0, 0.35, 1] });
    });
    glintUntil = performance.now() + 1300;
    swayTimer = window.setTimeout(() => isOpen && startSway(), 900);
  };

  const close = () => {
    if (!isOpen) return;
    isOpen = false;
    if (reduced) {
      animate(layer, { opacity: 0 }, { duration: 0.2 }).finished.then(() => {
        if (isOpen) return;
        pieces.forEach((q) => animate(q.el, q.tucked, { duration: 0 }));
        layer.style.opacity = "";
      });
      return;
    }
    stopSway();
    animate(photo, { rotate: 0, scale: 1, y: 0 }, PHOTO_GLIDE);
    const n = pieces.length;
    pieces.forEach((q, i) =>
      animate(q.el, q.tucked, { type: "spring", bounce: 0, duration: 0.5, delay: (n - 1 - i) * 0.004 }));
    pieces.forEach((q) => q.lit && animate(q.lit, { opacity: 0 }, { duration: 0.2 }));
  };

  // the cursor is a lamp: gold nearest it flares
  const lamp = (e: PointerEvent) => {
    if (!isOpen || reduced || performance.now() < glintUntil) return;
    for (const q of pieces) {
      if (!q.lit) continue;
      const r = q.el.getBoundingClientRect();
      const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
      q.lit.style.opacity = (0.2 + 0.75 * Math.exp(-((d / 130) ** 2))).toFixed(3);
    }
  };
  fig.addEventListener("pointermove", lamp);

  return {
    open,
    close,
    get isOpen() {
      return isOpen;
    },
    destroy() {
      window.clearTimeout(idle);
      stopSway();
      fig.removeEventListener("pointermove", lamp);
      layer.remove();
    },
  };
}
