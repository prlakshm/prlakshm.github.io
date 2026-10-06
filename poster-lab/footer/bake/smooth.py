# Footer painting bake. Run from this folder, in order:
#   1. python3 -c "from PIL import Image; Image.open('../lily-top-full.png').convert('RGB').crop((0, 648, 3376, 1334)).save('paint_crop.png')"
#   2. python3 masks.py    -> m_*.npy masks (gold, lily, pad, motion, height) + mask_overlay.png
#   3. python3 smooth.py   -> smooth_{light,medium,strong}.png (water and pads blended; gold and lilies untouched)
# The site uses smooth_softer.png as public/home/footer/water-lilies-5b-soft.webp (q86);
# the fx map (water-lilies-5b-wide-fx.webp) is packed from the masks at half size.
# Blend the painting smooth, the way mesq's three.js painting is: colour averaged
# along each stroke's own direction (line-integral convolution on the structure
# tensor's flow), stopping at strong colour edges, so the canvas weave and broken
# impasto melt into soft blended fields. Lilies stay sharp; gold keeps its leaf.
import sys, time
import numpy as np, cv2
from PIL import Image
from scipy import ndimage

src = np.asarray(Image.open('paint_crop.png').convert('RGB')).astype(np.float32) / 255
H, W, _ = src.shape

def flow(img, sigma):
    Y = cv2.GaussianBlur(0.2126 * img[..., 0] + 0.7152 * img[..., 1] + 0.0722 * img[..., 2], (0, 0), 1.0)
    gx = cv2.Sobel(Y, cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(Y, cv2.CV_32F, 0, 1, ksize=3)
    jxx = cv2.GaussianBlur(gx * gx, (0, 0), sigma); jxy = cv2.GaussianBlur(gx * gy, (0, 0), sigma); jyy = cv2.GaussianBlur(gy * gy, (0, 0), sigma)
    a = 0.5 * np.arctan2(2 * jxy, jxx - jyy)              # gradient orientation
    tx, ty = -np.sin(a), np.cos(a)                          # along the strokes
    tr = jxx + jyy; dd = np.sqrt((jxx - jyy) ** 2 + 4 * jxy ** 2)
    coh = np.where(tr > 1e-6, dd / (tr + 1e-6), 0) ** 2     # how clearly stroked
    # where there's no clear stroke, the pond's strokes run sideways
    w = np.clip(coh * 3, 0, 1)
    tx = w * tx + (1 - w) * 1.0; ty = w * ty
    n = np.sqrt(tx * tx + ty * ty) + 1e-6
    return (tx / n).astype(np.float32), (ty / n).astype(np.float32)

def lic(img, tx, ty, steps, h=1.5, k=10.0, kgrad=None):
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    acc = img.copy(); wsum = np.ones((H, W), np.float32)
    for sgn in (1.0, -1.0):
        px, py = xs.copy(), ys.copy(); dx, dy = tx * sgn, ty * sgn
        for i in range(1, steps + 1):
            px = np.clip(px + dx * h, 0, W - 1); py = np.clip(py + dy * h, 0, H - 1)
            ntx = cv2.remap(tx, px, py, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
            nty = cv2.remap(ty, px, py, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
            s = np.where(ntx * dx + nty * dy < 0, -1.0, 1.0).astype(np.float32)   # tensor flow has no sign
            dx, dy = ntx * s, nty * s
            c = cv2.remap(img, px, py, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
            d2 = ((c - img) ** 2).sum(-1)
            wgt = np.exp(-2.0 * (i / steps) ** 2) * np.exp(-k * d2)
            acc += c * wgt[..., None]; wsum += wgt
    return acc / wsum[..., None]

gold = np.load('m_gold.npy'); lily0 = np.load('m_lily.npy'); pad = np.load('m_pad.npy').astype(np.float32)
soft = lambda m, s: cv2.GaussianBlur(m.astype(np.float32), (0, 0), s)
from skimage import color
lab = color.rgb2lab(src); Lc, Ac, Bc = lab[..., 0], lab[..., 1], lab[..., 2]
Cc = np.hypot(Ac, Bc); hue = (np.degrees(np.arctan2(Bc, Ac)) + 360) % 360

# Gold stays exactly as painted: the leaf, the small holes inside each fleck,
# and its bright highlights (94% of the very bright pixels touch gold).
holes = ndimage.binary_fill_holes(gold) & ~gold
hl, hn = ndimage.label(holes)
small = np.isin(hl, 1 + np.nonzero(ndimage.sum(holes, hl, range(1, hn + 1)) < 600)[0])
gold_keep = gold | small | (Lc > 85)

# Lilies stay exactly as painted, pale petal tips included; their pink
# reflections are water and get blended.
# Built from the petals' own pixels (the old mask was a convex hull, which
# also froze the water between petal tips): any pink, from deep shadow to pale
# tip, around each flower; gaps enclosed by petals stay with the flower.
pinkish = (Ac > 6) & ((hue > 320) | (hue < 45)) & (Cc > 8) & (Lc > 30)
# the palest, almost-white petal strokes (water is never this light and neutral)
whitish = (Lc > 68) & ((Cc < 8) | (hue > 320) | (hue < 60))
petal = (pinkish | (whitish & ndimage.binary_dilation(pinkish, iterations=4))) & ndimage.binary_dilation(lily0, iterations=30)
petal = ndimage.binary_fill_holes(ndimage.binary_closing(petal, iterations=2))
petal = ndimage.binary_opening(petal, iterations=1)
lab_p, n_p = ndimage.label(petal)                      # drop stray pink specks in the water
petal = np.isin(lab_p, 1 + np.nonzero(ndimage.sum(petal, lab_p, range(1, n_p + 1)) >= 150)[0])
lily_keep = ndimage.binary_dilation(petal, iterations=2)
# Reflections are water: drop everything below each flower's base, so they
# blend (and can ripple) instead of staying as crisp as the flower.
lit = ndimage.binary_opening(lily_keep & (Lc > 55) & (Ac > 10), iterations=1)
lab_f, n_f = ndimage.label(ndimage.binary_closing(lit, iterations=4))
below = np.zeros_like(lily_keep)
flowers = []
for i, sl in enumerate(ndimage.find_objects(lab_f)):
    if (lab_f[sl] == i + 1).sum() < 3000: continue
    ys = np.nonzero((lab_f == i + 1).any(1))[0]; xs = np.nonzero((lab_f == i + 1).any(0))[0]
    base = ys.max()
    below[base + 4:, max(0, xs.min() - 30):xs.max() + 30] = True
    flowers.append((int(xs.min()), int(ys.min()), int(xs.max()), int(base)))
lily_keep &= ~below
np.save('m_flowers.npy', np.array(flowers))

# For the smoothing pass, kept pieces become holes filled with the water
# around them, so no gold or pink smears into it.
keep = ndimage.binary_dilation(gold_keep, iterations=1) | lily_keep
valid = (~keep).astype(np.float32)
fill = cv2.GaussianBlur(src * valid[..., None], (0, 0), 4) / (cv2.GaussianBlur(valid, (0, 0), 4)[..., None] + 1e-4)
for _ in range(3):   # wide holes: keep spreading the surrounding water inward
    v2 = cv2.GaussianBlur(valid, (0, 0), 12)
    fill = np.where((cv2.GaussianBlur(valid, (0, 0), 4) < 0.05)[..., None], cv2.GaussianBlur(src * valid[..., None], (0, 0), 12) / (v2[..., None] + 1e-4), fill)
base = np.where(keep[..., None], fill, src).astype(np.float32)
# pads blended nearly as much as open water (keeps a hint of their stroke)
weight = np.clip(1.0 - 0.12 * soft(pad, 4), 0, 1)
# the originals, laid back on top: gold crisp; lilies feathered ~1 CSS px so they sit in the paint
on_top = np.clip(soft(gold_keep, 0.6) + soft(ndimage.binary_erosion(lily_keep, iterations=1), 2.4), 0, 1)
np.save('m_keep_gold.npy', gold_keep); np.save('m_keep_lily.npy', lily_keep)
levels = {'light': dict(steps=8, sigma=4, cross=0.6), 'medium': dict(steps=16, sigma=6, cross=1.0), 'strong': dict(steps=26, sigma=8, cross=1.5),
          # mesq-soft: strokes cross colour edges at partial strength (weak edge-stop), then a
          # wet-in-wet melt across the strokes, so pad and water edges dissolve into each other
          'soft': dict(steps=30, sigma=9, cross=1.5, k=2.5, melt=3.0, mix=0.75),
          'softer': dict(steps=34, sigma=10, cross=2.0, k=1.0, melt=4.5, mix=0.85)}
for name in (sys.argv[1:] or levels):
    L = levels[name]; t0 = time.time()
    tx, ty = flow(base, L['sigma'])
    sm = lic(base, tx, ty, L['steps'], k=L.get('k', 10.0))
    sm = cv2.GaussianBlur(sm, (0, 0), L['cross'])                       # melt what's left of the weave
    if 'melt' in L:
        # wet-in-wet: a second pass along the strokes on the already-smoothed paint, then
        # a soft melt across them; mixed back so shapes still read
        tx2, ty2 = flow(sm, L['sigma'] * 1.5)
        sm2 = lic(sm, tx2, ty2, L['steps'], k=L['k'] * 0.5)
        sm2 = cv2.GaussianBlur(sm2, (0, 0), L['melt'])
        sm = sm * (1 - L['mix']) + sm2 * L['mix']
    out = base * (1 - weight[..., None]) + sm * weight[..., None]
    out = out * (1 - on_top[..., None]) + src * on_top[..., None]
    assert np.isfinite(out).all()
    Image.fromarray(np.clip(out * 255 + 0.5, 0, 255).astype(np.uint8)).save(f'smooth_{name}.png')
    print(name, 'done in %.0fs' % (time.time() - t0))
