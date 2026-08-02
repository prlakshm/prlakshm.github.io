import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("moves the complete Pinnables notebook treatment up two pixels", async () => {
  const source = await readFile(
    new URL("../src/pages/home/journals.ts", import.meta.url),
    "utf8",
  );
  const start = source.indexOf('id: "pinnables"');
  const end = source.indexOf("spill:", start);
  const pinnables = source.slice(start, end);

  assert.match(pinnables, /offsetY: -2,/);
});
