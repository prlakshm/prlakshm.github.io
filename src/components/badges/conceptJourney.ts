export const CONCEPT_JOURNEY_KEY = "pr-badge-concept-journey-v2";
export const CONCEPT_JOURNEY_CHANNEL = "pr-badge-journeys-v2";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type MessageListener = (event: { data: unknown }) => void;
type ChannelLike = {
  postMessage(message: unknown): void;
  addEventListener(type: "message", listener: MessageListener): void;
  removeEventListener(type: "message", listener: MessageListener): void;
  close(): void;
};

type Journey = {
  id: string;
  origin: string;
  target: string;
  opened: boolean;
  leftOrigin: boolean;
};

type JourneyOptions = {
  storage: StorageLike | null;
  channelFactory?: ((name: string) => ChannelLike) | null;
  currentPath: () => string;
  isVisible: () => boolean;
  onComplete: () => void;
};

const normalizePath = (path: string) => {
  const clean = path.split(/[?#]/, 1)[0].replace(/\/+$/, "");
  return clean || "/";
};

const makeId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const readJourney = (storage: StorageLike | null): Journey | null => {
  if (!storage) return null;
  try {
    const value = JSON.parse(storage.getItem(CONCEPT_JOURNEY_KEY) || "null");
    if (
      !value ||
      typeof value.id !== "string" ||
      typeof value.origin !== "string" ||
      typeof value.target !== "string" ||
      typeof value.opened !== "boolean" ||
      typeof value.leftOrigin !== "boolean"
    ) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
};

const writeJourney = (storage: StorageLike | null, journey: Journey) => {
  try {
    storage?.setItem(CONCEPT_JOURNEY_KEY, JSON.stringify(journey));
  } catch {
    // The journey can still be confirmed in a live tab through the channel.
  }
};

export function createConceptJourney(options: JourneyOptions) {
  let closed = false;
  let channel: ChannelLike | null = null;

  const completeIfReturned = () => {
    const journey = readJourney(options.storage);
    if (
      !journey?.opened ||
      !journey.leftOrigin ||
      normalizePath(options.currentPath()) !== journey.origin ||
      !options.isVisible()
    ) {
      return false;
    }
    try {
      options.storage?.removeItem(CONCEPT_JOURNEY_KEY);
    } catch {
      // Removal is best effort; close below prevents a second callback now.
    }
    options.onComplete();
    return true;
  };

  const confirmOpened = (path: string) => {
    const journey = readJourney(options.storage);
    if (!journey || journey.target !== normalizePath(path) || journey.opened) return false;
    writeJourney(options.storage, { ...journey, opened: true });
    completeIfReturned();
    return true;
  };

  const onMessage: MessageListener = ({ data }) => {
    if (closed || !data || typeof data !== "object") return;
    const message = data as { type?: unknown; path?: unknown };
    if (message.type === "concept-opened" && typeof message.path === "string") {
      confirmOpened(message.path);
    }
  };

  if (options.channelFactory) {
    try {
      channel = options.channelFactory(CONCEPT_JOURNEY_CHANNEL);
      channel.addEventListener("message", onMessage);
    } catch {
      channel = null;
    }
  }

  return {
    begin(target: string, { newTab = false }: { newTab?: boolean } = {}) {
      const journey: Journey = {
        id: makeId(),
        origin: normalizePath(options.currentPath()),
        target: normalizePath(target),
        opened: false,
        // A normal link is about to leave this document. A new tab has to
        // actually take focus before it counts as leaving the origin.
        leftOrigin: !newTab,
      };
      writeJourney(options.storage, journey);
      return journey.id;
    },
    markLeftOrigin() {
      const journey = readJourney(options.storage);
      if (!journey || journey.leftOrigin) return false;
      writeJourney(options.storage, { ...journey, leftOrigin: true });
      return true;
    },
    confirmOpened,
    broadcastOpened(path: string) {
      channel?.postMessage({ type: "concept-opened", path: normalizePath(path) });
    },
    checkReturn: completeIfReturned,
    close() {
      if (closed) return;
      closed = true;
      channel?.removeEventListener("message", onMessage);
      channel?.close();
    },
  };
}

const browserChannel = (name: string) => {
  const channel = new BroadcastChannel(name);
  return {
    postMessage: (message: unknown) => channel.postMessage(message),
    addEventListener: (
      _type: "message",
      listener: (event: { data: unknown }) => void,
    ) => channel.addEventListener("message", listener),
    removeEventListener: (
      _type: "message",
      listener: (event: { data: unknown }) => void,
    ) => channel.removeEventListener("message", listener),
    close: () => channel.close(),
  };
};

const browserOptions = (onComplete: () => void): JourneyOptions => ({
  storage: window.sessionStorage,
  channelFactory:
    typeof BroadcastChannel === "undefined" ? null : browserChannel,
  currentPath: () => window.location.pathname,
  isVisible: () => document.visibilityState !== "hidden",
  onComplete,
});

export function beginConceptJourney(
  target: string,
  options: { newTab?: boolean } = {},
) {
  if (typeof window === "undefined") return;
  const journey = createConceptJourney({ ...browserOptions(() => {}), channelFactory: null });
  journey.begin(target, options);
  journey.close();
}

export function mountConceptReturnListener(onComplete: () => void) {
  if (typeof window === "undefined") return () => {};
  const journey = createConceptJourney(browserOptions(onComplete));
  const left = () => journey.markLeftOrigin();
  const visibility = () => {
    if (document.visibilityState === "hidden") left();
    else journey.checkReturn();
  };
  const returned = () => journey.checkReturn();

  window.addEventListener("blur", left);
  window.addEventListener("focus", returned);
  window.addEventListener("pageshow", returned);
  document.addEventListener("visibilitychange", visibility);
  // Back/Forward may restore the landing page before React attaches pageshow.
  journey.checkReturn();

  return () => {
    window.removeEventListener("blur", left);
    window.removeEventListener("focus", returned);
    window.removeEventListener("pageshow", returned);
    document.removeEventListener("visibilitychange", visibility);
    journey.close();
  };
}

export const opensInNewTab = (event: {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}) =>
  event.button !== 0 ||
  event.metaKey ||
  event.ctrlKey ||
  event.shiftKey ||
  event.altKey;
