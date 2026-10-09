/// <reference types="vite/client" />
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { animate } from "motion";
import "../../styles/tokens.css";
import "../home/home.css";
import "./gallery.css";
import WtNav from "../home/WtNav.js";
import { prefersReducedMotion } from "../home/interactions.js";
import { earn } from "../../components/badges/badgeStore.js";
import { BAGEL, PIECES, applyLayout, pieceBounds, type Layout, type Piece } from "./clusters.js";
import SAVED from "./layout.json";
import Sheet from "./Sheet.js";

/* GALLERY: everything else, laid out on one infinite canvas, Figma-style.

   One camera ({x, y, z}: screen = world * z + (x, y)) moves a single world
   layer with one transform, and the dot ground follows it by changing only
   its background size and offset, so the dots read as the canvas itself.
   The everything bagel sits in the middle with the work around it; it is part
   of the canvas (it can't be picked up), it shouts its line when the page
   opens, and resting on it earns the "Find my bagel" star. Loops play only
   while they are on screen and big enough to see.

   Like a Figma file: click a piece to select it (a grey selection box with
   its name above the top-left corner), shift-click to add or remove pieces,
   drag to pick up everything selected and move it, drag a corner handle to
   resize one piece (proportions locked, the opposite corner stays put).
   Shift + drag on the ground draws a selection box. Grey dotted guides show
   while you move or resize something (alt to move freely).
   Pan: drag the ground, scroll or arrow keys. Zoom: pinch, ctrl/⌘ + scroll,
   + / −. It opens fitted to everything; 0 fits again, 1 is a bagel close-up.

   Arranging (localhost only): every move is saved into layout.json, Delete
   removes the selected pieces, ⌘Z undoes. On the live site visitors can still
   pick pieces up and move them; nothing they do is kept. */

const Z_MIN = 0.03;
const Z_MAX = 4;
const DOT_STEP = 24; // world px between dots at 100%
const DRAG_SLOP = 3; // screen px before a press becomes a drag
const DEV = import.meta.env.DEV;
// localhost only: /gallery/#sheet is the contact sheet for renaming pieces
const SHEET = DEV && typeof location !== "undefined" && location.hash === "#sheet";

type Camera = { x: number; y: number; z: number };

export default function Gallery() {
  const viewRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const selRef = useRef<HTMLDivElement>(null);
  const bagelTap = useRef<() => void>(() => {});
  // the page opens fitted to everything; until the visitor moves the camera,
  // a layout that arrives late (dev reads the file fresh) is fitted again
  const fitRef = useRef<() => void>(() => {});
  const touched = useRef(false);
  const ioRef = useRef<IntersectionObserver | null>(null);
  const bagelCheck = useRef<(x: number, y: number) => void>(() => {});
  const [layout, setLayout] = useState<Layout>(SAVED as Layout);
  const [selected, setSelected] = useState<string[]>([]);
  const pieces = useMemo(() => applyLayout(PIECES, layout), [layout]);
  const [sheet, setSheet] = useState(SHEET);
  useEffect(() => {
    if (!DEV) return;
    const onHash = () => setSheet(location.hash === "#sheet");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // the effect below is mounted once; it reads the latest state through refs
  const live = useRef({ pieces, layout, selected });
  live.current = { pieces, layout, selected };
  const history = useRef<Layout[]>([]);

  const commit = (next: Layout) => {
    history.current.push(live.current.layout);
    if (history.current.length > 100) history.current.shift();
    setLayout(next);
    if (DEV) save(next);
  };

  // dev: read the file fresh (the bundled copy may be older than the last
  // save), and again whenever the tab comes back into focus, so an edit made
  // to layout.json elsewhere is picked up before the next save would write
  // this tab's older copy over it
  useEffect(() => {
    if (!DEV) return;
    const pull = () => {
      // a save still on its way (or one sent after this read began) is newer
      // than whatever the read brings back, so the read is dropped
      if (saving.n) return;
      const asked = saving.sent;
      fetch("/__gallery/layout", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((l: Layout | null) => {
          if (!l || saving.n || saving.sent !== asked) return;
          if (JSON.stringify(l) !== JSON.stringify(live.current.layout)) setLayout(l);
        })
        .catch(() => {});
    };
    pull();
    const onFocus = () => document.visibilityState === "visible" && pull();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    const world = worldRef.current;
    if (!view || !world) return;
    const cam: Camera = { x: 0, y: 0, z: 1 };
    let frame = 0;

    const paint = () => {
      frame = 0;
      world.style.transform = `translate3d(${cam.x}px, ${cam.y}px, 0) scale(${cam.z})`;
      // Dots stay a comfortable distance apart at every zoom: zoomed out,
      // every other row drops away (like Figma's grid), so the ground never
      // turns to grey noise.
      let step = DOT_STEP * cam.z;
      while (step < 14) step *= 2;
      while (step > 56) step /= 2;
      view.style.backgroundSize = `${step}px ${step}px`;
      view.style.backgroundPosition = `${cam.x % step}px ${cam.y % step}px`;
      view.style.setProperty("--gx-zoom", String(cam.z));
      syncVideos();
      if (lastPointer) bagelCheck.current(lastPointer.x, lastPointer.y);
    };
    let lastPointer: { x: number; y: number } | null = null;
    const track = (e: PointerEvent) => { if (e.pointerType === "mouse") lastPointer = { x: e.clientX, y: e.clientY }; };
    /* Loops play whenever they're on screen (not just zoomed in), so the
       canvas is alive from the first view. To keep that light, each one plays
       a small copy (~360px) while it's small on screen; once it's shown big
       enough to need it, a full-resolution layer is laid on top, started at
       the same moment of the loop and revealed only once it's there, so the
       swap can't be seen. Zooming back out drops back to the small copy.
       Off screen, in a hidden tab, or with reduced motion: paused. */
    const onScreen = new Set<HTMLVideoElement>();
    const dpr = () => Math.min(2, window.devicePixelRatio || 1);
    const UP = 560, DOWN = 400; // device px across: switch up / back (a gap, so it never flickers)
    const fullOf = (v: HTMLVideoElement) => v.parentElement?.querySelector<HTMLVideoElement>("video.gx-full") ?? null;
    const showFull = (v: HTMLVideoElement, on: boolean, play: boolean) => {
      const url = v.dataset.full;
      if (!url) return;
      let f = fullOf(v);
      if (on) {
        if (!f) {
          f = document.createElement("video");
          f.className = "gx-full";
          f.muted = true;
          f.loop = true;
          f.playsInline = true;
          f.preload = "auto";
          f.setAttribute("aria-hidden", "true");
          f.src = url;
          v.parentElement!.appendChild(f);
        }
        if (f.dataset.state === "on" || f.dataset.state === "coming") return;
        f.dataset.state = "coming";
        const ff = f;
        const reveal = () => {
          if (ff.dataset.state !== "coming") return;
          ff.dataset.state = "on";
          ff.style.opacity = "1";
          v.pause();
        };
        const sync = () => {
          try { ff.currentTime = v.currentTime % (ff.duration || 1); } catch { /* not seekable yet */ }
          ff.addEventListener("seeked", () => { if (play) ff.play().then(reveal, reveal); else reveal(); }, { once: true });
        };
        if (ff.readyState >= 1) sync();
        else ff.addEventListener("loadedmetadata", sync, { once: true });
      } else if (f && f.dataset.state !== "off") {
        f.dataset.state = "off";
        try { v.currentTime = f.currentTime % (v.duration || 1); } catch { /* fine */ }
        if (play) v.play().catch(() => {});
        f.style.opacity = "0";
        f.pause();
      }
    };
    const syncVideos = () => {
      const moving = !document.hidden && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      world.querySelectorAll<HTMLVideoElement>("video:not(.gx-full)").forEach((v) => {
        const play = moving && onScreen.has(v);
        const across = (v.parentElement?.offsetWidth ?? 0) * cam.z * dpr();
        const big = fullOf(v)?.dataset.state;
        const wantFull = !!v.dataset.full && play && (big === "on" || big === "coming" ? across > DOWN : across > UP);
        showFull(v, wantFull, play);
        const f = fullOf(v);
        const live = f && f.dataset.state === "on" ? f : v;
        if (play) { if (live.paused) live.play().catch(() => {}); }
        else { if (!v.paused) v.pause(); if (f && !f.paused) f.pause(); }
      });
    };
    const onVisible = () => syncVideos();
    document.addEventListener("visibilitychange", onVisible);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { const v = e.target as HTMLVideoElement; if (e.isIntersecting) onScreen.add(v); else onScreen.delete(v); });
      syncVideos();
    }, { root: view, threshold: 0.12 });
    world.querySelectorAll("video").forEach((v) => io.observe(v));
    ioRef.current = io;
    const draw = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };

    const zoomAt = (sx: number, sy: number, factor: number) => {
      const z = Math.min(Z_MAX, Math.max(Z_MIN, cam.z * factor));
      const k = z / cam.z;
      cam.x = sx - (sx - cam.x) * k;
      cam.y = sy - (sy - cam.y) * k;
      cam.z = z;
      draw();
    };

    // a close-up of the bagel, its neighbours peeking in round it (key 1)
    const bagelView = () => {
      const r = view.getBoundingClientRect();
      // the bagel at about half the window, its neighbours peeking in round it
      const z = Math.min(r.width / (BAGEL.w * 2.1), (r.height - 80) / (BAGEL.w * BAGEL.aspect * 2.1));
      cam.z = Math.min(Z_MAX, Math.max(Z_MIN, z));
      cam.x = r.width / 2;
      cam.y = 40 + (r.height - 40) / 2;
      draw();
    };
    /* Open on the bagel, framed by eye rather than by box:
       - zoomed to fit everything, then ~10% further out for air;
       - the bagel placed at its optical centre, not the window's geometric
         one: a little ABOVE the middle (a focal object dead centre reads as
         sagging) and a little right of it, because the bagel's heavy body
         sits on the left of its image and the light burst on the right, so
         the body itself reads as centred; the nav and star card weigh on the
         top band, which this also answers;
       - if a narrow or short window would push the canvas past an edge, it
         slides back in (the bagel gives way, never the content).
       0 returns here. */
    const BAGEL_AT = { x: 0.52, y: 0.415 }; // of the window, measured from her framing
    const fit = () => {
      const b = pieceBounds(live.current.pieces);
      const r = view.getBoundingClientRect();
      const side = 48, top = 48, bottom = 12;
      const zw = (r.width - side * 2) / b.w, zh = (r.height - top - bottom) / b.h;
      const z = Math.min(Z_MAX, Math.max(Z_MIN, Math.min(zw, zh) * 0.9025));
      // bagel (world 0, 0) at its spot, then keep the whole canvas in view
      const keepIn = (want: number, lo: number, size: number, min: number, max: number) => {
        const a = want + lo * z, span = size * z;
        if (span > max - min) return want + (min + (max - min - span) / 2) - a; // can't fit: centre it
        if (a < min) return want + (min - a);
        if (a + span > max) return want - (a + span - max);
        return want;
      };
      cam.z = z;
      cam.x = keepIn(r.width * BAGEL_AT.x, b.x, b.w, side, r.width - side);
      cam.y = keepIn(r.height * BAGEL_AT.y, b.y, b.h, top, r.height - bottom);
      draw();
    };

    // Wheel: a trackpad pinch arrives as ctrl + wheel. Plain scroll pans.
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      touched.current = true;
      const r = view.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0105));
      } else {
        cam.x -= e.deltaX;
        cam.y -= e.deltaY;
        draw();
      }
    };

    /* Pointer: a press on a piece selects it (shift toggles it in or out of
       the selection) and, once it travels a few pixels, picks up everything
       selected; a press on the ground pans (and, if it barely moves, clears
       the selection); shift + drag on the ground draws a selection box. Two
       touches pinch. While pieces are carried their elements (and the
       selection boxes) move directly; the new spots are committed once, on
       release.

       Guides: while carrying or resizing, edges and centres snap to the other
       pieces' edges and centres, and a resize snaps to another piece's width
       or height. The matches show as dotted grey lines (and a dotted outline
       round a piece whose size was matched), only while something is in hand.
       Hold alt (option) to move freely. */
    type Held = { id: string; el: HTMLElement; px: number; py: number; w: number; h: number };
    type Box = { l: number; t: number; r: number; b: number; cx: number; cy: number };
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch: { d: number; mx: number; my: number } | null = null;
    // resizing: one selected piece, from a corner handle, proportions locked,
    // the opposite corner pinned where it is
    let resize: { id: string; el: HTMLElement; ax: number; ay: number; sx: number; sy: number; aspect: number; w: number; x: number; y: number } | null = null;
    let carry: { held: Held[]; sx: number; sy: number; moved: boolean; id: string; shift: boolean; box: { x: number; y: number }; wx: number; wy: number } | null = null;
    let marquee: { x0: number; y0: number; base: string[] } | null = null;
    let panMoved = false;
    let downAt = { x: 0, y: 0 };
    let pressedOn: Element | null = null;

    const SNAP = 6; // screen px
    const boxOf = (x: number, y: number, w: number, h: number): Box => ({ l: x - w / 2, t: y - h / 2, r: x + w / 2, b: y + h / 2, cx: x, cy: y });
    const toWorld = (cx: number, cy: number) => { const r = view.getBoundingClientRect(); return { x: (cx - r.left - cam.x) / cam.z, y: (cy - r.top - cam.y) / cam.z }; };
    const othersOf = (ids: string[]) => live.current.pieces.filter((q) => !ids.includes(q.id)).map((q) => boxOf(q.x, q.y, q.w, q.h));
    const XS = ["l", "cx", "r"] as const, YS = ["t", "cy", "b"] as const;
    // the nearest edge-or-centre match on each axis, within the snap distance
    const nearest = (m: Box, others: Box[], keys: readonly (keyof Box)[]) => {
      let best: number | null = null;
      const th = SNAP / cam.z;
      for (const o of others) for (const mk of keys) for (const ok of keys) {
        const d = o[ok] - m[mk];
        if (Math.abs(d) <= th && (best === null || Math.abs(d) < Math.abs(best))) best = d;
      }
      return best;
    };
    const guidesEl = () => world.querySelector<HTMLElement>(".gx-guides");
    const clearGuides = () => { const g = guidesEl(); if (g) g.innerHTML = ""; };
    // a dotted line along every edge or centre the box now shares with others
    const showGuides = (m: Box, others: Box[], sized: Box[] = []) => {
      const g = guidesEl();
      if (!g) return;
      const eps = 0.5, out: string[] = [];
      for (const k of XS) {
        const v = m[k], hit = others.filter((o) => XS.some((ok) => Math.abs(o[ok] - v) < eps));
        if (!hit.length) continue;
        const y0 = Math.min(m.t, ...hit.map((o) => o.t)), y1 = Math.max(m.b, ...hit.map((o) => o.b));
        out.push(`<i class="gx-guide gx-guide--v" style="left:${v}px;top:${y0}px;height:${y1 - y0}px"></i>`);
      }
      for (const k of YS) {
        const v = m[k], hit = others.filter((o) => YS.some((ok) => Math.abs(o[ok] - v) < eps));
        if (!hit.length) continue;
        const x0 = Math.min(m.l, ...hit.map((o) => o.l)), x1 = Math.max(m.r, ...hit.map((o) => o.r));
        out.push(`<i class="gx-guide gx-guide--h" style="top:${v}px;left:${x0}px;width:${x1 - x0}px"></i>`);
      }
      for (const o of sized) out.push(`<i class="gx-guide-match" style="left:${o.l}px;top:${o.t}px;width:${o.r - o.l}px;height:${o.b - o.t}px"></i>`);
      g.innerHTML = out.join("");
    };

    const placeEl = (el: HTMLElement, x: number, y: number, w: number, h: number) => {
      el.style.left = `${x - w / 2}px`;
      el.style.top = `${y - h / 2}px`;
    };
    const drop = () => {
      if (!carry) return;
      const c = carry;
      carry = null;
      view.classList.remove("is-carrying");
      clearGuides();
      if (!c.moved) {
        // a plain click inside a multi-selection narrows it to that piece
        if (!c.shift && live.current.selected.length > 1) setSelected([c.id]);
        return;
      }
      const { layout: l, pieces: ps } = live.current;
      let z = Math.max(...ps.map((q) => q.z)); // what you just moved lands on top, in its own order
      const items = { ...l.items };
      [...c.held].sort((a, b) => (ps.find((q) => q.id === a.id)?.z ?? 0) - (ps.find((q) => q.id === b.id)?.z ?? 0)).forEach((hd) => {
        // keep anything else saved for it (a resized width)
        items[hd.id] = { ...items[hd.id], x: Math.round(hd.px + c.wx), y: Math.round(hd.py + c.wy), z: ++z };
      });
      commit({ ...l, items });
    };
    const marqueeEl = () => world.querySelector<HTMLElement>(".gx-marquee");

    const down = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      // a mouse is one pointer: forget any press whose release went missing
      // (it would otherwise read as a second finger and swallow clicks)
      if (e.pointerType === "mouse") { pointers.clear(); pinch = null; }
      touched.current = true;
      try { view.setPointerCapture(e.pointerId); } catch { /* a pointer that is already gone */ }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      downAt = { x: e.clientX, y: e.clientY };
      if (pointers.size === 2) {
        drop();
        const [a, b] = [...pointers.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
        return;
      }
      pressedOn = e.target as Element;
      const handle = (e.target as HTMLElement).closest<HTMLElement>(".gx-sel-h");
      if (handle && live.current.selected.length === 1) {
        const id = live.current.selected[0];
        const q = live.current.pieces.find((x) => x.id === id);
        const qe = world.querySelector<HTMLElement>(`.gx-piece[data-id="${id}"]`);
        if (q && qe) {
          const c = handle.dataset.corner ?? "br", sx = c.includes("l") ? -1 : 1, sy = c.includes("t") ? -1 : 1;
          resize = { id, el: qe, ax: q.x - (sx * q.w) / 2, ay: q.y - (sy * q.h) / 2, sx, sy, aspect: q.h / q.w, w: q.w, x: q.x, y: q.y };
          view.classList.add("is-resizing");
          return;
        }
      }
      const el = (e.target as HTMLElement).closest<HTMLElement>(".gx-piece");
      const p = el && live.current.pieces.find((q) => q.id === el.dataset.id);
      if (el && p) {
        const cur = live.current.selected;
        let next: string[];
        if (e.shiftKey) next = cur.includes(p.id) ? cur.filter((id) => id !== p.id) : [...cur, p.id];
        else next = cur.includes(p.id) ? cur : [p.id];
        setSelected(next);
        live.current.selected = next;
        const held = next.flatMap((id) => {
          const q = live.current.pieces.find((x) => x.id === id);
          const qe = world.querySelector<HTMLElement>(`.gx-piece[data-id="${id}"]`);
          return q && qe ? [{ id, el: qe, px: q.x, py: q.y, w: q.w, h: q.h }] : [];
        });
        const box = selRef.current ? { x: parseFloat(selRef.current.style.left), y: parseFloat(selRef.current.style.top) } : { x: 0, y: 0 };
        // shift-clicking a piece out of the selection doesn't pick anything up
        carry = held.length && next.includes(p.id) ? { held, sx: e.clientX, sy: e.clientY, moved: false, id: p.id, shift: e.shiftKey, box, wx: 0, wy: 0 } : null;
      } else if (e.shiftKey && !pressedOn?.closest(".gx-bagel-hit")) {
        const w0 = toWorld(e.clientX, e.clientY);
        marquee = { x0: w0.x, y0: w0.y, base: live.current.selected };
      } else {
        panMoved = false;
        view.classList.add("is-grabbing");
      }
    };
    const move = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const r = view.getBoundingClientRect();
      if (pointers.size === 2 && pinch) {
        p.x = e.clientX;
        p.y = e.clientY;
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        cam.x += mx - pinch.mx;
        cam.y += my - pinch.my;
        zoomAt(mx - r.left, my - r.top, d / pinch.d);
        pinch = { d, mx, my };
        return;
      }
      if (marquee) {
        const m = marquee, w1 = toWorld(e.clientX, e.clientY);
        const l = Math.min(m.x0, w1.x), t = Math.min(m.y0, w1.y), w = Math.abs(w1.x - m.x0), h = Math.abs(w1.y - m.y0);
        const mq = marqueeEl();
        if (mq) Object.assign(mq.style, { display: "block", left: `${l}px`, top: `${t}px`, width: `${w}px`, height: `${h}px` });
        // anything the box touches joins what was already selected
        const hits = live.current.pieces.filter((q) => q.x + q.w / 2 > l && q.x - q.w / 2 < l + w && q.y + q.h / 2 > t && q.y - q.h / 2 < t + h).map((q) => q.id);
        const next = [...new Set([...m.base, ...hits])];
        if (next.join() !== live.current.selected.join()) { live.current.selected = next; setSelected(next); }
        return;
      }
      if (resize) {
        const rz = resize;
        const wp = toWorld(e.clientX, e.clientY);
        // the larger of the two pulls wins, so the corner follows the pointer
        let w = Math.max(40, rz.sx * (wp.x - rz.ax), (rz.sy * (wp.y - rz.ay)) / rz.aspect);
        const others = othersOf([rz.id]);
        let sized: Box[] = [];
        if (!e.altKey) {
          // snap: the moving corner onto another edge or centre, or the whole
          // piece onto another's width or height, whichever is nearest
          const th = SNAP / cam.z, cands: number[] = [];
          for (const o of others) {
            for (const k of XS) cands.push(rz.sx * (o[k] - rz.ax));
            for (const k of YS) cands.push((rz.sy * (o[k] - rz.ay)) / rz.aspect);
            cands.push(o.r - o.l, (o.b - o.t) / rz.aspect);
          }
          let best = w, gap = th;
          for (const c of cands) { const d = Math.abs(c - w) * Math.max(1, rz.aspect); if (c > 40 && d <= gap) { gap = d; best = c; } }
          w = best;
          sized = others.filter((o) => Math.abs(o.r - o.l - w) < 0.5 || Math.abs(o.b - o.t - w * rz.aspect) < 0.5);
        }
        const h = w * rz.aspect;
        rz.w = w;
        rz.x = rz.ax + (rz.sx * w) / 2;
        rz.y = rz.ay + (rz.sy * h) / 2;
        const box = { left: `${rz.x - w / 2}px`, top: `${rz.y - h / 2}px`, width: `${w}px`, height: `${h}px` };
        Object.assign(rz.el.style, box);
        if (selRef.current) Object.assign(selRef.current.style, box);
        if (e.altKey) clearGuides(); else showGuides(boxOf(rz.x, rz.y, w, h), others, sized);
        p.x = e.clientX;
        p.y = e.clientY;
        return;
      }
      if (carry) {
        const dx = e.clientX - carry.sx, dy = e.clientY - carry.sy;
        if (!carry.moved && Math.hypot(dx, dy) < DRAG_SLOP) return;
        if (!carry.moved) {
          carry.moved = true;
          view.classList.add("is-carrying");
          if (selRef.current) carry.box = { x: parseFloat(selRef.current.style.left), y: parseFloat(selRef.current.style.top) };
          carry.held.forEach((hd, i) => (hd.el.style.zIndex = String(99000 + i))); // above everything while in hand
        }
        let wx = dx / cam.z, wy = dy / cam.z;
        const hb = carry.held, ids = hb.map((hd) => hd.id);
        const span = (wx0: number, wy0: number): Box => {
          const l = Math.min(...hb.map((hd) => hd.px - hd.w / 2)) + wx0, t = Math.min(...hb.map((hd) => hd.py - hd.h / 2)) + wy0;
          const rr = Math.max(...hb.map((hd) => hd.px + hd.w / 2)) + wx0, b = Math.max(...hb.map((hd) => hd.py + hd.h / 2)) + wy0;
          return { l, t, r: rr, b, cx: (l + rr) / 2, cy: (t + b) / 2 };
        };
        const others = othersOf(ids);
        if (!e.altKey) {
          const m = span(wx, wy);
          wx += nearest(m, others, XS) ?? 0;
          wy += nearest(m, others, YS) ?? 0;
          showGuides(span(wx, wy), others);
        } else clearGuides();
        carry.wx = wx;
        carry.wy = wy;
        hb.forEach((hd) => {
          placeEl(hd.el, hd.px + wx, hd.py + wy, hd.w, hd.h);
          const o = world.querySelector<HTMLElement>(`.gx-sel--item[data-sel="${hd.id}"]`);
          if (o) placeEl(o, hd.px + wx, hd.py + wy, hd.w, hd.h);
        });
        if (selRef.current) { selRef.current.style.left = `${carry.box.x + wx}px`; selRef.current.style.top = `${carry.box.y + wy}px`; }
        p.x = e.clientX;
        p.y = e.clientY;
        return;
      }
      // a hand never holds perfectly still: a click that wobbles a pixel or
      // two is still a click (and still clears the selection)
      if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > DRAG_SLOP) panMoved = true;
      cam.x += e.clientX - p.x;
      cam.y += e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      draw();
    };
    const up = (e: PointerEvent) => {
      if (marquee) {
        marquee = null;
        pointers.delete(e.pointerId);
        const mq = marqueeEl();
        if (mq) mq.style.display = "none";
        return;
      }
      if (resize) {
        const rz = resize;
        resize = null;
        pointers.delete(e.pointerId);
        view.classList.remove("is-resizing");
        clearGuides();
        const l = live.current.layout, q = live.current.pieces.find((x) => x.id === rz.id);
        if (q && Math.abs(rz.w - q.w) > 0.5) commit({ ...l, items: { ...l.items, [rz.id]: { x: Math.round(rz.x), y: Math.round(rz.y), z: q.z, w: Math.round(rz.w) } } });
        return;
      }
      const wasPan = !carry && pointers.size === 1;
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (carry) drop();
      else if (wasPan && !panMoved) {
        setSelected([]);
        // a tap on the bagel (no hover on touch) says it again and finds it
        if (pressedOn?.closest(".gx-bagel-hit")) bagelTap.current();
      }
      if (!pointers.size) view.classList.remove("is-grabbing");
    };

    const key = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, [contenteditable]")) return;
      touched.current = true;
      const r = view.getBoundingClientRect();
      const step = 80;
      const sel = live.current.selected;
      if (DEV && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        const prev = history.current.pop();
        if (prev) { setLayout(prev); save(prev); }
        e.preventDefault();
        return;
      }
      switch (e.key) {
        case "Escape": setSelected([]); return;
        case "Delete": case "Backspace":
          if (DEV && sel.length) {
            const l = live.current.layout;
            commit({ items: Object.fromEntries(Object.entries(l.items).filter(([k]) => !sel.includes(k))), deleted: [...l.deleted, ...sel] });
            setSelected([]);
            e.preventDefault();
          }
          return;
        case "ArrowLeft": cam.x += step; break;
        case "ArrowRight": cam.x -= step; break;
        case "ArrowUp": cam.y += step; break;
        case "ArrowDown": cam.y -= step; break;
        case "+": case "=": zoomAt(r.width / 2, r.height / 2, 1.25); return;
        case "-": case "_": zoomAt(r.width / 2, r.height / 2, 0.8); return;
        case "0": fit(); return;
        case "1": bagelView(); return;
        default: return;
      }
      e.preventDefault();
      draw();
    };

    fitRef.current = fit;
    fit();
    const ro = new ResizeObserver(() => draw());
    ro.observe(view);
    view.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("pointermove", track);
    view.addEventListener("pointerdown", down);
    view.addEventListener("pointermove", move);
    view.addEventListener("pointerup", up);
    view.addEventListener("pointercancel", up);
    window.addEventListener("keydown", key);
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
      ro.disconnect();
      view.removeEventListener("wheel", wheel);
      window.removeEventListener("pointermove", track);
      document.removeEventListener("visibilitychange", onVisible);
      view.removeEventListener("pointerdown", down);
      view.removeEventListener("pointermove", move);
      view.removeEventListener("pointerup", up);
      view.removeEventListener("pointercancel", up);
      window.removeEventListener("keydown", key);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Arriving always means arriving at her layout, at the opening view, with
     nothing selected. A fresh load does that on its own; this covers the page
     coming back from the browser's back/forward cache (Home, then Back), which
     would otherwise restore it exactly as the visitor left it. */
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      history.current = [];
      setSelected([]);
      setLayout(DEV ? live.current.layout : (SAVED as Layout));
      touched.current = false;
      fitRef.current();
      if (DEV) window.location.reload(); // dev: pick up the file as it is now
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  useEffect(() => {
    if (!touched.current) fitRef.current();
    // a piece brought back (an undone delete) is a new element: watch its loop too
    worldRef.current?.querySelectorAll("video").forEach((v) => ioRef.current?.observe(v));
  }, [layout]);

  const sel = pieces.filter((p) => selected.includes(p.id));
  const box = sel.length
    ? (() => {
        const x0 = Math.min(...sel.map((p) => p.x - p.w / 2)), y0 = Math.min(...sel.map((p) => p.y - p.h / 2));
        const x1 = Math.max(...sel.map((p) => p.x + p.w / 2)), y1 = Math.max(...sel.map((p) => p.y + p.h / 2));
        return { left: x0, top: y0, width: x1 - x0, height: y1 - y0 };
      })()
    : null;

  return (
    <div className="wt wt--gallery">
      <WtNav />
      {sheet && <Sheet layout={layout} onChange={commit} />}
      <main className="gx" aria-label="Gallery canvas">
        <h1 className="gx-sr">Gallery</h1>
        <div className="gx-view" ref={viewRef} tabIndex={0} aria-label="Canvas. Drag or scroll to move, pinch or ctrl and scroll to zoom, 0 to fit everything. Click a piece to select it, drag it to move it.">
          <div className="gx-world" ref={worldRef}>
            <Bagel tap={bagelTap} check={bagelCheck} />
            {pieces.map((p) => (
              <PieceView key={p.id} piece={p} />
            ))}
            {sel.length > 1 &&
              sel.map((p) => (
                <div
                  key={p.id}
                  className="gx-sel gx-sel--item"
                  data-sel={p.id}
                  style={{ left: p.x - p.w / 2, top: p.y - p.h / 2, width: p.w, height: p.h }}
                  aria-hidden="true"
                />
              ))}
            <div className="gx-guides" aria-hidden="true" />
            <div className="gx-marquee" aria-hidden="true" />
            {box && (
              <div className="gx-sel" ref={selRef} style={box} aria-hidden="true">
                {sel.length === 1 && <span className="gx-sel-name">{sel[0].title}</span>}
                <i className="gx-sel-h gx-sel-h--tl" data-corner="tl" />
                <i className="gx-sel-h gx-sel-h--tr" data-corner="tr" />
                <i className="gx-sel-h gx-sel-h--bl" data-corner="bl" />
                <i className="gx-sel-h gx-sel-h--br" data-corner="br" />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

const saving = { n: 0, sent: 0 }; // saves in flight, and how many were ever sent

function save(l: Layout) {
  saving.n++;
  saving.sent++;
  fetch("/__gallery/layout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(l) })
    .catch(() => {})
    .finally(() => saving.n--);
}

/* Cursor Loves Indie, slides 1 and 9: the wordmarks are live in the deck,
   each letter turning as the pointer reaches it. Here the slide stays a plain
   image only until the page loads; then the real wordmark (public/gallery/
   wordmarks, built from the deck's own pages) is drawn once exactly over the
   image's letters, at the same stroke weight, and stopped: still vector
   letters. Hovering restarts it in place (the letters answer the pointer one
   by one), and a few seconds after the pointer leaves, once they've eased
   back, its frame loop stops again. Rest and motion are the same drawing, so
   the moment it comes alive can't be seen, and nothing loops in the
   background. BOX is where the letters sit in the slide image, as fractions
   (left, top, width, height), measured from the images. */
const LIVE: Record<string, { kind: "cursor" | "orbit"; box: [number, number, number, number] }> = {
  "cursor-1": { kind: "cursor", box: [0.2164, 0.45, 0.5656, 0.0986] },
  "cursor-9": { kind: "orbit", box: [0.2086, 0.4472, 0.5844, 0.1042] },
};
const SLIDE_PX = 1280; // the slide images' width; their strokes are 1.25px at that size
const KEEP_AFTER = 6000; // ms after leaving before it goes back to the image

type Mount = (host: HTMLElement) => () => void;
const scripts: Record<string, Promise<void>> = {};
const loadWordmark = (kind: string) =>
  (scripts[kind] ??= new Promise<void>((ok, fail) => {
    const el = document.createElement("script");
    el.src = `/gallery/wordmarks/${kind}.js`;
    el.onload = () => ok();
    el.onerror = () => fail();
    document.head.appendChild(el);
  }));

function LiveWordmark({ id, slideW }: { id: string; slideW: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const live = LIVE[id], wrap = ref.current, fig = wrap?.parentElement;
    if (!live || !wrap || !fig || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let stop: (() => void) | null = null, later = 0, alive = true;
    const host = wrap.querySelector<HTMLElement>(".gx-live-host")!;
    const fitToImage = () => {
      const svg = host.querySelector("svg");
      if (!svg) return;
      // where the drawn letters actually landed, against where the image has
      // them: scale and shift the svg so the two boxes coincide (letters
      // centred on the image's line). k converts screen px to the slide's own.
      svg.style.transform = "";
      const hr = host.getBoundingClientRect(), sr = svg.getBoundingClientRect();
      const k = hr.width / host.offsetWidth || 1;
      const rs = [...svg.querySelectorAll("path")].map((pth) => pth.getBoundingClientRect());
      const l = Math.min(...rs.map((r) => r.left)), t = Math.min(...rs.map((r) => r.top));
      const w = Math.max(...rs.map((r) => r.right)) - l, h = Math.max(...rs.map((r) => r.bottom)) - t;
      const sc = hr.width / w;
      const tx = (hr.left - sr.left - sc * (l - sr.left)) / k;
      const ty = (hr.top + (hr.height - h * sc) / 2 - sr.top - sc * (t - sr.top)) / k;
      svg.style.transformOrigin = "0 0";
      svg.style.transform = `translate(${tx}px, ${ty}px) scale(${sc})`;
      // stroke: 1.25px at the image's own width, in this slide's units
      const vb = svg.viewBox.baseVal, perUnit = (sr.width / k / (vb.width || 1)) * sc;
      svg.style.setProperty("--gx-live-stroke", String((1.25 * slideW) / SLIDE_PX / perUnit));
    };
    // Draw the wordmark (fresh, settled) and line it up with the image.
    const start = () =>
      loadWordmark(live.kind).then(() => {
        if (!alive) return false;
        const mount = (window as unknown as { gxWordmarks?: Record<string, Mount> }).gxWordmarks?.[live.kind];
        if (!mount) return false;
        wrap.classList.add("is-live"); // shown first: hidden boxes measure as nothing
        stop?.();
        stop = mount(host);
        fitToImage();
        return true;
      }, () => false);
    const halt = () => {
      // stop the frame loop but keep the drawing: still vector letters, the
      // same pixels the hover starts from, so the swap can't be seen
      stop?.();
      stop = null;
    };
    const show = () => {
      window.clearTimeout(later);
      if (!stop) start();
    };
    const hide = () => {
      window.clearTimeout(later);
      later = window.setTimeout(halt, KEEP_AFTER);
    };
    // draw it once straight away and stop: from then on the slide's letters
    // at rest ARE the wordmark, not a picture of it (done at load, while the
    // canvas is still filling in, so even that one swap goes unnoticed)
    const prime = window.setTimeout(() => {
      start().then((ok) => ok && requestAnimationFrame(() => requestAnimationFrame(() => { if (!fig.matches(":hover")) halt(); })));
    }, 0);
    fig.addEventListener("pointerenter", show);
    fig.addEventListener("pointerleave", hide);
    return () => {
      alive = false;
      window.clearTimeout(later);
      window.clearTimeout(prime);
      stop?.();
      fig.removeEventListener("pointerenter", show);
      fig.removeEventListener("pointerleave", hide);
    };
  }, [id, slideW]);
  const [l, t, w, h] = LIVE[id].box;
  return (
    <div className="gx-live" ref={ref} aria-hidden="true">
      {/* black over the image's letters, a little wider than they reach, so the
          turning live letters never show the still ones underneath */}
      <span className="gx-live-cover" style={{ left: `${(l - 0.06) * 100}%`, top: `${(t - 0.12) * 100}%`, width: `${(w + 0.12) * 100}%`, height: `${(h + 0.24) * 100}%` }} />
      <div className="gx-live-host" style={{ left: `${l * 100}%`, top: `${t * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` }} />
    </div>
  );
}

function PieceView({ piece: p }: { piece: Piece }) {
  const style = { left: p.x - p.w / 2, top: p.y - p.h / 2, width: p.w, height: p.h, zIndex: p.z };
  const cls = p.kind === "sticker" ? "gx-piece gx-piece--sticker" : "gx-piece";
  if (p.kind === "video")
    return (
      <figure className={cls} style={style} data-id={p.id}>
        <video
          src={p.small ?? p.src}
          data-full={p.small ? p.src : undefined}
          poster={p.poster}
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={p.title}
        />
      </figure>
    );
  return (
    <figure className={cls} style={style} data-id={p.id}>
      <img src={p.src} alt={p.title} loading="lazy" decoding="async" draggable={false} />
      {LIVE[p.id] && <LiveWordmark id={p.id} slideW={p.w} />}
    </figure>
  );
}

/* The everything bagel, and its line.

   The bagel never moves, and its exclamation is always there. Resting on the
   bagel (or the bubble) has it say the line again: the bubble bursts back out
   from the tail's tip, hidden under the bagel, 0 to full size on a softly
   bouncing spring with a little unwinding twist. Leaving changes nothing. A
   short hover intent keeps a passing sweep from setting it off, a short grace
   lets the pointer cross between bagel and bubble without it counting as a
   new arrival, and it never restarts while it is still playing.

   A beat of resting also earns the "Find my bagel" star, which flies from the
   bagel as it does on Home. On touch there is no hover: a tap says the line
   and earns the star. Reduced motion: no replay, the line just stays. */
const OUT = { type: "spring", duration: 0.5, bounce: 0.2 } as const;
const SAY_AFTER = 60; // ms: sweeping past the bagel doesn't set it off
const GRACE = 140; // ms: crossing between bagel and bubble isn't a new arrival
const FIND_AFTER = 600; // ms resting on the bagel, as on Home

function Bagel({ tap, check }: { tap: MutableRefObject<() => void>; check: MutableRefObject<(x: number, y: number) => void> }) {
  const shoutRef = useRef<HTMLImageElement>(null);
  const hitRef = useRef<HTMLSpanElement>(null);
  const burstHitRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const shout = shoutRef.current, hit = hitRef.current, burstHit = burstHitRef.current;
    if (!shout || !hit || !burstHit) return;
    const reduced = prefersReducedMotion();
    const hover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    let find = 0, intent = 0, grace = 0, over = false, playing = false;
    const centre = () => { const r = hit.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };

    const say = () => {
      if (reduced || playing) return;
      playing = true;
      animate(shout, { opacity: [0, 1] }, { duration: 0.16, ease: [0.23, 1, 0.32, 1] });
      animate(shout, { scale: [0, 1], rotate: [-10, 0] }, OUT).finished.then(() => (playing = false), () => (playing = false));
    };

    const isBagel = (t: EventTarget | null) => t === hit || t === burstHit;
    const enter = () => {
      window.clearTimeout(grace);
      if (over) return; // still the same visit
      over = true;
      intent = window.setTimeout(say, SAY_AFTER);
      find = window.setTimeout(() => earn("bagel", centre()), FIND_AFTER);
    };
    const exit = () => {
      window.clearTimeout(grace);
      grace = window.setTimeout(() => {
        over = false;
        window.clearTimeout(intent);
        window.clearTimeout(find);
      }, GRACE);
    };
    const leave = (e: PointerEvent) => {
      if (!isBagel(e.relatedTarget)) exit();
    };
    tap.current = () => { say(); earn("bagel", centre()); };
    // the canvas moved under a still pointer: no enter/leave fires, so look
    check.current = (x, y) => {
      if (!hover) return;
      if (isBagel(document.elementFromPoint(x, y))) enter();
      else if (over) exit();
    };

    if (hover) {
      [hit, burstHit].forEach((el) => { el.addEventListener("pointerenter", enter); el.addEventListener("pointerleave", leave); });
    }
    return () => {
      [find, intent, grace].forEach((t) => window.clearTimeout(t));
      [hit, burstHit].forEach((el) => { el.removeEventListener("pointerenter", enter); el.removeEventListener("pointerleave", leave); });
      tap.current = () => {};
      check.current = () => {};
    };
  }, [tap, check]);

  const w = BAGEL.w, h = BAGEL.w * BAGEL.aspect;
  return (
    <div className="gx-bagel" style={{ left: -w / 2, top: -h / 2, width: w, height: h }}>
      <img
        ref={shoutRef}
        className="gx-bagel-shout"
        src={BAGEL.shout}
        alt={BAGEL.title}
        draggable={false}
        style={{ transformOrigin: `${BAGEL.origin.x * 100}% ${BAGEL.origin.y * 100}%` }}
      />
      <img className="gx-bagel-body" src={BAGEL.body} alt="" draggable={false} />
      <span className="gx-bagel-hit" ref={hitRef} aria-hidden="true" />
      <span className="gx-bagel-hit gx-bagel-hit--burst" ref={burstHitRef} aria-hidden="true" />
    </div>
  );
}
