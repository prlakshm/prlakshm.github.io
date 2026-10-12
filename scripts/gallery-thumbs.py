# Called by gallery-thumbs.mjs: resize each listed /path to public/gallery/thumb/<path>.webp
import json, os, sys
from PIL import Image
root, listfile = sys.argv[1], sys.argv[2]
LONG = 280
made = total_in = total_out = 0
manifest = []
for src in json.load(open(listfile)):
    inp = os.path.join(root, "public", src.lstrip("/"))
    if not os.path.exists(inp):
        print("missing", src); continue
    outp = os.path.join(root, "public/gallery/thumb", os.path.splitext(src.lstrip("/"))[0] + ".webp")
    os.makedirs(os.path.dirname(outp), exist_ok=True)
    im = Image.open(inp)
    im = im.convert("RGBA") if (im.mode in ("RGBA", "LA", "P") and "transparency" in im.info or im.mode in ("RGBA", "LA")) else im.convert("RGB")
    im.thumbnail((LONG, LONG), Image.LANCZOS)
    im.save(outp, "WEBP", quality=80, method=6)
    manifest.append("/" + os.path.relpath(outp, os.path.join(root, "public")))
    made += 1; total_in += os.path.getsize(inp); total_out += os.path.getsize(outp)
print(f"thumbs: {made}  originals {total_in/1e6:.1f} MB -> thumbs {total_out/1e6:.2f} MB")
# the list other pages prefetch (src/motion/stormHandoff.ts)
json.dump(sorted(set(manifest)), open(os.path.join(root, "public/gallery/thumb/index.json"), "w"))
