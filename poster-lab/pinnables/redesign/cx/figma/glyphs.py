# Outline text into SVG path data, glyph by glyph, at positions measured by Chrome.
# usage: PYTHONPATH=<dir with brotli.py> python3 glyphs.py jobs.json out.json
# job: {"font": path, "str": "...", "pos": [[x, y], ...], "size": px,
#       "fallback": {"path": font or .ttc, "ps": PostScript name}}   (optional)
# The fallback mirrors Chrome's: a glyph missing from the font is drawn from the
# platform font Chrome actually used for it (ask CDP CSS.getPlatformFontsForNode).
# brotli.py beside this file is a decompress-only shim over Node's zlib, so
# fontTools can read the .woff2 files without the brotli package installed.
import json
import sys

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTCollection, TTFont

fonts = {}


def load(path, ps=None):
    key = (path, ps)
    if key not in fonts:
        if path.endswith('.ttc'):
            f = next(t for t in TTCollection(path).fonts if t['name'].getDebugName(6) == ps)
        else:
            f = TTFont(path)
        fonts[key] = (f.getGlyphSet(), f.getBestCmap(), f['head'].unitsPerEm)
    return fonts[key]


def ntos(n):
    return ('%.2f' % n).rstrip('0').rstrip('.')


out = []
for job in json.load(open(sys.argv[1])):
    primary = load(job['font'])
    fb = job.get('fallback')
    parts = []
    for ch, (x, y) in zip(job['str'], job['pos']):
        if ch.isspace():
            continue
        glyphs, cmap, upm = primary
        if ord(ch) not in cmap and fb:
            glyphs, cmap, upm = load(fb['path'], fb.get('ps'))
        name = cmap.get(ord(ch))
        if name is None:
            continue
        s = job['size'] / upm
        pen = SVGPathPen(glyphs, ntos=ntos)
        glyphs[name].draw(TransformPen(pen, (s, 0, 0, -s, x, y)))
        parts.append(pen.getCommands())
    out.append(' '.join(parts))
json.dump(out, open(sys.argv[2], 'w'))
