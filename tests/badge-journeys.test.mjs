import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createConceptJourney,
} from "../src/components/badges/conceptJourney.ts";

class MemoryStorage {
  #values = new Map();

  getItem(key) {
    return this.#values.get(key) ?? null;
  }

  setItem(key, value) {
    this.#values.set(key, String(value));
  }

  removeItem(key) {
    this.#values.delete(key);
  }
}

function createChannelBus() {
  const peers = new Set();
  return () => {
    const listeners = new Set();
    const channel = {
      listeners,
      postMessage(message) {
        for (const peer of peers) {
          if (peer === channel) continue;
          for (const listener of peer.listeners) listener({ data: structuredClone(message) });
        }
      },
      addEventListener(type, listener) {
        if (type === "message") listeners.add(listener);
      },
      removeEventListener(type, listener) {
        if (type === "message") listeners.delete(listener);
      },
      close() {
        peers.delete(channel);
      },
    };
    peers.add(channel);
    return channel;
  };
}

test("a same-tab concept awards only after it opens and the visitor returns", () => {
  const storage = new MemoryStorage();
  let path = "/";
  let visible = true;
  let completions = 0;
  const journey = createConceptJourney({
    storage,
    channelFactory: null,
    currentPath: () => path,
    isVisible: () => visible,
    onComplete: () => completions++,
  });

  journey.begin("/figma/", { newTab: false });
  journey.checkReturn();
  assert.equal(completions, 0, "clicking alone is not a completed visit");

  path = "/figma/";
  visible = false;
  journey.confirmOpened("/figma/");
  assert.equal(completions, 0, "opening the concept is still not the return");

  path = "/";
  visible = true;
  journey.checkReturn();
  journey.checkReturn();
  assert.equal(completions, 1, "Back awards exactly once");
  journey.close();
});

test("a concept tab awards when focus later returns to the landing tab", () => {
  const channelFactory = createChannelBus();
  const storage = new MemoryStorage();
  let visible = true;
  let completions = 0;
  const landing = createConceptJourney({
    storage,
    channelFactory,
    currentPath: () => "/",
    isVisible: () => visible,
    onComplete: () => completions++,
  });
  const concept = createConceptJourney({
    storage: new MemoryStorage(),
    channelFactory,
    currentPath: () => "/figma/",
    isVisible: () => true,
    onComplete: () => {},
  });

  landing.begin("/figma/", { newTab: true });
  concept.broadcastOpened("/figma/");
  landing.checkReturn();
  assert.equal(completions, 0, "a background-opened tab is not a visit yet");

  visible = false;
  landing.markLeftOrigin();
  visible = true;
  landing.checkReturn();
  assert.equal(completions, 1);

  concept.close();
  landing.close();
});

test("concept pages load a visibility-gated bridge and landing layouts do not award Reimagine on dwell", async () => {
  const [figma, codex, bridge, gallery, grid, rail] = await Promise.all([
    readFile(new URL("../public/figma/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/codex/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/badge-concept-bridge.js", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/home/PosterGallery.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/home/WorkGrid.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/home/PosterRail.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(figma, /src=["']\/badge-concept-bridge\.js["']/);
  assert.match(codex, /src=["']\/badge-concept-bridge\.js["']/);
  assert.match(bridge, /document\.visibilityState\s*===\s*["']hidden["']/);
  assert.match(bridge, /visibilitychange/);
  assert.match(bridge, /addEventListener\(["']focus["']/);
  for (const source of [gallery, grid, rail]) {
    assert.doesNotMatch(source, /earn\(["']reimagine["']/);
    assert.match(source, /beginConceptJourney/);
  }
});

test("case studies award Read after their own navigation mounts", async () => {
  const [surprise, mixr, chrome, gallery, grid, rail] = await Promise.all([
    readFile(new URL("../public/surprise-rail/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/mixr/index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/static-chrome.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/home/PosterGallery.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/home/WorkGrid.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/home/PosterRail.tsx", import.meta.url), "utf8"),
  ]);

  for (const html of [surprise, mixr]) {
    assert.match(html, /id="site-nav"[^>]*data-badge-on-open="read"/);
  }
  assert.match(chrome, /useEffect/);
  assert.match(chrome, /dataset\.badgeOnOpen/);
  assert.match(chrome, /awardOnArrival\("read"\)/);

  for (const source of [gallery, grid, rail]) {
    assert.doesNotMatch(source, /earn\(item\.badge|earn\(work\.badge/);
    assert.doesNotMatch(source, /defer:/);
  }
  assert.doesNotMatch(grid, /id="pinnables"[\s\S]*awardOnArrival\("read"\)/);
});
