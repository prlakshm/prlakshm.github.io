import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pagePath = new URL("../public/mixr/index.html", import.meta.url);

test("centers the iPad and Mac laptop while sharing a caption baseline", async () => {
  const html = await readFile(pagePath, "utf8");

  assert.match(
    html,
    /\.devices\{[^}]*align-items:stretch[^}]*\}/,
  );
  assert.match(
    html,
    /\.devices figure\{[^}]*display:grid;[^}]*grid-template-rows:minmax\(0,1fr\) auto;[^}]*align-items:center/,
  );
  assert.match(
    html,
    /\.devices \.device\{[^}]*margin-bottom:15px/,
  );
  assert.doesNotMatch(
    html,
    /\.devices \.device--mac\{[^}]*margin-bottom:/,
  );
  assert.match(html, /<figcaption>iPad<\/figcaption>/);
  assert.match(html, /<figcaption>Mac laptop<\/figcaption>/);
  assert.doesNotMatch(html, /<figcaption>Mac<\/figcaption>/);
});
