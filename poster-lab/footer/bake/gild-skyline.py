# Strategic gold, grown per facade: torn leaf shapes laid along each target
# building's own window rows (bands), down its face (drips) or on its top edge
# (crowns/cornices), filled with the painting's real leaf texture, then all
# gold pulled toward the lilies' warmer hue.
import numpy as np, warnings; warnings.filterwarnings('ignore')
from PIL import Image
from scipy import ndimage
from skimage import color
rng = np.random.default_rng(7)
A = np.asarray(Image.open('skyline/crop23.png').convert('RGB')).astype(float) / 255
H, W, _ = A.shape
g = np.load('skyline/gold23.npy')
sky = A[2:12, 900:1100].reshape(-1, 3).mean(0)
building = np.abs(A - sky).sum(2) > 0.12

# leaf texture: the real gold of the big banded building, gaps filled from the
# nearest leaf pixel, then tiled; a full field of genuine leaf to cut from
sx0, sy0, sx1, sy1 = 470, 105, 628, 300
src = A[sy0:sy1, sx0:sx1]; sg = g[sy0:sy1, sx0:sx1]
idx = ndimage.distance_transform_edt(~sg, return_distances=False, return_indices=True)
tex = src[idx[0], idx[1]]
reps = (H // tex.shape[0] + 2, W // tex.shape[1] + 2, 1)
TEX = np.tile(np.concatenate([tex, tex[:, ::-1]], 1), reps)[:H, :W]

def ragged(shape, scale, thresh):
    n = ndimage.gaussian_filter(rng.standard_normal(shape), scale)
    return n > thresh * n.std()

def row_lines(x0, y0, x1, y1):
    # the facade's window rows: local maxima of the vertical luminance change
    lum = A[y0:y1, x0:x1].mean(2).mean(1)
    d = np.abs(np.diff(lum)); pk = [i for i in range(1, len(d) - 1) if d[i] >= d[i - 1] and d[i] >= d[i + 1] and d[i] > d.mean()]
    return pk

M = np.zeros((H, W))
def bands(x0, y0, x1, y1, keep=0.5):
    for r in row_lines(x0, y0, x1, y1):
        if rng.random() > keep: continue
        y = y0 + r; t = rng.integers(3, 6)
        seg = ragged((t + 2, x1 - x0), (1, rng.uniform(3, 7)), rng.uniform(-0.3, 0.4))
        M[y - 1:y - 1 + t + 2, x0:x1] = np.maximum(M[y - 1:y - 1 + t + 2, x0:x1], seg[:M[y - 1:y - 1 + t + 2, x0:x1].shape[0]])
def drips(x0, y0, x1, y1, n=6):
    for _ in range(n):
        x = rng.integers(x0, x1 - 3); w = rng.integers(2, 5); L = rng.integers((y1 - y0) // 4, y1 - y0)
        seg = ragged((L, w + 2), (rng.uniform(4, 9), 0.8), rng.uniform(-0.4, 0.2))
        ys = y0 + rng.integers(0, max(1, (y1 - y0) - L))
        M[ys:ys + L, x:x + w + 2] = np.maximum(M[ys:ys + L, x:x + w + 2], seg[:, :M[ys:ys + L, x:x + w + 2].shape[1]])
    fl = ragged((y1 - y0, x1 - x0), 1.2, 2.1)          # loose flakes
    M[y0:y1, x0:x1] = np.maximum(M[y0:y1, x0:x1], fl)
def crown(x0, y0, x1, y1):
    seg = ragged((y1 - y0, x1 - x0), (1.5, 4), -0.6)
    M[y0:y1, x0:x1] = np.maximum(M[y0:y1, x0:x1], seg)

# --- placements (crop coordinates) ---------------------------------------
bands(1790, 66, 1843, 250, 0.7)      # tall grey tower, right
bands(1296, 90, 1340, 210, 0.65)       # grey tower, right of centre
bands(1680, 180, 1740, 260, 0.45)     # white block under the gold crown
drips(1140, 66, 1208, 300, 7)         # dark grid tower
drips(1510, 80, 1556, 290, 5)         # grey tower beside the gilded one
drips(1430, 105, 1497, 290, 5)        # black tower's lower body
drips(1940, 120, 1990, 300, 4)        # right edge tower
crown(1192, 22, 1240, 32); crown(1886, 52, 1931, 61); crown(1240, 125, 1276, 132)
crown(1183, 321, 1270, 329); crown(1700, 331, 1790, 339); crown(1880, 333, 1992, 341); crown(1278, 235, 1345, 243)

alpha = ndimage.gaussian_filter(M, 0.5) * building
alpha = np.clip(alpha * 1.1, 0, 1)
# the leaf catches light unevenly: a little brightness variation across each piece
# brighter than the source field: matched to the original leaf's lit gold
shade = 1.12 + 0.25 * (ndimage.gaussian_filter(rng.random((H, W)), 2) - 0.5)
out = alpha[..., None] * np.clip(TEX * shade[..., None], 0, 1) + (1 - alpha[..., None]) * A
gnew = g | (alpha > 0.5)

w = ndimage.gaussian_filter(gnew.astype(float), 0.8)
lab = color.rgb2lab(out); C = np.hypot(lab[..., 1], lab[..., 2]); h = np.arctan2(lab[..., 2], lab[..., 1])
h2 = h + np.radians(-8) * w; C2 = C * (1 - 0.12 * w)
lab[..., 1] = C2 * np.cos(h2); lab[..., 2] = C2 * np.sin(h2)
res = np.clip(color.lab2rgb(lab), 0, 1)
Image.fromarray((res * 255 + 0.5).astype(np.uint8)).save('skyline/gilded23.png')
q = [100 * gnew[:, i * 500:(i + 1) * 500].mean() for i in range(4)]
print('gold by quarter after:', ['%.1f%%' % v for v in q], 'overall %.1f%%' % (100 * gnew.mean()))
