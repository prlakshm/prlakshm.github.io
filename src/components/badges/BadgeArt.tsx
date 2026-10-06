/* The star card's art: dotted star slots, gold-leaf stamps, and the hint bulb.

   The stamps are real gold leaf, not a gradient: five gently rounded stars of
   crinkled leaf in true gold (poster-lab/museum/bake/stamps.py), each baked at
   rest and lit by a lamp from the upper left, above, and the upper right, all in
   one sprite (/home/card/stamps.webp: a star per column, a light per row). A
   stamp is its rest leaf plus the three lit ones on top, cross-faded by where
   the light is (the cursor, or an idle drift: badges.css, BadgeCard.tsx), so its
   own facets flash the way real leaf does. Each slot uses its own star, set a
   few degrees crooked like a hand stamp. */

// A five-point star with gently rounded tips (24-unit box), for the empty slots.
const STAR =
  "M12 2.6l2.75 5.75 6.3.8-4.62 4.37 1.2 6.25L12 16.7l-5.63 3.07 1.2-6.25L2.95 9.15l6.3-.8z";

// How each slot's stamp sits: a few degrees off, like it was pressed by hand.
export const CROOKED = [-7, 5, -3, 8, -5];

export function StarSlot() {
  return (
    <svg className="bc-slot-star" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d={STAR}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeDasharray="1.2 1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* One gold-leaf stamp. `index` picks the star from the sheet (0-4). */
export function Stamp({ index }: { index: number }) {
  return (
    <span className="bc-stamp" style={{ "--i": index % 5 } as React.CSSProperties} aria-hidden="true">
      <span className="bc-lit bc-lit--l" />
      <span className="bc-lit bc-lit--c" />
      <span className="bc-lit bc-lit--r" />
    </span>
  );
}

/* The hint bulb and the party popper share one palette (badges.css: --bc-glow
   is both the bulb's glass and the cone), so they always read as a pair. */

/* The hint bulb: plain pale gold, no outline, cropped to its own glyph so it
   sits close to the count. On hover (and while its hint is open) it lights up:
   the glass warms and five small rays come out (badges.css). The rays sit
   outside the cropped box, so they never move the layout. */
export function Bulb() {
  return (
    <svg className="bc-bulb" viewBox="3 0 10 16" aria-hidden="true" focusable="false">
      <path
        className="bc-bulb-rays"
        d="M8 -1.6v1.5M2.2 1.2l1.1 1.1M13.8 1.2l-1.1 1.1M0 6.6h1.5M16 6.6h-1.5"
        fill="none"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <path
        className="bc-bulb-glass"
        d="M8 1.8a4.2 4.2 0 0 0-2.4 7.65c.4.3.65.75.65 1.25v.6h3.5v-.6c0-.5.25-.95.65-1.25A4.2 4.2 0 0 0 8 1.8z"
      />
      <path className="bc-bulb-base" d="M6.4 13.3h3.2M7 14.8h2" fill="none" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

/* All five found: the bulb becomes a party popper in the bulb's colours: a
   pale-gold cone (the bulb's glass) with a deeper band, reaching up to the
   confetti, in soft pink, lilac, sky and gold, with a curled streamer leaving
   its mouth. Each piece is its own group, marked with where it rests (data-x,
   data-y, in the 16-unit box), so BadgeCard can pop them out of the cone: when
   the fifth star lands, and again on hover. */
export function Popper() {
  return (
    <svg className="bc-popper" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <g className="bc-pop-cone">
        <path className="bc-pop-body" d="M1.6 14.4l4.45-10.05 5.6 5.6z" />
        <path className="bc-pop-band" d="M3.69 9.68l1.43-3.22 4.42 4.42-3.22 1.43z" />
      </g>
      <path
        className="bc-pop-streamer"
        d="M8.9 6.7c.9-1.2 2-.5 2.8-1.5.7-.9.2-2 1.2-2.6"
        fill="none"
        stroke="#f194b3"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <g className="bc-bit" data-x="7.95" data-y="2.1">
        <rect x="6.9" y="1.5" width="2.1" height="1.2" rx=".5" transform="rotate(-28 7.95 2.1)" fill="#bba6f0" />
      </g>
      <g className="bc-bit" data-x="13.65" data-y="7.9">
        <rect x="12.6" y="7.3" width="2.1" height="1.2" rx=".5" transform="rotate(32 13.65 7.9)" fill="#8dc4ed" />
      </g>
      <g className="bc-bit" data-x="14.3" data-y="3.4">
        <circle cx="14.3" cy="3.4" r=".85" fill="#f5c151" />
      </g>
      <g className="bc-bit" data-x="11.9" data-y="8.9">
        <circle cx="11.9" cy="8.9" r=".7" fill="#f194b3" />
      </g>
      <g className="bc-bit" data-x="4.9" data-y="3.6">
        <circle cx="4.9" cy="3.6" r=".65" fill="#8dc4ed" />
      </g>
    </svg>
  );
}
