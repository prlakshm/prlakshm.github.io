import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  SESSION_KEY,
  createBadgeSession,
} from "../src/components/badges/badgeSession.ts";

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
  const channels = new Map();

  return (name) => {
    const peers = channels.get(name) ?? new Set();
    const listeners = new Set();
    const channel = {
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
      listeners,
    };
    peers.add(channel);
    channels.set(name, peers);
    return channel;
  };
}

const createIds = (prefix) => {
  let next = 0;
  return () => `${prefix}-${++next}`;
};

test("stores badge progress only in the current tab session", () => {
  const storage = new MemoryStorage();
  const session = createBadgeSession({
    storage,
    channelFactory: null,
    tabId: "one",
    now: () => 10,
    makeEventId: createIds("event"),
  });

  assert.deepEqual(session.getFound(), []);
  assert.equal(session.earn("name"), true);
  assert.deepEqual(session.getFound(), ["name"]);
  assert.deepEqual(JSON.parse(storage.getItem(SESSION_KEY)).found, ["name"]);

  session.close();
});

test("shares snapshots and live earns among open tabs without replaying history", () => {
  const channelFactory = createChannelBus();
  const firstStorage = new MemoryStorage();
  const secondStorage = new MemoryStorage();
  const first = createBadgeSession({
    storage: firstStorage,
    channelFactory,
    tabId: "one",
    now: () => 10,
    makeEventId: createIds("first"),
  });
  const firstEarns = [];
  first.subscribeEarn((event) => firstEarns.push(event));
  first.earn("name");

  const secondEarns = [];
  const second = createBadgeSession({
    storage: secondStorage,
    channelFactory,
    tabId: "two",
    now: () => 20,
    makeEventId: createIds("second"),
  });
  second.subscribeEarn((event) => secondEarns.push(event));

  assert.deepEqual(second.getFound(), ["name"]);
  assert.deepEqual(secondEarns, [], "joining from a snapshot must not replay a stamp");

  second.earn("read");
  assert.deepEqual(first.getFound(), ["name", "read"]);
  assert.deepEqual(second.getFound(), ["name", "read"]);
  assert.deepEqual(firstEarns.map(({ id, remote }) => [id, remote]), [
    ["name", false],
    ["read", true],
  ]);
  assert.deepEqual(secondEarns.map(({ id, remote }) => [id, remote]), [["read", false]]);
  assert.equal(first.earn("read"), false, "a synchronized badge remains unique");

  first.close();
  second.close();
});

test("reset clears every open tab and a later fresh browser session starts empty", () => {
  const channelFactory = createChannelBus();
  const first = createBadgeSession({
    storage: new MemoryStorage(),
    channelFactory,
    tabId: "one",
    now: () => 10,
    makeEventId: createIds("first"),
  });
  const second = createBadgeSession({
    storage: new MemoryStorage(),
    channelFactory,
    tabId: "two",
    now: () => 20,
    makeEventId: createIds("second"),
  });

  first.earn("name");
  first.earn("read");
  second.reset();
  assert.deepEqual(first.getFound(), []);
  assert.deepEqual(second.getFound(), []);
  first.close();
  second.close();

  const later = createBadgeSession({
    storage: new MemoryStorage(),
    channelFactory: createChannelBus(),
    tabId: "later",
    now: () => 30,
    makeEventId: createIds("later"),
  });
  assert.deepEqual(later.getFound(), []);
  later.close();
});

test("the badge adapter has no permanent collection or generic pending-return flow", async () => {
  const source = await readFile(
    new URL("../src/components/badges/badgeStore.ts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /localStorage\.setItem/);
  assert.doesNotMatch(source, /\bPENDING\b|takePending/);
  assert.match(source, /awardOnArrival/);
});
