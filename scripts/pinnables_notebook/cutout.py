"""Cut the Pinnables notebook renders out of their black backdrop.

The source frames arrive as opaque RGB on pure black. A luminance key would be
the obvious move and the wrong one: the cover's "pinnables" sticker is drawn in
black outline and the stitching is near-black, so keying by brightness punches
holes straight through the artwork. Instead this floods the background inward
from the border, so only black that is CONNECTED to the edge is removed and
anything black enclosed by the book survives.

Run:
    python3 scripts/pinnables_notebook/cutout.py
"""

import os
from collections import deque

import numpy as np
from PIL import Image, ImageFilter

SRC = os.path.expanduser("~/Downloads")
OUT = "public/home/journals"
FRAMES = [
    # (source file, output name) — the flatter, tucked frame is the closed
    # cover; the one with the papers fanned out is the open one.
    # The closed source is an export that already carries its own alpha, and it
    # beats anything keyed here: the bottom lip of the leather is a deep
    # shadowed red, and no threshold separates that from a black backdrop as
    # cleanly as the tool that rendered it.
    ("Red notebook stickers.png", "pinnables-closed.webp"),
    # The open frame is the transparent sibling export saved alongside the
    # closed one (absolute path — it lives with the other notebook sources,
    # not in Downloads). It replaced "Generated image 1.png", whose book was
    # rotated ~2.1 deg counter-clockwise IN PLANE (spine and bottom edge
    # agreed), which read as the notebook leaning left every time it opened.
    # This export's bottom edge is level (-0.05 deg) and its spine matches the
    # closed frame's natural 3/4 perspective, so the pair reads straight.
    (
        os.path.expanduser("~/Documents/Portfolio/Notebooks/Red open.png"),
        "pinnables-open.webp",
    ),
]

# Anything at or below this luminance counts as backdrop, but only if the flood
# can reach it from outside.
# Keep this LOW. The backdrop is a true black — it never exceeds 1.3 anywhere
# along the border — while the leather's bottom lip is a deep shadowed red that
# sits in the teens. At 34 the flood walked straight through that lip and ate
# the bottom edge and its stitching clean off the book.
BACKDROP = 10


def background_mask(lum):
    """Flood inward from every border pixel that is backdrop-dark."""
    H, W = lum.shape
    dark = lum <= BACKDROP
    seen = np.zeros((H, W), dtype=bool)
    q = deque()

    for x in range(W):
        for y in (0, H - 1):
            if dark[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if dark[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))

    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and dark[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))
    return seen


def alpha_box(im):
    a = im.getchannel("A").point(lambda v: 255 if v > 8 else 0)
    return a.getbbox()


def lift(im):
    """Rendered book height as a multiple of the journal's width.

    The cover is laid out with `width: 100%`, so this — the artwork's alpha
    height divided by its FRAME width — is exactly how tall the book comes out
    on screen. Matching it between the closed and open frames is what stops the
    notebook changing size when the two cross-fade on hover.
    """
    bb = alpha_box(im)
    return (bb[3] - bb[1]) / im.size[0]


def reframe(im, target_lift, target_centre):
    """Re-frame so the book renders at `target_lift` and sits at `target_centre`.

    Two things this fixes, both of which only show up on hover when the open
    cover cross-fades in over the closed one:

      · size — the open render came back with the book smaller inside its frame
        than the closed one, 425px against 455, so the notebook shrank.
      · position — centring the book in its own frame is NOT the same as
        matching the closed frame, whose book sits right of centre at 0.547.
        Centred, the open book landed 21px left of the closed one and the
        notebook slid sideways as it opened.

    Nothing is resampled: only the CANVAS changes, and both the rendered height
    and the horizontal placement are ratios against the frame width.
    """
    bb = alpha_box(im)
    want_w = (bb[3] - bb[1]) / target_lift
    cx = (bb[0] + bb[2]) / 2
    left = round(cx - target_centre * want_w)
    out = Image.new("RGBA", (round(want_w), im.size[1]), (0, 0, 0, 0))
    out.paste(im, (-left, 0))
    return out


def has_alpha(im):
    return im.mode == "RGBA" and im.getchannel("A").getextrema()[0] < 255


def build(src_name, out_name, target_lift=None, target_centre=None, rotate=0.0):
    src = Image.open(os.path.join(SRC, src_name))

    if has_alpha(src):
        # Already cut out — leave it alone. Re-keying a clean alpha can only
        # lose edge detail.
        im = src.convert("RGBA")
        keyed = False
    else:
        im = src.convert("RGB")
        lum = np.asarray(im).astype(np.uint8).mean(axis=2)
        bg = background_mask(lum)
        alpha = np.where(bg, 0, 255).astype(np.uint8)

        a = Image.fromarray(alpha, "L")
        # Only a soft edge, no erosion. A MinFilter here shaves a pixel off
        # every boundary, and with the threshold this low the boundary IS the
        # artwork's darkest real edge — there is nothing spare to give away.
        a = a.filter(ImageFilter.GaussianBlur(0.5))
        im = im.convert("RGBA")
        im.putalpha(a)
        keyed = True
    if rotate:
        # One bicubic pass, before the reframe so the canvas is sized around the
        # rotated book. These frames are 2x what they render at, so a single
        # resample here is well under a screen pixel.
        im = im.rotate(rotate, resample=Image.BICUBIC, expand=True)
    if target_lift is not None:
        im = reframe(im, target_lift, target_centre)

    path = os.path.join(OUT, out_name)
    # WebP: these frames arrive at twice the resolution of the other covers and
    # this keeps all of it for a third of the weight.
    im.save(path, quality=90, method=6)

    bb = alpha_box(im)
    w, h = im.size
    centre = (bb[0] + bb[2]) / 2 / w
    print(
        f"{out_name:24} {'keyed ' if keyed else 'alpha '}{w}x{h}  "
        f"x0={bb[0]/w:.4f} x1={bb[2]/w:.4f} y0={bb[1]/h:.4f} y1={bb[3]/h:.4f}  "
        f"trim={(h-bb[3])/h*100:.2f}%  lift={(h/w)*(1-bb[1]/h-(h-bb[3])/h):.3f}  "
        f"{os.path.getsize(path)//1024}KB"
    )
    return lift(im), centre


# How much larger the open book reads than the closed one.
# 1.0 renders the open cover at exactly the closed one's size. 1.085 (open
# cover area 1.12x, matching Surprise Rail's photographed growth) and 1.0425
# both read as the book swelling next to its neighbours; this is the tiny lift
# in scale that survived, small enough to feel like the cover coming toward you
# rather than a resize.
OPEN_GROWTH = 1.01

# Counter-clockwise degrees applied to the OPEN frame only, to square its pose
# with the closed frame's.
#
# The two renders were shot at slightly different camera angles. Fitting a line
# to each edge, the open book sits -0.98 deg off the closed one measured at the
# spine but +1.57 off measured at the bottom. Those disagree, and the gap is
# what the eye reads as perspective: through the cross-fade the baseline and
# the spine swing by DIFFERENT amounts, so the cover looks sheared rather than
# tilted.
#
# No rotation can remove that gap — it is a perspective difference, and a rigid
# rotation shifts both readings together, so the 0.59 deg between them survives
# whatever R is. What R chooses is how the error is SPLIT. 1.58 pinned the
# baseline exactly and dumped all 0.59 onto the spine, which is what read as
# the cover twisting. 1.275 is the midpoint of -0.98 and +1.57, so each edge is
# off by 0.295 and neither one visibly leads. Fixing it properly means
# re-rendering the open frame at the closed frame's camera angle.
OPEN_ROTATE = 1.275

if __name__ == "__main__":
    (cs, co), (os_, oo) = FRAMES
    closed_lift, closed_centre = build(cs, co)
    build(
        os_,
        oo,
        target_lift=closed_lift * OPEN_GROWTH,
        target_centre=closed_centre,
        rotate=OPEN_ROTATE,
    )
