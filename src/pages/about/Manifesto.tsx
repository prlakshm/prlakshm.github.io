import { MANIFESTO_WORDS, WORD_SPACE, type ManifestoWord } from "./manifesto-words";

/* Design Manifesto, in her own hand.
 *
 * Every word is its own <svg>. That is the whole design: words are the atomic
 * layout unit, so the flex container wraps between them exactly the way it
 * wraps text, and a line break can never fall inside a word. Letters stay
 * together because a letter is not a box.
 *
 * Vertical alignment is by baseline, not by box. Each word carries `b` -- where
 * the writing line sits inside its own bounding box -- and gets pushed down by
 * the difference from the tallest word's baseline. Without that, "joy" (which
 * hangs below the line) and "we" (which does not) would sit at different
 * heights and the writing would stagger.
 *
 * Paths are centrelines: weight and colour come from CSS (--mf-stroke,
 * currentColor), so the hand can be made heavier or lighter without retracing.
 */

const scale = (ws: ManifestoWord[]) => {
  const base = Math.max(...ws.map((w) => w.b));
  return ws.map((w) => ({ ...w, dy: base - w.b }));
};

function Line({ words, className }: { words: ManifestoWord[]; className: string }) {
  return (
    <div className={className} style={{ "--mf-space": WORD_SPACE } as React.CSSProperties}>
      {scale(words).map((w, i) => (
        <svg
          key={`${w.t}-${i}`}
          className="mf-word"
          viewBox={`0 0 ${w.w} ${w.h}`}
          /* Tight viewBox with the stroke allowed to bleed. Padding the box
             instead would fold half a stroke width into the layout advance and
             open the word spacing by that much on both sides. */
          style={
            { "--w": w.w, "--h": w.h, "--dy": w.dy } as React.CSSProperties
          }
          aria-hidden="true"
        >
          <path d={w.d} />
        </svg>
      ))}
    </div>
  );
}

export default function Manifesto() {
  const title = MANIFESTO_WORDS.filter((w) => w.l === 0);
  const body = MANIFESTO_WORDS.filter((w) => w.l > 0);

  return (
    <div className="mf">
      {/* The drawn version is decorative; this is the text itself. It carries
          the accessible name for the section and is what search and reader
          modes get. Keep the two in sync -- both come from build.py's TEXT. */}
      <p className="mf-sr" id="ab-title">
        Design Manifesto. {body.map((w) => w.t).join(" ")}
      </p>
      <Line words={title} className="mf-line mf-line--title" />
      <Line words={body} className="mf-line mf-line--body" />
    </div>
  );
}
