import type { Journal as JournalData } from "./journals.js";

/* A single journal on the worktable.

   Open/close is driven entirely by CSS on :hover and :focus-visible of the
   wrapper, so keyboard focus gets the identical interaction with no JS and no
   hover dependency. The closed and open photographs cross-fade rather than the
   closed one being distorted — they are separate real assets.

   Artifacts rest tucked behind the journal and translate outward on a stagger.
   Everything animated is transform/opacity only. */

type Props = {
  journal: JournalData;
  /** Index in the row, used to stagger the scroll-in reveal. */
  index: number;
};

function ExternalArrow() {
  // Berkeley Mono has no ↗, so the affordance is drawn rather than typed.
  return (
    <svg
      className="jr-arrow"
      viewBox="0 0 10 10"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M2.5 7.5 L7.5 2.5 M3.6 2.5 H7.5 V6.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="square"
      />
    </svg>
  );
}

function Journal({ journal, index }: Props) {
  const {
    title,
    descriptor,
    tooltipMeta,
    closed,
    open,
    trimClosed,
    trimOpen,
    alt,
    href,
    width,
    offsetY,
    rotate,
    artifacts,
  } = journal;

  // With the caption gone, this is the only text naming the project.
  const accessibleName = href
    ? `${title} — ${descriptor}. View case study.`
    : `${title} — ${descriptor}. Case study in progress.`;

  const inner = (
    <>
      <span className="jr-stage">
        {/* Artifacts sit behind the covers so they read as coming from inside. */}
        <span className="jr-artifacts" aria-hidden="true">
          {artifacts.map((a, i) => (
            <span
              key={i}
              className={`jr-artifact jr-artifact--${a.treatment}`}
              style={
                {
                  "--ax": `${a.x}px`,
                  "--ay": `${a.y}px`,
                  "--aw": `${a.w}px`,
                  "--ah": `${a.h}px`,
                  "--ar": `${a.rotate}deg`,
                  "--ai": i,
                } as React.CSSProperties
              }
            >
              {a.src ? (
                <img src={a.src} alt="" loading="lazy" decoding="async" />
              ) : a.note ? (
                <span className="jr-note">{a.note}</span>
              ) : null}
            </span>
          ))}
        </span>

        <span className="jr-shadow" aria-hidden="true" />

        {/* translateY of a % resolves against the image's own height, so this
            cancels each PNG's transparent footer exactly, at any width. */}
        <img
          className="jr-img jr-img--closed"
          src={closed}
          alt={alt}
          width={width}
          decoding="async"
          style={{ transform: `translateY(${trimClosed})` }}
        />
        <img
          className="jr-img jr-img--open"
          src={open}
          alt=""
          aria-hidden="true"
          decoding="async"
          style={{ transform: `translateY(${trimOpen})` }}
        />
      </span>

      {/* Tooltip is decorative reinforcement — the caption below always carries
          the real name, so it is never the only source of the project title. */}
      <span className="jr-tooltip" aria-hidden="true">
        <span className="jr-tooltip-title">{title}</span>
        <span className="jr-tooltip-meta">{tooltipMeta}</span>
        {href && (
          <span className="jr-tooltip-cta">
            VIEW CASE STUDY
            <ExternalArrow />
          </span>
        )}
      </span>

      {/* No visible caption — the shelf is just the notebooks. The name still
          reaches assistive tech through the link's accessible name below. */}
    </>
  );

  const style = {
    "--jw": `${width}px`,
    "--joffset": `${offsetY}px`,
    "--jrot": `${rotate}deg`,
    "--ji": index,
  } as React.CSSProperties;

  return (
    <li className="jr" style={style}>
      {href ? (
        <a className="jr-link" href={`#${href}`} aria-label={accessibleName}>
          {inner}
        </a>
      ) : (
        // No case study yet: still focusable so the interaction is reachable,
        // but it does not pretend to navigate anywhere.
        <div
          className="jr-link jr-link--inert"
          tabIndex={0}
          role="group"
          aria-label={accessibleName}
        >
          {inner}
        </div>
      )}
    </li>
  );
}

export default Journal;
