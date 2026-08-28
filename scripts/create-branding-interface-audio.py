from __future__ import annotations

import math
import random
import struct
import wave
from pathlib import Path


SAMPLE_RATE = 48_000
OUTPUT = Path("public/branding/assets/audio")


def write_wav(name: str, samples: list[float]) -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    peak = max(abs(value) for value in samples) or 1.0
    scale = 0.82 / peak
    payload = b"".join(
        struct.pack("<h", max(-32768, min(32767, round(value * scale * 32767))))
        for value in samples
    )
    with wave.open(str(OUTPUT / name), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(SAMPLE_RATE)
        output.writeframes(payload)


def render(duration: float, sample) -> list[float]:
    return [sample(index / SAMPLE_RATE) for index in range(round(duration * SAMPLE_RATE))]


def make_key() -> list[float]:
    randomizer = random.Random(421)

    def sample(time: float) -> float:
        shell = math.exp(-time * 78)
        noise = randomizer.uniform(-1, 1) * shell
        body = math.sin(2 * math.pi * 176 * time) * math.exp(-time * 55)
        tick = math.sin(2 * math.pi * 1_740 * time) * math.exp(-time * 105)
        return noise * 0.58 + body * 0.3 + tick * 0.22

    return render(0.065, sample)


def make_click() -> list[float]:
    randomizer = random.Random(809)

    def impulse(time: float, starts_at: float, pitch: float) -> float:
        local = time - starts_at
        if local < 0:
            return 0.0
        return (
            randomizer.uniform(-1, 1) * math.exp(-local * 95) * 0.5
            + math.sin(2 * math.pi * pitch * local) * math.exp(-local * 70) * 0.46
        )

    return render(0.12, lambda time: impulse(time, 0, 420) + impulse(time, 0.052, 310) * 0.72)


def make_drag() -> list[float]:
    randomizer = random.Random(144)
    duration = 0.34

    def sample(time: float) -> float:
        progress = time / duration
        frequency = 205 + 250 * (progress ** 1.35)
        phase = 2 * math.pi * (205 * time + 125 * (time * time / duration))
        envelope = math.sin(math.pi * progress) ** 1.4
        air = randomizer.uniform(-1, 1) * 0.035
        return (math.sin(phase) * 0.55 + math.sin(phase * 2.01) * 0.13 + air) * envelope

    return render(duration, sample)


def make_drop() -> list[float]:
    randomizer = random.Random(73)
    duration = 0.22

    def sample(time: float) -> float:
        thud = math.sin(2 * math.pi * (142 - 180 * time) * time) * math.exp(-time * 30)
        confirmation = math.sin(2 * math.pi * (590 + 780 * time) * time) * math.exp(-time * 16)
        click = randomizer.uniform(-1, 1) * math.exp(-time * 110)
        return thud * 0.5 + confirmation * 0.38 + click * 0.18

    return render(duration, sample)


def make_portfolio_arrive() -> list[float]:
    """A warm, close-miked material tick for copy and art entrances."""
    randomizer = random.Random(1_141)
    duration = 0.16

    def sample(time: float) -> float:
        tap = math.sin(2 * math.pi * 228 * time) * math.exp(-time * 42)
        overtone = math.sin(2 * math.pi * 684 * time) * math.exp(-time * 78)
        grain = randomizer.uniform(-1, 1) * math.exp(-time * 125)
        return tap * 0.64 + overtone * 0.19 + grain * 0.12

    return render(duration, sample)


def make_portfolio_select() -> list[float]:
    """A precise, soft mouse selection with a pleasing two-part release."""
    randomizer = random.Random(2_207)
    duration = 0.14

    def impulse(time: float, start: float, frequency: float, decay: float) -> float:
        local = time - start
        if local < 0:
            return 0.0
        grain = randomizer.uniform(-1, 1) * math.exp(-local * 180) * 0.18
        body = math.sin(2 * math.pi * frequency * local) * math.exp(-local * decay)
        return body * 0.48 + grain

    return render(duration, lambda time: impulse(time, 0.0, 505, 90) + impulse(time, 0.044, 758, 115) * 0.56)


def make_portfolio_sweep() -> list[float]:
    """A short, dry cursor sweep for product-state changes; never a bounce."""
    randomizer = random.Random(4_903)
    duration = 0.26

    def sample(time: float) -> float:
        progress = time / duration
        envelope = math.sin(math.pi * progress) ** 1.65
        frequency = 420 + 530 * progress
        tone = math.sin(2 * math.pi * (420 * time + 265 * time * progress))
        air = randomizer.uniform(-1, 1) * 0.10
        return (tone * 0.38 + air) * envelope

    return render(duration, sample)


def make_portfolio_resolve() -> list[float]:
    """A restrained felt-piano resonance for the final piano photograph."""
    duration = 0.72

    def sample(time: float) -> float:
        attack = 1 - math.exp(-time * 180)
        body = math.exp(-time * 4.8)
        fundamental = math.sin(2 * math.pi * 220 * time)
        octave = math.sin(2 * math.pi * 440 * time + 0.2) * 0.34
        fifth = math.sin(2 * math.pi * 659.25 * time + 0.6) * 0.12
        return (fundamental * 0.52 + octave + fifth) * attack * body

    return render(duration, sample)


def main() -> None:
    write_wav("interface-key.wav", make_key())
    write_wav("interface-click.wav", make_click())
    write_wav("interface-drag.wav", make_drag())
    write_wav("interface-drop.wav", make_drop())
    write_wav("portfolio-arrive.wav", make_portfolio_arrive())
    write_wav("portfolio-select.wav", make_portfolio_select())
    write_wav("portfolio-sweep.wav", make_portfolio_sweep())
    write_wav("portfolio-resolve.wav", make_portfolio_resolve())


if __name__ == "__main__":
    main()
