#!/usr/bin/env python3
"""
Reconstruct the UI hidden behind the iPhone Dynamic Island in the Mixr screen
recordings.

The island is a hardware cutout, so the app never draws there — but the app
lays its Controls column out edge to edge (a bare .ignoresSafeArea on the
screen body), which puts two of the volume sliders underneath it. Nothing in
any frame ever reveals them.

Not every clip has a slider back there. In effect-tray the project holds one
track, whose row sits well above the cutout, so the island covers nothing but
the Controls column's own ground — Pass B correctly reports nothing_to_do on
all 694 frames and Pass A alone clears it. That path is the easy case and the
honest one: the ground is a single flat colour, and the donor strips either
side of the cutout agree on it to 0/255.

What makes reconstruction legitimate rather than invention: the volumes are
left at their import defaults, so every slider in a clip is at the SAME value.
A visible row is therefore an exact template for a hidden one — same geometry,
same thumb position, only the hue differs.

Method, per frame:

  1. Locate the island. It is hardware, so it does not move; it is still
     re-detected per frame and the result asserted against the expected box,
     because a silent drift would corrupt every later step.

  Pass A — background, on EVERY frame. A donor strip either side of the island
  gives the ground colour per scanline; the fill ramps between them, so the
  hairline row dividers and any horizontal gradient carry across unbroken. A
  strip is used only where it is flat, since structure inside it means it is
  sitting on content, and extending content sideways invents detail.

  Pass B — sliders, painted over Pass A, and only while the editor is actually
  on screen (the system Files sheet covers it for two seconds mid-clip).
  2. Find the Controls rows from the track lanes, bounded to the list so the
     Effects tray below the drawer cannot register as a row.
  3. Read each row's track colour from its waveform lane. Self-correcting: if
     the list scrolls and a different song occupies a row, the colour follows.
  4. For each occluded row, take the nearest unoccluded row as donor, retarget
     its hue to the occluded row's colour, and composite its INK — not its
     rectangle — but only inside the island mask, so no real pixel is ever
     overwritten. A donor has to be a complete, unclipped slider; when the
     frame has none, one is borrowed from the nearest frame that does.

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

# Island box, measured across every clip and both ends of each (±2px, which is
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

# The Controls list, between the bottom of the ruler and the top of the Effects
# drawer. Both are fixed chrome in these recordings; check_layout() asserts
# that per clip rather than trusting it. A row straddling either edge is not a
# usable donor — see whole_row().
LIST_Y0, LIST_Y1 = 134, 586
THUMB_X0, THUMB_X1 = 1700, 1790  # where slider ink lives, for presence tests

# The island itself, as a fixed pill — see _pill().
PILL_CX, PILL_R, PILL_PAD = 1732.5, 38.0, 3.0
PILL_Y0, PILL_Y1 = 324, 505    # cap centres


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

def _pill():
    """The island as a constant shape.

    Thresholding it per frame looked more careful but was the opposite: the
    detected edge moved by a pixel or two with the compression noise, so a thin
    ring around the cutout was repainted in some frames and left alone in
    others — 2400 pixels changing hands frame to frame, which is a shimmering
    outline. The island is hardware. It cannot move. One mask for the whole
    clip is both more accurate and perfectly steady.

    Geometry is measured, not assumed: the always-black core across every frame
    of every clip is x 1695..1770, y 286..543, i.e. a pill of radius 38 with
    its cap centres 181px apart. PILL_PAD covers the anti-aliased rim, which
    the profiles show is 1-2px on every side.
    """
    y, x = np.mgrid[0:H, 0:W]
    cy = np.clip(y, PILL_Y0, PILL_Y1)
    return np.sqrt((x - PILL_CX) ** 2 + (y - cy) ** 2) <= PILL_R + PILL_PAD


def island_mask(fr):
    """The constant mask, plus the per-frame detection it is checked against."""
    m = fr.max(axis=2) <= 14
    box = np.zeros_like(m)
    box[ISL["y0"]:ISL["y1"] + 1, ISL["x0"]:ISL["x1"] + 1] = True
    return ISLAND, m & box


ISLAND = _pill()


def island_ok(m):
    if m.sum() < 8000:
        return False
    ys, xs = np.where(m)
    return (abs(xs.min() - 1692) < ISL_TOL and abs(xs.max() - 1772) < ISL_TOL
            and abs(ys.min() - 285) < ISL_TOL and abs(ys.max() - 543) < ISL_TOL)


def controls_visible(fr):
    """Is the editor on screen, rather than the system Files sheet over it?

    Needed because row detection reads the track lanes, and the album grid in
    the picker has rows of its own — without this gate a slider gets painted
    onto the sheet. The test is the Mixr wordmark in the top-left corner: it is
    in every editor frame and covered in every sheet frame, it is nowhere near
    the island, and its contrast is decisive (std ~83 against ~1, and ~62 with
    the sheet halfway out, which is correctly read as still covered)."""
    return fr[25:78, 28:175].astype(np.float64).std() > 70


def row_centres(fr):
    """Row centres from the S/M button band, inside the list only. Without the
    bound the Effects tray below the drawer registers as a sixth row, and being
    the one 'unoccluded row' in a single-track frame it then gets used as the
    donor."""
    band = np.zeros((H, SM_X1 - SM_X0, 3), np.int64)
    band[LIST_Y0:LIST_Y1] = fr[LIST_Y0:LIST_Y1, SM_X0:SM_X1]
    prof = (band.sum(axis=2) / 3).mean(axis=1)
    if prof.max() < 20:
        return []
    # Threshold above the gaps between rows, not as a fraction of the brightest
    # row. Waveforms render in one row at a time as a project loads, so for a
    # few frames one lane is far brighter than the rest; a relative threshold
    # narrows the dimmer row's band until it is discarded, and the slider
    # reconstructed behind the island blinks out for those frames.
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


def whole_row(fr, y):
    """Is this row usable as a donor — a complete, unclipped slider?

    A row keeps being detected from its S/M buttons after its slider has been
    cut in half by the Effects drawer below the list or the ruler above it.
    That happens on every scroll, and transplanting one of those paints a
    squashed slider sitting on a slab of drawer chrome onto the rows behind the
    island — which is exactly the glitch on the yellow and red rows.

    Two conditions: the row's whole band has to lie inside the list, and the
    band has to actually contain slider ink. The second catches the row that is
    scrolled far enough under the drawer to be invisible while its buttons are
    still detectable.
    """
    y0, y1 = y - ROW_HALF, y + ROW_HALF
    if y0 < LIST_Y0 or y1 > LIST_Y1:
        return False
    s = fr[y0:y1, THUMB_X0:THUMB_X1].astype(int)
    mx, mn = s.max(axis=2), s.min(axis=2)
    return ((((mx - mn) > 60) & (mx > 90)).mean(axis=1)).max() > 0.30


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

def find_donor(fr):
    """The row this frame can lend: an unoccluded, unclipped, complete slider,
    plus the track colour to retarget away from. None if the frame has none."""
    iy0, iy1 = ISL["y0"], ISL["y1"]
    for y in row_centres(fr):
        if iy0 - ROW_HALF < y < iy1 + ROW_HALF or not whole_row(fr, y):
            continue
        c = lane_colour(fr, y)
        if c is not None:
            return fr[y - ROW_HALF:y + ROW_HALF, SLICE_X0:SLICE_X1].astype(
                np.float64), c
    return None


def fill_frame(fr, stats, lend=None):
    grown, raw = island_mask(fr)
    if not island_ok(raw):
        stats["island_miss"] += 1
        return fr, False

    out = fr.astype(np.float64).copy()
    editor = controls_visible(fr)

    # Pass A — background and row dividers.
    # Runs on EVERY frame, including the ones with no Controls column (the
    # Files sheet in the middle of the hero clip). The island is on screen the
    # whole time; skipping those frames left the pill visible for a beat and
    # then made it vanish, which reads worse than leaving it throughout.
    # Medians rather than means keep compression speckle out of the fill.
    left = fr[:, DON_L0:DON_L1].astype(np.float64)
    right = fr[:, DON_R0:DON_R1].astype(np.float64)
    med_l, med_r = np.median(left, axis=1), np.median(right, axis=1)   # (H, 3)
    # A strip is usable only where it is flat. Structure inside it means it is
    # sitting on content, and extending that sideways invents detail.
    flat_l = (left.max(axis=1).max(axis=1) - left.min(axis=1).min(axis=1)) < FLAT_TOL
    flat_r = (right.max(axis=1).max(axis=1) - right.min(axis=1).min(axis=1)) < FLAT_TOL
    if not editor:
        # Under the Files sheet the left strip lands inside an album thumbnail,
        # where plenty of 7px windows read as locally flat while their colour
        # changes every scanline — extending those laid bands of smeared cover
        # art across the cutout. The right strip is clear of the grid and is
        # plain sheet background at every row, so it is the only donor here.
        # The thumbnail's own right edge falls at x 1695, three pixels into the
        # island, so this loses nothing of the artwork worth keeping.
        flat_l = np.zeros_like(flat_l)

    ys, xs = np.where(grown)
    # Ramp between the two strips where both are usable, so a horizontal
    # gradient across the cutout survives; fall back to whichever single strip
    # is flat. In the editor the two sides agree closely, so the ramp is very
    # nearly a constant and the row dividers come through unbroken.
    t = ((xs - DON_L1) / float(DON_R0 - DON_L1))[:, None]
    both = flat_l[ys] & flat_r[ys]
    only_l = flat_l[ys] & ~flat_r[ys]
    only_r = flat_r[ys] & ~flat_l[ys]
    out[ys[both], xs[both]] = ((1 - t[both]) * med_l[ys[both]]
                               + t[both] * med_r[ys[both]])
    out[ys[only_l], xs[only_l]] = med_l[ys[only_l]]
    out[ys[only_r], xs[only_r]] = med_r[ys[only_r]]
    stats["rows_no_donor"] += int((~flat_l & ~flat_r)[ISL["y0"]:ISL["y1"]].sum())

    # Pass B — the sliders themselves, painted over the background above.
    if not editor:
        stats["sheet_up"] += 1
        return np.clip(out, 0, 255).astype(np.uint8), True
    centres = row_centres(fr)
    iy0, iy1 = ISL["y0"], ISL["y1"]
    occluded = [y for y in centres if iy0 - ROW_HALF < y < iy1 + ROW_HALF]
    clear    = [y for y in centres if y not in occluded]
    if not centres:
        stats["no_rows"] += 1
        return np.clip(out, 0, 255).astype(np.uint8), True
    if not occluded:
        stats["nothing_to_do"] += 1
        return np.clip(out, 0, 255).astype(np.uint8), True
    clear = [c for c in clear if whole_row(fr, c)]
    stats["donors_clipped"] += len([c for c in centres
                                    if c not in occluded]) - len(clear)
    if not clear and lend is None:
        stats["no_donor"] += 1
        return np.clip(out, 0, 255).astype(np.uint8), True
    if not clear:
        stats["borrowed"] += 1

    did = 0
    for y in occluded:
        dst_c = lane_colour(fr, y)
        if dst_c is None:
            continue
        if clear:
            donor = min(clear, key=lambda c: abs(c - y))
            patch = fr[donor - ROW_HALF:donor + ROW_HALF,
                       SLICE_X0:SLICE_X1].astype(np.float64)
            src_c = lane_colour(fr, donor)
            if src_c is None:
                continue
        else:
            # Nothing in THIS frame shows a slider — the single imported track
            # sits dead centre behind the island. Borrow the nearest frame that
            # does. Legitimate for the same reason the whole method is: the
            # volumes are never touched, so the slider is identical in every
            # frame of the clip; only the hue has to follow this row's track.
            patch, src_c = lend
        ty0, ty1 = y - ROW_HALF, y + ROW_HALF
        if ty0 < 0 or ty1 > H:
            continue
        shifted = retarget(patch, src_c, dst_c)

        # Paint the slider's INK, not the donor's whole rectangle. Transplanting
        # the strip wholesale drags the donor row's background across with it,
        # which overwrites the correct background Pass A just laid down and
        # leaves a visible dark box around every reconstructed slider.
        # Alpha comes from how far each donor pixel departs from the donor row's
        # own background, so anti-aliased edges feather instead of stepping.
        # That background is read off the patch's own outer scanlines rather
        # than the frame — the borrowed donor comes from a different frame and
        # has to carry its own reference with it.
        donor_bg = np.median(
            np.concatenate([patch[:4], patch[-4:]]).reshape(-1, 3), axis=0)
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


def check_layout(frames):
    """LIST_Y1 is a constant, so prove it against the clip before relying on it.
    The Effects drawer is draggable; if a future recording opens it further, the
    donor bound is wrong and rows get rejected (or worse, accepted) silently."""
    tops = []
    for f in frames[::5]:
        lum = f[:, 250:1450].astype(np.float64).mean(axis=(1, 2))
        tops.append(int(np.argmax(np.diff(lum)[500:720])) + 501)
    mode = int(np.bincount(tops).argmax())
    if abs(mode - (LIST_Y1 + 1)) > 3:
        raise SystemExit(
            f"drawer top is {mode}, expected {LIST_Y1 + 1} — re-measure LIST_Y1")
    print(f"  layout ok: drawer top {mode}")


def main():
    src, dst = sys.argv[1], sys.argv[2]
    probe = None
    if "--probe" in sys.argv:
        probe = int(sys.argv[sys.argv.index("--probe") + 1])

    frames = read_frames(src)
    print(f"{os.path.basename(src)}: {len(frames)} frames")
    check_layout(frames)
    stats = dict(filled=0, rows_filled=0, island_miss=0, no_rows=0,
                 nothing_to_do=0, no_donor=0, rows_no_donor=0, donors_clipped=0,
                 borrowed=0, sheet_up=0)

    # Which frame each frame can borrow a slider from. Nearest in time either
    # direction, so the stretch where a single track sits behind the island is
    # covered from whichever side is closer.
    lends = [find_donor(f) if controls_visible(f) else None for f in frames]
    nearest, last = [None] * len(frames), None
    for i in range(len(frames)):
        if lends[i] is not None:
            last = lends[i]
        nearest[i] = last
    last = None
    for i in range(len(frames) - 1, -1, -1):
        if lends[i] is not None:
            last = lends[i]
        elif last is not None and nearest[i] is None:
            nearest[i] = last

    out = []
    for i, f in enumerate(frames):
        g, _ = fill_frame(f, stats, nearest[i])
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
