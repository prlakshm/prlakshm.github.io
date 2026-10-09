import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  normalizeRoutePath,
  normalizeRouteSearch,
  pageOwnsChrome,
} from "../src/routePolicy.ts";

test("chrome ownership is based on canonical routes, including trailing slashes", () => {
  for (const path of ["/", "/about", "/about/", "/projects/", "/surprise-rail-v1/"]) {
    assert.equal(pageOwnsChrome(path), true, `${path} should own its current chrome`);
  }
  for (const path of ["/fun", "/fun/", "/hbo-max-rtw/"]) {
    assert.equal(pageOwnsChrome(path), false, `${path} should keep legacy chrome`);
  }

  assert.equal(normalizeRoutePath("/about///"), "/about");
  assert.equal(normalizeRoutePath("/"), "/");
  assert.equal(normalizeRouteSearch("?"), "");
  assert.equal(normalizeRouteSearch("?cards=rail"), "?cards=rail");
});

test("App renders ownership and route effects from normalized values", async () => {
  const source = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");

  assert.match(source, /normalizeRoutePath\(location\.pathname\)/);
  assert.match(source, /normalizeRouteSearch\(location\.search\)/);
  assert.match(source, /pageOwnsChrome\(pathname\)/);
  assert.match(source, /navigate\([\s\S]*replace:\s*true/);
  assert.doesNotMatch(source, /OWN_CHROME\.includes/);
});

test("static case-study fallbacks reserve space invisibly without copying nav CSS", async () => {
  const files = [
    "../public/surprise-rail/index.html",
    "../public/mixr/index.html",
  ];

  for (const file of files) {
    const html = await readFile(new URL(file, import.meta.url), "utf8");
    const mountStart = html.indexOf('<div id="site-nav"');
    const mountEnd = html.indexOf('<div class="shell">', mountStart);
    const fallback = html.slice(mountStart, mountEnd > mountStart ? mountEnd : mountStart + 2500);

    assert.match(
      fallback,
      /<header class="wt-nav wt-nav-fallback" style="visibility:hidden;height:var\(--nav-height,78px\)">/,
    );
    assert.match(
      fallback,
      /<svg class="ext-arrow" viewBox="0 0 10 10" width="13" height="13"/,
    );
    assert.equal((fallback.match(/wt-nav-fallback/g) ?? []).length, 1);
    assert.doesNotMatch(fallback, /\.wt-nav\s*\{/);
  }
});
