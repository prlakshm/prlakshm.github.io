# Animation plans

| # | Plan | Severity | Depends on | Status |
| --- | --- | --- | --- | --- |
| 004 | [Shared motion tokens](004-motion-tokens.md) | LOW | — | DONE |
| 001 | [Home + About entrances, case-study recipe](001-home-about-entrance.md) | HIGH | 004 | DONE |
| 002 | [Star flight on a real arc](002-star-flight.md) | MEDIUM | — | DONE |
| 003 | [Codex bookmark weight](003-codex-bookmark-weight.md) | MEDIUM | — | DONE |

Execution order: 004 → 001, then 002 and 003 (independent).

## Results (measured on the production build, headless Chrome)

- 001: Home settles ~1.0 s after it starts (was 1.53 s, 11 movers → hero block + wall ripple); About 0.77–0.9 s (was 1.73 s, 7 movers → 2). Uses the existing `--ease-settle` (same curve as the case studies) instead of a new `--ease-enter`. Blocks already on screen reveal on the next frame. Home's remaining start delay is its bundle (the hero mounts at ~130 ms), not the entrance.
- 002: flight 649 ms (was ~1.4 s incl. a 380 ms wait), lands on the slot centre while the card opens.
- 003: bookmark peak −0.9° → +6.8° (right end past level), return −10.8°, rest −9°; sparkle lands on its seat with no snap. Final values: `TEETER = { kick: 150, stiffness: 22, damping: 5.2 }`, sparkle tap velocity 60.

## Revisions (her feedback, 2026-10-08)

- Poster wall looked like prints popping in one by one: it now waits for all its images together, then glides in as a set (`.enter--slow`, 1.1 s each, 0.08 s ripple). Measured starts are an even 83 ms apart.
- Bookmark dip was too much: `TEETER.kick` 150 → 112, peak +6.8° → +2.9°, return −10.3°, rest −9°.
- Posters back to chunks (her preference): each section (placard + prints) arrives together, the second 0.15 s after the first; still 1.1 s glide, still waits for all wall images.
- Bookmark settle needed rocking after the big move: damping 5.2 → 2.97 (ratio ≈ 0.32), kick 84, settleTeeter hands off at the 4th turn (was 3rd). Turns: +3.0° → −12.5° → −7.8° → −9.4° → rest −9° (~3.4 s after the hit, ~0.8 s per swing).
