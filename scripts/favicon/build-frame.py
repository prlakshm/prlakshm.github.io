from pathlib import Path
from shutil import copyfile

from PIL import Image


ROOT = Path(__file__).resolve().parents[2]
ICONS = ROOT / "public" / "icons"
SOURCE = ICONS / "frame-favicon-180.png"
NAMED_ICO = ICONS / "frame-favicon.ico"
ROOT_ICO = ROOT / "public" / "favicon.ico"


with Image.open(SOURCE) as source:
    source.convert("RGBA").save(
        NAMED_ICO,
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
    )

copyfile(NAMED_ICO, ROOT_ICO)
print(f"Wrote {NAMED_ICO.relative_to(ROOT)} and {ROOT_ICO.relative_to(ROOT)}")
