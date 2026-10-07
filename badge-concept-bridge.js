const KEY = "pr-badge-concept-journey-v2";
const CHANNEL = "pr-badge-journeys-v2";
const normalize = (path) => path.replace(/\/+$/, "") || "/";
const path = normalize(location.pathname);
let reported = false;

const reportOpened = () => {
  if (reported || document.visibilityState === "hidden") return;
  reported = true;
  document.removeEventListener("visibilitychange", reportOpened);
  window.removeEventListener("focus", reportOpened);

  try {
    const journey = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (journey && normalize(journey.target || "") === path) {
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
