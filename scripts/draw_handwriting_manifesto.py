#!/usr/bin/env python3
"""Hand-trace the Design Manifesto as clean stroke SVG (not a photo vectorize).

Glyphs are centerline strokes inspired by the pencil original: casual print body,
looser script title. Even stroke weight, round caps, transparent background.
"""

from __future__ import annotations

import math
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/about/handwriting/manifesto-vector.svg"

INK = "#704214"

# Em box: baseline y=0, x-height≈52, caps≈78, descenders≈-28
# Each glyph: (advance, [path_d, ...])  — paths in glyph space
Glyph = tuple[float, list[str]]


def G(adv: float, *paths: str) -> Glyph:
    return (adv, list(paths))


# --- print body glyphs (casual hand: single-story a, soft joins) -------------
BODY: dict[str, Glyph] = {
    " ": G(20),
    ".": G(11, "M 5,3.5 Q 5.7,1.8 5,0.4 Q 4.3,1.8 5,3.5"),
    ",": G(11, "M 5,4 Q 6.2,1 4.2,-7"),
    "'": G(9, "M 4,76 Q 4.5,70 5,62"),
    "!": G(13, "M 6.5,76 Q 6.2,48 6,20", "M 6.5,9 Q 7.5,3 6.5,-1 Q 5.5,3 6.5,9"),
    "A": G(44, "M 4,0 Q 18,40 21,76 Q 26,40 40,0", "M 13,26 Q 22,24 31,26"),
    "B": G(
        40,
        "M 8,0 Q 7.5,38 8,76",
        "M 8,76 Q 24,78 30,76 Q 40,72 40,62 Q 40,52 26,49 L 8,48",
        "M 8,48 Q 26,48 30,46 Q 42,42 42,26 Q 42,2 26,0 L 8,0",
    ),
    "D": G(
        46,
        "M 8,0 Q 7.5,38 8,76",
        "M 8,76 Q 22,78 28,74 Q 46,66 46,38 Q 46,8 28,2 Q 18,0 8,0",
    ),
    "I": G(20, "M 10,0 Q 10.2,38 10,76", "M 3,76 Q 10,74 17,76", "M 3,0 Q 10,2 17,0"),
    "M": G(56, "M 4,0 Q 3.5,40 4,76 L 27,30 L 50,76 Q 50.5,40 50,0"),
    "S": G(
        38,
        "M 32,66 Q 28,80 17,80 Q 4,80 4,64 Q 4,50 18,46 Q 34,42 34,24 "
        "Q 34,-2 17,-2 Q 6,-2 4,10",
    ),
    "T": G(42, "M 21,0 Q 21,38 21,76", "M 2,76 Q 21,74 40,76"),
    "W": G(56, "M 2,76 L 13,2 L 27,54 L 41,2 L 52,76"),
    "a": G(
        34,
        "M 28,0 Q 28.5,22 28,40 Q 28,54 17,54 Q 4,54 4,27 Q 4,1 17,1 Q 28,1 28,16",
    ),
    "b": G(
        32,
        "M 6,76 Q 5.7,36 6,0",
        "M 6,38 Q 6,54 17,54 Q 30,54 30,27 Q 30,1 17,1 Q 6,1 6,16",
    ),
    "c": G(30, "M 27,42 Q 22,54 15,54 Q 2,54 2,27 Q 2,1 15,1 Q 24,1 28,12"),
    "d": G(
        34,
        "M 28,76 Q 28.3,36 28,0",
        "M 28,38 Q 28,54 17,54 Q 4,54 4,27 Q 4,1 17,1 Q 28,1 28,16",
    ),
    "e": G(
        32,
        "M 4,25 L 28,25 Q 28,54 15,54 Q 2,54 2,27 Q 2,1 16,1 Q 26,1 28,12",
    ),
    "f": G(22, "M 18,76 Q 8,76 8,58 L 8,0", "M 2,50 L 17,50"),
    "g": G(
        32,
        "M 28,50 Q 28.2,20 28,0 Q 28,-26 16,-26 Q 5,-26 5,-14",
        "M 28,38 Q 28,54 16,54 Q 4,54 4,27 Q 4,1 16,1 Q 28,1 28,16",
    ),
    "h": G(34, "M 6,76 Q 5.7,36 6,0", "M 6,36 Q 8,54 19,54 Q 30,54 30,34 L 30,0"),
    "i": G(14, "M 7,50 Q 7.1,24 7,0", "M 7,68 Q 8.1,64 7,60 Q 5.9,64 7,68"),
    "j": G(
        16,
        "M 9,50 Q 9,-4 9,-10 Q 9,-26 1,-26",
        "M 9,68 Q 10.1,64 9,60 Q 7.9,64 9,68",
    ),
    "k": G(32, "M 6,76 Q 5.7,36 6,0", "M 26,50 Q 14,36 8,28 Q 16,16 28,0"),
    "l": G(14, "M 7,76 Q 7.1,36 7,0"),
    "m": G(
        50,
        "M 5,50 Q 4.8,24 5,0",
        "M 5,36 Q 7,54 16,54 Q 24,54 24,34 L 24,0",
        "M 24,36 Q 26,54 36,54 Q 46,54 46,34 L 46,0",
    ),
    "n": G(34, "M 6,50 Q 5.8,24 6,0", "M 6,36 Q 8,54 19,54 Q 30,54 30,34 L 30,0"),
    "o": G(32, "M 16,54 Q 3,54 3,27 Q 3,1 16,1 Q 29,1 29,27 Q 29,54 16,54"),
    "p": G(
        32,
        "M 6,50 Q 5.8,10 6,-26",
        "M 6,38 Q 6,54 17,54 Q 30,54 30,27 Q 30,1 17,1 Q 6,1 6,16",
    ),
    "r": G(24, "M 6,50 Q 5.8,24 6,0", "M 6,34 Q 8,52 17,52 Q 24,52 26,44"),
    "s": G(
        28,
        "M 24,42 Q 20,54 13,54 Q 3,54 3,42 Q 3,32 14,28 Q 26,24 26,13 "
        "Q 26,-2 13,-2 Q 4,-2 3,8",
    ),
    "t": G(22, "M 10,66 Q 10,30 10,6 Q 10,-2 17,-2", "M 2,50 L 18,50"),
    "u": G(34, "M 5,50 Q 5,16 5,14 Q 5,0 17,0 Q 29,0 29,14 L 29,50"),
    "v": G(32, "M 3,50 Q 14,8 16,0 Q 18,8 29,50"),
    "w": G(46, "M 2,50 L 11,2 L 22,38 L 33,2 L 44,50"),
    "y": G(32, "M 4,50 Q 14,8 16,0", "M 28,50 Q 18,8 16,0 Q 10,-26 3,-26"),
}

# --- title script glyphs (looser, inspired by her pencil title) --------------
TITLE: dict[str, Glyph] = {
    " ": G(30),
    "D": G(
        70,
        # Looped left stem + bowl — matches her flourished D
        "M 22,8 Q 6,4 4,22 Q 2,48 8,72 Q 14,92 36,90 Q 60,88 62,52 "
        "Q 64,22 40,10 Q 28,4 22,18",
        "M 22,48 Q 36,52 50,46",
    ),
    "M": G(
        82,
        "M 6,2 Q 4,40 6,78",
        "M 6,78 Q 18,36 28,78 Q 40,36 52,78 Q 64,36 74,78",
        "M 74,78 Q 78,40 76,2",
    ),
    "a": G(
        42,
        "M 36,2 Q 36.5,24 36,42 Q 36,56 22,56 Q 6,56 6,28 Q 6,2 22,2 Q 36,2 36,18",
    ),
    "e": G(
        40,
        "M 6,28 L 34,28 Q 36,56 20,56 Q 4,56 4,28 Q 4,2 20,2 Q 32,2 36,14",
    ),
    "f": G(32, "M 28,92 Q 8,94 8,70 L 8,2", "M 2,52 L 24,52"),
    "g": G(
        42,
        "M 36,52 Q 36.5,22 36,2 Q 36,-30 18,-30 Q 6,-30 6,-14",
        "M 36,40 Q 36,56 20,56 Q 6,56 6,28 Q 6,2 20,2 Q 36,2 36,18",
    ),
    "i": G(18, "M 9,52 Q 9.2,24 9,2", "M 9,74 Q 10.6,68 9,62 Q 7.4,68 9,74"),
    "n": G(42, "M 6,52 Q 5.8,24 6,2", "M 6,38 Q 8,56 22,56 Q 38,56 38,34 L 38,2"),
    "o": G(40, "M 20,56 Q 4,56 4,28 Q 4,2 20,2 Q 36,2 36,28 Q 36,56 20,56"),
    "s": G(
        36,
        "M 30,44 Q 26,56 16,56 Q 3,56 3,44 Q 3,34 16,30 Q 32,26 32,14 "
        "Q 32,-2 16,-2 Q 4,-2 4,10",
    ),
    "t": G(30, "M 12,82 Q 12,30 12,6 Q 12,-2 24,-2", "M 2,52 L 26,52"),
}


LINES = [
    ("title", "Design Manifesto"),
    ("body", "I decided to use this space to share my thoughts on AI."),
    ("body", "AI can write like us, talk like us, and imitate everything we"),
    ("body", "do. At this point, I don't know where a person ends and AI"),
    ("body", "begins. But we are humans. We are made of flesh and blood."),
    ("body", "We create, we dance, and make art. So let's not see this as"),
    ("body", "AI is taking over our lives, but that AI is letting us have more"),
    ("body", "life to live. We can automate processes to bring more time"),
    ("body", "for the things that spark us joy. To create. To make art."),
    ("body", "If we learn where and when to use AI, we can bring our"),
    ("body", "lives back to the art. We are a house for creative spirit."),
    ("body", "So let's be intentional about how we create."),
]


def lookup(ch: str, style: str) -> Glyph:
    table = TITLE if style == "title" else BODY
    if ch in table:
        return table[ch]
    if ch in BODY:
        return BODY[ch]
    # fallback: small mark
    return G(16, "M 4,20 L 12,20")


def word_paths(word: str, style: str, rng: random.Random) -> tuple[list[str], float, float, float]:
    """Return (path_ds, width, height_up, height_down) in glyph units."""
    scale_jit = 1.0 + rng.uniform(-0.025, 0.025)
    x = 0.0
    paths: list[str] = []
    y_min, y_max = 0.0, 52.0
    for ch in word:
        adv, segs = lookup(ch, style)
        dy = rng.uniform(-0.9, 0.9)
        dx = rng.uniform(-0.3, 0.3)
        for d in segs:
            pd = offset_path(d, x + dx, dy, scale_jit)
            paths.append(pd)
            for yy in _path_ys(pd):
                y_min = min(y_min, yy)
                y_max = max(y_max, yy)
        x += adv * scale_jit + rng.uniform(-0.5, 0.6)
    # padding for stroke half-width in glyph units (~3)
    pad = 4.0
    return paths, x, y_max + pad, max(0.0, -y_min) + pad


def _path_ys(d: str) -> list[float]:
    tokens = d.replace(",", " ").split()
    ys: list[float] = []
    i = 0
    while i < len(tokens):
        t = tokens[i]
        if t in ("M", "L", "Q", "C"):
            i += 1
            n = {"M": 2, "L": 2, "Q": 4, "C": 6}[t]
            for j in range(1, n, 2):
                ys.append(float(tokens[i + j]))
            i += n
        else:
            i += 1
    return ys


def offset_path(d: str, dx: float, dy: float, s: float) -> str:
    """Scale + translate path commands (M L Q C only, absolute)."""
    tokens = d.replace(",", " ").split()
    out: list[str] = []
    i = 0
    while i < len(tokens):
        t = tokens[i]
        if t in ("M", "L", "Q", "C"):
            out.append(t)
            i += 1
            n = {"M": 2, "L": 2, "Q": 4, "C": 6}[t]
            coords = []
            for j in range(n):
                coords.append(float(tokens[i + j]))
            i += n
            for j in range(0, n, 2):
                coords[j] = coords[j] * s + dx
                coords[j + 1] = coords[j + 1] * s + dy
            out.extend(f"{c:.2f}" for c in coords)
        else:
            raise ValueError(f"Unexpected token {t} in {d}")
    return " ".join(out)


def layout() -> str:
    rng = random.Random(7)
    pad_x, pad_y = 8.0, 10.0
    # Scale so original line breaks fit ~ manifesto column (no forced wraps)
    body_scale = 0.62
    title_scale = 1.22
    body_sw = 3.6
    title_sw = 3.9
    line_gap_body = 18.0
    gap_after_title = 36.0
    word_gap = 16.0
    # Keep author line breaks; only wrap if something truly overflows
    max_w = 1200.0

    elements: list[str] = []
    y = pad_y
    word_i = 0
    content_w = 0.0

    for kind, line in LINES:
        style = "title" if kind == "title" else "body"
        sc = title_scale if kind == "title" else body_scale
        sw = title_sw if kind == "title" else body_sw
        words = line.split(" ")
        x = pad_x
        row_asc = 0.0
        row_desc = 0.0
        row_items: list[tuple[str, list[str], float, float, float]] = []

        for w in words:
            paths, gw, up, down = word_paths(w, style, rng)
            ww = gw * sc
            asc = up * sc
            desc = down * sc
            if kind == "body" and x > pad_x and x + ww > max_w:
                baseline = y + row_asc
                _flush_row(elements, row_items, baseline, sc, sw, word_i)
                word_i += len(row_items)
                y = baseline + row_desc + line_gap_body
                x = pad_x
                row_items = []
                row_asc = row_desc = 0.0
            row_items.append((w, paths, x, ww, asc))
            row_asc = max(row_asc, asc)
            row_desc = max(row_desc, desc)
            x += ww + word_gap * sc
            content_w = max(content_w, x)

        baseline = y + row_asc
        _flush_row(elements, row_items, baseline, sc, sw, word_i)
        word_i += len(row_items)
        y = baseline + row_desc + (
            gap_after_title if kind == "title" else line_gap_body
        )

    width = content_w + pad_x
    height = y + pad_y

    lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width:.1f}" height="{height:.1f}" '
        f'viewBox="0 0 {width:.1f} {height:.1f}" role="img" '
        f'aria-label="Handwritten Design Manifesto" fill="none" '
        f'shape-rendering="geometricPrecision">',
        "  <!-- Clean stroke redraw (not a photo vectorize). Each word is a <g>. -->",
    ]
    lines.extend(elements)
    lines.append("</svg>\n")
    return "\n".join(lines)


def _flush_row(
    elements: list[str],
    row_items: list[tuple[str, list[str], float, float, float]],
    baseline_y: float,
    sc: float,
    sw: float,
    start_id: int,
) -> None:
    for i, (w, paths, x, _ww, _asc) in enumerate(row_items):
        wid = f"w{start_id + i:03d}"
        elements.append(
            f'  <g id="{wid}" class="word" data-word="{_xml(w)}" '
            f'transform="translate({x:.2f} {baseline_y:.2f}) scale({sc:.4f} {-sc:.4f})">'
        )
        for d in paths:
            elements.append(
                f'    <path d="{d}" stroke="{INK}" stroke-width="{sw / sc:.3f}" '
                f'stroke-linecap="round" stroke-linejoin="round"/>'
            )
        elements.append("  </g>")


def _xml(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace('"', "&quot;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def main() -> None:
    svg = layout()
    OUT.write_text(svg, encoding="utf-8")
    print(f"wrote {OUT} ({svg.count('<g id=')} words)")


if __name__ == "__main__":
    main()
