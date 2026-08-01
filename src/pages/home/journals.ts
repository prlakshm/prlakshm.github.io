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
   *  label is one line of 14px mono over a notebook, not a spec. */
  client: string;
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
    annotation: "Turning indecision into curiosity.",
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
    id: "reasons-to-watch",
    number: "02",
    title: "REASONS TO WATCH",
    descriptor: "HBO MAX · AI AGENTS",
    client: "HBO MAX",
    annotation: "AI agents that explain why a title fits.",
    closed: "/home/journals/red-closed.png",
    open: "/home/journals/red-open.png",
    trimClosed: "12.71%",
    trimOpen: "15.43%",
    alt:
      "A red leather journal representing the Reasons to Watch agent prototype, stuffed with working notes.",
    href: "#/hbo-max-rtw",
    width: 414,
    offsetY: 0,
    rotate: 1.8,
    artifacts: [
      {
        src: "/case-study-hbo-max2/preview-image.png",
        alt: "Reasons to Watch personalized-description prototype.",
        x: -138,
        y: -58,
        w: 164,
        h: 116,
        rotate: -4,
        treatment: "photo",
      },
      {
        src: "/case-study-hbo-max2/agent-breakdown.png",
        alt: "Agent workflow used to generate personalized Reasons to Watch copy.",
        x: 136,
        y: -72,
        w: 146,
        h: 108,
        rotate: 5,
        treatment: "polaroid",
      },
      {
        src: "/case-study-hbo-max2/eval-tool1.png",
        alt: "Internal evaluation tool for comparing generated descriptions.",
        x: -136,
        y: 108,
        w: 158,
        h: 96,
        rotate: 3,
        treatment: "film",
      },
      {
        note: "What would it take to make an established design team believe in agents?",
        x: 132,
        y: 108,
        w: 148,
        h: 88,
        rotate: -3,
        treatment: "note",
      },
    ],
  },
  {
    id: "mixr",
    number: "03",
    title: "MIXR",
    descriptor: "NATIVE iOS DJ APP",
    client: "iOS DJ APP",
    annotation: "Making remixing feel as easy as editing.",
    closed: "/home/journals/mixr-closed.png",
    open: "/home/journals/mixr-open.png",
    trimClosed: "6.57%",
    trimOpen: "5.71%",
    alt:
      "A dark brown leather journal with Mixr, headphone and waveform stickers, closed with a brass snap.",
    /* No case study yet, so the notebook points at where the work is actually
       being shown. External, which is what puts the arrow on the tooltip. */
    href: "https://x.com/pranavibuilds",
    cta: "READ ON X",
    width: 480, // flagship — reads ~10% larger than the others
    offsetY: 0,
    rotate: 1.2,
    /* One scrap, not four. Until the study is written there is nothing to
       splay, and a single torn note saying so reads as honest where a fan of
       blank paper edges read as filler. It splays LEFT: Mixr is the rightmost
       notebook now and anything thrown right runs off the shelf. */
    artifacts: [
      {
        note:
          "Case study still in progress. Read about the app on X in the meantime.",
        x: -172,
        y: 34,
        w: 176,
        h: 120,
        rotate: -4,
        treatment: "torn",
      },
    ],
  },
];
