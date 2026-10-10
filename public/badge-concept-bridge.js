const KEY = "pr-badge-concept-journey-v2";
const CHANNEL = "pr-badge-journeys-v2";
const normalize = (path) => path.replace(/\/+$/, "") || "/";
// only the visit a click just started (conceptJourney.ts: OPEN_WINDOW_MS)
const OPEN_WINDOW_MS = 2 * 60 * 1000;
const path = normalize(location.pathname);
let reported = false;

const reportOpened = () => {
  if (reported || document.visibilityState === "hidden") return;
  reported = true;
  document.removeEventListener("visibilitychange", reportOpened);
  window.removeEventListener("focus", reportOpened);

  try {
    const journey = JSON.parse(sessionStorage.getItem(KEY) || "null");
    const recent = journey && typeof journey.startedAt === "number" && Date.now() - journey.startedAt <= OPEN_WINDOW_MS;
    if (recent && normalize(journey.target || "") === path) {
      sessionStorage.setItem(KEY, JSON.stringify({ ...journey, opened: true }));
    }
  } catch {
    // The opener can still receive the live confirmation below.
  }

  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage({ type: "concept-opened", path });
    channel.close();
  }
};

document.addEventListener("visibilitychange", reportOpened);
window.addEventListener("focus", reportOpened);
reportOpened();
