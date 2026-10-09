# 001 — Make the Home and About entrances "barely there" (the case-study recipe)

- **Status**: DONE (2026-10-08)
- **Commit**: 540fe469
- **Severity**: HIGH
- **Category**: Purpose & frequency · Easing & duration · Performance (+ missed opportunity: posters fade on their own image load)
- **Estimated scope**: 1 new file, 6 edited files, ~120 lines

## Problem

Measured from navigation start in headless Chrome at 1440×900:

| Page | First motion | All settled | Moving elements |
| --- | --- | --- | --- |
| /mixr/ (target) | 96 ms | 0.88 s | 2 |
| / (Home) | 331 ms | 1.53 s | 11 |
| /about/ | 249 ms | 1.73 s | 7 |

1. Too many movers. `src/pages/home/Home.tsx:46-51` queues title, 4 sub lines (rippling 60 ms), contact row and 5 posters + 2 placards (rippling 40 ms); `src/pages/about/About.tsx:75-82` queues title (one beat per line), paragraphs, portrait, table rows.
2. Hide-then-wait: `src/motion/entrance.ts` hides everything in a layout effect, then waits for `fontsReady()` (≤500 ms) / image `decoded()` before starting — a blank page after first paint (Home +200 ms, About +165 ms).
3. JS per-element Motion animations with the `y` shorthand (`entrance.ts:61`) run on the main thread during the busiest part of load.
4. Curves: fade `[0.25,0.1,0.25,1]` (CSS `ease`) on an entrance, rise `[0.16,1,0.3,1]`; About's 2-line title holds 2 beats (+300 ms before the body).

The case studies (`public/mixr/index.html:177-181`, trigger at `:2182-2185`) do this instead:

```css
.rv{opacity:0;transform:translateY(16px);
  transition:opacity .72s cubic-bezier(.22,.61,.36,1),transform .72s cubic-bezier(.22,.61,.36,1)}
.rv.in{opacity:1;transform:none}
.rv.d1{transition-delay:.09s}
```
```js
new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
  { rootMargin: "0px 0px -10% 0px", threshold: .06 });
```

## Target

Copy that recipe exactly. Two groups per page, CSS transitions only, nothing waits on fonts.

- Tokens (plan 004 adds them; this plan uses them): `--ease-enter: cubic-bezier(.22,.61,.36,1)`, `--enter-dur: .72s`, `--enter-rise: 16px`, `--enter-step: .09s`.
- Global rule (in `src/styles/tokens.css`, after `:root`):
```css
html .enter { opacity: 0; transform: translateY(var(--enter-rise));
  transition: opacity var(--enter-dur) var(--ease-enter), transform var(--enter-dur) var(--ease-enter); }
html .enter.is-in { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) {
  html .enter { transform: none; transition: opacity .2s ease; }
}
```
(`html` raises specificity over `.gl-card { transition: none }` in gallery.css and `a { transition: .5s }` in app.css.)
- Home: `.hero-block` is ONE block (title + sub + contacts). The poster wall: each placard and card is its own `.enter`, revealed when it is in view AND (cards) its own `<img>` has loaded, with `transition-delay` = `--enter-step` (if it reveals with the hero) + 0.04 s × its index in the wall. A card whose image never loads still reveals after 1.2 s.
- About: `.ab-text` is ONE block; `.ab-portrait` is the second, delay `--enter-step`, gated on its image like a poster. Stacked on phones it simply reveals when scrolled to.
- Delete `src/motion/entrance.ts`; nothing else imports it.

## Steps

1. Create `src/motion/reveal.ts`: `revealOnView(items: { el: HTMLElement; delay?: number; image?: HTMLImageElement | null }[])` — one `IntersectionObserver` (`rootMargin: "0px 0px -10% 0px", threshold: 0.06`); on intersect, wait for `image` (`complete` or `load`/`error`, capped 1200 ms), set `el.style.transitionDelay = \`${delay}s\``, add `is-in`, unobserve. Returns a disconnect function. Under reduced motion it still adds `is-in` (CSS keeps the fade, drops the rise).
2. `Home.tsx`: add `enter` to `.hero-block`'s className; replace the entrance `useLayoutEffect` with a `useEffect` that calls `revealOnView` for the hero block (delay 0) and every `.gl-placard`/`.gl-card` (delay as in Target; image = the card's `.gl-print img`; a placard uses its group's first card's image).
3. `PosterGallery.tsx`: add `enter` to `.gl-placard` and `.gl-card` classNames.
4. `About.tsx`: add `enter` to `.ab-text` and `.ab-portrait`; replace the entrance effect with `revealOnView([{ el: text }, { el: portrait, delay: 0.09, image }])`.
5. Delete `src/motion/entrance.ts`; update `tests/painted-title-and-skyline-motion.test.mjs` expectations that read it.

## Boundaries

- Do NOT touch the title gold light, portrait hover, posters' hover lean (`.gl-print` owns its transform), or the star card.
- No new dependencies. Don't change copy or layout.

## Verification

- Mechanical: `npx tsc --noEmit -p .` clean; `node --test tests/*.test.mjs` (the Cursor deck test was already failing); `npm run build` succeeds.
- Measure as in Problem: Home and About should settle in ≤ ~0.95 s, first motion ≤ ~120 ms after navigation in dev, ≤ 2 movers before the wall's ripple.
- Feel check: reload Home and About at 1440 and 390 widths, then in DevTools Animations at 10% speed: the text block and the art arrive as two soft moves, posters never fade in empty, nothing is invisible after scroll.
