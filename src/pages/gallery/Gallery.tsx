/// <reference types="vite/client" />
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { animate } from "motion";
import "../../styles/tokens.css";
import "../home/home.css";
import "./gallery.css";
import WtNav from "../home/WtNav.js";
import { prefersReducedMotion } from "../home/interactions.js";
import { earn } from "../../components/badges/badgeStore.js";
import { BAGEL, PIECES, applyLayout, applyPhone, pieceBounds, portraitLayout, thumbOf, type Layout, type Piece } from "./clusters.js";
import SAVED from "./layout.json";
import { BAGEL_HOLE, PHONE_QUERY, Z_MAX, Z_MIN, openingCam } from "./opening.js";
import { CAVE_KEY, CLOCK, EASE, PACE, PACE_REST, PAPER, buildHole, fallFor, fallFrames, fallPath, farCorner, flightFor, holeRadius, isThin, launchAt, makeShape, markRunning, mode, outAt, releaseAt, type CaveHandoff } from "../../motion/cave/shape.js";
import { begin as beginTest, hud as testHud } from "../../motion/cave/test.js";
import { pocket, sprite, stack, type Flyer } from "../../motion/cave/draw.js";
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

const DOT_STEP = 24; // world px between dots at 100%
const DRAG_SLOP = 3; // screen px before a press becomes a drag
const DEV = import.meta.env.DEV;
// localhost only: /everything/#sheet is the contact sheet for renaming pieces
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
  // dev reads layout.json fresh; the storm waits for it so nothing re-lands
  const layoutReady = useRef<Promise<unknown>>(Promise.resolve());
  const [layout, setLayout] = useState<Layout>(SAVED as Layout);
  const [selected, setSelected] = useState<string[]>([]);
  /* A hidden easter egg: double-click a selected piece's name to rename it.
     Like moving and resizing, it's only for this visit (gone on reload). */
  const [renames, setRenames] = useState<Record<string, string>>({});
  const [renaming, setRenaming] = useState<string | null>(null);
  // phones (portrait): the same clusters re-stacked taller round the bagel
  const PORTRAIT = "(orientation: portrait) and (max-width: 900px)";
  const [portrait, setPortrait] = useState(() => typeof window !== "undefined" && window.matchMedia(PORTRAIT).matches);
  useEffect(() => {
    const mq = window.matchMedia(PORTRAIT);
    const on = () => setPortrait(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const arranged = useMemo(() => applyLayout(PIECES, layout), [layout]);
  const pieces = useMemo(
    () => (portrait ? applyPhone(portraitLayout(arranged), layout.phone) : arranged),
    [portrait, arranged, layout.phone],
  );
  // how far each piece was moved for the portrait arrangement, so a drop or
  // resize there is stored in the saved (desktop) layout's own coordinates
  const shift = useMemo(() => {
    const m: Record<string, { dx: number; dy: number }> = {};
    pieces.forEach((p, i) => (m[p.id] = { dx: p.x - arranged[i].x, dy: p.y - arranged[i].y }));
    return m;
  }, [pieces, arranged]);
  const [sheet, setSheet] = useState(SHEET);
  useEffect(() => {
    if (!DEV) return;
    const onHash = () => setSheet(location.hash === "#sheet");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // the effect below is mounted once; it reads the latest state through refs
  const live = useRef({ pieces, layout, selected, shift, portrait });
  live.current = { pieces, layout, selected, shift, portrait };
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
    const pull = (): Promise<unknown> => {
      // a save still on its way (or one sent after this read began) is newer
      // than whatever the read brings back, so the read is dropped
      if (saving.n) return Promise.resolve();
      const asked = saving.sent;
      return fetch("/__gallery/layout", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((l: Layout | null) => {
          if (!l || saving.n || saving.sent !== asked) return;
          if (JSON.stringify(l) !== JSON.stringify(live.current.layout)) setLayout(l);
        })
        .catch(() => {});
    };
    layoutReady.current = pull();
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
    let storming = false;
    /* Images open as light copies (thumbOf) and swap to the original once a
       piece is shown big enough to need it, loaded and decoded first so the
       swap can't be seen. They never swap back. */
    const FULL_AT = 260; // device px across (the light copies are 280)
    /* An original, decoded, is many times its file (the canvas's, all at
       once, come to some 400MB). A phone has no room for many at a time: on
       anything driven by touch they are fetched together but decoded and
       swapped in two at a time. And while the pocket-size cave-in draws the
       canvas (motion/cave/draw.ts) none are swapped at all: holdFull. */
    let holdFull = mode() === "canvas" && !!(window as unknown as { __gxCave?: unknown }).__gxCave;
    const AT_ONCE = window.matchMedia("(pointer: fine)").matches ? Infinity : 2;
    const toDecode: (() => Promise<void>)[] = [];
    let decoding = 0;
    const pump = () => {
      while (decoding < AT_ONCE && toDecode.length) {
        decoding++;
        toDecode.shift()!().then(() => { decoding--; pump(); });
      }
    };
    const syncImages = () => {
      if (holdFull) return;
      world.querySelectorAll<HTMLImageElement>("img[data-full]").forEach((img) => {
        if (img.dataset.swapped) return;
        const across = (img.parentElement?.offsetWidth ?? 0) * cam.z * dpr();
        if (across < FULL_AT) return;
        img.dataset.swapped = "1";
        const full = new Image();
        const swap = () => full.decode().then(() => { img.src = full.src; }, () => {});
        if (AT_ONCE === Infinity) {
          full.src = img.dataset.full!;
          swap();
        } else {
          full.onload = () => { toDecode.push(swap); pump(); };
          full.src = img.dataset.full!;
        }
      });
    };
    const syncVideos = () => {
      syncImages();
      if (storming) { world.querySelectorAll("video").forEach((v) => v.pause()); return; }
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
    /* The opening view: zoomed to fit everything with air round it. 0 returns
       here. */
    const fit = () => {
      const r = view.getBoundingClientRect();
      // a phone's star card and INDEX take more of the top
      const phone = window.matchMedia(PHONE_QUERY).matches;
      // the nav bar's bottom edge: the space under it and the space under the
      // canvas are kept equal (phones and desktop alike)
      const navBottom = Math.max(56, document.querySelector(".wt-nav")?.getBoundingClientRect().bottom ?? 78);
      // the arithmetic lives in opening.ts (the cave-in needs it too)
      const o = openingCam(r.width, r.height, navBottom, phone, pieceBounds(live.current.pieces));
      cam.z = o.z;
      cam.x = o.x;
      cam.y = o.y;
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
      if (live.current.portrait) {
        // on a phone-shaped screen, moves are the phone arrangement's own
        const phone = { ...(l.phone ?? {}) };
        c.held.forEach((hd) => (phone[hd.id] = { x: Math.round(hd.px + c.wx), y: Math.round(hd.py + c.wy), w: Math.round(hd.w) }));
        commit({ ...l, phone });
        return;
      }
      let z = Math.max(...ps.map((q) => q.z)); // what you just moved lands on top, in its own order
      const items = { ...l.items };
      [...c.held].sort((a, b) => (ps.find((q) => q.id === a.id)?.z ?? 0) - (ps.find((q) => q.id === b.id)?.z ?? 0)).forEach((hd) => {
        // keep anything else saved for it (a resized width)
        const sh = live.current.shift[hd.id] ?? { dx: 0, dy: 0 };
        items[hd.id] = { ...items[hd.id], x: Math.round(hd.px + c.wx - sh.dx), y: Math.round(hd.py + c.wy - sh.dy), z: ++z };
      });
      commit({ ...l, items });
    };
    const marqueeEl = () => world.querySelector<HTMLElement>(".gx-marquee");

    const down = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      // the name label is for double-click renaming, not for dragging
      if (e.target instanceof Element && e.target.closest(".gx-sel-name")) return;
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
        const sh = live.current.shift[rz.id] ?? { dx: 0, dy: 0 };
        if (q && Math.abs(rz.w - q.w) > 0.5 && live.current.portrait) {
          commit({ ...l, phone: { ...(l.phone ?? {}), [rz.id]: { x: Math.round(rz.x), y: Math.round(rz.y), w: Math.round(rz.w) } } });
          return;
        }
        if (q && Math.abs(rz.w - q.w) > 0.5) commit({ ...l, items: { ...l.items, [rz.id]: { x: Math.round(rz.x - sh.dx), y: Math.round(rz.y - sh.dy), z: q.z, w: Math.round(rz.w) } } });
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
          if (DEV && sel.length && !live.current.portrait) { // removing is a desktop decision
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

    /* THE STORM. Arriving at Everything (a click, or a link from elsewhere;
       not a reload or Back/Forward: everything/index.html decides, and sets
       html.gx-storm), every piece falls into a gravity well and out again:
         in    from beyond the edges, looming close to the camera as it
               crosses the top of a C, slowing, then tipping downhill and
               speeding up into the bottom of the well; the page you came
               from stays put and is swept away inside their closing ring;
         orb   every piece reaches one loose ball at the centre at the same
               instant, and passes straight through (no pause);
         out   flung back out on its own straight line, dipping a little
               deeper, then up into place, slowing all the way; the far
               ones land a touch after the near ones; the dots wash in
               behind the pack, and the bagel grows open from its centre
               alongside it, whole as they land.
       Any click, scroll or key lands everything at once. ?slow=4 slows it. */
    const storm: Animation[] = [];
    let stormTimer = 0;
    const stormTimers: number[] = [];
    /* THE CAVE-IN, second half (motion/cave/). Arriving from a page of this
       site that has just fallen into its hole (everything/index.html found
       its note and drew the same hole before the first frame), Everything
       throws its own pieces back out of it:
         out     every piece is thrown from the hole to its place, nearest
                 first, the fall played backwards: fastest as it leaves,
                 growing and flattening as it climbs the well, rocking once
                 past flat as it lands; the nav comes back the same way, its
                 words only pulled (no tilt);
         bagel   rises under the hole, from the hole's own middle;
         hole    the cracks draw back in and the hole shuts in one smooth
                 close over the bagel's hole, and the dots wash in.
       The hole is drawn where the page before predicted the bagel would be;
       it slides the last few pixels onto the real one while the pieces fly.
       Any click, scroll or key lands everything at once. ?slow=4 slows it. */
    let caved = false;
    testHud(true); // (only with a ?cave= test link: the log of what ran, in the corner)
    /* "fit" (a candidate, test link only; shape.ts): while the pieces fly,
       the canvas is laid out at its on-screen size, by CSS zoom in place of
       its scale, so a tilted tile is no bigger than it looks. Measured, not
       assumed: where zoom does not behave, it is put back and null returned.
       Gives the size of one of the canvas's own pixels on screen. */
    const fitOn = (): { k: number; off: () => void } | null => {
      if (mode() !== "fit") return null;
      const probe = world.querySelector<HTMLElement>(".gx-piece");
      if (!probe) return null;
      const want = probe.getBoundingClientRect(), was = world.style.transform;
      const off = () => {
        world.style.removeProperty("zoom");
        world.style.transform = was;
        draw();
      };
      world.style.setProperty("zoom", String(cam.z));
      world.style.transform = "translate3d(0px, 0px, 0)";
      const a = probe.getBoundingClientRect();
      world.style.transform = "translate3d(100px, 0px, 0)";
      const k = (probe.getBoundingClientRect().left - a.left) / 100;
      if (!(k > 0) || Math.abs(a.width - want.width) > 2) {
        off();
        return null;
      }
      world.style.transform = `translate3d(${((want.left - a.left) / k).toFixed(2)}px, ${((want.top - a.top) / k).toFixed(2)}px, 0)`;
      return { k, off };
    };
    /* "canvas" (the pocket-size one, what phones and tablets get; draw.ts): the
       pieces are drawn into one canvas over the view while the real canvas
       is hidden, and the real one is put back under it at the end. A film
       that has no frame yet is drawn from its poster, fetched ahead here. */
    const pocketOn = mode() === "canvas";
    const posters = new Map<string, HTMLImageElement>();
    if (pocketOn)
      live.current.pieces.forEach((p) => {
        if (p.kind !== "video" || !p.poster) return;
        const still = new Image();
        still.src = thumbOf(p.poster);
        posters.set(p.id, still);
      });
    const flyer = (t: Thrown, vr: DOMRect, z: number, fall: ReturnType<typeof fallPath>, delay: number, dur: number): Flyer & { z: number } => {
      const w = t.right - t.left, h = t.bottom - t.top;
      const drawn = sprite(t.el, w, h, z, posters.get(t.piece!.id));
      return { sprite: drawn?.c ?? null, pad: drawn?.pad ?? 0, cx: (t.left + t.right) / 2 - vr.left, cy: (t.top + t.bottom) / 2 - vr.top, w, h, ...fall, delay, dur, z: t.piece!.z };
    };
    // everything that falls in or is thrown out: the canvas's pieces, then
    // the nav's (its words are only pulled; an open phone menu goes as one card)
    type Thrown = { el: HTMLElement; left: number; top: number; right: number; bottom: number; unit: number; flat: boolean; piece?: Piece };
    const cast = (): Thrown[] => {
      const z = cam.z, vr = view.getBoundingClientRect(), thrown: Thrown[] = [];
      live.current.pieces.forEach((p) => {
        const el = world.querySelector<HTMLElement>(`.gx-piece[data-id="${p.id}"]`);
        if (!el) return;
        const cx = vr.left + cam.x + p.x * z, cy = vr.top + cam.y + p.y * z, hw = (p.w * z) / 2, hh = (p.h * z) / 2;
        thrown.push({ el, left: cx - hw, top: cy - hh, right: cx + hw, bottom: cy + hh, unit: 1 / z, flat: false, piece: p });
      });
      const menu = window.matchMedia(PHONE_QUERY).matches ? document.querySelector<HTMLElement>(".wt-primary-nav.is-open") : null;
      document.querySelectorAll<HTMLElement>(".wt-nav .bc, .wt-nav-toggle, .wt-primary-nav.is-open, .wt-nav-links li > a, .wt-nav-links li > button").forEach((el) => {
        if (menu && el !== menu && menu.contains(el)) return;
        if (el.classList.contains("wt-primary-nav") && el !== menu) return;
        const q = el.getBoundingClientRect();
        if (q.width < 1 || q.height < 1) return; // the phone menu's links, folded away
        const card = el.classList.contains("bc") || el === menu;
        thrown.push({ el, left: q.left, top: q.top, right: q.right, bottom: q.bottom, unit: 1, flat: isThin(q.width, q.height, !card) });
      });
      return thrown;
    };
    const runCave = (note: CaveHandoff) => {
      caved = true;
      const root = document.documentElement;
      const slow = parseFloat(getComputedStyle(root).getPropertyValue("--gx-slow")) || 1;
      const ms = (seconds: number) => seconds * 1000 * slow * PACE_REST;
      const z = cam.z, vr = view.getBoundingClientRect();
      const to = { x: vr.left + cam.x + BAGEL_HOLE.x * z, y: vr.top + cam.y + BAGEL_HOLE.y * z };
      storming = true;
      syncVideos();
      const endTest = beginTest("throw out");
      const fit = fitOn();
      const pk = pocketOn ? pocket(view) : null;
      /* The hole is drawn on the screen, not in the canvas: inside the scaled
         canvas it was drawn at the camera's zoom and stretched back up, a
         touch soft, which showed as a blink at the cut between the pages.
         It has to sit under the pieces (they fly out of it) but over the
         bagel (it shuts over it), and both of those live in the one canvas
         layer. So there are two copies on one clock: the whole hole under
         the canvas, and its body alone over it, swapped just before the
         bagel appears, by which time every piece has left the hole. */
      const holeBox = (svg: SVGElement) => {
        const box = document.createElement("div");
        box.className = "gx-cave-hole";
        box.setAttribute("aria-hidden", "true");
        box.style.left = `${note.hx - vr.left}px`;
        box.style.top = `${note.hy - vr.top}px`;
        box.appendChild(svg);
        return box;
      };
      /* Off desktop Chrome (every phone, all of Safari) it is kept as light
         as it can be: one hole, over the canvas, moved and shut as a single
         layer, and the pieces fly flat (shape.ts mode()). The pieces come
         out from under its rim and the bagel rises beneath it. */
      const light = mode() !== "deep";
      const built = buildHole(makeShape(note.R, note.seed)), over = light ? null : buildHole(makeShape(note.R, note.seed));
      over?.cracks.forEach((c) => c.el.remove());
      const holeEl = holeBox(built.svg), holeTop = over ? holeBox(over.svg) : null;
      if (holeTop) {
        view.insertBefore(holeEl, world);
        world.after(holeTop);
        const SWAP = CLOCK.bagel[0] - 0.05;
        const flip = (el: Element, from: string, to: string) =>
          storm.push(el.animate([{ visibility: from }, { visibility: to }], { duration: ms(SWAP), easing: "steps(1, end)", fill: "both" }));
        flip(built.body, "visible", "hidden");
        flip(holeTop, "hidden", "visible");
      } else {
        world.after(holeEl);
      }
      if (pk) world.after(pk.el); // the drawing: over the canvas, under the hole
      const bagelEl = world.querySelector<HTMLElement>(".gx-bagel");
      if (bagelEl && !pk) bagelEl.style.transformOrigin = `${BAGEL_HOLE.fx * 100}% ${BAGEL_HOLE.fy * 100}%`;
      // the dots, as their own layer, so they can wash in last
      const ground = document.createElement("div");
      ground.className = "gx-storm-ground";
      ground.style.backgroundSize = view.style.backgroundSize;
      ground.style.backgroundPosition = view.style.backgroundPosition;
      view.insertBefore(ground, holeTop ? holeEl : world); // under the hole and the canvas
      storm.push(ground.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms(CLOCK.ground[1] - CLOCK.ground[0]), delay: ms(CLOCK.ground[0]), easing: "ease-out", fill: "both" }));
      // the hole slides from where it was predicted onto the bagel's real hole
      const dx0 = Math.round(to.x - note.hx), dy0 = Math.round(to.y - note.hy);
      if (holeTop) {
        [holeEl, holeTop].forEach((box) =>
          storm.push(box.animate(
            [{ transform: "translate(0px, 0px)" }, { transform: `translate(${dx0}px, ${dy0}px)` }],
            { duration: ms(CLOCK.close[0]), easing: EASE.io, fill: "forwards" },
          )),
        );
      } else {
        // the one hole: slides onto the bagel's hole, then shuts, cracks and all
        const T = CLOCK.close[1], there = `translate(${dx0}px, ${dy0}px)`;
        storm.push(holeEl.animate(
          [
            { offset: 0, opacity: 1, transform: "translate(0px, 0px) scale(1)", easing: EASE.io },
            { offset: CLOCK.close[0] / T, opacity: 1, transform: `${there} scale(1)`, easing: EASE.io },
            { offset: 0.985, opacity: 1, transform: `${there} scale(0.02)` },
            { offset: 1, opacity: 0, transform: `${there} scale(0.01)` },
          ],
          { duration: ms(T), fill: "forwards" },
        ));
      }

      // everything that is thrown out: the canvas's pieces, then the nav's
      const thrown = cast();
      if (fit) thrown.forEach((t) => { if (t.unit !== 1) t.unit = 1 / fit.k; });
      const far = Math.max(1, ...thrown.map((t) => farCorner(t, to.x, to.y)));
      const drawn: (Flyer & { z: number })[] = [];
      thrown.forEach((t) => {
        const d = farCorner(t, to.x, to.y) / far, D = flightFor(d), all = D + CLOCK.rock[1];
        const dx = (t.left + t.right) / 2 - to.x, dy = (t.top + t.bottom) / 2 - to.y;
        const how = { flat: t.flat, w: t.right - t.left, h: t.bottom - t.top, dur: D, out: true, unit: t.unit, rock: CLOCK.rock[1] / all };
        if (pk && t.piece) return void drawn.push(flyer(t, vr, z, fallPath(dx, dy, note.R, how), ms(launchAt(d)), ms(all)));
        storm.push(t.el.animate(fallFrames(dx, dy, note.R, how), { duration: ms(all), delay: ms(launchAt(d)), easing: "linear", fill: "backwards" }));
      });
      if (pk) {
        // the bagel first (it lies under every piece), growing from its own hole
        if (bagelEl) {
          const q = bagelEl.getBoundingClientRect();
          const art = stack(Array.from(bagelEl.querySelectorAll("img")), q.width, q.height);
          const still = { tx: 0, ty: 0, tilt: 0 };
          pk.add({
            sprite: art?.c ?? null, pad: 0, cx: q.left + q.width / 2 - vr.left, cy: q.top + q.height / 2 - vr.top, w: q.width, h: q.height,
            ox: (BAGEL_HOLE.fx - 0.5) * q.width, oy: (BAGEL_HOLE.fy - 0.5) * q.height, flat: true, turn: 0,
            poses: [
              { offset: 0, opacity: 0, sc: 0.01, ...still },
              { offset: 0.001, opacity: 1, sc: 0.01, easing: EASE.out, ...still },
              { offset: 1, opacity: 1, sc: 1, ...still },
            ],
            delay: ms(CLOCK.bagel[0]), dur: ms(CLOCK.bagel[1] - CLOCK.bagel[0]),
          });
        }
        drawn.sort((a, b) => a.z - b.z).forEach((f) => pk.add(f));
        world.style.visibility = "hidden"; // the real canvas waits underneath, unpainted
        storm.push(pk.start());
      }
      if (bagelEl && !pk) {
        const grow = bagelEl.animate(
          [
            { offset: 0, opacity: 0, transform: "scale(0.01)" },
            { offset: 0.001, opacity: 1, transform: "scale(0.01)", easing: EASE.out },
            { offset: 1, opacity: 1, transform: "scale(1)" },
          ],
          { duration: ms(CLOCK.bagel[1] - CLOCK.bagel[0]), delay: ms(CLOCK.bagel[0]), fill: "backwards" },
        );
        storm.push(grow);
      }
      if (over) {
        built.cracks.forEach((c) =>
          storm.push(c.el.animate(
            [{ offset: 0, opacity: 1, transform: "scale(1)" }, { offset: 0.98, opacity: 1 }, { offset: 1, opacity: 0, transform: "scale(0.01)" }],
            { duration: ms(CLOCK.heal[1] - CLOCK.heal[0]), delay: ms(CLOCK.heal[0]), easing: EASE.in, fill: "forwards" },
          )),
        );
        storm.push(over.body.animate(
          [{ offset: 0, opacity: 1, transform: "scale(1)" }, { offset: 0.98, opacity: 1 }, { offset: 1, opacity: 0, transform: "scale(0.01)" }],
          { duration: ms(CLOCK.close[1] - CLOCK.close[0]), delay: ms(CLOCK.close[0]), easing: EASE.io, fill: "forwards" },
        ));
      }
      // from here each piece is held by its own flight; the still frame the
      // page before left can go (the canvas under it is the same cool white)
      root.classList.remove("gx-cave");
      document.getElementById("gx-cave-first")?.remove();
      const skip = () => storm.forEach((a) => a.finish());
      const skipOn = ["pointerdown", "wheel", "keydown"] as const;
      skipOn.forEach((ev) => window.addEventListener(ev, skip, { capture: true, once: true }));
      Promise.all(storm.map((a) => a.finished)).then(() => {
        skipOn.forEach((ev) => window.removeEventListener(ev, skip, { capture: true }));
        holeEl.remove();
        holeTop?.remove();
        ground.remove();
        if (bagelEl) bagelEl.style.transformOrigin = "";
        root.classList.remove("gx-cave-air");
        fit?.off();
        const settled = () => {
          markRunning(false); // it ran to the end (shape.ts: the safety switch)
          endTest();
          storming = false;
          holdFull = false; // ...and only now do the originals start to come in
          syncVideos();
        };
        if (!pk) return settled();
        // every piece has landed in the drawing: the real canvas comes back
        // under it, exactly where the drawing has it, and the drawing lifts off
        world.style.visibility = "";
        pk.lift().then(settled);
      }, () => {});
    };
    /* THE CAVE-IN, first half, from Everything itself (pressing EVERYTHING
       while here replays the way in, as pressing ABOUT on About does). The
       other pages take pictures of themselves to have pieces to drop
       (motion/cave/exit.ts); the canvas already is pieces, so the real ones
       fall, on the same clock and the same path:
         open    the bagel's own hole breaks open into the pit and the bagel
                 is drawn down into it (if the bagel is off screen, the pit
                 opens where the bagel will be once the page is back);
         fall    every piece on screen and the nav go in, nearest first;
         wash    the dots fade to the plain cool white, then the page loads
                 again and throws everything back out (runCave).
       A second press or Escape goes straight there. */
    let leaving: (() => void) | null = null;
    const caveSelf = (url: string) => {
      if (leaving) return;
      const slow = parseFloat(new URLSearchParams(window.location.search).get("slow") ?? "") || 1;
      const ms = (seconds: number) => seconds * 1000 * slow * PACE;
      const when = (t: number) => outAt(t) * slow, span = (t0: number, d: number) => when(t0 + d) - when(t0);
      const z = cam.z, vr = view.getBoundingClientRect(), w = window.innerWidth, h = window.innerHeight;
      const R = holeRadius(w, h), seed = 11, shape = makeShape(R, seed);
      const rimMax = Math.max(...shape.rim.map((p) => Math.hypot(p[0], p[1])));
      const own = { x: vr.left + cam.x + BAGEL_HOLE.x * z, y: vr.top + cam.y + BAGEL_HOLE.y * z };
      const onBagel = own.x > R && own.x < w - R && own.y > R && own.y < h - R;
      let hx = Math.round(own.x), hy = Math.round(own.y);
      if (!onBagel) {
        const navBottom = Math.max(56, document.querySelector(".wt-nav")?.getBoundingClientRect().bottom ?? 78);
        const o = openingCam(vr.width, vr.height, navBottom, window.matchMedia(PHONE_QUERY).matches, pieceBounds(live.current.pieces));
        hx = Math.round(vr.left + o.x + BAGEL_HOLE.x * o.z);
        hy = Math.round(vr.top + o.y + BAGEL_HOLE.y * o.z);
      }
      storming = true;
      markRunning(true);
      const endTest = beginTest("fall (Ev)");
      setSelected([]);
      const out: Animation[] = [];
      // the cool white the dots wash out to, under everything
      const wash = document.createElement("div");
      wash.setAttribute("aria-hidden", "true");
      wash.style.cssText = `position:absolute;inset:0;pointer-events:none;background:${PAPER};opacity:0`;
      // the pit, twice, as on the way back (see runCave): its body alone over
      // the canvas while the bagel goes down under it, then the whole of it
      // under the canvas, so the pieces fall into it in view
      const holeBox = (svg: SVGElement) => {
        const box = document.createElement("div");
        box.className = "gx-cave-hole";
        box.setAttribute("aria-hidden", "true");
        box.style.left = `${hx - vr.left}px`;
        box.style.top = `${hy - vr.top}px`;
        box.appendChild(svg);
        return box;
      };
      // (off desktop Chrome: one hole over the canvas, opened as a single
      // layer, the pieces sliding flat in under its rim; see runCave)
      const light = mode() !== "deep";
      const built = buildHole(shape), over = light ? null : buildHole(shape);
      over?.cracks.forEach((c) => c.el.remove());
      const holeEl = holeBox(built.svg), holeTop = over ? holeBox(over.svg) : null;
      view.insertBefore(wash, world);
      if (holeTop) {
        view.insertBefore(holeEl, world);
        world.after(holeTop);
      } else {
        world.after(holeEl);
      }
      // (the pocket-size one: the pieces are drawn, over the canvas and under the hole)
      const pk = pocketOn ? pocket(view) : null;
      if (pk) world.after(pk.el);
      const OPEN = 0.3, GONE = CLOCK.crack + 0.44; // the pit opens; the bagel is down it
      const opening = [{ offset: 0, opacity: 0, transform: "scale(0.01)" }, { offset: 0.02, opacity: 1, transform: "scale(0.01)", easing: EASE.out }, { offset: 1, opacity: 1, transform: "scale(1)" }];
      (over ? [built.body, over.body] : [holeEl]).forEach((el) =>
        out.push(el.animate(opening, { duration: ms(OPEN), delay: ms(CLOCK.crack), fill: "both" })),
      );
      if (holeTop) out.push(holeTop.animate([{ visibility: "visible" }, { visibility: "hidden" }], { duration: ms(GONE), easing: "steps(1, end)", fill: "both" }));
      if (over) built.cracks.forEach((c) => {
        const at = c.at + 0.14, total = at + 0.15, o = (t: number) => t / total, jump = "steps(1, end)";
        out.push(c.el.animate(
          [
            { offset: 0, opacity: 0, transform: "scale(0.01)" },
            { offset: o(at), opacity: 0, transform: "scale(0.01)" },
            { offset: o(at), opacity: 1, transform: "scale(0.01)", easing: jump },
            { offset: o(at + 0.05), opacity: 1, transform: "scale(0.4)", easing: jump },
            { offset: o(at + 0.1), opacity: 1, transform: "scale(0.74)", easing: jump },
            { offset: 1, opacity: 1, transform: "scale(1)" },
          ],
          { duration: ms(total), fill: "both" },
        ));
      });
      const bagelEl = world.querySelector<HTMLElement>(".gx-bagel");
      if (bagelEl && pk) {
        // drawn: down its own hole if that is on screen, else it only fades
        const q = bagelEl.getBoundingClientRect();
        const art = stack(Array.from(bagelEl.querySelectorAll("img")), q.width, q.height);
        const still = { tx: 0, ty: 0, tilt: 0 };
        pk.add({
          sprite: art?.c ?? null, pad: 0, cx: q.left + q.width / 2 - vr.left, cy: q.top + q.height / 2 - vr.top, w: q.width, h: q.height,
          ox: (BAGEL_HOLE.fx - 0.5) * q.width, oy: (BAGEL_HOLE.fy - 0.5) * q.height, flat: true, turn: 0,
          poses: onBagel
            ? [{ offset: 0, opacity: 1, sc: 1, easing: EASE.in, ...still }, { offset: 0.98, opacity: 1, sc: 0.02, ...still }, { offset: 1, opacity: 0, sc: 0.01, ...still }]
            : [{ offset: 0, opacity: 1, sc: 1, ...still }, { offset: 1, opacity: 0, sc: 1, ...still }],
          delay: ms(CLOCK.crack), dur: onBagel ? ms(GONE - CLOCK.crack - 0.02) : ms(0.3),
        });
      } else if (bagelEl && onBagel) {
        bagelEl.style.transformOrigin = `${BAGEL_HOLE.fx * 100}% ${BAGEL_HOLE.fy * 100}%`;
        out.push(bagelEl.animate(
          [{ offset: 0, opacity: 1, transform: "scale(1)", easing: EASE.in }, { offset: 0.98, opacity: 1, transform: "scale(0.02)" }, { offset: 1, opacity: 0, transform: "scale(0.01)" }],
          { duration: ms(GONE - CLOCK.crack - 0.02), delay: ms(CLOCK.crack), fill: "both" },
        ));
      } else if (bagelEl) {
        out.push(bagelEl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms(0.3), delay: ms(CLOCK.crack), fill: "both" }));
      }
      // the pieces on screen and the nav: let go as the collapse reaches them
      const falling = cast().filter((t) => t.right > 0 && t.bottom > 0 && t.left < w && t.top < h);
      const fit = fitOn();
      if (fit) falling.forEach((t) => { if (t.unit !== 1) t.unit = 1 / fit.k; });
      const far = Math.max(1, ...falling.map((t) => farCorner(t, hx, hy)));
      let last = GONE;
      const drawn: (Flyer & { z: number })[] = [];
      falling.forEach((t) => {
        const cx = (t.left + t.right) / 2, cy = (t.top + t.bottom) / 2;
        const near = Math.hypot(Math.max(t.left - hx, 0, hx - t.right), Math.max(t.top - hy, 0, hy - t.bottom));
        // (a piece lying over the pit has nothing under it: it goes by its middle)
        const d = (near < rimMax ? Math.min(farCorner(t, hx, hy), Math.hypot(cx - hx, cy - hy)) : farCorner(t, hx, hy)) / far;
        const t0 = releaseAt(d), D = fallFor(d);
        last = Math.max(last, t0 + D);
        const how = { flat: t.flat, w: t.right - t.left, h: t.bottom - t.top, dur: D, unit: t.unit };
        if (pk && t.piece) return void drawn.push(flyer(t, vr, z, fallPath(cx - hx, cy - hy, R, how), when(t0), span(t0, D)));
        out.push(t.el.animate(fallFrames(cx - hx, cy - hy, R, how), { duration: span(t0, D), delay: when(t0), easing: "linear", fill: "both" }));
      });
      if (pk) {
        // the drawing takes the canvas's place, piece for piece, before anything moves
        drawn.sort((a, b) => a.z - b.z).forEach((f) => pk.add(f));
        out.push(pk.start());
        world.style.visibility = "hidden";
      }
      out.push(wash.animate([{ opacity: 0 }, { opacity: 1 }], { duration: span(0.73, Math.max(0.6, last - 0.93)), delay: when(0.73), easing: "ease-in-out", fill: "both" }));

      // nothing moves the canvas meanwhile; a second press or Escape goes straight there
      const block = (e: Event) => { e.preventDefault(); e.stopPropagation(); };
      const began = performance.now();
      const hurry = (e: Event) => {
        block(e);
        if (performance.now() - began > 350) go();
      };
      const onKey = (e: KeyboardEvent) => {
        block(e);
        if (e.key === "Escape") go();
      };
      window.addEventListener("wheel", block, { passive: false, capture: true });
      window.addEventListener("touchmove", block, { passive: false, capture: true });
      window.addEventListener("pointerdown", hurry, true);
      window.addEventListener("keydown", onKey, true);
      const unlock = () => {
        window.removeEventListener("wheel", block, { capture: true });
        window.removeEventListener("touchmove", block, { capture: true });
        window.removeEventListener("pointerdown", hurry, true);
        window.removeEventListener("keydown", onKey, true);
      };
      let gone = false;
      const go = () => {
        if (gone) return;
        gone = true;
        window.clearTimeout(timer);
        out.forEach((a) => { try { a.finish(); } catch { /* fine */ } });
        holeTop?.remove();
        markRunning(false); // this half ran to the end (shape.ts: the safety switch)
        endTest();
        const still = buildHole(shape).svg.outerHTML;
        const note: CaveHandoff = {
          at: Date.now(), hx, hy, R, seed, w, h,
          svg: `<div style="position:absolute;inset:0;background:${PAPER}"></div><div style="position:absolute;left:${hx}px;top:${hy}px;width:0;height:0">${still}</div>`,
        };
        try { sessionStorage.setItem(CAVE_KEY, JSON.stringify(note)); } catch { /* private mode: the usual entrance plays */ }
        (window as unknown as { __caveGo?: boolean }).__caveGo = true;
        window.location.assign(url);
      };
      const timer = window.setTimeout(go, when(last) + 40);
      // (if the page is ever shown again as it was left, put it back together)
      leaving = () => {
        window.clearTimeout(timer);
        unlock();
        out.forEach((a) => a.cancel());
        [wash, holeEl, holeTop].forEach((el) => el?.remove());
        pk?.destroy();
        world.style.visibility = "";
        fit?.off();
        markRunning(false);
        if (bagelEl) bagelEl.style.transformOrigin = "";
        (window as unknown as { __caveGo?: boolean }).__caveGo = false;
        storming = false;
        leaving = null;
      };
    };
    const selfClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || !url.pathname.startsWith("/everything")) return;
      // (from the keyboard, or with less motion asked for, the page just loads again)
      // (...and where a cave-in was once cut short, it stays off: shape.ts)
      if (e.detail === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if ((window as unknown as { __gxCaveOff?: boolean }).__gxCaveOff) return;
      e.preventDefault();
      e.stopPropagation();
      if (storming && !leaving) return void window.location.assign(url.href);
      // (?slow= and a ?cave= test choice ride along)
      const here = new URLSearchParams(window.location.search);
      ["slow", "cave"].forEach((key) => {
        const v = here.get(key);
        if (v && !url.searchParams.has(key)) url.searchParams.set(key, v);
      });
      caveSelf(url.href);
    };
    document.addEventListener("click", selfClick, true);
    const selfShow = (e: PageTransitionEvent) => { if (e.persisted) leaving?.(); };
    window.addEventListener("pageshow", selfShow);
    // leaving the page in the ordinary way, even mid-flight, is not a failure
    const selfHide = () => markRunning(false);
    window.addEventListener("pagehide", selfHide);
    const runStorm = () => {
      const root = document.documentElement;
      const caveNote = (window as unknown as { __gxCave?: CaveHandoff }).__gxCave;
      if (caveNote && root.classList.contains("gx-cave")) {
        (window as unknown as { __gxCave?: CaveHandoff }).__gxCave = undefined;
        runCave(caveNote);
        return;
      }
      holdFull = false; // (no cave-in after all: nothing to wait for)
      if (!root.classList.contains("gx-storm")) { root.classList.remove("gx-storm-air"); return; }
      const slow = parseFloat(getComputedStyle(root).getPropertyValue("--gx-slow")) || 1;
      /* THE RIPPLE (phones and portrait tablets). On a small screen 60 tiles
         crossing it read as busy rather than as a story, and Safari can't keep
         the page you came from on screen to be swept away. So here it's the
         case studies' entrance, told from the bagel: it settles first, the
         dots wash in, then every piece rises into its place (16px, .72s, the
         site's settle curve) in a wave outward from the bagel, by distance.
         ~1.4s in all. Any tap or key lands it at once. */
      if (root.classList.contains("gx-storm-ripple")) {
        const settle = "cubic-bezier(0.22, 0.61, 0.36, 1)"; // --ease-settle
        storming = true;
        syncVideos();
        const sky = document.createElement("div");
        sky.className = "gx-storm-sky";
        view.insertBefore(sky, world);
        const ground = document.createElement("div");
        ground.className = "gx-storm-ground";
        ground.style.backgroundSize = view.style.backgroundSize;
        ground.style.backgroundPosition = view.style.backgroundPosition;
        view.insertBefore(ground, world);
        const groundIn = ground.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600 * slow, delay: 80 * slow, easing: settle, fill: "both" });
        storm.push(groundIn);
        const bagelEl = world.querySelector<HTMLElement>(".gx-bagel");
        if (bagelEl) storm.push(bagelEl.animate([{ opacity: 0, transform: "scale(0.96)" }, { opacity: 1, transform: "none" }], { duration: 720 * slow, easing: settle, fill: "backwards" }));
        const ps = live.current.pieces;
        const far = Math.max(1, ...ps.map((q) => Math.hypot(q.x, q.y)));
        ps.forEach((p) => {
          const el = world.querySelector<HTMLElement>(`.gx-piece[data-id="${p.id}"]`);
          if (!el) return;
          const delay = (120 + 550 * (Math.hypot(p.x, p.y) / far)) * slow;
          // the rise is in screen pixels; the world is scaled by the camera
          storm.push(el.animate([{ opacity: 0, transform: `translateY(${(16 / cam.z).toFixed(1)}px)` }, { opacity: 1, transform: "none" }], { duration: 720 * slow, delay, easing: settle, fill: "backwards" }));
        });
        root.classList.remove("gx-storm");
        const skip = () => storm.forEach((a) => a.finish());
        const skipOn = ["pointerdown", "wheel", "keydown"] as const;
        skipOn.forEach((ev) => window.addEventListener(ev, skip, { capture: true, once: true }));
        Promise.all(storm.map((a) => a.finished)).then(() => {
          skipOn.forEach((ev) => window.removeEventListener(ev, skip, { capture: true }));
          root.classList.remove("gx-storm-air");
          ground.remove();
          sky.remove();
          storming = false;
          syncVideos();
        }, () => {});
        return;
      }
      /* THE GRAVITY WELL. Each piece stays in its own vertical slice through
         the bagel (no circling): from above it's a starburst collapsing and
         bursting. One clock for everyone, so the field reads as one motion;
         a piece's size sets how far it travels in depth (big ones fly lower
         and dip less, so they move calmer). Everyone starts on one circle
         beyond the screen's corners.
         No blur on the pieces: filtering ~60 moving tiles (videos among
         them) cost 66-149ms frames right after the orb, where it felt laggy. */
      /* Thought of as physics, on one clock for everyone. Flung in: all the
         momentum is at the start, and it bleeds away as the pieces cross the
         top of the C (close, looming, slowing) for about three quarters of
         the way in. Then they tip over the crest and fall downhill into the
         well, gravity speeding them up again, through the orb (at MID, one
         instant for all) and out on that momentum, dipping a little deeper
         before they rise into place, slowing only over the last stretch. */
      const table = (v: (x: number) => number) => {
        const G = [0];
        for (let i = 1; i <= 400; i++) G.push(G[i - 1] + v((i - 0.5) / 400));
        return (x: number) => { const f = Math.min(400, Math.max(0, x * 400)), i = Math.min(399, Math.floor(f)); return (G[i] + (G[i + 1] - G[i]) * (f - i)) / G[400]; };
      };
      const CREST = 0.72; // share of the way-in spent slowing before the plunge
      const inU = table((x) => x < CREST ? 0.28 + 0.72 * Math.pow(1 - x / CREST, 1.6) : 0.28 + 0.8 * Math.pow((x - CREST) / (1 - CREST), 2));
      // out: fastest the moment it leaves the orb, then only ever slowing (no
      // brake and pick-up again), in a long glide you can watch: ~0.6s to
      // be nearly there, ~0.85s to settle
      const outW = table((x) => Math.pow(1 - x, 1.6));
      const T = 1950 * slow, MID = 0.458; // the orb at ~890ms; ~1050ms out
      const along = (t: number) => t <= MID ? 0.5 * inU(t / MID) : 0.5 + 0.5 * outW((t - MID) / (1 - MID));
      const r = view.getBoundingClientRect();
      const eye = { x: cam.x, y: cam.y }; // the bagel's centre on screen
      root.style.setProperty("--gx-eye-x", `${(eye.x / r.width) * 100}%`);
      root.style.setProperty("--gx-eye-y", `${(eye.y / r.height) * 100}%`);
      const rOrb = Math.min(r.width, r.height) * 0.12; // the orb: just closed, no gap in the middle, not crushed
      // everyone starts on one circle round the bagel, just beyond the
      // screen's furthest corner, so the field falls in as a ring, not a box
      const R0 = Math.hypot(Math.max(eye.x, r.width - eye.x), Math.max(eye.y, r.height - eye.y)) + 120;
      storming = true;
      syncVideos();
      /* FLAT (Safari and every phone): the same flight drawn in 2D. Each
         piece's path is already worked out on screen, so depth only ever
         changed its size; here that size is a plain scale, with the loom
         capped on small screens, and the bagel kept under the pieces by
         stacking order instead of by sitting at the back of a 3D scene. In
         real 3D, WebKit draws every looming tile (and the bagel, pushed back
         and scaled up) as a huge layer, which ran iPhones out of memory. */
      const FLAT = root.classList.contains("gx-storm-flat");
      if (!FLAT) {
        view.style.perspective = "1400px";
        view.style.perspectiveOrigin = `${eye.x}px ${eye.y}px`;
        world.style.transformStyle = "preserve-3d";
      }
      const LOOM_MAX = FLAT && Math.min(r.width, r.height) < 700 ? 1.6 : 2.6; // the closest a piece comes, as a size
      // the portfolio's cool white behind the storm, as its own layer under the ground
      const sky = document.createElement("div");
      sky.className = "gx-storm-sky";
      view.insertBefore(sky, world);
      // the ground, as its own layer, so it can wash in
      const ground = document.createElement("div");
      ground.className = "gx-storm-ground";
      ground.style.backgroundSize = view.style.backgroundSize;
      ground.style.backgroundPosition = view.style.backgroundPosition;
      ground.style.opacity = "0";
      view.insertBefore(ground, world);
      const hash = (str: string) => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return ((h >>> 0) % 1000) / 1000; };
      const ps = live.current.pieces;
      // weight from on-screen area, 0 (lightest) .. 1 (heaviest), smoothly
      const areas = ps.map((p) => Math.sqrt(p.w * p.h));
      const aMin = Math.min(...areas), aMax = Math.max(...areas);
      const rFar = Math.max(1, ...ps.map((q) => Math.hypot(q.x, q.y) * cam.z));
      /* Where every piece's edges are on screen through the flight, sampled
         on the shared clock, so the page masks can follow the pack exactly:
         its inner edge on the way in, its outer edge on the way out. */
      const K = 96, inner: number[][] = Array.from({ length: K + 1 }, () => []), outer: number[][] = Array.from({ length: K + 1 }, () => []);
      ps.forEach((p, i) => {
        const el = world.querySelector<HTMLElement>(`.gx-piece[data-id="${p.id}"]`);
        if (!el) return;
        const wgt = (areas[i] - aMin) / Math.max(1, aMax - aMin);
        const sx = eye.x + p.x * cam.z, sy = eye.y + p.y * cam.z;
        let dx = sx - eye.x, dy = sy - eye.y;
        const rF = Math.hypot(dx, dy);
        if (rF < 1) { const a = hash(p.id) * Math.PI * 2; dx = Math.cos(a); dy = Math.sin(a); }
        const ux = dx / (Math.hypot(dx, dy) || 1), uy = dy / (Math.hypot(dx, dy) || 1);
        const r0 = Math.max(R0, rF + 60);
        // its place in the orb: anywhere across the disc, at its own depth, so
        // together they make a solid ball
        const k1 = hash(p.id + "r"), k2 = hash(p.id + "z");
        const rB = rOrb * Math.sqrt(k1);
        const zTop = 900 * (1 - 0.35 * wgt); // close enough to loom (about 2.5x) at the top of the C
        const zBot = -560 * (1 - 0.45 * wgt) + rOrb * 1.6 * Math.sqrt(1 - k1) * (k2 < 0.5 ? -1 : 1);
        // everyone meets in the orb at one instant, but the far ones land a
        // touch later than the near ones (they've further to go), so the
        // field lands as a ripple, not a stamp
        const Ti = T * (0.93 + 0.07 * (rF / rFar)), end = Ti / T;
        const PERSP = 1400, half = 0.5 * Math.sqrt(p.w * p.h) * cam.z;
        // where it is at tt (a share of the shared clock, T)
        const at = (tt: number) => {
          const g = tt <= MID ? along(tt) : 0.5 + 0.5 * outW(Math.min(1, (tt - MID) / (end - MID)));
          let rad, z, tilt;
          if (g <= 0.5) {
            const u = g / 0.5; // down the side of the well
            rad = r0 + (rB - r0) * u;
            // the C: still climbing as it comes in, cresting about three
            // quarters of the way, then down the slope to the bottom
            const h = u < CREST ? 0.45 + 0.55 * Math.sin((Math.PI / 2) * (u / CREST)) : (() => { const x = (u - CREST) / (1 - CREST); return (1 - x) * (1 - x) * (1 + 2 * x); })();
            z = zBot + (zTop - zBot) * h;
            tilt = 16 * Math.sin(Math.PI * u);
          } else {
            const w = (g - 0.5) / 0.5; // and straight back out, gliding into place
            rad = rB + (rF - rB) * w;
            // carried on down, deeper, then up into place from below; it leaves
            // the bottom level, as it arrived, so the C has no kink
            z = zBot * (1 - w) * (1 - w) * (1 + 2 * w) - 6 * Math.abs(zBot) * w * w * (1 - w) * (1 - w);
            tilt = -10 * Math.sin(Math.PI * w);
          }
          const depth = Math.max(0, -z / Math.abs(zBot || 1));
          const sc = 1 - 0.35 * depth;
          // rad is where it should be ON SCREEN; perspective pushes anything
          // near the camera out from the eye (and pulls deep things in), so
          // undo that, letting depth change only its size, never its path
          const zc = Math.min(z, PERSP - 250);
          return { rad, zc, sc, tilt, size: half * sc * (PERSP / (PERSP - zc)) };
        };
        for (let k = 0; k <= K; k++) {
          const q = at(k / K);
          inner[k].push(q.rad - q.size);
          outer[k].push(q.rad + q.size);
        }
        const frames: Keyframe[] = [];
        const N = 64;
        for (let k = 0; k < N; k++) {
          const t = k / (N - 1), tt = t * end;
          const { rad, zc, sc, tilt } = at(tt);
          const op = Math.min(1, tt / 0.07);
          let kf: Keyframe;
          if (FLAT) {
            // where perspective would have drawn it, and how big
            const near = Math.min(LOOM_MAX, PERSP / (PERSP - zc));
            const px = eye.x + ux * rad, py = eye.y + uy * rad;
            const ox = (px - sx) / cam.z, oy = (py - sy) / cam.z;
            // the 3D lean, as a slight turn toward its line of travel
            const turn = (tilt * 0.35) * (ux >= 0 ? 1 : -1);
            kf = { offset: t, opacity: op, transform: `translate(${ox.toFixed(1)}px, ${oy.toFixed(1)}px) rotate(${turn.toFixed(2)}deg) scale(${(sc * near).toFixed(3)})` };
          } else {
            const radW = (rad * (PERSP - zc)) / PERSP;
            const px = eye.x + ux * radW, py = eye.y + uy * radW;
            const ox = (px - sx) / cam.z, oy = (py - sy) / cam.z;
            kf = { offset: t, opacity: op, transform: `translate3d(${ox.toFixed(1)}px, ${oy.toFixed(1)}px, ${zc.toFixed(1)}px) rotate3d(${(-uy).toFixed(3)}, ${ux.toFixed(3)}, 0, ${tilt.toFixed(1)}deg) scale(${sc.toFixed(3)})` };
          }
          frames.push(kf);
        }
        storm.push(el.animate(frames, { duration: Ti, easing: "linear", fill: "backwards" }));
      });
      /* The new page comes in the way the old one went out, mirrored: a
         circle opening from the orb behind the pieces as they fly out,
         revealing the dots (and, at its centre, the bagel), reaching the
         furthest corner as they land. Nothing at all until the orb. */
      const Rc = Math.hypot(Math.max(eye.x, r.width - eye.x), Math.max(eye.y, r.height - eye.y));
      const outAt = (t: number) => Math.max(0, (along(t) - 0.5) / 0.5);
      const pct = (xs: number[], q: number) => { const v = [...xs].sort((m, n) => m - n); return v[Math.min(v.length - 1, Math.floor(q * v.length))] ?? 0; };
      const sample = (rows: number[][], q: number, t: number) => { const f = Math.min(K, Math.max(0, t * K)), i = Math.min(K - 1, Math.floor(f)); const a = pct(rows[i], q), b = pct(rows[i + 1], q); return a + (b - a) * (f - i); };
      // its edge rides the outer edge of the pack as it flies out (as the old
      // page's rode its inner edge coming in), then reaches the corners as
      // they settle
      const ring = (t: number) => { if (t <= MID) return 0; const w = outAt(t); return Math.max(0, sample(outer, 0.85, t)) + Math.max(0, Rc * 1.02 - rFar) * w ** 4; };
      const ringFrames = (toClip: (rad: number) => Keyframe, size: (t: number) => number = ring) => {
        const out: Keyframe[] = [];
        for (let k = 0; k <= 60; k++) { const t = MID + ((1 - MID) * k) / 60; out.push({ offset: k / 60, ...toClip(size(t)) }); }
        return out;
      };
      const opts = { duration: (1 - MID) * T, delay: MID * T, easing: "linear", fill: "backwards" as const };
      const bagelEl = world.querySelector<HTMLElement>(".gx-bagel");
      if (bagelEl) {
        /* it sits at the very back of the well for the storm (scaled up so it
           looks exactly as it will), so the pieces pass in front of it */
        const w0 = bagelEl.getBoundingClientRect().width;
        // how far its furthest part (the speech bubble included) reaches from its centre
        const bc = bagelEl.getBoundingClientRect(), bcx = bc.left + bc.width / 2, bcy = bc.top + bc.height / 2;
        const rFull = 1.02 * Math.max(...[bagelEl, ...bagelEl.querySelectorAll<HTMLElement>("*")].map((n) => { const q = n.getBoundingClientRect(); return q.width ? Math.max(Math.hypot(q.left - bcx, q.top - bcy), Math.hypot(q.right - bcx, q.top - bcy), Math.hypot(q.left - bcx, q.bottom - bcy), Math.hypot(q.right - bcx, q.bottom - bcy)) : 0; }));
        if (FLAT) bagelEl.style.zIndex = "-1"; // under every piece
        else {
          bagelEl.style.transform = "translateZ(-1600px)";
          const w1 = bagelEl.getBoundingClientRect().width;
          bagelEl.style.transform = w0 && w1 ? `translateZ(-1600px) scale(${(w0 / w1).toFixed(4)})` : "";
        }
        /* the bagel is the payoff: it starts growing open from its centre
           just after the orb (once the pack is 10% of the way out) and takes
           the whole flight to do it, a steadier grow than the pack's sharp
           burst, so it opens alongside them and is whole as they land */
        const rMid = (() => { const v = ps.map((q) => Math.hypot(q.x, q.y) * cam.z).sort((m, n) => m - n); return v[Math.floor(v.length / 2)] || rFull * 2; })(); // the median piece's clock (below)
        const at0 = 0.1; // how far out the pack is when it starts
        let from = 0;
        while (from < 1 && outW(from) < at0) from += 0.0025;
        const grow: Keyframe[] = [];
        // a steady ease-out over its own span (not the pack's front-loaded
        // curve, which from this early would fling it open and then crawl)
        for (let k = 0; k <= 40; k++) { const s = k / 40, q = 1 - Math.pow(1 - s, 2); grow.push({ offset: k / 40, clipPath: `circle(${((rFull * q) / cam.z).toFixed(1)}px at 50% 50%)` }); }
        // on the median piece's own clock (it lands with its neighbours, not
        // with the furthest piece)
        const endM = 0.93 + 0.07 * (rMid / rFar);
        const bStart = MID + from * (endM - MID);
        const bg = storm.push(bagelEl.animate(grow, { duration: (endM - bStart) * T, delay: bStart * T, easing: "linear", fill: "backwards" }));
        storm[bg - 1].finished.then(() => { bagelEl.style.transform = ""; bagelEl.style.zIndex = ""; }, () => {});
      }
      /* The page being left is swept away by the pieces as they come in: it
         stays in place, at full strength, but only what's inside their
         closing ring is left, until it's gone as they reach the orb. Then,
         on the way down and out, the new page washes in behind them. This
         takes over the view transition's own animation, and ends it at the
         orb (the old page is gone by then): from there the cool white is the
         new page's own layer. */
      const oldPage = document.getAnimations().find((a) => (a.effect as KeyframeEffect | null)?.pseudoElement === "::view-transition-old(root)");
      if (oldPage?.effect instanceof KeyframeEffect) {
        const cx = r.left + eye.x, cy = r.top + eye.y;
        const wash: Keyframe[] = [];
        for (let k = 0; k <= 64; k++) {
          const t = (k / 64) * MID, u = Math.min(1, along(t) / 0.5); // how far in the pieces are
          const rad = t >= MID ? 0 : Math.max(0, sample(inner, 0.3, t)); // the inner edge of the pack
          // a clip, not a mask: it animates cheaply (a gradient mask or a blur
          // over the whole page stalls the frame), and its edge stays hidden
          // under the front of the pieces
          wash.push({ offset: k / 64, opacity: u < 1 ? 1 : 0, clipPath: `circle(${Math.max(0, rad).toFixed(1)}px at ${cx.toFixed(0)}px ${cy.toFixed(0)}px)` });
        }
        oldPage.effect.setKeyframes(wash);
        oldPage.effect.updateTiming({ delay: 0, duration: MID * T, easing: "linear", fill: "both" });
        oldPage.currentTime = 0;
      }
      // While the transition runs, the cool white behind everything is the
      // transition's own (gallery.css); the page's sky takes over just before
      // the orb (the old page is all but gone by then). Both switch in the
      // same instant: the sky comes on AND the transition's backing turns
      // plain white, so the sky's cool white multiplied over it stays the
      // same cool white. (Switched separately, a frame of overlap multiplied
      // the two cool whites into a grey flash.)
      if (oldPage) {
        sky.style.opacity = "0";
        stormTimers.push(window.setTimeout(() => {
          sky.style.opacity = "1";
          root.classList.add("gx-sky-on");
        }, Math.max(0, MID * T - 50)));
      }
      ground.style.opacity = "1";
      const groundIn = ground.animate(ringFrames((rad) => ({ clipPath: `circle(${rad.toFixed(1)}px at ${eye.x.toFixed(1)}px ${eye.y.toFixed(1)}px)` })), { ...opts, fill: "both" });
      storm.push(groundIn);
      groundIn.finished.then(() => root.classList.remove("gx-storm-air"), () => root.classList.remove("gx-storm-air"));
      root.classList.remove("gx-storm"); // from here each piece is held by its own flight (the page stays see-through until the ground is in)
      const vt = (window as unknown as { __gxStormVT?: { skipTransition(): void } }).__gxStormVT;
      const skip = () => { storm.forEach((a) => a.finish()); vt?.skipTransition(); };
      const skipOn = ["pointerdown", "wheel", "keydown"] as const;
      skipOn.forEach((ev) => window.addEventListener(ev, skip, { capture: true, once: true }));
      Promise.all(storm.map((a) => a.finished)).then(() => {
        skipOn.forEach((ev) => window.removeEventListener(ev, skip, { capture: true }));
        ground.remove();
        sky.remove();
        root.classList.remove("gx-sky-on");
        view.style.perspective = "";
        world.style.transformStyle = "";
        storming = false;
        syncVideos();
      }, () => {});
    };
    // started a moment later (and cancelled on cleanup), so a re-run of this
    // effect can't start it twice; in dev it waits for layout.json
    // Prerendered on hover (stormHandoff.ts): hold it until the page is
    // actually shown, or it would play out unseen in the background.
    const shown = () =>
      (document as Document & { prerendering?: boolean }).prerendering
        ? new Promise<void>((done) => document.addEventListener("prerenderingchange", () => done(), { once: true }))
        : Promise.resolve();
    // ...and until the canvas's light copies are ready to draw (capped), so
    // pieces never fly or rise in half-loaded
    const imagesReady = () =>
      Promise.race([
        Promise.all(
          Array.from(world.querySelectorAll<HTMLImageElement>(".gx-piece img")).concat(Array.from(posters.values())).map((i) => (i.decode ? i.decode().catch(() => {}) : Promise.resolve()))
        ),
        new Promise((done) => window.setTimeout(done, 1200)), // a cold, direct arrival: wait a beat, not a long blank pause
      ]);
    stormTimer = window.setTimeout(() => layoutReady.current.then(shown).then(imagesReady).then(() => requestAnimationFrame(runStorm)), 0);
    // Until the visitor moves the canvas, any change in its size (Safari's
    // toolbars settling after a reload, a resized window) re-frames the
    // opening view; after that, it only redraws
    const ro = new ResizeObserver(() => (touched.current || storming ? draw() : fit()));
    ro.observe(view);
    view.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("pointermove", track);
    view.addEventListener("pointerdown", down);
    view.addEventListener("pointermove", move);
    view.addEventListener("pointerup", up);
    view.addEventListener("pointercancel", up);
    window.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("click", selfClick, true);
      window.removeEventListener("pageshow", selfShow);
      window.removeEventListener("pagehide", selfHide);
      leaving?.();
      window.clearTimeout(stormTimer);
      stormTimers.forEach((t) => window.clearTimeout(t));
      document.documentElement.classList.remove("gx-sky-on");
      // (gx-cave-air is left alone unless the cave-in ran: in dev, Strict Mode
      // runs this cleanup once before the first real mount)
      if (caved) {
        document.documentElement.classList.remove("gx-cave-air");
        view.querySelectorAll(".gx-cave-hole").forEach((el) => el.remove());
      }
      storm.forEach((a) => a.cancel());
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

  // turning the phone swaps arrangements: frame the new one
  useEffect(() => {
    touched.current = false;
    fitRef.current();
  }, [portrait]);

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
                {sel.length === 1 &&
                  (renaming === sel[0].id ? (
                    <NameField
                      initial={renames[sel[0].id] ?? sel[0].title}
                      onDone={(v) => {
                        const id = sel[0].id;
                        setRenaming(null);
                        if (v === null) return;
                        const name = v.trim();
                        setRenames((r) => {
                          const n = { ...r };
                          if (!name || name === sel[0].title) delete n[id];
                          else n[id] = name;
                          return n;
                        });
                      }}
                    />
                  ) : (
                    <span className="gx-sel-name" onDoubleClick={() => setRenaming(sel[0].id)}>
                      {renames[sel[0].id] ?? sel[0].title}
                    </span>
                  ))}
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
          poster={p.poster ? thumbOf(p.poster) : undefined}
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
      <img
        src={thumbOf(p.src)}
        data-full={p.src}
        alt={p.title}
        decoding="async"
        draggable={false}
        // a missing light copy falls back to the original
        onError={(e) => { const i = e.currentTarget; if (i.src.includes("/gallery/thumb/")) i.src = p.src; }}
      />
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

/* The rename field: all of the name selected, ready to type over (as Figma
   does). Enter, Esc or clicking away all keep it, as in Figma. 40
   characters. */
function NameField({ initial, onDone }: { initial: string; onDone: (v: string | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);
  const finish = (v: string | null) => {
    if (done.current) return;
    done.current = true;
    onDone(v);
  };
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  return (
    <input
      ref={ref}
      className="gx-sel-name gx-sel-name--edit"
      defaultValue={initial}
      maxLength={40}
      spellCheck={false}
      aria-label="Rename"
      size={Math.max(4, initial.length + 1)}
      onInput={(e) => (e.currentTarget.size = Math.max(4, e.currentTarget.value.length + 1))}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter" || e.key === "Escape") finish(e.currentTarget.value);
      }}
      onBlur={(e) => finish(e.currentTarget.value)}
      onPointerDown={(e) => e.stopPropagation()}
    />
  );
}
