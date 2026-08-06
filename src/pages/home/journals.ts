/* Journal shelf data.
   Each journal is a physical object on the worktable and the primary nav into
   a case study. Artifacts are what emerges from inside on hover — real project
   imagery wherever it exists, neutral paper notes where it does not yet. */

/* One thing that flies out of a notebook on hover and lands somewhere on the
   screen. Positions are viewport-relative, not pixels: the spill covers the
   whole window, so the layout has to hold at 1280 and at 1920 without a second
   set of numbers. See Journal.tsx for how these resolve. */
export type SpillItem = {
  /** Still from the case-study prototype, or omit for a torn paper note. */
  src?: string;
  /** Note copy. A short selling point in the case study's own voice. */
  note?: string;
  /** Landing centre, as a fraction of the viewport measured from its middle:
   *  -0.5 is the left/top edge, +0.5 the right/bottom. Keep |cx| under ~0.38
   *  and |cy| under ~0.33 or the card hangs off the screen.
   *  Scatter these. Photos on one side and notes on the other reads as a
   *  layout; paper thrown on a desk lands at uneven distances, drifts toward
   *  the middle, and sometimes catches a corner of what is already there. */
  cx: number;
  cy: number;
  /** Width as a fraction of the layout base (see spillBase in Journal.tsx —
   *  it is min(vw, vh x 1.6), so a card cannot swell on an ultrawide). */
  cw: number;
  /** Aspect ratio, w/h. Images only, and it must match the source or the shot
   *  distorts. Notes leave this off: a torn sheet is sized to hug its own copy
   *  (see measure() in Journal.tsx), so it never carries blank paper. */
  ar?: number;
  /** Degrees. Everything lands crooked — nothing on this desk is square. */
  rotate: number;
  /** Which torn sheet backs a note, 1-3. Ignored for images. */
  sheet?: 1 | 2 | 3;
};

export type Journal = {
  id: string;
  number: string;
  title: string;
  descriptor: string;
  /** Who or what it was for, as it reads on the shelf label after the title
   *  ("SURPRISE RAIL · HBO MAX"). Shorter than `descriptor` on purpose — the
   *  label is one line of 14px mono over a notebook, not a spec. Omit it and
   *  the label is just the title, no separator — which is what an unannounced
   *  project should say rather than a placeholder. */
  client?: string;
  /** Small body-type shelf note shown above the physical notebook. */
  annotation: string;
  closed: string;
  open: string;
  /** The cover art's alpha bounding box inside its PNG, as fractions of the
   *  rendered image box. The hover target is the whole journal column, which is
   *  far wider than the book — these are what let the spill release the moment
   *  the cursor leaves the NOTEBOOK rather than the column. Measured from the
   *  PNG (see the note in Journal.tsx); re-measure if a cover is replaced. */
  hit: { x0: number; x1: number; y0: number; y1: number };
  /** Transparent padding below the notebook in each source PNG, as a % of the
   *  image's own height. Applied as translateY so every notebook's *content*
   *  bottom lands on one baseline, and so the cover does not jump when the
   *  closed and open frames cross-fade. Measured from the alpha bounding box —
   *  though `trimOpen` may be pushed past the measured value on purpose: with
   *  the bottom pinned, every bit of extra height in an open frame escapes
   *  upward, and a frame that grows a lot on hover reads as the notebook
   *  leaping up the page rather than opening. */
  trimClosed: string;
  trimOpen: string;
  alt: string;
  /** The link exactly as written — NOT auto-prefixed. Hash routes carry their
   *  own "#" ("#/hbo-max-rtw"); the finished static case studies are real paths
   *  ("/surprise-rail/") and must not get one. An "http" href is treated as
   *  off-site and opens in a new tab. Omitted while unpublished. */
  href?: string;
  /** Tooltip line. Defaults to "VIEW CASE STUDY" — override when the link does
   *  not go to a case study. */
  cta?: string;
  /** Desktop render width in px; scaled down by clamp() at smaller widths. */
  width: number;
  /** Small vertical optical correction applied to the complete notebook,
   *  including its annotation and both cover states. */
  offsetY: number;
  rotate: number;
  /** What spills across the screen on hover. Empty is legitimate — a project
   *  with nothing to show yet opens onto an empty desk. */
  spill: SpillItem[];
};

export const journals: Journal[] = [
  {
    id: "surprise-rail",
    number: "01",
    title: "SURPRISE RAIL",
    descriptor: "HBO MAX · CTV",
    client: "HBO MAX",
    annotation: "Designing a themed rail for HBO Max.",
    closed: "/home/journals/hbomax-closed.webp",
    hit: { x0: 0.1379, x1: 0.887, y0: 0.0357, y1: 0.96 },
    open: "/home/journals/hbomax-open.webp",
    trimClosed: "3.86%",
    trimOpen: "7.57%",
    alt:
      "A sandy tan leather journal with HBO Max, eyes and Surprise stickers, tied with twine.",
    href: "/surprise-rail/",
    width: 422,
    offsetY: 0,
    rotate: -1.5,
    /* Stills lifted straight out of /surprise-rail/ — the prototype as it was
       tested, not a re-render. Two shots, not three: the full home-screen grab
       carried the same film-reel tiles as the rail does and read as a duplicate
       at this size. The notes are the study's own tagline and the one-line
       description of what a tile actually does. */
    spill: [
      {
        src: "/home/journals/spill/sr-rail.webp",
        cx: 0.02,
        cy: -0.28,
        cw: 0.54,
        ar: 3.794,
        rotate: 3,
      },
      {
        src: "/home/journals/spill/sr-tiles.webp",
        cx: 0.17,
        cy: 0.17,
        cw: 0.46,
        ar: 2.243,
        rotate: -5,
      },
      {
        note: "Curiosity didn't kill the cat. It got more clicks.",
        cx: -0.28,
        cy: -0.03,
        cw: 0.23,
        rotate: -11,
        sheet: 1,
      },
      {
        note: "Key art hidden and replaced with 2\u2060-\u20603 word descriptors.",
        cx: -0.16,
        cy: 0.30,
        cw: 0.23,
        rotate: 6,
        sheet: 2,
      },
    ],
  },
  {
    id: "mixr",
    number: "02",
    title: "MIXR",
    descriptor: "NATIVE iOS DJ APP",
    client: "iOS DJ APP",
    annotation: "Building a DJ app for beginners.",
    closed: "/home/journals/mixr-closed.webp",
    hit: { x0: 0.0974, x1: 0.79, y0: 0.0457, y1: 0.9329 },
    open: "/home/journals/mixr-open.webp",
    trimClosed: "6.57%",
    trimOpen: "5.71%",
    alt:
      "A dark brown leather journal with Mixr, headphone and waveform stickers, closed with a brass snap.",
    /* Real path, not a hash route — the study is a standalone document in
       public/, same as the other two. No `cta` override: the study is written,
       so the tooltip is the plain default. That the app itself is still being
       built is the torn note's job to say, not the cursor's. */
    href: "/mixr/",
    width: 480, // flagship — reads ~10% larger than the others
    offsetY: 0,
    rotate: 1.2,
    /* The timeline shot is cropped free of the iOS home indicator, which rides
       the right edge of the source screenshot and would otherwise sit in the
       middle of the screen as a black pill. See scripts note in
       public/home/journals/spill. */
    spill: [
      {
        src: "/home/journals/spill/mixr-timeline.webp",
        cx: 0.09,
        cy: -0.20,
        cw: 0.52,
        ar: 2.078,
        rotate: -3.5,
      },
      {
        /* cx moves right by half the width increase, so the strip grows
           RIGHTWARD only and its left edge stays put. Growing it evenly would
           push that edge into the note below-left, which is placed against it
           on purpose — see the note's own comment. */
        src: "/home/journals/spill/mixr-effects.webp",
        cx: 0.1698,
        cy: 0.26,
        cw: 0.5096,
        ar: 7.0,
        rotate: 4,
      },
      {
        note: "DJ software can be intimidating. It doesn't have to be.",
        cx: -0.275,
        cy: 0.055,
        cw: 0.24,
        rotate: -9,
        sheet: 3,
      },
      {
        note: "My venture into vibe coding.",
        // Far enough left that it only catches the corner of the effects strip
        // — any closer and it starts covering the "Effects" label on it.
        cx: -0.175,
        cy: 0.315,
        cw: 0.20,
        rotate: 7,
        sheet: 1,
      },
    ],
  },
  {
    id: "pinnables",
    number: "03",
    title: "PINNABLES",
    client: "MCP",
    /* No `href` yet, which is what makes the notebook inert and the tooltip
       read IN PROGRESS. Fill it in when there is something to point at. */
    descriptor: "MCP · AI CODING AGENTS",
    annotation: "Pinning components to annotate for coding agents.",
    /* WebP rather than PNG like its neighbours: these frames arrive at twice
       their resolution, and WebP keeps all of it for a third of the weight
       (239KB against the ~590KB the smaller PNGs cost).
       The closed cover comes from an export that already carried its own alpha;
       the open one is still keyed off a black backdrop by
       scripts/pinnables_notebook/cutout.py. Every number below is measured from
       that script's output — re-run it if either frame is replaced. */
    closed: "/home/journals/pinnables-closed.webp",
    hit: { x0: 0.1212, x1: 0.9002, y0: 0.0813, y1: 0.8959 },
    open: "/home/journals/pinnables-open.webp",
    trimClosed: "10.41%",
    trimOpen: "17.62%",
    alt:
      "A dark red leather journal with pinnables, pushpin and MCP stickers, stuffed with loose pages.",
    /* The notebooks share a baseline, so height is what the eye compares.
       Pinnables' saturated red cover and cleaner silhouette give it more
       visual weight than its measured bounds suggest; rendering it 3% smaller
       balances it optically with Surprise Rail and Mixr. The open export is
       reduced by another 3% in home.css and re-centered within this frame. */
    width: 449,
    offsetY: -3,
    rotate: 1.8,
    /* One note, dead centre. There is no prototype to show yet, and a single
       scrap in the middle of an empty screen says that more plainly than a
       spread of placeholders would. */
    spill: [
      {
        note:
          "This notebook is still being written! Read my other case studies in the meantime.",
        cx: 0,
        cy: 0,
        cw: 0.29,
        rotate: -2.5,
        sheet: 2,
      },
    ],
  },
];
