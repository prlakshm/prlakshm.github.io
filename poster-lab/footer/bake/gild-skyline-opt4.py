# Strategic gold, grown per facade: torn leaf shapes laid along each target
# building's own window rows (bands), down its face (drips) or on its top edge
# (crowns/cornices), filled with the painting's real leaf texture, then all
# gold pulled toward the lilies' warmer hue.
import numpy as np, warnings; warnings.filterwarnings('ignore')
from PIL import Image
from scipy import ndimage
from skimage import color
rng = np.random.default_rng(7)
A = np.asarray(Image.open('images/24.webp').convert('RGB')).astype(float) / 255
OY = 172  # placements below are in crop coordinates; the crop sat at y 172
H, W, _ = A.shape
_a = A; _lab = color.rgb2lab(_a); _C = np.hypot(_lab[...,1], _lab[...,2]); _h = np.degrees(np.arctan2(_lab[...,2], _lab[...,1])) % 360
g = (_C > 30) & (_h > 50) & (_h < 100) & (_lab[...,0] > 40)
sky = A[2:12, 900:1100].reshape(-1, 3).mean(0)
building = np.abs(A - sky).sum(2) > 0.12

# leaf texture: the real gold of the big banded building, gaps filled from the
# nearest leaf pixel, then tiled; a full field of genuine leaf to cut from
sx0, sy0, sx1, sy1 = 470, 105 + 172, 628, 300 + 172
src = A[sy0:sy1, sx0:sx1]; sg = g[sy0:sy1, sx0:sx1]
idx = ndimage.distance_transform_edt(~sg, return_distances=False, return_indices=True)
tex = src[idx[0], idx[1]]
reps = (H // tex.shape[0] + 2, W // tex.shape[1] + 2, 1)
# Fill colour drawn from the real flakes: every gold pixel of the banded
# building, ordered dark to light; a smooth random field picks into that
# ladder, so new leaf has the painting's own range of lit and shaded gold.
real = src[sg]                                                     # (n, 3) real gold colours
order = np.argsort(color.rgb2lab(real[None])[0][:, 0]); real = real[order]
field = ndimage.gaussian_filter(rng.standard_normal((H, W)), 0.8) + 0.6 * ndimage.gaussian_filter(rng.standard_normal((H, W)), 3)
u = (np.argsort(np.argsort(field.ravel())) / field.size).reshape(H, W)
u = 0.15 + 0.85 * u                                                # skip the very darkest edge pixels
TEX = real[np.minimum((u * len(real)).astype(int), len(real) - 1)]

def ragged(shape, scale, thresh):
    n = ndimage.gaussian_filter(rng.standard_normal(shape), scale)
    return n > thresh * n.std()

def row_lines(x0, y0, x1, y1):
    # the facade's window rows: local maxima of the vertical luminance change
    lum = A[y0:y1, x0:x1].mean(2).mean(1)
    d = np.abs(np.diff(lum)); pk = [i for i in range(1, len(d) - 1) if d[i] >= d[i - 1] and d[i] >= d[i + 1] and d[i] > d.mean()]
    return pk

M = np.zeros((H, W))
def flecks(shape, env_scale, env_t, fine_t):
    # torn leaf: fine flakes (sub-pixel noise) that only survive inside coarser
    # ragged clusters, so a band reads as broken gilt with dark gaps
    env = ragged(shape, env_scale, env_t)
    fine = ragged(shape, 0.7, fine_t)
    return (env & fine) | (env & ragged(shape, 1.6, fine_t + 0.4))
def bands(x0, y0, x1, y1, keep=0.5, light=False):
    for r in row_lines(x0, y0, x1, y1):
        if rng.random() > keep: continue
        y = y0 + r; t = rng.integers(2, 4) if light else rng.integers(3, 6)
        seg = flecks((t + 2, x1 - x0), (1, rng.uniform(4, 9)), rng.uniform(0.0, 0.6) if light else rng.uniform(-0.3, 0.4), -0.2)
        sl = M[y - 1:y - 1 + t + 2, x0:x1]
        M[y - 1:y - 1 + t + 2, x0:x1] = np.maximum(sl, seg[:sl.shape[0]])
def drips(x0, y0, x1, y1, n=6):
    for _ in range(n):
        x = rng.integers(x0, x1 - 3); w = rng.integers(2, 5); L = rng.integers((y1 - y0) // 4, y1 - y0)
        seg = ragged((L, w + 2), (rng.uniform(4, 9), 0.8), rng.uniform(-0.4, 0.2))
        ys = y0 + rng.integers(0, max(1, (y1 - y0) - L))
        M[ys:ys + L, x:x + w + 2] = np.maximum(M[ys:ys + L, x:x + w + 2], seg[:, :M[ys:ys + L, x:x + w + 2].shape[1]])
    fl = ragged((y1 - y0, x1 - x0), 1.2, 2.1)          # loose flakes
    M[y0:y1, x0:x1] = np.maximum(M[y0:y1, x0:x1], fl)
def crown(x0, y0, x1, y1):
    seg = flecks((y1 - y0, x1 - x0), (1.5, 5), -0.5, -0.4)
    M[y0:y1, x0:x1] = np.maximum(M[y0:y1, x0:x1], seg)

# --- placements (full-image coordinates; option 4's far-right quarter) ----
bands(1795, 262, 1912, 465, 0.62)     # big white grid tower: the right's banded anchor
crown(1792, 228, 1913, 236)           # its cap
drips(1918, 296, 1970, 470, 4)        # dark tower beside it
bands(1682, 268, 1718, 395, 0.35, light=True)      # striped beige tower
crown(1731, 300, 1771, 306)           # rust brick tower
crown(1810, 433, 1860, 440)           # dark low building

alpha = ndimage.gaussian_filter(M, 0.5) * building
alpha = np.clip(alpha * 1.1, 0, 1)
# the leaf catches light unevenly: a little brightness variation across each piece
# brighter than the source field: matched to the original leaf's lit gold
shade = np.ones((H, W))
out = alpha[..., None] * np.clip(TEX * shade[..., None], 0, 1) + (1 - alpha[..., None]) * A
gnew = g | (alpha > 0.5)

w = ndimage.gaussian_filter(gnew.astype(float), 0.8)
lab = color.rgb2lab(out); C = np.hypot(lab[..., 1], lab[..., 2]); h = np.arctan2(lab[..., 2], lab[..., 1])
h2 = h + np.radians(-8) * w; C2 = C * (1 - 0.12 * w)
lab[..., 1] = C2 * np.cos(h2); lab[..., 2] = C2 * np.sin(h2)
res = np.clip(color.lab2rgb(lab), 0, 1)
Image.fromarray((res * 255 + 0.5).astype(np.uint8)).save('skyline/gilded24-full.png')
q = [100 * gnew[172:, i * 500:(i + 1) * 500].mean() for i in range(4)]
print('gold by quarter after:', ['%.1f%%' % v for v in q], 'overall %.1f%%' % (100 * gnew.mean()))
