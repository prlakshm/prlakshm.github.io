"""Newspaper scraps for the hero, in the manner of Donna Ruff's cut newspapers.

Three clippings (clip-a/b/c.html, rendered flat by Chrome at 2x) are printed
onto newsprint — thin, warm, grainy, with the other side showing through —
torn along all four edges, and then cut through with one of four lace
patterns everywhere except the parts that must survive: a headline, a photo.
Gold leaf lands on a few of the lace's nodes, as it does in the originals.

Outputs, in out/:
  scrap-<k>.png          torn + cut, RGBA, 2x (ready to drop into Figma)
  scrap-<k>-torn.png     torn only, so a different lace can be laid over it
  lace-<n>-holes.svg     the cut shapes, black, 1x CSS px
  lace-<n>-web.svg       the paper that remains: use this one as a Figma mask
  contact-sheet.png      everything at a glance
Run:  python3 build.py
"""
import math, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../../scripts/torn_paper'))
from generate import edge_profile

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out'); os.makedirs(OUT, exist_ok=True)
S = 2  # render scale

PAPER = np.array([232, 224, 206], float)      # newsprint, a day old
PAPER_LIGHT = np.array([240, 234, 220], float)
CORE = (246, 242, 232)                       # fibre where the top ply pulled away
GOLD = [(214, 172, 60), (236, 204, 96), (184, 140, 44)]

# ---------------------------------------------------------------- lace shapes
def star(cx, cy, r, n, inner=0.5, rot=0):
    pts = []
    for i in range(2 * n):
        a = rot + math.pi * i / n
        rr = r if i % 2 == 0 else r * inner
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return pts
def poly(cx, cy, r, n, rot=0):
    return [(cx + r * math.cos(rot + 2 * math.pi * i / n), cy + r * math.sin(rot + 2 * math.pi * i / n)) for i in range(n)]
def cross(cx, cy, arm, w):
    a, h = arm, w / 2
    return [(cx - h, cy - a), (cx + h, cy - a), (cx + h, cy - h), (cx + a, cy - h), (cx + a, cy + h), (cx + h, cy + h),
            (cx + h, cy + a), (cx - h, cy + a), (cx - h, cy + h), (cx - a, cy + h), (cx - a, cy - h), (cx - h, cy - h)]
def petal(cx, cy, r, ang, w=0.42):
    # a pointed oval from the centre outward
    pts = []
    for i in range(13):
        t = i / 12
        along = r * t
        across = r * w * math.sin(math.pi * t)
        pts.append((cx + along * math.cos(ang) - across * math.sin(ang), cy + along * math.sin(ang) + across * math.cos(ang)))
    for i in range(12, -1, -1):
        t = i / 12
        along = r * t
        across = -r * w * math.sin(math.pi * t)
        pts.append((cx + along * math.cos(ang) - across * math.sin(ang), cy + along * math.sin(ang) + across * math.cos(ang)))
    return pts

def lace_net(W, H, rng):
    """Dense star-and-hexagon net (ref 1 & 2)."""
    out = []; step = 27; rowh = step * math.sqrt(3) / 2
    for j in range(-1, int(H / rowh) + 2):
        for i in range(-1, int(W / step) + 2):
            x = i * step + (step / 2 if j % 2 else 0); y = j * rowh
            if (i + j) % 2 == 0:
                out.append(poly(x, y, 13.4, 6, math.pi / 6))
            else:
                out.append(star(x, y, 15.8, 6, 0.6, math.pi / 6))
    return out
def lace_rosette(W, H, rng):
    """Big twelve-point rosettes with a ring of petals (ref 3)."""
    out = []; step = 118
    for j in range(-1, int(H / step) + 2):
        for i in range(-1, int(W / step) + 2):
            x = i * step + (step / 2 if j % 2 else 0); y = j * step * 0.9
            out.append(star(x, y, 52, 12, 0.8))
            for k in range(12):
                a = 2 * math.pi * k / 12 + math.pi / 12
                out.append(petal(x + 54 * math.cos(a), y + 54 * math.sin(a), 26, a, 0.6))
            out.append(poly(x + step / 2, y + step * 0.45, 13, 6))
    return out
def lace_cross(W, H, rng):
    """Eight-point stars and crosses, the coarse Islamic lattice (ref 4)."""
    out = []; step = 54
    for j in range(-1, int(H / step) + 2):
        for i in range(-1, int(W / step) + 2):
            x = i * step; y = j * step
            if (i + j) % 2 == 0:
                out.append(star(x, y, 31, 8, 0.68, math.pi / 8))
            else:
                out.append(cross(x, y, 27, 18))
    return out
def lace_flower(W, H, rng):
    """Six-petal flowers on a hex grid, a dot between (ref 1's photo edge)."""
    out = []; step = 44; rowh = step * math.sqrt(3) / 2
    for j in range(-1, int(H / rowh) + 2):
        for i in range(-1, int(W / step) + 2):
            x = i * step + (step / 2 if j % 2 else 0); y = j * rowh
            for k in range(6):
                out.append(petal(x + 3 * math.cos(2 * math.pi * k / 6), y + 3 * math.sin(2 * math.pi * k / 6), 21, 2 * math.pi * k / 6 + (0.3 if j % 2 else 0), 0.62))
            out.append(poly(x + step / 2, y + rowh / 3, 6, 8))
    return out
LACES = [('net', lace_net), ('rosette', lace_rosette), ('cross', lace_cross), ('flower', lace_flower)]

def svg_path(shapes):
    d = []
    for pts in shapes:
        d.append('M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in pts) + ' Z')
    return ''.join(d)
def write_lace_svgs(W=1200, H=1200):
    rng = np.random.default_rng(1)
    for n, (name, fn) in enumerate(LACES, 1):
        shapes = fn(W, H, rng)
        path = svg_path(shapes)
        open(os.path.join(OUT, f'lace-{n}-{name}-holes.svg'), 'w').write(
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><path fill="#000" d="{path}"/></svg>')
        open(os.path.join(OUT, f'lace-{n}-{name}-web.svg'), 'w').write(
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><path fill="#fff" fill-rule="evenodd" d="M0 0 H{W} V{H} H0 Z {path}"/></svg>')

# ------------------------------------------------------------------ newsprint
def newsprint(flat, seed):
    """Print the flat page onto thin paper: grain, uneven tone, ink spread, and
    the back of the sheet showing through."""
    rng = np.random.default_rng(seed)
    H, W = flat.shape[:2]
    ink = flat.astype(float) / 255                     # 1 = white
    # ink spreads a little into the fibre
    soft = np.asarray(Image.fromarray(flat).filter(ImageFilter.GaussianBlur(0.9))).astype(float) / 255
    ink = np.minimum(ink, soft * 0.35 + ink * 0.65)
    # show-through: the other side of the sheet, mirrored, faint
    back = np.asarray(Image.fromarray(flat).transpose(Image.FLIP_LEFT_RIGHT).filter(ImageFilter.GaussianBlur(1.6))).astype(float) / 255
    back = np.roll(back, (rng.integers(20, 60), rng.integers(-40, 40)), axis=(0, 1))
    through = 1 - (1 - back) * 0.11
    # paper tone: large slow stains, fine grain, a few fibres
    yy, xx = np.mgrid[0:H, 0:W]
    low = np.zeros((H, W))
    for k in range(3):
        f = 1.5 + k
        ph = rng.random(4) * 6
        low += np.sin(xx / W * f * 3.1 + ph[0] + np.sin(yy / H * f * 2.3 + ph[1])) * np.cos(yy / H * f * 2.7 + ph[2]) / (k + 1)
    low = (low - low.min()) / (low.max() - low.min() + 1e-6)
    tone = PAPER * (1 - 0.5 * low[..., None]) + PAPER_LIGHT * (0.5 * low[..., None])
    grain = rng.normal(0, 1, (H, W))
    grain = np.asarray(Image.fromarray(np.clip(grain * 40 + 128, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))).astype(float) / 255 - 0.5
    tone = tone * (1 + grain[..., None] * 0.16)
    fib = (rng.random((H, W)) > 0.9985).astype(float)
    fib = np.asarray(Image.fromarray((fib * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))).astype(float) / 255
    tone = tone * (1 - fib[..., None] * 2.2) + 255 * fib[..., None] * 2.2 * 0.98
    rgb = tone / 255 * ink * through
    # newsprint ink is never quite black
    rgb = np.maximum(rgb, 0.075)
    return np.clip(rgb * 255, 0, 255)

def torn_alpha(W, H, seed, depth, base):
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:H, 0:W]
    top = edge_profile(W, seed + 1, depth=depth, base=base); bot = edge_profile(W, seed + 2, depth=depth, base=base)
    left = edge_profile(H, seed + 3, depth=depth * 0.8, base=base); right = edge_profile(H, seed + 4, depth=depth * 0.8, base=base)
    dist = np.minimum(np.minimum(yy - top[None, :], (H - 1 - yy) - bot[None, :]), np.minimum(xx - left[:, None], (W - 1 - xx) - right[:, None]))
    FR = 9.0
    a = np.clip(dist / FR, 0, 1)
    sp = rng.random((H, W))
    fringe = (dist > -7) & (dist < FR) & (sp > 0.45)
    a[fringe] = np.maximum(a[fringe], sp[fringe] * 0.9)
    a = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))).astype(float) / 255
    core = np.clip(1 - dist / 34, 0, 1) ** 1.6 * a
    return a, core

def lace_mask(W, H, shapes, keeps, rng, scale):
    """Rasterise the holes, leaving out any shape whose centre falls in a keep
    rectangle (feathered: near the edge, some survive, some don't)."""
    SS = 2
    im = Image.new('L', (W * SS, H * SS), 0)
    d = ImageDraw.Draw(im)
    for pts in shapes:
        cx = sum(p[0] for p in pts) / len(pts); cy = sum(p[1] for p in pts) / len(pts)
        skip = False
        for (x0, y0, x1, y1) in keeps:
            m = 14
            if x0 - m < cx < x1 + m and y0 - m < cy < y1 + m:
                inside = x0 + m < cx < x1 - m and y0 + m < cy < y1 - m
                if inside or rng.random() < 0.6:
                    skip = True; break
        if skip: continue
        d.polygon([(x * scale * SS, y * scale * SS) for x, y in pts], fill=255)
    return np.asarray(im.resize((W, H), Image.LANCZOS)).astype(float) / 255

def gold(rgb, alpha, shapes_px, rng, n, scale):
    """A few squares of gold leaf, pressed onto nodes of the lace."""
    H, W = alpha.shape
    im = Image.fromarray(rgb.astype(np.uint8))
    d = ImageDraw.Draw(im)
    picks = rng.choice(len(shapes_px), size=min(n, len(shapes_px)), replace=False)
    for k in picks:
        pts = shapes_px[k]
        cx = sum(p[0] for p in pts) / len(pts) * scale; cy = sum(p[1] for p in pts) / len(pts) * scale
        if not (0 < cx < W and 0 < cy < H) or alpha[int(cy), int(cx)] < 0.5: continue
        s = (6 + rng.random() * 5) * scale; a = rng.random() * math.pi
        sq = [(cx + s * math.cos(a + i * math.pi / 2 + math.pi / 4), cy + s * math.sin(a + i * math.pi / 2 + math.pi / 4)) for i in range(4)]
        d.polygon(sq, fill=GOLD[rng.integers(0, 3)])
        d.line(sq[:2], fill=GOLD[1], width=1)
    return np.asarray(im).astype(float)

SCRAPS = {
    # keep rectangles in CSS px: what the lace must not eat
    'a': dict(seed=11, lace=0, keeps=[(34, 104, 470, 200), (60, 420, 300, 700), (260, 30, 850, 105)], gold=40, tear=(48, 12)),
    'b': dict(seed=23, lace=2, keeps=[(32, 24, 540, 150), (160, 260, 450, 500)], gold=30, tear=(42, 11)),
    'c': dict(seed=37, lace=1, keeps=[(26, 14, 620, 125), (120, 150, 420, 230), (90, 720, 540, 980)], gold=18, tear=(36, 10)),
}

def build(k, cfg):
    flat = np.asarray(Image.open(os.path.join(HERE, 'src', f'flat-{k}.png')).convert('RGB'))
    H, W = flat.shape[:2]
    rng = np.random.default_rng(cfg['seed'])
    rgb = newsprint(flat, cfg['seed'])
    a, core = torn_alpha(W, H, cfg['seed'], cfg['tear'][0] * S, cfg['tear'][1] * S)
    rgb = rgb * (1 - core[..., None] * 0.85) + np.array(CORE) * core[..., None] * 0.85
    torn = Image.fromarray(np.dstack([rgb, a * 255]).astype(np.uint8), 'RGBA')
    torn.save(os.path.join(OUT, f'scrap-{k}-torn.png'))

    name, fn = LACES[cfg['lace']]
    shapes = fn(W / S, H / S, rng)
    holes = lace_mask(W, H, shapes, cfg['keeps'], rng, S)
    # the cut edge is paper too: a sliver of fibre round every hole
    rim = np.asarray(Image.fromarray((holes * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))).astype(float) / 255 - holes
    rgb2 = rgb * (1 - rim[..., None] * 0.5) + np.array(CORE) * rim[..., None] * 0.5
    rgb2 = gold(rgb2, a * (1 - holes), shapes, rng, cfg['gold'], S)
    alpha = a * (1 - holes)
    cut = Image.fromarray(np.dstack([rgb2, alpha * 255]).astype(np.uint8), 'RGBA')
    cut.save(os.path.join(OUT, f'scrap-{k}.png'))
    print(k, name, W, H, f'cut away {holes.mean() * 100:.0f}% of the sheet')
    return cut

if __name__ == '__main__':
    write_lace_svgs()
    sheets = [build(k, cfg) for k, cfg in SCRAPS.items()]
    # contact sheet, on the site's white, at 1x
    th = [s.resize((s.width // S, s.height // S), Image.LANCZOS) for s in sheets]
    rng = np.random.default_rng(5)
    tiles = []
    for name, fn in LACES:
        im = Image.new('L', (300 * 2, 300 * 2), 255)
        d = ImageDraw.Draw(im)
        for pts in fn(300, 300, rng):
            d.polygon([(x * 2, y * 2) for x, y in pts], fill=40)
        tiles.append(im.resize((300, 300), Image.LANCZOS).convert('RGBA'))
    W = sum(t.width for t in th) + 60 * (len(th) + 1) + 360; H = max(t.height for t in th) + 120
    sheet = Image.new('RGBA', (W, H), (255, 255, 255, 255)); x = 60
    for t in th:
        sheet.alpha_composite(t, (x, 60)); x += t.width + 60
    for i, t in enumerate(tiles):
        sheet.alpha_composite(t, (x, 60 + i * 330))
    sheet.save(os.path.join(OUT, 'contact-sheet.png'))
    print('sheet', sheet.size)
