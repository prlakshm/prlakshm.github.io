"""Generate torn-paper note backgrounds for the journal spill overlay.

Each output is a full RGBA sheet: warm paper stock with grain, ripped on all
four edges. The tear is a fractal-noise boundary, not a polygon — the point is
that no two edges repeat and the fringe reads as fibre rather than as a saw
tooth. The lighter band just inside the rip is the paper core showing through
where the top ply pulled away; that band is what actually makes a tear read as
a tear and not as a cut.

Consumed by home.css as a background-image on .jr-spill-note. Run:
    python3 scripts/torn_paper/generate.py
"""

import os

import numpy as np
from PIL import Image, ImageFilter

W, H = 860, 602           # ~2x the largest on-screen size, no more
PAPER = (246, 240, 221)   # --paper #f6f0dd
CORE = (252, 249, 238)    # exposed fibre, a shade lighter than the face
ESPRESSO = (61, 42, 31)   # --espresso, for grain


def fbm(n, seed, octaves=5, freq=3):
    """1-D fractal value noise in [0,1], smoothstep-interpolated."""
    rng = np.random.default_rng(seed)
    total = np.zeros(n)
    amp, norm = 1.0, 0.0
    for _ in range(octaves):
        pts = rng.random(freq + 1)
        x = np.linspace(0, freq, n, endpoint=False)
        i = np.floor(x).astype(int)
        f = x - i
        t = f * f * (3 - 2 * f)
        total += (pts[i] * (1 - t) + pts[i + 1] * t) * amp
        norm += amp
        amp *= 0.5
        freq *= 2
    return total / norm


def edge_profile(n, seed, depth, base):
    """Distance the rip eats into the sheet, per pixel along one edge."""
    coarse = fbm(n, seed, octaves=3, freq=2)
    fine = fbm(n, seed + 977, octaves=6, freq=9)
    # Coarse carries the big lobes of the tear, fine roughens it. The bias
    # keeps the rip from ever reaching 0 so no edge sits perfectly straight.
    return base + depth * (0.62 * coarse + 0.38 * fine)


def build(seed, path):
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:H, 0:W]

    # Four independent rips, each eating ~10% of the sheet. The amplitude has
    # to be this aggressive: the note renders at roughly a third of this size,
    # so a tear that looks right at 1000px reads as a straight edge on screen.
    top = edge_profile(W, seed + 1, depth=64, base=14)
    bot = edge_profile(W, seed + 2, depth=64, base=14)
    left = edge_profile(H, seed + 3, depth=50, base=12)
    right = edge_profile(H, seed + 4, depth=50, base=12)

    # Signed distance to each rip, positive inside the sheet.
    d_top = yy - top[np.newaxis, :]
    d_bot = (H - 1 - yy) - bot[np.newaxis, :]
    d_left = xx - left[:, np.newaxis]
    d_right = (W - 1 - xx) - right[:, np.newaxis]
    dist = np.minimum(np.minimum(d_top, d_bot), np.minimum(d_left, d_right))

    # Fibre fringe: alpha ramps over the last few px instead of stopping dead,
    # and a speckle mask pulls individual fibres past the boundary.
    FRINGE = 6.0
    alpha = np.clip(dist / FRINGE, 0.0, 1.0)
    speckle = rng.random((H, W))
    fibre = (dist > -5.0) & (dist < FRINGE) & (speckle > 0.5)
    alpha[fibre] = np.maximum(alpha[fibre], speckle[fibre] * 0.9)
    alpha = np.clip(alpha, 0, 1)

    # Paper face with grain.
    # Kept light on purpose: heavy grain is invisible at render size and
    # triples the PNG weight, since noise is what PNG cannot compress.
    grain = rng.normal(0, 1.5, (H, W))
    grain += rng.normal(0, 0.5, (H, W)) * 2.0
    rgb = np.zeros((H, W, 3))
    for c in range(3):
        rgb[..., c] = PAPER[c] + grain

    # The core band: brighten just inside the rip, falling off over ~26px.
    core_band = np.clip(1.0 - dist / 26.0, 0.0, 1.0) ** 1.5
    for c in range(3):
        rgb[..., c] = rgb[..., c] * (1 - core_band) + CORE[c] * core_band

    # A whisper of the espresso tint pooling in the deepest lobes of the tear,
    # so the rip has some depth to it rather than reading as a flat cut.
    pool = np.clip(1.0 - dist / 5.0, 0.0, 1.0) ** 3 * 0.10
    for c in range(3):
        rgb[..., c] = rgb[..., c] * (1 - pool) + ESPRESSO[c] * pool

    img = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB")
    img = img.filter(ImageFilter.GaussianBlur(0.4))          # soften the grain
    a = Image.fromarray((alpha * 255).astype(np.uint8), "L")
    a = a.filter(ImageFilter.GaussianBlur(0.5))              # anti-alias the rip
    img.putalpha(a)
    # WebP, not PNG. These sheets are almost entirely grain and a noisy alpha
    # fringe, which is exactly what PNG cannot compress — the same image is
    # 333KB as PNG and 38KB here, with no visible difference in the tear.
    img.save(path, quality=88, method=6)
    print(f"{path}  {img.size[0]}x{img.size[1]}  {os.path.getsize(path) // 1024}KB")


if __name__ == "__main__":
    out = "public/home/journals/notes"
    os.makedirs(out, exist_ok=True)
    for i, seed in enumerate((7, 4201, 88123), start=1):
        build(seed, f"{out}/torn-{i}.webp")
