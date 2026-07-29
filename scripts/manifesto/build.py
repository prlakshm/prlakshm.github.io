#!/usr/bin/env python3
"""Measure the handwritten manifesto for responsive per-word CSS masks.

Run:  python3 build.py            (see README.md for the venv)

Pipeline
    1. read the alpha channel from the clean title and body PNG exports
    2. split into lines by horizontal projection
    3. split lines into words by gap clustering, checked against TEXT
    4. fit a baseline per line, so words can be re-aligned in CSS
    5. emit each word's crop, source position, and baseline

There is deliberately no tracing. Each word is a window into the original PNG
alpha channel, so every wobble, join, and pressure change remains hers. CSS
supplies the ink colour; flexbox wraps only between complete word masks.
"""
import argparse
import json
import pathlib
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage.morphology import remove_small_objects

HERE = pathlib.Path(__file__).parent
MASKS = HERE / ".." / ".." / "src" / "pages" / "about" / "masks"

# Ground truth. Word segmentation is validated against these counts rather than
# trusted, because a mis-split silently corrupts a word forever. The body text
# mirrors the two source exports in reading order; the browser is free to reflow
# the resulting word masks.
TITLE_TEXT = ["Design Manifesto"]
BODY_PART_1_SOURCE_TEXT = [
    "I decided to use this space to",
    "share my thoughts on AI. AI can",
    "write like us, talk like us, and imitate",
    "everything that we do. At this point,",
    "I don't know where a person ends",
    "and AI begins. But we are humans.",
    "We are made of flesh and blood. we",
    "create, we dance, and make art. So",
    "let's not see this as AI is taking over",
    "our lives, but that AI is letting us",
    "have more life to live. We can take",
    "back control in the creative process.",
]
BODY_PART_2_SOURCE_TEXT = [
    "Automate what we need and",
    "make more time for the things",
    "that spark us joy. If we can",
    "learn where and when to use AI,",
    "we can bring our lives back to",
    "the art. We are a house for",
    "creative spirit. So let's be",
    "intentional about how we create.",
]
BODY_TEXT = BODY_PART_1_SOURCE_TEXT + BODY_PART_2_SOURCE_TEXT

# Every responsive row follows the measured source baseline. Keeping this map
# explicit documents that no word receives an extra visual offset.
WORD_BASELINE_NUDGES = {}

# The added word is an authored crop, not newly drawn lettering. Reuse the
# later "where" from "learn where and when" after the first word on line 6.
INSERTED_WORD_REUSE = {
    "text": "where",
    "source_line": 16,
    "after_line": 6,
    "after_text": "and",
}
OMITTED_WORD = {"text": "that", "line": 4}

# Rendering masks are derived only by expanding the original alpha. This keeps
# every authored contour while producing the requested marker weights without
# large runtime filter chains.
RENDER_DILATION_RADII = {"body": 0.375, "title": 0.625}
MARK_DILATION_RADII = {"body": 0.625, "title": 0.75}
FRACTIONAL_DILATION_SCALE = 2

ALPHA_THRESHOLD = 4   # includes antialiasing while ignoring zero-alpha canvas
MIN_SPECK = 5         # smallest confident tittle in the authored body export
FAINT_SPECK_ALPHA = 64  # reject tiny export dust unless its alpha is confident
MASK_PAD = 4         # px around each crop, preserving the full antialiased edge
MARK_PAD = 2         # smaller crop pad for optical dot/period reinforcement
LINE_MARK_PAD = 12   # include tittles just above the projected writing band
X_HEIGHT_UNITS = 10  # output scale: body x-height is 10 units


def write_dilated_mask(source_path, output_path, radius):
    """Expand authored alpha without tracing, recoloring, or resizing it."""
    image = Image.open(source_path).convert("RGBA")
    pixels = np.asarray(image).copy()
    alpha = pixels[:, :, 3]

    if radius < 1:
        expanded = ndi.maximum_filter(alpha, size=3, mode="constant")
        expanded = alpha * (1 - radius) + expanded * radius
    elif float(radius).is_integer():
        expanded = ndi.maximum_filter(
            alpha, size=2 * int(radius) + 1, mode="constant",
        )
    else:
        width, height = image.size
        upscaled = Image.fromarray(alpha).resize(
            (
                width * FRACTIONAL_DILATION_SCALE,
                height * FRACTIONAL_DILATION_SCALE,
            ),
            Image.Resampling.NEAREST,
        )
        expanded_upscaled = ndi.maximum_filter(
            np.asarray(upscaled),
            size=2 * round(radius * FRACTIONAL_DILATION_SCALE) + 1,
            mode="constant",
        )
        expanded = np.asarray(
            Image.fromarray(expanded_upscaled).resize(
                (width, height),
                Image.Resampling.LANCZOS,
            )
        )

    pixels[:, :, 3] = np.clip(expanded, 0, 255).astype(np.uint8)
    Image.fromarray(pixels).save(output_path)


def binarize(path):
    """Use the authored alpha as geometry; RGB never affects the mask."""
    image = Image.open(path)
    if "A" not in image.getbands():
        sys.exit(f"{path}: expected an alpha channel")
    alpha = np.asarray(image.getchannel("A"))
    ink = remove_small_objects(alpha > ALPHA_THRESHOLD, min_size=MIN_SPECK)

    # Several authored i-dots are only 5–14 pixels. Keep those confident marks
    # while discarding the similarly sized, extremely faint export dust.
    lab, _ = ndi.label(ink)
    for i, sl in enumerate(ndi.find_objects(lab), start=1):
        component = lab[sl] == i
        if (component.sum() < 20
                and alpha[sl][component].max() < FAINT_SPECK_ALPHA):
            ink[sl][component] = False
    return ink


def find_lines(ink):
    prof = ndi.uniform_filter1d(ink.sum(axis=1).astype(float), 15)
    on = prof > prof.max() * 0.02
    edges = np.diff(on.astype(int))
    starts = list(np.where(edges == 1)[0] + 1)
    stops = list(np.where(edges == -1)[0] + 1)
    if on[0]:
        starts.insert(0, 0)
    if on[-1]:
        stops.append(len(on))
    return [(a, b) for a, b in zip(starts, stops) if b - a > 30]


def split_words(comps, words):
    """Cluster components into exactly len(words) groups by horizontal gap.

    The cut count is pinned to the known word count instead of to a gap
    threshold: handwriting spacing drifts across a line, so any fixed threshold
    that works at the left margin fails at the right.
    """
    line_top = min(c["y0"] for c in comps)
    line_bottom = max(c["y1"] for c in comps)
    line_height = line_bottom - line_top
    ivs = []
    for index, component in enumerate(comps):
        width = component["x1"] - component["x0"]
        height = component["y1"] - component["y0"]
        previous_gap = (
            component["x0"] - ivs[-1][1] if ivs else float("inf")
        )
        next_gap = (
            comps[index + 1]["x0"] - component["x1"]
            if index + 1 < len(comps) else float("inf")
        )
        is_baseline_mark = (
            width <= 0.2 * line_height
            and height <= 0.45 * line_height
            and component["y0"] >= line_top + 0.45 * line_height
        )
        if (
            is_baseline_mark
            and ivs
            and previous_gap <= 0.55 * line_height
            and previous_gap <= next_gap
        ):
            ivs[-1][1] = component["x1"]
            ivs[-1][2].append(component)
        else:
            ivs.append([component["x0"], component["x1"], [component]])
    merged = []
    for iv in ivs:
        if merged and iv[0] <= merged[-1][1]:      # overlapping in x: one unit
            merged[-1][1] = max(merged[-1][1], iv[1])
            merged[-1][2] += iv[2]
        else:
            merged.append(iv)
    gaps = sorted(((merged[i + 1][0] - merged[i][1], i)
                   for i in range(len(merged) - 1)), reverse=True)
    cuts = {i for _, i in gaps[:len(words) - 1]}
    groups, cur = [], []
    for i, m in enumerate(merged):
        cur.append(m)
        if i in cuts:
            groups.append(cur)
            cur = []
    groups.append(cur)

    # Gap ranking can mistake a detached comma/period for the first mark of the
    # next word. Use the known copy to restore that small mark to the word that
    # owns it. This changes only the crop boundary; the authored alpha remains
    # completely untouched.
    if comps:
        line_height = max(c["y1"] for c in comps) - min(c["y0"] for c in comps)
        trailing_marks = (".", ",", "!", "?", ";", ":")
        for i, word in enumerate(words[:-1]):
            next_group = groups[i + 1]
            if not word.endswith(trailing_marks) or len(next_group) < 2:
                continue
            mark = next_group[0]
            mark_width = mark[1] - mark[0]
            mark_height = (
                max(c["y1"] for c in mark[2])
                - min(c["y0"] for c in mark[2])
            )
            if (mark_width <= 0.2 * line_height
                    and mark_height <= 0.45 * line_height):
                groups[i].append(next_group.pop(0))

    margin = (gaps[len(words) - 2][0] / max(gaps[len(words) - 1][0], 1)
              if len(gaps) >= len(words) else float("inf"))
    return groups, margin


def fit_baseline(box, ids, band_h):
    """Robust y = m*x + c through the feet of the letters on one line.

    Iteratively trims outliers, which drops descenders (far below the line) and
    tittles (far above it) without needing to know which letters have them.
    """
    hs = np.array([box[i][0].stop - box[i][0].start for i in ids])
    cand = [i for i in ids if (box[i][0].stop - box[i][0].start) > 0.45 * np.median(hs)]
    X = np.array([(box[i][1].start + box[i][1].stop) / 2 for i in cand], float)
    Y = np.array([box[i][0].stop for i in cand], float)
    m, c = 0.0, float(np.median(Y))
    for _ in range(6):
        keep = np.abs(Y - (m * X + c)) < 0.16 * band_h
        if keep.sum() < 3:
            break
        m, c = np.polyfit(X[keep], Y[keep], 1)
    tops = np.array([box[i][0].start for i in cand])
    return m, c, float(np.median((m * X + c) - tops))


def measure_source_lines(path):
    """Measure line crops, optical baselines, and x-height for one body part."""
    ink = binarize(path)
    bands = find_lines(ink)
    lab, _ = ndi.label(ink)
    objs = ndi.find_objects(lab)
    box = {i: sl for i, sl in enumerate(objs, start=1)}
    comps = [
        dict(
            id=i,
            x0=sl[1].start,
            x1=sl[1].stop,
            y0=sl[0].start,
            y1=sl[0].stop,
            yc=(sl[0].start + sl[0].stop) / 2,
        )
        for i, sl in box.items()
    ]
    lines = []
    for a, b in bands:
        line_comps = [
            c for c in comps if a - LINE_MARK_PAD <= c["yc"] < b
        ]
        ids = [c["id"] for c in line_comps]
        m, c, x_height = fit_baseline(box, ids, b - a)
        center_x = float(np.median([
            (component["x0"] + component["x1"]) / 2
            for component in line_comps
        ]))
        lines.append(dict(
            x0=min(component["x0"] for component in line_comps),
            x1=max(component["x1"] for component in line_comps),
            y0=min(component["y0"] for component in line_comps),
            y1=max(component["y1"] for component in line_comps),
            baseline=m * center_x + c,
            x_height=x_height,
        ))
    return lines


def write_normalized_body_mask(part_1_path, part_2_path, output_path):
    """Join both body exports with one measured word scale and line rhythm."""
    part_1_image = Image.open(part_1_path).convert("RGBA")
    part_2_image = Image.open(part_2_path).convert("RGBA")
    part_1_lines = measure_source_lines(part_1_path)
    part_2_lines = measure_source_lines(part_2_path)

    part_1_x_height = float(np.median([
        line["x_height"] for line in part_1_lines
    ]))
    part_2_x_height = float(np.median([
        line["x_height"] for line in part_2_lines
    ]))
    part_2_scale = part_1_x_height / part_2_x_height
    target_line_step = float(np.median(np.diff([
        line["baseline"] for line in part_1_lines
    ])))

    prepared = []
    for image, lines, scale in (
        (part_1_image, part_1_lines, 1.0),
        (part_2_image, part_2_lines, part_2_scale),
    ):
        for line in lines:
            pad = MASK_PAD * 2
            crop_box = (
                max(0, line["x0"] - pad),
                max(0, line["y0"] - pad),
                min(image.width, line["x1"] + pad),
                min(image.height, line["y1"] + pad),
            )
            crop = image.crop(crop_box)
            if scale != 1:
                crop = crop.resize(
                    (
                        max(1, round(crop.width * scale)),
                        max(1, round(crop.height * scale)),
                    ),
                    Image.Resampling.LANCZOS,
                )
            prepared.append(dict(
                image=crop,
                scale=scale,
                baseline=(line["baseline"] - crop_box[1]) * scale,
            ))

    left_padding = 40
    vertical_padding = 32
    max_above = max(line["baseline"] for line in prepared)
    max_below = max(
        line["image"].height - line["baseline"] for line in prepared
    )
    first_baseline = vertical_padding + max_above
    canvas_width = (
        left_padding * 2 + max(line["image"].width for line in prepared)
    )
    canvas_height = round(
        first_baseline
        + (len(prepared) - 1) * target_line_step
        + max_below
        + vertical_padding
    )
    canvas = Image.new("RGBA", (canvas_width, canvas_height), (0, 0, 0, 0))

    for index, line in enumerate(prepared):
        destination_y = round(
            first_baseline
            + index * target_line_step
            - line["baseline"]
        )
        canvas.alpha_composite(
            line["image"],
            dest=(left_padding, destination_y),
        )
    canvas.save(output_path)

    return {
        "part_1_x_height": part_1_x_height,
        "part_2_x_height": part_2_x_height,
        "part_2_scale": part_2_scale,
        "part_2_x_height_after": part_2_x_height * part_2_scale,
        "target_line_step": target_line_step,
    }


def measure_word_baseline(ink, x0, x1, predicted, x_height):
    """Find a word's optical foot near the fitted source-line baseline.

    The line fit gives a safe search band, while the word's own lower contour
    captures the small up/down drift in the handwriting. Descenders are
    excluded by the lower edge of the band so they keep their natural depth.
    """
    bottoms = []
    for x in range(x0, x1 + 1):
        ys = np.flatnonzero(ink[:, x])
        if not len(ys):
            continue
        near = ys[
            (ys >= predicted - 0.55 * x_height)
            & (ys <= predicted + 0.22 * x_height)
        ]
        if len(near):
            bottoms.append(float(near[-1]))

    if not bottoms:
        return predicted
    return float(np.quantile(bottoms, 0.82))


def validate_authored_marks(word, group, baseline, x_height, line):
    """Fail rather than silently crop a lowercase-i dot or sentence period."""
    components = [c for merged in group for c in merged[2]]
    marks = []

    needed_tittles = word.count("i")
    if needed_tittles:
        tittles = [
            c for c in components
            if c["y1"] < baseline - 0.30 * x_height
            and c["x1"] - c["x0"] < 0.55 * x_height
            and c["y1"] - c["y0"] < 0.55 * x_height
        ]
        if len(tittles) < needed_tittles:
            sys.exit(
                f"line {line} {word!r}: found {len(tittles)} i-dots, "
                f"expected {needed_tittles}"
            )
        marks.extend(sorted(tittles, key=lambda c: c["x0"])[:needed_tittles])

    if word.endswith("."):
        period = max(components, key=lambda c: c["x1"])
        is_small = (
            period["x1"] - period["x0"] < 0.60 * x_height
            and period["y1"] - period["y0"] < 0.60 * x_height
        )
        # This cleaner export includes a few intentionally high handwritten
        # periods. The component is already the small rightmost mark in a word
        # known to end with punctuation, so a wider vertical allowance is safe.
        is_on_baseline = period["y0"] > baseline - 0.75 * x_height
        if not (is_small and is_on_baseline):
            sys.exit(f"line {line} {word!r}: sentence period was not retained")
        marks.append(period)

    return marks


def segment_source(path, text, line_offset, key):
    """Split one clean handwriting export into validated word records."""
    ink = binarize(path)
    bands = find_lines(ink)
    if len(bands) != len(text):
        sys.exit(f"{path}: found {len(bands)} lines, expected {len(text)}")

    lab, _ = ndi.label(ink)
    objs = ndi.find_objects(lab)
    box = {i: sl for i, sl in enumerate(objs, start=1)}
    comps = [dict(id=i, x0=sl[1].start, x1=sl[1].stop, y0=sl[0].start,
                  y1=sl[0].stop, yc=(sl[0].start + sl[0].stop) / 2)
             for i, sl in box.items()]

    rows, fits = [], {}
    for source_line, (a, b) in enumerate(bands):
        line = source_line + line_offset
        words = text[source_line].split()
        cs = sorted([c for c in comps if a - LINE_MARK_PAD <= c["yc"] < b],
                    key=lambda c: c["x0"])
        groups, margin = split_words(cs, words)
        if len(groups) != len(words):
            sys.exit(f"line {line}: split into {len(groups)}, "
                     f"expected {len(words)}")
        if margin < 1.15:
            print(f"  ! line {line}: word gap only {margin:.2f}x the widest "
                  f"letter gap -- check the proof sheet")
        ids = [c["id"] for c in cs]
        fits[line] = fit_baseline(box, ids, b - a)
        for word, group in zip(words, groups):
            m, c, x_height = fits[line]
            word_center = (
                min(merged[0] for merged in group)
                + max(merged[1] for merged in group)
            ) / 2
            x0 = min(merged[0] for merged in group)
            x1 = max(merged[1] for merged in group) - 1
            predicted_baseline = m * word_center + c
            measured_baseline = measure_word_baseline(
                ink, x0, x1, predicted_baseline, x_height,
            )
            marks = validate_authored_marks(
                word, group, predicted_baseline, x_height, line,
            )
            gids = [c["id"] for merged in group for c in merged[2]]
            rows.append(dict(
                text=word, line=line, ids=gids, marks=marks,
                x0=x0,
                x1=x1,
                baseline=measured_baseline,
                y0=min(c["y0"] for merged in group for c in merged[2]),
                y1=max(c["y1"] for merged in group for c in merged[2]) - 1))

    height, width = ink.shape
    return dict(
        key=key, path=path, lab=lab, rows=rows, fits=fits, bands=bands,
        width=width, height=height,
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--title-src",
                    default=str(MASKS / "manifesto-title-source.png"))
    ap.add_argument(
        "--body-part-1-src",
        default=str(MASKS / "manifesto-body-part-1-source.png"),
    )
    ap.add_argument(
        "--body-part-2-src",
        default=str(MASKS / "manifesto-body-part-2-source.png"),
    )
    ap.add_argument("--out", default=str(HERE / ".." / ".." / "src" / "pages"
                                         / "about" / "manifesto-words.ts"))
    args = ap.parse_args()

    normalized_body = MASKS / "manifesto-body-normalized.png"
    normalization = write_normalized_body_mask(
        pathlib.Path(args.body_part_1_src),
        pathlib.Path(args.body_part_2_src),
        normalized_body,
    )
    source_paths = {
        "title": pathlib.Path(args.title_src),
        "body": normalized_body,
    }
    write_dilated_mask(
        source_paths["title"],
        MASKS / "manifesto-title-ink.png",
        RENDER_DILATION_RADII["title"],
    )
    write_dilated_mask(
        source_paths["body"],
        MASKS / "manifesto-body-ink.png",
        RENDER_DILATION_RADII["body"],
    )
    for key, source_path in source_paths.items():
        write_dilated_mask(
            source_path, MASKS / f"manifesto-{key}-marks.png",
            MARK_DILATION_RADII[key],
        )

    title = segment_source(
        source_paths["title"], TITLE_TEXT, 0, "title",
    )
    body_source = segment_source(
        source_paths["body"], BODY_TEXT, len(TITLE_TEXT), "body",
    )
    sources = [title, body_source]

    # Both PNGs were exported at the same drawing scale. Normalize everything
    # from the body x-height so the title keeps the size relationship she drew.
    scale = X_HEIGHT_UNITS / float(np.median(
        [fit[2] for fit in body_source["fits"].values()]
    ))

    # --- mask crops ---------------------------------------------------------
    out = []
    for source in sources:
        source["out"] = []
        for word in source["rows"]:
            left = max(0, word["x0"] - MASK_PAD)
            right = min(source["width"] - 1, word["x1"] + MASK_PAD)
            top = max(0, word["y0"] - MASK_PAD)
            bottom = min(source["height"] - 1, word["y1"] + MASK_PAD)
            base = (word["baseline"] - top) * scale
            marks = []
            for mark in word["marks"]:
                mark_left = max(0, mark["x0"] - MARK_PAD)
                mark_right = min(source["width"] - 1, mark["x1"] + MARK_PAD)
                mark_top = max(0, mark["y0"] - MARK_PAD)
                mark_bottom = min(source["height"] - 1, mark["y1"] + MARK_PAD)
                marks.append(dict(
                    x=round((mark_left - left) * scale, 1),
                    y=round((mark_top - top) * scale, 1),
                    w=round((mark_right - mark_left + 1) * scale, 1),
                    h=round((mark_bottom - mark_top + 1) * scale, 1),
                    mx=round(-mark_left * scale, 1),
                    my=round(-mark_top * scale, 1),
                ))
            record = dict(
                t=word["text"], l=word["line"], s=source["key"],
                x=round(left * scale, 1),
                y=round(top * scale, 1),
                w=round((right - left + 1) * scale, 1),
                h=round((bottom - top + 1) * scale, 1),
                b=round(base, 1),
                n=WORD_BASELINE_NUDGES.get(
                    (word["line"], word["text"]), 0.0
                ),
                m=marks,
            )
            source["out"].append(record)
            out.append(record)

    # Natural word space, so the rendered spacing is hers and not a guess.
    spaces = []
    for line in body_source["fits"]:
        ws = [(row, record)
              for row, record in zip(body_source["rows"], body_source["out"])
              if record["l"] == line]
        for (p, _), (q, _) in zip(ws, ws[1:]):
            # Each crop owns MASK_PAD transparent pixels on both sides.
            spaces.append((q["x0"] - p["x1"] - 2 * MASK_PAD) * scale)
    space = round(float(np.median(spaces)), 1)

    out = [
        record for record in out
        if not (
            record["l"] == OMITTED_WORD["line"]
            and record["t"] == OMITTED_WORD["text"]
        )
    ]

    reused_source = next(
        record for record in out
        if record["l"] == INSERTED_WORD_REUSE["source_line"]
        and record["t"] == INSERTED_WORD_REUSE["text"]
    )
    insertion_index = next(
        index for index, record in enumerate(out)
        if record["l"] == INSERTED_WORD_REUSE["after_line"]
        and record["t"] == INSERTED_WORD_REUSE["after_text"]
    )
    reused_word = dict(
        reused_source,
        l=INSERTED_WORD_REUSE["after_line"],
    )
    out.insert(insertion_index + 1, reused_word)

    def mark_ts(mark):
        return (
            f'{{ x: {mark["x"]}, y: {mark["y"]}, '
            f'w: {mark["w"]}, h: {mark["h"]}, '
            f'mx: {mark["mx"]}, my: {mark["my"]} }}'
        )

    body = "\n".join(
        f'  {{ t: {json.dumps(o["t"])}, l: {o["l"]}, s: "{o["s"]}", '
        f'x: {o["x"]}, y: {o["y"]}, w: {o["w"]}, h: {o["h"]}, '
        f'b: {o["b"]}, n: {o["n"]}, '
        f'm: [{", ".join(mark_ts(m) for m in o["m"])}] }},'
        for o in out)
    source_sizes = {
        source["key"]: {
            "w": round(source["width"] * scale, 1),
            "h": round(source["height"] * scale, 1),
        }
        for source in sources
    }
    header = f'''/* GENERATED by scripts/manifesto/build.py -- do not edit by hand.
   Re-run that script to remeasure the alpha-mask exports.

   One record per word, because words are the atomic layout unit: they wrap
   whole or not at all, so a line break can never split letters.

   Coordinates are in a shared unit space where the body x-height is
   {X_HEIGHT_UNITS} units. The browser crops the original PNG alpha; there are
   no reconstructed paths and CSS supplies the visible ink colour.

     x, y  crop origin in the source mask, in units
     w, h  bounding box of the ink, in units
     b     baseline offset from the top of that box. Aligning words by b (not
           by box top) is what lets them sit on one straight line despite
           different ascenders and descenders.
     n     optical baseline nudge for source-specific irregularities.
     m     authored i-dot/period crops used for optical weight correction. */

export type ManifestoMark = {{
  /** Position inside the word crop. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Mask position for this crop inside the full source sprite. */
  mx: number;
  my: number;
}};

export type ManifestoWord = {{
  /** The word itself -- also the accessible text. */
  t: string;
  /** Source line, 0 = title. Line breaks are not reused for layout. */
  l: number;
  /** Which original alpha-mask PNG this word is cropped from. */
  s: "title" | "body";
  x: number;
  y: number;
  w: number;
  h: number;
  b: number;
  /** Optical baseline correction in normalized handwriting units. */
  n: number;
  /** Authored i-dots and periods that receive extra optical weight. */
  m: ManifestoMark[];
}};

/** Median word space in the original hand, in units. */
export const WORD_SPACE = {space};

/** Body x-height in units; the unit scale everything else is relative to. */
export const X_HEIGHT = {X_HEIGHT_UNITS};

/** Full source-mask dimensions in the same normalized unit space. */
export const MANIFESTO_SOURCES = {{
  title: {{ w: {source_sizes["title"]["w"]}, h: {source_sizes["title"]["h"]} }},
  body: {{ w: {source_sizes["body"]["w"]}, h: {source_sizes["body"]["h"]} }},
}} as const;

/** Build-time measurements used to match the two authored body exports. */
export const MANIFESTO_BODY_NORMALIZATION = {{
  part1XHeight: {normalization["part_1_x_height"]:.2f},
  part2XHeightBefore: {normalization["part_2_x_height"]:.2f},
  part2Scale: {normalization["part_2_scale"]:.5f},
  part2XHeightAfter: {normalization["part_2_x_height_after"]:.2f},
  lineStep: {normalization["target_line_step"]:.2f},
}} as const;

export const MANIFESTO_WORDS: ManifestoWord[] = [
'''
    dest = pathlib.Path(args.out).resolve()
    dest.write_text(header + body + "\n];\n")
    line_count = len(title["bands"]) + len(body_source["bands"])
    print(f"{len(out)} words, {line_count} lines, scale {scale:.5f}, "
          f"word space {space} units")
    print(f"wrote {dest} ({dest.stat().st_size / 1024:.0f} KB of crop data)")


if __name__ == "__main__":
    main()
