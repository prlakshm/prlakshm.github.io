import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const journalsPath = new URL("../src/pages/home/journals.ts", import.meta.url);

test("orders the landing notebooks from engagement to building to emerging technology", async () => {
  const source = await readFile(journalsPath, "utf8");
  const surprise = source.indexOf('id: "surprise-rail"');
  const mixr = source.indexOf('id: "mixr"');
  const reasons = source.indexOf('id: "reasons-to-watch"');

  assert.ok(surprise >= 0, "Surprise Rail should be on the shelf");
  assert.ok(mixr > surprise, "Mixr should follow Surprise Rail");
  assert.ok(reasons > mixr, "Reasons to Watch should follow Mixr");
  assert.match(source, /id: "surprise-rail",[\s\S]*?number: "01"/);
  assert.match(source, /id: "mixr",[\s\S]*?number: "02"/);
  assert.match(source, /id: "reasons-to-watch",[\s\S]*?number: "03"/);
  /* href is the link exactly as written and is NOT auto-prefixed: hash routes
     carry their own "#", the finished static case study is a real path. */
  assert.match(source, /id: "reasons-to-watch",[\s\S]*?href: "#\/hbo-max-rtw"/);
  assert.match(source, /id: "surprise-rail",[\s\S]*?href: "\/surprise-rail\/"/);
  assert.doesNotMatch(source, /id: "coach"/);
});
