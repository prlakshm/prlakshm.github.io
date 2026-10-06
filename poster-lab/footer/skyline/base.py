# Skyline footer, step 1: Pranavi's crop of option 4 (gilded; y 14-420 by default),
# upscaled to the lilies' working width (3376 x 686), plus masks:
#   m_gold  gold leaf          m_sky  sky (flood-filled from the top edge)
#   m_warm  brick / pink / rust accents (kept warm when the neutrals are cooled)
import numpy as np, cv2, warnings; warnings.filterwarnings('ignore')
from PIL import Image
from scipy import ndimage
from skimage import color
import sys
# her crop: every building top in frame, as in her Figma reference (all
# summits sit at y 28-30 or lower in the 578px source); the bottom cuts
# through the lower buildings. Was y 131 before she moved it up.
CROP_Y = int(sys.argv[1]) if len(sys.argv) > 1 else 14
# `base.py 0 578` is the whole painting (3376 x 976): bake that once and let
# export.py slice the site's band out of it, so the gold doesn't re-scatter
# each time the crop moves and Figma can show the exact pixels
CROP_H = int(sys.argv[2]) if len(sys.argv) > 2 else 406
W, H = 3376, round(3376 * CROP_H / 2000)
# her own image, ungilded: the gold paint.py adds follows the painting's own
# patterns (gilded-opt4-full.png's leaf was flecks, which she called freckles)
import os, json
# SRC=sky: her painted-sky version (2026-10-05), its sky mask carried over from
# the flat-sky image by newsky.py, and the old placements mapped by its affine
TAG = os.environ.get('SRC'); NEWSKY = bool(TAG)             # SRC=<tag>: source-opt4-<tag>.webp
src = Image.open(f'source-opt4-{TAG}.webp' if NEWSKY else 'source-opt4.webp').convert('RGB').crop((0, CROP_Y, 2000, CROP_Y + CROP_H))
meta = {'y': CROP_Y, 'h': CROP_H}
if NEWSKY: meta['affine'] = json.load(open(f'newsky-{TAG}.json'))['affine_old_to_new']; meta['given_sky'] = True
json.dump(meta, open('canvas.json', 'w'))
img = src.resize((W, H), Image.LANCZOS)
a = np.asarray(img).astype(np.float32) / 255
lab = color.rgb2lab(a); L, A, B = lab[..., 0], lab[..., 1], lab[..., 2]
C = np.hypot(A, B); h = np.degrees(np.arctan2(B, A)) % 360
gold = (C > 30) & (h > 50) & (h < 100) & (L > 40)
sky_rgb = a[4:20, 1500:1900].reshape(-1, 3).mean(0)
d = np.abs(a - sky_rgb).sum(2)
# real sky is smooth; the pale distant buildings in the haze carry window
# texture, so a texture check keeps them out of the sky...
tex = ndimage.uniform_filter(ndimage.gaussian_gradient_magnitude(a.mean(2), 1.0), 9)
near = (d < 0.04) & (tex < 0.012)
lbl, _ = ndimage.label(near)
sky = np.isin(lbl, np.unique(lbl[0][near[0]]))
sky = ndimage.binary_opening(sky, iterations=1)
# ...but that check also stops the sky a few px short of every building (an
# edge is texture), so grow it back out through sky-coloured pixels only
for _ in range(10):
    sky = sky | (ndimage.binary_dilation(sky) & (d < 0.05))
if NEWSKY:
    ms = np.load(f'm_sky_{TAG}.npy')[CROP_Y:CROP_Y + CROP_H].astype(np.float32)
    sky = cv2.resize(ms, (W, H), interpolation=cv2.INTER_LINEAR) > 0.5
warm = (C > 14) & ((h < 50) | (h > 330)) & ~gold & ~sky   # brick, rust, pink: stay warm (not her pink clouds)
img.save('canvas.png')
np.save('m_gold.npy', gold); np.save('m_sky.npy', sky); np.save('m_sky2.npy', sky); np.save('m_warm.npy', warm)
print('canvas', img.size, '| gold %.1f%%  sky %.1f%%  warm accents %.1f%%' % (100 * gold.mean(), 100 * sky.mean(), 100 * warm.mean()))
