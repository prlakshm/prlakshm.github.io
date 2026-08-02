#!/usr/bin/env python3
"""
Reconstruct the UI hidden behind the iPhone Dynamic Island in the Mixr screen
recordings.

The island is a hardware cutout, so the app never draws there — but the app
lays its Controls column out edge to edge (a bare .ignoresSafeArea on the
screen body), which puts two of the volume sliders underneath it. Nothing in
any frame ever reveals them.

What makes reconstruction legitimate rather than invention: the volumes are
left at their import defaults, so every slider in a clip is at the SAME value.
A visible row is therefore an exact template for a hidden one — same geometry,
same thumb position, only the hue differs.

Method, per frame:

  1. Locate the island. It is hardware, so it does not move; it is still
     re-detected per frame and the result asserted against the expected box,
     because a silent drift would corrupt every later step.

  Pass A — background. Extend the columns immediately left of the island
  rightwards across it. Between the rows the Controls column has no vertical
  structure, so this reconstructs the ground and its hairline dividers exactly.
  Runs on every frame, including ones with no Controls column at all.

  Pass B — sliders, painted over Pass A.
  2. Find the Controls rows from the S/M buttons. They sit LEFT of the island
     and are never occluded, so they give reliable row centres even while the
     track list scrolls.
  3. Read each row's track colour from its waveform lane, left of the column.
     Self-correcting: if the list scrolls and a different song occupies a row,
     the colour follows it.
  4. For each occluded row, take the nearest unoccluded row as donor, retarget
     its hue to the occluded row's colour, and composite its INK — not its
     rectangle — but only inside the island mask, so no real pixel is ever
     overwritten.

Grey pixels (the speaker glyph, the track groove) have near-zero saturation and
are left alone by the hue retarget, which is why this is done in HSV rather
than by channel swapping.

Usage:  fill.py <in.mp4> <out.mp4> [--probe N]
"""

import subprocess
import sys
import os
import numpy as np

W, H = 1800, 828
FPS = 30

# Island box, measured across both clips and both ends of each (±2px, which is
# compression noise on the rounded edge). Verified per frame against this.
ISL = dict(x0=1688, x1=1776, y0=280, y1=548)
ISL_TOL = 14

SM_X0, SM_X1 = 1300, 1420      # the S / M buttons — always visible
LANE_X0, LANE_X1 = 1000, 1180  # waveform lanes, for reading a row's colour
SLICE_X0, SLICE_X1 = 1640, 1795  # the slider strip we transplant
ROW_HALF = 16                  # slider is thumbHeight+2 = 16pt tall

# Background donors, one strip either side of the island. Sampling BOTH sides
# matters during the Files sheet: there the island's left edge lands inside an
# album thumbnail, so a left-only donor drags stripes of cover art across the
# cutout. The right strip clears the slider's own glow (which dies out by
# x 1784) and is plain sheet background all the way to the screen edge.
DON_L0, DON_L1 = 1679, 1686
DON_R0, DON_R1 = 1788, 1796
FLAT_TOL = 46                  # max channel spread within a donor strip


# ----------------------------------------------------------------- io --------

def duration_of(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", path], capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def read_frames(path):
    """Decoded at a FIXED rate on purpose. The simulator writes a variable-rate
    file — build-now is 46 frames spread over 10.3s — so decoding natively and
    re-encoding at a constant rate plays the clip back four times too fast.
    Normalising to CFR here means frames in == frames out == duration held."""
    p = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-vf", f"fps={FPS}",
         "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        capture_output=True, check=True)
    buf = np.frombuffer(p.stdout, np.uint8)
    n = buf.size // (W * H * 3)
    return buf[: n * W * H * 3].reshape(n, H, W, 3)


def write_frames(frames, path, fps=FPS):
    p = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y",
         "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(fps),
         "-i", "-", "-an",
         "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p",
         "-crf", "25", "-preset", "slow", "-movflags", "+faststart", path],
        stdin=subprocess.PIPE)
    for f in frames:
        p.stdin.write(np.ascontiguousarray(f, dtype=np.uint8).tobytes())
    p.stdin.close()
    if p.wait() != 0:
        raise RuntimeError("encode failed")


# ------------------------------------------------------------ detection ------

def island_mask(fr):
    """Opaque-black blob on the right. Returned dilated by 2px so the
    anti-aliased rim is repainted too — leaving it produces a dark outline
    exactly where the eye is looking for a seam."""
    m = fr.max(axis=2) <= 14
    box = np.zeros_like(m)
    box[ISL["y0"]:ISL["y1"] + 1, ISL["x0"]:ISL["x1"] + 1] = True
    m &= box
    out = m.copy()
    for d in (1, 2):
        out |= np.roll(m, d, 0) | np.roll(m, -d, 0) | np.roll(m, d, 1) | np.roll(m, -d, 1)
    return out, m


def island_ok(m):
    if m.sum() < 8000:
        return False
    ys, xs = np.where(m)
    return (abs(xs.min() - 1692) < ISL_TOL and abs(xs.max() - 1772) < ISL_TOL
            and abs(ys.min() - 285) < ISL_TOL and abs(ys.max() - 543) < ISL_TOL)


def row_centres(fr):
    """Row centres from the S/M button band."""
    band = fr[:, SM_X0:SM_X1].astype(int)
    prof = (band.sum(axis=2) / 3).mean(axis=1)
    if prof.max() < 20:
        return []
    hot = np.where(prof > prof.max() * 0.55)[0]
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


def whole_row(fr, y, bg):
    """Is this row's slider fully inside its own band, with clearance?

    A row can be detected from its S/M buttons while its slider is half cut off
    — by the Effects drawer at the bottom of the Controls column, or by the
    ruler at the top. That happens on every scroll, and transplanting such a
    row paints a squashed slider sitting on a slab of drawer chrome onto the
    rows below the island.

    The slider is 14pt in a 32pt band, so a whole one leaves the outer few
    scanlines empty. Ink running to the band edge means the band is holding
    something that is not just this slider.
    """
    y0, y1 = y - ROW_HALF, y + ROW_HALF
    if y0 < 0 or y1 > H:
        return False
    patch = fr[y0:y1, SLICE_X0:SLICE_X1].astype(np.float64)
    ink = np.abs(patch - np.median(bg[y0:y1], axis=0)).max(axis=2) > 12
    edge = np.concatenate([ink[:4], ink[-4:]])
    return edge.mean() < 0.05


def lane_colour(fr, y):
    """Dominant saturated colour of the waveform lane at this row."""
    strip = fr[max(0, y - 18):y + 18, LANE_X0:LANE_X1].astype(int)
    mx, mn = strip.max(axis=2), strip.min(axis=2)
    sel = (mx - mn) > 55
    if sel.sum() < 60:
        return None
    px = strip[sel]
    return np.median(px, axis=0)


# ------------------------------------------------------------- colour --------

def rgb_to_hsv(a):
    a = a.astype(np.float64) / 255.0
    mx, mn = a.max(-1), a.min(-1)
    d = mx - mn
    h = np.zeros_like(mx)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    nz = d > 1e-9
    im = np.argmax(a, -1)
    with np.errstate(invalid="ignore", divide="ignore"):
        h = np.where(nz & (im == 0), ((g - b) / d) % 6, h)
        h = np.where(nz & (im == 1), ((b - r) / d) + 2, h)
        h = np.where(nz & (im == 2), ((r - g) / d) + 4, h)
    h = h / 6.0
    s = np.where(mx > 1e-9, d / np.maximum(mx, 1e-9), 0)
    return np.stack([h, s, mx], -1)


def hsv_to_rgb(a):
    h, s, v = a[..., 0] % 1.0, np.clip(a[..., 1], 0, 1), np.clip(a[..., 2], 0, 1)
    i = np.floor(h * 6).astype(int)
    f = h * 6 - i
    p, q, t = v * (1 - s), v * (1 - f * s), v * (1 - (1 - f) * s)
    i = i % 6
    out = np.zeros(a.shape)
    for k, (rr, gg, bb) in enumerate([(v, t, p), (q, v, p), (p, v, t),
                                      (p, q, v), (t, p, v), (v, p, q)]):
        m = i == k
        out[..., 0] = np.where(m, rr, out[..., 0])
        out[..., 1] = np.where(m, gg, out[..., 1])
        out[..., 2] = np.where(m, bb, out[..., 2])
    return np.clip(out * 255, 0, 255)


def retarget(patch, src_rgb, dst_rgb):
    """Move coloured pixels from the donor hue to the target hue, scaling
    saturation and value by the same ratio the two track colours differ by.
    Greys (s below the floor) pass through untouched."""
    hsv = rgb_to_hsv(patch)
    s_h, s_s, s_v = rgb_to_hsv(np.array(src_rgb).reshape(1, 1, 3))[0, 0]
    d_h, d_s, d_v = rgb_to_hsv(np.array(dst_rgb).reshape(1, 1, 3))[0, 0]
    coloured = hsv[..., 1] > 0.18
    out = hsv.copy()
    out[..., 0] = np.where(coloured, hsv[..., 0] + (d_h - s_h), hsv[..., 0])
    if s_s > 1e-6:
        out[..., 1] = np.where(coloured, np.clip(hsv[..., 1] * (d_s / s_s), 0, 1), hsv[..., 1])
    if s_v > 1e-6:
        out[..., 2] = np.where(coloured, np.clip(hsv[..., 2] * (d_v / s_v), 0, 1), hsv[..., 2])
    return hsv_to_rgb(out)


# --------------------------------------------------------------- fill --------

def fill_frame(fr, stats):
    grown, raw = island_mask(fr)
    if not island_ok(raw):
        stats["island_miss"] += 1
        return fr, False

    out = fr.astype(np.float64).copy()

    # Pass A — background and row dividers.
    # Runs on EVERY frame, including the ones with no Controls column (the
    # Files sheet in the middle of the hero clip). The island is on screen the
    # whole time; skipping those frames left the pill visible for a beat and
    # then made it vanish, which reads worse than leaving it throughout.
    # Between the rows the Controls column has no vertical structure: flat
    # background, plus the occasional horizontal hairline divider. Both are
    # constant along x, so a strip either side of the island reconstructs them.
    # Medians rather than means keep compression speckle out of the fill.
    left = fr[:, DON_L0:DON_L1].astype(np.float64)
    right = fr[:, DON_R0:DON_R1].astype(np.float64)
    med_l, med_r = np.median(left, axis=1), np.median(right, axis=1)   # (H, 3)
    # A strip is usable only where it is flat. Structure inside it means it is
    # sitting on content — an album thumbnail, a filename — and extending that
    # sideways invents detail rather than restoring it.
    flat_l = (left.max(axis=1).max(axis=1) - left.min(axis=1).min(axis=1)) < FLAT_TOL
    flat_r = (right.max(axis=1).max(axis=1) - right.min(axis=1).min(axis=1)) < FLAT_TOL

    ys, xs = np.where(grown)
    # Ramp between the two strips where both are usable, so a horizontal
    # gradient across the cutout survives; fall back to whichever single strip
    # is flat. Where the two agree — every ordinary frame — the ramp is a
    # constant and this is identical to a plain fill.
    t = ((xs - DON_L1) / float(DON_R0 - DON_L1))[:, None]
    both = flat_l[ys] & flat_r[ys]
    only_l = flat_l[ys] & ~flat_r[ys]
    only_r = flat_r[ys] & ~flat_l[ys]
    out[ys[both], xs[both]] = ((1 - t[both]) * med_l[ys[both]]
                               + t[both] * med_r[ys[both]])
    out[ys[only_l], xs[only_l]] = med_l[ys[only_l]]
    out[ys[only_r], xs[only_r]] = med_r[ys[only_r]]
    bg = np.where(flat_l[:, None], med_l, med_r)   # per-row ground for Pass B
    stats["rows_no_donor"] += int((~flat_l & ~flat_r)[ISL["y0"]:ISL["y1"]].sum())

    # Pass B — the sliders themselves, painted over the background above.
    centres = row_centres(fr)
    iy0, iy1 = ISL["y0"], ISL["y1"]
    occluded = [y for y in centres if iy0 - ROW_HALF < y < iy1 + ROW_HALF]
    clear    = [y for y in centres if y not in occluded]
    if len(centres) < 2:
        stats["no_rows"] += 1
        return np.clip(out, 0, 255).astype(np.uint8), True
    if not occluded:
        stats["nothing_to_do"] += 1
        return np.clip(out, 0, 255).astype(np.uint8), True
    clear = [c for c in clear if whole_row(fr, c, bg)]
    stats["donors_clipped"] += len([c for c in centres
                                    if c not in occluded]) - len(clear)
    if not clear:
        stats["no_donor"] += 1
        return np.clip(out, 0, 255).astype(np.uint8), True

    did = 0
    for y in occluded:
        donor = min(clear, key=lambda c: abs(c - y))
        src_c = lane_colour(fr, donor)
        dst_c = lane_colour(fr, y)
        if src_c is None or dst_c is None:
            continue
        dy0, dy1 = donor - ROW_HALF, donor + ROW_HALF
        ty0, ty1 = y - ROW_HALF, y + ROW_HALF
        if dy0 < 0 or dy1 > H or ty0 < 0 or ty1 > H:
            continue
        patch = fr[dy0:dy1, SLICE_X0:SLICE_X1].astype(np.float64)
        shifted = retarget(patch, src_c, dst_c)

        # Paint the slider's INK, not the donor's whole rectangle. Transplanting
        # the strip wholesale drags the donor row's background across with it,
        # which overwrites the correct background Pass A just laid down and
        # leaves a visible dark box around every reconstructed slider.
        # Alpha comes from how far each donor pixel departs from the donor row's
        # own background, so anti-aliased edges feather instead of stepping.
        donor_bg = np.median(bg[dy0:dy1], axis=0)
        ink = np.abs(patch - donor_bg).max(axis=2)
        alpha = np.clip((ink - 4.0) / 26.0, 0.0, 1.0)[..., None]

        sub = grown[ty0:ty1, SLICE_X0:SLICE_X1][..., None]
        tgt = out[ty0:ty1, SLICE_X0:SLICE_X1]
        out[ty0:ty1, SLICE_X0:SLICE_X1] = np.where(
            sub, alpha * shifted + (1 - alpha) * tgt, tgt)
        did += 1
    stats["filled"] += 1
    stats["rows_filled"] += did
    return np.clip(out, 0, 255).astype(np.uint8), True


def main():
    src, dst = sys.argv[1], sys.argv[2]
    probe = None
    if "--probe" in sys.argv:
        probe = int(sys.argv[sys.argv.index("--probe") + 1])

    frames = read_frames(src)
    print(f"{os.path.basename(src)}: {len(frames)} frames")
    stats = dict(filled=0, rows_filled=0, island_miss=0, no_rows=0,
                 nothing_to_do=0, no_donor=0, rows_no_donor=0, donors_clipped=0)
    out = []
    for i, f in enumerate(frames):
        g, _ = fill_frame(f, stats)
        out.append(g)
        if probe is not None and i == probe:
            from PIL import Image
            Image.fromarray(f).save("/tmp/probe_before.png")
            Image.fromarray(g).save("/tmp/probe_after.png")
    print("  " + "  ".join(f"{k}={v}" for k, v in stats.items()))
    write_frames(out, dst)
    print(f"  -> {dst}  {os.path.getsize(dst)//1024}KB")


if __name__ == "__main__":
    main()
