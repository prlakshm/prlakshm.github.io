import { useEffect, useRef } from "react";
import { animate, scroll } from "motion";
import { prefersReducedMotion } from "./interactions.js";

/* The dot canvas, for the everything page (GALLERY in the nav) when it is
   built. Home, About and the case studies sit on plain white: the dots are
   kept for the one page that is literally a canvas, so stepping onto them
   means you've entered the workspace.

   Cutting-mat parallax: the fixed grid drifts slightly slower than the page,
   so it reads as a surface the content sits on rather than wallpaper locked
   to the viewport. .wt-surface is inset past the viewport edges in CSS
   precisely so this translation has bleed to move into. */
export default function DotSurface() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const surface = ref.current;
    if (!surface || prefersReducedMotion()) return;
    return scroll(animate(surface, { y: [0, -48] }, { ease: "linear" }));
  }, []);

  return <div className="wt-surface" aria-hidden="true" ref={ref} />;
}
