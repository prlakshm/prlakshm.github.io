# Shared kit for the portrait pop-out sprites: shape masks, true gold leaf, tissue.
#
# Gold is the star card's: crinkled leaf from gen_foil.py (our own generator,
# poster-lab/museum/bake), coloured through the true-gold Lab ramp of
# stamps.py, baked twice, at rest and caught by a lamp to the upper left, so
# the page can cross-fade the light in as the photo tilts.
#
# Tissue is thin coloured paper: a little see-through, short fibres in every
# direction, soft wrinkles and a few creases, and on torn pieces a pale
# feathered edge. The page lays it down with mix-blend-mode: multiply, so two
# sheets that overlap darken the way real tissue does.
#
# Units: the photo is 100u wide. Sprites are baked at PX pixels per u.
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage import color
from skimage.draw import polygon as sk_polygon

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'museum', 'bake'))
import gen_foil as G  # noqa: E402

OUT = os.path.join(HERE, '..', 'art')
PX = 6          # sprite px per u
SS = 4          # mask supersampling

# --- masks -----------------------------------------------------------------
# Built at SS x resolution as booleans, then softened down to the sprite size.

def canvas(wu, hu):
    return int(round(wu * PX)), int(round(hu * PX))

def down(hi, w, h):
    im = Image.fromarray((hi.astype(np.float64) * 255).astype(np.uint8))
    return np.asarray(im.resize((w, h), Image.LANCZOS)).astype(np.float64) / 255.0

def poly(w, h, pts):
    """pts in 0..1 box coordinates -> hi-res bool mask."""
    W, H = w * SS, h * SS
    xs = np.array([p[0] for p in pts]) * W
    ys = np.array([p[1] for p in pts]) * H
    rr, cc = sk_polygon(ys, xs, (H, W))
    m = np.zeros((H, W), bool)
    m[rr, cc] = True
    return m

def ellipse(w, h, rx=0.5, ry=0.5, cx=0.5, cy=0.5):
    W, H = w * SS, h * SS
    yy, xx = np.mgrid[0:H, 0:W]
    return ((xx + 0.5) / W - cx) ** 2 / rx ** 2 + ((yy + 0.5) / H - cy) ** 2 / ry ** 2 <= 1

def signed(m):
    edt = ndi.distance_transform_edt
    return edt(m) - edt(~m)

def torn(m, amp, seed, scale=1.0):
    """Tear a hi-res bool mask: displace its edge by fibrous noise (amp in sprite px)."""
    rng = np.random.default_rng(seed)
    H, W = m.shape
    n = (G.low_noise(H, W, 10 * SS * scale, rng) * 0.65 + G.band_noise(H, W, 2.2 * SS, rng, 0.0, 1.0) * 0.35)
    return signed(m) + n * amp * SS > 0

def wobble(m, amp, seed):
    """Scissor cut: a slow, small waver on an otherwise clean edge."""
    rng = np.random.default_rng(seed)
    H, W = m.shape
    return signed(m) + G.low_noise(H, W, 24 * SS, rng) * amp * SS > 0

def shard(w, h, seed, n=8, ragged=1.6):
    """A torn flake of gold leaf: an irregular polygon, ragged edges."""
    rng = np.random.default_rng(seed)
    a = np.sort(rng.uniform(0, 2 * np.pi, n))
    r = rng.uniform(0.55, 1.0, n)
    pts = [(0.5 + 0.47 * r[i] * np.cos(a[i]), 0.5 + 0.47 * r[i] * np.sin(a[i])) for i in range(n)]
    return torn(poly(w, h, pts), ragged, seed + 1, 0.6)

def pennant(w, h, seed):
    rng = np.random.default_rng(seed)
    j = lambda: rng.uniform(-0.02, 0.02)
    return wobble(poly(w, h, [(0.02 + j(), 0.0), (0.98 + j(), 0.0), (0.5 + j(), 0.99)]), 0.25, seed)

def tri(w, h, seed):
    rng = np.random.default_rng(seed)
    pts = [(rng.uniform(0.0, 0.25), rng.uniform(0.0, 0.3)), (rng.uniform(0.75, 1.0), rng.uniform(0.05, 0.35)),
           (rng.uniform(0.3, 0.7), rng.uniform(0.85, 1.0))]
    return wobble(poly(w, h, pts), 0.2, seed)

def quad(w, h, seed):
    rng = np.random.default_rng(seed)
    q = lambda a, b: (a + rng.uniform(-0.05, 0.05), b + rng.uniform(-0.05, 0.05))
    return wobble(poly(w, h, [q(0.04, 0.04), q(0.96, 0.04), q(0.96, 0.96), q(0.04, 0.96)]), 0.2, seed)

def dot(w, h):
    return ellipse(w, h, 0.48, 0.48)

def strip(w, h, seed):
    return wobble(poly(w, h, [(0.0, 0.0), (1.0, 0.02), (1.0, 1.0), (0.0, 0.98)]), 0.2, seed)

def lily(w, h, seed, notch=0.2):
    """A pad seen from above: a disc with a V wedge cut from the rim to the centre,
    rim a touch wavy. notch = the wedge's half-angle in radians."""
    rng = np.random.default_rng(seed)
    W, H = w * SS, h * SS
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    x = (xx + 0.5) / W * 2 - 1
    y = (yy + 0.5) / H * 2 - 1
    r = np.hypot(x, y)
    a = np.arctan2(y, x)
    turn = rng.uniform(0, 2 * np.pi)
    R = 0.95 + 0.025 * np.sin(5 * a + turn) + 0.015 * np.sin(11 * a + 2 * turn)
    cut = (np.abs(((a - turn + np.pi) % (2 * np.pi)) - np.pi) < notch) & (r > 0.04)
    return (r < R) & ~cut

def petal(w, h, seed):
    """A lotus petal: pointed at the top, round at the base, a little lopsided."""
    rng = np.random.default_rng(seed)
    W, H = w * SS, h * SS
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    t = (yy + 0.5) / H                       # 0 tip .. 1 base
    half = 0.5 * np.sin(np.pi * np.clip(t, 0, 1) ** 0.75) ** 0.9
    lean = rng.uniform(-0.06, 0.06) * (1 - t)
    x = (xx + 0.5) / W - 0.5 - lean
    return wobble(np.abs(x) < half * 0.96, 0.25, seed)

def sheet(w, h, seed, ragged=2.4):
    """A torn sheet: four torn edges, the deckle of tissue pulled by hand."""
    m = poly(w, h, [(0.02, 0.02), (0.98, 0.015), (0.985, 0.98), (0.015, 0.985)])
    return torn(m, ragged, seed, 1.2)

def tail(w, h, seed):
    """A ribbon tail with a V cut at its end."""
    return wobble(poly(w, h, [(0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.5, 0.86), (0.0, 1.0)]), 0.2, seed)

def rosette(w, h, pleats=26):
    """A prize rosette: a ring of pleated ribbon, scalloped at its rim."""
    W, H = w * SS, h * SS
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    x = (xx + 0.5) / W * 2 - 1
    y = (yy + 0.5) / H * 2 - 1
    r = np.hypot(x, y)
    a = np.arctan2(y, x)
    R = 0.93 + 0.05 * np.cos(pleats * a)
    return r < R

def rosette_pleats(w, h, pleats=26):
    """Shading for the pleats: each fold lit on one face, shaded on the other."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float64)
    x = (xx + 0.5) / w * 2 - 1
    y = (yy + 0.5) / h * 2 - 1
    a = np.arctan2(y, x)
    r = np.hypot(x, y)
    fold = np.sin(pleats * a)
    ring = np.clip((r - 0.36) / 0.1, 0, 1)     # flat centre, folds out to the rim
    # each pleat: one face toward the light, one away, and a dark crease between
    crease = np.exp(-((np.abs(((pleats * a / np.pi) % 2) - 1) - 1) / 0.08) ** 2)
    return 1 + (0.34 * fold - 0.18 * crease) * ring - 0.05 * np.clip((0.4 - r) / 0.4, 0, 1)

def heart(w, h, seed):
    """A heart, cut by hand: the classic implicit curve, a touch lopsided."""
    rng = np.random.default_rng(seed)
    W, H = w * SS, h * SS
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    x = ((xx + 0.5) / W * 2 - 1) * 1.3 * (1 + rng.uniform(-0.03, 0.03))   # margin for the lean
    y = -(((yy + 0.5) / H * 2 - 1) * 1.28) + 0.08    # margin above the lobes and below the tip
    x = x + 0.05 * rng.uniform(-1, 1) * (y + 1)        # lean
    f = (x * x + y * y - 1) ** 3 - x * x * y ** 3
    return wobble(f <= 0, 0.2, seed)

def sparkle(w, h, points=4, pinch=0.55):
    """A four-point sparkle: concave sides meeting in sharp points."""
    W, H = w * SS, h * SS
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    x = (xx + 0.5) / W * 2 - 1
    y = (yy + 0.5) / H * 2 - 1
    a = np.arctan2(y, x)
    r = np.hypot(x, y)
    R = 0.98 / (np.abs(np.cos(points / 4 * a)) ** pinch + np.abs(np.sin(points / 4 * a)) ** pinch) ** (1 / pinch)
    return r < R

def corner(w, h, seed):
    """An archival photo corner: a right triangle."""
    return wobble(poly(w, h, [(0.0, 0.0), (1.0, 0.0), (0.0, 1.0)]), 0.15, seed)

# --- true gold leaf -----------------------------------------------------------
GOLD = np.array([
    (28.0, 7.0, 26.0),
    (40.0, 10.0, 40.0),
    (59.0, 13.5, 60.4),
    (69.7, 10.4, 61.6),
    (85.5, 4.3, 56.2),
    (93.0, 0.5, 38.0),
    (99.0, -1.0, 16.0),
])
REST_L = (44.0, 66.0, 90.0)
LAMP = (-0.55, 0.6, 0.62)            # upper left, as the photo tilts toward the viewer

def _gold(L, drift):
    a = np.interp(L, GOLD[:, 0], GOLD[:, 1])
    b = np.interp(L, GOLD[:, 0], GOLD[:, 2])
    C = np.hypot(a, b) * (1 + 0.05 * drift)
    hh = np.arctan2(b, a) + np.radians(3.0) * drift
    return np.clip(color.lab2rgb(np.dstack([L, C * np.cos(hh), C * np.sin(hh)])), 0, 1)

def gold(mask, seed, period=5.0, shade_mul=None):
    """-> (rest RGBA, lit RGBA), float 0..1."""
    f = G.make_foil(mask, variant='crinkle', period=period, seed=seed)
    s0 = f['shade'].copy()
    if shade_mul is not None:
        s0 = s0 * shade_mul
    N = f['normal']
    inside = mask > 0.5
    q = np.percentile(s0[inside], [5, 50, 95]) if inside.sum() > 30 else np.percentile(s0, [5, 50, 95])

    def to_L(s):
        lo = REST_L[0] + (s - q[0]) * (REST_L[1] - REST_L[0]) / max(q[1] - q[0], 1e-6)
        hi = REST_L[1] + (s - q[1]) * (REST_L[2] - REST_L[1]) / max(q[2] - q[1], 1e-6)
        return np.clip(np.where(s < q[1], lo, hi), 26, 99)

    rng = np.random.default_rng(seed + 7)
    H, W = mask.shape
    drift = ndi.gaussian_filter(rng.standard_normal((H, W)), max(H, W) / 6)
    drift /= max(np.abs(drift).max(), 1e-6)
    Lv = np.array(LAMP); Lv /= np.linalg.norm(Lv)
    Hv = Lv + np.array([0.0, 0.0, 1.0]); Hv /= np.linalg.norm(Hv)
    nh = np.clip((N * Hv).sum(-1), 0, 1)
    lit_s = s0 * 0.94 + 0.42 * nh ** 8 + 0.9 * nh ** 60
    a = np.clip(mask, 0, 1)[..., None]
    return (np.concatenate([_gold(to_L(s0), drift), a], -1),
            np.concatenate([_gold(to_L(lit_s), drift), a], -1))

# --- tissue -----------------------------------------------------------------------
TISSUE = {
    'blush': '#f2a3b7',
    'lilac': '#c4b1f1',
    'sky': '#a3ccf1',
    'chart': '#d7e26c',   # her dress, softened
    'aqua': '#93d2c7',    # the footer pond
    'peach': '#f6bd9c',
    # the water-lily painting (footer): lily pink, pad green, water blue, violet
    'lpink': '#ee6e98',
    'lgreen': '#4cc0a0',
    'lblue': '#4da6e0',
    'lviolet': '#9a86e2',
    # the pastels, each pushed to the painting's vividness (same six families)
    'vblush': '#ee6e98',
    'vlilac': '#9a86e2',
    'vsky': '#4da6e0',
    'vchart': '#bcd43c',
    'vpeach': '#f5966a',
    'vaqua': '#4cc0a0',
    # spring pastels: clear and sweet, never dusty (same six families)
    'sblush': '#f9a2c6',   # cherry blossom
    'slilac': '#c3a8f7',   # lilac
    'ssky': '#98cdfa',     # spring sky
    'schart': '#c3e57e',   # pistachio
    'speach': '#ffbb94',   # apricot
    'saqua': '#8fe3c4',    # mint
}
# colour-scheme options for the frame: six families each (blush, lilac, sky,
# chart, peach, aqua), keyed '<prefix><family>'
SCHEMES = {
    'o': ('#ff86b4', '#b497ff', '#7fc4ff', '#b2e65a', '#ffa070', '#6fdcc0'),  # sorbet
    'a': ('#f5b3cb', '#d2bff6', '#b3d5f5', '#d2e8a0', '#ffcfb0', '#ace3cf'),  # sugared almond
    'g': ('#f28cb0', '#a98ee6', '#8fb2f4', '#9fd384', '#ff9a85', '#7ad6bf'),  # garden
    'b': ('#ff9ccc', '#c9a6ff', '#8fd3ff', '#d6f07a', '#ffc48a', '#84ecd0'),  # bright pastel
    # bright pastel FITTED (fit_tissue.py): baked deeper so each sheet RENDERS at
    # the 'b' colour on the #f8fafc page, after see-through alpha and lit facets
    'f': ('#ff5aad', '#ab6fff', '#45baff', '#c0ea19', '#ffa138', '#30e4b4'),
    # vivid pastel, FITTED for thin tissue (alpha 0.45): renders at the approved
    # hues, a little lighter (ffb0d7 d3b7ff a8dfff e5fb9d ffd4a5 a3f5de)
    'p': ('#ff6ab5', '#b27aff', '#5ec7ff', '#d4fb45', '#ffb252', '#55f0c4'),
    # lighter, more see-through takes (baked at alpha 0.45): l dyes with the b colours, m halfway to f
    'l': ('#ff9ccc', '#c9a6ff', '#8fd3ff', '#d6f07a', '#ffc48a', '#84ecd0'),
    'm': ('#ff7bbc', '#ba8aff', '#6ac6ff', '#cbed49', '#ffb261', '#5ae8c2'),
    # the About page's own palette (2026-10-06), sampled from the lily painting,
    # FITTED at alpha 0.72 to render lily pink, periwinkle, water blue, pad
    # green, ochre gold, deep teal on #f8fafc. Thin tissue (0.45) can't: half
    # page-white caps it at a pastel, which is why the old burst read as candy
    # spring, vivid (2026-10-06, her ask: the pastels were "dull and washed
    # out"): FITTED at alpha 0.6 to render cherry #ff8fc4, lilac #b994ff, sky
    # #6cc4ff, pistachio #b9ea71, apricot #ffae6e, mint #6fe2b8 on #f8fafc
    'r': ('#ff439f', '#904cff', '#00a1ff', '#8fe000', '#ff7a00', '#00d38b'),
    # spring, a step lighter (stacked sheets deepen; 'r' went neon on the page):
    # renders ffa6d1 caabff 8fd2ff c9f07f ffc38c 8decce per sheet
    's2': ('#ff6cb5', '#ad77ff', '#45b8ff', '#abea23', '#ff9f3b', '#41e4b1'),
    # spring pastels to go with her spring portrait (2026-10-06): blossom pink,
    # lavender, baby blue, butter yellow (in the chartreuse family, for her
    # dress), mint, peach; renders ffbfdb d7c2ff b3e0ff f6ee8a b3f0d4 ffd2b0
    # Morning Blossom (her inspo palette, 2026-10-06): baby pastels, warm-led.
    # Families: blush=coral ff928b, lilac=soft coral fec3a6, sky=spring sky
    # cce7f1, chart=lemon butter efe9ae, peach=tangerine ffac81, aqua=mint
    # cdeac0. FITTED at alpha 0.6 so each sheet renders at her hex on #f8fafc
    # bright spring (2026-10-06): her 'sp' look, warmer and more vivid. Baked
    # denser (alpha 0.82) with coloured light (lift 0.5) instead of white
    # facets; lilac becomes coral so pinks and oranges lead. Renders pink
    # ff9cc8, coral ff9a86, sky 8ccdff, butter ffe46a, tangerine ffad6a, mint 8ae6bc
    # her pick, refined (2026-10-06): the 'sp' set a step more pastel, butter
    # (which read murky mustard-green over the grass) now a baby pink, baked
    # with coloured light (lift 0.5, alpha 0.82) so nothing chalks out. Renders
    # blossom ffb0d2, lavender d4c2ff, baby blue b2dcff, baby pink ffcfe0,
    # peach ffcca6, mint ade9cf
    'sq': ('#ffa1cb', '#ccb6ff', '#a3d6ff', '#ffc7db', '#ffc495', '#9fe6c8'),
    # sq with the chartreuse back (she missed it), cleaned up from the murky
    # mustard: a fresh pastel pistachio-lemon, renders e9f09c
    'sr': ('#ffa1cb', '#ccb6ff', '#a3d6ff', '#e7ef8a', '#ffc495', '#9fe6c8'),
    # sr with the peach turned creamsicle (a creamy pastel orange): renders ffbf88
    'ss': ('#ffa1cb', '#ccb6ff', '#a3d6ff', '#e7ef8a', '#ffb470', '#9fe6c8'),
    # ss with a lighter creamsicle ("too dark"): renders ffd3ac
    'st': ('#ffa1cb', '#ccb6ff', '#a3d6ff', '#e7ef8a', '#ffcc9c', '#9fe6c8'),
    # pastel orange options (2026-10-06): apricot ffc79a, melon ffbf8f, sherbet ffcd8a, coral-peach ffb894
    'oa': ('#ffa1cb', '#ccb6ff', '#a3d6ff', '#e7ef8a', '#ffbe86', '#9fe6c8'),
    'ob': ('#ffa1cb', '#ccb6ff', '#a3d6ff', '#e7ef8a', '#ffb479', '#9fe6c8'),
    'oe': ('#ffa1cb', '#ccb6ff', '#a3d6ff', '#e7ef8a', '#ffc799', '#9fe6c8'),
    'oc': ('#ffa1cb', '#ccb6ff', '#a3d6ff', '#e7ef8a', '#ffc572', '#9fe6c8'),
    'od': ('#ffa1cb', '#ccb6ff', '#a3d6ff', '#e7ef8a', '#ffac7f', '#9fe6c8'),
    'vp': ('#ff89be', '#ff876d', '#77c5ff', '#ffe04a', '#ff9e4a', '#73e3b0'),
    'mb': ('#ff483a', '#ff9f6b', '#b1dceb', '#eadf7b', '#ff7725', '#b2e09a'),
    # mb with the warm three a step lighter (stacked, crinkled sheets deepen):
    # single sheets render ffb7b2 fed6c3 ffc7a7 so a pile reads ff928b fec3a6 ffac81
    'mb2': ('#ff8a80', '#ffbf9d', '#b1dceb', '#eadf7b', '#ffa56d', '#b2e09a'),
    'sp': ('#ff98c6', '#c39eff', '#87d0ff', '#f5e739', '#87eabb', '#ffb97d'),
    'w': ('#ce5e7c', '#606eaf', '#3c88af', '#328073', '#da9349', '#005c6e'),
}
FAMILIES = ('blush', 'lilac', 'sky', 'chart', 'peach', 'aqua')
for _p, _cols in SCHEMES.items():
    for _f, _c in zip(FAMILIES, _cols):
        TISSUE[_p + _f] = _c

def hex2lin(hx):
    c = np.array([int(hx[i:i + 2], 16) for i in (1, 3, 5)]) / 255.0
    return G.srgb_to_lin(c)

def tissue(hi_mask, w, h, col, seed, torn_edge=False, alpha=0.84):
    """hi_mask: hi-res bool. -> RGBA float sprite."""
    rng = np.random.default_rng(seed)
    m = down(hi_mask, w, h)
    # fibres: short streaks in several directions
    fib = np.zeros((h, w))
    for k in range(4):
        fib += G.band_noise(h, w, 2.4, rng, rng.uniform(0, np.pi), 7.0) * (0.75 ** k)
    fib /= fib.std() + 1e-9
    # soft wrinkles, and a few creases where it was folded
    wr = G.low_noise(h, w, max(w, h) / 2.2, rng)
    crease = np.zeros((h, w))
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float64)
    for _ in range(rng.integers(1, 3)):
        ang = rng.uniform(0, np.pi)
        px, py = rng.uniform(0.2, 0.8) * w, rng.uniform(0.2, 0.8) * h
        d = (xx - px) * np.sin(ang) - (yy - py) * np.cos(ang)
        crease += np.exp(-(d / 1.1) ** 2) * rng.uniform(0.5, 1.0)
    lum = 1 + 0.05 * fib + 0.085 * wr - 0.1 * crease
    base = hex2lin(TISSUE.get(col, col))
    rgb = G.lin_to_srgb(np.clip(base[None, None, :] * lum[..., None], 0, 1))
    a = m * np.clip(alpha + 0.04 * G.low_noise(h, w, 9, rng) + 0.03 * crease, 0, 1)
    # the cut edge reads a touch denser, like the doubled thickness of a fold
    edge = np.clip(m * (1 - ndi.uniform_filter(m, 3)) * 4, 0, 1)
    a = np.clip(a + 0.08 * edge, 0, 1)
    if torn_edge:
        # torn tissue leaves a pale feathered fringe of loose fibres
        fringe_hi = ndi.binary_dilation(hi_mask, iterations=int(1.4 * SS)) & ~hi_mask
        fr = down(fringe_hi, w, h) * np.clip(0.5 + 0.5 * fib / 2.5, 0, 1)
        rgb = rgb * (1 - fr[..., None] * 0.35) + fr[..., None] * 0.35 * np.clip(rgb * 1.12, 0, 1)
        a = np.maximum(a, fr * 0.32)
    return np.concatenate([rgb, a[..., None]], -1)

# --- crumpled tissue ------------------------------------------------------------------
def big_tri(w, h, seed):
    """A big scissor-cut triangle, apex up, a little lopsided, edges not ruler-straight."""
    rng = np.random.default_rng(seed)
    apex = (0.5 + rng.uniform(-0.12, 0.12), 0.0)
    left = (rng.uniform(0.0, 0.06), 1.0 - rng.uniform(0.0, 0.05))
    right = (1.0 - rng.uniform(0.0, 0.06), 1.0 - rng.uniform(0.0, 0.05))
    return wobble(poly(w, h, [apex, right, left]), 0.35, seed)

def crumple_relief(h, w, rng, S):
    """Crumpled-then-flattened paper: flat facets meeting in nearly straight creases.
    Piecewise-planar sheets (Delaunay over jittered points) at three sizes, a
    whisper of warp so no crease is ruler-straight, and a few long folds."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float64)
    wx = 0.12 * S * G.low_noise(h, w, 3 * S, rng)
    wy = 0.12 * S * G.low_noise(h, w, 3 * S, rng)
    xy = np.stack([((xx + wx) % w).ravel() + 0.5, ((yy + wy) % h).ravel() + 0.5], 1)
    rel = np.zeros((h, w))
    for spacing, zamp in ((2.6 * S, 0.9 * S), (1.4 * S, 0.45 * S), (0.8 * S, 0.18 * S)):
        rel += G._pl_sheet(h, w, spacing, zamp, rng, xy)
    for _ in range(int(rng.integers(2, 5))):
        cx, cy = rng.random() * w, rng.random() * h
        a = rng.random() * np.pi
        d = -(xx - cx) * np.sin(a) + (yy - cy) * np.cos(a)
        t = (xx - cx) * np.cos(a) + (yy - cy) * np.sin(a)
        L = (0.5 + rng.random()) * max(h, w)
        rel += rng.choice([-1, 1]) * 0.35 * S * np.minimum(np.abs(d), 1.5 * S) / S * np.exp(-0.5 * (t / L) ** 4)
    return rel

def tissue_crumpled(hi_mask, w, h, col, seed, S=20.0, alpha=0.6, lift=None):
    """Tissue that was crumpled and smoothed flat again.

    Thin enough to see through (alpha ~0.6): the wall, and any sheet under it,
    shows, and two overlapping sheets read darker. Facets are flat, so each
    takes one tone: turned toward the light, paler; away, a touch deeper. The
    creases between them are thin lines: a valley fold is a doubled layer,
    denser and darker; a ridge catches a pale line. Fibres and a faint dye
    mottle on top."""
    rng = np.random.default_rng(seed)
    m = down(hi_mask, w, h)
    rel = crumple_relief(h, w, rng, S)
    gy, gx = np.gradient(rel)
    k = 0.55
    N = np.dstack([-gx * k, gy * k, np.ones_like(rel)])
    N /= np.linalg.norm(N, axis=-1, keepdims=True)
    Lv = np.array([-0.5, 0.62, 0.6]); Lv /= np.linalg.norm(Lv)
    ndl = (N * Lv).sum(-1)
    inside = m > 0.5
    ndl = ndl - (np.median(ndl[inside]) if inside.sum() > 20 else np.median(ndl))
    lap = ndi.laplace(ndi.gaussian_filter(rel, 0.55))
    sd = lap[inside].std() if inside.sum() > 20 else lap.std()
    lap = np.clip(lap / (sd + 1e-9), -5, 5)
    valley = np.clip(lap, 0, None)
    ridge = np.clip(-lap, 0, None)
    fib = np.zeros((h, w))
    for i in range(4):
        fib += G.band_noise(h, w, 2.2, rng, rng.uniform(0, np.pi), 8.0) * (0.75 ** i)
    fib /= fib.std() + 1e-9
    mottle = G.low_noise(h, w, max(w, h) / 3, rng)
    base = hex2lin(TISSUE.get(col, col))
    light = 0.55 * ndl + 0.035 * ridge - 0.032 * valley + 0.016 * fib + 0.02 * mottle
    up = np.clip(light, 0, None)[..., None]
    dn = np.clip(-light, 0, None)[..., None]
    deep = base[None, None, :] ** 1.35                      # the hue, deeper
    lin = base[None, None, :] + (deep - base[None, None, :]) * np.clip(2.2 * dn, 0, 1) - base[None, None, :] * 0.25 * dn
    # lit facets: toward white (0.95, the original), or with `lift`, toward a
    # paler tint of the dye, so a bright sheet stays coloured in its light
    if lift is None:
        lin = lin + (1 - lin) * 0.95 * up
    else:
        tint = base[None, None, :] ** 0.6
        lin = lin + (tint - lin) * np.clip(2.0 * up, 0, 1) * lift + (1 - lin) * 0.12 * up
    rgb = G.lin_to_srgb(np.clip(lin, 0, 1))
    a = m * np.clip(alpha + 0.07 * np.clip(valley, 0, 3) + 0.03 * mottle + 0.012 * fib, 0, 1)
    edge = np.clip(m * (1 - ndi.uniform_filter(m, 3)) * 4, 0, 1)
    a = np.clip(a + 0.07 * edge, 0, 1)
    return np.concatenate([rgb, a[..., None]], -1)

# --- output ------------------------------------------------------------------------
def save(name, rgba):
    os.makedirs(OUT, exist_ok=True)
    arr = np.clip(rgba * 255 + 0.5, 0, 255).astype(np.uint8)
    Image.fromarray(arr, 'RGBA').save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=90, method=6)

def save_gold(name, hi_mask, wu, hu, seed, period=5.0, shade_mul_fn=None):
    w, h = canvas(wu, hu)
    m = down(hi_mask, w, h)
    mul = shade_mul_fn(w, h) if shade_mul_fn else None
    rest, lit = gold(m, seed, period, mul)
    save(name, rest)
    save(name + '-lit', lit)

def save_tissue(name, hi_mask, wu, hu, col, seed, **kw):
    w, h = canvas(wu, hu)
    save(name, tissue(hi_mask, w, h, col, seed, **kw))
