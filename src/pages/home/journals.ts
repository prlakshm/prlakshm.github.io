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
  /** Printed photo, polaroid, translucent film, paper note, a blank ruled slip
   *  that only peeks from behind the covers, or a torn scrap of ruled paper. */
  treatment: "photo" | "polaroid" | "film" | "note" | "slip" | "torn";
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
  /** Transparent padding below the notebook in each source PNG, as a % of the
   *  image's own height. Applied as translateY so every notebook's *content*
   *  bottom lands on one baseline, and so the cover does not jump when the
   *  closed and open frames cross-fade. Measured from the alpha bounding box. */
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
  /** Vertical stagger. Currently 0 across the board — the notebooks share a
   *  baseline; kept in the model in case the row is loosened again. */
  offsetY: number;
  rotate: number;
  artifacts: Artifact[];
};

export const journals: Journal[] = [
  {
    id: "surprise-rail",
    number: "01",
    title: "SURPRISE RAIL",
    descriptor: "HBO MAX · CTV",
    client: "HBO MAX",
    annotation: "Designing a themed rail for HBO Max.",
    closed: "/home/journals/hbomax-closed.png",
    open: "/home/journals/hbomax-open.png",
    trimClosed: "3.86%",
    trimOpen: "7.57%",
    alt:
      "A sandy tan leather journal with HBO Max, eyes and Surprise stickers, tied with twine.",
    href: "/surprise-rail/",
    width: 422,
    offsetY: 0,
    rotate: -1.5,
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
  {
    id: "mixr",
    number: "02",
    title: "MIXR",
    descriptor: "NATIVE iOS DJ APP",
    client: "iOS DJ APP",
    annotation: "Building a DJ app for beginners.",
    closed: "/home/journals/mixr-closed.png",
    open: "/home/journals/mixr-open.png",
    trimClosed: "6.57%",
    trimOpen: "5.71%",
    alt:
      "A dark brown leather journal with Mixr, headphone and waveform stickers, closed with a brass snap.",
    /* Real path, not a hash route — the study is a standalone document in
       public/, same as the other two. The build is still ongoing, so the tooltip
       says so rather than implying a finished project. */
    href: "/mixr/",
    cta: "IN PROGRESS, VIEW CASE STUDY",
    width: 480, // flagship — reads ~10% larger than the others
    offsetY: 0,
    rotate: 1.2,
    /* One scrap, not four. The study is written but the APP is still being
       built, so a single torn note saying so reads as honest where a fan of
       photos would imply a finished, shipped product. It splays LEFT, into the
       gap before Surprise Rail — Pinnables sits immediately to its right. */
    artifacts: [
      {
        note:
          "Still building the app. The case study covers where it stands today.",
        x: -180,
        y: 6,
        w: 176,
        h: 120,
        rotate: -4,
        treatment: "torn",
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
    descriptor: "MCP · CODING AGENTS",
    annotation: "Pinning components across pages for coding agents.",
    /* Placeholder art: the UNSTICKERED red notebook, copied out of
       scripts/red_notebook/base/ — /home/journals/red-*.png is the same shot
       with the Reasons to Watch stickers composited on and must not be used
       here. Both files share one silhouette, so the trims and --cover-lift
       below are the measured values for either; re-measure when Pinnables gets
       a cover of its own. */
    closed: "/home/journals/red-plain-closed.png",
    open: "/home/journals/red-plain-open.png",
    trimClosed: "12.71%",
    trimOpen: "15.43%",
    alt:
      "A plain red leather journal, standing in for the Pinnables project until its cover is made.",
    /* Wider than it looks it should be, and deliberately. The red PNG carries
       ~11% transparent headroom against ~4% for the tan one, so at a matched
       box width its book renders visibly shorter than its neighbours. The
       notebooks share a baseline, so height is what the eye compares:
       visible height = --cover-lift x width, and 0.943 x 478 = 451px puts it
       level with Surprise Rail (454) and Mixr (455). */
    width: 478,
    offsetY: 0,
    rotate: 1.8,
    // Nothing to splay yet — the cover opens onto an empty desk, which is the
    // truth. Add scraps here as the work produces them.
    artifacts: [],
  },
];
