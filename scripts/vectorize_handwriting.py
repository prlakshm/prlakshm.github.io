#!/usr/bin/env python3
"""Handwritten manifesto → word-level editable SVG.

Uses line + gap projection so whole words stay together (letters never
become separate groups). Strokes are thickened for a sharpie read.
"""

from __future__ import annotations

import base64
import io
import json
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public/about/handwriting/source.png"
OUT_DIR = ROOT / "public/about/handwriting"


def binarize(path: Path) -> Image.Image:
    im = Image.open(path).convert("RGB")
    im = im.resize((im.width * 2, im.height * 2), Image.Resampling.LANCZOS)
    gray = ImageOps.autocontrast(im.convert("L"), cutoff=1)
    blur = gray.filter(ImageFilter.BoxBlur(20))
    w, h = gray.size
    g, b = gray.tobytes(), blur.tobytes()
    out = bytearray(w * h)
    for i in range(w * h):
        if g[i] < b[i] - 6 or g[i] < 185:
            out[i] = 255
    mask = Image.frombytes("L", (w, h), bytes(out))
    bbox = mask.getbbox()
    if bbox:
        x0, y0, x1, y1 = bbox
        pad = 20
        mask = mask.crop((max(0, x0 - pad), max(0, y0 - pad), min(w, x1 + pad), min(h, y1 + pad)))
    mask = mask.filter(ImageFilter.MedianFilter(3))
    # Light clean only — even stroke weight is applied per-word at trace time
    mask = mask.filter(ImageFilter.MaxFilter(3))
    # Drop faint full-width rule near the top (photo/scan edge)
    rows = row_ink_quick(mask)
    if rows:
        peak = max(rows)
        for y, v in enumerate(rows):
            if y > mask.height * 0.12:
                break
            if v > peak * 0.35 and v > mask.width * 0.4:
                # clear this row
                pix = mask.load()
                for x in range(mask.width):
                    pix[x, y] = 0
    return mask


def row_ink_quick(mask: Image.Image) -> list[int]:
    w, h = mask.size
    pix = mask.load()
    return [sum(1 for x in range(w) if pix[x, y] >= 128) for y in range(h)]
    w, h = mask.size
    pix = mask.load()
    return [sum(1 for x in range(w) if pix[x, y] >= 128) for y in range(h)]


def col_ink(mask: Image.Image, y0: int, y1: int) -> list[int]:
    w, _ = mask.size
    pix = mask.load()
    return [sum(1 for y in range(y0, y1 + 1) if pix[x, y] >= 128) for x in range(w)]


def find_bands(proj: list[int], min_run: int, thresh: float) -> list[tuple[int, int]]:
    """Return inclusive [start, end] runs where proj > thresh."""
    bands = []
    i, n = 0, len(proj)
    while i < n:
        if proj[i] > thresh:
            j = i
            while j + 1 < n and proj[j + 1] > thresh:
                j += 1
            if j - i + 1 >= min_run:
                bands.append((i, j))
            i = j + 1
        else:
            i += 1
    return bands


def split_words_on_line(col: list[int], line_h: int) -> list[tuple[int, int]]:
    """Split a line into word x-ranges using whitespace gaps."""
    # thresh: nearly empty columns
    peak = max(col) if col else 0
    empty = max(1, peak * 0.08)
    # Gaps: runs of near-empty columns wider than ~0.22 of line height
    min_gap = max(8, int(line_h * 0.22))

    gaps = []
    i, n = 0, len(col)
    while i < n:
        if col[i] <= empty:
            j = i
            while j + 1 < n and col[j + 1] <= empty:
                j += 1
            if j - i + 1 >= min_gap:
                gaps.append((i, j))
            i = j + 1
        else:
            i += 1

    # Word spans = ink between gaps (and edges)
    cuts = [0] + [g[1] + 1 for g in gaps]  # start after each gap
    ends = [g[0] - 1 for g in gaps] + [n - 1]
    words = []
    for a, b in zip(cuts, ends):
        # tighten to actual ink
        while a <= b and col[a] <= empty:
            a += 1
        while b >= a and col[b] <= empty:
            b -= 1
        if b - a + 1 >= 6:
            words.append((a, b))
    return words


def extract_word(mask: Image.Image, x0: int, y0: int, x1: int, y1: int) -> Image.Image:
    crop = mask.crop((x0, y0, x1 + 1, y1 + 1))
    rgba = Image.new("RGBA", crop.size, (0, 0, 0, 0))
    cp, rp = crop.load(), rgba.load()
    for y in range(crop.height):
        for x in range(crop.width):
            if cp[x, y] >= 128:
                rp[x, y] = (45, 42, 31, 255)
    return rgba


def png_b64(im: Image.Image) -> str:
    buf = io.BytesIO()
    im.save(buf, format="PNG", optimize=True)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def layout(words: list[dict], max_line_width: float, gap_x: float, gap_y: float, pad: float):
    placed = []
    cursor_y = pad
    # Group by original line, reflow if needed
    from itertools import groupby

    for li, group in groupby(words, key=lambda w: w["line"]):
        row = list(group)
        row_h = max(w["img"].height for w in row)
        x = pad
        # Extra space after title
        if li == 0:
            gap_after = gap_y * 1.7
        else:
            gap_after = gap_y
        for w in row:
            ww, hh = w["img"].size
            if x > pad and x + ww > max_line_width:
                cursor_y += row_h + gap_y
                x = pad
            placed.append(
                {
                    **w,
                    "x": x,
                    "y": cursor_y + (row_h - hh) * 0.7,
                    "w": ww,
                    "h": hh,
                    "b64": png_b64(w["img"]),
                }
            )
            x += ww + gap_x
        cursor_y += row_h + gap_after

    width = max(p["x"] + p["w"] for p in placed) + pad
    height = cursor_y + pad
    return placed, width, height


def write_svg(placed, width, height, path: Path) -> None:
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width:.1f}" height="{height:.1f}" '
        f'viewBox="0 0 {width:.1f} {height:.1f}">',
        "  <!-- Each <g class='word'> is ONE whole word. Move/resize the group. -->",
        '  <rect width="100%" height="100%" fill="#f5eee4"/>',
    ]
    for p in placed:
        parts.append(
            f'  <g id="{p["id"]}" class="word" data-line="{p["line"]}" '
            f'transform="translate({p["x"]:.1f} {p["y"]:.1f})">'
        )
        parts.append(
            f'    <image width="{p["w"]}" height="{p["h"]}" href="data:image/png;base64,{p["b64"]}" />'
        )
        parts.append("  </g>")
    parts.append("</svg>\n")
    path.write_text("\n".join(parts), encoding="utf-8")


def write_preview(placed, width, height, path: Path) -> None:
    canvas = Image.new("RGBA", (int(width), int(height)), (245, 238, 228, 255))
    for p in placed:
        canvas.alpha_composite(p["img"], (int(p["x"]), int(p["y"])))
    canvas.convert("RGB").save(path)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print("binarize…")
    mask = binarize(SRC)
    mask.save(OUT_DIR / "processed-mask.png")

    full = Image.new("RGBA", mask.size, (0, 0, 0, 0))
    mp, fp = mask.load(), full.load()
    for y in range(mask.height):
        for x in range(mask.width):
            if mp[x, y] >= 128:
                fp[x, y] = (45, 42, 31, 255)
    full.save(OUT_DIR / "processed-ink.png")

    rows = row_ink_quick(mask)
    peak = max(rows) if rows else 0
    # Ignore faint top rule
    line_bands = find_bands(rows, min_run=6, thresh=max(8, peak * 0.06))
    # Drop rules / top-edge junk / ultra-thin bands
    line_bands = [
        (a, b)
        for a, b in line_bands
        if b - a + 1 >= 28 and not (a < 40 and b - a + 1 < 40)
    ]
    # Merge bands separated by a small gap (title flourishes often split one line)
    merged_bands: list[list[int]] = []
    for a, b in line_bands:
        if merged_bands and a - merged_bands[-1][1] <= 28:
            merged_bands[-1][1] = b
        else:
            merged_bands.append([a, b])
    line_bands = [(a, b) for a, b in merged_bands]
    print(f"{len(line_bands)} lines")

    words_dir = OUT_DIR / "words"
    if words_dir.exists():
        for p in words_dir.glob("*.png"):
            p.unlink()
    else:
        words_dir.mkdir()

    words = []
    wid = 0
    for li, (y0, y1) in enumerate(line_bands):
        # pad line vertically a touch
        y0p = max(0, y0 - 2)
        y1p = min(mask.height - 1, y1 + 2)
        cols = col_ink(mask, y0p, y1p)
        spans = split_words_on_line(cols, y1p - y0p + 1)
        # Title line: force exactly 2 words by cutting at the single widest gap
        if li == 0 and len(spans) >= 2:
            peak_c = max(cols) if cols else 0
            empty = max(1, peak_c * 0.08)
            # find widest near-empty run between first and last ink
            first = next((i for i, v in enumerate(cols) if v > empty), 0)
            last = next((i for i in range(len(cols) - 1, -1, -1) if cols[i] > empty), len(cols) - 1)
            best_gap = None
            i = first
            while i <= last:
                if cols[i] <= empty:
                    j = i
                    while j + 1 <= last and cols[j + 1] <= empty:
                        j += 1
                    width = j - i + 1
                    if best_gap is None or width > best_gap[0]:
                        best_gap = (width, i, j)
                    i = j + 1
                else:
                    i += 1
            if best_gap and best_gap[0] >= 6:
                _, g0, g1 = best_gap
                left = (first, g0 - 1)
                right = (g1 + 1, last)
                spans = []
                for a, b in (left, right):
                    while a <= b and cols[a] <= empty:
                        a += 1
                    while b >= a and cols[b] <= empty:
                        b -= 1
                    if b - a + 1 >= 6:
                        spans.append((a, b))

        for oi, (x0, x1) in enumerate(spans):
            # tighten vertical crop to ink in this x-span
            pix = mask.load()
            ys = [y for y in range(y0p, y1p + 1) for x in range(x0, x1 + 1) if pix[x, y] >= 128]
            if not ys:
                continue
            yy0, yy1 = min(ys), max(ys)
            img = extract_word(mask, x0, yy0, x1, yy1)
            # skip needle artifacts
            if img.width < 8 or img.height < 8:
                continue
            if img.height > 8 * img.width and img.width < 16:
                continue
            wid_name = f"w{wid:03d}"
            img.save(words_dir / f"{wid_name}-L{li:02d}-{oi:02d}.png")
            words.append({"id": wid_name, "line": li, "order": oi, "img": img})
            wid += 1
        print(f"  line {li}: {len(spans)} words")

    placed, W, H = layout(words, max_line_width=mask.width * 0.9, gap_x=18, gap_y=24, pad=40)
    write_svg(placed, W, H, OUT_DIR / "manifesto-words.svg")
    write_preview(placed, W, H, OUT_DIR / "manifesto-preview.png")
    (OUT_DIR / "manifest.json").write_text(
        json.dumps(
            {
                "svg": "manifesto-words.svg",
                "preview": "manifesto-preview.png",
                "word_count": len(placed),
                "lines": len(line_bands),
                "how_to_edit": (
                    "Open manifesto-words.svg in Figma, Illustrator, or Inkscape. "
                    "Each <g id='wNNN' class='word'> is one whole word — move or resize that group. "
                    "To put a word on the next line, drag it down; sibling words can be nudged horizontally."
                ),
            },
            indent=2,
        )
        + "\n"
    )
    print(f"done: {len(placed)} word groups → {OUT_DIR / 'manifesto-words.svg'}")


if __name__ == "__main__":
    main()
