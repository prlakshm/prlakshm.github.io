#!/usr/bin/env python3
"""
Candidate source loops for the "Hear the Effects" A/B.

The shipped loop does not work, and the reason is measurable rather than a
matter of taste: it is a dense four-on-the-floor with a hat on every 16th and
no gaps, and two thirds of its energy sits above 4 kHz. Reverb and echo have
nowhere to be heard — the tail and the repeats land on top of more loop — so
echo comes back correlating 0.96 with the dry signal and flanger 0.81. Blur is
the only one that reads, because it is the only effect that does not need
empty space to be audible.

What each effect needs from the source, which is what these candidates are
built around:

  reverb   transients followed by SILENCE. The tail only exists in the gap.
  echo     isolated hits, at least a beat of room after each one.
  pitch    a clear monophonic tonal line — an interval you can actually sing.
  flanger  something sustained and broadband for the notches to sweep through.
  blur     bright top end that can visibly disappear.

One loop has to serve all five, so each candidate below is sparse on purpose
and carries a tonal line, a sustained bed and a bright top.

Usage:  variants.py [outdir]     (default: scratch dir, does not touch public/)
"""

import os
import subprocess
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import generate as G          # SR, BEAT, tone/kick/hat/clap, the effect chain

SR   = G.SR
BPM  = 103.0
BEAT = 60.0 / BPM
BARS = 2
TAIL = 1.60                # room for a tail or a repeat to ring out
N    = int(round((BEAT * 4 * BARS + TAIL) * SR))

# B minor, same key the page already claims.
B2, D3, Fs3, A3, B3, Fs4, D4, A4 = 61.74, 73.42, 92.50, 110.0, 123.47, 185.0, 146.83, 220.0


def _blank():
    return np.zeros(N)


def _place(x, seg, at):
    i = int(at * SR)
    j = min(N, i + len(seg))
    if i < N:
        x[i:j] += seg[: j - i]
    return x


def _tone(freq, start, dur, amp, kind="saw", detune=0.0, curve=3.0):
    """generate.tone writes into a buffer of generate.N; re-render at our length."""
    old_N, old_t = G.N, G.t
    G.N, G.t = N, np.arange(N) / SR
    try:
        return G.tone(freq, start, dur, amp, kind, detune, curve=curve)
    finally:
        G.N, G.t = old_N, old_t


def _perc(fn, *a, **kw):
    old_N, old_t = G.N, G.t
    G.N, G.t = N, np.arange(N) / SR
    try:
        return fn(*a, **kw)
    finally:
        G.N, G.t = old_N, old_t


def _pad(freqs, start, dur, amp):
    """Sustained bed. Flanger needs something continuous to comb through."""
    out = _blank()
    for k, f in enumerate(freqs):
        out += _tone(f, start, dur, amp, "saw", detune=0.006 + 0.002 * k, curve=0.35)
    return out


# --------------------------------------------------------------- candidates --

def cand_a():
    """A — Sparse stabs. Maximum silence: one hit, then a beat and a half of
    nothing. Built for reverb and echo above everything else."""
    x = _blank()
    for bar in range(BARS):
        s = bar * 4 * BEAT
        x += _perc(G.kick, s, 0.95)
        x += _perc(G.kick, s + 2 * BEAT, 0.80)
        x += _perc(G.clap, s + 1 * BEAT, 0.40)
        x += _perc(G.clap, s + 3 * BEAT, 0.40)
        x += _perc(G.hat, s + 0.5 * BEAT, 0.20)          # only two hats a bar,
        x += _perc(G.hat, s + 2.5 * BEAT, 0.20)          # so the gaps stay open
        # One short tonal stab per bar, then silence for the tail to live in.
        root = B2 if bar == 0 else A3 / 2
        for f in (root, root * 1.5, root * 2):
            x += _tone(f, s, 0.30, 0.30, "saw", detune=0.004, curve=2.4)
        x += _tone(root * 4, s + 1.5 * BEAT, 0.16, 0.22, "tri", curve=3.0)
    return x


def cand_b():
    """B — Melodic hook. A monophonic line you can hum, so the pitch shift is
    unmistakable, over a quiet sustained pad for the flanger to sweep."""
    x = _blank()
    x += _pad([B2, Fs3, D3], 0.0, BEAT * 4 * BARS, 0.055)
    line = [(B3, 0.0, .75), (D4, .75, .5), (Fs4, 1.25, .75), (D4, 2.0, .5),
            (B3, 2.5, 1.0), (A3 * 2, 3.5, .5),
            (Fs4, 4.0, .75), (D4, 4.75, .5), (B3, 5.25, .75), (A3 * 2, 6.0, 1.0)]
    for f, at, dur in line:
        x += _tone(f, at * BEAT, dur * BEAT * 0.92, 0.34, "saw", curve=2.0)
    for bar in range(BARS):
        s = bar * 4 * BEAT
        x += _perc(G.kick, s, 0.85)
        x += _perc(G.kick, s + 2.5 * BEAT, 0.62)
        x += _perc(G.clap, s + 2 * BEAT, 0.34)
        for e in (0.5, 1.5, 2.5, 3.5):
            x += _perc(G.hat, s + e * BEAT, 0.17)
    return x


def cand_c():
    """C — Call and answer. A bright plucked figure on the front of the bar and
    an empty back half. The emptiest of the three, and the one where a tail or a
    repeat is most obviously an effect rather than part of the loop."""
    x = _blank()
    for bar in range(BARS):
        s = bar * 4 * BEAT
        x += _perc(G.kick, s, 0.95)
        x += _perc(G.clap, s + 1 * BEAT, 0.42)
        x += _perc(G.hat, s + 0.5 * BEAT, 0.22)
        x += _perc(G.hat, s + 1.5 * BEAT, 0.22)
        notes = [B3, Fs4, D4] if bar == 0 else [A3 * 2, Fs4, B3]
        for k, f in enumerate(notes):
            x += _tone(f, s + k * 0.5 * BEAT, 0.22, 0.34, "tri", curve=3.2)
            x += _tone(f / 2, s + k * 0.5 * BEAT, 0.26, 0.14, "saw", curve=2.6)
        x += _tone(B2 if bar == 0 else A3 / 2, s, BEAT * 1.6, 0.26, "saw", curve=1.2)
        # bar's back half deliberately left empty
    return x


CANDIDATES = {"a": cand_a, "b": cand_b, "c": cand_c}


# ------------------------------------------------------------------ effects --
# Pushed harder than the shipped settings. At "100%" the point is that the
# effect is unmistakable, not tasteful.

def fx_echo_offgrid(x, wet, fb, beats):
    """The shipped echo delays by exactly ONE BEAT, which on a beat-synced loop
    is the one delay time you cannot hear: every repeat lands precisely on top
    of the next hit, so it reads as "the loop got louder" rather than as an
    echo. A dotted eighth puts the repeats in the gaps between hits — still
    counted in beats, which is the point the copy makes, but audible."""
    d = int(G.BEAT * beats * SR)
    e = G.comb(x, d, fb)
    e /= max(np.max(np.abs(e)), 1e-9)
    return (1 - wet) * x + wet * e


def effects(src):
    """The effect chain reads generate's module-level buffer length for its LFOs,
    so it has to run with N pointed at ours."""
    old_N, old_t = G.N, G.t
    G.N, G.t = N, np.arange(N) / SR
    try:
        return _effects(src)
    finally:
        G.N, G.t = old_N, old_t


def _effects(src):
    return [
        ("original", src),
        ("reverb",   G.fx_reverb(src, wet=0.82, fb=0.975)),
        ("echo",     fx_echo_offgrid(src, wet=0.80, fb=0.74, beats=0.75)),
        ("pitch",    G.fx_pitch(src, semitones=7.0)),
        ("flanger",  G.fx_flanger(src, mix=0.72, fb=0.85)),
        ("blur",     G.fx_blur(src, cutoff=340.0)),
    ]


# -------------------------------------------------------------------- audit --

def hf_ratio(x):
    S = np.abs(np.fft.rfft(x)); f = np.fft.rfftfreq(len(x), 1 / SR)
    return float(S[f > 4000].sum() / max(S.sum(), 1e-9))


def gap_energy(dry, wet):
    """RMS in the quietest quarter of the DRY loop. This is the number that
    decides whether reverb and echo are audible at all: it asks how much sound
    the effect puts where the source had none."""
    win = int(SR * 0.05)
    frames = [(i, np.sqrt(np.mean(dry[i:i + win] ** 2))) for i in range(0, len(dry) - win, win)]
    frames.sort(key=lambda t: t[1])
    quiet = [i for i, _ in frames[: max(1, len(frames) // 4)]]
    d = np.mean([np.sqrt(np.mean(dry[i:i + win] ** 2)) for i in quiet])
    w = np.mean([np.sqrt(np.mean(wet[i:i + win] ** 2)) for i in quiet])
    return float(w / max(d, 1e-6))


def audit(name, clips):
    dry = clips[0][1]
    dry = dry / max(np.max(np.abs(dry)), 1e-9)
    rows = []
    for label, y in clips[1:]:
        y = y / max(np.max(np.abs(y)), 1e-9)
        m = min(len(y), len(dry))
        corr = abs(float(np.corrcoef(y[:m], dry[:m])[0, 1]))
        rows.append((label, corr, gap_energy(dry, y[:len(dry)]), hf_ratio(y)))
    return rows


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "/tmp/fx_variants"
    os.makedirs(out, exist_ok=True)
    print(f"{'':12}{'|corr| w/ dry':>14}{'gap fill x':>12}{'HF>4k':>8}   (dry HF in header)")
    for key, fn in CANDIDATES.items():
        src = fn()
        src = src / max(np.max(np.abs(src)), 1e-9) * 0.82
        clips = effects(src)
        print(f"\ncandidate {key.upper()}   dry HF>4k = {hf_ratio(src):.3f}")
        for label, corr, gap, hf in audit(key, clips):
            flag = "  <-- too close" if corr > 0.75 else ""
            print(f"  {label:10}{corr:14.3f}{gap:12.2f}{hf:8.3f}{flag}")
        for label, y in clips:
            y = y / max(np.max(np.abs(y)), 1e-9) * 0.82
            raw = (np.clip(y, -1, 1) * 32767).astype("<i2").tobytes()
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error",
                            "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0",
                            "-codec:a", "libmp3lame", "-b:a", "128k",
                            os.path.join(out, f"{key}-{label}.mp3")],
                           input=raw, check=True)
        gap = np.zeros(int(SR * 0.45))
        montage = np.concatenate([np.concatenate([
            y / max(np.max(np.abs(y)), 1e-9) * 0.82, gap]) for _, y in clips])
        raw = (np.clip(montage, -1, 1) * 32767).astype("<i2").tobytes()
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error",
                        "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0",
                        "-codec:a", "libmp3lame", "-b:a", "128k",
                        os.path.join(out, f"OPTION-{key.upper()}-all-six.mp3")],
                       input=raw, check=True)

    print(f"\nwrote {len(CANDIDATES) * 6} clips + 3 montages to {out}")


if __name__ == "__main__":
    main()
