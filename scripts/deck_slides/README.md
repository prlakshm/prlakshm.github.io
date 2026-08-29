# Deck slides

The homepage's macOS windows (src/pages/home/Decks.tsx) page through
pre-rendered frames of the two deck PDF exports, not the PDFs themselves —
public/home/decks/<id>/slide-NN.webp, 1280x720, ~10-45KB each.

Regenerate whenever either PDF export changes:

```sh
swift scripts/deck_slides/pdf2png.swift public/cursor-loves-indie.pdf /tmp/cursor-slides 1280
swift scripts/deck_slides/pdf2png.swift public/figma-sound.pdf /tmp/figma-slides 1280
python3 - <<'EOF'
import os
from PIL import Image
for deck in ["cursor", "figma"]:
    out = f"public/home/decks/{deck}"
    os.makedirs(out, exist_ok=True)
    n = 1
    while os.path.exists(f"/tmp/{deck}-slides/slide-{n:02d}.png"):
        Image.open(f"/tmp/{deck}-slides/slide-{n:02d}.png").convert("RGB").save(
            f"{out}/slide-{n:02d}.webp", "WEBP", quality=82, method=6)
        n += 1
EOF
```

pdf2png.swift renders with CoreGraphics (no Poppler/ImageMagick needed on a
Mac). Both PDFs are 960x540 pages — exactly 16:9, which .deck-screen's
aspect-ratio depends on. If a future export changes the page size, the script
prints each page's media box; check it still says 16:9 before shipping.

If the slide COUNT changes, update `slideCount` in src/pages/home/Decks.tsx.
