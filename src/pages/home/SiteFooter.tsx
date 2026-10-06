import ContactIcons from "./ContactIcons.js";
import PaintingFooter from "./pond/PaintingFooter.js";
import "./chrome.css";

/* The footer every page ends on: the © line and the contact gears, then the
   painting. Home and About render it inside .wt; the static case studies mount
   it on their own (src/static-chrome.tsx), so all of them end the same way.
   `painting` picks the painting (PaintingFooter.tsx): Home ends on the NYC
   skyline (so do the case studies), About on the water lilies. */
export default function SiteFooter({ painting }: { painting?: string } = {}) {
  return (
    <>
      <footer className="wt-foot">
        <div className="wt-foot-inner">
          <p className="foot-name">
            <span className="foot-copy" aria-hidden="true">
              &copy;
            </span>{" "}
            2026 PRANAVI RAM
          </p>
          <ContactIcons className="wt-tiles--foot" />
        </div>
      </footer>
      <PaintingFooter painting={painting} />
    </>
  );
}
