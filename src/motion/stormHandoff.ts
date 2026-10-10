/* The hand-off into EVERYTHING's storm, loaded on every page that can lead
   there (Home, About, the case studies, Everything itself).

   Going to /everything/ is a cross-page view transition: the page being left
   stays on screen as a snapshot, and Everything washes it out into the eye of
   the storm (everything/index.html + gallery.css). Both pages have to opt in,
   so this opts every page in, then cancels the transition for any other
   destination: only the way into Everything changes; every other navigation
   is exactly as it was.
   Desktop Chromium only, the same test as everything/index.html (keep the
   two in step): on iPhones the storm ran Safari out of memory, and
   everywhere else the canvas simply loads with no transition at all. */

const stormable = () => {
  const ua = navigator.userAgent;
  return /Chrome\//.test(ua) && !/Mobile|Android|CriOS|FxiOS|EdgiOS/.test(ua)
    && matchMedia("(pointer: fine) and (min-width: 1024px)").matches;
};

if (typeof document !== "undefined" && !document.getElementById("gx-vt-optin") && stormable()) {
  const style = document.createElement("style");
  style.id = "gx-vt-optin";
  style.textContent = "@view-transition { navigation: auto; }";
  document.head.appendChild(style);

  type VT = { skipTransition(): void; ready: Promise<unknown>; finished: Promise<unknown>; updateCallbackDone: Promise<unknown> };
  type SwapEvent = Event & { viewTransition?: VT | null; activation?: { entry?: { url?: string } } | null };
  window.addEventListener("pageswap", (event) => {
    const e = event as SwapEvent;
    if (!e.viewTransition) return;
    // a skipped transition rejects its promises; that's expected, not an error
    [e.viewTransition.ready, e.viewTransition.finished, e.viewTransition.updateCallbackDone].forEach((p) => p?.catch(() => {}));
    const to = e.activation?.entry?.url;
    if (!to || !new URL(to, location.href).pathname.startsWith("/everything")) e.viewTransition.skipTransition();
  });
}

export {};
