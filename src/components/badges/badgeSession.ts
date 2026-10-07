export const SESSION_KEY = "pr-badges-session-v2";
export const CHANNEL_NAME = "pr-badges-channel-v2";

export type BadgeRecord = {
  id: string;
  eventId: string;
  foundAt: number;
};

export type SessionEarnEvent = {
  id: string;
  remote: boolean;
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type MessageListener = (event: { data: unknown }) => void;
type ChannelLike = {
  postMessage(message: unknown): void;
  addEventListener(type: "message", listener: MessageListener): void;
  removeEventListener(type: "message", listener: MessageListener): void;
  close(): void;
};
type ChannelFactory = (name: string) => ChannelLike;

type SessionMessage =
  | { type: "hello"; from: string }
  | { type: "snapshot"; from: string; to: string; records: BadgeRecord[] }
  | { type: "earn"; from: string; record: BadgeRecord }
  | { type: "reset"; from: string };

type BadgeSessionOptions = {
  storage: StorageLike | null;
  channelFactory?: ChannelFactory | null;
  tabId?: string;
  now?: () => number;
  makeEventId?: () => string;
};

const randomId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

const isRecord = (value: unknown): value is BadgeRecord => {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<BadgeRecord>;
  return (
    typeof record.id === "string" &&
    typeof record.eventId === "string" &&
    typeof record.foundAt === "number" &&
    Number.isFinite(record.foundAt)
  );
};

const orderedUnique = (records: BadgeRecord[]) => {
  const events = new Map<string, BadgeRecord>();
  for (const record of records) {
    if (isRecord(record) && !events.has(record.eventId)) events.set(record.eventId, record);
  }

  const ordered = [...events.values()].sort(
    (a, b) => a.foundAt - b.foundAt || a.eventId.localeCompare(b.eventId),
  );
  const badges = new Set<string>();
  return ordered.filter((record) => {
    if (badges.has(record.id)) return false;
    badges.add(record.id);
    return true;
  });
};

const load = (storage: StorageLike | null) => {
  if (!storage) return [];
  try {
    const value = JSON.parse(storage.getItem(SESSION_KEY) || "null");
    return Array.isArray(value?.records) ? orderedUnique(value.records) : [];
  } catch {
    return [];
  }
};

const isMessage = (value: unknown): value is SessionMessage =>
  Boolean(value && typeof value === "object" && "type" in value && "from" in value);

export function createBadgeSession(options: BadgeSessionOptions) {
  const now = options.now ?? Date.now;
  const makeEventId = options.makeEventId ?? randomId;
  const tabId = options.tabId ?? randomId();
  let records = load(options.storage);
  const stateListeners = new Set<() => void>();
  const earnListeners = new Set<(event: SessionEarnEvent) => void>();
  let closed = false;

  const save = () => {
    if (!options.storage) return;
    try {
      options.storage.setItem(
        SESSION_KEY,
        JSON.stringify({ found: records.map(({ id }) => id), records }),
      );
    } catch {
      // Blocked storage still leaves a working in-memory collection.
    }
  };

  const notifyState = () => stateListeners.forEach((listener) => listener());

  const merge = (incoming: BadgeRecord[]) => {
    const before = records.map(({ id, eventId }) => `${id}:${eventId}`).join("|");
    const next = orderedUnique([...records, ...incoming]);
    const after = next.map(({ id, eventId }) => `${id}:${eventId}`).join("|");
    if (before === after) return false;
    records = next;
    save();
    notifyState();
    return true;
  };

  let channel: ChannelLike | null = null;
  const onMessage: MessageListener = ({ data }) => {
    if (closed || !isMessage(data) || data.from === tabId) return;
    if (data.type === "hello") {
      channel?.postMessage({ type: "snapshot", from: tabId, to: data.from, records });
      return;
    }
    if (data.type === "snapshot") {
      if (data.to === tabId && Array.isArray(data.records)) merge(data.records);
      return;
    }
    if (data.type === "reset") {
      if (!records.length) return;
      records = [];
      try {
        options.storage?.removeItem(SESSION_KEY);
      } catch {
        // Keep the in-memory reset even when storage is blocked.
      }
      notifyState();
      return;
    }
    if (data.type === "earn" && isRecord(data.record)) {
      const alreadyFound = records.some(({ id }) => id === data.record.id);
      if (alreadyFound) return;
      earnListeners.forEach((listener) => listener({ id: data.record.id, remote: true }));
      merge([data.record]);
    }
  };

  if (options.channelFactory) {
    try {
      channel = options.channelFactory(CHANNEL_NAME);
      channel.addEventListener("message", onMessage);
      channel.postMessage({ type: "hello", from: tabId });
    } catch {
      channel = null;
    }
  }

  return {
    getFound: () => records.map(({ id }) => id),
    earn(id: string) {
      if (records.some((record) => record.id === id)) return false;
      const record = { id, eventId: makeEventId(), foundAt: now() };
      earnListeners.forEach((listener) => listener({ id, remote: false }));
      records = orderedUnique([...records, record]);
      save();
      notifyState();
      channel?.postMessage({ type: "earn", from: tabId, record });
      return true;
    },
    reset() {
      records = [];
      try {
        options.storage?.removeItem(SESSION_KEY);
      } catch {
        // Keep the in-memory reset even when storage is blocked.
      }
      notifyState();
      channel?.postMessage({ type: "reset", from: tabId });
    },
    subscribeState(listener: () => void) {
      stateListeners.add(listener);
      return () => stateListeners.delete(listener);
    },
    subscribeEarn(listener: (event: SessionEarnEvent) => void) {
      earnListeners.add(listener);
      return () => earnListeners.delete(listener);
    },
    close() {
      if (closed) return;
      closed = true;
      channel?.removeEventListener("message", onMessage);
      channel?.close();
      stateListeners.clear();
      earnListeners.clear();
    },
  };
}
