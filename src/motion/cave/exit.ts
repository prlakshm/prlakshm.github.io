import {
  CAVE_KEY, CLOCK, EASE, PAPER, buildHole, buildLid, fallFor, fallFrames, farCorner, holeRadius, isThin, makeShape, releaseAt,
  type CaveHandoff, type Pt,
  PACE, markRunning, mode, outAt, tilts, watchFrames,
} from "./shape.js";
import { begin as beginTest } from "./test.js";

/* THE CAVE-IN, first half: the page being left falls into the hole.

   The page is not rebuilt or cloned. A same-document view transition takes a
   picture of every piece of it that is on screen (each image, card, line of
   text: anything given a view-transition-name is lifted out as its own flat
   layer above the page), and those pictures are what fall. That is the web's
   version of slicing the page image up in Figma, and it sidesteps everything
   that makes moving the real elements unreliable on an arbitrary page
   (clipping ancestors, stacking order, transforms something else owns).

   Under the falling pictures is the live page with those pieces hidden, plus
   one layer: the cracks, the hole, and the cool white that washes in last, so
   what is left on screen at the end is exactly what Everything draws first.
   The shards of page over the hole are pictures too (new ones), which puts
   them above the pieces: they cover whatever lay over the hole, then tip in.

   When the last piece is in, the hole's place and shape are handed to
   Everything through sessionStorage and the browser navigates. */

type VT = { ready: Promise<void>; finished: Promise<void>; updateCallbackDone: Promise<void>; skipTransition(): void };
type Piece = { el: HTMLElement | SVGElement; rect: DOMRect; text: boolean; was: { name: string; vis: string; display: string; op: string; opP: string } };

const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "LINK", "META", "HEAD", "BR", "WBR", "TITLE"]);
const MEDIA = new Set(["IMG", "VIDEO", "CANVAS", "SVG", "PICTURE", "IFRAME", "OBJECT", "EMBED"]);
const MAX_PIECES = 110;

const alpha = (color: string) => {
  if (!color || color === "transparent") return 0;
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (!m) return 1;
  const parts = m[1].split(/[\s,/]+/).filter(Boolean);
  return parts.length >= 4 ? parseFloat(parts[3]) * (parts[3].endsWith("%") ? 0.01 : 1) : 1;
};

/* does the element draw anything itself (a card, a panel, a plate)? */
const painted = (cs: CSSStyleDeclaration) =>
  cs.backgroundImage !== "none" ||
  alpha(cs.backgroundColor) > 0.03 ||
  cs.boxShadow !== "none" ||
  (["Top", "Bottom", "Left"] as const).some(
    (side) => parseFloat(cs[`border${side}Width`]) > 0 && cs[`border${side}Style`] !== "none" && alpha(cs[`border${side}Color`]) > 0.03,
  );

const inlineLevel = (el: Element) => getComputedStyle(el).display.startsWith("inline") || el.tagName === "BR";

/* The pieces: what a person would call the things on the page. Walks down
   from <body> and stops at the first element that is a thing in itself:
     - an image, video, canvas or svg;
     - a run of text (a block whose children are all inline);
     - anything that paints its own box and is no bigger than half the window
       (a card with all it holds).
   A bigger painted box that is mostly on screen is taken too, as a plate
   under its own pieces. Only what is on screen counts. */
function collect(): Piece[] {
  const vw = window.innerWidth, vh = window.innerHeight, A = vw * vh;
  const out: Piece[] = [];
  const add = (el: Element, rect: DOMRect, text: boolean) => {
    const node = el as HTMLElement | SVGElement;
    out.push({ el: node, rect, text, was: { name: node.style.getPropertyValue("view-transition-name"), vis: node.style.visibility, display: node.style.display, op: node.style.getPropertyValue("opacity"), opP: node.style.getPropertyPriority("opacity") } });
  };
  const walk = (el: Element) => {
    const tag = el.tagName.toUpperCase();
    if (SKIP.has(tag) || el.classList.contains("cave-layer") || el.id === "gx-cave-test") return;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) < 0.03) return;
    const kids = Array.from(el.children);
    if (cs.display === "contents") return kids.forEach(walk);
    const r = el.getBoundingClientRect();
    const seen = r.width > 1 && r.height > 1 && r.right > 0 && r.bottom > 0 && r.left < vw && r.top < vh;
    if (MEDIA.has(tag)) {
      if (seen) add(el, r, false);
      return;
    }
    // things that are one object whatever they are built from: anything marked
    // data-cave="piece", the nav's star card, and an icon link or button
    // (a gear and its glyph are one tile)
    const whole = el.matches('[data-cave="piece"], .bc') || ((tag === "A" || tag === "BUTTON") && (el.textContent ?? "").trim() === "" && kids.length > 0);
    if (whole) {
      if (seen) add(el, r, false);
      return;
    }
    const ownText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent ?? "").trim() !== "");
    const isText = (ownText || (kids.length > 0 && kids.every(inlineLevel))) && (el.textContent ?? "").trim() !== "";
    if (isText && (ownText || kids.every(inlineLevel))) {
      // a bare inline run can't be lifted out on its own; a one-line one can be made a box
      if (seen && (cs.display !== "inline" || el.getClientRects().length === 1)) add(el, r, true);
      return;
    }
    if (seen && painted(cs)) {
      const area = r.width * r.height;
      if (area <= A * 0.5) return add(el, r, false);
      const onScreen = (Math.min(r.right, vw) - Math.max(r.left, 0)) * (Math.min(r.bottom, vh) - Math.max(r.top, 0));
      if (onScreen / area >= 0.6) add(el, r, false);
    }
    kids.forEach(walk);
  };
  // from <body>'s children down: <body> itself is never a piece (the hole's
  // own layer lives in it; on a page that fits the window it would qualify)
  if (document.body) Array.from(document.body.children).forEach(walk);
  if (out.length <= MAX_PIECES) return out;
  // far too busy a screen: the smallest runs of text stay behind (they wash out)
  const keep = new Set([...out].sort((a, b) => b.rect.width * b.rect.height - a.rect.width * a.rect.height).slice(0, MAX_PIECES));
  return out.filter((p) => keep.has(p));
}

/* for checking what a page breaks into: import("/src/motion/cave/exit.ts").then(m => m.listPieces()) */
export const listPieces = () =>
  collect().map((p) => ({ tag: p.el.tagName.toLowerCase(), cls: String(p.el.getAttribute("class") ?? "").slice(0, 40), text: p.text, x: Math.round(p.rect.left), y: Math.round(p.rect.top), w: Math.round(p.rect.width), h: Math.round(p.rect.height) }));

const STYLE_ID = "cave-vt-style";
function styleOnce() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  /* Every layer of the transition stays exactly where and as it was: the only
     motion is what exit.ts starts. (By default old and new cross-fade and are
     added together; the page under the pieces must just sit there.) */
  style.textContent = `
html.cave-run::view-transition-group(*),
html.cave-run::view-transition-old(*),
html.cave-run::view-transition-new(*) { animation: none !important; mix-blend-mode: normal; }
html.cave-run::view-transition-image-pair(*) { isolation: auto; }
/* a frosted panel (the phone menu) hands its backdrop-filter to its layer's box, which stays behind when the panel falls */
html.cave-run::view-transition-group(*) { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
html.cave-run::view-transition-old(root) { display: none; }
.cave-layer { position: fixed; inset: 0; z-index: 2147483000; pointer-events: none; overflow: hidden; contain: strict; }
`;
  document.head.appendChild(style);
}

let live: { layer: HTMLElement; pieces: Piece[]; unlock: () => void } | null = null;

/* Back to how the page was (it is shown again if the visitor comes Back). */
export function restore() {
  if (!live) return;
  live.unlock();
  live.layer.remove();
  live.pieces.forEach((p) => {
    p.el.style.setProperty("view-transition-name", p.was.name);
    p.el.style.visibility = p.was.vis;
    p.el.style.display = p.was.display;
    p.el.style.setProperty("opacity", p.was.op, p.was.opP);
  });
  document.documentElement.classList.remove("cave-run");
  live = null;
}

export async function caveOut(url: string): Promise<void> {
  const root = document.documentElement;
  const go = () => {
    (window as unknown as { __caveGo?: boolean }).__caveGo = true;
    window.location.assign(url);
  };
  const start = (document as unknown as { startViewTransition?: (cb: () => void) => VT }).startViewTransition;
  if (!start || live) return go();

  const slow = parseFloat(new URLSearchParams(window.location.search).get("slow") ?? "") || 1;
  // the opening runs on its own, quicker pace; what follows is placed with when()
  const ms = (seconds: number) => seconds * 1000 * slow * PACE;
  const when = (t: number) => outAt(t) * slow, span = (t0: number, d: number) => when(t0 + d) - when(t0);
  const w = window.innerWidth, h = window.innerHeight;
  const navBottom = Math.max(56, document.querySelector<HTMLElement>(".wt-nav")?.offsetHeight ?? 78);
  let hole = { x: w * 0.46, y: h * 0.53 };
  try {
    hole = (await import("./target.js")).holeAt(w, h, navBottom);
  } catch {
    /* the rough middle will do: Everything slides the hole onto the bagel */
  }
  // on whole pixels: the two pages draw the hole in different kinds of layer,
  // and off the pixel grid they would not come out identical at the cut
  const hx = Math.round(hole.x), hy = Math.round(hole.y);
  const R = holeRadius(w, h), seed = 11, shape = makeShape(R, seed);
  const rim = shape.rim.map((p): Pt => [hx + p[0], hy + p[1]]);
  const rimMax = Math.max(...shape.rim.map((p) => Math.hypot(p[0], p[1])));
  const inRim = (x: number, y: number) => {
    let c = false;
    for (let i = 0, j = rim.length - 1; i < rim.length; j = i++) {
      const a = rim[i], b = rim[j];
      if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  };

  styleOnce();
  // (a lighter load where the pictures are costlier: phones draw at 3x)
  let pieces = collect();
  if (mode() !== "deep" && pieces.length > 70) {
    const keep = new Set([...pieces].sort((a, b) => b.rect.width * b.rect.height - a.rect.width * a.rect.height).slice(0, 70));
    pieces = pieces.filter((p) => keep.has(p));
  }
  if (!pieces.length) return go();
  markRunning(true);
  const endTest = beginTest("fall in");
  const judged = watchFrames(); // (a desktop that can't keep up gets the lighter one next time)

  // the layer under the falling pieces: cool white (washes in), cracks, hole, shards
  const layer = document.createElement("div");
  layer.className = "cave-layer";
  layer.setAttribute("aria-hidden", "true");
  const ground = document.createElement("div");
  ground.style.cssText = `position:absolute;inset:0;background:${PAPER};opacity:0`;
  const at = document.createElement("div");
  at.style.cssText = `position:absolute;left:${hx.toFixed(1)}px;top:${hy.toFixed(1)}px;width:0;height:0`;
  const built = buildHole(shape);
  at.appendChild(built.svg);
  const lids = shape.lids.map((lid, k) => {
    const el = buildLid(shape, lid);
    el.style.setProperty("view-transition-name", `cave-lid-${k}`);
    at.appendChild(el);
    return el;
  });
  layer.append(ground, at);

  // Everything's document, fetched while the page falls, so the cut is short
  fetch(url, { priority: "low" } as RequestInit).catch(() => {});

  // nothing scrolls while the page is in pieces; a second press (or Escape)
  // means "just take me there": the rest is skipped
  const block = (e: Event) => e.preventDefault();
  const began = performance.now();
  const hurry = () => {
    if (performance.now() - began > 350) vt?.skipTransition();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") vt?.skipTransition();
    else e.preventDefault();
  };
  window.addEventListener("wheel", block, { passive: false, capture: true });
  window.addEventListener("touchmove", block, { passive: false, capture: true });
  window.addEventListener("keydown", onKey, true);
  window.addEventListener("pointerdown", hurry, true);
  const unlock = () => {
    window.removeEventListener("pointerdown", hurry, true);
    window.removeEventListener("wheel", block, { capture: true });
    window.removeEventListener("touchmove", block, { capture: true });
    window.removeEventListener("keydown", onKey, true);
  };

  pieces.forEach((p, i) => {
    if (getComputedStyle(p.el).display === "inline") p.el.style.display = "inline-block";
    p.el.style.setProperty("view-transition-name", `cave-p-${i}`);
  });
  root.classList.add("cave-run");
  live = { layer, pieces, unlock };

  let vt: VT | null = null;
  try {
    vt = start.call(document, () => {
      pieces.forEach((p) => {
        // gone from the page underneath: hidden, and see-through too, since a
        // child can opt back in to being visible (the star card's light does)
        p.el.style.visibility = "hidden";
        p.el.style.setProperty("opacity", "0", "important");
        p.el.style.setProperty("view-transition-name", "none");
      });
      document.body.appendChild(layer);
    });
  } catch {
    restore();
    return go();
  }
  const run = vt as VT;
  [run.ready, run.finished, run.updateCallbackDone].forEach((p) => p.catch(() => {}));

  const handOff = () => {
    markRunning(false); // this half ran to the end (shape.ts: the safety switch)
    endTest();
    judged();
    lids.forEach((l) => l.remove());
    const svg =
      `<div style="position:absolute;inset:0;background:${PAPER}"></div>` +
      `<div style="position:absolute;left:${hx.toFixed(1)}px;top:${hy.toFixed(1)}px;width:0;height:0">${built.svg.outerHTML}</div>`;
    const note: CaveHandoff = { at: Date.now(), hx, hy, R, seed, w, h, svg };
    try {
      sessionStorage.setItem(CAVE_KEY, JSON.stringify(note));
    } catch {
      /* private mode: Everything plays its usual entrance instead */
    }
    ground.style.opacity = "1";
    go();
  };

  try {
    await run.ready;
  } catch {
    // the browser couldn't take the pictures (a duplicate name, a hidden tab): just go
    restore();
    return go();
  }

  const far = Math.max(1, ...pieces.map((p) => farCorner(p.rect, hx, hy)));
  let last = 0;
  const onPseudo = (pseudo: string, frames: Keyframe[], timing: KeyframeAnimationOptions) =>
    root.animate(frames, { pseudoElement: pseudo, easing: "linear", fill: "both", ...timing });

  pieces.forEach((p, i) => {
    const r = p.rect, old = `::view-transition-old(cave-p-${i})`;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const corners: Pt[] = [[r.left, r.top], [r.right, r.top], [r.left, r.bottom], [r.right, r.bottom], [cx, cy]];
    const near = Math.hypot(Math.max(r.left - hx, 0, hx - r.right), Math.max(r.top - hy, 0, hy - r.bottom));
    // the page over the hole belongs to the shards: what lies wholly inside
    // goes with them, and anything reaching over the hole is cut at the rim
    if (near < rimMax && corners.every((c) => inRim(c[0], c[1]))) {
      onPseudo(old, [{ opacity: 1 }, { opacity: 1, offset: 0.99 }, { opacity: 0 }], { duration: ms(CLOCK.crack) });
      return;
    }
    if (near < rimMax) {
      const cut =
        `M-200 -200H${(r.width + 200).toFixed(0)}V${(r.height + 200).toFixed(0)}H-200Z M` +
        rim.map((q) => `${(q[0] - r.left).toFixed(1)} ${(q[1] - r.top).toFixed(1)}`).join("L") + "Z";
      const clipPath = `path(evenodd, "${cut}")`;
      onPseudo(old, [{ clipPath }, { clipPath }], { duration: 1, delay: ms(CLOCK.crack), fill: "forwards" });
    }
    // a piece lets go once the collapse has passed all of it (its farthest
    // corner); one that reaches over the hole has nothing under it and goes
    // by its middle, or it would hang over the pit with a bite out of it
    const d = (near < rimMax ? Math.min(farCorner(r, hx, hy), Math.hypot(cx - hx, cy - hy)) : farCorner(r, hx, hy)) / far;
    const t0 = releaseAt(d), D = fallFor(d);
    last = Math.max(last, t0 + D);
    onPseudo(old, fallFrames(cx - hx, cy - hy, R, { flat: isThin(r.width, r.height, p.text), w: r.width, h: r.height, dur: D }), { duration: span(t0, D), delay: when(t0) });
  });

  // the shards of page over the hole: there as the cracks snap in, sagging,
  // then tipping in one after another
  const s = R / 115;
  shape.lids.forEach((lid, k) => {
    const t0 = CLOCK.lidFall + k * CLOCK.lidStep, total = t0 + CLOCK.lidDur, at0 = (t: number) => t / total;
    const g0 = Math.atan2(-lid.c[1], -lid.c[0]), ax = (-Math.sin(g0)).toFixed(3), ay = Math.cos(g0).toFixed(3);
    const deep = tilts();
    const pose = (share: number, tilt: number, spin: number, scale: number, drop = 0) =>
      `translate(${(-lid.c[0] * share).toFixed(1)}px, ${(-lid.c[1] * share + drop).toFixed(1)}px) ` +
      (deep ? `perspective(520px) rotate3d(${ax}, ${ay}, 0, ${tilt}deg) ` : "") +
      `rotate(${spin.toFixed(1)}deg) scale(${scale})`;
    /* Once a shard is in, the real one under its picture goes see-through.
       What falls is its picture; the real shard sits under it, flat over
       the hole, and the moment the transition ends the real page is what
       shows. Safari paints that page once before letting go of it for the
       next one, so left as they were the shards covered the hole again for
       the length of the load. (See-through, not removed: taking a pictured
       element out of the page ends the transition on the spot.) */
    lids[k].animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1, delay: ms(total), fill: "forwards" });
    onPseudo(
      `::view-transition-new(cave-lid-${k})`,
      [
        { offset: 0, opacity: 0, transform: pose(0, 0, 0, 1) },
        { offset: at0(Math.max(0, CLOCK.crack - 0.08)), opacity: 0, transform: pose(0, 0, 0, 1) },
        { offset: at0(CLOCK.crack), opacity: 1, transform: pose(0, 0, 0, 1) },
        { offset: at0(CLOCK.crack), opacity: 1, transform: pose(0.05, 9, 0, 1) },
        { offset: at0(t0), opacity: 1, transform: pose(0.05, 9, 0, 1), easing: EASE.acc },
        { offset: at0(t0 + CLOCK.lidDur * 0.55), opacity: 1 },
        { offset: 1, opacity: 0, transform: pose(0.8, 82, lid.spin, 0.1, 10 * s) },
      ],
      { duration: ms(total) },
    );
  });

  // the hole and its cracks are real elements in the page underneath
  const T1 = CLOCK.thump[1];
  built.body.animate(
    [
      { offset: 0, opacity: 0, transform: "scale(1)" },
      { offset: CLOCK.crack / T1, opacity: 0, transform: "scale(1)" },
      { offset: CLOCK.crack / T1, opacity: 1, transform: "scale(1)" },
      { offset: CLOCK.thump[0] / T1, opacity: 1, transform: "scale(1)" },
      { offset: CLOCK.thump[0] / T1, opacity: 1, transform: "scale(1.04)" },
      { offset: 0.999, opacity: 1, transform: "scale(1.04)" },
      { offset: 1, opacity: 1, transform: "scale(1)" },
    ],
    { duration: ms(T1), fill: "backwards" },
  );
  // each crack snaps out of the rim in three jumps
  built.cracks.forEach((c) => {
    const total = c.at + 0.15, o = (t: number) => t / total, jump = "steps(1, end)";
    c.el.animate(
      [
        { offset: 0, opacity: 0, transform: "scale(0.01)" },
        { offset: o(c.at), opacity: 0, transform: "scale(0.01)" },
        { offset: o(c.at), opacity: 1, transform: "scale(0.01)", easing: jump },
        { offset: o(c.at + 0.05), opacity: 1, transform: "scale(0.4)", easing: jump },
        { offset: o(c.at + 0.1), opacity: 1, transform: "scale(0.74)", easing: jump },
        { offset: 1, opacity: 1, transform: "scale(1)" },
      ],
      { duration: ms(total), fill: "backwards" },
    );
  });
  // what was not a piece (a page's own tint, a backing) washes to the cool
  // white Everything starts from, behind the last pieces as they go
  ground.animate([{ opacity: 0 }, { opacity: 1 }], { duration: span(0.73, Math.max(0.6, last - 0.93)), delay: when(0.73), easing: "ease-in-out", fill: "both" });

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    window.clearTimeout(backstop);
    handOff();
  };
  // if the transition never reports back (a backgrounded tab), go anyway
  const backstop = window.setTimeout(finish, when(last) + 1500);
  run.finished.then(finish, finish);
}
