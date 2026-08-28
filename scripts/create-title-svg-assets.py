from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTCollection
from fontTools.misc.transform import Transform


FONT_PATH = "/System/Library/Fonts/Supplemental/Didot.ttc"
OUTPUT_DIR = Path("public/branding/assets/title-svg")
FIGMA_COLOR = "#123C45"
SOUND_COLOR = "#82A6A6"
CANVAS_HEIGHT = 240
BASELINE = 215
TARGET_CAP_HEIGHT = 200
STROKE_WIDTH = 1.75


collection = TTCollection(FONT_PATH)
font = collection.fonts[2]  # Didot Bold
glyph_set = font.getGlyphSet()
cmap = font.getBestCmap()
hmtx = font["hmtx"].metrics

cap_height = getattr(font["OS/2"], "sCapHeight", 0)
if not cap_height:
    cap_pen = BoundsPen(glyph_set)
    glyph_set[cmap[ord("H")]].draw(cap_pen)
    cap_height = cap_pen.bounds[3]

scale = TARGET_CAP_HEIGHT / cap_height

kerning = {}
if "kern" in font:
    for table in font["kern"].kernTables:
        if hasattr(table, "kernTable"):
            kerning.update(table.kernTable)


def glyph_name(character: str) -> str:
    return cmap[ord(character)]


def glyph_bounds(name: str):
    pen = BoundsPen(glyph_set)
    glyph_set[name].draw(pen)
    return pen.bounds


def path_for(name: str, x_origin: float = 0) -> str:
    pen = SVGPathPen(glyph_set)
    transform = Transform(scale, 0, 0, -scale, x_origin, BASELINE)
    glyph_set[name].draw(TransformPen(pen, transform))
    return pen.getCommands()


def svg_document(paths: list[str], width: float, color: str, label: str) -> str:
    path_markup = "\n  ".join(
        f'<path d="{commands}" />' for commands in paths
    )
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.2f} {CANVAS_HEIGHT}" role="img" aria-label="{label}">
  <g fill="{color}" stroke="{color}" stroke-width="{STROKE_WIDTH}" stroke-linejoin="round" paint-order="stroke fill">
  {path_markup}
  </g>
</svg>
'''


def create_glyph(character: str, filename: str, color: str, label: str):
    name = glyph_name(character)
    advance, _ = hmtx[name]
    bounds = glyph_bounds(name)
    left = min(0, bounds[0] * scale)
    width = max(advance * scale, bounds[2] * scale) - left + 24
    x_origin = 12 - left
    document = svg_document([path_for(name, x_origin)], width, color, label)
    (OUTPUT_DIR / filename).write_text(document, encoding="utf-8")


def create_word(text: str, filename: str, color: str, label: str):
    paths = []
    cursor = 12.0
    previous = None
    for character in text:
        name = glyph_name(character)
        if previous is not None:
            cursor += kerning.get((previous, name), 0) * scale
        paths.append(path_for(name, cursor))
        advance, _ = hmtx[name]
        cursor += advance * scale
        previous = name
    document = svg_document(paths, cursor + 12, color, label)
    (OUTPUT_DIR / filename).write_text(document, encoding="utf-8")


OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
create_word("FIGMA", "figma-word.svg", FIGMA_COLOR, "FIGMA")

for character in "FIGMA":
    create_glyph(
        character,
        f"figma-{character.lower()}.svg",
        FIGMA_COLOR,
        f"FIGMA letter {character}",
    )

for character in "SOUND":
    create_glyph(
        character,
        f"sound-{character.lower()}.svg",
        SOUND_COLOR,
        f"SOUND letter {character}",
    )
