"""Cleanup passes that run between skeleton tracing and curve fitting.

A raw skeleton of handwriting is faithful but ugly in four specific,
recognisable ways, and each of these fixes one of them:

  weld_ends      Where two pen strokes cross -- the arm of a 'k' meeting its
                 stem -- skeletonization splits the crossing into several
                 nodes a few pixels apart, leaving a lump or a tiny loop.
                 Snapping those ends to one point removes the lump.
  drop_specks    The same crossings leave stubs and pinhole loops behind.
  close_bowls    She lifts the pen a hair early on round letters, so 'o' comes
                 out open and reads as 'u'. Closing a bowl whose gap is small
                 relative to its own arc length fixes that without also
                 closing a 'c' or a 'u', which are open by design.
  round_facets   Simplification tolerance is a fixed number of pixels, which is
                 gentle on a long stroke and brutal on a small counter. Scaling
                 it by arc length keeps small bowls round instead of polygonal.

Not done, deliberately: splitting a bowl out of the middle of a longer stroke,
to close the 'o' in "know" (written in one motion straight on into the 'w', so
it reads as an 'a'). Every version of that test that closed the 'o' also curled
the 's' of "house" into a loop. One letter that is faithful to the page beats a
rule that invents artifacts elsewhere.
"""
import numpy as np
from scipy.spatial import cKDTree


def _length(p):
    return float(np.linalg.norm(np.diff(p, axis=0), axis=1).sum()) if len(p) > 1 else 0.0


def _area(p):
    """Shoelace area; only meaningful for a closed polyline."""
    x, y = p[:, 1], p[:, 0]
    return float(abs(np.dot(x, np.roll(y, 1)) - np.dot(y, np.roll(x, 1))) / 2)


def weld_ends(polys, tol):
    """Snap stroke endpoints that sit within tol of each other onto one point."""
    if not polys:
        return polys
    ends = np.array([q for p in polys for q in (p[0], p[-1])], float)
    parent = list(range(len(ends)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for i, j in cKDTree(ends).query_pairs(tol):
        a, b = find(i), find(j)
        if a != b:
            parent[a] = b

    groups = {}
    for i in range(len(ends)):
        groups.setdefault(find(i), []).append(i)
    target = {}
    for members in groups.values():
        c = ends[members].mean(axis=0)
        for m in members:
            target[m] = c

    out = []
    for k, p in enumerate(polys):
        p = p.copy()
        p[0], p[-1] = target[2 * k], target[2 * k + 1]
        out.append(p)
    return out


def drop_specks(polys, min_len, min_area):
    """Remove welding leftovers: zero-length stubs and pinhole loops."""
    keep = []
    for p in polys:
        closed = np.allclose(p[0], p[-1])
        if closed and _area(p) < min_area:
            continue
        if not closed and _length(p) < min_len:
            continue
        keep.append(p)
    return keep or polys


def _turning(p):
    """Total turning along a polyline, in degrees."""
    v = np.diff(p, axis=0)
    n = np.linalg.norm(v, axis=1)
    v = v[n > 1e-9]
    if len(v) < 2:
        return 0.0
    a = np.arctan2(v[:, 0], v[:, 1])
    d = np.diff(a)
    d = (d + np.pi) % (2 * np.pi) - np.pi          # unwrap to [-pi, pi]
    return float(abs(np.degrees(d).sum()))


def close_bowls(polys, max_ratio=0.18, min_turn=300.0, max_gap=None):
    """Close a stroke that almost returns to its own start.

    The test is the gap as a fraction of the stroke's arc length, not an
    absolute distance. A nearly-closed 'o' leaves a gap a few percent of its
    perimeter; a 'c' or a 'u' leaves something like a third of it, so this
    separates them cleanly at any letter size.
    """
    out = []
    for p in polys:
        if len(p) > 3 and not np.allclose(p[0], p[-1]):
            gap = float(np.linalg.norm(p[-1] - p[0]))
            L = _length(p)
            near = L > 0 and gap / L < max_ratio
            wraps = _turning(p) > min_turn
            if (near or wraps) and (max_gap is None or gap < max_gap):
                p = np.vstack([p, p[:1]])
        out.append(p)
    return out


def facet_eps(p, eps, min_points=14):
    """Simplification tolerance scaled down for short strokes."""
    return min(eps, max(_length(p) / min_points, eps * 0.25))
