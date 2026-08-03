#!/usr/bin/env python3
"""
Six audio clips for the Mixr case study: one dry loop, then the same loop with
each of the five audio effects applied at full strength.

Auto is deliberately absent. It is an arrangement engine, not a filter — there
is no "Auto at 100%" to render onto a loop, and putting it in the row implied
there was.

Why the source is synthesised rather than a real song: the effects have to be
demonstrated on a public portfolio page, and the tracks Mixr was built against
are commercial masters. This writes its own loop instead — 103 BPM in B minor,
disco-pop in the neighbourhood of what Mixr gets used on — so the page can ship
the audio outright.

Everything is numpy; the recursive filters are blocked so the feedback loops
stay vectorised rather than running a Python loop per sample.

Outputs to public/mixr/audio/:
    original.mp3  reverb.mp3  echo.mp3  pitch.mp3  flanger.mp3  blur.mp3
    peaks.json    — waveform envelopes on one shared scale, so the rows can be
                    read against each other: echo's repeats and reverb's tail
                    are visible in the shape, not just audible
"""

import json
import os
import subprocess
import numpy as np

SR    = 44100
# Disco-pop tempo and key — the brief was "something in the neighbourhood of
# Levitating". 103 BPM in B minor, four-on-the-floor with an octave-jumping
# bassline and claps on the backbeat. It has to be a real groove: the first
# loop here was a generic 124 BPM pad and the effects had nothing to bite on.
BPM   = 103.0
BEAT  = 60.0 / BPM
BEATS = 8
TAIL  = 1.30                       # room for reverb / echo to ring out
N     = int(round((BEATS * BEAT + TAIL) * SR))

OUT = os.path.join(os.path.dirname(__file__), "..", "..", "public", "mixr", "audio")
OUT = os.path.abspath(OUT)

t = np.arange(N) / SR

# B minor, the key the page claims.
B2, D3, FS3, A3, B3, D4, FS4 = 61.74, 73.42, 92.50, 220.0, 123.47, 146.83, 185.0


# ---------------------------------------------------------------- synthesis --

def env(start, dur, attack=0.004, decay=None, curve=3.0):
    """One note envelope placed on the master timeline."""
    e = np.zeros(N)
    a0 = int(start * SR)
    a1 = min(N, a0 + int(dur * SR))
    if a1 <= a0:
        return e
    n = a1 - a0
    seg = np.ones(n)
    na = max(1, int(attack * SR))
    seg[:na] = np.linspace(0, 1, na)
    d = decay if decay is not None else dur
    nd = max(1, int(d * SR))
    fall = np.linspace(0, 1, min(nd, n)) ** curve
    seg[-len(fall):] *= (1 - fall)
    e[a0:a1] = seg
    return e


def tone(freq, start, dur, amp, kind="saw", detune=0.0, **kw):
    ph = 2 * np.pi * freq * t
    if kind == "sine":
        w = np.sin(ph)
    elif kind == "saw":
        # Additive so it stays band-limited — a naive ramp aliases badly once
        # the pitch shifter resamples it.
        w = np.zeros(N)
        for h in range(1, 13):
            if freq * h > SR / 2.2:
                break
            w += np.sin(ph * h) / h
        w *= 0.55
    else:  # tri
        w = np.arcsin(np.sin(ph)) * (2 / np.pi)
    if detune:
        w = 0.5 * w + 0.5 * np.sin(2 * np.pi * freq * (1 + detune) * t)
    return w * env(start, dur, **kw) * amp


def kick(start, amp=0.95):
    dur = 0.30
    e = env(start, dur, attack=0.001, curve=2.2)
    # pitch sweep 120 -> 48 Hz
    a0 = int(start * SR)
    sweep = np.zeros(N)
    n = min(N - a0, int(dur * SR))
    if n <= 0:
        return sweep
    f = 120 * np.exp(-np.linspace(0, 1, n) * 2.4) + 48
    sweep[a0:a0 + n] = np.sin(2 * np.pi * np.cumsum(f) / SR)
    return sweep * e * amp


def noise_hit(start, dur, amp, hp=2, seed=0):
    rng = np.random.default_rng(int(start * 1000) + seed)
    a0 = int(start * SR)
    n = min(N - a0, int(dur * SR))
    if n <= 0:
        return np.zeros(N)
    v = rng.standard_normal(n)
    for _ in range(hp):                      # crude high-pass by differencing
        v = np.diff(v, prepend=0)
    out = np.zeros(N)
    out[a0:a0 + n] = v
    return out * env(start, dur, attack=0.001, curve=1.6) * amp


def hat(start, amp=0.13):
    return noise_hit(start, 0.045, amp, hp=2, seed=7)


def clap(start, amp=0.34):
    """Three quick bursts a few ms apart, then a short tail — the backbeat is
    what makes this read as disco rather than as a click track."""
    out = np.zeros(N)
    for k, d in enumerate((0.0, 0.011, 0.020)):
        out += noise_hit(start + d, 0.030, amp * (1.0 - 0.22 * k), hp=1, seed=31 + k)
    out += noise_hit(start + 0.028, 0.15, amp * 0.42, hp=1, seed=41)
    return out


# B minor, i - III - v - IV, two beats each. Roots are the bassline's anchor;
# the triads sit two octaves up as the stab.
CHORDS = [
    (123.47, [493.88, 587.33, 739.99]),   # Bm   B  D  F#
    (146.83, [293.66, 369.99, 440.00]),   # D    D  F# A
    (185.00, [369.99, 440.00, 554.37]),   # F#m  F# A  C#
    (164.81, [329.63, 415.30, 493.88]),   # E    E  G# B
]


def build_source():
    """Candidate B — a melodic hook over a sustained pad.

    The first loop here was a dense four-on-the-floor with a hat on every 16th,
    and it was the wrong material: with no gaps, reverb tails and echo repeats
    land on top of more loop and simply vanish. Measured against the dry signal
    the old echo came back at 0.96 correlation — the same waveform, slightly
    louder. What each effect needs from a source is different, and one loop has
    to serve all five:

      reverb   transients with SILENCE after them; the tail lives in the gap
      echo     isolated hits with at least a beat of room
      pitch    a monophonic line you can hum, so the interval is unmistakable
      flanger  something sustained and broadband for the notches to sweep
      blur     bright top end that can audibly disappear

    Hence: a sung-length melody carrying the pitch shift, a quiet pad under it
    for the flanger, hats for the blur, and only two kicks a bar so the gaps
    stay open.
    """
    x = np.zeros(N)

    # Sustained bed. Low in the mix — it is there for the flanger to comb, not
    # to be heard as a part.
    for k, f in enumerate((B2, FS3, D3)):
        x += tone(f, 0.0, BEATS * BEAT, 0.055, "saw",
                  detune=0.006 + 0.002 * k, curve=0.35)

    # The hook, in B minor. Beat positions, then duration in beats.
    for f, at, dur in ((B3, 0.0, .75), (D4, .75, .5), (FS4, 1.25, .75),
                       (D4, 2.0, .5),  (B3, 2.5, 1.0), (A3, 3.5, .5),
                       (FS4, 4.0, .75), (D4, 4.75, .5), (B3, 5.25, .75),
                       (A3, 6.0, 1.0)):
        x += tone(f, at * BEAT, dur * BEAT * 0.92, 0.34, "saw", curve=2.0)

    for bar in range(BEATS // 4):
        s = bar * 4 * BEAT
        x += kick(s, 0.85)
        x += kick(s + 2.5 * BEAT, 0.62)
        x += clap(s + 2 * BEAT, 0.34)
        for e in (0.5, 1.5, 2.5, 3.5):
            x += hat(s + e * BEAT, 0.17)

    return x / np.max(np.abs(x)) * 0.82


# ------------------------------------------------------------------ effects --

def comb(x, delay, fb):
    """y[n] = x[n] + fb*y[n-delay], vectorised one delay-block at a time."""
    y = x.copy()
    for i in range(delay, len(y), delay):
        blk = min(delay, len(y) - i)
        y[i:i + blk] += fb * y[i - delay:i - delay + blk]
    return y


def allpass(x, delay, g):
    y = np.zeros_like(x)
    y[:delay] = -g * x[:delay]
    for i in range(delay, len(x), delay):
        blk = min(delay, len(x) - i)
        y[i:i + blk] = (-g * x[i:i + blk]
                        + x[i - delay:i - delay + blk]
                        + g * y[i - delay:i - delay + blk])
    return y


def fx_reverb(x, wet=0.68, fb=0.965):
    """Freeverb topology: eight parallel combs into four series allpasses.

    Feedback is .965, not the .84 a naive Schroeder demo uses — decay time is
    roughly (delay/SR)/(1-fb), so .84 gives a ~0.2s box and no audible tail at
    all. At .965 the 1557-sample comb rings for about a second, which is what
    makes this sound like a room instead of a short slap."""
    delays = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617]
    r = sum(comb(x, d, fb) for d in delays) / len(delays)
    for d in (556, 441, 341, 225):
        r = allpass(r, d, .5)
    r /= max(np.max(np.abs(r)), 1e-9)
    return (1 - wet) * x + wet * r


def fx_echo(x, wet=0.80, fb=0.74, beats=0.75):
    """A DOTTED EIGHTH, not a whole beat. Still counted in beats — which is the
    point the copy makes — but a one-beat delay on a beat-synced loop is the one
    time you cannot hear: every repeat lands exactly on the next hit, so it
    reads as "the loop got louder" rather than as an echo."""
    d = int(BEAT * beats * SR)
    e = comb(x, d, fb)
    e /= max(np.max(np.abs(e)), 1e-9)
    return (1 - wet) * x + wet * e


def fx_pitch(x, semitones=12.0, win=2048, hop=512, search=512):
    """Pitch up an octave, tempo untouched — WSOLA, then resample.

    The app runs AVAudioUnitTimePitch with .pitch and .rate set independently
    (MixrPlaybackEngine.swift), so it shifts pitch and holds tempo. It also does
    not compensate formants, which is exactly why the real thing sounds like a
    chipmunk rather than like a lower voice played high. Stretch-then-resample
    reproduces both of those.

    The stretch is WSOLA rather than plain overlap-add. Plain OLA drops each
    frame in wherever the hop counter lands, so successive frames disagree on
    phase and partially cancel — heard as the metallic ring that made the old
    clip sound robotic. Sliding each frame to the offset that best correlates
    with what is already written removes it.

    An octave rather than a fifth: a fifth reads as musical, an octave reads as
    a chipmunk, which is what the row's copy promises.
    """
    r = 2 ** (semitones / 12.0)
    hop_s = int(round(hop * r))
    w = np.hanning(win)
    frames = 1 + max(0, (len(x) - win - search) // hop)
    out = np.zeros(win + hop_s * frames + search)
    norm = np.zeros_like(out)
    prev_tail = None

    for i in range(frames):
        a = i * hop
        if prev_tail is None:
            best = a
        else:
            lo, hi = max(0, a - search), min(len(x) - win, a + search)
            if hi <= lo:
                best = a
            else:
                c = np.correlate(x[lo:hi + win], prev_tail, mode="valid")
                best = lo + int(np.argmax(c))
        s = i * hop_s
        out[s:s + win] += x[best:best + win] * w
        norm[s:s + win] += w
        ov = win - hop_s
        prev_tail = (x[best + hop_s: best + hop_s + min(ov, win)]
                     if ov > 0 else x[best:best + 64])

    out /= np.maximum(norm, 1e-6)
    idx = np.arange(0, len(out) - 1, r)
    y = np.interp(idx, np.arange(len(out)), out)
    return np.pad(y[:len(x)], (0, max(0, len(x) - len(y))))


def fx_flanger(x, intensity=1.5, rate=2.2, lo_ms=0.4, hi_ms=9.0):
    """A feedback flanger, swept fast.

    The first version mixed a fixed 1-6 ms tap in at 0.72 and bolted a separate
    comb on after it, and it barely registered: with dry and wet at unequal
    amplitude the comb notches only dip, they never null, and the null is the
    entire sound of a flanger. So: depth >= 1.0 puts dry and wet at equal
    amplitude, and the feedback lives INSIDE the delay line rather than in a
    comb after it, which is what gives the resonant metallic sweep.

    Rate matters as much as depth here. At 0.4 Hz the sweep drifts through
    barely one cycle in six seconds and reads as a slow tonal shift; at 2.2 Hz
    you hear it move, which is what makes it recognisable as a flanger rather
    than as "something is a bit different".

    `intensity` is how much of the effect is applied, on the scale the page's
    A/B talks in: 1.0 is full depth, 2.0 is as far as it goes before the comb
    starts eating the loop. Depth and feedback both ride it — pushing either
    one alone changes the character rather than the amount.
    """
    depth = 1.00 + 0.15 * (intensity - 1.0)      # 1.00 @ 100%, 1.15 @ 200%
    fb    = 0.85 + 0.09 * (intensity - 1.0)      # 0.85 @ 100%, 0.94 @ 200%

    n = len(x)
    lfo = 0.5 * (1 - np.cos(2 * np.pi * rate * (np.arange(n) / SR)))
    dly = (lo_ms + (hi_ms - lo_ms) * lfo) * SR / 1000.0
    y = np.zeros(n)
    buf = np.zeros(n)
    for i in range(n):
        j = i - dly[i]
        if j < 1:
            s = 0.0
        else:
            j0 = int(j)
            fr = j - j0
            s = buf[j0] * (1 - fr) + buf[min(j0 + 1, n - 1)] * fr
        buf[i] = x[i] + fb * s
        y[i] = x[i] + depth * s
    return y


def fx_blur(x, cutoff=420.0):
    """Two cascaded RBJ low-pass biquads — the app's 'Blur' is a low-pass."""
    w0 = 2 * np.pi * cutoff / SR
    alpha = np.sin(w0) / (2 * 0.707)
    b0, b1, b2 = (1 - np.cos(w0)) / 2, 1 - np.cos(w0), (1 - np.cos(w0)) / 2
    a0, a1, a2 = 1 + alpha, -2 * np.cos(w0), 1 - alpha
    b0, b1, b2, a1, a2 = b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0
    y = x
    for _ in range(2):
        o = np.zeros_like(y)
        x1 = x2 = y1 = y2 = 0.0
        for n in range(len(y)):
            v = b0 * y[n] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
            x2, x1 = x1, y[n]
            y2, y1 = y1, v
            o[n] = v
        y = o
    return y                                  # left at its natural level



# -------------------------------------------------------------------- write --

def peaks(x, n=150):
    """Envelope for the page's waveform, in the same 0..1 space the silhouette
    renderer expects."""
    step = max(1, len(x) // n)
    e = [float(np.sqrt(np.mean(x[i:i + step] ** 2))) for i in range(0, len(x), step)][:n]
    return e


def write(name, x, table):
    # Every clip goes out at the same peak. An A/B where one option is simply
    # louder is not an A/B — the listener picks the loud one every time. What
    # each effect changes is timbre and time, and that survives levelling.
    x = x / max(np.max(np.abs(x)), 1e-9) * 0.82
    x = np.clip(x, -1, 1)
    raw = (x * 32767).astype("<i2").tobytes()
    mp3 = os.path.join(OUT, name + ".mp3")
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error",
         "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0",
         "-codec:a", "libmp3lame", "-b:a", "96k", mp3],
        input=raw, check=True)
    table[name] = peaks(x)
    print(f"  {name:9s} {os.path.getsize(mp3)/1024:6.1f} KB")


def main():
    os.makedirs(OUT, exist_ok=True)
    src = build_source()
    print(f"source: {N/SR:.2f}s @ {BPM:g} BPM, B minor")

    clips = [
        ("original", src),
        ("reverb",   fx_reverb(src)),
        ("echo",     fx_echo(src)),
        ("pitch",    fx_pitch(src)),
        ("flanger",  fx_flanger(src)),
        ("blur",     fx_blur(src)),
    ]

    table = {}
    for name, y in clips:
        write(name, y, table)

    # Normalise every envelope against the loudest single peak across all six,
    # so the rows can be read against each other — blur should LOOK quieter.
    top = max(max(v) for v in table.values()) or 1.0
    table = {k: [round(min(1.0, p / top), 4) for p in v] for k, v in table.items()}
    with open(os.path.join(OUT, "peaks.json"), "w") as f:
        json.dump(table, f, separators=(",", ":"))
    print(f"  peaks.json {os.path.getsize(os.path.join(OUT,'peaks.json'))/1024:.1f} KB")


if __name__ == "__main__":
    main()
