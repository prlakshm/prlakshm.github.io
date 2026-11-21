/* TRYING VARIANTS ON A REAL PHONE. No simulator shows a phone's memory
   limit, so each candidate way of drawing the cave-in can be forced with a
   link and judged on the device itself:

     ?cave=flat     no tilt (what phones get by default)
     ?cave=squash   the tilt faked with a flat squash toward the hole
     ?cave=fit      real 3D tilt, the canvas laid out at its on-screen size
     ?cave=canvas   the pocket-size one: every flying piece drawn into one
                    canvas (draw.ts)
     ?cave=3d       real 3D tilt, exactly as on desktop (the one that killed
                    an iPhone on 2026-11-20: try it last)
     ?cave=auto     forces nothing: whatever this device gets by itself
                    (shape.ts mode()), with the same log, to see which that
                    is and that it runs

   The choice rides along in the address from page to page. While one is set
   the safety switch (shape.ts) is out of the way: a killed page is written
   down here instead, and nothing is turned off. Each half of each run is
   logged (started, then finished with its frame count and slowest frame), a
   half still marked as started when a page next loads was killed, and the
   log is shown in the corner of the page so it can be screenshotted. */

import { mode } from "./shape.js";

const KEY = "gx-cave-test-log";
type Row = { v: string; half: string; state: "running" | "done" | "killed"; at: number; frames?: number; worst?: number; worstAt?: number; fps?: number; text?: string };

export const variant = (): string | null => {
  try {
    const v = new URLSearchParams(window.location.search).get("cave");
    return v && /^(flat|squash|fit|canvas|3d|auto)$/.test(v) ? v : null;
  } catch {
    return null;
  }
};

const read = (): Row[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as Row[];
  } catch {
    return [];
  }
};
const write = (rows: Row[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(rows.slice(-10)));
  } catch {
    /* private mode: nothing to keep */
  }
};

/* A half begins: logged at once (so a kill leaves its mark), and its frames
   counted until the returned function is called. */
export function begin(half: string): () => void {
  const v = variant();
  if (!v) return () => {};
  // (with "auto", the row says what the device chose)
  const row: Row = { v: v === "auto" ? mode() : v, half, state: "running", at: Date.now() };
  write([...read(), row]);
  let frames = 0, worst = 0, worstAt = 0, last = performance.now(), on = true;
  const t0 = last;
  const tick = (t: number) => {
    if (!on) return;
    const d = t - last;
    last = t;
    frames++;
    if (frames > 2 && d > worst) { worst = d; worstAt = t - t0; } // (the first frames are the set-up, before anything moves)
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return () => {
    if (!on) return;
    on = false;
    const rows = read(), i = rows.findIndex((r) => r.at === row.at && r.half === half);
    const done: Row = { ...row, state: "done", frames, worst: Math.round(worst), worstAt: Math.round(worstAt), fps: Math.round((frames * 1000) / Math.max(1, performance.now() - t0)) };
    if (i >= 0) rows[i] = done;
    else rows.push(done);
    write(rows);
    hud();
  };
}

/* A line of its own in the log (how long the hole waited before the throw,
   and on what: Gallery.tsx). */
export function say(text: string) {
  const v = variant();
  if (!v) return;
  write([...read(), { v: v === "auto" ? mode() : v, half: "", state: "done", at: Date.now(), text }]);
  hud();
}

/* On a fresh page: whatever is still marked as started was killed. Then the
   log goes in the corner. */
export function hud(fresh = false) {
  const v = variant();
  if (!v || typeof document === "undefined" || !document.body) return;
  let rows = read();
  if (fresh && rows.some((r) => r.state === "running")) {
    rows = rows.map((r) => (r.state === "running" ? { ...r, state: "killed" as const } : r));
    write(rows);
  }
  let box = document.getElementById("gx-cave-test");
  if (!box) {
    box = document.createElement("div");
    box.id = "gx-cave-test";
    box.style.cssText =
      "position:fixed;left:8px;bottom:calc(8px + env(safe-area-inset-bottom, 0px));z-index:2147483600;max-width:calc(100vw - 16px);padding:8px 10px;border-radius:8px;" +
      "background:rgba(17,17,19,.88);color:#fff;font:11px/1.45 ui-monospace,Menlo,monospace;white-space:pre;pointer-events:none";
    document.body.appendChild(box);
  }
  const head = `cave test: ${v === "auto" ? `auto (this device gets ${mode()})` : v}  |  ${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio}x`;
  const lines = rows.slice(-7).map((r) =>
    r.text ? `${r.v.padEnd(6)} ${r.text}`
    : r.state === "done" ? `${r.v.padEnd(6)} ${r.half.padEnd(10)} ok   ${r.fps}fps  slowest ${r.worst}ms${r.worstAt != null ? ` at ${(r.worstAt / 1000).toFixed(1)}s` : ""}`
    : r.state === "killed" ? `${r.v.padEnd(6)} ${r.half.padEnd(10)} KILLED (page was reloaded)`
    : `${r.v.padEnd(6)} ${r.half.padEnd(10)} running...`,
  );
  box.textContent = [head, ...lines].join("\n");
}
