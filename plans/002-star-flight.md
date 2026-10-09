# 002 — Star flight: land in ~0.65 s on a real arc

- **Status**: DONE (2026-10-08)
- **Commit**: 540fe469
- **Severity**: MEDIUM
- **Category**: Physicality & origin · Easing & duration
- **Estimated scope**: 1 file, ~40 lines

## Problem

`src/components/badges/BadgeCard.tsx:518-522` waits 380 ms ("let the card finish growing") before launching; `:234-243` then flies for 1.0 s:

```ts
animate(el, { x: [0, tx * 0.08, tx], y: [0, -54, ty], scale: [0.2, 2.1, land], rotate: [-28, 10, CROOKED[flight.slot] ?? 0] },
  { duration: 1, times: [0, 0.3, 1], ease: [0.3, 0.7, 0.2, 1] });
```

~1.4 s before the stamp lands. Scale 0.2 → 2.1 is a 10× balloon. x and y share one curve per segment, so after the apex it slides on a straight diagonal instead of falling. The target rect is read once, which is why it has to wait for the card to finish opening.

## Target

- Launch immediately (no 380 ms wait).
- 0.65 s flight driven by one progress value `u` (Motion `animate(0, 1, { duration: 0.65, ease: "linear", onUpdate })`), writing one `transform` string per frame and **re-reading the live target rect each frame**, so it lands on the slot even while the card is still opening.
- Path: horizontal `ex = cubic-bezier(.45,0,.25,1)(u)`; vertical `ey = u²` (gravity) minus an arc lift `56px · 4u(1−u)`; scale `0.6 → 1.35` by u = 0.3 (ease-out) then to the slot's size; rotate `−24° → crooked` with ease-out.
- Reduced motion: unchanged (no flight).

## Steps

1. In `celebrate`, replace the `setTimeout(..., 380)` with an immediate `setFlights`.
2. Rewrite `FlyingBadge`'s layout effect as above; keep `onLanded` on finish/stop.

## Boundaries

- Do NOT touch the landing glint, the tooltip, the queue for background tabs, or the intro ticket.

## Verification

- `npx tsc --noEmit -p .`; badge tests pass.
- Feel check: earn "Learn my name" (hover the title ~1 s after load); the star should leave from the cursor, rise a little, fall into its slot in about two-thirds of a second, landing exactly centred while the card opens.
