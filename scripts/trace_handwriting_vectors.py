#!/usr/bin/env python3
"""Trace word PNGs → true SVG paths, straighten layout, color title/body.

Run after scripts/vectorize_handwriting.py (needs public/about/handwriting/words/).
Uses the project .font-venv (potrace + numpy + Pillow).
"""

from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

import numpy as np
import potrace
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
HW = ROOT / "public/about/handwriting"
WORDS = HW / "words"
OUT_SVG = HW / "manifesto-vector.svg"
OUT_PREVIEW = HW / "manifesto-vector-preview.png"

# Secondary tan (--mono-secondary) for all handwriting
INK_FILL = "#704214"
TITLE_FILL = INK_FILL
BODY_FILL = INK_FILL
# Shared stroke half-width in word-PNG pixels (after 2× source upsample).
TARGET_STROKE_R = 3.6


def even_stroke(ink: np.ndarray, target_r: float = TARGET_STROKE_R) -> np.ndarray:
    """Force uniform marker weight: close pencil gaps → medial axis → dilate.

    Thin pencil words thicken more; already-heavy strokes are rebuilt to the
    same width so the whole manifesto reads even.
    """
    from scipy.ndimage import (
        binary_closing,
        binary_dilation,
        binary_erosion,
        distance_transform_edt,
        maximum_filter,
    )

    if ink.sum() < 8:
        return ink

    # Pencil texture leaves white flecks — close them so the axis is continuous
    ink = binary_closing(ink, structure=np.ones((3, 3)), iterations=2)

    dist = distance_transform_edt(ink)
    ridge = (dist >= maximum_filter(dist, size=7) - 0.35) & (dist >= 0.5) & ink
    if ridge.sum() < 4:
        ridge = ink.copy()
        for _ in range(2):
            nxt = binary_erosion(ridge, iterations=1)
            if nxt.sum() < 4:
                break
            ridge = nxt

    # Bridge tiny breaks in the ridge before fattening
    ridge = binary_dilation(ridge, iterations=1)

    r = max(1, int(np.ceil(target_r)))
    yy, xx = np.ogrid[-r : r + 1, -r : r + 1]
    disk = xx * xx + yy * yy <= target_r * target_r
    return binary_dilation(ridge, structure=disk).astype(bool)


def word_to_path_d(png: Path) -> tuple[str, int, int]:
    im = Image.open(png).convert("RGBA")
    arr = np.array(im)
    ink = arr[:, :, 3] > 128
    ink = even_stroke(ink)

    # Tight crop after thickening (stroke can grow past old bbox)
    ys, xs = np.where(ink)
    if len(xs) == 0:
        return "", im.width, im.height
    pad = 2
    x0 = max(0, int(xs.min()) - pad)
    y0 = max(0, int(ys.min()) - pad)
    x1 = min(ink.shape[1], int(xs.max()) + pad + 1)
    y1 = min(ink.shape[0], int(ys.max()) + pad + 1)
    crop = ink[y0:y1, x0:x1]

    # potracer treats False/0 as black (ink to outline). Our mask is True=ink,
    # so invert before tracing — otherwise you get filled boxes with letter holes.
    bmp = potrace.Bitmap(np.logical_not(crop))
    path = bmp.trace(turdsize=2, opttolerance=0.2)
    parts: list[str] = []
    for curve in path:
        parts.append(f"M {curve.start_point.x:.2f},{curve.start_point.y:.2f}")
        for seg in curve.segments:
            if seg.is_corner:
                parts.append(
                    f"L {seg.c.x:.2f},{seg.c.y:.2f} L {seg.end_point.x:.2f},{seg.end_point.y:.2f}"
                )
            else:
                parts.append(
                    f"C {seg.c1.x:.2f},{seg.c1.y:.2f} "
                    f"{seg.c2.x:.2f},{seg.c2.y:.2f} "
                    f"{seg.end_point.x:.2f},{seg.end_point.y:.2f}"
                )
        parts.append("Z")
    return " ".join(parts), crop.shape[1], crop.shape[0]


def parse_name(p: Path) -> tuple[str, int, int]:
    # w012-L03-07.png
    m = re.match(r"(w\d+)-L(\d+)-(\d+)\.png$", p.name)
    if not m:
        raise ValueError(p.name)
    return m.group(1), int(m.group(2)), int(m.group(3))


def main() -> None:
    files = sorted(WORDS.glob("w*.png"))
    if not files:
        raise SystemExit("No word PNGs — run scripts/vectorize_handwriting.py first")

    words = []
    for f in files:
        wid, line, order = parse_name(f)
        d, w, h = word_to_path_d(f)
        if not d.strip():
            continue
        words.append(
            {
                "id": wid,
                "line": line,
                "order": order,
                "d": d,
                "w": w,
                "h": h,
                "is_title": line == 0,
            }
        )
        print(f"  traced {f.name} ({w}×{h})")

    # Straight horizontal layout, reflow long lines
    by_line: dict[int, list] = defaultdict(list)
    for w in words:
        by_line[w["line"]].append(w)

    pad = 24.0
    gap_x = 14.0
    gap_y = 18.0
    # Target a wider manifesto column so lines can breathe toward the portrait
    max_line = 1100.0
    scale = 0.58

    placed = []
    y = pad
    for li in sorted(by_line):
        row = sorted(by_line[li], key=lambda w: w["order"])
        row_h = max(w["h"] for w in row) * scale
        x = pad
        extra = 1.75 if li == 0 else 1.0
        for w in row:
            ww = w["w"] * scale
            hh = w["h"] * scale
            if x > pad and x + ww > max_line:
                y += row_h + gap_y
                x = pad
            placed.append(
                {
                    **w,
                    "x": x,
                    # Shared baseline per line (bottom-align) — straighter than mid-optical.
                    "y": y + (row_h - hh),
                    "sw": ww,
                    "sh": hh,
                    "scale": scale,
                }
            )
            x += ww + gap_x * (1.15 if li == 0 else 1.0)
        y += row_h + gap_y * extra

    width = max(p["x"] + p["sw"] for p in placed) + pad
    height = y + pad

    # Transparent SVG — ink only (secondary tan)
    lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width:.1f}" height="{height:.1f}" '
        f'viewBox="0 0 {width:.1f} {height:.1f}" role="img" '
        f'aria-label="Handwritten Design Manifesto">',
        '  <!-- Each <g class="word"> is one whole word — move/resize the group. -->',
    ]
    for p in placed:
        fill = TITLE_FILL if p["is_title"] else BODY_FILL
        cls = "word word-title" if p["is_title"] else "word word-body"
        lines.append(
            f'  <g id="{p["id"]}" class="{cls}" data-line="{p["line"]}" '
            f'transform="translate({p["x"]:.2f} {p["y"]:.2f}) scale({p["scale"]:.4f})">'
        )
        lines.append(f'    <path fill="{fill}" d="{p["d"]}"/>')
        lines.append("  </g>")
    lines.append("</svg>\n")
    OUT_SVG.write_text("\n".join(lines), encoding="utf-8")

    # Transparent raster preview — same even-stroke masks as the vectors
    preview = Image.new("RGBA", (int(width), int(height)), (0, 0, 0, 0))
    for p in placed:
        matches = list(WORDS.glob(f"{p['id']}-*.png"))
        if not matches:
            continue
        arr = np.array(Image.open(matches[0]).convert("RGBA"))
        ink = even_stroke(arr[:, :, 3] > 128)
        ys, xs = np.where(ink)
        if len(xs) == 0:
            continue
        pad_c = 2
        x0 = max(0, int(xs.min()) - pad_c)
        y0 = max(0, int(ys.min()) - pad_c)
        x1 = min(ink.shape[1], int(xs.max()) + pad_c + 1)
        y1 = min(ink.shape[0], int(ys.max()) + pad_c + 1)
        crop = ink[y0:y1, x0:x1]
        hexfill = TITLE_FILL if p["is_title"] else BODY_FILL
        r = int(hexfill[1:3], 16)
        g = int(hexfill[3:5], 16)
        b = int(hexfill[5:7], 16)
        rgba = np.zeros((crop.shape[0], crop.shape[1], 4), dtype=np.uint8)
        rgba[crop, 0] = r
        rgba[crop, 1] = g
        rgba[crop, 2] = b
        rgba[crop, 3] = 255
        tinted = Image.fromarray(rgba, "RGBA")
        nw = max(1, int(p["sw"]))
        nh = max(1, int(p["sh"]))
        tinted = tinted.resize((nw, nh), Image.Resampling.LANCZOS)
        preview.paste(tinted, (int(p["x"]), int(p["y"])), tinted)
    preview.save(OUT_PREVIEW)

    (HW / "manifest-vector.json").write_text(
        json.dumps(
            {
                "svg": OUT_SVG.name,
                "preview": OUT_PREVIEW.name,
                "word_count": len(placed),
                "title_fill": TITLE_FILL,
                "body_fill": BODY_FILL,
            },
            indent=2,
        )
        + "\n"
    )
    print(f"wrote {OUT_SVG} ({len(placed)} vector words)")
    print(f"preview {OUT_PREVIEW}")


if __name__ == "__main__":
    main()
