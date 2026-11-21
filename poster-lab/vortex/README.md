# Comic vortex (Home -> Everything)

Three variations of one idea, built in Figma (file tLYm9gTWol5OLAn9qNcq07, page "Origami transitions") with Motion keyframes.
A jagged hole caves in at the spot where the bagel's hole sits on the Everything page, the Home page is pulled in as a vortex,
Everything comes back out, and the hole closes into the bagel's own hole.

- `figma-build-vortex.js` — the whole build. Run it through `use_figma` with a `CFG` in scope: `{mode:'A'|'B'|'C'}`.
  Everything is procedural (seeded), so there is no data file. `CFG.R` hole radius, `CFG.hc` hole centre, `CFG.dir` turn direction, `CFG.seed`.
  - A · Drain — flat. Each Home element spirals down the hole by itself; Everything pieces spiral back out; the bagel rises under the hole.
  - B · Rings — flat. The page is cut into concentric rings (image-filled donuts) that spin at different speeds and fall in, inner first, over a dark void.
  - C · Cave-in — 2026-11-20 (3D): Drain's hole and cracks (thin walls, black pit, no swirl), nothing drawn on the rest of the page, nothing turns in-plane. The collapse front travels outward from the rim, speeding up as it spreads (t0 = 0.41 + 1.35·d^0.7; steady speed left the Codex poster alone on screen too long), so the nearest piece lets go first and the farthest last (release distance = the piece's FARTHEST corner, so long rows and edge text wait for the front to pass all of them; centre distance was rejected); each then free-falls straight to the centre (cycloid), only ever shrinking to a speck, and tips in 3D about the tangent (hole-side edge dips, up to 80°, tipping early) as if lying on a steepening funnel wall. Thin text rows (section headers, labels, nav words, small mono copy blocks; height <= 32 or text wider than 4:1) do not tilt, they are only pulled (tilted, a long strip read as lifting and rotating: rejected). Lids tip in 3D too. The hole closes in one smooth ease 4.15-4.88s (the two-step close that paused at the bagel's hole size was rejected for C). Everything is thrown out near-first, tilted, flattening, with one rock past flat on landing. Nav words use DARKEN (no paper box). Pieces over the hole are cut at the rim. Rejected: all pieces released at once ("no clear physics"), slide-then-drop-straight-down. Video export ignores 3D; use CFG.freeze stills. The first shard version is mode 'S'.
- `CFG.freeze = seconds` builds a still of that moment instead of an animation (every track is evaluated and baked). This is the only way to
  see C's 3D tilt outside Figma's own playback: video export and timeline screenshots ignore 3D.
- `sheet.py video out.png cols t1,t2,...` — contact sheet from an exported video.
- `vortex-*-check.png` are frames from Figma's own video export; `vortex-*.mp4` are those exports.


Facts learned while building:
- ROTATION is counter-clockwise-positive and pivots on the node's centre, as does SCALE. To grow something from a fixed point, add a
  translation of (1 - s) x (point - centre) on the same easing.
- A donut ellipse with an image fill in CROP mode may crop past the image: the outside is transparent. That is what makes the rings possible.
- Flat motion (A, B) is fully checkable by `export_video`; anything with 3D is not.
