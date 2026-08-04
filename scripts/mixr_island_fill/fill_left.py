#!/usr/bin/env python3
"""Fill the Dynamic Island on the LEFT edge of the colour-palette recording.

This take was recorded with the phone rotated the other way, so the cutout lands
over the TRACK LIST rather than the Controls column. There is no slider to
transplant and no donor strip that means anything — either side of it is
different content, not the same surface at a different brightness.

What makes it reconstructable is that an earlier take of the SAME PROJECT was
recorded the other way up, putting its cutout on the right and leaving this
sidebar completely clear. The two agree to 0.85/255 everywhere outside the
cutout, so the earlier take is a direct source for what is hidden here. Under
the cutout's footprint that take is static (frame-to-frame change 0.01), so a
median across its frames is both correct and denoised.
"""
import subprocess, sys
import numpy as np

W, H = 1400, 644
CX, R, PAD = 51.5, 30.0, 6.0      # measured off the rim profile, not the solid core
Y0, Y1 = 254.0, 393.0             # cap centres (black runs y226-421 at the axis)
FEATHER = 2.0


def pill(pad=0.0):
    y, x = np.mgrid[0:H, 0:W]
    cy = np.clip(y, Y0, Y1)
    return np.sqrt((x - CX) ** 2 + (y - cy) ** 2) - (R + PAD + pad)


def read(path, vf=""):
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", path] +
                       (["-vf", vf] if vf else []) +
                       ["-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                       capture_output=True, check=True)
    b = np.frombuffer(r.stdout, np.uint8)
    n = b.size // (W * H * 3)
    return b[: n * W * H * 3].reshape(n, H, W, 3)


def write(frames, path):
    p = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
         "-s", f"{W}x{H}", "-r", "30",
         "-color_range", "tv", "-colorspace", "bt709",
         "-color_trc", "iec61966-2-1", "-color_primaries", "bt709",
         "-i", "-", "-an", "-c:v", "libx264", "-profile:v", "high",
         "-pix_fmt", "yuv420p", "-crf", "19", "-preset", "slow",
         "-color_range", "tv", "-colorspace", "bt709",
         "-color_trc", "iec61966-2-1", "-color_primaries", "bt709",
         "-movflags", "+faststart", path], stdin=subprocess.PIPE)
    for f in frames:
        p.stdin.write(np.ascontiguousarray(f, np.uint8).tobytes())
    p.stdin.close()
    if p.wait() != 0:
        raise RuntimeError("encode failed")


def main():
    tgt_p, ref_p, dst = sys.argv[1], sys.argv[2], sys.argv[3]
    tgt = read(tgt_p)
    ref = read(ref_p, f"transpose=1,fps=30,scale={W}:{H}:flags=lanczos")
    print(f"target {len(tgt)} frames   reference {len(ref)} frames")

    d = pill()
    inside = d <= 0
    before = int((tgt[0][inside].max(axis=1) <= 12).sum())

    # prove the two takes are the same layout before borrowing anything
    ring = (d > 6) & (d < 26)
    gap = np.abs(np.median(ref[:, ring].astype(float), axis=0)
                 - np.median(tgt[:, ring].astype(float), axis=0)).mean()
    print(f"  agreement just outside the cutout: {gap:.2f}/255")
    if gap > 4:
        raise SystemExit("the two takes do not align — refusing to transplant")

    plate = np.median(ref.astype(np.float64), axis=0)      # static there, so denoised
    alpha = np.clip((-d) / FEATHER, 0, 1)[..., None]       # soft rim, no seam

    out = []
    for f in tgt:
        g = f.astype(np.float64)
        g = alpha * plate + (1 - alpha) * g
        out.append(np.clip(g, 0, 255).astype(np.uint8))
    after = int((out[0][inside].max(axis=1) <= 12).sum())
    print(f"  cutout pixels: {before} -> {after}")
    write(out, dst)
    print(f"  -> {dst}")


if __name__ == "__main__":
    main()
