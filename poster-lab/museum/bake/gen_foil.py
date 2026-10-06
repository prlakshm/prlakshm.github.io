#!/usr/bin/env python3
"""gen_foil.py - procedural, photo-real gold foil: height, normals, baked print, fx map.

Our own texture (nothing sampled from anyone's photos). It follows the *conventions* of a
foil-card renderer: a colour PRINT that already looks like a photo of foil under soft studio
light, and an FX map (R = foil mask, G = flake id for glitter / 0, B = height) whose height is

    height = (0.6 * blur(mask) + 0.5 * detail * mask) * 0.85 + 0.08

so a shader can derive normals from B (central differences x relief 2.6) and light the foil live
as a coloured mirror of a few softboxes plus a cursor lamp.

Variants (see VARIANTS):
    crinkle   gold-leaf crinkle: short rounded diagonal ridges + slow undulation (the stamped
              gold of the reference cards)
    crumple   crumpled foil: piecewise-planar facets with sharp creases (layered Delaunay sheets)
    hammered  planished gold: overlapping shallow round dimples with crisp rims
    glitter   fine gold glitter: flat sheet of Voronoi flakes, each a tiny tilted mirror
    brushleaf gilded brushstroke: gold leaf laid over impasto strokes; bristle grooves telegraph
              through, leaf-sheet seams, broken/cracked leaf showing the paint beneath

CLI
    python3 gen_foil.py --variant crinkle --mask star --size 300 --out out/crinkle_star300
    python3 gen_foil.py --variant brushleaf --mask stroke --size 600x220 --period 6 --out out/x
    python3 gen_foil.py --variant crinkle --mask my_mask.png --period 4 --out out/pad
    python3 gen_foil.py --variant glitter --tile 512 --period 4 --out out/glitter_tile
Writes <out>_print.png (RGBA; alpha = mask), <out>_fx.png (RGB), <out>_normal.png (RGB, +y up),
<out>_height16.png (16-bit raw relief).  --webp also writes .webp copies (q 88).

Library
    from gen_foil import make_foil, render_lit
    f = make_foil(mask, variant='crinkle', period=5, seed=3)
    img = render_lit(f, lamp=(x, y, z), ground=paper_rgb)   # numpy port of the live shader
"""
import argparse, math, os, sys
import numpy as np
from scipy import ndimage as ndi
from scipy.spatial import cKDTree, Delaunay
from PIL import Image

# ----------------------------------------------------------------------------------------------
# colour helpers

def srgb_to_lin(c):
    c = np.asarray(c, dtype=np.float64)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)

def lin_to_srgb(c):
    c = np.clip(c, 0, None)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(c, 1 / 2.4) - 0.055)

def lab_to_srgb(lab):
    from skimage import color
    with np.errstate(all='ignore'):        # numpy+Accelerate raises spurious matmul warnings
        return np.clip(color.lab2rgb(np.asarray(lab, float)), 0, 1)

# Gold tone ramp, in CIELAB. The middle three stops are measured off the stamped gold in the
# reference card prints (dark p3-15 / mid p45-55 / high p94-99.5 of the foil's L*); the ends
# extend it the way gold behaves in a photo: shadows go orange-brown, blown highlights go cream.
GOLD_STOPS = [  # shade, L*, a*, b*
    (0.00, 30.0, 15.0, 40.0),
    (0.22, 49.0, 16.0, 56.0),
    (0.40, 60.5, 13.5, 60.0),
    (0.60, 69.5, 10.5, 61.0),
    (0.80, 79.0, 7.0, 59.0),
    (0.95, 86.0, 4.0, 56.0),
    (1.15, 93.0, 1.0, 40.0),
    (1.40, 98.0, -0.5, 18.0),
]

def gold_ramp(s, warmth=None, stops=GOLD_STOPS):
    """shade (0..1.4) -> sRGB gold. warmth (same shape, ~N(0,1)) nudges a*/b* per pixel."""
    xs = np.array([p[0] for p in stops])
    L = np.interp(s, xs, [p[1] for p in stops])
    a = np.interp(s, xs, [p[2] for p in stops])
    b = np.interp(s, xs, [p[3] for p in stops])
    if warmth is not None:
        a = a + 2.2 * warmth
        b = b + 3.0 * warmth
    return lab_to_srgb(np.stack([L, a, b], -1))

# ----------------------------------------------------------------------------------------------
# noise (all periodic -> tileable when the canvas is the tile)

def _freqs(H, W):
    return np.fft.fftfreq(H)[:, None], np.fft.fftfreq(W)[None, :]

def band_noise(H, W, period, rng, angle=0.0, aniso=1.0, bw=0.45):
    """Band-limited noise with features ~period px, elongated along `angle` (radians, image
    coords: x right, y down) by `aniso`. Unit std."""
    fy, fx = _freqs(H, W)
    c, s = math.cos(angle), math.sin(angle)
    u = fx * c + fy * s
    v = -fx * s + fy * c
    f = np.sqrt((u * aniso) ** 2 + v ** 2)
    f0 = 1.0 / period
    G = np.exp(-0.5 * ((f - f0) / (bw * f0)) ** 2)
    G[0, 0] = 0
    n = np.real(np.fft.ifft2(np.fft.fft2(rng.standard_normal((H, W))) * G))
    return n / (n.std() + 1e-12)

def low_noise(H, W, scale, rng):
    """Smooth (Gaussian-spectrum) noise with features ~scale px. Unit std."""
    fy, fx = _freqs(H, W)
    f = np.hypot(fx, fy)
    G = np.exp(-0.5 * (f * scale) ** 2)
    G[0, 0] = 0
    n = np.real(np.fft.ifft2(np.fft.fft2(rng.standard_normal((H, W))) * G))
    return n / (n.std() + 1e-12)

def warp(img, dx, dy):
    H, W = img.shape
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    return ndi.map_coordinates(img, [yy + dy, xx + dx], order=1, mode='wrap')

def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)

def box_blur(a, r, passes):
    """The reference builder's blur: box radius r, repeated (so the shoulder matches)."""
    out = a.astype(np.float64)
    for _ in range(passes):
        out = ndi.uniform_filter(out, size=2 * r + 1, mode='nearest')
    return out

def _jitter_points(H, W, spacing, rng, jitter=0.9):
    """Jittered grid points, replicated 3x3 for periodic queries."""
    ny, nx = max(1, round(H / spacing)), max(1, round(W / spacing))
    gy, gx = np.mgrid[0:ny, 0:nx].astype(np.float64)
    py = (gy + 0.5 + jitter * (rng.random(gy.shape) - 0.5)) * H / ny
    px = (gx + 0.5 + jitter * (rng.random(gx.shape) - 0.5)) * W / nx
    pts = np.stack([px.ravel(), py.ravel()], 1)
    reps = [pts + [ox * W, oy * H] for oy in (-1, 0, 1) for ox in (-1, 0, 1)]
    return pts, np.concatenate(reps)

def _grid_xy(H, W):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    return np.stack([xx.ravel() + 0.5, yy.ravel() + 0.5], 1)

# ----------------------------------------------------------------------------------------------
# detail generators. Each returns a dict:
#   h      relief in px units (height above the sheet; slopes ~ dh/dx are physical)
#   nrm    optional explicit normal field (H,W,3) overriding grad(h) (glitter flakes)
#   cover  optional leaf coverage 0..1 (brushleaf: where the leaf broke off -> substrate shows)
#   flake  optional per-pixel flake id 0..1 (glitter)
#   rough  scalar 0..1: how blurred the reflections are in the bake

def splat_worms(H, W, P, rng, angle, density=1.0, spread=0.4, stray=0.22):
    """Sparse-convolution wrinkles: N short beads (capsules, curved), height 0..1, periodic."""
    n = int(density * H * W / (1.25 * P * P))
    out = np.zeros((H, W))
    R = int(math.ceil(1.4 * P)) + 2
    oy, ox = np.mgrid[-R:R + 1, -R:R + 1].astype(np.float64)
    cxs, cys = rng.random(n) * W, rng.random(n) * H
    ang = angle + spread * rng.standard_normal(n)
    ang = np.where(rng.random(n) < stray, rng.random(n) * math.pi, ang)
    Ls = P * (0.7 + 1.5 * rng.random(n) ** 1.5)
    ws = P * (0.19 + 0.12 * rng.random(n))
    ks = rng.standard_normal(n) * 2.0
    hs = 0.75 + 0.5 * rng.random(n)
    for i in range(n):
        cx, cy = cxs[i], cys[i]
        ix, iy = int(cx), int(cy)
        fx, fy = ox - (cx - ix), oy - (cy - iy)
        ca, sa = math.cos(ang[i]), math.sin(ang[i])
        t = fx * ca + fy * sa
        L2 = 0.5 * Ls[i]
        d = -fx * sa + fy * ca - ks[i] * (t * t) / max(Ls[i], 1e-6) * 0.5
        q = np.sqrt(np.maximum(np.abs(t) - L2, 0) ** 2 + d * d) / ws[i]
        b = hs[i] * np.sqrt(np.clip(1 - q * q, 0, 1))
        rows = (iy + np.arange(-R, R + 1)) % H
        cols = (ix + np.arange(-R, R + 1)) % W
        sub = out[np.ix_(rows, cols)]
        out[np.ix_(rows, cols)] = np.maximum(sub, b)
    return out

def detail_crinkle(H, W, P, rng, angle=-0.61, aniso=3.6, amp=1.0, undulation=1.0):
    """Gold-leaf crinkle. Measured on the reference stamps: rounded ridges ~0.45P wide and
    1.2-3P long, spaced ~P (P = 5-7 px when a star is ~150 px across), mostly one diagonal
    (about -35 deg, '/'), on a gentle undulation that makes broad brighter/darker reflections."""
    n1 = band_noise(H, W, P, rng, angle, aniso, bw=0.38)
    n2 = band_noise(H, W, P * 1.15, rng, angle + 1.1, aniso * 0.7, bw=0.45)
    # a second, crossing family fades in and out across the sheet (the leaf was pressed twice)
    mix = smoothstep(-0.3, 1.2, low_noise(H, W, 10 * P, rng))
    n = n1 * (1 - 0.55 * mix) + 0.75 * n2 * mix
    n /= n.std()
    # curl the worms a little
    n = warp(n, 0.32 * P * low_noise(H, W, 2.5 * P, rng), 0.32 * P * low_noise(H, W, 2.5 * P, rng))
    # the body between wrinkles: soft grains on the noise's tops
    grains = smoothstep(GR_LO, GR_HI, n)
    grains = ndi.gaussian_filter(grains, 0.08 * P + 0.25, mode='wrap')
    # the wrinkles themselves: short rounded worms (capsules, gently curved), mostly along the
    # leaf's grain, splatted explicitly so they stay crisp
    worms = splat_worms(H, W, P, rng, angle, density=WORM_DENSITY)
    grains = WORM_MIX * worms + (1 - WORM_MIX) * grains
    dents = ndi.gaussian_filter(smoothstep(1.0, 2.2, -n), 0.12 * P, mode='wrap')
    # micro-crinkle: the leaf's own fine wrinkling between the worms (this is what sparkles)
    micro = band_noise(H, W, MICRO_P * P, rng, angle + 0.3, 1.6, bw=0.5)
    micro = np.sign(micro) * np.abs(micro) ** 0.7
    und = low_noise(H, W, 5.0 * P, rng)              # sheet undulation
    swell = low_noise(H, W, 13 * P, rng)             # slow pillowing
    fine = ndi.gaussian_filter(rng.standard_normal((H, W)), 0.45, mode='wrap')
    base = 0.34 * P * grains - 0.08 * P * dents + undulation * (0.12 * P * und + 0.3 * P * swell)
    h = amp * (base + MICRO_A * P * micro + 0.01 * P * fine)
    # the photo shows the worms crisply; the micro-wrinkle mostly shows as live sparkle
    hb = amp * (base + 0.012 * P * micro + 0.01 * P * fine)
    return dict(h=h, h_bake=hb, rough=0.10)

def _pl_sheet(H, W, spacing, zamp, rng, xy):
    """One piecewise-linear sheet: Delaunay over jittered points, random heights (periodic)."""
    pts, allp = _jitter_points(H, W, spacing, rng, 0.95)
    z = np.tile(rng.standard_normal(len(pts)) * zamp, 9)
    tri = Delaunay(allp)
    s = tri.find_simplex(xy)
    T = tri.transform[s]
    b = np.einsum('nij,nj->ni', T[:, :2], xy - T[:, 2])
    bary = np.c_[b, 1 - b.sum(1)]
    return (z[tri.simplices[s]] * bary).sum(1).reshape(H, W)

def detail_crumple(H, W, P, rng, amp=1.0):
    """Crumpled foil: piecewise-planar sheets at four scales (planar facets, crisp creases),
    bent a little by a domain warp so creases aren't ruler-straight, plus folds: long V-creases
    that saturate smoothly and fade out at their ends like real folds (d-cones)."""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    wx = 0.5 * P * low_noise(H, W, 4 * P, rng)
    wy = 0.5 * P * low_noise(H, W, 4 * P, rng)
    xy = np.stack([((xx + wx) % W).ravel() + 0.5, ((yy + wy) % H).ravel() + 0.5], 1)
    h = np.zeros((H, W))
    for spacing, zamp in ((6.0 * P, 1.1 * P), (3.0 * P, 0.6 * P), (1.6 * P, 0.32 * P), (0.9 * P, 0.14 * P)):
        h += _pl_sheet(H, W, spacing, zamp, rng, xy)
    nfold = int(H * W / (10 * P) ** 2) + 3
    for _ in range(nfold):
        cx, cy = rng.random() * W, rng.random() * H
        a = rng.random() * math.pi
        ca, sa = math.cos(a), math.sin(a)
        L = (2.5 + 6 * rng.random()) * P
        w = (0.8 + 1.2 * rng.random()) * P
        sgn = rng.choice([-1, 1])
        # summed over the periodic images (a fold isn't radially symmetric, so a minimum-image
        # wrap would leave seams); it fades out across its width too, so the sum stays finite
        for oy in (-1, 0, 1):
            for ox in (-1, 0, 1):
                dxp, dyp = xx - cx - ox * W, yy - cy - oy * H
                d = -dxp * sa + dyp * ca
                t = dxp * ca + dyp * sa
                win = np.exp(-0.5 * (t / L) ** 4) * np.exp(-0.5 * (d / (3.5 * w)) ** 2)
                h += sgn * 0.6 * w * (1 - np.exp(-np.abs(d) / w)) * win
    h += 0.5 * P * low_noise(H, W, 8 * P, rng)
    fine = ndi.gaussian_filter(rng.standard_normal((H, W)), 0.5, mode='wrap')
    return dict(h=amp * (h + 0.012 * P * fine), rough=0.06)

def detail_hammered(H, W, P, rng, amp=1.0):
    """Planished gold: overlapping shallow round dimples (each a spherical cap), crisp rims
    where two blows meet, a soft undulation underneath."""
    xy = _grid_xy(H, W)
    spacing = 1.5 * P
    pts, allp = _jitter_points(H, W, spacing, rng, 1.0)
    R = np.tile(spacing * (0.8 + 0.5 * rng.random(len(pts))), 9)
    depth = np.tile(0.3 + 0.15 * rng.random(len(pts)), 9)
    tree = cKDTree(allp)
    d, idx = tree.query(xy, k=4)
    caps = []
    for j in range(4):
        r = R[idx[:, j]]
        q = d[:, j] / r
        caps.append(-depth[idx[:, j]] * r * (1 - q * q))
    h = np.min(np.stack(caps, 1), 1).reshape(H, W)
    h = ndi.gaussian_filter(h, 0.35, mode='wrap')
    h += 0.35 * P * low_noise(H, W, 9 * P, rng)
    fine = ndi.gaussian_filter(rng.standard_normal((H, W)), 0.5, mode='wrap')
    return dict(h=amp * (h + 0.01 * P * fine), rough=0.04)

def detail_glitter(H, W, P, rng, spread=0.38, amp=1.0):
    """Fine glitter on a flat sheet: Voronoi flakes ~P px, each a mirror with its own random
    tilt (normal stored explicitly; the height only carries a hairline gap between flakes)."""
    xy = _grid_xy(H, W)
    pts, allp = _jitter_points(H, W, P, rng, 1.0)
    tree = cKDTree(allp)
    d, idx = tree.query(xy, k=2)
    cell = (idx[:, 0] % len(pts)).reshape(H, W)
    edge = (d[:, 1] - d[:, 0]).reshape(H, W)
    tilt = rng.standard_normal((len(pts), 2)) * spread
    # a fraction lie nearly flat (big flat flakes read as the sheet), the rest scatter
    tilt *= np.where(rng.random(len(pts)) < 0.25, 0.25, 1.0)[:, None]
    tx, ty = tilt[cell, 0], tilt[cell, 1]
    nrm = np.stack([tx, ty, np.ones_like(tx)], -1)
    nrm /= np.linalg.norm(nrm, axis=-1, keepdims=True)
    flake = (np.arange(len(pts)) * 0.6180339887 % 1.0)[cell]
    gap = smoothstep(0.0, 0.9, edge)                  # 0 at flake borders
    h = amp * (0.06 * P * gap + 0.25 * P * low_noise(H, W, 10 * P, rng))
    return dict(h=h, nrm=nrm, flake=flake, gap=gap, rough=0.03)

def detail_brushleaf(H, W, P, rng, flow_angle=0.0, strokes=None, amp=1.0, breaks=1.0):
    """Gold leaf over impasto brush strokes (a gilded Monet). Each dab is a raised lozenge with
    paint pushed up along its sides and piled at the lift-off end, bristle grooves running along
    it; later dabs lie over earlier ones. The leaf follows all of it, adds its own fine crinkle,
    meets the next sheet in faint straight seams, and cracks/breaks off in the deepest grooves."""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    th = flow_angle + 0.4 * low_noise(H, W, 18 * P, rng)
    body = np.zeros((H, W))
    groove = np.zeros((H, W))
    jitter = low_noise(H, W, 1.5 * P, rng)
    ns = strokes or int(H * W / (4.2 * P * 1.7 * P)) + 3
    for _ in range(ns):
        cx, cy = rng.random() * W, rng.random() * H
        a = float(th[int(cy) % H, int(cx) % W]) + 0.22 * rng.standard_normal()
        L = (2.4 + 2.8 * rng.random()) * P
        Wd = (0.9 + 0.8 * rng.random()) * P
        ca, sa = math.cos(a), math.sin(a)
        R = int(L + Wd * 1.5) + 2
        ix, iy = int(cx), int(cy)
        rows = (iy + np.arange(-R, R + 1)) % H
        cols = (ix + np.arange(-R, R + 1)) % W
        oy, ox = np.mgrid[-R:R + 1, -R:R + 1].astype(np.float64)
        fx_, fy_ = ox - (cx - ix), oy - (cy - iy)
        t = (fx_ * ca + fy_ * sa) / L
        d = (-fx_ * sa + fy_ * ca) / Wd
        d = d - 0.35 * rng.standard_normal() * t * t
        wtaper = 0.5 + 0.5 * smoothstep(-1.0, -0.15, t)            # loaded head, full tail
        dd = d / wtaper
        cov = smoothstep(1.05, 0.8, np.abs(dd)) * smoothstep(1.0, 0.8, np.abs(t))
        prof = 0.5 + 0.5 * smoothstep(0.45, 0.95, np.abs(dd))        # paint pushed to the sides
        prof *= 0.75 + 0.5 * smoothstep(0.3, 0.95, t)                 # piled where the brush lifts
        # the stroke's own bristle grooves, running along it
        nb = 3 + int(4 * rng.random())
        bri = np.sin(dd * nb * math.pi + 6.28 * rng.random() + 1.2 * jitter[np.ix_(rows, cols)])
        lift = 0.85 + 0.3 * rng.random()
        ix_ = np.ix_(rows, cols)
        body[ix_] = body[ix_] * (1 - cov) + cov * prof * lift
        groove[ix_] = groove[ix_] * (1 - cov) + cov * bri
    body = ndi.gaussian_filter(body, 0.18 * P, mode='wrap')
    crink = detail_crinkle(H, W, 0.7 * P, rng, amp=0.3, undulation=0.3)['h']
    # leaf squares ~11P, laid in rows with staggered joints; sized to divide the canvas so a
    # full-canvas texture still tiles
    sqx = W / max(1, round(W / (11.0 * P)))
    sqy = H / max(1, round(H / (11.0 * P)))
    row = np.floor(yy / sqy)
    uo = xx + (row * 0.37 % 1.0) * sqx
    du = np.minimum(uo % sqx, sqx - uo % sqx)
    dv = np.minimum(yy % sqy, sqy - yy % sqy)
    seam = np.exp(-0.5 * (du / 0.5) ** 2) + np.exp(-0.5 * (dv / 0.5) ** 2)
    seam *= 0.4 + 0.6 * smoothstep(-0.5, 0.8, low_noise(H, W, 6 * P, rng))
    h = 1.1 * P * body + 0.07 * P * groove + crink + 0.08 * P * seam
    # breaks: hairline cracks in the deepest bristle grooves, flakes lost where the paint is
    # thinnest (between dabs), and a few torn islands
    tear = band_noise(H, W, 2.5 * P, rng, flow_angle, 2.0)
    thin = 1 - smoothstep(0.1, 0.5, body)
    risk = 0.62 * thin + 0.3 * smoothstep(1.2, 2.2, -groove) + 0.3 * smoothstep(1.6, 2.6, tear)
    risk = risk * breaks + 0.1 * band_noise(H, W, 1.6 * P, rng)
    islands = smoothstep(0.7, 0.76, risk)
    # craquelure: hairline cracks along a noise's zero set, only in patches
    nc = warp(band_noise(H, W, 4.0 * P, rng, flow_angle, 1.3), 0.5 * P * low_noise(H, W, 2 * P, rng), 0.5 * P * low_noise(H, W, 2 * P, rng))
    crack = (1 - smoothstep(0.02, 0.09, np.abs(nc))) * smoothstep(0.4, 1.0, low_noise(H, W, 9 * P, rng)) * breaks
    cover = 1 - np.maximum(islands, 0.85 * crack)
    return dict(h=amp * h, cover=cover, body=body, rough=0.08)

GR_LO, GR_HI = 0.05, 1.2
WORM_DENSITY, WORM_MIX = 1.1, 0.72
MICRO_P, MICRO_A, HP_K = 0.75, 0.09, 0.18
CAMERA_BLUR = 0.6   # px; lens softness of the 'photo' (scale with period for big outputs)
VARIANTS = dict(crinkle=detail_crinkle, crumple=detail_crumple, hammered=detail_hammered,
                glitter=detail_glitter, brushleaf=detail_brushleaf)

# ----------------------------------------------------------------------------------------------
# masks

def star_mask(size, points=5, inner=0.5, round_=0.13, rot=-0.31, wobble=0.025, seed=0, ss=4):
    """Chubby rounded star (no outline), like a die-cut foil stamp: a star polygon whose tips
    are rounded (opening) and inner corners eased (closing). size = box px."""
    from skimage.draw import polygon
    rng = np.random.default_rng(seed)
    S = size * ss
    k = points
    ang = rot - np.pi / 2 + np.arange(2 * k) * np.pi / k
    rad = np.where(np.arange(2 * k) % 2 == 0, 0.95, 0.95 * inner)
    rad = rad * (1 + wobble * rng.standard_normal(2 * k))
    ang = ang + 0.04 * rng.standard_normal(2 * k)
    cx = cy = S / 2
    rr, cc = polygon(cy + rad * np.sin(ang) * S / 2, cx + rad * np.cos(ang) * S / 2, (S, S))
    star = np.zeros((S, S), bool)
    star[rr, cc] = True
    ro = int(round_ * S * 0.5)
    rc = int(round_ * S * 0.22)
    # morphology with a disc, via distance transforms (fast at any radius)
    edt = ndi.distance_transform_edt
    if ro > 0:
        star = edt(~(edt(star) > ro)) <= ro                      # opening: rounds the tips
    if rc > 0:
        pad = np.pad(star, rc)
        star = (edt(edt(~pad) <= rc) > rc)[rc:-rc, rc:-rc]       # closing: eases inner corners
    ys, xs = np.nonzero(star)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    side = max(y1 - y0, x1 - x0)
    cy0, cx0 = (y0 + y1 - side) // 2, (x0 + x1 - side) // 2
    pad = int(side * 0.02)
    star = np.pad(star, side)[cy0 + side - pad:cy0 + 2 * side + pad, cx0 + side - pad:cx0 + 2 * side + pad]
    return np.asarray(Image.fromarray((star * 255).astype(np.uint8)).resize((size, size), Image.LANCZOS)) / 255.0

def stripe_mask(H, W, width_frac=0.42, ragged=0.012, seed=0):
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    e = ragged * W * low_noise(H, 1, 12, rng)[:, 0][:, None]
    e2 = ragged * W * low_noise(H, 1, 12, rng)[:, 0][:, None]
    c = W / 2
    hw = width_frac * W / 2
    m = smoothstep(-0.7, 0.7, (xx + 0.5) - (c - hw + e)) * smoothstep(-0.7, 0.7, (c + hw + e2) - (xx + 0.5))
    return m

def lilypad_mask(size, seed=0):
    rng = np.random.default_rng(seed)
    S = size
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float64)
    x = (xx + 0.5) / S * 2 - 1
    y = ((yy + 0.5) / S * 2 - 1) / 0.62      # seen at a low angle: an ellipse
    r = np.hypot(x, y)
    a = np.arctan2(y, x)
    notch = np.abs(((a - 0.4 + np.pi) % (2 * np.pi)) - np.pi) < 0.22 * (1 - r) + 0.02
    R = 0.92 + 0.03 * np.sin(5 * a + rng.random() * 6)
    m = (r < R) & ~notch
    return ndi.gaussian_filter(m.astype(np.float64), 0.6)

def stroke_mask(H, W, seed=0):
    """A single loaded brushstroke: tapered head and tail, ragged dry-brush edge."""
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    t = (xx + 0.5) / W
    yc = H * (0.5 + 0.08 * np.sin(t * 3.0 + 0.4))
    half = H * 0.38 * np.clip(np.sin(np.pi * np.clip(t * 1.08 - 0.02, 0, 1)) ** 0.45, 0, 1)
    half = half * (1 - 0.35 * smoothstep(0.7, 1.0, t))
    edge = np.abs(yy - yc) - half
    s = max(H, 8) / 40.0
    rag = 0.035 * H * low_noise(H, W, 4 * s, rng) + 0.02 * H * band_noise(H, W, 5 * s, rng, 0.0, 5.0)
    # dry-brush tail: the stroke breaks into bristle streaks only where the paint ran out
    streak = band_noise(H, W, 3 * s, rng, 0.0, 10.0)
    dry = smoothstep(0.82, 1.0, t) * smoothstep(-0.2, 0.9, streak)
    m = smoothstep(0.7, -0.7, edge + rag) * (1 - dry)
    return np.clip(m, 0, 1)

def load_mask(spec, size):
    H, W = size
    if spec == 'star':
        return star_mask(min(H, W))
    if spec == 'stripe':
        return stripe_mask(H, W)
    if spec == 'lilypad':
        return lilypad_mask(min(H, W))
    if spec == 'stroke':
        return stroke_mask(H, W)
    if spec in ('full', 'tile'):
        return np.ones((H, W))
    im = Image.open(spec)
    if im.mode in ('RGBA', 'LA') or 'transparency' in im.info:
        return np.asarray(im.convert('RGBA'))[..., 3].astype(np.float64) / 255.0   # alpha = shape
    return np.asarray(im.convert('L')).astype(np.float64) / 255.0

# ----------------------------------------------------------------------------------------------
# shading

def normals_from_height(h, k=1.0):
    """Normals (view space, +y up) from a relief in px units. Image rows run down."""
    gx = 0.5 * (np.roll(h, -1, 1) - np.roll(h, 1, 1))       # periodic central differences
    gy = 0.5 * (np.roll(h, -1, 0) - np.roll(h, 1, 0))
    n = np.stack([-k * gx, k * gy, np.ones_like(h)], -1)
    return n / np.linalg.norm(n, axis=-1, keepdims=True)

def _soft_box(ax, ay, cx, cy, hx, hy, soft):
    d = np.maximum(np.abs(ax - cx) - hx, np.abs(ay - cy) - hy)
    return 1 - smoothstep(-soft, soft, d)

def studio(r, shift=(0.0, 0.0)):
    """The live studio: softbox up-left, strip light right, bounce card low (angle space)."""
    ax = np.arctan2(r[..., 0], r[..., 2]) - shift[0]
    ay = np.arcsin(np.clip(r[..., 1], -1, 1)) - shift[1]
    e = 0.25 + np.zeros_like(ax)
    kx, ky = (ax + 0.34) / 0.26, (ay - 0.27) / 0.15
    e += 2.4 * _soft_box(ax, ay, -0.34, 0.27, 0.26, 0.15, 0.12) * (1 - 0.45 * (kx * kx + ky * ky))
    e += 1.9 * _soft_box(ax, ay, 0.4, -0.02, 0.045, 0.55, 0.06)
    e += 0.7 * _soft_box(ax, ay, 0.0, -0.5, 0.9, 0.06, 0.18)
    return e

def photo_env(r, rough):
    """The *bake* environment: how a product photographer lights gold leaf - one big soft key
    up-left, a long white card right, warm dim room everywhere else. Returns radiance ~0..1.4.
    Roughness widens every source (a pre-blurred mirror)."""
    ax = np.arctan2(r[..., 0], r[..., 2])
    ay = np.arcsin(np.clip(r[..., 1], -1, 1))
    s = 1 + 6 * rough
    key = np.exp(-0.5 * (((ax + 0.42) / (0.55 * s)) ** 2 + ((ay - 0.38) / (0.42 * s)) ** 2))
    card = np.exp(-0.5 * (((ax - 0.62) / (0.16 * s)) ** 2 + ((ay + 0.05) / (0.9 * s)) ** 2))
    floor_ = smoothstep(0.1, -0.6, ay) * 0.18
    room = 0.30 + 0.12 * np.tanh(2.5 * ay)        # brighter ceiling, darker floor
    return room + 0.95 * key + 0.55 * card + floor_

def bake_print(det, mask, seed=0, key_dir=(-0.55, 0.62, 0.56), slope_gain=1.0, substrate=None):
    """A photo of the foil: geometric normals lit by the photo studio, mapped through the gold
    ramp, with the per-patch warmth shifts, grain and lens softness a camera adds."""
    rng = np.random.default_rng(seed + 991)
    H, W = mask.shape
    h = det.get('h_bake', det['h'])
    n = det['nrm'] if 'nrm' in det else normals_from_height(h, slope_gain)
    if 'nrm' in det:
        # flakes still ride the slow sheet undulation
        n = n + normals_from_height(h, slope_gain) * [1, 1, 0]
        n /= np.linalg.norm(n, axis=-1, keepdims=True)
    V = np.array([0.0, 0.0, 1.0])
    r = 2 * n[..., 2:3] * n - V
    env = photo_env(r, det.get('rough', 0.08))
    L = np.array(key_dir) / np.linalg.norm(key_dir)
    lam = np.clip((n * L).sum(-1), 0, 1)
    # gold is a mirror, but a photo of leaf always has some haze: blend a little Lambert in
    s = 0.62 * env + 0.42 * lam
    # sharp sparkle where a facet points straight at the key (blown, cream)
    Hh = (L + V) / np.linalg.norm(L + V)
    nh = np.clip((n * Hh).sum(-1), 0, 1)
    s += 0.55 * nh ** (60 / (1 + 10 * det.get('rough', 0.08)))
    if 'gap' in det:
        s *= 0.55 + 0.45 * det['gap']
    # normalise to the reference's distribution: median ~0.6, p95 ~0.95 inside the foil
    inside = mask > 0.5
    if inside.sum() > 50:
        med, p95 = np.percentile(s[inside], [50, 95])
    else:
        med, p95 = np.percentile(s, [50, 95])
    s = 0.6 + (s - med) * (0.35 / max(p95 - med, 1e-6))
    # broad soft reflections across the piece (the room, seen in the sheet's slow buckle)
    s = s + 0.07 * low_noise(H, W, max(H, W) / 5, rng) + 0.04 * low_noise(H, W, max(H, W) / 12, rng)
    warmth = low_noise(H, W, max(H, W) / 6, rng) * 0.6 + 0.35 * low_noise(H, W, 7, rng)
    rgb = gold_ramp(np.clip(s, 0, 1.4), warmth)
    # camera: slight lens softness + a little luminance/chroma grain
    rgb = ndi.gaussian_filter(rgb, (CAMERA_BLUR, CAMERA_BLUR, 0), mode='wrap')
    g = rng.standard_normal((H, W, 1)) * 0.012 + rng.standard_normal((H, W, 3)) * 0.006
    rgb = np.clip(rgb + g, 0, 1)
    cover = det.get('cover')
    if cover is not None and substrate is not None:
        sub = substrate if np.ndim(substrate) == 3 else np.broadcast_to(np.asarray(substrate, float), rgb.shape)
        # torn leaf edges catch light: a thin bright lip where the leaf lifts
        lip = np.clip(ndi.gaussian_filter(cover, 0.6) - ndi.gaussian_filter(cover, 1.6), 0, 1)
        rgb = rgb * cover[..., None] + sub * (1 - cover[..., None]) + 0.35 * lip[..., None] * np.array([1, 0.85, 0.5])
    return np.clip(rgb, 0, 1), s

def make_foil(mask, variant='crinkle', period=5.0, seed=0, shoulder=(1, 3), detail_std=0.07,
              substrate=(0.16, 0.42, 0.55), **kw):
    """mask: (H,W) 0..1. period: feature size in output px. Returns a dict with print (RGB),
    alpha, fx (RGB: R foil, G flake id, B height), normal (view space), relief (px), shade."""
    rng = np.random.default_rng(seed)
    H, W = mask.shape
    det = VARIANTS[variant](H, W, float(period), rng, **kw)
    cover = det.get('cover')
    foil = mask * (cover if cover is not None else 1.0)
    # height, in the reference builder's convention. detail = the relief's own high-pass,
    # scaled to the reference's spread (std ~0.07 in a 0..1 height).
    hrel = det['h']
    hp = hrel - ndi.gaussian_filter(hrel, max(1.2, HP_K * period), mode='wrap')
    if 'nrm' in det:
        # glitter: put each flake's tilt into the high-pass so a height-only shader still sees
        # tilted mirrors (piecewise planes, stepping at flake borders)
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
        nx, ny = det['nrm'][..., 0] / det['nrm'][..., 2], det['nrm'][..., 1] / det['nrm'][..., 2]
        flake_plane = -(nx * (xx % period) - ny * (yy % period))
        hp = 0.3 * hp + flake_plane - ndi.median_filter(flake_plane, 3)
    detail = hp / (hp[mask > 0.5].std() if (mask > 0.5).sum() > 20 else hp.std() + 1e-9) * detail_std
    r, passes = shoulder
    k = box_blur(foil, r, passes)
    height = np.clip((0.6 * k + 0.5 * detail * foil) * 0.85 + 0.08, 0, 1)
    sub = np.asarray(substrate, float)
    rgb, shade = bake_print(det, foil, seed, substrate=sub)
    fx = np.zeros((H, W, 3))
    fx[..., 0] = foil
    if 'flake' in det:
        fx[..., 1] = det['flake'] * (mask > 0.5)
    fx[..., 2] = height
    # normals as the live shader will see them (from the 8-bit height, relief 2.6)
    h8 = np.round(height * 255) / 255
    hx = np.roll(h8, -1, 1) - np.roll(h8, 1, 1)
    hy = -(np.roll(h8, -1, 0) - np.roll(h8, 1, 0))   # v up
    nl = np.stack([-2.6 * hx, -2.6 * hy, np.ones_like(h8)], -1)
    nl /= np.linalg.norm(nl, axis=-1, keepdims=True)
    return dict(print=rgb, alpha=mask, fx=fx, normal=nl, relief=hrel, shade=shade, det=det,
                variant=variant, period=period)

# ----------------------------------------------------------------------------------------------
# live-shader port (for previews): the reference card shader's lighting, in linear light

TINT = np.array([1.0, 0.72, 0.30])

def _noise2(q):
    # cheap value-noise stand-in for the shader's crinkle
    return q

def render_lit(f, ground, lamp=None, shift=(0.0, 0.0), eye=900.0, relief=2.6, crinkle=0.3,
               crinkle_scale=None, bloom=True, grain=0.03, seed=0, alpha=None):
    """f: make_foil() dict. ground: (H,W,3) sRGB background (paper / painted water) the foil is
    stamped into. lamp: (x, y, z) px (image coords, z toward viewer) or None. Returns sRGB."""
    rng = np.random.default_rng(seed + 7)
    H, W = f['alpha'].shape
    a = f['alpha'] if alpha is None else alpha
    fx = f['fx']
    foil = fx[..., 0]
    h = fx[..., 2]
    hx = np.roll(h, -1, 1) - np.roll(h, 1, 1)
    hy = -(np.roll(h, -1, 0) - np.roll(h, 1, 0))
    if crinkle_scale is None:
        crinkle_scale = 2.0 * f['period']
    cr = np.stack([low_noise(H, W, crinkle_scale, rng), low_noise(H, W, crinkle_scale, rng)], -1) * 0.29
    bx = hx * relief + cr[..., 0] * crinkle * foil
    by = hy * relief + cr[..., 1] * crinkle * foil
    N = np.stack([-bx, -by, np.ones_like(h)], -1)
    if 'nrm' in f['det']:
        # glitter shader path: each flake's own tilt (from its id hash in fx.G) on top
        fn = f['det']['nrm']
        N = N + np.stack([fn[..., 0] / fn[..., 2], fn[..., 1] / fn[..., 2], np.zeros_like(h)], -1) * foil[..., None]
    N /= np.linalg.norm(N, axis=-1, keepdims=True)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    P = np.stack([xx - W / 2, -(yy - H / 2), np.zeros_like(xx)], -1)
    E = np.array([0.0, 0.0, eye])
    V = E - P
    V /= np.linalg.norm(V, axis=-1, keepdims=True)
    NdV = (N * V).sum(-1, keepdims=True)
    R = 2 * NdV * N - V
    caught = smoothstep(0.35, 2.4, studio(R, shift))
    Lk = np.array([-0.45 + shift[0], 0.55 + shift[1], 0.7]); Lk /= np.linalg.norm(Lk)
    ndl = np.clip((N * Lk).sum(-1), 0, 1)
    if lamp is not None:
        Lp = np.array([lamp[0] - W / 2, -(lamp[1] - H / 2), lamp[2]]) - P
        Lp /= np.linalg.norm(Lp, axis=-1, keepdims=True)
        Hv = Lp + V
        Hv /= np.linalg.norm(Hv, axis=-1, keepdims=True)
        nh = np.clip((N * Hv).sum(-1), 0, 1)
        hot, glow = nh ** 220, nh ** 28
        on = 1.0
    else:
        hot = glow = np.zeros_like(h)
        on = 0.0
    base = srgb_to_lin(f['print'])
    paper = srgb_to_lin(ground)
    paper_lit = paper * (0.8 + 0.26 * ndl)[..., None] + (glow * 0.03 * on)[..., None]
    metal = base * (0.42 + 0.58 * caught + glow * 0.95)[..., None] + TINT * (0.6 * caught ** 3 + hot * 2.4)[..., None]
    # foil pixels only where stamped; outside the mask the ground shows (and is a touch pressed
    # down at the edge: the emboss's own shoulder, lit by the same key)
    col = paper_lit * (1 - foil[..., None]) + metal * foil[..., None]
    col = col * a[..., None] + paper_lit * (1 - a[..., None])
    if bloom:
        over = np.clip(col.max(-1) - 1.3, 0, None)[..., None] * col / np.maximum(col.max(-1, keepdims=True), 1e-6)
        b = sum(ndi.gaussian_filter(over, (s, s, 0)) for s in (2, 6, 14)) / 3
        col = col + 0.2 * 3 * b
    out = lin_to_srgb(col)
    out = out + grain * (rng.random((H, W, 1)) - 0.5) * (0.5 + 0.5 * out.mean(-1, keepdims=True))
    return np.clip(out, 0, 1)

# ----------------------------------------------------------------------------------------------
# io

def save_outputs(f, out, webp=False):
    d = os.path.dirname(out)
    if d:
        os.makedirs(d, exist_ok=True)
    rgba = np.concatenate([f['print'], f['alpha'][..., None]], -1)
    Image.fromarray((rgba * 255 + 0.5).astype(np.uint8)).save(out + '_print.png')
    Image.fromarray((f['fx'] * 255 + 0.5).astype(np.uint8)).save(out + '_fx.png')
    nn = (f['normal'] * 0.5 + 0.5)
    Image.fromarray((nn * 255 + 0.5).astype(np.uint8)).save(out + '_normal.png')
    rel = f['relief']
    r16 = ((rel - rel.min()) / (np.ptp(rel) + 1e-9) * 65535).astype(np.uint16)
    Image.fromarray(r16).save(out + '_height16.png')
    if webp:
        # print: lossy is fine. fx/height: LOSSLESS - lossy webp chroma-subsamples the B channel and
        # throws away ~50% of the slope detail (the sparkle) even at q90.
        Image.fromarray((rgba * 255 + 0.5).astype(np.uint8)).save(out + '_print.webp', quality=85, method=6)
        Image.fromarray((f['fx'] * 255 + 0.5).astype(np.uint8)).save(out + '_fx.webp', lossless=True, method=6)
        Image.fromarray((f['fx'][..., 2] * 255 + 0.5).astype(np.uint8)).save(out + '_height.webp', lossless=True, method=6)

def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--variant', default='crinkle', choices=sorted(VARIANTS))
    ap.add_argument('--mask', default='star', help='star | stripe | lilypad | stroke | full | path.png')
    ap.add_argument('--size', default='300', help='N or WxH (ignored for a mask image)')
    ap.add_argument('--tile', type=int, default=0, help='make an NxN tileable detail texture (mask=full)')
    ap.add_argument('--period', type=float, default=None, help='feature size px (default size/28)')
    ap.add_argument('--seed', type=int, default=0)
    ap.add_argument('--out', required=True)
    ap.add_argument('--webp', action='store_true')
    a = ap.parse_args(argv)
    if a.tile:
        H = W = a.tile
        mask = np.ones((H, W))
    else:
        if 'x' in a.size:
            W, H = map(int, a.size.split('x'))
        else:
            W = H = int(a.size)
        mask = load_mask(a.mask, (H, W))
        H, W = mask.shape
    P = a.period or max(3.0, min(H, W) / 28)
    f = make_foil(mask, a.variant, P, a.seed)
    save_outputs(f, a.out, a.webp)
    print(f'{a.out}: {W}x{H} variant={a.variant} period={P:.2f}px')

if __name__ == '__main__':
    main()
