import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const resumeHref = "/docs/Pranavi_Ram_Resume_2026.pdf";
const sourcePaths = [
  "../src/components/Header.tsx",
  "../src/pages/home/Home.tsx",
  "../public/mixr/index.html",
  "../public/surprise-rail/index.html",
  "../public/reasons-to-watch/index.html",
];

test("every portfolio resume link opens Pranavi Ram's 2026 resume", async () => {
  for (const relativePath of sourcePaths) {
    const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
    assert.match(source, new RegExp(resumeHref.replaceAll(".", "\\.")));
  }

  const pdf = await readFile(
    new URL("../public/docs/Pranavi_Ram_Resume_2026.pdf", import.meta.url),
  );
  assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
});
