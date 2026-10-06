# Skyline footer, step 2: make it OPTICALLY the lilies' painting, not just
# the same filter. Measured against water-lilies-5b-smooth (optics.py):
#   - colour: the lilies' neutrals are cool (b* -7) with painted darks (no black
#     below L ~22); the skyline was warm (+4.5) with pure blacks (L 3). Cool the
#     greys, keep brick/pink warm, lift the blacks into blue-black paint.
#   - softness: the lilies are soft blended fields (mid/big 0.71) with fine brush
#     grain (fine/mid 0.41). The skyline had crisp window grids (0.92) and no
#     grain (0.22). Blend along each stroke's flow (the lilies' line-integral
#     pass, edge-stop relaxed so window grids melt), then lay stroke-direction
#     grain back in.
#   - sky: 25% of the band was one flat grey. Either paint it (a full-bleed
#     band, like the lilies) or dissolve it into the page's wall.
#   - gold: the lilies' leaf is brighter (L 51/71/84) with glints, and traces
#     the rims of the pads. Remap the skyline's gold to those tones and add rim
#     leaf along rooflines and setbacks, filled from the lilies' own gold.
# Usage: python3 paint.py [sky: painted|wall|source] [grade: monet|monet+|cool|none] [out name] [light|deep] [soft|mid|crisp|own]
# Her call (2026-10-05): `source none OUT light own` - the city keeps its own
# colours and brushwork (the grade had muted its red brick, whites and blacks);
# only the gold foil is treated like the lilies'.
import sys, numpy as np, cv2, warnings; warnings.filterwarnings('ignore')
from PIL import Image
from scipy import ndimage
from skimage import color

SKY = sys.argv[1] if len(sys.argv) > 1 else 'painted'
GRADE = sys.argv[2] if len(sys.argv) > 2 else 'monet'
OUT = sys.argv[3] if len(sys.argv) > 3 else f'skyline-{GRADE}-{SKY}'
SKYTONE = sys.argv[4] if len(sys.argv) > 4 else 'light'
SHARP = sys.argv[5] if len(sys.argv) > 5 else 'crisp'
# how much the city is blended along its strokes
PRESETS = {
    # v11: "a bit too blended in water color" (her words, 2026-10-05)
    'soft': dict(steps=24, k=5.0, cross=1.4, near_steps=7, near_k=14.0, near_cross=0.7, grain=0.02, crisp=0.0),
    'mid': dict(steps=13, k=7.5, cross=0.9, near_steps=4, near_k=18.0, near_cross=0.4, grain=0.016, crisp=0.0),
    # short strokes, firm edge-stops, and a light unsharp mask for the 1.7x upscale
    'crisp': dict(steps=8, k=10.0, cross=0.6, near_steps=2, near_k=24.0, near_cross=0.3, grain=0.014, crisp=0.35),
    # its own brushwork: no blend, no grain; only the unsharp mask for the upscale
    'own': dict(steps=0, k=0.0, cross=0.0, near_steps=0, near_k=0.0, near_cross=0.0, grain=0.0, crisp=0.35),
}
P = dict(sigma=10, rim_keep=0.92, cool=4.0, toe=22.0, **PRESETS[SHARP])
rng = np.random.default_rng(11)

src = np.asarray(Image.open('canvas.png').convert('RGB')).astype(np.float32) / 255
H, W, _ = src.shape
# m_sky2: the texture-checked sky (real sky only, not the pale distant haze)
gold0 = np.load('m_gold.npy'); sky = np.load('m_sky2.npy'); warm = np.load('m_warm.npy')
lilies = np.asarray(Image.open('/Users/pranavi/Documents/GitHub/prlakshm.github.io/public/home/footer/water-lilies-5b-smooth.webp').convert('RGB')).astype(np.float32) / 255

def lab_of(a): return color.rgb2lab(a)
def rgb_of(l): return np.clip(color.lab2rgb(l), 0, 1).astype(np.float32)
def goldmask(lab):
    C = np.hypot(lab[..., 1], lab[..., 2]); h = np.degrees(np.arctan2(lab[..., 2], lab[..., 1])) % 360
    return (C > 30) & (h > 50) & (h < 100) & (lab[..., 0] > 40)

# ---- the line-integral painting pass (from ../bake/smooth.py) --------------
def flow(img, sigma):
    Y = cv2.GaussianBlur(0.2126 * img[..., 0] + 0.7152 * img[..., 1] + 0.0722 * img[..., 2], (0, 0), 1.0)
    gx = cv2.Sobel(Y, cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(Y, cv2.CV_32F, 0, 1, ksize=3)
    jxx = cv2.GaussianBlur(gx * gx, (0, 0), sigma); jxy = cv2.GaussianBlur(gx * gy, (0, 0), sigma); jyy = cv2.GaussianBlur(gy * gy, (0, 0), sigma)
    a = 0.5 * np.arctan2(2 * jxy, jxx - jyy)
    tx, ty = -np.sin(a), np.cos(a)
    tr = jxx + jyy; dd = np.sqrt((jxx - jyy) ** 2 + 4 * jxy ** 2)
    coh = np.where(tr > 1e-6, dd / (tr + 1e-6), 0) ** 2
    w = np.clip(coh * 3, 0, 1)
    # no clear stroke: a city's flat walls are painted top to bottom
    tx = w * tx; ty = w * ty + (1 - w) * 1.0
    n = np.sqrt(tx * tx + ty * ty) + 1e-6
    return (tx / n).astype(np.float32), (ty / n).astype(np.float32)

def lic(img, tx, ty, steps, h=1.5, k=10.0):
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    acc = img.copy(); wsum = np.ones((H, W), np.float32)
    for sgn in (1.0, -1.0):
        px, py = xs.copy(), ys.copy(); dx, dy = tx * sgn, ty * sgn
        for i in range(1, steps + 1):
            px = np.clip(px + dx * h, 0, W - 1); py = np.clip(py + dy * h, 0, H - 1)
            ntx = cv2.remap(tx, px, py, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
            nty = cv2.remap(ty, px, py, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
            s = np.where(ntx * dx + nty * dy < 0, -1.0, 1.0).astype(np.float32)
            dx, dy = ntx * s, nty * s
            c = cv2.remap(img, px, py, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
            d2 = ((c - img) ** 2).sum(-1) if img.ndim == 3 else (c - img) ** 2
            wgt = np.exp(-2.0 * (i / steps) ** 2) * np.exp(-k * d2)
            acc += (c * wgt[..., None]) if img.ndim == 3 else c * wgt
            wsum += wgt
    return acc / (wsum[..., None] if img.ndim == 3 else wsum)

# ---- 1. colour: cool the neutrals, keep accents warm, paint the darks -------
lab = lab_of(src)
L, A, B = lab[..., 0], lab[..., 1], lab[..., 2]
C = np.hypot(A, B)
neutral = np.clip(1 - C / 22, 0, 1)                          # greys and whites take the most
keepwarm = cv2.GaussianBlur((warm | gold0).astype(np.float32), (0, 0), 1.5)
if GRADE in ('monet', 'monet+'):
    # Monet's city light: shadows lavender-blue, sunlit faces warm cream, the
    # greys between lavender-grey. Applied to the neutrals; brick, pink and
    # gold keep their own colour.
    t = np.clip((L - 30) / 55, 0, 1)
    if GRADE == 'monet+':   # jewel-toned, closer to the lilies' saturation
        ta = np.interp(t, [0, 0.5, 1], [6.0, 4.5, 3.0]); tb = np.interp(t, [0, 0.5, 1], [-17, -9, 12])
    else:
        ta = np.interp(t, [0, 0.5, 1], [3.5, 2.5, 1.8]); tb = np.interp(t, [0, 0.5, 1], [-11, -5.5, 7])
    mix = 0.75 * neutral * (1 - keepwarm)
    A = A * (1 - mix) + ta * mix; B = B * (1 - mix) + tb * mix
else:
    cool = P['cool'] * (0.35 + 0.65 * neutral) * (1 - keepwarm)
    B = B - cool; A = A - 0.25 * cool
# painted darks: a soft toe lifts pure black to ~L 22 (the lilies' darkest)
toe = P['toe']
dark = L < 48
L = np.where(dark, L + toe * (1 - L / 48) ** 2, L)
# deep tones lean blue-black, as the lilies' shadows lean teal
deep = np.clip(1 - L / 40, 0, 1) * (1 - keepwarm)
B = B - 6 * deep; A = A + (1.5 if GRADE.startswith('monet') else -1.5) * deep
# soft painted whites (the lilies top out ~L 91)
L = np.where(L > 86, 86 + (L - 86) * 0.55, L)
if GRADE == 'monet+':
    pinkish = warm & (A > 4)
    A = np.where(pinkish, A * 1.25, A); B = np.where(pinkish, B * 1.1, B)
lab[..., 0], lab[..., 1], lab[..., 2] = L, A, B
graded = rgb_of(lab)
if GRADE == 'none':
    graded = src.copy()                                       # its own colours
elif GRADE.startswith('lift'):
    # its own colours, a bit brighter and more vivid (her ask, 2026-10-05: "a
    # little dull... The lilly's colors are more vivid"): the mids lifted by a
    # gamma, chroma raised most where it's dullest; every hue kept. lift:G:V
    _p = GRADE.split(':')
    G = float(_p[1]) if len(_p) > 1 else 0.86; V = float(_p[2]) if len(_p) > 2 else 0.35
    POP = float(_p[3]) if len(_p) > 3 else 0.0
    COOLV = float(_p[4]) if len(_p) > 4 else 1.0             # the vibrance the blues get (her: "blends to cool tone too much")
    _l = lab_of(src)
    _C = np.hypot(_l[..., 1], _l[..., 2])
    _hue = np.degrees(np.arctan2(_l[..., 2], _l[..., 1])) % 360
    _cool = np.clip(1 - np.maximum(0, np.abs(((_hue - 250 + 180) % 360) - 180) - 50) / 20, 0, 1)   # hue ~200-300
    _k = 1 + V * (1 - np.clip(_C / 60, 0, 1)) * np.clip(_C / 4, 0, 1) * (1 - _cool * (1 - COOLV))   # greys stay grey
    # the warm accents pop (her ask: "red, bricks, and oranges, pinks"): pink
    # through red and brick to orange (hue ~330-70), only where there is colour
    # to lift, so beige and grey stay as they are. lift:G:V:POP:COOLV
    _warm = np.clip(1 - np.maximum(0, np.abs(((_hue - 20 + 180) % 360) - 180) - 40) / 15, 0, 1)
    _k = _k * (1 + POP * _warm * np.clip((_C - 13) / 8, 0, 1))         # cream sits near orange in hue: gate by colour
    _l[..., 0] = 100 * np.clip(_l[..., 0] / 100, 0, 1) ** G
    _l[..., 1] *= _k; _l[..., 2] *= _k
    graded = rgb_of(_l)

# ---- 2. the sky ------------------------------------------------------------
# a soft colour-key matte, so silhouette edges keep their antialiasing
sky_rgb = src[4:20, 1500:1900].reshape(-1, 3).mean(0)
d = np.abs(src - sky_rgb).sum(2)
# the lower sky: as smooth as the sky and the same neutral grey, a shade off
# the grey the key took at the top, so the key left it out and the grade turned
# it cream. Against a grey sky that read as a torn band; it is sky, so it is
# painted as sky. (`sky` stays the keyed sky for the rim leaf, which follows
# roofs against it.)
tex = ndimage.uniform_filter(ndimage.gaussian_gradient_magnitude(src.mean(2), 1.0), 9)
low_sky = (d < 0.14) & (tex < 0.02) & ~sky
lbl, _ = ndimage.label(low_sky)
touch = np.unique(lbl[ndimage.binary_dilation(sky, iterations=3) & low_sky])
skyp = sky | np.isin(lbl, touch[touch > 0])
matte = np.clip(1 - d / 0.09, 0, 1) * ndimage.binary_dilation(skyp, iterations=2)
matte = np.maximum(matte, skyp.astype(np.float32))
import json as _json, os as _os
_meta = _json.load(open('canvas.json')) if _os.path.exists('canvas.json') else {}
if _meta.get('given_sky'):
    # her painted sky: the mask came with it (newsky.py); no keying by colour
    skyp = sky.copy()
    matte = cv2.GaussianBlur(sky.astype(np.float32), (0, 0), 0.7)
yy = np.linspace(0, 1, H, dtype=np.float32)[:, None] * np.ones((1, W), np.float32)
horizon = np.full(W, H, np.float32)
cols = np.where(skyp.any(0))[0]
for x in cols: horizon[x] = np.nonzero(skyp[:, x])[0].max()
horizon = ndimage.uniform_filter1d(horizon, 301) / H
if SKY == 'painted':
    # cool lavender-blue overhead warming to a pale haze at the rooftops: the
    # lilies' lavender water, and the golden light the city is lit by
    # the warm haze climbs well up the sky (her ask: "the yellow sky to go more
    # up"); the curve was ^1.4, which kept the cream down at the rooftops
    t = np.clip(yy / np.maximum(horizon[None, :], 0.2), 0, 1) ** 0.75
    under = ndimage.binary_dilation(sky, iterations=6) & ~ndimage.binary_dilation(sky, iterations=1) & (lab[..., 0] > 80)
    haze = lab[under].mean(0) if under.any() else np.array([92.0, 2.0, 4.0])
    if SKYTONE == 'deep':   # jewel-toned: a richer lavender-blue overhead, the band gains the lilies' weight
        top = np.array([74.0, 6.0, -19.0]); low = np.array([haze[0] - 1.0, (haze[1] + 4.0) / 2, (haze[2] + 9.0) / 2])
    else:
        # the deepest blue a little lighter, a touch more colour so it stays jewel
        # (was L 84, a 3.5, b -11)
        # greyer (her call): the same cool-to-warm structure with about half the
        # colour (was a 4, b -12.5 overhead and a fuller cream low)
        top = np.array([87.0, 2.0, -6.5]); low = np.array([haze[0] + 1.0, (haze[1] + 2.5) / 4, (haze[2] + 6.0) / 4])
    sk = top[None, None] * (1 - t[..., None]) + low[None, None] * t[..., None]
    # broad soft cloud shapes, then horizontal brushwork through them
    # periodic across the width, so the site can drift them sideways and loop
    # (reflected at the top: 'nearest' repeats the edge row's noise, which left
    # white blots along the top edge, L 100 in an L 87 sky)
    cloud = ndimage.gaussian_filter(rng.standard_normal((H, W)), (18, 90), mode=('reflect', 'wrap')); cloud /= cloud.std()
    CL, CB = 2.2, 0.8                                  # body in the light, little colour: a grey sky's clouds
    sk_bare = sk.copy()
    sk[..., 0] += CL * cloud; sk[..., 2] += CB * cloud
    # what one unit of cloud does to the sky's colour, in sRGB (for the shader)
    sk_unit = sk_bare.copy(); sk_unit[..., 0] += CL; sk_unit[..., 2] += CB
    _m = skyp
    cloud_rgb = (rgb_of(sk_unit)[_m] - rgb_of(sk_bare)[_m]).mean(0)
    np.save(f'{OUT}-cloud.npy', cloud.astype(np.float32)); np.save(f'{OUT}-cloud-rgb.npy', cloud_rgb)
    sky_paint = rgb_of(sk)
    hx = np.ones((H, W), np.float32); hy = np.zeros((H, W), np.float32)
    noise = (rng.random((H, W)).astype(np.float32) - 0.5)
    strokes = lic(noise, hx, hy, 30, h=1.5, k=0.0)
    sky_paint = np.clip(sky_paint + 0.05 * strokes[..., None], 0, 1)
elif SKY == 'source':
    # the sky as painted, with a soft drift of light through it (the site
    # slides these clouds sideways): lightness only, so its colour is its own
    cloud = ndimage.gaussian_filter(rng.standard_normal((H, W)), (18, 90), mode=('reflect', 'wrap')); cloud /= cloud.std()
    CL = 2.2
    sl = lab_of(graded)
    sl_unit = sl.copy(); sl_unit[..., 0] += CL
    cloud_rgb = (rgb_of(sl_unit)[skyp] - rgb_of(sl)[skyp]).mean(0)
    np.save(f'{OUT}-cloud.npy', cloud.astype(np.float32)); np.save(f'{OUT}-cloud-rgb.npy', cloud_rgb)
    sl[..., 0] += CL * cloud
    sky_paint = rgb_of(sl)
else:
    sky_paint = np.broadcast_to(np.array([248, 250, 252], np.float32) / 255, (H, W, 3)).copy()
base = graded * (1 - matte[..., None]) + sky_paint * matte[..., None]
np.save(f'{OUT}-matte.npy', matte.astype(np.float32))

# ---- 3. the painting pass: buildings blended along their strokes ----------
keep = ndimage.binary_dilation(gold0, iterations=1)
valid = (~keep).astype(np.float32)
fill = cv2.GaussianBlur(base * valid[..., None], (0, 0), 3) / (cv2.GaussianBlur(valid, (0, 0), 3)[..., None] + 1e-4)
work = np.where(keep[..., None], fill, base).astype(np.float32)
if P['steps'] > 0:
    tx, ty = flow(work, P['sigma'])
    # The lilies blend their background (the water) and keep their subjects (the
    # flowers) crisp. Here the background is the distance: pale, low-contrast
    # buildings in the haze get the full blend; near, contrasty buildings get short
    # strokes that keep their windows as painted dabs (a painter's depth: soft far,
    # crisp near). The bottom rows are nearest of all.
    sm_far = cv2.GaussianBlur(lic(work, tx, ty, P['steps'], k=P['k']), (0, 0), P['cross'])
    sm_near = cv2.GaussianBlur(lic(work, tx, ty, P['near_steps'], k=P['near_k']), (0, 0), P['near_cross'])
    d_sky = np.abs(src - sky_rgb).sum(2)
    far = np.clip(1 - d_sky / 0.45, 0, 1)
    rows = np.linspace(0, 1, H, dtype=np.float32)[:, None]
    far = far * (1 - np.clip((rows - 0.62) / 0.25, 0, 1))
    far = cv2.GaussianBlur(far.astype(np.float32), (0, 0), 6)
    sm = sm_near * (1 - far[..., None]) + sm_far * far[..., None]
    np.save(f'{OUT}-far.npy', far)
    # the sky was painted with its own strokes: leave it, blend only the city
    city = (1 - matte)[..., None]
    painted = sm * city + work * (1 - city)
else:
    city = (1 - matte)[..., None]
    painted = base.copy()                                     # its own brushwork
if P['crisp'] > 0:
    # the source is a 1.7x upscale: a light unsharp mask on the city gives back
    # the edges the upscale softened (never the sky)
    painted = np.clip(painted + P['crisp'] * (painted - cv2.GaussianBlur(painted, (0, 0), 1.6)) * city, 0, 1)
if P['grain'] > 0:
    # stroke-direction grain: the lilies' brush texture at the finest scale
    grain = lic((rng.random((H, W)).astype(np.float32) - 0.5), tx, ty, 10, h=1.0, k=0.0)
    grain /= grain.std() + 1e-6
    # grain only where the paint has form: in near-flat haze the stroke field is
    # just noise and the grain draws squiggles
    form = cv2.GaussianBlur(ndimage.gaussian_gradient_magnitude(work.mean(2), 1.5), (0, 0), 4)
    form = np.clip(form / 0.03, 0, 1)
    painted = np.clip(painted + P['grain'] * grain[..., None] * (city * form[..., None]), 0, 1)


# ---- 4. gold, in the lilies' tones, plus new leaf in the painting's patterns -
lil_lab = lab_of(lilies)
lil_gold = goldmask(lil_lab)
ladder = lilies[lil_gold]                                     # every gold pixel of the lilies
ladder = ladder[np.argsort(lab_of(ladder[None])[0][:, 0])]    # dark to light
# New leaf, her rule (2026-10-05): "You are not supposed to freckle the gold.
# Add it in select locations, like edges of buildings and such, following
# existing gold patterning already in image." So it comes only in the shapes
# the painting's own gold takes (roof caps, edge trims, cornices, bands along
# window rows, drips), each one solid with a torn edge; never scattered flakes
# (the gold-window scatter and the flecked bands before this were freckles).
import json, os
crop = json.load(open('canvas.json')) if os.path.exists('canvas.json') else {'y': 0, 'h': 578}
sx, sy = W / 2000, H / crop['h']
def box(x0, y0, x1, y1):                                      # source px -> canvas slices
    if 'affine' in crop:                                       # placements were made on the flat-sky image
        M = np.array(crop['affine'])
        x0, y0 = M @ np.array([x0, y0, 1.0]); x1, y1 = M @ np.array([x1, y1, 1.0])
    return (slice(max(0, round((y0 - crop['y']) * sy)), max(0, round((y1 - crop['y']) * sy))),
            slice(round(x0 * sx), round(x1 * sx)))
building = ~skyp
has_gold = ndimage.binary_dilation(gold0, iterations=14)      # the painting already gilded it
wander = lambda s: np.tanh(ndimage.gaussian_filter(rng.standard_normal((H, W)), s) * 4)   # smooth, -1..1
depth_field = 0.5 + 0.5 * (0.8 * wander(9) + 0.2 * wander(2))
def strip(line, lo, hi):
    """solid leaf grown from `line` into the building, its depth wandering
    between lo and hi px: a torn edge, never holes or flakes"""
    return (ndimage.distance_transform_edt(~line) <= lo + (hi - lo) * depth_field) & building
def select(line, min_len, share):
    """some of the line's runs: long enough to read, not already gilded"""
    lbl, n = ndimage.label(line, structure=np.ones((3, 3)))
    if n == 0: return line
    ids = np.arange(1, n + 1)
    size = np.bincount(lbl.ravel(), minlength=n + 1)[1:]
    gilded = ndimage.mean(has_gold, lbl, ids)
    pick = (size >= min_len) & (gilded < 0.3) & (rng.random(n) < share)
    return np.isin(lbl, ids[pick])

contrast = np.abs(src - sky_rgb).sum(2)
bld = (~sky).astype(np.float32)                                # measured on the building side only
roof_contrast = ndimage.uniform_filter(contrast * bld, 5) / (ndimage.uniform_filter(bld, 5) + 1e-6)
real = roof_contrast > 0.16                                    # a real roof against the sky, not distant haze
# roof caps, on some roofs: the painting caps roofs and setbacks in leaf
top = ~sky & np.roll(sky, 1, axis=0) & real
caps = strip(select(top, 30, 0.45), 3, 9)
# thin trims down a few tower edges, as it trims its setbacks
side = ~sky & (np.roll(sky, 1, axis=1) | np.roll(sky, -1, axis=1)) & real & ~top
trims = strip(select(side, 70, 0.25), 1.5, 3.5)
# cornices of the low buildings: long horizontal top edges in the lower band
Yc = cv2.GaussianBlur(0.2126 * src[..., 0] + 0.7152 * src[..., 1] + 0.0722 * src[..., 2], (0, 0), 0.8)
gy = cv2.Sobel(Yc, cv2.CV_32F, 0, 1, ksize=3)
lit_top = (gy < -0.42)                                        # a lit top face over a darker facade below
lit_top[: int(H * 0.55)] = False
runs = cv2.morphologyEx(lit_top.astype(np.uint8), cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (41, 1))).astype(bool)
lblc, nc = ndimage.label(ndimage.binary_dilation(runs, structure=np.ones((3, 9))))
# a cornice stands alone; window rows repeat, so drop any run with another run
# stacked within 16px above or below it over the same stretch
alone = []
for i, sl in enumerate(ndimage.find_objects(lblc)):
    if sl is None: continue
    ys, xs = sl
    y0, y1 = max(0, ys.start - 16), min(H, ys.stop + 16)
    near_runs = runs[y0:y1, xs] & (lblc[y0:y1, xs] != i + 1)
    if near_runs.sum() < 0.3 * (xs.stop - xs.start): alone.append(i + 1)
cornices = strip(select(np.isin(lblc, alone) & runs, 40, 0.55), 2, 5)
# the bare right quarter (her ask: more gold there), in the painting's own
# patterns: bands along a facade's window rows, caps, drips
def bands(x0, y0, x1, y1, keep, lo, hi):
    # like the painting's own banded block: a band every few window rows, not
    # every one; each wavers, swells and thins, stops short or breaks, and a
    # few let a short drip fall
    ys, xs = box(x0, y0, x1, y1)
    if ys.stop <= ys.start: return np.zeros((H, W), bool)
    lum = src[ys, xs].mean(2).mean(1); d = np.abs(np.diff(lum))
    line = np.zeros((H, W), bool); last = -99; fw = xs.stop - xs.start
    for r in range(1, len(d) - 1):
        if d[r] >= d[r - 1] and d[r] >= d[r + 1] and d[r] > d.mean() and r - last >= 30 and rng.random() < keep:
            last = r
            span = rng.uniform(0.55, 1.0) * fw; start = xs.start + rng.uniform(0, fw - span)
            xx = np.arange(int(start), int(start + span))
            yy = ys.start + r + np.round(1.6 * np.sin(xx / rng.uniform(14, 30) + rng.uniform(0, 6))).astype(int)
            line[np.clip(yy, 0, H - 1), xx] = True
            for _ in range(rng.integers(0, 3)):                 # a short drip from the band
                x = int(rng.uniform(start, start + span)); L = int(rng.uniform(6, 22))
                line[ys.start + r:min(H, ys.start + r + L), x] = True
    blob = 0.5 + 0.5 * wander(5)                                # swells and thins along the band
    grown = (ndimage.distance_transform_edt(~line) <= lo + (hi - lo) * blob) & building
    gaps = ndimage.gaussian_filter(rng.standard_normal((H, W)), (3, 16)) > -0.75   # a torn break now and then
    return grown & gaps
def cap(x0, y0, x1, y1):
    ys, xs = box(x0, y0, x1, y1)
    line = np.zeros((H, W), bool)
    if ys.stop > ys.start: line[ys.start, xs] = True
    return strip(line, 0.5 * (ys.stop - ys.start), 1.1 * (ys.stop - ys.start))
def drips(x0, y0, x1, y1, count):
    # hung from the roof as the painting's are: wide where they leave it,
    # tapering as they run down, each its own length and wander
    ys, xs = box(x0, y0, x1, y1)
    m = np.zeros((H, W), bool)
    if ys.stop <= ys.start: return m
    yy, xx = np.mgrid[ys, xs].astype(np.float32)
    for k in range(count):
        cx = rng.uniform(xs.start + 8, xs.stop - 8)
        L = rng.uniform(0.15, 0.95) * (ys.stop - ys.start)
        t = (yy - ys.start) / L
        half = rng.uniform(2.5, 6.5) * np.clip(1 - t, 0, 1) ** rng.uniform(0.4, 1.2) + 0.9
        wob = rng.uniform(1, 3) * np.sin((yy - ys.start) / rng.uniform(12, 30) + 2.1 * k) + 0.8 * np.sin((yy - ys.start) / 5.0 + k)
        m[ys, xs] |= (np.abs(xx - cx - wob) <= half) & (t <= 1)
    return m & building
right = (bands(1795, 262, 1912, 465, 0.6, 1.5, 7) | cap(1792, 228, 1913, 236)
         | cap(1918, 296, 1970, 303) | drips(1918, 300, 1970, 470, 4)
         | bands(1682, 268, 1718, 395, 0.5, 1.2, 4.5) | cap(1731, 300, 1771, 306) | cap(1810, 433, 1860, 440))
leaf = (caps | trims | cornices | right) & building & ~gold0
# no freckles: a piece of new leaf too small to read as a shape is dropped
lbl, n = ndimage.label(leaf)
big = np.bincount(lbl.ravel()) >= 60; big[0] = False
rim = big[lbl]
# the existing leaf, remapped onto the lilies' gold by rank (tones and glints)
goldall = gold0 | rim
# chunkier leaf: neighbouring flecks join into pieces (the lilies' pieces are
# about twice the size), kept on the buildings
goldall = (ndimage.binary_closing(goldall, structure=np.ones((3, 3), bool), iterations=1) | goldall) & ~skyp
# new leaf's light and shade varies at the scale of a crinkle, not per pixel
u_field = ndimage.gaussian_filter(rng.standard_normal((H, W)), 1.6) + 0.6 * ndimage.gaussian_filter(rng.standard_normal((H, W)), 4)
g_lab = lab_of(src)
rank_src = np.zeros((H, W), np.float32)
vals = g_lab[..., 0][gold0]; order = np.argsort(np.argsort(vals))
rank_src[gold0] = order / max(len(vals) - 1, 1)
new_leaf = goldall & ~gold0
rr = np.argsort(np.argsort(u_field[new_leaf])); rank_src[new_leaf] = 0.12 + 0.88 * rr / max(len(rr) - 1, 1)
idx = np.minimum((rank_src * (len(ladder) - 1)).astype(int), len(ladder) - 1)
gold_rgb = ladder[idx]
# the lilies' chroma as it reads on screen: thin leaf on lavender-grey reads
# paler than the pond's solid leaf on teal, so the leaf is carried ~12% richer
_gl = lab_of(gold_rgb); _gl[..., 1] *= 1.12; _gl[..., 2] *= 1.12; gold_rgb = rgb_of(_gl)
gw = cv2.GaussianBlur(goldall.astype(np.float32), (0, 0), 0.6)
out = painted * (1 - gw[..., None]) + gold_rgb * gw[..., None]

Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)).save(f'{OUT}.png')
# for lilygold.py: the city under its gold, the new leaf on its own, the sky
Image.fromarray((np.clip(painted, 0, 1) * 255 + 0.5).astype(np.uint8)).save(f'{OUT}-under.png')
np.save(f'{OUT}-leaf.npy', rim); np.save(f'{OUT}-skyp.npy', skyp); np.save(f'{OUT}-gold0.npy', gold0)
np.save(f'{OUT}-gold.npy', goldall)
print(f'{OUT}.png | gold {100 * goldall.mean():.1f}% (rims, cornices, windows added {100 * (goldall & ~gold0).mean():.1f}%)')
np.save(f'{OUT}-added.npy', goldall & ~gold0)
