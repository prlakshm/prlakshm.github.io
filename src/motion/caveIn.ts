/* The way into EVERYTHING, from every page but Everything itself: the page
   caves in (motion/cave/). Loaded with stormHandoff.ts on every page.

   A click on any link to /everything/ is held back while the page falls into
   the hole, then the browser goes there and Everything throws its own pieces
   back out. Where that can't be done (no view transitions, or the visitor
   asks for less motion) the click is left alone and Everything plays its
   usual entrance.

   The work itself is loaded on demand (it carries the canvas's layout, to
   know where the bagel will be), warmed once the page is idle or the pointer
   reaches a link there, so the click finds it ready. */

/* The safety switch (motion/cave/shape.ts has the whole story): a page that
   loads and finds a cave-in still marked as running was killed in the middle
   of one, so the cave-in is turned off on this device for a month. */
const RUN_KEY = "gx-cave-running", OFF_KEY = "gx-cave-off-2", OFF_FOR = 30 * 864e5;
let off = false;
// (a ?cave= test link, cave/test.ts, sets the switch aside: a kill is logged there instead)
let testing: string | null = null;
try {
  testing = new URLSearchParams(window.location.search).get("cave");
} catch {
  /* no address to read */
}
try {
  if (sessionStorage.getItem(RUN_KEY)) {
    sessionStorage.removeItem(RUN_KEY);
    if (!testing) localStorage.setItem(OFF_KEY, String(Date.now()));
  }
  const since = Number(localStorage.getItem(OFF_KEY));
  off = !testing && since > 0 && Date.now() - since < OFF_FOR;
} catch {
  /* storage is closed to us (private mode): nothing to remember */
}

const able = () =>
  !off &&
  typeof (document as unknown as { startViewTransition?: unknown }).startViewTransition === "function" &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
  !window.location.pathname.startsWith("/everything");

if (typeof window !== "undefined" && typeof document !== "undefined") {
  let mod: Promise<typeof import("./cave/exit.js")> | null = null;
  const load = () => (mod ??= Promise.all([import("./cave/exit.js"), import("./cave/target.js")]).then(([m]) => m));
  let busy = false;

  const toEverything = (target: EventTarget | null) => {
    const a = (target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return null;
    const url = new URL(a.href, window.location.href);
    return url.origin === window.location.origin && url.pathname.startsWith("/everything") ? url : null;
  };

  document.addEventListener(
    "click",
    (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const url = toEverything(e.target);
      // (a link followed from the keyboard goes straight there: e.detail is 0)
      if (!url || !able() || e.detail === 0) return;
      e.preventDefault();
      e.stopPropagation();
      if (busy) return;
      busy = true;
      // ?slow=4 on the page being left carries over, to review both halves
      // (and so does a ?cave= test choice)
      const here = new URLSearchParams(window.location.search);
      ["slow", "cave"].forEach((key) => {
        const v = here.get(key);
        if (v && !url.searchParams.has(key)) url.searchParams.set(key, v);
      });
      load()
        .then((m) => m.caveOut(url.href))
        .catch(() => window.location.assign(url.href));
    },
    true,
  );

  // warm it: when the pointer or focus reaches a link there, or the page is idle
  const warm = (e: Event) => {
    if (toEverything(e.target) && able()) load().catch(() => {});
  };
  document.addEventListener("pointerover", warm, { passive: true });
  document.addEventListener("focusin", warm);
  const idle = () => {
    if (able()) load().catch(() => {});
  };
  const ric = (window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  const later = () => window.setTimeout(() => (ric ? ric(idle, { timeout: 4000 }) : idle()), 2500);
  if (document.readyState === "complete") later();
  else window.addEventListener("load", later, { once: true });

  // with a test link, the log of what ran goes in the corner of this page too
  if (testing) {
    const show = () => import("./cave/test.js").then((t) => t.hud(true)).catch(() => {});
    if (document.body) show();
    else document.addEventListener("DOMContentLoaded", show, { once: true });
    /* ...and &press=1 presses EVERYTHING by itself, once, a few seconds after
       the page has loaded: for checking a device nobody can tap (a simulator
       driven from a script). It does not ride along to the next page. */
    if (new URLSearchParams(window.location.search).get("press")) {
      const press = () =>
        window.setTimeout(() => {
          const a = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]")).find((el) => new URL(el.href, window.location.href).pathname.startsWith("/everything"));
          a?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1, button: 0 }));
        }, window.location.pathname.startsWith("/everything") ? 6000 : 3500);
      if (document.readyState === "complete") press();
      else window.addEventListener("load", press, { once: true });
    }
  }

  // leaving in the ordinary way (the cut to Everything included) is not a failure
  window.addEventListener("pagehide", () => {
    try {
      sessionStorage.removeItem(RUN_KEY);
    } catch {
      /* fine */
    }
  });

  // Back to this page from Everything: put it back together
  window.addEventListener("pageshow", (e) => {
    if (!(e as PageTransitionEvent).persisted) return;
    busy = false;
    (window as unknown as { __caveGo?: boolean }).__caveGo = false;
    mod?.then((m) => m.restore()).catch(() => {});
  });
}

export {};
