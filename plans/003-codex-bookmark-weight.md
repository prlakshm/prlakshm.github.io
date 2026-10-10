# 003 — Codex: give the bookmark (and its sparkle) weight on the seesaw

- **Status**: DONE (2026-10-08)
- **Commit**: 540fe469
- **Severity**: MEDIUM
- **Category**: Physicality & origin
- **Estimated scope**: 1 file, constants only

## Problem

Measured angle of the "Bookmarks" plank (`public/codex/index.html`, CSS degrees, negative = left end down): after "Codex" lands it sits at −12.8°; the bookmark's hit on the raised right end lifts it only to −0.7° (never past level), it swings back to −10.9°, then settles at −9°. The sparkle's tap (~0.33 s later) is under 1°.

```js
// public/codex/index.html:451
const TEETER = { kick: 95.971008, stiffness: 30, damping: 4.8 };   // damping ratio 0.44: bouncy → reads light
// :758
anim(tap, 0, { type: "spring", velocity: 21, stiffness: 120, damping: 2 * Math.sqrt(120) * 0.6 });
```

A heavy thing landing on the high end should win the seesaw for a moment: that end goes down past level, slowly (heavy = lower frequency), with less bounce.

## Target

- Bookmark: the right end dips to about **+5° to +7°** (past level) at the first turn, swings back no further than about −11°, settles at −9° as now. Achieve with a larger impulse and a slower, less bouncy spring: start from `TEETER = { kick: 150, stiffness: 22, damping: 5.2 }` (damping ratio ≈ 0.55) and tune `kick` until the measured first peak is +5° to +7°.
- Sparkle: a visible quick tap of **2° to 3°**: `velocity: 60`, stiffness 120, damping ratio 0.6.
- Everything downstream (`towerAt` look-ahead that aims the sparkle) reads `TEETER`, so it stays consistent.

## Steps

1. Change `TEETER` and the sparkle `tap` velocity as above.
2. Record the plank angle (inline `rotate(…deg)` on the "Bookmarks" element) over 9 s in headless Chrome; tune `kick` to hit the targets.

## Boundaries

- Do NOT change the cloud's roll, the Codex landing, fall timings, or `settleTeeter`.

## Verification

- Feel check at 25% speed: thud (bookmark wins, right end dips past level), tick (sparkle taps), then a heavy, unhurried glide to rest. The sparkle must still land on its seat (no visible jump).
