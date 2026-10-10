import { useEffect, useMemo, useRef, useState } from "react";
import { PIECES, type Layout } from "./clusters.js";

/* CONTACT SHEET (localhost only, /everything/#sheet): every piece on the canvas
   as a thumbnail with its name in a box. Rename and it saves into layout.json
   as you type (the canvas shows the new name next time it loads). Removed
   pieces wait at the end, each with a way back. */

type Props = { layout: Layout; onChange: (l: Layout) => void };

export default function Sheet({ layout, onChange }: Props) {
  const gone = new Set(layout.deleted);
  const shown = PIECES.filter((p) => !gone.has(p.id));
  const removed = PIECES.filter((p) => gone.has(p.id));
  return (
    <div className="gx-sheet">
      <header className="gx-sheet-head">
        <h1>Gallery · contact sheet</h1>
        <p>
          {shown.length} on the canvas · {removed.length} removed · names save as you type ·{" "}
          <a href="#">back to the canvas</a>
        </p>
      </header>
      <ul className="gx-sheet-grid">
        {shown.map((p) => (
          <Card key={p.id} id={p.id} kind={p.kind} thumb={p.kind === "video" ? p.poster! : p.src} fallback={p.title} layout={layout} onChange={onChange} />
        ))}
      </ul>
      {removed.length > 0 && (
        <>
          <h2 className="gx-sheet-sub">Removed</h2>
          <ul className="gx-sheet-grid gx-sheet-grid--gone">
            {removed.map((p) => (
              <li key={p.id} className="gx-sheet-card">
                <div className="gx-sheet-thumb">
                  <img src={p.kind === "video" ? p.poster : p.src} alt="" loading="lazy" />
                </div>
                <span className="gx-sheet-name">{layout.names?.[p.id] ?? p.title}</span>
                <button type="button" onClick={() => onChange({ ...layout, deleted: layout.deleted.filter((d) => d !== p.id) })}>
                  Put back
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Card({ id, kind, thumb, fallback, layout, onChange }: { id: string; kind: string; thumb: string; fallback: string; layout: Layout; onChange: (l: Layout) => void }) {
  const saved = layout.names?.[id] ?? fallback;
  const [value, setValue] = useState(saved);
  const timer = useRef(0);
  const latest = useRef(layout);
  latest.current = layout;
  useEffect(() => setValue(saved), [saved]);
  const commit = (v: string) => {
    const l = latest.current, names = { ...(l.names ?? {}) };
    // house style: one space either side of "·", no doubled spaces
    const name = v.replace(/\s*·\s*/g, " · ").replace(/\s+/g, " ").trim();
    if (!name || name === fallback) delete names[id];
    else names[id] = name;
    onChange({ ...l, names });
  };
  const edited = useMemo(() => layout.names?.[id] !== undefined, [layout.names, id]);
  return (
    <li className="gx-sheet-card">
      <div className="gx-sheet-thumb">
        <img src={thumb} alt="" loading="lazy" />
        {kind === "video" && <span className="gx-sheet-tag">loop</span>}
      </div>
      <input
        className={edited ? "gx-sheet-input is-edited" : "gx-sheet-input"}
        value={value}
        spellCheck={false}
        onChange={(e) => {
          setValue(e.target.value);
          window.clearTimeout(timer.current);
          const v = e.target.value;
          timer.current = window.setTimeout(() => commit(v), 400);
        }}
        onBlur={() => { window.clearTimeout(timer.current); commit(value); }}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      />
      <code className="gx-sheet-id">{id}</code>
    </li>
  );
}
