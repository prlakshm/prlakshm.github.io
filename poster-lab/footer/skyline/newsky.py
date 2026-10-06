# Her painted-sky version of option 4 (source-opt4-sky.webp, 2026-10-05): the
# same city redrawn by Midjourney (~1.4% taller, shifted a few px) under a
# painted sky. Its sky can't be keyed (clouds, pink), so the old flat-sky
# image's clean sky mask is carried across: align old to new on the buildings,
# warp the mask, then snap its edge to the new image's own roof edges (within
# a few px, each pixel goes with whichever side, sky or building, it matches).
# Usage: python3 newsky.py <tag> (source-opt4-<tag>.webp). Writes m_sky_<tag>.npy
# (2000 x 578, True = sky) and newsky-<tag>.json (the affine).
import sys, json, numpy as np, cv2, warnings; warnings.filterwarnings('ignore')
TAG = sys.argv[1] if len(sys.argv) > 1 else 'sky'               # source-opt4-<TAG>.webp
from PIL import Image
from scipy import ndimage
old = np.asarray(Image.open('source-opt4.webp').convert('RGB')).astype(np.float32) / 255
new = np.asarray(Image.open(f'source-opt4-{TAG}.webp').convert('RGB')).astype(np.float32) / 255
H, W, _ = old.shape
# the old sky, keyed as base.py does
sky_rgb = old[4:12, 750:1100].reshape(-1, 3).mean(0)
d = np.abs(old - sky_rgb).sum(2)
tex = ndimage.uniform_filter(ndimage.gaussian_gradient_magnitude(old.mean(2), 1.0), 5)
near = (d < 0.04) & (tex < 0.012)
lbl, _ = ndimage.label(near)
sky = np.isin(lbl, np.unique(lbl[0][near[0]])); sky = ndimage.binary_opening(sky, iterations=1)
for _ in range(10): sky = sky | (ndimage.binary_dilation(sky) & (d < 0.05))
# low pockets: smooth, sky-coloured, anywhere
pk = (d < 0.12) & (tex < 0.008)
pl, pn = ndimage.label(pk); sz = np.bincount(pl.ravel()); sz[0] = 0
sky = sky | (sz[pl] >= 12)
# align on edges, buildings only
edges = lambda g: np.hypot(cv2.Sobel(g, cv2.CV_32F, 1, 0), cv2.Sobel(g, cv2.CV_32F, 0, 1))
ga = edges(cv2.GaussianBlur(cv2.cvtColor(old, cv2.COLOR_RGB2GRAY), (0, 0), 1.5))
gb = edges(cv2.GaussianBlur(cv2.cvtColor(new, cv2.COLOR_RGB2GRAY), (0, 0), 1.5))
m = (~ndimage.binary_dilation(sky, iterations=3)).astype(np.uint8)
w = np.eye(2, 3, dtype=np.float32)
cc, w = cv2.findTransformECC(ga, gb, w, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 300, 1e-7), m, 5)
print('alignment', round(cc, 3), w.round(4).tolist())
# warp the old sky into the new image's frame (new(x) ~ old(w^-1 x))
wi = cv2.invertAffineTransform(w)
skyw = cv2.warpAffine(sky.astype(np.float32), w, (W, H), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE) > 0.5
# snap to the new image's edges: in a 5 px band, each pixel joins the side
# whose local colour it is closer to
sure_sky = ndimage.binary_erosion(skyw, iterations=4); sure_bld = ndimage.binary_erosion(~skyw, iterations=4)
band = ~sure_sky & ~sure_bld
def local_mean(mask, s=5):
    mf = mask.astype(np.float32)
    den = cv2.GaussianBlur(mf, (0, 0), s) + 1e-5
    return np.dstack([cv2.GaussianBlur(new[..., c] * mf, (0, 0), s) / den for c in range(3)])
ms, mb = local_mean(sure_sky), local_mean(sure_bld)
ds = np.abs(new - ms).sum(2); db = np.abs(new - mb).sum(2)
skyn = sure_sky | (band & (ds < db))
skyn = ndimage.binary_opening(skyn, iterations=1) | sure_sky
# keep only sky connected to the top, or real pockets (>= 12 px)
lbl, n = ndimage.label(skyn); sz = np.bincount(lbl.ravel()); sz[0] = 0
skyn = sz[lbl] >= 12
np.save(f'm_sky_{TAG}.npy', skyn)
json.dump({'affine_old_to_new': w.tolist()}, open(f'newsky-{TAG}.json', 'w'))
print('sky %.1f%% of the image (old %.1f%%)' % (100 * skyn.mean(), 100 * sky.mean()))
