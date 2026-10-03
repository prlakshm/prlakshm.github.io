import { useEffect, useLayoutEffect, useRef } from "react";
import { mountSunroom, type Sunroom as SunroomHandle } from "./mount.js";
import { STYLES, VARIANTS, type RoomVariant } from "./styles.js";
import "./sunroom.css";

const STORE = "sunroom-glass";

/** Which glass to start with: `?room=` wins, then the last one chosen. */
export function readRoom(): RoomVariant {
  if (typeof window === "undefined") return "stained";
  const q = new URLSearchParams(window.location.search).get("room");
  if (VARIANTS.includes(q as RoomVariant)) return q as RoomVariant;
  try {
    const saved = window.localStorage.getItem(STORE);
    if (VARIANTS.includes(saved as RoomVariant)) return saved as RoomVariant;
  } catch {
    /* private mode: no memory, no problem */
  }
  return "stained";
}

export function rememberRoom(variant: RoomVariant) {
  try {
    window.localStorage.setItem(STORE, variant);
  } catch {
    /* see above */
  }
}

/* The room around the hero: a corner of it sketched on the left — the left
   wall, and the back wall with its French doors and drapery — two chairs and
   a pedestal table on the right, and late-afternoon sun fanning out of the
   doors across the floor between them. Everything is drawn in code — scene.ts
   holds the geometry, light.ts the sun.

   Decorative only, so it is hidden from assistive tech and never takes
   pointer events; the hero text above it is untouched. */
export default function Sunroom({ variant }: { variant: RoomVariant }) {
  const ref = useRef<HTMLDivElement>(null);
  const handle = useRef<SunroomHandle | null>(null);
  const first = useRef(variant);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const room = mountSunroom(root, first.current);
    handle.current = room;
    return () => {
      room.destroy();
      handle.current = null;
    };
  }, []);

  useEffect(() => {
    handle.current?.setVariant(variant);
  }, [variant]);

  return (
    <div className="sunroom" ref={ref} aria-hidden="true">
      <canvas className="sunroom-light" />
      <svg className="sunroom-sketch" />
      <canvas className="sunroom-motes" />
    </div>
  );
}

/** Three small panes under the chairs: choose the glass the light comes through. */
export function GlassPicker({
  value,
  onChange,
}: {
  value: RoomVariant;
  onChange: (variant: RoomVariant) => void;
}) {
  return (
    <div className="glass-picker" role="group" aria-label="Glass in the doors">
      <span className="glass-picker-label" aria-hidden="true">
        {STYLES[value].label}
      </span>
      {VARIANTS.map((v) => (
        <button
          key={v}
          type="button"
          className={`glass-pane glass-pane--${v}`}
          aria-pressed={v === value}
          aria-label={STYLES[v].label}
          title={STYLES[v].label}
          onClick={() => onChange(v)}
        />
      ))}
    </div>
  );
}
