# Design Manifesto — handwriting vectorizer

Turns the photographed manifesto into `src/pages/about/manifesto-words.ts`:
one SVG path per **word**, plus the baseline each word sits on.

Words are the atomic unit on purpose. `Manifesto.tsx` lays them out in a flex
container, so the browser wraps between words exactly as it wraps text and a
line break can never fall inside one. Letters stay together because a letter is
never a box.

Paths are **centrelines**, not outlines. An outline trace would bake her pen's
thickness into filled shapes; centrelines leave weight and colour to CSS
(`--mf-stroke`, `currentColor`), which is why the hand can be made bolder or
recoloured without retracing — and why every word ends up the same weight
instead of inheriting her pressure variation.

## Run

```bash
python3 -m venv .venv && .venv/bin/pip install numpy scipy scikit-image pillow
.venv/bin/python scripts/manifesto/build.py
```

Useful flags: `--src` (default `source/manifesto.jpg`), `--out`, `--eps`
(simplification tolerance in source px, default 3.0), `--sigma` (polyline
smoothing, default 3.2).

## If the manifesto is rewritten

1. Rephotograph it: flat, evenly lit, filling the frame. Roughly 4000px across.
   Perspective skew is fine — baselines are re-fitted anyway.
2. Replace `source/manifesto.jpg`.
3. Update `TEXT` in `build.py` to the new wording.
4. Re-run. Update the `mf-sr` fallback in `Manifesto.tsx` if the text changed.

`TEXT` is not decoration: word segmentation is *validated* against it, and the
script exits rather than emit a silently mis-split word.

## Guardrails

The script fails loudly rather than degrade quietly:

- line count must match `TEXT`
- each line must split into exactly its word count
- every ink mark must survive tracing — this is what catches a dropped i-tittle
  or period, which is otherwise invisible until someone reads the rendered page

It also warns (without failing) when a line's word gaps are barely wider than
its letter gaps, which is where a mis-split would come from if one ever does.

## Notes for whoever touches this next

- `MIN_SPECK = 20` px is close to the bone: the faintest genuine i-tittle in the
  photo measures 51 px, and the dot over the `i` in the title is fainter still
  than the body text. Raising it will silently eat tittles.
- A tittle skeletonizes into a tiny three-armed star whose arms all look like
  spurs. `trace_word` handles marks below `dot_max` as a single round point
  instead, which is both prettier and the reason they survive pruning.
- `clean.py` documents one thing deliberately *not* done — see the note at the
  top about the `o` in "know".
