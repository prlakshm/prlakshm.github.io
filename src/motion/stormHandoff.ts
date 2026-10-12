/* The hand-off into EVERYTHING's storm, loaded on every page that can lead
   there (Home, About, the case studies, Everything itself).

   Going to /everything/ is a cross-page view transition: the page being left
   stays on screen as a snapshot, and Everything washes it out into the eye of
   the storm (everything/index.html + gallery.css). Both pages have to opt in,
   so this opts every page in, then cancels the transition for any other
   destination: only the way into Everything changes; every other navigation
   is exactly as it was.
   Chromium only (Chrome, Edge, Arc; desktop and Android), the same test as
   everything/index.html; keep the two in step. Safari freezes the arriving
   page into a still during a cross-page transition, which hid the storm's
   whole fly-in, so there the storm plays without the sweep. */

const stormable = () => /Chrome\//.test(navigator.userAgent);

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
  /* No prerendering on hover (Speculation Rules), tried 2026-10-11: it cut
     the start delay to ~50ms, but in real Chrome a prerendered Everything
     arrived at a different viewport size than the page being left, and
     Chrome aborted the view transition ("Viewport size changed"), so the
     page being left whited out at the click instead of being swept away. */
}

/* Warm the canvas: once this page has settled (and the visitor isn't
   saving data), quietly fetch the Everything canvas's light copies (~0.4MB,
   scripts/gallery-thumbs.mjs), so tapping EVERYTHING finds them already
   there instead of the pieces rising in half-loaded. Low priority, idle
   time only. */
if (typeof window !== "undefined" && !location.pathname.startsWith("/everything")) {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  const thrifty = conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType ?? "");
  const warm = () =>
    fetch("/gallery/thumb/index.json")
      .then((r) => (r.ok ? r.json() : []))
      // plain low-priority fetches land in the HTTP cache in every browser
      // (Safari has no <link rel=prefetch>)
      .then((list: string[]) => list.forEach((href) => fetch(href, { priority: "low" } as RequestInit).catch(() => {})))
      .catch(() => {});
  const ric = (window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  const later = () => window.setTimeout(() => (ric ? ric(warm, { timeout: 4000 }) : warm()), 1500);
  if (!thrifty) {
    if (document.readyState === "complete") later();
    else window.addEventListener("load", later, { once: true });
  }
}

export {};
