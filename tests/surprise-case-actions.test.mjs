import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pagePath = new URL("../public/surprise-rail/index.html", import.meta.url);

test("aligns Surprise Rail Home and Next with the conclusion at the shell breakpoint", async () => {
  const html = await readFile(pagePath, "utf8");

  assert.match(
    html,
    /@media \(max-width:1248px\)\{\s*\.case-actions\{right:0\}\s*\}/,
  );
});
