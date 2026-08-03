#!/usr/bin/env python3
"""
Island reconstruction for the SFX-menu recording (color-meaning.mp4).

Same problem as fill.py — the Dynamic Island is a hardware cutout the app never
draws into, and the Controls column runs under it — but this clip breaks four of
fill.py's assumptions, so it gets its own driver rather than new branches in a
script that is already validated against three other recordings.

  1. The Effects drawer sits lower here: its top is at y 677, not 587. fill.py's
     LIST_Y1 would reject every row as "straddling the drawer".

  2. fill.py reads row positions off the WAVEFORM LANES (x 1300-1420). That works
     when every track is a song. Here the third track is Sound Effects, whose
     clips are drawn neutral and are short and sparse, so the lanes report one
     row on 112 frames and nonsense on the rest. The S/M buttons are per-row
     chrome that exists whatever the track holds, so rows come from there
     instead — x 1540-1680, giving 191 / 286 / 381 on all 254 frames.

  3. Opening the SFX menu drops a scrim over the editor rather than covering it.
     fill.py's wordmark gate reads that as "the Files sheet is up" and skips the
     slider pass for 142 of 254 frames — the slider would blink out for more than
     half the clip. It has to keep running, dimmed. Measuring the scrim per frame
     (0.473 through the menu, 1.0 either side) and scaling the donor tests by it
     means the donor is taken from the SAME frame, so the dim carries across with
     the transplant instead of having to be re-applied.

  4. The occluded SFX row has no lane colour to read — its clips are drawn
     neutral, carrying no hue at all. Its colour is taken from the quarter of its
     own slider the cutout leaves visible, and MixrColors.sfxMenuLavender is what
     confirms that quarter is the track colour: measured (181,170,222) against
     the constant's (201,185,244) — the same hue and saturation, the slider
     rendering at 0.90 of the pure value.

  5. fill.py can transplant a slider unshifted because in those recordings every
     track sat at its default volume. Here the SFX track is louder — its thumb is
     10px right of the song rows'. The donor is resampled rather than moved: the
     speaker icon stays where that row draws it and the filled bar stretches to
     reach the row's own thumb, which is the difference a volume actually makes.

Rows 286 and 381 are the occluded ones (18% and 53% of their slider strips).
Row 191 is clear on every frame and is the donor.

Usage:  fill_sfx.py <in.mp4> <out.mp4> [--probe N]
"""

import os
import subprocess
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fill as F                      # pill mask, hsv, retarget, io

W, H, FPS = F.W, F.H, F.FPS
OUT_W, OUT_H = 1400, 644              # the shipped asset's size

# --- what differs from fill.py, all measured off this clip -------------------
LIST_Y0, LIST_Y1 = 134, 676           # drawer top asserted at 677
SM_X0, SM_X1 = 1540, 1680             # the S / M circles — per-row, always drawn
LANE_X0, LANE_X1 = 1000, 1180         # bright waveform, for a song row's colour
CHROME = (slice(160, 400), slice(1540, 1680))   # never occluded, never covered
SLIVER_X0, SLIVER_X1 = 1771, 1800     # the slider that survives right of the pill

# MixrColors.sfxMenuLavender, MixrColors.swift:97. The SFX track's clips are
# drawn neutral, so this is the only place its colour is stated.
SFX_LAVENDER = np.array([0xC9, 0xB9, 0xF4], float)
SFX_ROW = 381


def dim_of(fr):
    """Per-frame scrim factor, from chrome the cutout and the menu never touch."""
    lvl = np.array([f[CHROME].mean() for f in fr])
    return lvl / np.percentile(lvl, 95)


def row_centres(f):
    """Rows from the S/M band. Same shape as fill.py's, different evidence."""
    band = np.zeros((H, SM_X1 - SM_X0, 3), np.int64)
    band[LIST_Y0:LIST_Y1] = f[LIST_Y0:LIST_Y1, SM_X0:SM_X1]
    prof = (band.sum(axis=2) / 3).mean(axis=1)
    if prof.max() < 20:
        return []
    base = np.percentile(prof[LIST_Y0:LIST_Y1], 20)
    hot = np.where(prof > base + 0.30 * (prof.max() - base))[0]
    if not len(hot):
        return []
    groups, start, prev = [], hot[0], hot[0]
    for r in hot[1:]:
        if r - prev > 8:
            groups.append((start, prev))
            start = r
        prev = r
    groups.append((start, prev))
    return [(a + b) // 2 for a, b in groups if b - a > 10]


def whole_row(f, y, dim):
    """fill.py's test with its two absolute thresholds scaled by the scrim, so a
    donor that is merely dimmed still counts and one that is actually clipped
    still does not."""
    y0, y1 = y - F.ROW_HALF, y + F.ROW_HALF
    if y0 < LIST_Y0 or y1 > LIST_Y1:
        return False
    s = f[y0:y1, F.THUMB_X0:F.THUMB_X1].astype(int)
    mx, mn = s.max(axis=2), s.min(axis=2)
    return ((((mx - mn) > 60 * dim) & (mx > 90 * dim)).mean(axis=1)).max() > 0.30


def lane_colour(f, y, dim):
    strip = f[max(0, y - 18):y + 18, LANE_X0:LANE_X1].astype(int)
    mx, mn = strip.max(axis=2), strip.min(axis=2)
    sel = (mx - mn) > 55 * dim
    if sel.sum() < 60:
        return None
    return np.median(strip[sel], axis=0)


STRIP_X0, STRIP_X1 = 1690, 1800       # a row's whole slider, cutout and all


def slider_colour(f, y, dim):
    """A row's own thumb colour, read from whatever of that row's slider the
    cutout leaves visible.

    Every row is sampled the same way, which is the point: retarget() scales the
    donor by the RATIO of two colours, so donor and target have to be measured
    off the same kind of thing. Reading the donor's thumb against the target's
    groove is what put the first reconstruction 20% too bright. Row 381 has only
    25% of its strip visible and it is still enough — the thumb sits in it."""
    s = f[y - 14:y + 14, STRIP_X0:STRIP_X1].astype(float)
    vis = ~F.ISLAND[y - 14:y + 14, STRIP_X0:STRIP_X1]
    sat = s.max(axis=2) - s.min(axis=2)
    m = vis & (sat > 20 * dim)
    if m.sum() < 20:
        return None
    return np.median(s[vis & (sat >= np.percentile(sat[m], 70))], axis=0)


def thumb_x(f, y, dim):
    """Where a row's slider thumb actually sits, from the visible part of its own
    strip. The thumb is the tallest bright column in it."""
    strip = f[y - 14:y + 14, STRIP_X0:STRIP_X1].astype(float)
    vis = ~F.ISLAND[y - 14:y + 14, STRIP_X0:STRIP_X1]
    col = np.where(vis, strip.max(axis=2), 0).sum(axis=0) / np.maximum(vis.sum(axis=0), 1)
    if col.max() < 60 * dim:
        return None
    return STRIP_X0 + int(np.argmax(col))


def groove_span(fr, dim, donor):
    """Where the donor's groove starts and where its thumb sits.

    A volume slider is an icon, then a flat filled bar, then the thumb, then the
    unfilled tail. Raising the volume moves the THUMB and lengthens the BAR — it
    does not move the icon. Both edges are read off the donor's own profile: the
    bar is the long flat plateau left of the peak."""
    clear = np.where(dim > 0.85)[0]
    prof = np.median([fr[i][donor - 14:donor + 14, STRIP_X0:STRIP_X1]
                      .astype(float).max(axis=2).mean(axis=0) for i in clear], axis=0)
    thumb = STRIP_X0 + int(np.argmax(prof))
    band = np.where((prof > 0.30 * prof.max()) & (prof < 0.62 * prof.max()))[0]
    band = band[band < (thumb - STRIP_X0) - 3]
    runs, start, prev = [], band[0], band[0]
    for i in band[1:]:
        if i - prev > 1:
            runs.append((start, prev))
            start = i
        prev = i
    runs.append((start, prev))
    a, b = max(runs, key=lambda r: r[1] - r[0])
    return STRIP_X0 + a, thumb


def thumb_offsets(fr, dim, rows, donor):
    """How far each row's thumb sits from the donor's.

    fill.py could skip this: in those recordings every track was imported and
    left at the default volume, so one slider was an exact template for another.
    Not here — the SFX track is louder, and its thumb sits 10px right of the two
    song rows'. Transplanting the donor unshifted left the reconstructed groove
    ending short of the row's own thumb, which is still visible past the cutout,
    with a gap between them.

    Measured per row on the clear frames, and only where that row's thumb is
    itself visible; a row whose thumb the cutout swallows gets no shift, because
    nothing in the clip says where it is."""
    clear = np.where(dim > 0.85)[0]
    base = [thumb_x(fr[i], donor, 1.0) for i in clear]
    base = [b for b in base if b is not None]
    if not base:
        return {y: 0 for y in rows}
    d0 = int(np.median(base))
    out = {}
    for y in rows:
        seen = [thumb_x(fr[i], y, 1.0) for i in clear]
        seen = [v for v in seen if v is not None]
        out[y] = int(np.median(seen)) - d0 if seen else 0
    return out


def donor_patch(f, donor, dx, groove0, thumb0):
    """The donor's slider, resampled so it reads at THIS row's volume.

    Translating the whole strip instead — which is what the first attempt did —
    carries the speaker icon along with the thumb. The icon then sits 10px right
    of where that row really draws it, the bar between them is 10px short, and
    the row's own icon edge surviving outside the cutout is left stranded beside
    the reconstructed one. So the map is piecewise: identity up to the start of
    the bar, the bar stretched to reach the row's thumb, and the thumb and tail
    carried across."""
    xs = np.arange(F.SLICE_X0, F.SLICE_X1)
    src = np.where(
        xs <= groove0, xs,
        np.where(xs <= thumb0 + dx,
                 groove0 + (xs - groove0) * (thumb0 - groove0)
                          / max(thumb0 + dx - groove0, 1),
                 xs - dx))
    src = np.clip(np.rint(src).astype(int), 0, W - 1)
    return f[donor - F.ROW_HALF:donor + F.ROW_HALF, src].astype(np.float64)


def track_colours(fr, dim, rows):
    """One colour per row for the whole clip, measured on the clear frames.

    Per-frame reads are not needed and mostly not possible. The menu panel sits
    over the waveform lanes, so through the scrim they carry a peak saturation of
    19 and every lane read returns nothing; and the scrim is a flat luminance
    scale — 0.47-0.50 on all three rows — which cancels out of both ratios
    retarget() applies. A colour measured on a clear frame therefore recolours a
    dimmed donor into a correspondingly dimmed slider on its own.

    Nothing here comes from the SFX track's clips: they are drawn neutral and
    carry no hue at all. It comes from the SFX slider itself."""
    clear = np.where(dim > 0.85)[0]
    out = {}
    for y in rows:
        seen = [c for c in (slider_colour(fr[i], y, 1.0) for i in clear) if c is not None]
        out[y] = np.median(seen, axis=0) if seen else None
    return out


def sliver(f, y, dim):
    """The part of a row's real slider that survives right of the cutout."""
    s = f[y - 14:y + 14, SLIVER_X0:SLIVER_X1].astype(float)
    mx, mn = s.max(axis=2), s.min(axis=2)
    sel = (mx - mn) > 30 * dim
    if sel.sum() < 8:
        return None
    return np.median(s[sel], axis=0)


# ------------------------------------------------------------- validation ----

def check_layout(fr, dim):
    tops = []
    for f in fr[::3]:
        lum = f[:, 250:1450].astype(np.float64).mean(axis=(1, 2))
        tops.append(int(np.argmax(np.diff(lum)[500:720])) + 501)
    mode = int(np.bincount(tops).argmax())
    if abs(mode - (LIST_Y1 + 1)) > 3:
        raise SystemExit(f"drawer top is {mode}, expected {LIST_Y1 + 1}")

    seen = {tuple(row_centres(f)) for f in fr}
    if len(seen) != 1:
        raise SystemExit(f"rows are not stable across the clip: {seen}")
    # The drawer's own chrome falls inside the S/M band and reads as a band of
    # its own. It carries no slider, so whole_row() would refuse it as a donor
    # anyway; dropping it here keeps the row list honest.
    rows = [y for y in seen.pop() if whole_row(fr[0], y, 1.0)
            or (F.ISL["y0"] - F.ROW_HALF < y < F.ISL["y1"] + F.ROW_HALF)]
    print(f"  layout ok: drawer top {mode}, rows {rows}")
    return rows


def check_sfx_hue(cols, dim):
    """The lavender is reconstructed from the visible quarter of the SFX row's
    own slider. MixrColors.sfxMenuLavender is what says that quarter really is
    the SFX track colour and not a highlight or a neighbour bleeding in."""
    med = cols[SFX_ROW]
    if med is None:
        raise SystemExit("no visible part of the SFX slider to measure")
    a = F.rgb_to_hsv(med.reshape(1, 1, 3))[0, 0]
    b = F.rgb_to_hsv(SFX_LAVENDER.reshape(1, 1, 3))[0, 0]
    dh = min(abs(a[0] - b[0]), 1 - abs(a[0] - b[0])) * 360
    ds = abs(a[1] - b[1])
    print(f"  sfx hue check: measured {med.round(0)} vs sfxMenuLavender "
          f"{SFX_LAVENDER.astype(int)} — hue {dh:.1f}deg, sat {ds:.3f} apart")
    if dh > 12 or ds > 0.06:
        raise SystemExit("the SFX slider does not agree with sfxMenuLavender")


# -------------------------------------------------------------- the fill -----

def fill_frame(f, dim, rows, cols, offs, span, stats):
    grown, raw = F.island_mask(f)
    if not F.island_ok(raw):
        stats["island_miss"] += 1
        return f

    out = f.astype(np.float64).copy()

    # Pass A — background, unchanged from fill.py: a donor strip either side of
    # the cutout gives the ground per scanline and the fill ramps between them.
    left = f[:, F.DON_L0:F.DON_L1].astype(np.float64)
    right = f[:, F.DON_R0:F.DON_R1].astype(np.float64)
    med_l, med_r = np.median(left, axis=1), np.median(right, axis=1)
    flat_l = (left.max(axis=1).max(axis=1) - left.min(axis=1).min(axis=1)) < F.FLAT_TOL
    flat_r = (right.max(axis=1).max(axis=1) - right.min(axis=1).min(axis=1)) < F.FLAT_TOL
    ys, xs = np.where(grown)
    t = ((xs - F.DON_L1) / float(F.DON_R0 - F.DON_L1))[:, None]
    both, only_l, only_r = (flat_l[ys] & flat_r[ys],
                            flat_l[ys] & ~flat_r[ys], flat_r[ys] & ~flat_l[ys])
    out[ys[both], xs[both]] = (1 - t[both]) * med_l[ys[both]] + t[both] * med_r[ys[both]]
    out[ys[only_l], xs[only_l]] = med_l[ys[only_l]]
    out[ys[only_r], xs[only_r]] = med_r[ys[only_r]]

    # Pass B — the sliders, over the background above. Donor from THIS frame, so
    # whatever the scrim is doing to the rest of the column it does to this too.
    iy0, iy1 = F.ISL["y0"], F.ISL["y1"]
    occluded = [y for y in rows if iy0 - F.ROW_HALF < y < iy1 + F.ROW_HALF]
    clear = [y for y in rows if y not in occluded and whole_row(f, y, dim)]
    if not occluded:
        stats["nothing_to_do"] += 1
        return np.clip(out, 0, 255).astype(np.uint8)
    if not clear:
        stats["no_donor"] += 1
        return np.clip(out, 0, 255).astype(np.uint8)

    for y in occluded:
        dst_c = cols.get(y)
        donor = min(clear, key=lambda c: abs(c - y))
        src_c = cols.get(donor)
        if dst_c is None or src_c is None:
            stats["no_colour"] += 1
            continue
        patch = donor_patch(f, donor, offs.get(y, 0), *span)
        shifted = F.retarget(patch, src_c, dst_c)
        # the slider's INK only, alpha from how far each donor pixel departs from
        # the donor row's own background — never the donor's rectangle, which
        # would overwrite the ground Pass A just laid down
        donor_bg = np.median(np.concatenate([patch[:4], patch[-4:]]).reshape(-1, 3), axis=0)
        alpha = np.clip((np.abs(patch - donor_bg).max(axis=2) - 4.0) / 26.0, 0, 1)[..., None]
        ty0, ty1 = y - F.ROW_HALF, y + F.ROW_HALF
        sub = grown[ty0:ty1, F.SLICE_X0:F.SLICE_X1][..., None]
        tgt = out[ty0:ty1, F.SLICE_X0:F.SLICE_X1]
        out[ty0:ty1, F.SLICE_X0:F.SLICE_X1] = np.where(
            sub, alpha * shifted + (1 - alpha) * tgt, tgt)
        stats["rows_filled"] += 1
    stats["filled"] += 1
    return np.clip(out, 0, 255).astype(np.uint8)


def write(frames, path):
    """Filled at 1800x828 where every constant was measured, encoded once at the
    shipped size."""
    p = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
         "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-an",
         "-vf", f"scale={OUT_W}:{OUT_H}:flags=lanczos",
         "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p",
         "-crf", "25", "-preset", "slow", "-movflags", "+faststart", path],
        stdin=subprocess.PIPE)
    for f in frames:
        p.stdin.write(np.ascontiguousarray(f, dtype=np.uint8).tobytes())
    p.stdin.close()
    if p.wait() != 0:
        raise RuntimeError("encode failed")


def main():
    src, dst = sys.argv[1], sys.argv[2]
    probe = int(sys.argv[sys.argv.index("--probe") + 1]) if "--probe" in sys.argv else None

    fr = F.read_frames(src)
    dim = dim_of(fr)
    print(f"{os.path.basename(src)}: {len(fr)} frames, "
          f"scrim {dim.min():.3f}-{dim.max():.3f} on {(dim < .85).sum()} of them")
    rows = check_layout(fr, dim)
    cols = track_colours(fr, dim, rows)
    check_sfx_hue(cols, dim)
    donor = min(y for y in rows
                if not (F.ISL["y0"] - F.ROW_HALF < y < F.ISL["y1"] + F.ROW_HALF))
    offs = thumb_offsets(fr, dim, rows, donor)
    span = groove_span(fr, dim, donor)
    print(f"  donor groove starts x{span[0]}, thumb x{span[1]}; offsets " +
          "  ".join(f"y{y}={v:+d}px" for y, v in offs.items()))
    print("  track colours: " + "  ".join(
        f"y{y}={None if c is None else c.round(0).astype(int)}" for y, c in cols.items()))

    stats = dict(filled=0, rows_filled=0, island_miss=0, nothing_to_do=0,
                 no_donor=0, no_colour=0)
    out = []
    for i, f in enumerate(fr):
        g = fill_frame(f, dim[i], rows, cols, offs, span, stats)
        out.append(g)
        if probe is not None and i == probe:
            from PIL import Image
            Image.fromarray(f).save("/tmp/probe_before.png")
            Image.fromarray(g).save("/tmp/probe_after.png")
    print("  " + "  ".join(f"{k}={v}" for k, v in stats.items()))
    write(out, dst)
    print(f"  -> {dst}  {os.path.getsize(dst)//1024}KB")


if __name__ == "__main__":
    main()
