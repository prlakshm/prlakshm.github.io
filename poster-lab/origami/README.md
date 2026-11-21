# Origami page-transition lab

Fold simulator and fold scripts behind the Figma page "Origami transitions"
(file tLYm9gTWol5OLAn9qNcq07, page 306:2).

- `fold2.cjs` — flat-fold simulator: exact 180° folds, layer order → z offsets,
  creases that activate only when their fold starts, offline textured renderer, JSON export.
  Opt-in per model (defaults unchanged, other models' JSON is byte-identical): `sim.stayPre`, `sim.ZE` (px between layers),
  `sim.persp` (preview with the stage perspective), `sim.zoomF`. Only bear C sets them so far.
- `plane2.cjs` — dart paper plane (flaps fold behind, wings show the page).
- `bearR.cjs` (reference look) and `bearF.cjs` (truly foldable) — bear; rocks and hops off to the right.
- `bearC.cjs` — the intricate bear: bear A plus haunch panel, double neck crimp, muzzle crimp, bigger ear, paws,
  shoulder crimp, tail, slimmer legs and a hock crimp on the hind legs.
  Front hem (`--fhem`, on): the front end of each tucked strip folds back so the front legs swing down the same length as the back
  pair (160/210px) instead of 400/470px. Folds overlap: done by 2.62s (was 4.24s), ears in 0.32s; the shoulder crimp is written last and starts with the ear flip.
  Front-leg fixes (2026-11-20), all three were invisible in the old checks:
  1. `S.stayPre` — the front hem flaps turned a full 360° through the legs during the leg swing and the foot fold (a part that stays put
     under a parent that already turned was aimed at the parent's END position). Same bug sent a rear panel round during the rear tuck.
  2. `S.ZE=0.25` (`--ze`) — layers were 2px apart, 84 levels = 168px deep. Under the stage's 2000px perspective the near front leg hung
     40px (sheet) below the back feet, and every leg fold strayed sideways by its layer height mid-turn. Figma orders layers correctly
     down to 0.02px, so the stack is now 21px deep.
  3. Front feet fold on a tilted ground line (`gnd`, `--gfix`, `--gfn/--gff`): the shoulder crimp turns the whole front 6° afterwards,
     which used to push the near front foot 12px below the ground. Until the shoulder folds (2.2–2.6s) the front feet sit a few px high.
  Folds are also written in start-time order now; layer heights play back per fold, and a fold written early but played late left the
  neck pleat showing through the chest around 1.9s.
  Debug flags: `--persp 2000` (preview with the Figma perspective; the renderer is otherwise orthographic), `--zoom t1,t2 --zc x,y,k`
  (close-ups; add `--ztrue 1` to zoom the real camera view), `--feet t`, `--zstat t`, `--dbg t0,t1 --dtag legFF`, `--pick t,x,y`.
  Head-fold beat (her note: "fold in head into body a little sooner. There is a longer beat before that"): confirmed by rendering every
  0.02s and measuring how much of the picture changes. The ear pleat, ear, face and nose folds barely move the picture, so the bear looked
  at rest for 0.52s (2.26-2.76s) before the shoulder fold turned the head and front into the body. Those folds now ride with the toes and
  second neck fold and the shoulder fold starts with the ear flip (2.40-2.62s); the quiet stretch is 0.16s and the whole thing is 5.15s
  (was 5.45s). `--T 'fold:a-b,...'` overrides timeline entries; the old timing is in the comment next to `T`. `bear-c-timing-check.png`.
  Exit wash (her note: "hold background fade a little longer as bear exits"): the pale wash and blur over the Everything page held to
  3.50s and cleared by 4.70s, while the bear was still on the page. They now hold to 3.90s and clear by 5.10s (`cam.scrim`), total 5.25s.
  Edited in place on the Figma frame (scrim opacity + background blur keys, timeline length), no rebuild. `bear-c-exit-fade-check.png` =
  Figma video frames every 0.2s from 3.45s; video export ignores 3D, so the bear shows as the unfolded sheet there.
- `bird.cjs` — paper bird; leaves on a gentle wave with slow, shallow wing beats (the first, livelier flight was `--fly 2.0 --raise 22 --drop 105 --td 0.12 --tu 0.16 --bank 14` with a six-point wave).
  Folds overlap (2026-11-20): the two wing flaps fold together, the body starts folding in half as they land, and the wings start to
  spread while the beak is still folding. Fold done by 2.10s (was 3.16s), take-off at 2.53s (was 4.04s), 5.18s in all (was 6.69s);
  the flight itself is unchanged. `--pace slow` gives the old one-fold-at-a-time table; `--hold` is the pause before take-off.
  `bird-check.png` = twelve frozen Figma frames across the new timing.
- `present.cjs` — gift box. Does NOT use the flat-fold steps: it builds the hinge tree by hand (90° walls, eight pinched corner
  gussets whose angles are solved per frame, closure error 0), tumbles the camera, and blooms flat with the sheet turned over.
  The next page is printed on the reverse, so the bloom lands exactly on it. Yarn + bow are data in `cam.yarn` / `cam.bow`.
  `--exit burst` and `--exit pull` are the two other exits, both with a smaller box (scale 0.56) seen front-on (tilt -10, no turn)
  and a plain white underside: burst = bow unties, the front opens like a mouth (the close fold run backwards to `--openf` 22°),
  crops of the Everything page fly from the box to their places (`cam.tiles`, `cam.src`), the box drops away; pull = the bow stays,
  a yarn lead (`cam.lead`) is drawn out past the right edge and tugs the box off in hops. They write presentB.json / presentC.json.
- `figma-build.js` — builds a frame from the JSON (flat-fold models). `figma-build-present.js` — same, plus reverse-side print,
  fading crease lines, yarn strands (path trim) and the bow. The present builder also makes the flat layers above the stage
  (burst thumbnails, pull-toy lead). `figma-freeze.js` — bakes frozen copies at chosen times into one "check frames" frame.
  Declare `EXACT=true` (and optionally `ZOOM=[x,y,k]`) before it for frames that match playback: the default folds the stage scale into
  a z push, which shows only about half of the parallax between near and far layers (it hid bear C's long front leg).
- Burst, second pass (her notes: two triangle flaps on the front around 2.4s, bow loops not joined to the tails, burst "panicky and jagged"):
  the front and lid corner tucks end flat against the inside of the front face, and Figma sorts layers by their centre, so they drew over it;
  they now carry a hide window (`v:[hide,show,fade]`, opacity on both sides) while enclosed. The bow loops were ~30px off the knot because a
  vector is placed by the box of its drawn curve, not of its control points; curves are now measured by sampling and re-seated on their first
  point. Loops and knot stand in one frame, the tails start under the knot, cross the lid's front edge and hang down the front (two pieces,
  one per facet). The burst is one move at a time: bow unties, front opens on `soft` (no overshoot), thumbnails leave nearest-first on straight
  lines with one easing and a short fade, then the box sinks straight down (`--sink`). Removed: the recoil kick, the pre-drop hop (its keys
  were out of order, a 13px snap), the roll, and the release swing that pushed the tucks through the closed front. `present-burst-check.png`.
  The bloom and pull-toy frames in Figma still have the old bow and flaps until they are rebuilt.
- Burst bow, third pass (her reference: a soft pink ribbon bow, "but ours is made of yarn"): two wide loops (about 180 long, 85 high) that
  leave a small knot and return to it, standing in one frame with the knot; two long tails of different lengths that cross the lid beside
  the centre strand and hang down the front in an S-curve, cut into one piece per facet (lid top, lid front, front wall = net x - 1440;
  `cam.bow.f3` / `edge2`). Loops must stay above the lid plane: anything in the standing frame below it is hidden by the lid.
  Geometry is `bowGeom` in `figma-build-present.js`.
- Burst bow, fourth pass (her note: the tails should be attached to the bow middle on top of the box, fall along the walls, and be shorter).
  Cause: the front-on exits see the lid top edge-on, so the tails' run across the lid was invisible, and perspective shows the knot about
  33 sheet px to the side of the centre strand; the tails therefore seemed to start on the front edge away from the knot. `present.cjs` now
  exports `cam.bow.lean` (where the knot shows along the lid's front edge); the tails run from the knot to that point, bend over the edge
  7px apart and drape apart on the front for 150 / 112 px (the front is 360 tall). The left tail crosses the centre strand.
  The Figma frame was patched in place (only the tail vectors replaced); the two 4.1s tiles of `present-burst-check.png` are true-perspective
  renders (`EXACT`), the other tiles are from the older approximate freeze.
- `--audit 1` on a bear or bird script prints what is actually visible (pieces, largest panel, line length).

Run (needs `home.rgb` next to the scripts):

    ffmpeg -i home.png -f rawvideo -pix_fmt rgb24 home.rgb
    node plane2.cjs 0,1.1,1.8,2.4   # writes p2_*.ppm previews + plane2.json
    node bearF.cjs --dance 4.14,4.56 --audit 1   # previews + bearF.json
    node bird.cjs --strip 12                     # 12 frames of the flight + bird.json
    node present.cjs --frames 1.9,4.2,5.6        # previews (no yarn, white reverse) + present.json
    node present.cjs --exit burst --frames 3,5.3 # presentB.json (previews show the box only, not the thumbnails)
    node present.cjs --exit pull --frames 4,5.5  # presentC.json

The JSON (`F` = facets with hinge, rotation track, z track, shading, creases; `cam` = camera)
is what the Figma build consumes, and can drive a CSS 3D build directly.

- Burst, ribbon speed-up (her note: "make ribbon wrap around quicker and fall away also quicker. It is too slow when the box opens again before fall"):
  yarn 2.45–2.95 (was –3.35), tie 2.95–3.30 (was 3.35–3.98), hold 0.25s (was 0.32), untie 3.55–3.70 (was 4.30–4.54), retract/unpress done by 3.90
  (was 4.84), front opens 3.92–4.30 (was 4.90–5.40), thumbnails 4.12–5.68, box sinks 4.72–5.36 (was 5.86–6.52). Total 5.91s (was 6.95s).
  Only the `T` table and `DUR` changed in `present.cjs`; the frame was fully rebuilt from `figma-build-present.js` (first full run with the new tails).
  `present-burst-timing-check.png` = ten frozen frames; `present-burst-check.png` still shows the old times.
- Burst, hold and open slowed (her note: "hold at tie a little longer and slow down 'burst' a little more at open box"): tied hold 0.25s -> 0.50s
  (untie now 3.80–3.95), front opens 4.17–4.70 (0.53s, was 0.38s), thumbnails 4.45–6.28 (stagger 0.6s, flight 0.95–1.23s; was 0.5 / 0.8–1.05),
  box sinks 5.13–5.79, total 6.51s. Wrap, tie and untie speeds unchanged. `present-burst-timing-check.png` = ten frozen frames at the new times.
- Burst, bow drawn in order (her note: "I want bow ears to be drawn first, then tassles. Then hold after. It's too convoluted now."): the tie was
  0.35s with everything overlapping (knot pop, two staggered ears that ran 0.13–0.17s past the end of the tie into the hold, two staggered tails
  squeezed into the last 0.05–0.09s). It is now three steps with no overlap, `T.seq` in `present.cjs` -> `cam.bow.seq`: knot pops 2.95–3.03,
  both ears draw together 3.03–3.33, both tails draw together 3.33–3.59 (their hidden run across the lid top gets 0.05s, the visible drape
  the rest), then the 0.50s hold. Ears and tails use a gentler `draw` ease instead of `out`, which had 80% of an ear on screen in the first
  quarter of its time. Everything after is shifted 0.29s: untie 4.09–4.24, front opens 4.46–4.99, thumbnails 4.74–6.57, box sinks 5.42–6.08,
  total 6.80s (was 6.51s). Without `cam.bow.seq` (bloom, pull toy) the builder keeps the old overlapping tie.
  `present-burst-bow-order-check.png` = eight frozen frames of the tie; curves in mid-draw were cut to their drawn length by hand, since the
  freeze script cannot bake path trim on curves.
- Burst, untie by a pulled tail (her note: "can it untie with a tail string being pulled?"): `T.pull` in `present.cjs` -> `cam.bow.pull`
  (burst only; bloom keeps the old un-drawing untie). Three beats, one after the other: tug 4.09–4.17 (the screen-right tail's slack drape is
  swapped for a straight line with the same two ends, so only its belly snaps taut, and it gives 7%), pull 4.22–4.60 (the tail's free end runs
  down the front to the foot of the box while the ear on the FAR side of the knot, the same string, shrinks about the knot in step and pops
  through), then the old untie as the release 4.61–4.76 (knot lets go, other ear and tail un-draw, the pulled tail goes on under the box,
  trim start). Everything after is 0.52s later with durations unchanged; total 7.32s. The right tail is used because it does not cross the
  centre strand. The ear is scaled, so its stroke weight is keyframed up by the same factor to keep the yarn's thickness. The taut line cannot
  carry the dashed twist marks (dashes cannot be trimmed), so it has a plain darker wash instead. String is not fully conserved: the ear loses
  about 433px and the tail gains about 257px, because the front of the box is only 360 tall.
- Burst, empty background: TRIED AND REVERTED 2026-11-20 (her call). She first asked "make everything page in background have no elements.
  So when burst from present, thats the first time users see them", then "actually, revert present to seeing everything elements in
  background". The real Everything page is behind the box again, blurred and dimmed, as before. The empty version is kept as an opt-in,
  off by default: `node present.cjs --exit burst --emptybg` sets `cam.bgEmpty`, and the builder then lays `everything-empty.png` (made by
  `everything-empty.py`: each of the 16 thumbnail regions plus 8px replaced by the page's own dotted paper; nav and star card stay) over the
  real page until the last thumbnail lands, fading by +0.12s. The image must be uploaded to the Figma file first (hash = its sha1).
  The 16 thumbnails cover every element, bagel and starburst included. In Figma the overlay layer was removed in place from the built frame.
- `figma-freeze.js` now cuts trimmed curves to their drawn length (trim start and end) and bakes a vector's own scale, slide and stroke weight.
  `present-burst-untie-check.png` = nine zoomed frozen frames of the untie, then three full-view frames after the revert (tied hold, front opening, final). The final frozen frame is pixel-identical to the Everything
  page image. Frame built end to end from the builder (then the empty-page overlay removed in place).
