#!/usr/bin/env python3
"""
Favicon from the red notebook render.

Trims to the artwork, tilts it counter-clockwise, pads square, and writes the
sizes a browser actually asks for.

Two things that matter at 16px and are easy to get wrong:

  - the tilt has to happen BEFORE the square pad, or the rotation clips its own
    corners against the old bounding box;
  - the pad is measured from the rotated artwork, not the original, so the book
    stays centred instead of drifting toward whichever corner the rotation grew.

The source is a transparent PNG, so there is nothing to key out — but it is
resampled with LANCZOS and composited on nothing, which leaves the alpha edge
soft rather than the hard fringe a naive downscale gives.
"""

import os
from PIL import Image

SRC = os.path.expanduser("~/Downloads/Red leather notebook open@2x.png")
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "public", "icons")
OUT = os.path.abspath(OUT)

TILT = 6.0        # degrees counter-clockwise. Enough to read as deliberate at
                  # 16px; past ~8 the spine stops looking upright and it reads
                  # as a mistake rather than as pizzazz.
PAD = 0.06        # breathing room around the artwork, as a fraction of the
                  # square, so the corners are not flush against the tab edge.

# Named for what they are. The punch-p-* and punch-holes-* files in this
# directory are different marks and must not be overwritten — punch-holes-
# favicon-inverted.png in particular is the visible logo in Header.tsx.
SIZES = {"notebook-favicon-16.png": 16,
         "notebook-favicon-32.png": 32,
         "notebook-favicon-192.png": 192,
         "notebook-apple-touch-icon.png": 180}


def main():
    im = Image.open(SRC).convert("RGBA")
    im = im.crop(im.getbbox())                       # trim to the artwork
    im = im.rotate(TILT, resample=Image.BICUBIC, expand=True)
    im = im.crop(im.getbbox())                       # re-trim after the tilt

    side = int(round(max(im.size) * (1 + PAD * 2)))
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(im, ((side - im.width) // 2, (side - im.height) // 2), im)

    os.makedirs(OUT, exist_ok=True)
    master = os.path.join(OUT, "notebook-favicon-master.png")
    square.save(master)
    print(f"  master {square.size[0]}x{square.size[1]}  tilt {TILT}deg CCW")

    for name, px in SIZES.items():
        square.resize((px, px), Image.LANCZOS).save(os.path.join(OUT, name))
        print(f"  {name:34} {px}x{px}")

    # .ico carries the small sizes for browsers that still ask for one
    ico = os.path.join(os.path.dirname(OUT), "favicon.ico")   # site root
    square.resize((64, 64), Image.LANCZOS).save(
        ico, sizes=[(16, 16), (32, 32), (48, 48)])
    print(f"  favicon.ico                        16/32/48")


if __name__ == "__main__":
    main()
