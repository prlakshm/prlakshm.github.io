"""Pranavi's three Figma frames, exported at their own size (the shaders
change their pattern when the frame is scaled, so the 1x export is the only
faithful one), enlarged into the 1600x2000 poster and given clean grout: the
gutters and bevels of the clean source poster are laid over the export.
Nothing else is touched.
    python3 clean-grout.py  ->  exports/figma-clean-1/2/3.png
"""
import numpy as np, os
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.join(HERE, 'figma-src'); OUT = os.path.join(HERE, 'exports')
import importlib.util
spec = importlib.util.spec_from_file_location('cf', os.path.join(HERE, 'compose-figma.py')); cf = importlib.util.module_from_spec(spec); spec.loader.exec_module(cf)
# where each frame sits on the poster (poster px), from the Figma crop transforms
CROP = {1: (48, 44, 1556, 1968), 2: (30, 33, 1570, 1960), 3: (48, 44, 1556, 1968)}
BASE = {1: 'poster-row13-soft.png', 2: 'poster-row10-cold.png', 3: 'poster-row13-soft.png'}
for i in (1, 2, 3):
    x0, y0, x1, y1 = CROP[i]
    base = cf.load(BASE[i])
    ex = Image.open(os.path.join(SRC, f'frame{i}.png')).convert('RGB').resize((x1 - x0, y1 - y0), Image.LANCZOS)
    canvas = base.copy()
    canvas[y0:y1, x0:x1] = np.asarray(ex).astype(np.float32)
    # frame 3's slices bend the grid: lay the clean grout and bevel over everything
    depth = 26 if i == 3 else 14
    out = cf.clean_grout(canvas, base, depth=depth)
    cf.save(out, os.path.join(OUT, f'figma-clean-{i}.png'))
    print(i, 'ok')
