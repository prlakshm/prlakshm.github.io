"""Rebuild Pranavi's three hand-refracted Figma frames at 1600×2000, from the
exact source posters, with clean tile grout.

The Figma frames (page "02 · Posters", 86:41 / 86:61 / 88:72) are collages of
two posters, each layer carrying Figma's Refraction effect:

  Frame 1  row-13 soft poster; the cold headphones (row 10) pasted over the
           top 2.8 rows with shatter refraction; the Schibsted word with
           ribbon refraction + dispersion.
  Frame 2  row-10 cold poster, same shattered headphones; the bottom band is
           Frame 1's refracted word pasted in.
  Frame 3  row-13 soft poster with a whole-sheet slice refraction.

Figma's shader source is not readable, so each refraction is modelled and
tuned against the frame screenshots (figma-src/frameN.png, 684×873). The
grout is the one thing changed on purpose: the tile grid is drawn clean over
every result, so no bevel or gutter is bent.

    python3 compose-figma.py            → exports/figma-1.png, -2, -3, and a
                                          side-by-side check sheet
"""
import math, os, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'figma-src')
OUT = os.path.join(HERE, 'exports')
W, H = 1600, 2000
COLS, ROWS, MARGIN, GUTTER, CORNER = 5, 4, 70, 24, 6

def load(name):
    return np.asarray(Image.open(os.path.join(SRC, name)).convert('RGB')).astype(np.float32)

def save(arr, path):
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).save(path)

# ------------------------------------------------------------------ sampling
def sample(img, xs, ys):
    """Bilinear sample of img at float coords (same shape arrays)."""
    h, w = img.shape[:2]
    xs = np.clip(xs, 0, w - 1.001); ys = np.clip(ys, 0, h - 1.001)
    x0 = np.floor(xs).astype(np.int32); y0 = np.floor(ys).astype(np.int32)
    fx = (xs - x0)[..., None]; fy = (ys - y0)[..., None]
    a = img[y0, x0]; b = img[y0, x0 + 1]; c = img[y0 + 1, x0]; d = img[y0 + 1, x0 + 1]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy

YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)

def displace(img, dx, dy, disp=0.0, along=None):
    """Resample img by a displacement field; with dispersion the channels are
    pulled apart along the displacement."""
    if disp <= 0:
        return sample(img, XX + dx, YY + dy)
    out = np.empty_like(img)
    for c, k in enumerate((1 + disp, 1.0, 1 - disp)):
        out[..., c] = sample(img, XX + dx * k, YY + dy * k)[..., c]
    return out

# ------------------------------------------------------------------ the three refractions
# What Figma's Refraction does to a layer, as far as the frames show: inside
# each shard the layer is not shifted but SMEARED along the shard — a one-sided
# motion blur — so a black shape throws black streaks that fade to a point,
# and a white word throws white ones with a coloured fringe. The smear acts on
# the layer's own alpha, which is why the streaks are only ever the object's
# colour and never the picture behind it.

def shift(a, ox, oy):
    """a moved by integer (ox, oy), zero-filled."""
    out = np.zeros_like(a)
    h, w = a.shape[:2]
    xs0, xs1 = max(0, ox), min(w, w + ox); ys0, ys1 = max(0, oy), min(h, h + oy)
    out[ys0:ys1, xs0:xs1] = a[ys0 - oy:ys1 - oy, xs0 - ox:xs1 - ox]
    return out

def smear(alpha, angle_deg, length, n=18):
    """alpha dragged one way along the angle: the mean of alpha over the
    trailing `length` px. Positive length drags toward the angle, negative away."""
    th = math.radians(angle_deg)
    ax, ay = math.cos(th), -math.sin(th)
    acc = np.zeros_like(alpha)
    for i in range(n):
        t = i / (n - 1)
        acc += shift(alpha, int(round(-t * length * ax)), int(round(-t * length * ay)))
    return acc / n

def blur(a, r):
    from scipy.ndimage import gaussian_filter
    return gaussian_filter(a, r)

def wedges(rng, alpha, n, angle_deg, length, width, stretch, thin=0, cut=0.35):
    """Shards anchored ON the layer: each starts at a point where the layer is
    solid and runs one way along the angle as a wedge — wide at the anchor,
    a point at the tip. Inside, the layer is stretched along the wedge: a
    pixel u along it samples from u·(1−k), so what is at the anchor is
    carried the wedge's whole length and comes to a point. `thin` adds a few
    long needle-fine shards. Returns (dx, dy, hairline)."""
    th = math.radians(angle_deg)
    ax, ay = math.cos(th), -math.sin(th); px, py = -ay, ax
    ys, xs = np.nonzero(alpha > 0.6)
    # and anchors just outside the layer, which stretch the picture INTO it:
    # the slivers of colour cut through the black, the cuts through the letters
    near = blur(alpha, 24)
    ys2, xs2 = np.nonzero((alpha < 0.15) & (near > 0.08))
    dx = np.zeros((H, W), np.float32); dy = np.zeros((H, W), np.float32); edge = np.zeros((H, W), np.float32)
    for i in range(n + thin):
        if i < n and rng.random() < cut and len(xs2):
            j = rng.integers(len(xs2)); cx, cy = float(xs2[j]), float(ys2[j])
        else:
            j = rng.integers(len(xs)); cx, cy = float(xs[j]), float(ys[j])
        sgn = rng.choice([-1, 1])
        if i < n:
            L = rng.uniform(*length); wd = rng.uniform(*width)
        else:
            L = rng.uniform(length[1] * 0.8, length[1] * 1.3); wd = rng.uniform(3, 7)
        k = rng.uniform(*stretch)
        u = ((XX - cx) * ax + (YY - cy) * ay) * sgn
        v = (XX - cx) * px + (YY - cy) * py
        t = u / L
        inside = (t > 0) & (t < 1) & (np.abs(v) < wd / 2 * (1 - t) + 0.6)
        if wd > 18 and rng.random() < 0.6:
            # combed: the wedge is a few parallel streaks with gaps between
            inside &= (np.sin(v / rng.uniform(2.2, 4.5)) > -0.35)
        amt = (k * u)[inside] * sgn
        dx[inside] = amt * ax; dy[inside] = amt * ay
        if i % 3 == 0:
            rim = (t > 0) & (t < 1) & (np.abs(v - (wd / 2 * (1 - t))) < 1.0)
            edge[rim] = np.maximum(edge[rim], (1 - t)[rim])
    return dx, dy, edge

def shatter(rng, alpha, n, angle_deg, length, width, stretch, thin=10):
    """Model A: the layer's alpha stretched inside anchored wedges."""
    dx, dy, edge = wedges(rng, alpha, n, angle_deg, length, width, stretch, thin)
    return sample(alpha[..., None], XX - dx, YY - dy)[..., 0], edge

def ribbons(rng, alpha, n, angle_deg, length, width, stretch, disp=0.25):
    """Model B: the word's alpha stretched inside anchored ribbons, each
    channel a different distance, so the streaks fringe into colour."""
    dx, dy, edge = wedges(rng, alpha, n, angle_deg, length, width, stretch, 0, cut=0.15)
    outs = [sample(alpha[..., None], XX - dx * k, YY - dy * k)[..., 0] for k in (1 + disp, 1.0, 1 - disp)]
    return outs, edge

def slices(rng, n, angle_deg, strength):
    """Model C: the sheet cut into parallel bands; each band carries its
    picture a different distance along the band. Returns (dx, dy, t-across)."""
    th = math.radians(angle_deg)
    ax, ay = math.cos(th), -math.sin(th); px, py = -ay, ax
    v = XX * px + YY * py
    period = (abs(W * px) + abs(H * py)) / n
    kf = (v - v.min()) / period
    k = np.floor(kf).astype(int); t = kf - k
    shifts = rng.uniform(0.35, 1.0, size=int(k.max()) + 2) * strength * rng.choice([-1, 1], size=int(k.max()) + 2)
    amt = shifts[k]
    return amt * ax, amt * ay, t

# ------------------------------------------------------------------ the grout
def tile_sd():
    """Signed distance to the tile edge, negative inside, same geometry as the shader."""
    inner_w = W - 2 * MARGIN; inner_h = H - 2 * MARGIN
    cw = (inner_w - GUTTER * (COLS - 1)) / COLS; ch = (inner_h - GUTTER * (ROWS - 1)) / ROWS
    rx = XX - MARGIN; ry = YY - MARGIN
    ix = np.floor(rx / (cw + GUTTER)); iy = np.floor(ry / (ch + GUTTER))
    lx = rx - ix * (cw + GUTTER); ly = ry - iy * (ch + GUTTER)
    dxx = np.abs(lx - cw / 2) - (cw / 2 - CORNER); dyy = np.abs(ly - ch / 2) - (ch / 2 - CORNER)
    sd = np.hypot(np.maximum(dxx, 0), np.maximum(dyy, 0)) + np.minimum(np.maximum(dxx, dyy), 0) - CORNER
    outside = (rx < 0) | (ry < 0) | (ix >= COLS) | (iy >= ROWS)
    sd = np.where(outside, 50.0, sd)
    return sd

SD = tile_sd()

def clean_grout(img, clean, depth=22.0):
    """Paste the clean poster's gutters and bevels over img: everything from
    the bevel's start outward, feathered a little into the tile."""
    a = np.clip((SD + depth) / 6.0, 0, 1)[..., None]      # 0 deep inside, 1 at the bevel and beyond
    return img * (1 - a) + clean * a

# ------------------------------------------------------------------ frames
def lum(img): return img[..., 0] * 0.299 + img[..., 1] * 0.587 + img[..., 2] * 0.114

def feather_rect(rect, soft=40):
    x0, y0, x1, y1 = rect
    fx = np.clip(np.minimum(XX - x0, x1 - XX) / soft, 0, 1); fy = np.clip(np.minimum(YY - y0, y1 - YY) / soft, 0, 1)
    return (fx * fy)[..., None]

def build(seed=7):
    rng = np.random.default_rng(seed)
    cold = load('poster-row10-cold.png'); soft = load('poster-row13-soft.png')
    flat_soft = load('flat-row13-soft.png')
    INK = np.array([5, 8, 22], np.float32)

    # the headphones as a layer: the cold poster's black, inside the object's
    # box, softened the way the pasted object was
    R_ph = (99, 66, 1360, 1417)
    a_ph = blur(np.clip((70 - lum(cold)) / 50, 0, 1), 5.0) * feather_rect(R_ph, 30)[..., 0]
    a_sh, edge = shatter(rng, a_ph, 70, 31, length=(260, 900), width=(10, 70), stretch=(0.5, 0.92), thin=6)

    # Frame 1 ------------------------------------------------------------
    f1 = soft.copy()
    fr = feather_rect(R_ph, 40)
    f1 = f1 * (1 - fr) + cold * fr
    # take the cold black out, put the shattered black back
    f1 = f1 * (1 - a_ph[..., None]) + soft * a_ph[..., None] * 0.0 + f1 * a_ph[..., None]
    f1 = f1 * (1 - a_sh[..., None]) + INK * a_sh[..., None]
    f1 = f1 * (1 - 0.4 * edge[..., None])
    R_w = (182, 1474, 1446, 1840)
    a_w = blur(np.clip((soft.min(axis=2) - 236) / 12, 0, 1), 2.0) * feather_rect(R_w, 20)[..., 0]
    (a_r, a_g, a_b), wedge_w = ribbons(rng, a_w, 36, 55, length=(200, 700), width=(3, 30), stretch=(0.5, 0.92))
    # the word lifted off, then laid back down dragged
    f1 = f1 * (1 - a_w[..., None]) + f1 * a_w[..., None]
    for c, a in enumerate((a_r, a_g, a_b)):
        f1[..., c] = f1[..., c] * (1 - a) + 255 * a
    f1 = f1 + 90 * wedge_w[..., None]                          # the ribbons' bright edges
    f1 = clean_grout(f1, soft)

    # Frame 2 ------------------------------------------------------------
    f2 = cold.copy()
    f2 = f2 * (1 - a_sh[..., None]) + INK * a_sh[..., None]
    f2 = f2 * (1 - 0.4 * edge[..., None])
    B = (59, 1395, 1554, 1960)
    fb = feather_rect(B, 24)
    f2 = f2 * (1 - fb) + f1 * fb
    f2 = clean_grout(f2, cold)

    # Frame 3 ------------------------------------------------------------
    sdx, sdy, t = slices(rng, 23, 45, strength=44)
    f3 = displace(flat_soft, sdx, sdy, disp=0.05)
    seam_hi = np.exp(-(t / 0.009) ** 2); seam_lo = np.exp(-((1 - t) / 0.025) ** 2)
    f3 = f3 * (1 - 0.3 * seam_lo[..., None]) + 85 * seam_hi[..., None]
    f3 = clean_grout(f3, soft)
    return f1, f2, f3

# ------------------------------------------------------------------ check against the Figma frames
CROPS = {1: ((48, 44, 1556, 1968), 'frame1.png'), 2: ((30, 33, 1570, 1960), 'frame2.png'), 3: ((48, 44, 1556, 1968), 'frame3.png')}

def check(frames):
    tiles = []; report = []
    for i, f in enumerate(frames, 1):
        (x0, y0, x1, y1), name = CROPS[i]
        ref = Image.open(os.path.join(SRC, name)).convert('RGB')
        mine = Image.fromarray(np.clip(f, 0, 255).astype(np.uint8)).crop((x0, y0, x1, y1)).resize(ref.size, Image.LANCZOS)
        a = np.asarray(mine).astype(int); b = np.asarray(ref).astype(int)
        d = np.abs(a - b).mean()
        report.append(f'frame {i}: mean |diff| {d:.1f} / 255')
        pair = Image.new('RGB', (ref.width * 2 + 20, ref.height), '#17181C')
        pair.paste(ref, (0, 0)); pair.paste(mine, (ref.width + 20, 0))
        tiles.append(pair)
    sheet = Image.new('RGB', (max(t.width for t in tiles), sum(t.height for t in tiles) + 40 * len(tiles)), '#17181C')
    y = 0
    for t in tiles: sheet.paste(t, (0, y)); y += t.height + 40
    return sheet, report

if __name__ == '__main__':
    seed = int(sys.argv[1]) if len(sys.argv) > 1 else 7
    frames = build(seed)
    os.makedirs(OUT, exist_ok=True)
    for i, f in enumerate(frames, 1): save(f, os.path.join(OUT, f'figma-{i}.png'))
    sheet, report = check(frames)
    sheet.save(os.path.join(OUT, 'figma-check.png'))
    print('\n'.join(report))
