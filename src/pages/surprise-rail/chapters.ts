/* Surprise Rail — chapter model.

   Each chapter carries a thesis, not a process label. "Research" and "Ideation"
   tell a reader nothing; "Most interfaces answer. This one asks." tells them
   what the section argues. Chapter order is the narrative order. */

export type Chapter = {
  /** Two-digit index shown in the rail and the sticky header. */
  id: string;
  /** Short name for the progress rail. */
  label: string;
  /** The argument the chapter makes. Set large, in display type. */
  thesis: string;
  /** One or two short paragraphs. Kept deliberately brief. */
  body: string[];
};

export const chapters: Chapter[] = [
  {
    id: "01",
    label: "The problem",
    thesis: "Thirty minutes deciding. Nothing watched.",
    body: [
      "Streaming interfaces compete by showing more: more rows, more art, more confident recommendations. The result is a wall of certainty that is exhausting to evaluate.",
      "I kept watching people scroll past things they would have liked, because recognising a title is not the same as wanting it.",
    ],
  },
  {
    id: "02",
    label: "The turn",
    thesis: "What if the rail showed less?",
    body: [
      "Surprise Rail withholds the cover art and the title, and offers a clue instead. Dystopian Wars. Magic and Mayhem. NYC Punk Dream.",
      "The bet: curiosity is a stronger motivator than recognition, and a small, deliberate gap in information is what creates it.",
    ],
  },
  {
    id: "03",
    label: "Hidden state",
    thesis: "Concealment had to look intentional.",
    body: [
      "A blur reads as a broken image. So the hidden state became a film-strip frame — sprocket holes, a frosted window, the clue set inside it.",
      "It sits inline with real cover art without pretending to be cover art. You can tell at a glance that something is being kept from you on purpose.",
    ],
  },
  {
    id: "04",
    label: "The reveal",
    thesis: "The payoff is the whole product.",
    body: [
      "Focus lands on the tile, the frosted surface gives way, and the title resolves. The reveal has to feel earned in under a second, or the clue reads as an obstacle.",
    ],
  },
  {
    id: "05",
    label: "Identity",
    thesis: "A mechanic needs a language.",
    body: [
      "The rail needed a voice that could live inside HBO Max without being swallowed by it — a way to talk about hiding things that felt like an invitation, not a withheld answer.",
    ],
  },
  {
    id: "06",
    label: "Next",
    thesis: "What I would test next.",
    body: [
      "Whether the clue can adapt to taste without collapsing back into a recommendation. Whether a reveal stays satisfying the fiftieth time. Where the mechanic stops being play and starts being friction.",
    ],
  },
];
