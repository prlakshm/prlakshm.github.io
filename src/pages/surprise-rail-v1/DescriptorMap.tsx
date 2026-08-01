/* Descriptor map — redrawn.

   Same finding as the original research chart (four categories emerged in how
   participants described what they wanted, plotted against how much each moved
   a decision), rebuilt in the case study's own language: ink ground, pearl
   type, Berkeley Mono labels, one brass accent.

   Deliberately not a faithful copy. The source plotted ~40 descriptors, which
   is right for a working deck and wrong for a case study — at this size the
   page can carry the shape of the finding, not the whole dataset. Each zone
   keeps a few representative descriptors; italics mark the ones participants
   volunteered rather than the ones tested, because that distinction is the
   part that shows the research actually listened. */

const TESTED = "#f2f0ec";
const VOLUNTEERED = "#8c8c95";
const HAIR = "rgb(242 240 236 / 0.16)";
const ZONE = "rgb(242 240 236 / 0.04)";
const BRASS = "#9a7b45";
/* The page's own mono, so diagram labels match every other piece of metadata.
   Berkeley Mono Trial is ASCII-only, so every string below stays ASCII — no
   em-dashes, no arrows, and no "/" (its slash glyph is drawn as a backslash). */
const MONO = "var(--font-mono)";

type Item = { t: string; said?: boolean };

function Items({
  x,
  y,
  items,
}: {
  x: number | string;
  y: number;
  items: Item[];
}) {
  return (
    <>
      {items.map((it, i) => (
        <text
          key={it.t}
          x={x}
          y={y + i * 17}
          fontFamily={MONO}
          fontSize="11"
          fill={it.said ? VOLUNTEERED : TESTED}
          fontStyle={it.said ? "italic" : "normal"}
        >
          {it.t}
        </text>
      ))}
    </>
  );
}

function DescriptorMap() {
  return (
    <svg
      viewBox="0 0 1000 640"
      /* No width/height attributes: `height="auto"` is not a valid SVG length
         and breaks intrinsic sizing, which made this overflow its figure by
         600px and pushed the Tactical column off-screen. The viewBox supplies
         the aspect ratio; CSS supplies the width. */
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="A map of four descriptor categories plotted against how much each influenced a viewing decision. Atmospheric descriptors sit low-impact and title-focused; thematic and tactical descriptors sit high-impact and title-focused; behavioural descriptors sit below the axis, telling the viewer more about themselves."
    >
      {/* Zones — drawn first so type sits above them. */}
      <rect x="70" y="70" width="420" height="230" rx="3" fill={ZONE} />
      <rect x="510" y="70" width="300" height="230" rx="3" fill={ZONE} />
      <rect x="828" y="40" width="150" height="150" rx="3" fill={ZONE} />
      <rect x="70" y="360" width="740" height="210" rx="3" fill={ZONE} />

      {/* Behavioural sub-zones: implicit vs explicit signals. */}
      <rect
        x="92"
        y="430"
        width="330"
        height="118"
        rx="3"
        fill="none"
        stroke={HAIR}
        strokeDasharray="3 4"
      />
      <rect
        x="470"
        y="392"
        width="320"
        height="86"
        rx="3"
        fill="none"
        stroke={HAIR}
        strokeDasharray="3 4"
      />

      {/* Axes */}
      <line x1="60" y1="330" x2="940" y2="330" stroke={HAIR} strokeWidth="1" />
      <line x1="500" y1="30" x2="500" y2="600" stroke={HAIR} strokeWidth="1" />

      {/* Axis labels */}
      <text
        x="500"
        y="22"
        textAnchor="middle"
        fontFamily={MONO}
        fontSize="10.5"
        letterSpacing="1.6"
        fill={VOLUNTEERED}
      >
        TELLS ME MORE ABOUT THE TITLE
      </text>
      <text
        x="500"
        y="620"
        textAnchor="middle"
        fontFamily={MONO}
        fontSize="10.5"
        letterSpacing="1.6"
        fill={VOLUNTEERED}
      >
        TELLS ME MORE ABOUT MYSELF
      </text>
      <text
        x="60"
        y="352"
        fontFamily={MONO}
        fontSize="10.5"
        letterSpacing="1.6"
        fill={VOLUNTEERED}
      >
        LOW IMPACT
      </text>
      <text
        x="940"
        y="352"
        textAnchor="end"
        fontFamily={MONO}
        fontSize="10.5"
        letterSpacing="1.6"
        fill={VOLUNTEERED}
      >
        HIGH IMPACT
      </text>

      {/* --- Atmospheric --- */}
      <text
        x="92"
        y="100"
        fontFamily={MONO}
        fontSize="12"
        letterSpacing="1.8"
        fill={BRASS}
      >
        ATMOSPHERIC
      </text>
      <Items
        x={92}
        y={128}
        items={[
          { t: "Rural danger" },
          { t: "Dark secrets" },
          { t: "Wealth and privilege" },
          { t: "Set in college", said: true },
          { t: "Movie with a jazzy soundtrack" },
          { t: "Poignant and reflective score" },
          { t: "Black Hollywood", said: true },
        ]}
      />

      {/* --- Thematic --- */}
      <text
        x="532"
        y="100"
        fontFamily={MONO}
        fontSize="12"
        letterSpacing="1.8"
        fill={BRASS}
      >
        THEMATIC
      </text>
      <Items
        x={532}
        y={128}
        items={[
          { t: "Highway killings" },
          { t: "Missing women" },
          { t: "Gripping courtroom drama", said: true },
          { t: "Sports biopic" },
          { t: "Adult animation series", said: true },
          { t: "Female director", said: true },
          { t: "Award-winning performance" },
        ]}
      />

      {/* --- Tactical --- */}
      <text
        x="848"
        y="68"
        fontFamily={MONO}
        fontSize="12"
        letterSpacing="1.8"
        fill={BRASS}
      >
        TACTICAL
      </text>
      <Items
        x={848}
        y={94}
        items={[
          { t: "Synopsis", said: true },
          { t: "Release date", said: true },
          { t: "Rating", said: true },
          { t: "Run time", said: true },
          { t: "Trailer", said: true },
        ]}
      />

      {/* --- Behavioural --- */}
      <text
        x="92"
        y="392"
        fontFamily={MONO}
        fontSize="12"
        letterSpacing="1.8"
        fill={BRASS}
      >
        BEHAVIOURAL
      </text>
      <text
        x="112"
        y="452"
        fontFamily={MONO}
        fontSize="10"
        letterSpacing="1.4"
        fill={VOLUNTEERED}
      >
        IMPLICIT SIGNALS
      </text>
      <Items
        x={112}
        y={478}
        items={[
          { t: "Because you watched" },
          { t: "You've been sampling new genres" },
          { t: "You've been on a Reese Witherspoon kick" },
        ]}
      />
      <text
        x="490"
        y="414"
        fontFamily={MONO}
        fontSize="10"
        letterSpacing="1.4"
        fill={VOLUNTEERED}
      >
        EXPLICIT SIGNALS
      </text>
      <Items
        x={490}
        y={440}
        items={[{ t: "Been on your My List" }, { t: "Because you liked", said: true }]}
      />

      {/* Two plotted points that straddle the axis — the ones that moved a
          decision without describing the title at all. */}
      <circle cx="500" cy="330" r="3" fill={TESTED} />
      <text
        x="512"
        y="326"
        fontFamily={MONO}
        fontSize="11"
        fill={TESTED}
      >
        You finished Game of Thrones last month
      </text>
      {/* Sits clear of the label to its left, which runs to roughly x=765 at
          this size — they collided when this point was at 742. */}
      <circle cx="812" cy="330" r="3" fill={TESTED} />
      <text x="824" y="326" fontFamily={MONO} fontSize="11" fill={TESTED}>
        Tearjerker
      </text>

      {/* Legend */}
      <text
        x="60"
        y="600"
        fontFamily={MONO}
        fontSize="10"
        letterSpacing="1.2"
        fill={TESTED}
      >
        REGULAR = DESCRIPTOR TESTED
      </text>
      <text
        x="290"
        y="600"
        fontFamily={MONO}
        fontSize="10"
        letterSpacing="1.2"
        fill={VOLUNTEERED}
        fontStyle="italic"
      >
        ITALIC = VOLUNTEERED BY PARTICIPANTS
      </text>
    </svg>
  );
}

export default DescriptorMap;
