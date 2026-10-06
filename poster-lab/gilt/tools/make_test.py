#!/usr/bin/env python3
"""make_test.py - a small placeholder concept for developing the gilt engine.

Writes poster-lab/gilt/concepts/test/ following the asset contract (see engine/concept.ts):
atlas_print.png (RGBA straight alpha), atlas_fx.png (RGB: foil, pearl, height), layout.json,
under_d.png, under_m.png, concept.json.

Pieces: five crinkled gold-leaf lily pads (gen_foil 'crinkle', period 4 texels, grain -35 deg,
blind-debossed veins, a shallow dish and a turned-up lip), one painted water lily (watercolour
pink and white petals, gold stamen domes and broken gold petal-edge lines), and three gilded
brush dabs. Everything is generated here; nothing is sampled from anyone's files.

usage: python3 make_test.py [--gen /path/to/foiltex]   (default: the session scratchpad copy)
"""
import argparse, json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'concepts', 'test')
TPX = 2          # atlas texels per CSS px
MARGIN = 6       # texels of padding around every piece (room for the shoulder)

ap = argparse.ArgumentParser()
ap.add_argument('--gen', default='/private/tmp/claude-501/-Users-pranavi-Documents-GitHub-prlakshm-github-io/'
                'd63b9b37-0a16-462a-b9d0-58588530c01f/scratchpad/redo/foiltex')
ap.add_argument('--out', default=OUT)
args = ap.parse_args()
sys.path.insert(0, args.gen)
from gen_foil import make_foil, smoothstep, low_noise, stroke_mask  # noqa: E402


def sstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


# ------------------------------------------------------------------------------------------
# lily pad: a wobbly ellipse with a V notch, seen low (the aspect is baked per pad)

def pad_mask(w, h, seed, notch=0.5, ss=4):
    rng = np.random.default_rng(seed)
    W, H = w + 2 * MARGIN, h + 2 * MARGIN
    im = Image.new('L', (W * ss, H * ss), 0)
    k = rng.normal(0, 1, 6)
    cx, cy = W / 2, H / 2
    rx, ry = w / 2, h / 2
    half = 0.11 + 0.04 * rng.random()
    pts = []
    for i in range(241):
        a = notch + half + (2 * math.pi - 2 * half) * i / 240
        wob = 1 + 0.022 * (k[0] * math.sin(3 * a + k[1]) + k[2] * math.sin(5 * a + k[3]) + 0.5 * k[4] * math.sin(9 * a + k[5]))
        pts.append(((cx + math.cos(a) * rx * wob) * ss, (cy + math.sin(a) * ry * wob) * ss))
    pts.append(((cx + 0.05 * rx * math.cos(notch)) * ss, (cy + 0.05 * ry * math.sin(notch)) * ss))
    ImageDraw.Draw(im).polygon(pts, fill=255)
    m = np.asarray(im.resize((W, H), Image.LANCZOS)).astype(np.float64) / 255
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    lx, ly = (xx + 0.5 - cx) / rx, (yy + 0.5 - cy) / ry
    return m, lx, ly


def pad_piece(w, h, seed, notch):
    m, lx, ly = pad_mask(w, h, seed, notch)
    f = make_foil(m, 'crinkle', period=4.0, seed=seed)
    r = np.hypot(lx, ly)
    ang = np.arctan2(ly, lx)
    inside = m > 0.5
    d_in = ndi.distance_transform_edt(inside)
    # radial veins from the notch apex, blind-debossed
    nv = 13
    ph = (ang - notch) * nv / (2 * math.pi)
    across = (ph - np.round(ph)) * 2 * math.pi * r * min(w, h * 2.2) / 2 / nv
    vein = np.exp(-(across / 0.9) ** 2) * sstep(0.12, 0.3, r) * (1 - sstep(0.78, 0.95, r))
    if w < 90:
        vein *= 0.0
    dish = 1 - np.clip(r, 0, 1) ** 2
    lip = np.exp(-((d_in - 2.5) / 1.6) ** 2) * inside
    hgt = f['fx'][..., 2] + (-0.04 * vein - 0.03 * dish * (w > 60) + 0.03 * lip) * m
    f['fx'][..., 2] = np.clip(hgt, 0, 1)
    # the 'photo' sees the veins too: a darker groove with a lit lower lip
    gy = np.roll(vein, 1, 0) - np.roll(vein, -1, 0)
    f['print'] = np.clip(f['print'] * (1 - 0.10 * vein[..., None]) + 0.05 * np.clip(gy, 0, 1)[..., None], 0, 1)
    # the photo's own rim light: the shoulder facing the (up-left) studio light is brighter,
    # the far side a little darker (measured on stamped leaf: edge band ~+9 L* over the centre)
    mb = ndi.gaussian_filter(m, 2.0)
    gx_, gy_ = np.gradient(mb, axis=1), np.gradient(mb, axis=0)
    gn = np.hypot(gx_, gy_) + 1e-6
    facing = (-gx_ * -0.6 + -gy_ * -0.8) / gn          # outward normal . (up-left)
    band = np.exp(-d_in / 2.5) * inside
    rim = band * np.clip(facing, -1, 1)
    f['print'] = np.clip(f['print'] * (1 + 0.16 * np.clip(rim, 0, 1)[..., None] - 0.08 * np.clip(-rim, 0, 1)[..., None]), 0, 1)
    fx = f['fx'].copy()
    fx[..., 1] = 0.0          # no pearl on leaf
    return dict(print=f['print'], alpha=m, fx=fx)


# ------------------------------------------------------------------------------------------
# a painted water lily, seen low: watercolour petals, gold stamens and broken gold edges

def lily_piece(w, h, seed):
    rng = np.random.default_rng(seed)
    W, H = w + 2 * MARGIN, h + 2 * MARGIN
    ss = 4
    cx, cy = W / 2, H * 0.70
    R = min(w * 0.5, h * 0.9)
    layers = []   # (mask, colour)

    def petal(ang, L, Wd, dy=0.0):
        im = Image.new('L', (W * ss, H * ss), 0)
        pts = []
        for t in np.linspace(0, 1, 18):
            ww = Wd * math.sin(math.pi * t ** 0.85) * (1 - 0.2 * t)
            pts.append((t * L, ww))
        pts += [(t, -ww) for (t, ww) in reversed(pts)]
        c, s = math.cos(ang), math.sin(ang)
        ImageDraw.Draw(im).polygon([((cx + c * u - s * v) * ss, (cy + dy + (s * u + c * v) * 0.62) * ss) for u, v in pts], fill=255)
        return np.asarray(im.resize((W, H), Image.LANCZOS)).astype(np.float64) / 255

    pink = np.array([0.91, 0.75, 0.82])
    rose = np.array([0.86, 0.62, 0.72])
    white = np.array([0.97, 0.93, 0.95])
    for a in np.linspace(-2.85, -0.29, 7):            # back petals, pink, shaded
        layers.append((petal(a + rng.normal(0, 0.05), R * rng.uniform(0.9, 1.02), R * 0.2), pink, 0.0))
    for a in np.linspace(-2.5, -0.64, 5):             # front petals, white, lit
        layers.append((petal(a + rng.normal(0, 0.05), R * rng.uniform(0.66, 0.8), R * 0.19, dy=R * 0.06), white, 0.6))
    for a in (-3.05, -0.09, -2.95, -0.19):            # low petals lying flat
        layers.append((petal(a, R * 0.95, R * 0.16, dy=R * 0.1), rose, 0.0))
    alpha = np.zeros((H, W))
    col = np.zeros((H, W, 3))
    pearl = np.zeros((H, W))
    edge_lines = np.zeros((H, W))
    paper_n = low_noise(H, W, 6, rng)
    for i, (m, c, prl) in enumerate(layers):
        # watercolour: pigment pools at the edge, paper shows through in the middle
        d = ndi.distance_transform_edt(m > 0.5)
        pool = np.exp(-d / 2.2) * (m > 0.5)
        tone = c * (1 - 0.16 * pool[..., None]) + (1 - c) * 0.18 * sstep(3, 9, d)[..., None]
        tone = tone * (1 + 0.035 * paper_n[..., None])
        col = col * (1 - m[..., None]) + tone * m[..., None]
        pearl = pearl * (1 - m) + prl * m
        alpha = alpha + m * (1 - alpha)
        # the petal's outline, for a broken gold edge on some petals
        if rng.random() < 0.75:
            ring = ((m > 0.5) & (d < 2.6)).astype(np.float64)
            edge_lines = edge_lines * (1 - m) + ring
    brk = low_noise(H, W, 7, rng)
    edge_lines = edge_lines * (brk > -0.25) * (alpha > 0.5)
    # stamens: a little crown of domes above the cup
    st = Image.new('L', (W * ss, H * ss), 0)
    ds = ImageDraw.Draw(st)
    for k in range(14):
        sx = cx + rng.uniform(-0.24, 0.24) * R
        sy = cy - R * rng.uniform(0.18, 0.36) * 0.62
        rr = R * rng.uniform(0.045, 0.07) * ss
        ds.ellipse([sx * ss - rr, sy * ss - rr * 0.85, sx * ss + rr, sy * ss + rr * 0.85], fill=255)
    stm = np.asarray(st.resize((W, H), Image.LANCZOS)).astype(np.float64) / 255
    foil = np.clip(np.maximum(ndi.gaussian_filter(edge_lines, 0.5), stm), 0, 1)
    g = make_foil(foil, 'crinkle', period=3.5, seed=seed + 3)
    gh = make_foil(stm, 'hammered', period=3.5, seed=seed + 5)
    dome = np.sqrt(np.clip(ndi.distance_transform_edt(stm > 0.5) / 3.0, 0, 1))
    gold = g['print'] * (1 - stm[..., None]) + gh['print'] * stm[..., None]
    alpha = np.maximum(alpha, foil)
    col = col * (1 - foil[..., None]) + gold * foil[..., None]
    height = np.maximum(g['fx'][..., 2], 0.08 + (gh['fx'][..., 2] - 0.08) * (0.7 + 0.3 * dome))
    height = np.maximum(height, 0.08 + 0.03 * sstep(0.3, 0.9, alpha))     # petals barely raised
    fx = np.stack([foil, pearl * alpha * (1 - foil), height], -1)
    return dict(print=np.clip(col, 0, 1), alpha=alpha, fx=fx)


def dab_piece(w, h, seed):
    W, H = w + 2 * MARGIN, h + 2 * MARGIN
    m = np.zeros((H, W))
    m[MARGIN:MARGIN + h, MARGIN:MARGIN + w] = stroke_mask(h, w, seed=seed)
    f = make_foil(m, 'crinkle', period=3.5, seed=seed)
    fx = f['fx'].copy()
    fx[..., 1] = 0
    return dict(print=f['print'], alpha=m, fx=fx)


# ------------------------------------------------------------------------------------------

def pack(pieces, AW=1024, AH=1024, gutter=4):
    x = y = shelf = 0
    rects = {}
    for name, p in sorted(pieces.items(), key=lambda kv: -kv[1]['alpha'].shape[0]):
        h, w = p['alpha'].shape
        if x + w > AW:
            x, y, shelf = 0, y + shelf + gutter, 0
        if y + h > AH:
            raise SystemExit('atlas full')
        rects[name] = [x, y, w, h]
        x += w + gutter
        shelf = max(shelf, h)
    return rects


def under_maps(W, H, mobile=False, seed=1):
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    u, v = (xx + 0.5) / W, (yy + 0.5) / H
    n1 = low_noise(H, W, W / 9, rng)
    n2 = low_noise(H, W, W / 20, rng)
    blob = lambda cx, cy, sx, sy: np.exp(-(((u - cx) / sx) ** 2 + ((v - cy) / sy) ** 2))
    if not mobile:
        cloud = blob(0.47, 0.30, 0.17, 0.20) + 0.8 * blob(0.66, 0.42, 0.10, 0.16) + 0.5 * blob(0.33, 0.16, 0.08, 0.10)
        wil = sum(np.exp(-((u - x0 - 0.01 * np.sin(v * 9 + x0 * 20)) / wd) ** 2) * sstep(0.95, 0.15, v) * a
                  for x0, wd, a in ((0.10, 0.030, 0.8), (0.16, 0.018, 0.6), (0.82, 0.035, 0.85), (0.89, 0.02, 0.6), (0.95, 0.025, 0.7)))
        lav = 0.8 * blob(0.12, 0.85, 0.20, 0.35) + 0.7 * blob(0.86, 0.85, 0.18, 0.35) + 0.4 * blob(0.55, 0.95, 0.15, 0.2)
        sun = blob(0.60, 0.48, 0.07, 0.55)
    else:
        cloud = blob(0.50, 0.28, 0.32, 0.22) + 0.6 * blob(0.7, 0.45, 0.2, 0.15)
        wil = sum(np.exp(-((u - x0 - 0.015 * np.sin(v * 9)) / wd) ** 2) * sstep(0.95, 0.15, v) * a
                  for x0, wd, a in ((0.08, 0.05, 0.8), (0.90, 0.05, 0.8)))
        lav = 0.8 * blob(0.15, 0.9, 0.3, 0.35) + 0.6 * blob(0.85, 0.9, 0.3, 0.3)
        sun = blob(0.58, 0.5, 0.12, 0.55)
    cloud = np.clip(cloud * (1 + 0.35 * n1), 0, 1)
    wil = np.clip(wil * (1 + 0.4 * n2), 0, 1)
    lav = np.clip(lav * (1 + 0.3 * n2), 0, 1)
    sun = np.clip(sun * (1 + 0.3 * n1), 0, 1)
    return (np.stack([cloud, wil, lav, sun], -1) * 255 + 0.5).astype(np.uint8)


def main():
    os.makedirs(args.out, exist_ok=True)
    pieces = {
        'padA': pad_piece(460, 190, 11, notch=0.35),   # 230 x 95 CSS px
        'padB': pad_piece(300, 116, 12, notch=2.6),
        'padC': pad_piece(200, 70, 13, notch=-0.9),
        'padD': pad_piece(128, 38, 14, notch=0.9),
        'padE': pad_piece(84, 22, 15, notch=2.2),
        'lily': lily_piece(150, 96, 21),
        'dab1': dab_piece(64, 12, 31),
        'dab2': dab_piece(44, 9, 32),
    }
    AW, AH = 1024, 1024
    rects = pack(pieces, AW, AH)
    prt = np.zeros((AH, AW, 4))
    fxa = np.zeros((AH, AW, 3))
    fxa[..., 2] = 0.08
    for k, p in pieces.items():
        x, y, w, h = rects[k]
        prt[y:y + h, x:x + w, :3] = p['print']
        prt[y:y + h, x:x + w, 3] = p['alpha']
        fxa[y:y + h, x:x + w] = p['fx']
    Image.fromarray((np.clip(prt, 0, 1) * 255 + 0.5).astype(np.uint8)).save(os.path.join(args.out, 'atlas_print.png'), optimize=True)
    Image.fromarray((np.clip(fxa, 0, 1) * 255 + 0.5).astype(np.uint8)).save(os.path.join(args.out, 'atlas_fx.png'), optimize=True)

    BH = 279.0
    nat = lambda k: rects[k][3] / TPX / BH       # piece height in band heights at its native size

    def P(pid, key, dx, dy, s=1.0, rot=0.0, flip=False, m=None, z=0, keep=1.0, phase=None):
        return dict(id=pid, rect=rects[key], anchor=[0.5, 0.5], kind='lily' if key == 'lily' else ('dab' if key.startswith('dab') else 'pad'),
                    desktop=dict(x=dx, y=dy, h=round(nat(key) * s, 4), rot=rot, flip=flip),
                    mobile=m, z=z, keep=keep, phase=phase if phase is not None else round((sum(ord(c) * 37 ** i for i, c in enumerate(pid)) % 1000) / 1000, 3), breathe=1.0)

    def M(x, y, s, key, rot=0.0, flip=False):
        return dict(x=x, y=y, h=round(nat(key) * s, 4), rot=rot, flip=flip)

    lay = [
        # left raft, bleeding off the bottom-left
        P('hero', 'padA', 0.175, 0.86, 1.0, -0.03, m=M(0.24, 0.84, 0.95, 'padA', -0.03), z=2),
        P('l1', 'padB', 0.045, 0.58, 1.0, 0.04, True, m=M(0.05, 0.50, 0.85, 'padB', 0.04, True), z=1),
        P('l2', 'padC', 0.315, 0.60, 1.0, 0.02, m=None, z=1, keep=0.6),
        P('l3', 'padD', 0.235, 0.41, 1.0, 0.0, True, m=M(0.40, 0.42, 0.9, 'padD'), z=1),
        P('lily', 'lily', 0.205, 0.70, 1.0, 0.0, m=M(0.27, 0.66, 0.85, 'lily'), z=5),
        # far pads near the top, small and flat
        P('f1', 'padE', 0.41, 0.19, 1.0, 0.0, m=M(0.62, 0.20, 0.85, 'padE'), z=0, keep=0.4),
        P('f2', 'padE', 0.465, 0.15, 0.8, 0.0, True, m=None, z=0, keep=0.3),
        P('f3', 'padD', 0.64, 0.24, 0.85, 0.01, m=None, z=0, keep=0.5),
        P('f4', 'padE', 0.705, 0.17, 0.9, 0.0, m=M(0.80, 0.24, 0.8, 'padE', 0.0, True), z=0, keep=0.4),
        # right raft
        P('r1', 'padB', 0.80, 0.80, 1.05, -0.02, True, m=M(0.80, 0.86, 0.8, 'padB', -0.02, True), z=1),
        P('r2', 'padC', 0.925, 0.54, 1.0, 0.03, m=M(0.95, 0.55, 0.8, 'padC'), z=1),
        P('r3', 'padA', 0.975, 0.98, 0.72, 0.02, True, m=None, z=2),
        P('r4', 'padD', 0.70, 0.62, 0.9, 0.0, m=None, z=1, keep=0.6),
        # gilded dabs on the sun path
        P('d1', 'dab1', 0.585, 0.42, 1.0, 0.03, m=M(0.55, 0.40, 0.8, 'dab1'), z=0, keep=0.5),
        P('d2', 'dab2', 0.615, 0.53, 1.0, -0.02, m=None, z=0, keep=0.5),
        P('d3', 'dab1', 0.565, 0.66, 1.2, 0.01, True, m=M(0.62, 0.62, 0.9, 'dab1', 0.0, True), z=0, keep=0.5),
    ]
    layout = dict(atlas=dict(w=AW, h=AH), hero='hero', pieces=lay)
    with open(os.path.join(args.out, 'layout.json'), 'w') as fh:
        json.dump(layout, fh, indent=1)
    Image.fromarray(under_maps(512, 100)).save(os.path.join(args.out, 'under_d.png'))
    Image.fromarray(under_maps(256, 124, mobile=True)).save(os.path.join(args.out, 'under_m.png'))
    concept = dict(
        name='Test pond',
        pitch='Engine placeholder: crinkled gold-leaf pads, one painted lily with gold stamens, three gilded dabs.',
        lighting={}, motion={}, flags=dict(FOIL_WARP=False, SWELL_TILT=False, INVERT_RELIEF=False),
        water={}, coverage=[0.10, 0.18], hero='hero')
    with open(os.path.join(args.out, 'concept.json'), 'w') as fh:
        json.dump(concept, fh, indent=1)
    sizes = {f: os.path.getsize(os.path.join(args.out, f)) for f in os.listdir(args.out)}
    print(json.dumps(dict(rects=rects, sizes=sizes), indent=1))


if __name__ == '__main__':
    main()
