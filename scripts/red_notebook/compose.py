"""Lay the sticker set onto the red notebook, closed and open.

The stickers are arranged once, on a flat rectangle the size of the closed front
cover, and that whole layer is then perspective-warped onto each frame's measured
cover quad. Positioning a sticker therefore means editing one number in LAYOUT —
not re-solving it for the open notebook, where the cover is keystoned.

  .font-venv/bin/python scripts/red_notebook/compose.py

Writes public/home/journals/red-{closed,open}.png and the individual sticker
assets to public/home/journals/stickers/.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
import stickers as St  # noqa: E402
from stickers import COVER_H, COVER_W, SS  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
JOURNALS = ROOT / "public/home/journals"
ASSETS = JOURNALS / "stickers"
BASE = Path(__file__).resolve().parent / "base"

# Cover quads, measured off the source renders by tracing the red mask's edges.
# Order: top-left, top-right, bottom-right, bottom-left.
# The open frame is keystoned — its right edge is nearer the camera, so it is
# both taller and further from the top of the image than its left edge.
QUADS = {
    "red-closed": [(102, 97), (453, 97), (453, 603), (102, 603)],
    "red-open": [(117, 115), (428, 84), (428, 588), (117, 570)],
}

# Sticker placement, in cover points. `w` is the artwork width before the
# keyline and die-cut are added, so it stays stable if those change; `x`/`y` are
# the centre of the finished sticker.
LAYOUT = [
    ("hbomax",   dict(x=64,  y=64,  w=92,  rot=-4.0)),
    ("chars",    dict(x=274, y=58,  w=100, rot=6.5)),
    ("reasons",  dict(x=126, y=172, w=180, rot=-5.0)),
    ("agents",   dict(x=176, y=284, w=300, rot=-1.6)),
    ("bobby",    dict(x=176, y=414, w=300, rot=2.4)),
]


def build():
    """Every sticker, as unrotated RGBA float arrays in cover space."""
    out = {}
    out["hbomax"] = St.hbomax_sticker(92)
    out["chars"] = St.word_sticker(["135 chars"], cap_pt=15.5, tracking=-0.15)
    out["reasons"] = St.word_sticker(["Reasons", "to Watch"], cap_pt=21.0, leading=0.98)
    out["agents"] = St.agent_strip(300, 84)
    out["bobby"] = St.bobby_card(300, 76)
    return out


def to_image(arr):
    return Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8), "RGBA")


def cover_layer(parts):
    """Arrange the stickers on the flat cover, at SSx."""
    layer = Image.new("RGBA", (COVER_W * SS, COVER_H * SS), (0, 0, 0, 0))
    for name, p in LAYOUT:
        im = to_image(parts[name])
        # `w` measures the artwork; the die-cut padding rides along with it.
        scale = (p["w"] * SS) / _art_width(parts[name])
        im = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.LANCZOS)
        im = im.rotate(p["rot"], resample=Image.BICUBIC, expand=True)
        layer.alpha_composite(im, (int(p["x"] * SS - im.width / 2), int(p["y"] * SS - im.height / 2)))
    return layer


def _art_width(arr):
    """Width of the printed face, ignoring the shadow's reach — measured off the
    opaque core so `w` in LAYOUT means the sticker you actually see."""
    a = arr[..., 3]
    cols = np.nonzero((a > 0.85).any(axis=0))[0]
    return float(cols[-1] - cols[0] + 1)


def find_coeffs(dst, src):
    """PIL's PERSPECTIVE transform samples source for each destination pixel, so
    solve for the destination -> source map."""
    m = []
    for (dx, dy), (sx, sy) in zip(dst, src):
        m.append([dx, dy, 1, 0, 0, 0, -sx * dx, -sx * dy])
        m.append([0, 0, 0, dx, dy, 1, -sy * dx, -sy * dy])
    A = np.array(m, float)
    b = np.array(src, float).reshape(8)
    return np.linalg.solve(A, b)


def shading(nb, quad):
    """A soft map of how the leather is lit, normalised around its own mean.

    Multiplying the sticker layer by this is what stops a sticker looking pasted
    on: on the open frame the cover falls into shadow towards the spine, and the
    sticker has to fall with it.
    """
    a = np.asarray(nb).astype(float)
    lum = a[..., :3].mean(axis=2)
    inside = (a[..., 3] > 200) & (lum > 40)
    if inside.sum() < 500:
        return np.ones(lum.shape)
    ref = np.median(lum[inside])
    soft = np.asarray(
        Image.fromarray(np.clip(lum, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(16))
    ).astype(float)
    m = np.clip(soft / max(ref, 1.0), 0.62, 1.16)
    return 1.0 + (m - 1.0) * 0.85  # ease it off slightly; vinyl is flatter than leather


def place(name, layer):
    nb = Image.open(BASE / f"{name}.png").convert("RGBA")
    W, H = nb.size
    quad = QUADS[name]

    big = (W * SS, H * SS)
    dst = [(x * SS, y * SS) for x, y in quad]
    src = [(0, 0), (COVER_W * SS, 0), (COVER_W * SS, COVER_H * SS), (0, COVER_H * SS)]
    coeffs = find_coeffs(dst, src)
    warped = layer.transform(big, Image.PERSPECTIVE, coeffs, resample=Image.BICUBIC)
    warped = warped.resize((W, H), Image.LANCZOS)

    sl = np.asarray(warped).astype(float) / 255.0
    sl[..., :3] *= shading(nb, quad)[..., None]

    base = np.asarray(nb).astype(float) / 255.0
    a = sl[..., 3:4]
    rgb = sl[..., :3] * a + base[..., :3] * (1 - a)
    # Stickers stay inside the notebook's own silhouette, and the base alpha is
    # passed through untouched: the cut-out shape is what journals.ts measures
    # its trim percentages from, so it has to survive this bit for bit.
    rgb = np.where(base[..., 3:4] > 0.02, rgb, base[..., :3])
    out = np.concatenate([rgb, base[..., 3:4]], axis=2)
    return Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8), "RGBA")


def main():
    if not BASE.exists():
        raise SystemExit(
            f"missing {BASE} — copy the clean red-closed.png / red-open.png there first "
            "so re-running never composites onto an already-stickered cover"
        )
    parts = build()

    ASSETS.mkdir(parents=True, exist_ok=True)
    for name, arr in parts.items():
        im = to_image(arr)
        im.save(ASSETS / f"{name}.png")
        print(f"sticker {name:8s} {im.size}")

    layer = cover_layer(parts)
    for name in QUADS:
        place(name, layer).save(JOURNALS / f"{name}.png")
        print(f"wrote  {name}.png")


if __name__ == "__main__":
    main()
