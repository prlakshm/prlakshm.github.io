"""The five red-notebook stickers, drawn as vinyl.

Every sticker is built the same way the tan notebook's are: artwork, a black
keyline hugging it, a white die-cut border outside that, and a soft shadow under
the whole thing. `vinyl()` is that treatment; everything above it just supplies a
shape or a panel.

All geometry in this file is in COVER SPACE — the flat rectangle of the closed
front cover, 351 x 506pt — at SS x supersampling. compose.py warps that one layer
onto whichever notebook it is placing, so a sticker is positioned once and lands
correctly on both the closed and the open frame.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

SRC = Path(__file__).resolve().parent / "src"
SS = 4  # supersample factor; everything below is authored in points, drawn at SSx

# Cover space, in points.
COVER_W, COVER_H = 351, 506

# ---------------------------------------------------------------------- palette
INK = (19, 19, 24)  # the sticker keyline — near-black, not black
DIECUT = (247, 245, 241)  # vinyl border, faintly warm
MAX_INK = (10, 10, 16)  # panel ground; the case study's --max-ink
PANEL_RULE = (44, 44, 55)  # the case study's #2c2c37 hairline on black
ICON = (179, 192, 204)  # measured off the agent slide's icon strokes
ARROW = (159, 175, 190)  # measured off the same slide's arrows
DECK_TEXT = (233, 237, 243)
DECK_DIM = (150, 158, 172)

# The secondary purple. The reference card ran a pale periwinkle here; this is a
# deeper, more saturated violet that still holds its own against a black ground
# at sticker size. One constant — change it here and every use follows.
ACCENT = (160, 92, 255)

ROUNDED = "/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf"
HELV = "/System/Library/Fonts/HelveticaNeue.ttc"
HELV_BOLD, HELV_REG, HELV_MED = 1, 0, 10


def helv(pt, index=HELV_BOLD):
    return ImageFont.truetype(HELV, int(round(pt * SS)), index=index)


# ------------------------------------------------------------------ mask makers
def grow(alpha, radius, soft=0.10):
    """Dilate an antialiased alpha by `radius` points, with rounded joins.

    Blur-and-remap rather than MaxFilter: a box dilation would square off the
    corners, and a real die-cut is cut with a round bit. For a straight edge a
    Gaussian of sigma s crosses 0.25 at 0.95s outside the edge, so sigma =
    radius/0.95 grows the shape by very close to `radius`. The soft ramp around
    that level is what keeps the new edge antialiased.
    """
    r = radius * SS
    if r <= 0:
        return alpha
    im = Image.fromarray((np.clip(alpha, 0, 1) * 255).astype(np.uint8))
    b = np.asarray(im.filter(ImageFilter.GaussianBlur(r / 0.95))).astype(float) / 255.0
    return np.clip((b - 0.25) / soft + 0.5, 0, 1)


def fill_holes(alpha):
    """Close anything fully enclosed by the shape.

    A die-cut is one contour through one piece of vinyl — it does not punch out
    the counter of an 'a' or the ring inside HBO's O. Without this the tight
    pockets in the lockup survive as pinholes and the red leather shows through
    them as speckle.
    """
    b = (np.clip(alpha, 0, 1) > 0.5).astype(np.uint8) * 255
    # .copy() matters: an image wrapping a numpy buffer takes floodfill's writes
    # silently and drops them, so without it this is a no-op that fills nothing.
    inv = Image.fromarray(255 - b).copy()
    ImageDraw.floodfill(inv, (0, 0), 0)  # outside -> black; only holes stay white
    holes = np.asarray(inv).astype(float) / 255.0
    return np.clip(alpha + holes, 0, 1)


def blur_a(alpha, radius):
    im = Image.fromarray((np.clip(alpha, 0, 1) * 255).astype(np.uint8))
    return np.asarray(im.filter(ImageFilter.GaussianBlur(radius * SS))).astype(float) / 255.0


def pad(alpha, p):
    p = int(round(p * SS))
    return np.pad(alpha, p, mode="constant")


def over(dst, src_rgb, src_a):
    """Composite premultiplied-safe: src over dst, both (H,W,4) float 0..1."""
    a = src_a[..., None]
    dst[..., :3] = src_rgb * a + dst[..., :3] * (1 - a)
    dst[..., 3] = np.clip(src_a + dst[..., 3] * (1 - src_a), 0, 1)
    return dst


# ------------------------------------------------------------------- holographic
def holo(shape, seed=0):
    """The pearlescent vinyl the tan notebook's lettering is printed on.

    Pale bands of pink, lilac and ice blue running diagonally across an off-white
    base, brightest towards the top left. Deliberately low contrast: at final
    size this should read as sheen, not as stripes.
    """
    h, w = shape
    yy, xx = np.mgrid[0:h, 0:w].astype(float)
    rng = np.random.default_rng(seed)
    diag = (xx * 0.82 + yy * 0.58) / max(w, h)

    stops = np.array(
        [
            [252, 248, 244],  # warm white
            [246, 214, 228],  # pink
            [228, 224, 248],  # lilac
            [214, 232, 250],  # ice blue
            [250, 246, 240],  # warm white
        ],
        float,
    )
    t = (diag * (len(stops) - 1) * 1.35 + rng.random() * 0.4) % (len(stops) - 1)
    i = np.floor(t).astype(int)
    f = (t - i)[..., None]
    f = f * f * (3 - 2 * f)  # smoothstep, so the bands blend rather than crease
    rgb = stops[i] * (1 - f) + stops[(i + 1) % len(stops)] * f

    # light falls from the top left, the way it does on the tan cover
    fall = 1.0 - 0.10 * np.clip((xx / w) * 0.5 + (yy / h) * 0.5, 0, 1)
    rgb = rgb * fall[..., None]
    # a whisper of grain so it reads as printed vinyl, not a CSS gradient
    rgb += rng.normal(0, 2.0, rgb.shape)
    return np.clip(rgb / 255.0, 0, 1)


# ------------------------------------------------------------- the vinyl treatment
def vinyl(art_rgb, art_a, keyline=1.6, border=2.2, shadow=0.42):
    """Wrap artwork in a keyline, a die-cut border and a shadow.

    `art_rgb`/`art_a` are the sticker's printed face. Returns RGBA float with
    enough padding around it to hold the shadow.
    """
    p = keyline + border + 6
    a = pad(art_a, p)
    rgb = np.pad(art_rgb, ((int(round(p * SS)),) * 2, (int(round(p * SS)),) * 2, (0, 0)), mode="edge")

    key = fill_holes(grow(a, keyline))
    cut = fill_holes(grow(key, border))

    out = np.zeros(a.shape + (4,), float)

    # shadow first, under everything, offset down and very slightly right
    sh = grow(cut, 0.4)
    sh = np.roll(blur_a(sh, 1.2), (int(1.5 * SS), int(0.5 * SS)), axis=(0, 1))
    out = over(out, np.zeros(a.shape + (3,)), sh * shadow)

    out = over(out, np.ones(a.shape + (3,)) * (np.array(DIECUT) / 255.0), cut)
    out = over(out, np.ones(a.shape + (3,)) * (np.array(INK) / 255.0), key)
    out = over(out, rgb, a)
    return out


# --------------------------------------------------------------------- text art
def text_mask(lines, font, tracking=0.0, leading=1.06, align="center"):
    """Render lines to an alpha mask, letter by letter so tracking is possible."""
    probe = Image.new("L", (8, 8))
    d = ImageDraw.Draw(probe)
    tr = tracking * SS

    widths, boxes = [], []
    for line in lines:
        w = 0.0
        for ch in line:
            w += d.textlength(ch, font=font) + tr
        widths.append(w - tr if line else 0.0)
        boxes.append(font.getbbox(line))

    asc, desc = font.getmetrics()
    lh = (asc + desc) * leading
    W = int(max(widths)) + 8 * SS
    H = int(lh * len(lines)) + 8 * SS
    img = Image.new("L", (W, H), 0)
    dd = ImageDraw.Draw(img)
    for i, line in enumerate(lines):
        x = {"center": (W - widths[i]) / 2, "left": 4 * SS, "right": W - widths[i] - 4 * SS}[align]
        y = 4 * SS + i * lh
        for ch in line:
            dd.text((x, y), ch, font=font, fill=255)
            x += d.textlength(ch, font=font) + tr
    a = np.asarray(img).astype(float) / 255.0
    ys, xs = np.nonzero(a > 0.02)
    return a[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]


def word_sticker(lines, cap_pt, tracking=0.0, leading=1.02, align="center", seed=1):
    """A lettering sticker: holographic face, keyline, die-cut. The 'Surprise'
    treatment from the tan notebook, with the ratios taken off it — the keyline
    is about 11% of cap height and the border about half the keyline."""
    font = ImageFont.truetype(ROUNDED, int(round(cap_pt * SS * 1.36)))
    a = text_mask(lines, font, tracking=tracking, leading=leading, align=align)
    return vinyl(holo(a.shape, seed), a, keyline=cap_pt * 0.115, border=cap_pt * 0.062)


# -------------------------------------------------------------------- mark art
def hbomax_sticker(width_pt):
    """The official lockup, given the same vinyl treatment as the lettering."""
    mark = Image.open(SRC / "hbomax-mark.png")
    w = int(round(width_pt * SS))
    h = int(round(w * mark.height / mark.width))
    a = np.asarray(mark.resize((w, h), Image.LANCZOS))[..., 3].astype(float) / 255.0
    cap = width_pt * 0.30  # HBO's cap height is roughly 30% of the lockup width
    return vinyl(holo(a.shape, seed=7), a, keyline=cap * 0.115, border=cap * 0.080)


def hbomax_flat(width_px, hbo_rgb, max_rgb):
    """The lockup in two flat colours, for use inside a panel. Rows 162..177 of
    the mark are the empty band between HBO and max, so the split is exact."""
    mark = Image.open(SRC / "hbomax-mark.png")
    h = int(round(width_px * mark.height / mark.width))
    a = np.asarray(mark.resize((width_px, h), Image.LANCZOS))[..., 3].astype(float) / 255.0
    split = int(round(170 / mark.height * h))
    rgb = np.zeros(a.shape + (3,), float)
    rgb[:split] = np.array(hbo_rgb) / 255.0
    rgb[split:] = np.array(max_rgb) / 255.0
    return rgb, a


# ------------------------------------------------------------------ panel art
def rounded_mask(w, h, radius):
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, w - 1, h - 1], radius=radius, fill=255)
    return np.asarray(m).astype(float) / 255.0


def panel_sticker(rgb, a, keyline=0.0, border=2.4):
    """Panel stickers (the agent strip, the Bobby Flay card) get the die-cut and
    the shadow but no keyline — same as the tan notebook's tile sticker, which is
    a white-bordered rectangle rather than outlined lettering."""
    return vinyl(rgb, a, keyline=keyline, border=border, shadow=0.36)


def _draw_tracked(d, xy, text, font, fill, tracking):
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + tracking * SS
    return x


def tracked_width(d, text, font, tracking):
    w = sum(d.textlength(ch, font=font) + tracking * SS for ch in text)
    return w - tracking * SS if text else 0.0


# ------------------------------------------------------------ 1. the agent strip
def agent_strip(w_pt, h_pt):
    """The four-agent pipeline, in the deck's own styling.

    Icons and arrows are lifted straight off the slide rather than redrawn, and
    tinted with the greys measured from it, so the sticker reads as a piece of
    that deck — not as the red-and-blue reference, which is a different system.
    """
    W, H = int(w_pt * SS), int(h_pt * SS)
    panel = Image.new("RGB", (W, H), MAX_INK)

    # the slide's ground is a soft centre lift, not flat black
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    r = np.sqrt(((xx / W - 0.5) * 1.05) ** 2 + (yy / H - 0.5) ** 2)
    lift = np.clip(1 - r * 1.9, 0, 1) ** 2
    base = np.asarray(panel).astype(float) + lift[..., None] * np.array([16, 17, 24])
    panel = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(panel)

    steps = [("icon-analyze", "ANALYZE"), ("icon-write", "WRITE"),
             ("icon-edit", "EDIT"), ("icon-curate", "CURATE")]
    lab_font = helv(5.9)
    tracking = 0.34

    icon_h = h_pt * 0.40 * SS
    col_w = W / 4.0
    icon_cy = H * 0.44
    for i, (name, label) in enumerate(steps):
        cx = col_w * (i + 0.5)
        ic = Image.open(SRC / f"{name}.png")
        s = icon_h / ic.height
        iw, ih = int(ic.width * s), int(icon_h)
        m = ic.resize((iw, ih), Image.LANCZOS).split()[3]
        tint = Image.new("RGB", (iw, ih), ICON)
        panel.paste(tint, (int(cx - iw / 2), int(icon_cy - ih / 2)), m)

        tw = tracked_width(d, label, lab_font, tracking)
        _draw_tracked(d, (cx - tw / 2, icon_cy + ih / 2 + 0.30 * h_pt * SS * 0.34),
                      label, lab_font, DECK_TEXT, tracking)

    arrow = Image.open(SRC / "arrow.png")
    aw = int(h_pt * 0.13 * SS * arrow.width / arrow.height)
    ah = int(h_pt * 0.13 * SS)
    am = arrow.resize((aw, ah), Image.LANCZOS).split()[3]
    atint = Image.new("RGB", (aw, ah), ARROW)
    for i in range(3):
        cx = col_w * (i + 1)
        panel.paste(atint, (int(cx - aw / 2), int(icon_cy - ah / 2)), am)

    rgb = np.asarray(panel).astype(float) / 255.0
    a = rounded_mask(W, H, int(1.6 * SS))
    return panel_sticker(rgb, a, border=2.1)


# --------------------------------------------------------- 2. Beat Bobby Flay
def bobby_card(w_pt, h_pt):
    """The 'Because you liked...' card, rebuilt at sticker scale.

    Same composition as the reference — still on the left, headline, rule, quote
    and the lockup on the right — with the secondary colour moved to ACCENT and
    the copy trimmed to what stays legible at this size.
    """
    W, H = int(w_pt * SS), int(h_pt * SS)
    card = Image.new("RGB", (W, H), MAX_INK)
    d = ImageDraw.Draw(card)
    pad_px = int(2.0 * SS)

    # ---- still, left. Trimmed off the left of the 16:9 frame — only the outer
    # edge of the flame goes, so Bobby and the title art both stay whole.
    art_w = int(w_pt * 0.393 * SS)
    art_h = H - 2 * pad_px
    still = Image.open(SRC / "keyart-bobbyflay.png")
    cw = int(still.height * art_w / art_h)
    still = still.crop((still.width - cw, 0, still.width, still.height)).resize(
        (art_w, art_h), Image.LANCZOS
    )
    rounded = Image.new("L", (art_w, art_h), 0)
    ImageDraw.Draw(rounded).rounded_rectangle([0, 0, art_w - 1, art_h - 1], radius=int(1.2 * SS), fill=255)
    card.paste(still, (pad_px, pad_px), rounded)

    # ---- copy, right
    x = pad_px + art_w + int(4.0 * SS)
    y = pad_px + int(2.6 * SS)

    f_head = helv(6.2)
    f_friends = helv(6.6)
    f_body = helv(6.9, HELV_REG)
    f_body_i = helv(6.9, 2)

    head = "Because you liked…"
    d.text((x, y), head, font=f_head, fill=DECK_TEXT)
    fx = x + d.textlength(head, font=f_head) + 2.4 * SS

    # F·R·I·E·N·D·S, dots in the show's colours
    dots = [(226, 59, 46), (59, 125, 216), (242, 194, 48), (76, 175, 80), (226, 59, 46), (59, 125, 216)]
    letters = "FRIENDS"
    ly = y - 0.4 * SS
    for i, ch_ in enumerate(letters):
        d.text((fx, ly), ch_, font=f_friends, fill=(255, 255, 255))
        fx += d.textlength(ch_, font=f_friends)
        if i < len(letters) - 1:
            fx += 1.5 * SS
            rr = 0.5 * SS
            cy = ly + f_friends.getmetrics()[0] * 0.62
            d.ellipse([fx - rr, cy - rr, fx + rr, cy + rr], fill=dots[i])
            fx += 1.5 * SS

    y += f_head.getmetrics()[0] + 2.4 * SS
    d.line([(x, y), (W - 3.0 * SS, y)], fill=ACCENT, width=max(1, int(0.6 * SS)))
    y += 3.4 * SS

    # ---- the quote, with the borrowed-from-Friends bits in the accent
    runs = [
        [("“As if ", "n"), ("Monica Geller", "a"), (" from ", "n"), ("Friends", "ai"), (" got her", "n")],
        [("own cooking show. All her sassy,", "n")],
        [("competitive fire in a 20-minute duel.”", "n")],
    ]
    lh = f_body.getmetrics()[0] * 1.40
    for line in runs:
        cx = x
        for text, kind in line:
            font = f_body_i if kind.endswith("i") else f_body
            fill = ACCENT if kind.startswith("a") else (203, 207, 216)
            d.text((cx, y), text, font=font, fill=fill)
            cx += d.textlength(text, font=font)
        y += lh

    # ---- lockup, bottom right
    lw = int(w_pt * 0.092 * SS)
    lrgb, la = hbomax_flat(lw, (255, 255, 255), ACCENT)
    lh_px = la.shape[0]
    lx = W - int(3.0 * SS) - lw
    ly2 = H - pad_px - int(1.8 * SS) - lh_px
    region = np.asarray(card).astype(float)[ly2 : ly2 + lh_px, lx : lx + lw] / 255.0
    blended = lrgb * la[..., None] + region * (1 - la[..., None])
    card.paste(Image.fromarray((blended * 255).astype(np.uint8)), (lx, ly2))

    rgb = np.asarray(card).astype(float) / 255.0
    a = rounded_mask(W, H, int(2.0 * SS))
    return panel_sticker(rgb, a, border=2.3)
