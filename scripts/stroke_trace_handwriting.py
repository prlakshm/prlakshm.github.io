#!/usr/bin/env python3
"""Trace handwriting into clean monoline SVG strokes (not filled photo outlines).

Pipeline:
  1. Binarize the source scan
  2. Skeletonize → centerlines
  3. Walk skeleton into polylines, smooth + simplify
  4. Emit word-grouped <path stroke> SVG with even weight
"""

from __future__ import annotations

import math
import re
from collections import defaultdict, deque
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage.morphology import skeletonize

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public/about/handwriting/source-clean.png"
# Fallback to original scan if clean redraw is missing
if not SRC.exists():
    SRC = ROOT / "public/about/handwriting/source.png"
OUT = ROOT / "public/about/handwriting/manifesto-vector.svg"
PREVIEW = ROOT / "public/about/handwriting/manifesto-vector-preview.png"

INK = "#704214"
STROKE = 3.8
UPSCALE = 2


def load_ink(path: Path) -> np.ndarray:
    im = Image.open(path).convert("RGB")
    arr = np.asarray(im).astype(np.float32)
    gray = arr.mean(axis=2)
    # Adaptive: darker than local paper neighborhood
    local = ndi.uniform_filter(gray, size=51)
    ink = ((local - gray) > 10) & (gray < 235)
    # Absolute fallback for strong ink
    ink |= gray < 150
    ink = ndi.binary_opening(ink, iterations=1)
    ink = ndi.binary_closing(ink, structure=np.ones((3, 3)), iterations=2)
    ys, xs = np.where(ink)
    if len(xs) == 0:
        raise SystemExit("No ink found")
    pad = 20
    y0, y1 = max(0, int(ys.min()) - pad), min(ink.shape[0], int(ys.max()) + pad)
    x0, x1 = max(0, int(xs.min()) - pad), min(ink.shape[1], int(xs.max()) + pad)
    crop = ink[y0:y1, x0:x1]
    big = np.array(
        Image.fromarray(crop.astype(np.uint8) * 255).resize(
            (crop.shape[1] * UPSCALE, crop.shape[0] * UPSCALE),
            Image.Resampling.NEAREST,
        )
    )
    return big > 128


def thicken_for_skeleton(ink: np.ndarray) -> np.ndarray:
    """Close thin pencil gaps so the skeleton stays continuous."""
    ink = ndi.binary_closing(ink, structure=np.ones((3, 3)), iterations=2)
    ink = ndi.binary_dilation(ink, iterations=1)
    return ink


def neighbors8(y: int, x: int, h: int, w: int):
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dy == 0 and dx == 0:
                continue
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w:
                yield ny, nx


def skeleton_polylines(skel: np.ndarray) -> list[list[tuple[float, float]]]:
    h, w = skel.shape
    ys, xs = np.where(skel)
    pts = set(zip(ys.tolist(), xs.tolist()))
    deg: dict[tuple[int, int], int] = {}
    for y, x in pts:
        deg[(y, x)] = sum(1 for ny, nx in neighbors8(y, x, h, w) if (ny, nx) in pts)

    visited_edges: set[tuple[tuple[int, int], tuple[int, int]]] = set()
    polylines: list[list[tuple[float, float]]] = []

    def edge_key(a, b):
        return (a, b) if a < b else (b, a)

    # Start at endpoints (deg==1), then junctions, then leftovers
    starts = [p for p, d in deg.items() if d == 1]
    starts += [p for p, d in deg.items() if d >= 3]
    starts += list(pts)

    for start in starts:
        for nb in neighbors8(*start, h, w):
            if nb not in pts:
                continue
            ek = edge_key(start, nb)
            if ek in visited_edges:
                continue
            # Walk
            path = [start]
            prev, cur = start, nb
            visited_edges.add(ek)
            path.append(cur)
            while True:
                options = [
                    n
                    for n in neighbors8(*cur, h, w)
                    if n in pts and n != prev and edge_key(cur, n) not in visited_edges
                ]
                if not options:
                    break
                # Prefer continuing straight-ish
                if len(options) > 1 and deg.get(cur, 0) >= 3:
                    break  # stop at junction for separate strokes
                nxt = options[0]
                visited_edges.add(edge_key(cur, nxt))
                prev, cur = cur, nxt
                path.append(cur)
            if len(path) >= 4:
                # (x, y) with y up for later flip — keep image coords for now
                polylines.append([(float(x), float(y)) for y, x in path])

    return polylines


def rdp(points: list[tuple[float, float]], epsilon: float) -> list[tuple[float, float]]:
    if len(points) < 3:
        return points
    # Iterative Ramer–Douglas–Peucker
    stk = [(0, len(points) - 1)]
    keep = {0, len(points) - 1}
    while stk:
        s, e = stk.pop()
        a, b = points[s], points[e]
        ax, ay = a
        bx, by = b
        dx, dy = bx - ax, by - ay
        denom = math.hypot(dx, dy) or 1.0
        max_d, idx = -1.0, None
        for i in range(s + 1, e):
            px, py = points[i]
            d = abs(dy * px - dx * py + bx * ay - by * ax) / denom
            if d > max_d:
                max_d, idx = d, i
        if max_d > epsilon and idx is not None:
            keep.add(idx)
            stk.append((s, idx))
            stk.append((idx, e))
    return [points[i] for i in sorted(keep)]


def chaikin(points: list[tuple[float, float]], iters: int = 2) -> list[tuple[float, float]]:
    pts = points
    for _ in range(iters):
        if len(pts) < 2:
            break
        nxt = [pts[0]]
        for i in range(len(pts) - 1):
            x0, y0 = pts[i]
            x1, y1 = pts[i + 1]
            nxt.append((0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1))
            nxt.append((0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1))
        nxt.append(pts[-1])
        pts = nxt
    return pts


def polyline_to_path(points: list[tuple[float, float]]) -> str:
    if len(points) < 2:
        return ""
    parts = [f"M {points[0][0]:.2f},{points[0][1]:.2f}"]
    # Quadratic mid-point smoothing
    i = 1
    while i < len(points):
        if i + 1 < len(points):
            x0, y0 = points[i]
            x1, y1 = points[i + 1]
            parts.append(f"Q {x0:.2f},{y0:.2f} {(x0 + x1) / 2:.2f},{(y0 + y1) / 2:.2f}")
            i += 2
        else:
            x, y = points[i]
            parts.append(f"L {x:.2f},{y:.2f}")
            i += 1
    return " ".join(parts)


def cluster_words(
    polylines: list[list[tuple[float, float]]],
) -> list[dict]:
    """Group strokes into words by horizontal proximity + line bands."""
    # Represent each stroke by bbox
    items = []
    for pi, pl in enumerate(polylines):
        xs = [p[0] for p in pl]
        ys = [p[1] for p in pl]
        items.append(
            {
                "i": pi,
                "pl": pl,
                "x0": min(xs),
                "x1": max(xs),
                "y0": min(ys),
                "y1": max(ys),
                "cx": (min(xs) + max(xs)) / 2,
                "cy": (min(ys) + max(ys)) / 2,
            }
        )

    # Line assignment via y clustering
    items.sort(key=lambda t: t["cy"])
    lines: list[list[dict]] = []
    line_ys: list[float] = []
    thresh = 28 * UPSCALE
    for it in items:
        if not lines or abs(it["cy"] - line_ys[-1]) > thresh:
            lines.append([it])
            line_ys.append(it["cy"])
        else:
            lines[-1].append(it)
            line_ys[-1] = float(np.median([x["cy"] for x in lines[-1]]))

    words: list[dict] = []
    gap = 18 * UPSCALE
    for li, line in enumerate(lines):
        line.sort(key=lambda t: t["x0"])
        clusters: list[list[dict]] = []
        for it in line:
            if not clusters or it["x0"] - clusters[-1][-1]["x1"] > gap:
                clusters.append([it])
            else:
                clusters[-1].append(it)
                # merge overlapping
                clusters[-1].sort(key=lambda t: t["x0"])
        for ci, cl in enumerate(clusters):
            x0 = min(t["x0"] for t in cl)
            x1 = max(t["x1"] for t in cl)
            y0 = min(t["y0"] for t in cl)
            y1 = max(t["y1"] for t in cl)
            words.append(
                {
                    "line": li,
                    "order": ci,
                    "x0": x0,
                    "y0": y0,
                    "x1": x1,
                    "y1": y1,
                    "strokes": [t["pl"] for t in cl],
                }
            )
    return words


def layout_svg(words: list[dict], src_h: int) -> tuple[str, float, float]:
    """Straighten onto baselines; keep relative x within each line."""
    by_line: dict[int, list] = defaultdict(list)
    for w in words:
        by_line[w["line"]].append(w)

    scale = 0.72
    pad = 16.0
    gap_y = 14.0
    elements: list[str] = []
    y = pad
    content_w = 0.0
    wid = 0

    for li in sorted(by_line):
        row = sorted(by_line[li], key=lambda w: w["order"])
        base = max(w["y1"] for w in row)
        top = min(w["y0"] for w in row)
        row_h = (base - top) * scale
        x_origin = min(w["x0"] for w in row)
        is_title = li == 0
        sw = STROKE * (1.15 if is_title else 1.0)
        for w in row:
            sx = pad + (w["x0"] - x_origin) * scale
            sy = y + (w["y0"] - top) * scale
            content_w = max(content_w, sx + (w["x1"] - w["x0"]) * scale)
            cls = "word word-title" if is_title else "word word-body"
            elements.append(
                f'  <g id="w{wid:03d}" class="{cls}" data-line="{li}" '
                f'transform="translate({sx:.2f} {sy:.2f})">'
            )
            for pl in w["strokes"]:
                local = [
                    ((x - w["x0"]) * scale, (yy - w["y0"]) * scale) for x, yy in pl
                ]
                local = chaikin(rdp(local, epsilon=0.95), iters=2)
                d = polyline_to_path(local)
                if not d:
                    continue
                elements.append(
                    f'    <path d="{d}" stroke="{INK}" stroke-width="{sw:.2f}" '
                    f'fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
                )
            elements.append("  </g>")
            wid += 1
        y += row_h + (gap_y * 1.8 if is_title else gap_y)

    width = content_w + pad * 2
    height = y + pad
    lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width:.1f}" height="{height:.1f}" '
        f'viewBox="0 0 {width:.1f} {height:.1f}" role="img" '
        f'aria-label="Handwritten Design Manifesto" fill="none">',
        "  <!-- Centerline stroke trace — even weight, smooth paths. -->",
        *elements,
        "</svg>\n",
    ]
    return "\n".join(lines), width, height


def main() -> None:
    print(f"loading {SRC}")
    ink = load_ink(SRC)
    ink = thicken_for_skeleton(ink)
    print(f"ink shape {ink.shape} coverage {ink.mean():.3f}")
    skel = skeletonize(ink)
    print(f"skeleton pixels {skel.sum()}")
    polylines = skeleton_polylines(skel)
    print(f"raw strokes {len(polylines)}")
    # Drop tiny scrapes
    polylines = [p for p in polylines if len(p) >= 6]
    words = cluster_words(polylines)
    print(f"words {len(words)} lines {len({w['line'] for w in words})}")
    svg, width, height = layout_svg(words, ink.shape[0])
    OUT.write_text(svg, encoding="utf-8")
    print(f"wrote {OUT} ({width:.0f}×{height:.0f})")

    # Preview
    preview = Image.new("RGBA", (int(width), int(height)), (245, 238, 228, 255))
    # quick raster via wand? skip — write SVG only; browser is source of truth
    preview.save(PREVIEW)


if __name__ == "__main__":
    main()
