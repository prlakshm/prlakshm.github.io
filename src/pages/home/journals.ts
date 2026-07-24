/* Journal shelf data.
   Each journal is a physical object on the worktable and the primary nav into
   a case study. Artifacts are what emerges from inside on hover — real project
   imagery wherever it exists, neutral paper notes where it does not yet. */

export type Artifact = {
  /** Image path, or omit for a paper note carrying `note` copy. */
  src?: string;
  alt?: string;
  note?: string;
  /** Splayed offset from the journal's centre, in px. Keep
   *  |x| + w/2 within (journalWidth/2 + 55) so artifacts never cross the
   *  gutter into the neighbouring journal's lane. */
  x: number;
  y: number;
  w: number;
  h: number;
  rotate: number;
  /** Printed photo, polaroid, translucent film, paper note, or a blank
   *  ruled slip that only peeks from behind the covers. */
  treatment: "photo" | "polaroid" | "film" | "note" | "slip";
};

export type Journal = {
  id: string;
  number: string;
  title: string;
  descriptor: string;
  /** Second tooltip line, e.g. "IOS APP · SWIFTUI". */
  tooltipMeta: string;
  closed: string;
  open: string;
  /** Transparent padding below the notebook in each source PNG, as a % of the
   *  image's own height. Applied as translateY so every notebook's *content*
   *  bottom lands on one baseline, and so the cover does not jump when the
   *  closed and open frames cross-fade. Measured from the alpha bounding box. */
  trimClosed: string;
  trimOpen: string;
  alt: string;
  /** Omitted while a case study is still unpublished. */
  href?: string;
  /** Desktop render width in px; scaled down by clamp() at smaller widths. */
  width: number;
  /** Vertical stagger. Currently 0 across the board — the notebooks share a
   *  baseline; kept in the model in case the row is loosened again. */
  offsetY: number;
  rotate: number;
  artifacts: Artifact[];
};

export const journals: Journal[] = [
  {
    id: "coach",
    number: "01",
    title: "REAL-TIME COACH",
    descriptor: "OPENAI · LIVE CONVERSATIONAL AI",
    tooltipMeta: "OPENAI · LIVE AI",
    closed: "/home/journals/red-closed.png",
    open: "/home/journals/red-open.png",
    trimClosed: "12.71%",
    trimOpen: "15.43%",
    alt:
      "A red leather journal stuffed with loose papers, resting on a drafting table.",
    width: 300,
    offsetY: 0,
    rotate: -1.5,
    // Case study not yet written; artifacts stay deliberately incomplete
    // rather than inventing product UI.
    artifacts: [
      {
        note: "Latency is the whole experience. 300ms and it stops feeling like a conversation.",
        x: -152,
        y: 10,
        w: 150,
        h: 104,
        rotate: -6,
        treatment: "note",
      },
      // Unwritten case study: paper edges only, rather than inventing product UI.
      { x: 140, y: -78, w: 112, h: 140, rotate: 5, treatment: "slip" },
      { x: 136, y: 104, w: 120, h: 92, rotate: -3, treatment: "slip" },
    ],
  },
  {
    id: "mixr",
    number: "02",
    title: "MIXR",
    descriptor: "NATIVE iOS DJ APP",
    tooltipMeta: "IOS APP · SWIFTUI",
    closed: "/home/journals/mixr-closed.png",
    open: "/home/journals/mixr-open.png",
    trimClosed: "6.57%",
    trimOpen: "5.71%",
    alt:
      "A dark brown leather journal with Mixr, headphone and waveform stickers, closed with a brass snap.",
    width: 348, // flagship — reads ~10% larger than the others
    offsetY: 0,
    rotate: 1.2,
    artifacts: [
      {
        src: "/mixr/brand-concepts/mixr-brand-world-v1.png",
        alt: "Mixr brand world exploration — logo, color and type studies.",
        x: -148,
        y: -54,
        w: 160,
        h: 120,
        rotate: -5,
        treatment: "photo",
      },
      {
        note: "Making remixing feel as approachable as editing a video.",
        x: -185,
        y: 106,
        w: 150,
        h: 88,
        rotate: 3,
        treatment: "note",
      },
      // Only one Mixr asset exists so far; the rest stay as paper edges.
      { x: 165, y: -66, w: 120, h: 158, rotate: 4, treatment: "slip" },
      { x: 160, y: 112, w: 126, h: 96, rotate: -2, treatment: "slip" },
    ],
  },
  {
    id: "surprise-rail",
    number: "03",
    title: "SURPRISE RAIL",
    descriptor: "HBO MAX · CTV",
    tooltipMeta: "HBO MAX · CTV",
    closed: "/home/journals/hbomax-closed.png",
    open: "/home/journals/hbomax-open.png",
    trimClosed: "3.86%",
    trimOpen: "7.57%",
    alt:
      "A sandy tan leather journal with HBO Max, eyes and Surprise stickers, tied with twine.",
    href: "/hbo-max-surprise",
    width: 306,
    offsetY: 0,
    rotate: 1.8,
    artifacts: [
      {
        src: "/case-study-hbo-max1/film-reel-tiles.png",
        alt: "Hidden and revealed tile prototypes for the Surprise rail.",
        x: -126,
        y: -60,
        w: 164,
        h: 116,
        rotate: -4,
        treatment: "photo",
      },
      {
        src: "/case-study-hbo-max1/CTV-Themed-Rail.png",
        alt: "Themed rail layout on connected TV.",
        x: -126,
        y: 104,
        w: 164,
        h: 104,
        rotate: 4,
        treatment: "film",
      },
      {
        src: "/case-study-hbo-max1/tile-testing-options.png",
        alt: "Teaser-clue tile explorations from testing.",
        x: 135,
        y: -70,
        w: 138,
        h: 116,
        rotate: 5,
        treatment: "polaroid",
      },
      {
        note: "Could curiosity reduce decision paralysis?",
        x: 130,
        y: 110,
        w: 148,
        h: 88,
        rotate: -3,
        treatment: "note",
      },
    ],
  },
];
