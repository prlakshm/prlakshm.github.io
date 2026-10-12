/* Light copies of everything on the Everything canvas, for when it's small
   on screen (the whole canvas opening on a phone, or zoomed out): 280px on the
   long side, webp, in public/gallery/thumb/<the original's path>.webp. The
   canvas shows these first and swaps in the original once a piece is shown
   big enough to need it (Gallery.tsx). Run after adding or changing art:
     node scripts/gallery-thumbs.mjs */
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");
const out = join(mkdtempSync(join(tmpdir(), "thumbs-")), "clusters.mjs");
await build({ entryPoints: [join(root, "src/pages/gallery/clusters.ts")], bundle: true, format: "esm", platform: "node", outfile: out, loader: { ".json": "json" }, logLevel: "error" });
const { PIECES } = await import(pathToFileURL(out).href);
const srcs = [...new Set(PIECES.flatMap((p) => [p.kind === "video" ? p.poster : p.src]).filter(Boolean))];
const list = join(tmpdir(), "gallery-thumbs.json");
writeFileSync(list, JSON.stringify(srcs));
execFileSync("python3", [join(root, "scripts/gallery-thumbs.py"), root, list], { stdio: "inherit" });
