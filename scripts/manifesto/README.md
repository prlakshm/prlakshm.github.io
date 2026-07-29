# Design Manifesto — authored alpha-mask layout

The active source files are named by role:

- `manifesto-title-source.png`
- `manifesto-body-part-1-source.png`
- `manifesto-body-part-2-source.png`

The earlier handwriting exports remain recoverable in `masks/archive/` under
clear `manifesto-*-v1-*` names. They are not referenced by the site.

## What the build does

`build.py` preserves the authored PNG alpha. It does not trace, vectorize,
redraw, or generate letters.

The body was written across two exports. The build measures the median x-height
and baseline pitch of both:

1. Body part 1 is the visual reference.
2. Body part 2 is uniformly scaled to part 1’s measured x-height.
3. All 20 source lines are stacked on part 1’s measured line step.
4. The normalized result is saved as `manifesto-body-normalized.png`.
5. The two visibly crowded long words in the second export receive a small,
   local horizontal resample and are saved in
   `manifesto-body-letter-spaced.png`.

The broad normalization changes only scale and line placement. The two local
spacing adjustments preserve their continuous authored alpha and do not trace
or redraw any letter. Every other internal letterform, join, space, dot, and
punctuation mark remains untouched. The browser then crops one mask per whole
word so flexbox can wrap only between words.

The copy edit “and **where** AI begins” reuses the later authored `where` from
“learn where and when.” Its crop coordinates are duplicated in the generated
word data; no synthetic lettering is introduced.

The generated runtime masks also use explicit names:

- `manifesto-title-ink.png`
- `manifesto-title-marks.png`
- `manifesto-body-ink.png`
- `manifesto-body-late-ink.png` (calibrated for the thinner second export)
- `manifesto-body-marks.png`

CSS supplies the secondary ink color and responsive size. Dots and periods use
the authored alpha with a slightly heavier derived mark mask.

## Run

```bash
python3 -m venv .venv
.venv/bin/pip install numpy scipy scikit-image pillow
.venv/bin/python scripts/manifesto/build.py
```

Useful flags:

- `--title-src`
- `--body-part-1-src`
- `--body-part-2-src`
- `--out`

## Guardrails

The generator exits instead of silently degrading when:

- a source does not contain alpha;
- the measured line count differs from the corresponding source copy;
- a line cannot be split into its exact authored word count;
- an expected lowercase-i dot or sentence period is lost.

The generated `MANIFESTO_BODY_NORMALIZATION` metrics document the measured
x-heights, the part-2 scale factor, and the shared source-line step.
