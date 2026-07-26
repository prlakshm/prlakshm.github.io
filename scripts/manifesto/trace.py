"""Skeleton -> polyline graph tracing, spur pruning, smoothing, bezier fitting."""
import numpy as np
from scipy import ndimage as ndi
from skimage.morphology import skeletonize

import clean

N8 = [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]
# Clockwise ring used for the Rutovitz crossing number. Raw 8-neighbour counts
# call every staircase corner a junction; the crossing number does not.
RING = [(-1,0),(-1,1),(0,1),(1,1),(1,0),(1,-1),(0,-1),(-1,-1)]

def _crossing(p, pts):
    r = [(p[0]+dy, p[1]+dx) in pts for dy, dx in RING]
    return sum(1 for i in range(8) if not r[i] and r[(i+1) % 8])

def skel_graph(mask):
    """Return (polylines of (y,x), node set) covering the skeleton."""
    sk = skeletonize(mask)
    pts = {(y,x) for y,x in zip(*np.nonzero(sk))}
    if not pts: return [], set()
    nbr = {p: [(p[0]+dy,p[1]+dx) for dy,dx in N8 if (p[0]+dy,p[1]+dx) in pts] for p in pts}
    cn = {p: _crossing(p, pts) for p in pts}
    nodes = {p for p in pts if cn[p] != 2}
    used = set()

    def step(prev, cur):
        """Next pixel along the chain, skipping the far side of a staircase corner."""
        cand = [q for q in nbr[cur] if q != prev and frozenset((cur,q)) not in used]
        if len(cand) > 1 and prev is not None:
            far = [q for q in cand if max(abs(q[0]-prev[0]), abs(q[1]-prev[1])) > 1]
            if far: cand = far
        if len(cand) > 1:   # prefer 4-connected, it is the shorter true step
            four = [q for q in cand if abs(q[0]-cur[0]) + abs(q[1]-cur[1]) == 1]
            if four: cand = four
        return cand[0] if cand else None

    def walk(start, first):
        path = [start, first]
        used.add(frozenset((start, first)))
        prev, cur = start, first
        while cur not in nodes:
            nxt = step(prev, cur)
            if nxt is None: break
            used.add(frozenset((cur, nxt)))
            path.append(nxt); prev, cur = cur, nxt
            if cur == start: break
        return path

    polys = []
    for nd in nodes:
        for q in nbr[nd]:
            if frozenset((nd,q)) not in used:
                polys.append(walk(nd, q))
    for p in pts:                                   # isolated cycles: o, e, loops
        if p not in nodes and not any(frozenset((p,q)) in used for q in nbr[p]):
            polys.append(walk(p, nbr[p][0]))
    for p in pts:                                   # lone pixel: a tittle or period
        if not nbr[p]: polys.append([p, p])
    if not polys:
        y, x = next(iter(pts)); polys = [[(y,x),(y,x)]]
    return [np.array(p, float) for p in polys], nodes

def prune(polys, min_len):
    """Drop dead-end branches shorter than min_len (skeletonization spurs)."""
    for _ in range(3):
        ends = {}
        for i, p in enumerate(polys):
            for e in (tuple(p[0]), tuple(p[-1])):
                ends.setdefault(e, []).append(i)
        drop = set()
        for i, p in enumerate(polys):
            a, b = tuple(p[0]), tuple(p[-1])
            if a == b: continue                     # closed loop, never a spur
            attached = len(ends[a]) > 1 or len(ends[b]) > 1
            free = len(ends[a]) == 1 or len(ends[b]) == 1
            length = np.linalg.norm(np.diff(p, axis=0), axis=1).sum()
            if attached and free and length < min_len: drop.add(i)
        if not drop or len(drop) == len(polys): break
        polys = [p for i, p in enumerate(polys) if i not in drop]
    return polys

def smooth(p, sigma=2.4):
    """Gaussian-smooth a polyline. The skeleton is a 1px staircase; a box blur
    left visible facets, so this uses a real gaussian and wraps at the seam for
    closed strokes rather than clamping."""
    if len(p) < 4 or sigma <= 0: return p
    closed = np.allclose(p[0], p[-1])
    pad = int(np.ceil(sigma * 3))
    if closed:
        # Wrap by index so the pad works even when the loop is shorter than it
        # (small counters like the bowl of an 'e' are only a few points long).
        q = p[:-1]; n = len(q)
        ext = q[np.arange(-pad, n + pad) % n]
        out = np.stack([ndi.gaussian_filter1d(ext[:, i], sigma, mode="wrap")
                        for i in (0, 1)], 1)[pad:pad + n]
        out = np.vstack([out, out[:1]])
    else:
        out = np.stack([ndi.gaussian_filter1d(p[:, i], sigma, mode="nearest")
                        for i in (0, 1)], 1)
        out[0], out[-1] = p[0], p[-1]          # keep stroke ends where they were
    return out

def rdp(p, eps):
    if len(p) < 3: return p
    a, b = p[0], p[-1]
    ab = b - a; L = np.linalg.norm(ab)
    if L < 1e-9:
        d = np.linalg.norm(p - a, axis=1)
    else:
        d = np.abs(np.cross(ab, p - a)) / L
    i = int(np.argmax(d))
    if d[i] <= eps: return np.array([a, b])
    return np.vstack([rdp(p[:i+1], eps)[:-1], rdp(p[i:], eps)])

def to_bezier(pts, scale, ox, oy, r=1):
    """Catmull-Rom through pts -> relative cubic path data.

    Emits relative commands (smaller numbers, smaller file) but tracks the
    rounded absolute position so rounding error cannot accumulate along a
    stroke: each delta is measured from where the renderer actually is.
    """
    P = np.stack([(pts[:,1]-ox)*scale, (pts[:,0]-oy)*scale], 1)     # -> (x,y)
    if len(P) < 2:
        x, y = np.round(P[0], r); return f"M{x:g} {y:g}l0.01 0"
    closed = np.allclose(P[0], P[-1]) and len(P) > 3
    q = P[:-1] if closed else P
    n = len(q)
    get = (lambda i: q[i % n]) if closed else (lambda i: q[min(max(i, 0), n-1)])

    cur = np.round(q[0], r)
    out = [f"M{cur[0]:g} {cur[1]:g}"]
    for i in range(n if closed else n-1):
        p0, p1, p2, p3 = get(i-1), get(i), get(i+1), get(i+2)
        # Centripetal (alpha=0.5) knot spacing. RDP leaves points very unevenly
        # spaced, and uniform Catmull-Rom overshoots badly on those, which is
        # what read as jagged/wobbly. Centripetal is cusp- and loop-free.
        d = [max(np.linalg.norm(b-a), 1e-6) ** 0.5 for a, b in
             ((p0,p1), (p1,p2), (p2,p3))]
        t0, t1, t2, t3 = 0.0, d[0], d[0]+d[1], d[0]+d[1]+d[2]
        m1 = (p2-p0)/(t2-t0) if t2 > t0 else (p2-p1)/max(t2-t1, 1e-6)
        m2 = (p3-p1)/(t3-t1) if t3 > t1 else (p2-p1)/max(t2-t1, 1e-6)
        h = t2 - t1
        c1, c2 = p1 + m1*h/3, p2 - m2*h/3
        end = np.round(p2, r)
        d1, d2, d3 = np.round(c1-cur, r), np.round(c2-cur, r), np.round(end-cur, r)
        out.append("c" + " ".join(f"{v:g}" for v in (*d1, *d2, *d3)))
        cur = cur + d3                      # renderer's true position, not p2
    if closed: out.append("z")
    return "".join(out)

def trace_word(mask, scale, ox=0, oy=0, eps=3.0, spur=11.0, dot_max=15,
               sigma=3.2, stroke=4.4):
    """Trace one word to a single path string.

    Works per connected component, for two reasons. Spurs are only meaningful
    relative to the stroke they hang off, and -- the part that bit -- a mark
    small enough to be a tittle or a period skeletonizes into a tiny three-armed
    star whose arms all look like spurs. Pruning globally deleted every arm and
    the mark vanished. Small round components are emitted as a single round-capped
    point at their centroid instead of being skeletonized at all.

    `stroke` is the pen width in source pixels; the cleanup tolerances are all
    expressed in terms of it so they hold at any capture resolution.
    """
    lab, n = ndi.label(mask)
    parts = []
    for i, sl in enumerate(ndi.find_objects(lab), start=1):
        comp = lab[sl] == i
        y0, x0 = sl[0].start, sl[1].start
        if max(comp.shape) <= dot_max:                  # a tittle, period or comma
            cy, cx = ndi.center_of_mass(comp)
            parts.append(to_bezier(np.array([[cy + y0, cx + x0]]), scale, ox, oy))
            continue
        polys, _ = skel_graph(comp)
        polys = prune(polys, spur)
        if not polys:                                   # never drop a whole mark
            polys, _ = skel_graph(comp)
            polys = [max(polys, key=len)] if polys else []
        polys = clean.weld_ends(polys, stroke * 1.6)
        polys = clean.drop_specks(polys, stroke * 1.2, (stroke * 1.9) ** 2)
        polys = clean.close_bowls(polys, max_gap=stroke * 6)
        for q in polys:
            q = q + [y0, x0]
            parts.append(to_bezier(rdp(smooth(q, sigma), clean.facet_eps(q, eps)),
                                   scale, ox, oy))
    return "".join(parts)
