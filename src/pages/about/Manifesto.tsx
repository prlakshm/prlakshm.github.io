import BODY_INK_MASK from "./masks/manifesto-body-ink.png";
import BODY_MARK_MASK from "./masks/manifesto-body-marks.png";
import TITLE_INK_MASK from "./masks/manifesto-title-ink.png";
import TITLE_MARK_MASK from "./masks/manifesto-title-marks.png";
import {
  MANIFESTO_SOURCES,
  MANIFESTO_WORDS,
  WORD_SPACE,
  type ManifestoWord,
} from "./manifesto-words";

/* Design Manifesto, in her own hand.
 *
 * Every word is a CSS mask cropped directly from her original alpha PNG. The
 * browser is not redrawing the letters: it reveals the authored pixels and
 * supplies only the ink colour. Words remain the atomic layout unit, so flexbox
 * can reflow the manifesto without ever breaking a handwritten word apart.
 *
 * Vertical alignment is by baseline, not by box. Each word carries `b` -- where
 * the writing line sits inside its own bounding box -- and gets pushed down by
 * the difference from the tallest word's baseline. Without that, "joy" (which
 * hangs below the line) and "we" (which does not) would sit at different
 * heights and the writing would stagger.
 *
 * The full source stays one sprite per title/body. Each word's element is just
 * a small window positioned over that source, which avoids 140 duplicate files.
 */

const MASKS = {
  title: TITLE_INK_MASK,
  body: BODY_INK_MASK,
} as const;

const MARK_MASKS = {
  title: TITLE_MARK_MASK,
  body: BODY_MARK_MASK,
} as const;

/* The authored body ink peaks around 63% opacity. Four identical alpha passes
   make it read like solid marker ink without inventing or smoothing an edge. */
const MASK_PASSES = 4;
const maskStack = (source: string) =>
  Array.from({ length: MASK_PASSES }, () => `url("${source}")`).join(", ");

const scale = (ws: ManifestoWord[]) => {
  const base = Math.max(...ws.map((w) => w.b));
  return ws.map((w) => ({ ...w, dy: base - w.b + w.n }));
};

function Line({ words, className }: { words: ManifestoWord[]; className: string }) {
  return (
    <div className={className} style={{ "--mf-space": WORD_SPACE } as React.CSSProperties}>
      {scale(words).map((w, i) => (
        <span
          key={`${w.t}-${i}`}
          className="mf-word-wrap"
          style={
            {
              "--w": w.w,
              "--h": w.h,
              "--dy": w.dy,
              "--sw": MANIFESTO_SOURCES[w.s].w,
              "--sh": MANIFESTO_SOURCES[w.s].h,
            } as React.CSSProperties
          }
          aria-hidden="true"
        >
          <span
            className="mf-word"
            style={
              {
                "--mx": -w.x,
                "--my": -w.y,
                maskImage: maskStack(MASKS[w.s]),
                WebkitMaskImage: maskStack(MASKS[w.s]),
              } as React.CSSProperties
            }
          />
          {w.m.map((mark, markIndex) => (
            <span
              key={markIndex}
              className="mf-mark"
              style={
                {
                  "--mark-x": mark.x,
                  "--mark-y": mark.y,
                  "--mark-w": mark.w,
                  "--mark-h": mark.h,
                  "--mx": mark.mx,
                  "--my": mark.my,
                  maskImage: maskStack(MARK_MASKS[w.s]),
                  WebkitMaskImage: maskStack(MARK_MASKS[w.s]),
                } as React.CSSProperties
              }
            />
          ))}
        </span>
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
