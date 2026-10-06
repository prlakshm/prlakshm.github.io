# Trace an alpha mask into SVG path data (marching squares at the 50% edge).
# usage: python3 trace.py layer.png scale > path.txt
# Output is in poster units (pixels / scale), every contour closed; draw it with
# fill-rule="evenodd" so stroke rings keep their holes.
import sys

import numpy as np
from PIL import Image
from skimage import measure

img = np.asarray(Image.open(sys.argv[1]).convert('RGBA'), dtype=float)[:, :, 3] / 255.0
scale = float(sys.argv[2])
img = np.pad(img, 2)  # contours touching the edge still close
parts = []
for c in measure.find_contours(img, 0.5):
    if len(c) < 12:
        continue
    c = measure.approximate_polygon(c, tolerance=0.6)
    pts = [((x - 2) / scale, (y - 2) / scale) for y, x in c]
    parts.append('M' + ' L'.join('%.2f %.2f' % p for p in pts[:-1]) + 'Z')
print(' '.join(parts))
