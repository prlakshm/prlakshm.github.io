# Bake the star card's gold-leaf stamps.
#
# Five unique, slightly rounded stars of crinkled gold leaf from gen_foil.py, the
# generator we validated against bubbbly's photographed foil. Its "photo" of
# the leaf under soft studio light is the rest state. For the lit states, the
# leaf's own facet normals catch a lamp to the star's upper left, above it, and
# to its upper right: a broad sheen plus sharp glints where facets face the
# light. The site cross-fades those four as the light moves (the cursor, or an
# idle drift), so the same facets flash the way real leaf does.
#
# Colour: true gold. The painting's gold leaf measures orange (Lab hue ~62-67,
# chroma ~40-44), which Pranavi read as "too orangy, not true gold", so the
# ramp is anchored on photographed gold foil instead (bubbbly's leaf: hue
# 77-86, chroma ~56-62): olive-bronze shadows, rich yellow-gold mids, pale
# gold highlights. The rest state's lightness sits a little under the card
# stock (foil reads as metal only when it rests darker than the paper); every
# state shares that mapping, so the lit ones are genuinely brighter. A slow
# drift in hue (+-3 deg) and chroma across each star keeps it from looking
# printed.
#
# (Tried and rejected: flat foil star stickers, sharp and faceted; she chose
# these rounded crinkled stars.)
#
# Writes stamps.webp: 5 stars across x 4 rows (rest, lamp left, centre, right).
# Usage: python3 stamps.py <gen_foil dir> <out dir> [p5,p50,p95] [chroma] [name] [hue shift, deg]
import sys, numpy as np
from PIL import Image
from scipy import ndimage
from skimage import color
gdir, out = sys.argv[1:3]
# Rest-state lightness (REST_L: p5, p50, p95) and a chroma scale.
REST_L = tuple(float(v) for v in (sys.argv[3].split(',') if len(sys.argv) > 3 else (44, 66, 90)))
CHROMA = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
NAME = sys.argv[5] if len(sys.argv) > 5 else 'stamps'
HUE = float(sys.argv[6]) if len(sys.argv) > 6 else 0.0   # + toward lemon, - toward honey
sys.path.insert(0, gdir)
import gen_foil as G

S = 112
SEEDS = [3, 11, 19, 27, 41]
ROTS = [-0.31, -0.18, -0.42, -0.25, -0.36]
ROUND = 0.04        # tip rounding (gen_foil star_mask): just softened, a little less than before (0.08)
# lamp directions (toward the light, x right, y up, z out of the card)
LAMPS = [(-0.75, 0.45, 0.62), (0.0, 0.62, 0.78), (0.75, 0.45, 0.62)]

# --- true gold, by lightness (Lab) -----------------------------------------
# (L, a*, b*): deep olive-bronze, the photographed foil's dark / mid /
# highlight, pale gold, cream.
GOLD = np.array([
    (28.0, 7.0, 26.0),
    (40.0, 10.0, 40.0),
    (59.0, 13.5, 60.4),
    (69.7, 10.4, 61.6),
    (85.5, 4.3, 56.2),
    (93.0, 0.5, 38.0),
    (99.0, -1.0, 16.0),
])
P_REF = REST_L

def gold(L, drift):
    a = np.interp(L, GOLD[:, 0], GOLD[:, 1])
    b = np.interp(L, GOLD[:, 0], GOLD[:, 2])
    C, h = np.hypot(a, b) * CHROMA * (1 + 0.05 * drift), np.arctan2(b, a) + np.radians(3.0) * drift + np.radians(HUE)
    return np.clip(color.lab2rgb(np.dstack([L, C * np.cos(h), C * np.sin(h)])), 0, 1)

rows = [[] for _ in range(4)]
for sd, rot in zip(SEEDS, ROTS):
    m = G.star_mask(S, inner=0.48, round_=ROUND, rot=rot, wobble=0.03, seed=sd)
    f = G.make_foil(m, variant='crinkle', period=6.0, seed=sd)
    inside = m > 0.5
    s0 = f['shade']                                   # the leaf "photographed" under soft light
    N = f['normal']
    shades = [s0]
    for lx, ly, lz in LAMPS:
        L = np.array([lx, ly, lz]); L /= np.linalg.norm(L)
        H = L + np.array([0.0, 0.0, 1.0]); H /= np.linalg.norm(H)
        nh = np.clip((N * H).sum(-1), 0, 1)
        shades.append(s0 * 0.94 + 0.42 * nh ** 8 + 0.9 * nh ** 60)
    # map the rest state onto REST_L (p5, p50, p95), and every state through the same mapping
    q = np.percentile(s0[inside], [5, 50, 95])
    def to_L(s):
        lo = P_REF[0] + (s - q[0]) * (P_REF[1] - P_REF[0]) / max(q[1] - q[0], 1e-6)
        hi = P_REF[1] + (s - q[1]) * (P_REF[2] - P_REF[1]) / max(q[2] - q[1], 1e-6)
        return np.clip(np.where(s < q[1], lo, hi), 26, 99)
    rng = np.random.default_rng(sd)
    drift = ndimage.gaussian_filter(rng.standard_normal((S, S)), S / 6)
    drift /= max(np.abs(drift).max(), 1e-6)
    for k, sk in enumerate(shades):
        rows[k].append(np.dstack([gold(to_L(sk), drift), np.clip(m, 0, 1)]))

sheet = np.concatenate([np.concatenate(r, 1) for r in rows], 0)
Image.fromarray(np.clip(sheet * 255 + 0.5, 0, 255).astype(np.uint8)).save(f'{out}/{NAME}.webp', 'WEBP', quality=88, method=6)
print('rest L p5/p50/p95 %.0f %.0f %.0f, chroma x%.2f; sheet %dx%d' % (*P_REF, CHROMA, sheet.shape[1], sheet.shape[0]))
