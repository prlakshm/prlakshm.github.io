"""Fit tissue input colours so the sheet RENDERS at an approved colour.

Crumpled tissue is see-through (alpha ~0.6) and its lit facets are lifted
toward white, so a sheet baked at #ff9ccc reads lighter and softer on the page.
This bakes a test sheet, composites it on the page ground the way the browser
does, takes the median of its body, and nudges the input until that median
lands on the target. Prints the fitted inputs.

  python3 fit_tissue.py '#f8fafc' ff9ccc c9a6ff ...
"""
import sys
import numpy as np
import os
import kit
ALPHA = float(os.environ.get('ALPHA', 0.6))
LIFT = float(os.environ['LIFT']) if os.environ.get('LIFT') else None
from kit import canvas, tri, quad, tissue_crumpled

def rendered(col, bg, seeds=(801, 941)):
    kit.PX = 10
    out = []
    for i, sd in enumerate(seeds):
        w, h = canvas(24, 24) if i == 0 else canvas(20, 20)
        mask = tri(w, h, sd) if i == 0 else quad(w, h, sd)
        rgba = tissue_crumpled(mask, w, h, col, sd, S=18.0, alpha=ALPHA, lift=LIFT)
        a = rgba[..., 3:]
        c = rgba[..., :3] * 255 * a + bg * (1 - a)
        out.append(c[rgba[..., 3] > 0.5])
    return np.median(np.concatenate(out), 0)

hx = lambda v: '#%02x%02x%02x' % tuple(int(round(x)) for x in np.clip(v, 0, 255))
rgb = lambda s: np.array([int(s.lstrip('#')[i:i + 2], 16) for i in (0, 2, 4)], float)

bg = rgb(sys.argv[1])
for t in sys.argv[2:]:
    target = rgb(t)
    inp = target.copy()
    for it in range(7):
        got = rendered(hx(inp), bg)
        err = target - got
        if np.abs(err).max() < 1.5:
            break
        inp = np.clip(inp + 1.4 * err, 0, 255)
    print(t, '->', hx(inp), 'renders', hx(got), 'max err %.1f' % np.abs(err).max())
