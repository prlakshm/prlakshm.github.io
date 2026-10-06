# The lilies' own gold leaf, laid on the city (her ask, 2026-10-05: "make the
# gold appear in more streaks and abstract patches like lilies. In the city,
# the gold looks too clean"; then "vertical patches depending on building's
# shape and eye flow ... for all versions"). Swatches are cut from the lilies'
# gold layer: their dry-brush streaks and torn patches as painted, creases and
# highlights and all, each ending in a torn edge; never single flecks. Each
# patch reads the tower face it lands on: a tall face takes a vertical patch
# hung from near its top (it leads the eye up the tower), a wide one a
# horizontal patch; patches keep their distance along the skyline.
# Usage: python3 lilygold.py <paint.py bake> <out> <hand|glass|streaks|full>[+3d]
import sys, shutil, numpy as np, cv2, warnings; warnings.filterwarnings('ignore')
from PIL import Image
from scipy import ndimage
from skimage import color
IN, OUT, STYLE = sys.argv[1], sys.argv[2], sys.argv[3]
rng = np.random.default_rng(23)
load = lambda p: np.asarray(Image.open(p).convert('RGB')).astype(np.float32) / 255
img, under = load(f'{IN}.png'), load(f'{IN}-under.png')
gold, leaf = np.load(f'{IN}-gold.npy'), np.load(f'{IN}-leaf.npy')
skyp, gold0 = np.load(f'{IN}-skyp.npy'), np.load(f'{IN}-gold0.npy')
H, W = gold.shape
K = H / 578                                                    # canvas px per source row
building = (~skyp).astype(np.float32)
has_gold = ndimage.binary_dilation(gold0, iterations=10)
smooth = lambda x, a, b: np.clip((x - a) / (b - a), 0, 1) ** 2 * (3 - 2 * np.clip((x - a) / (b - a), 0, 1))
# the landmark towers (PaintingFooter.tsx SKYLINE_TOWERS), canvas px
TOWERS = [(95, 153), (377, 557), (662, 746), (793, 1060), (1475, 1612), (1815, 1899), (2330, 2439), (2442, 2534), (2633, 2770), (3022, 3233)]

# --- the lilies' gold layer -------------------------------------------------
LF = '/Users/pranavi/Documents/GitHub/prlakshm.github.io/public/home/footer/'
lil = load(LF + 'water-lilies-5b-smooth.webp')
R = cv2.resize(load(LF + 'water-lilies-5b-wide-fx.webp')[..., 0], (lil.shape[1], lil.shape[0]), interpolation=cv2.INTER_LINEAR)
la = smooth(R, 0.3, 0.7)                                       # the leaf, soft-edged as the painting has it
lab = color.rgb2lab(lil); C = np.hypot(lab[..., 1], lab[..., 2]); hue = np.degrees(np.arctan2(lab[..., 2], lab[..., 1])) % 360
fringe = (C > 12) & ~((hue > 40) & (hue < 110))               # water or petal colour bleeding into the leaf's edge
# and anything too dark or too white to be leaf (shadowed water, white glare):
# a swatch once came out as white and black blotches
fringe |= (lab[..., 0] < 30) | ((lab[..., 0] > 93) & (C < 10))
core = (la > 0.5) & ~fringe
_, (iy, ix) = ndimage.distance_transform_edt(~core, return_indices=True)
lrgb = lil[iy, ix]                                             # every leaf pixel in a leaf colour
# its whitest glints read gold on the lilies' teal but silver on the city's
# grey: give them the leaf's own pale gold
_l = color.rgb2lab(lrgb); _c = np.hypot(_l[..., 1], _l[..., 2])
_w = smooth(_l[..., 0], 78, 92) * (1 - smooth(_c, 18, 30))
_h = np.radians(78)
_l[..., 1] = _l[..., 1] * (1 - _w) + 24 * np.cos(_h) * _w; _l[..., 2] = _l[..., 2] * (1 - _w) + 24 * np.sin(_h) * _w
_l[..., 0] = np.minimum(_l[..., 0], 93)
lrgb = np.clip(color.lab2rgb(_l), 0, 1).astype(np.float32)
ii = np.pad(la.cumsum(0).cumsum(1), ((1, 0), (1, 0)))         # integral image: leaf density of any window
_g = color.rgb2lab(lrgb); _gc = np.hypot(_g[..., 1], _g[..., 2]); _gh = np.degrees(np.arctan2(_g[..., 2], _g[..., 1])) % 360
goldish = ((_gc > 18) & (_gh > 45) & (_gh < 105) & (_g[..., 0] > 35)).astype(np.float32)
LH, LW = la.shape

def swatch(length, thick, vertical=False):
    """a piece of the lilies' leaf `length` along its strokes and `thick`
    across, from somewhere dense with it, torn at its edges; vertical turns
    the strokes to run down a tower"""
    sw, sh = max(8, min(int(length), LW - 2)), max(8, min(int(thick), LH - 2))
    best = None
    for _ in range(400):
        x, y = rng.integers(0, LW - sw), rng.integers(0, LH - sh)
        d = (ii[y + sh, x + sw] - ii[y, x + sw] - ii[y + sh, x] + ii[y, x]) / (sw * sh)
        if best is not None and d <= best[0]: continue
        # mostly true gold, not glare or shadow
        aw = la[y:y + sh, x:x + sw]
        if (aw * goldish[y:y + sh, x:x + sw]).sum() < 0.85 * aw.sum(): continue
        best = (d, x, y)
        if d > 0.5: break
    if best is None: best = (0, LW // 2 - sw // 2, LH // 2 - sh // 2)
    _, x, y = best
    a = la[y:y + sh, x:x + sw].copy(); c = lrgb[y:y + sh, x:x + sw].copy()
    if rng.random() < 0.5: a, c = a[:, ::-1], c[:, ::-1]
    yy, xx = np.mgrid[0:sh, 0:sw].astype(np.float32)
    r2 = ((xx + 0.5) / sw * 2 - 1) ** 2 + ((yy + 0.5) / sh * 2 - 1) ** 2
    torn = ndimage.gaussian_filter(rng.standard_normal((sh, sw)), max(2.0, min(sw, sh) / 10))
    torn /= torn.std() + 1e-6
    a *= smooth(1 - r2 + 0.28 * torn, 0.0, 0.25)
    if vertical: a, c = np.rot90(a), np.rot90(c)
    return np.ascontiguousarray(a), np.ascontiguousarray(c)

out = img.copy(); acc = np.zeros((H, W), np.float32); log = []
def stamp(cx, cy, a, c, allow, ox=0, oy=0):
    """composite a swatch centred at (cx, cy); `allow` is a mask whose [0, 0]
    sits at canvas (ox, oy)"""
    h, w = a.shape
    x0, y0 = int(cx - w / 2), int(cy - h / 2)
    xs, ys = max(0, x0, ox), max(0, y0, oy)
    xe, ye = min(W, x0 + w, ox + allow.shape[1]), min(H, y0 + h, oy + allow.shape[0])
    if xe <= xs or ye <= ys: return
    aa = a[ys - y0:ye - y0, xs - x0:xe - x0] * allow[ys - oy:ye - oy, xs - ox:xe - ox]
    cc = c[ys - y0:ye - y0, xs - x0:xe - x0]
    out[ys:ye, xs:xe] = out[ys:ye, xs:xe] * (1 - aa[..., None]) + cc * aa[..., None]
    acc[ys:ye, xs:xe] = np.maximum(acc[ys:ye, xs:xe], aa)

# a tower face's own tone, its window grid blurred out
face_L = cv2.GaussianBlur(color.rgb2lab(under)[..., 0], (0, 0), 5)
def face(cx, cy, win=380):
    """the face under (cx, cy): pixels of its tone joined to it, in a window"""
    y0, y1 = max(0, cy - win), min(H, cy + win); x0, x1 = max(0, cx - win // 2), min(W, cx + win // 2)
    same = (np.abs(face_L[y0:y1, x0:x1] - face_L[cy, cx]) < 9) & (building[y0:y1, x0:x1] > 0.5)
    lbl, _ = ndimage.label(same)
    k = lbl[cy - y0, cx - x0]
    if k == 0: return None
    m = lbl == k
    ys, xs = np.nonzero(m)
    return dict(m=cv2.GaussianBlur(m.astype(np.float32), (0, 0), 1.0), ox=x0, oy=y0,
                top=ys.min() + y0, bot=ys.max() + y0, left=xs.min() + x0, right=xs.max() + x0,
                gilded=has_gold[y0:y1, x0:x1][m].mean())

def patch_on(cx, cy, force_vertical=False, long=False):
    f = face(cx, cy)
    if f is None: return False
    fw, fh = f['right'] - f['left'] + 1, f['bot'] - f['top'] + 1
    if fw < 18 or fh < 24 or f['gilded'] > 0.3: return False
    if force_vertical or fh > 1.3 * fw:
        # a tall face: the patch hangs from near its top and runs down it
        L = np.clip(fh * rng.uniform(*((0.6, 0.9) if long else (0.35, 0.7))), 70, 420 if long else 340)
        T = np.clip(fw * rng.uniform(0.3, 0.65), 22, 90)
        pcx = np.clip(cx, f['left'] + T / 2, f['right'] - T / 2)
        pcy = f['top'] + 0.04 * fh + L / 2 + rng.uniform(0, 0.25) * max(fh - L, 0)
        a, c = swatch(L, T, vertical=True)
    else:
        # a wide face: across it, as light lies along a block
        L = np.clip(fw * rng.uniform(0.5, 0.95), 80, 300); T = rng.uniform(22, 60)
        pcx = (f['left'] + f['right']) / 2 + rng.uniform(-0.15, 0.15) * fw; pcy = cy
        a, c = swatch(L, T)
    stamp(pcx, pcy, a, c, f['m'], f['ox'], f['oy'])
    return True

def spaced(count, gap, weight, try_fn):
    """place `count` patches by `weight`, none closer than `gap` px: an even
    rhythm along the skyline rather than clumps"""
    p = weight.ravel() / weight.sum()
    placed = []
    for q in rng.choice(H * W, size=count * 40, p=p):
        if len(placed) >= count: break
        cy, cx = divmod(int(q), W)
        if any((cx - x) ** 2 + (cy - y) ** 2 < gap * gap for x, y in placed): continue
        if try_fn(cx, cy): placed.append((cx, cy))
    log.append(len(placed))
    return placed

rows = np.arange(H)[:, None] / K
tower_band = smooth(rows, 150, 230) * (1 - smooth(rows, 440, 520))   # the towers, not the street-level low-rises
landmark = np.ones((1, W), np.float32)
for x0, x1 in TOWERS: landmark[0, x0:x1] = 2.5

# --- the parts ----------------------------------------------------------------
def hand():
    # today's placements (caps, cornices, bands, drips) redone in the lilies' leaf
    soft = cv2.GaussianBlur(leaf.astype(np.float32), (0, 0), 1.0) * (~gold0)
    out[:] = out * (1 - soft[..., None]) + under * soft[..., None]      # lift the clean leaf off
    lbl, n = ndimage.label(leaf)
    for i, sl in enumerate(ndimage.find_objects(lbl), 1):
        if sl is None: continue
        ys, xs = sl; h, w = ys.stop - ys.start, xs.stop - xs.start
        vertical = h > 1.5 * w
        length, thick = (h, w) if vertical else (w, h)
        a, c = swatch(max(length, 30) * 1.15 + 10, max(thick, 8) * 2.4 + 8, vertical)
        near = ndimage.binary_dilation(lbl == i, iterations=9).astype(np.float32) * building
        stamp((xs.start + xs.stop) / 2, (ys.start + ys.stop) / 2, a, c, near)
def verticals(count, long=False):
    # vertical patches down tall, ungilded towers, spaced across the skyline so
    # the eye steps from tower to tower and up each one
    upper = smooth(rows, 160, 230) * (1 - smooth(rows, 330, 400))
    spaced(count, 300, upper * landmark * building + 1e-9, lambda x, y: patch_on(x, y, force_vertical=True, long=long))
def glass(count):
    # light caught on the glass: on each face it lands on, shaped by that face
    spaced(count, 130, tower_band * landmark * building + 1e-9, patch_on)
def sweep(count):
    # long dry-brush passes across the city, as the lilies' water streaks run
    for j in range(count):
        cy = (215 + j * (260 / max(count - 1, 1)) + rng.uniform(-15, 15)) * K
        a, c = swatch(rng.uniform(800, 1500), rng.uniform(30, 56))
        stamp(rng.uniform(0.15, 0.85) * W, cy, a, c, building)

def laid_on_top(ga, strength=1.0):
    # The lilies' leaf looks laid on top because each piece is modelled as a
    # raised, crumpled sheet: lit from above, its upper slopes go near white,
    # its creases and lower edges dark brown-gold, and it darkens the paint
    # just below it. So every piece of gold gets a height (a rounded shoulder
    # at its edge, then its own crinkle), is lit from the upper left, and casts
    # a soft shadow down and right onto the building under it.
    inside = ga > 0.5
    d = ndimage.distance_transform_edt(inside)
    dome = 1 - (1 - np.clip(d / 2.0, 0, 1)) ** 2                  # a sheet's edge: a 2 px shoulder, then flat (4 px made flecks into beads)
    Y = out.mean(2)
    crinkle = (Y - cv2.GaussianBlur(Y, (0, 0), 2.5)) * inside     # the leaf's own crinkle
    ridges = ndimage.gaussian_filter(rng.standard_normal((H, W)), (1.5, 5.0))   # dry-brush ridges, lying along the strokes
    hgt = cv2.GaussianBlur(1.6 * dome + 7.0 * crinkle + 0.9 * ridges * inside, (0, 0), 0.7)
    gx = cv2.Sobel(hgt.astype(np.float32), cv2.CV_32F, 1, 0, ksize=3) / 8
    gy = cv2.Sobel(hgt.astype(np.float32), cv2.CV_32F, 0, 1, ksize=3) / 8
    n = np.dstack([-gx * 1.6, -gy * 1.6, np.ones_like(gx)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
    L = np.array([-0.5, -0.7, 0.55]); L /= np.linalg.norm(L)
    Hh = L + np.array([0, 0, 1.0]); Hh /= np.linalg.norm(Hh)
    diff = np.clip(n @ L, 0, 1)
    spec = np.clip(n @ Hh, 0, 1) ** 14                             # broad, bright tops, as the lilies' go near white
    shade = 0.6 + 0.75 * diff                                      # flat leaf ~1: only slopes change
    lit = out * shade[..., None] + spec[..., None] * np.array([1.0, 0.92, 0.72]) * 0.62
    # the lilies' tops stop at a warm near-white (their gold tops out ~L 90), never paper white
    _ll = color.rgb2lab(np.clip(lit, 0, 1)); _ll[..., 0] = np.minimum(_ll[..., 0], 92)
    lit = color.lab2rgb(_ll).astype(np.float32)
    k = np.clip(ga * strength, 0, 1)[..., None]
    # the shadow it casts, away from the light, on the paint around it
    sh = cv2.GaussianBlur(ndimage.shift(ga, (3.0, 2.0), order=1), (0, 0), 2.2) * (1 - ga)
    base = out * (1 - 0.34 * strength * sh)[..., None]
    out[:] = np.clip(base * (1 - k) + np.clip(lit, 0, 1) * k, 0, 1)

STYLE_3D = STYLE.endswith('+3d'); STYLE = STYLE.replace('+3d', '')
if STYLE == 'hand': hand(); verticals(5)
elif STYLE == 'glass': hand(); glass(42)
elif STYLE == 'streaks': hand(); sweep(3); verticals(6, long=True)
elif STYLE == 'full': hand(); glass(30); sweep(2); verticals(4, long=True)
gold_out = (gold & ~leaf) | (acc > 0.5)
if STYLE_3D:
    laid_on_top(np.maximum(acc, cv2.GaussianBlur((gold & ~leaf).astype(np.float32), (0, 0), 0.6)))
Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)).save(f'{OUT}.png')
np.save(f'{OUT}-gold.npy', gold_out)
for suf in ('-cloud.npy', '-cloud-rgb.npy', '-matte.npy'):
    shutil.copy(f'{IN}{suf}', f'{OUT}{suf}')
print(f'{OUT}: gold {100 * gold_out.mean():.1f}% (band {100 * gold_out[round(182 * K):].mean():.1f}%) | placed per pass {log}')
