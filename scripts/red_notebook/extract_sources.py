"""Pull the exact source art the red-notebook stickers are built from.

Nothing here is drawn by hand. The HBO Max lockup, the four agent icons and the
Beat Bobby Flay key art all already exist inside project files at high
resolution; this step keys them out of their backgrounds so they can be restyled
as vinyl stickers. Run once — output lands in scripts/red_notebook/src/.

  .font-venv/bin/python scripts/red_notebook/extract_sources.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent / "src"
OUT.mkdir(parents=True, exist_ok=True)


def luma_key(img, black, white):
    """Alpha matte from a light subject on a dark ground.

    `black` and `white` are luminance stops: at or below `black` is fully
    transparent, at or above `white` fully opaque. Picking them from measured
    extremes (background p99 vs subject minimum) keeps edges crisp without
    eroding the parts of a metallic gradient that fall towards mid grey.
    """
    lum = np.asarray(img.convert("RGB")).astype(float).mean(axis=2)
    return np.clip((lum - black) / (white - black), 0, 1)


def trim(alpha, thresh=0.03):
    ys, xs = np.nonzero(alpha > thresh)
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def save_matte(alpha, path):
    """A matte is stored as white pixels carrying the alpha, so it can be
    recoloured freely later."""
    h, w = alpha.shape
    rgba = np.zeros((h, w, 4), np.uint8)
    rgba[..., :3] = 255
    rgba[..., 3] = (alpha * 255).astype(np.uint8)
    Image.fromarray(rgba).save(path)


# ---------------------------------------------------------------- HBO Max mark
# The official lockup, off the brand still. Interior measures >=194 luminance
# everywhere, background <=37, so the 60..170 ramp is comfortably clear of both.
logo = Image.open(ROOT / "public/projects/HBO Max Logo.png")
a = luma_key(logo, 60, 170)
x0, y0, x1, y1 = trim(a)
save_matte(a[y0:y1, x0:x1], OUT / "hbomax-mark.png")
print("hbomax-mark", (x1 - x0, y1 - y0))

# ------------------------------------------------------------- agent-deck icons
# Straight off the slide the case study is built from, so the sticker carries the
# deck's own icons rather than lookalikes.
SLIDE = Image.open(ROOT / "public/case-study-hbo-max2/agent-breakdown.png")
# The slide ground is a radial gradient: near-black at the edges but up to 44
# behind the two middle icons, so the black point has to clear 44, not 15, or
# the write and edit icons drag a grey panel along with them.
slide_a = luma_key(SLIDE, 55, 150)
ICONS = {
    "icon-analyze": (633, 1331, 1014, 1660),
    "icon-write": (1931, 1354, 2386, 1695),
    "icon-edit": (3226, 1390, 3527, 1696),
    "icon-curate": (4355, 1285, 4748, 1687),
    "arrow": (1361, 1439, 1568, 1524),
}
for name, (bx0, by0, bx1, by1) in ICONS.items():
    sub = slide_a[by0:by1, bx0:bx1]
    tx0, ty0, tx1, ty1 = trim(sub)
    save_matte(sub[ty0:ty1, tx0:tx1], OUT / f"{name}.png")
    print(name, (tx1 - tx0, ty1 - ty0))

# ------------------------------------------------------- Beat Bobby Flay key art
# 16:9 still, lifted at full resolution from the results slide. Edges found by
# the luminance step against the slide ground; 1349x759 is 16:9 to the pixel,
# which is the check that the crop is the whole still and not part of it.
res = Image.open(ROOT / "public/case-study-hbo-max2/final-result1.png").convert("RGB")
res.crop((3016, 479, 4365, 1238)).save(OUT / "keyart-bobbyflay.png")
print("keyart-bobbyflay", (4365 - 3016, 1238 - 479))
