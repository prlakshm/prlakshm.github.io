## Handwritten Design Manifesto

### Files
| File | What |
|---|---|
| `manifesto-vector.svg` | **Live asset** — clean stroke redraw, one `<g>` per word |
| `manifesto-vector-preview.png` | Raster preview |
| `source.png` | Original pencil photo (reference) |

### Style
- Ink: `#704214` (`--mono-secondary`), transparent background
- Even monoline strokes (round caps), not a filled photo-trace

### Edit words
Open `manifesto-vector.svg` in Figma/Illustrator/Inkscape. Each `g.word` is one whole word — move/resize that group to straighten or reflow.

### Rebuild
```bash
.font-venv/bin/python3 scripts/draw_handwriting_manifesto.py
```
