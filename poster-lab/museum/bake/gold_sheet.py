# Contact sheet of gold colourings for the star stamps: the same five leaf stars
# (stamps.py's bake, at rest) in a grid of hue (honey / true gold / lemon) by
# chroma (softest .. richest), on the card stock, at the size they show on a
# retina screen (38 CSS px = 76 px).
# Usage: python3 gold_sheet.py <gen_foil dir> <out.png>
import sys, numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage
from skimage import color
gdir, outp = sys.argv[1:3]
sys.path.insert(0, gdir)
import gen_foil as G

S, SEEDS, ROTS, ROUND = 112, [3, 11, 19, 27, 41], [-0.31, -0.18, -0.42, -0.25, -0.36], 0.04
REST_L = (44, 66, 90)
GOLD = np.array([(28.0, 7.0, 26.0), (40.0, 10.0, 40.0), (59.0, 13.5, 60.4), (69.7, 10.4, 61.6),
                 (85.5, 4.3, 56.2), (93.0, 0.5, 38.0), (99.0, -1.0, 16.0)])
HUES = [(-6.0, 'warmer · honey'), (0.0, 'true gold (now)'), (5.0, 'cooler · lemon')]
CHROMAS = [(0.75, 'softest'), (0.88, 'soft'), (1.0, 'as now'), (1.12, 'rich'), (1.25, 'richest')]
TILTS = [-7, 5, -3, 8, -5]

stars = []
for sd, rot in zip(SEEDS, ROTS):
    m = G.star_mask(S, inner=0.48, round_=ROUND, rot=rot, wobble=0.03, seed=sd)
    f = G.make_foil(m, variant='crinkle', period=6.0, seed=sd)
    s0 = f['shade']; inside = m > 0.5
    q = np.percentile(s0[inside], [5, 50, 95])
    lo = REST_L[0] + (s0 - q[0]) * (REST_L[1] - REST_L[0]) / max(q[1] - q[0], 1e-6)
    hi = REST_L[1] + (s0 - q[1]) * (REST_L[2] - REST_L[1]) / max(q[2] - q[1], 1e-6)
    L = np.clip(np.where(s0 < q[1], lo, hi), 26, 99)
    rng = np.random.default_rng(sd)
    drift = ndimage.gaussian_filter(rng.standard_normal((S, S)), S / 6); drift /= max(np.abs(drift).max(), 1e-6)
    stars.append((L, drift, np.clip(m, 0, 1)))

def colour(L, drift, hue, chroma):
    a = np.interp(L, GOLD[:, 0], GOLD[:, 1]); b = np.interp(L, GOLD[:, 0], GOLD[:, 2])
    C = np.hypot(a, b) * chroma * (1 + 0.05 * drift)
    h = np.arctan2(b, a) + np.radians(3.0) * drift + np.radians(hue)
    return np.clip(color.lab2rgb(np.dstack([L, C * np.cos(h), C * np.sin(h)])), 0, 1)

SZ, GAP, PAD = 76, 24, 26
CW, CH = 5 * SZ + 4 * GAP + 2 * PAD, SZ + 2 * PAD
LW, TOP = 150, 70
F = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', 17)
Fb = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', 19)
W = LW + len(HUES) * (CW + 22) + 10
H = TOP + len(CHROMAS) * (CH + 22) + 10
sheet = Image.new('RGB', (W, H), (248, 250, 252)); d = ImageDraw.Draw(sheet)
for j, (_, hl) in enumerate(HUES):
    d.text((LW + j * (CW + 22) + 6, 30), hl, fill=(23, 23, 23), font=Fb)
for i, (chroma, cl) in enumerate(CHROMAS):
    y = TOP + i * (CH + 22)
    d.text((10, y + CH // 2 - 10), cl, fill=(23, 23, 23) if cl == 'as now' else (102, 102, 102), font=Fb if cl == 'as now' else F)
    for j, (hue, _) in enumerate(HUES):
        x = LW + j * (CW + 22)
        # the card stock: white to a cool off-white, thin edge, rounded
        t = np.linspace(0, 1, CH)[:, None, None]
        stock = ((1 - t) * np.array([255, 255, 255]) + t * np.array([246, 248, 251])) * np.ones((CH, CW, 3))
        card = Image.fromarray(stock.astype(np.uint8)).convert('RGBA')
        mask = Image.new('L', (CW, CH), 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, CW - 1, CH - 1), 22, fill=255)
        for k, (L, drift, m) in enumerate(stars):
            rgb = colour(L, drift, hue, chroma)
            st = Image.fromarray(np.clip(np.dstack([rgb, m]) * 255 + 0.5, 0, 255).astype(np.uint8)).resize((SZ, SZ), Image.LANCZOS)
            st = st.rotate(-TILTS[k], resample=Image.BICUBIC)
            card.alpha_composite(st, (PAD + k * (SZ + GAP), PAD))
        sheet.paste(card.convert('RGB'), (x, y), mask)
        ImageDraw.Draw(sheet).rounded_rectangle((x, y, x + CW - 1, y + CH - 1), 22, outline=(20, 30, 50) if (hue == 0 and chroma == 1.0) else (225, 229, 235), width=2 if (hue == 0 and chroma == 1.0) else 1)
sheet.save(outp)
print(outp, sheet.size)
