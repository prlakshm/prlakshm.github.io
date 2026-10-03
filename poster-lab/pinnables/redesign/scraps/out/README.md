# Newspaper scraps — how to use these in Figma

**scrap-a / scrap-b / scrap-c.png** — finished scraps at 2x: newsprint, torn
on four sides, cut through with lace, gold leaf. Drag straight into Figma.

**scrap-*-torn.png** — the same scraps before the lace. Use these when you
want to place the cut yourself:

1. Drag a `lace-*-web.svg` onto the canvas (it is the paper that *remains*:
   a sheet with holes).
2. Put it on top of the torn scrap, move and rotate it until the holes sit
   where you want them (keep a headline or a face clear).
3. Select both → **Use as mask** (⌥⌘M). The web must be the top layer.
   Scale the web, don't scale the scrap, if you want bigger holes.

**lace-*-holes.svg** — the cut shapes themselves (black), if you'd rather
subtract them from a vector or recolour them.

The four laces: 1 net (star-and-hexagon), 2 rosette (12-point stars),
3 cross (8-point star and cross), 4 flower (six petals).

Regenerate with `python3 ../build.py`. Per-scrap "keep" rectangles (what the
lace must not eat) and which lace is used are at the bottom of build.py.
