#!/usr/bin/env python3
"""Vectorize the handwritten design manifesto into per-word SVG paths.

Run:  python3 build.py            (see README.md for the venv)

Pipeline
    1. flat-field the photo so uneven lighting stops mattering, then threshold
    2. split into lines by horizontal projection
    3. split lines into words by gap clustering, checked against TEXT
    4. fit a baseline per line, so words can be re-aligned in CSS
    5. centreline-trace each word to a single path string

Why centrelines and not outlines: an outline trace bakes the pen's thickness
into filled shapes. Centrelines leave stroke weight and colour as live CSS,
which is the whole point -- the manifesto is meant to be tunable and to sit in
--mono-secondary, not to be a picture of ink.

Output is one word per record. Words are the atomic layout unit on the page, so
letters can never be split across a line break.
"""
import argparse
import json
import pathlib
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage.morphology import remove_small_objects

import trace

HERE = pathlib.Path(__file__).parent

# Ground truth. Word segmentation is validated against these counts rather than
# trusted, because a mis-split silently corrupts a word forever.
TEXT = [
    "Design Manifesto",
    "I decided to use this space to share my thoughts on AI.",
    "AI can write like us, talk like us, and imitate everything we",
    "do. At this point, I don't know where a person ends and AI",
    "begins. But we are humans. We are made of flesh and blood.",
    "We create, we dance, and make art. So let's not see this as",
    "AI is taking over our lives, but that AI is letting us have more",
    "life to live. We can automate processes to bring more time",
    "for the things that spark us joy. To create. To make art.",
    "If we learn where and when to use AI, we can bring our",
    "lives back to the art. We are a house for creative spirit.",
    "So let's be intentional about how we create.",
]

THRESHOLD = 210      # on the flat-fielded image, where paper reads ~250
MIN_SPECK = 20       # px; the faintest real i-tittle measured 51px
EDGE_INSET = 0.02    # drop components touching the photographed page edge
X_HEIGHT_UNITS = 10  # output scale: body x-height is 10 units


def binarize(path):
    """Flat-field, then threshold globally.

    Sauvola and friends adapt to a window; at this resolution any window small
    enough to track the lighting sits *inside* a stroke and blooms. Dividing out
    a morphological background removes the gradient outright, after which a
    single global threshold is both simpler and better behaved.
    """
    im = np.asarray(Image.open(path).convert("L"), dtype=np.float32)
    bg = ndi.gaussian_filter(ndi.grey_closing(im, size=(61, 61)), 25)
    flat = np.clip(im / np.maximum(bg, 1.0) * 255.0, 0, 255)
    ink = remove_small_objects(flat < THRESHOLD, min_size=MIN_SPECK)

    lab, n = ndi.label(ink)
    H, W = ink.shape
    ix, iy = int(W * EDGE_INSET), int(H * EDGE_INSET)
    keep = np.zeros(n + 1, bool)
    for i, (ys, xs) in enumerate(ndi.find_objects(lab), start=1):
        inside = (xs.start >= ix and xs.stop <= W - ix
                  and ys.start >= iy and ys.stop <= H - iy)
        keep[i] = inside
    return keep[lab]


def find_lines(ink):
    prof = ndi.uniform_filter1d(ink.sum(axis=1).astype(float), 15)
    on = prof > prof.max() * 0.02
    edges = np.diff(on.astype(int))
    starts = list(np.where(edges == 1)[0] + 1)
    stops = list(np.where(edges == -1)[0] + 1)
    if on[0]:
        starts.insert(0, 0)
    if on[-1]:
        stops.append(len(on))
    return [(a, b) for a, b in zip(starts, stops) if b - a > 30]


def split_words(comps, words):
    """Cluster components into exactly len(words) groups by horizontal gap.

    The cut count is pinned to the known word count instead of to a gap
    threshold: handwriting spacing drifts across a line, so any fixed threshold
    that works at the left margin fails at the right.
    """
    ivs = [[c["x0"], c["x1"], [c]] for c in comps]
    merged = []
    for iv in ivs:
        if merged and iv[0] <= merged[-1][1]:      # overlapping in x: one unit
            merged[-1][1] = max(merged[-1][1], iv[1])
            merged[-1][2] += iv[2]
        else:
            merged.append(iv)
    gaps = sorted(((merged[i + 1][0] - merged[i][1], i)
                   for i in range(len(merged) - 1)), reverse=True)
    cuts = {i for _, i in gaps[:len(words) - 1]}
    groups, cur = [], []
    for i, m in enumerate(merged):
        cur.append(m)
        if i in cuts:
            groups.append(cur)
            cur = []
    groups.append(cur)
    margin = (gaps[len(words) - 2][0] / max(gaps[len(words) - 1][0], 1)
              if len(gaps) >= len(words) else float("inf"))
    return groups, margin


def fit_baseline(box, ids, band_h):
    """Robust y = m*x + c through the feet of the letters on one line.

    Iteratively trims outliers, which drops descenders (far below the line) and
    tittles (far above it) without needing to know which letters have them.
    """
    hs = np.array([box[i][0].stop - box[i][0].start for i in ids])
    cand = [i for i in ids if (box[i][0].stop - box[i][0].start) > 0.45 * np.median(hs)]
    X = np.array([(box[i][1].start + box[i][1].stop) / 2 for i in cand], float)
    Y = np.array([box[i][0].stop for i in cand], float)
    m, c = 0.0, float(np.median(Y))
    for _ in range(6):
        keep = np.abs(Y - (m * X + c)) < 0.16 * band_h
        if keep.sum() < 3:
            break
        m, c = np.polyfit(X[keep], Y[keep], 1)
    tops = np.array([box[i][0].start for i in cand])
    return m, c, float(np.median((m * X + c) - tops))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=str(HERE / "source" / "manifesto.jpg"))
    ap.add_argument("--out", default=str(HERE / ".." / ".." / "src" / "pages"
                                         / "about" / "manifesto-words.ts"))
    ap.add_argument("--eps", type=float, default=3.0, help="RDP tolerance, px")
    ap.add_argument("--sigma", type=float, default=3.2, help="polyline smoothing")
    args = ap.parse_args()

    ink = binarize(args.src)
    bands = find_lines(ink)
    if len(bands) != len(TEXT):
        sys.exit(f"found {len(bands)} lines, expected {len(TEXT)}")

    lab, _ = ndi.label(ink)
    objs = ndi.find_objects(lab)
    box = {i: sl for i, sl in enumerate(objs, start=1)}
    comps = [dict(id=i, x0=sl[1].start, x1=sl[1].stop, y0=sl[0].start,
                  y1=sl[0].stop, yc=(sl[0].start + sl[0].stop) / 2)
             for i, sl in box.items()]

    # --- words + baselines --------------------------------------------------
    rows, fits = [], {}
    for li, (a, b) in enumerate(bands):
        words = TEXT[li].split()
        cs = sorted([c for c in comps if a <= c["yc"] < b], key=lambda c: c["x0"])
        groups, margin = split_words(cs, words)
        if len(groups) != len(words):
            sys.exit(f"line {li}: split into {len(groups)}, expected {len(words)}")
        if margin < 1.15:
            print(f"  ! line {li}: word gap only {margin:.2f}x the widest letter "
                  f"gap -- check the proof sheet")
        ids = [c["id"] for c in cs]
        fits[li] = fit_baseline(box, ids, b - a)
        for w, g in zip(words, groups):
            gids = [c["id"] for m in g for c in m[2]]
            rows.append(dict(
                text=w, line=li, ids=gids,
                x0=min(m[0] for m in g), x1=max(m[1] for m in g) - 1,
                y0=min(c["y0"] for m in g for c in m[2]),
                y1=max(c["y1"] for m in g for c in m[2]) - 1))

    scale = X_HEIGHT_UNITS / float(np.median([fits[li][2] for li in range(1, len(bands))]))

    # --- trace --------------------------------------------------------------
    out = []
    for w in rows:
        sub = np.isin(lab[w["y0"]:w["y1"] + 1, w["x0"]:w["x1"] + 1], w["ids"])
        ncomp = ndi.label(sub)[1]
        d = trace.trace_word(sub, scale, eps=args.eps, sigma=args.sigma)
        if d.count("M") < ncomp:
            sys.exit(f"{w['text']!r}: {ncomp} ink marks but only "
                     f"{d.count('M')} subpaths -- a tittle or point was dropped")
        m, c, _ = fits[w["line"]]
        base = (m * (w["x0"] + w["x1"]) / 2 + c - w["y0"]) * scale
        out.append(dict(t=w["text"], l=w["line"],
                        w=round((w["x1"] - w["x0"] + 1) * scale, 1),
                        h=round((w["y1"] - w["y0"] + 1) * scale, 1),
                        b=round(base, 1), d=d))

    # Natural word space, so the rendered spacing is hers and not a guess.
    spaces = []
    for li in range(len(bands)):
        ws = [(r, o) for r, o in zip(rows, out) if o["l"] == li]
        for (p, _), (q, _) in zip(ws, ws[1:]):
            spaces.append((q["x0"] - p["x1"]) * scale)
    space = round(float(np.median(spaces)), 1)

    body = "\n".join(
        f'  {{ t: {json.dumps(o["t"])}, l: {o["l"]}, w: {o["w"]}, h: {o["h"]}, '
        f'b: {o["b"]}, d: "{o["d"]}" }},' for o in out)
    header = f'''/* GENERATED by scripts/manifesto/build.py -- do not edit by hand.
   Re-run that script to regenerate from the photograph.

   One record per word, because words are the atomic layout unit: they wrap
   whole or not at all, so a line break can never split letters.

   Coordinates are in a shared unit space where the body x-height is
   {X_HEIGHT_UNITS} units. Paths are centrelines -- stroke weight and colour are
   set in CSS, not baked in.

     w, h  bounding box of the ink, in units
     b     baseline offset from the top of that box. Aligning words by b (not
           by box top) is what lets them sit on one straight line despite
           different ascenders and descenders.
     d     one path, one subpath per pen stroke; round caps close the joins. */

export type ManifestoWord = {{
  /** The word itself -- also the accessible text. */
  t: string;
  /** Source line, 0 = title. Line breaks are not reused for layout. */
  l: number;
  w: number;
  h: number;
  b: number;
  d: string;
}};

/** Median word space in the original hand, in units. */
export const WORD_SPACE = {space};

/** Body x-height in units; the unit scale everything else is relative to. */
export const X_HEIGHT = {X_HEIGHT_UNITS};

export const MANIFESTO_WORDS: ManifestoWord[] = [
'''
    dest = pathlib.Path(args.out).resolve()
    dest.write_text(header + body + "\n];\n")
    chars = sum(len(o["d"]) for o in out)
    print(f"{len(out)} words, {len(bands)} lines, scale {scale:.5f}, "
          f"word space {space} units")
    print(f"wrote {dest} ({chars / 1024:.0f} KB of path data)")


if __name__ == "__main__":
    main()
