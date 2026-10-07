import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import { awardOnArrival } from "./components/badges/badgeStore.js";
import { NavBar } from "./pages/home/WtNav.js";
import SiteFooter from "./pages/home/SiteFooter.js";

/* The site's nav and footer for the static case studies in public/.

   Those pages are standalone HTML, so rather than carry hand-kept copies that
   drift from the app (they had a wordmark where the star card is, and no
   footer at all), they mount the very components Home and About render. Each
   page holds two mount points:

     <div id="site-nav" style="display:contents">  plain links, replaced here
     <div id="site-foot" style="display:contents"></div>

   display:contents keeps the sticky bar's containing block the page itself.
   vite.config.ts (siteChrome) adds this script to any public page holding a
   mount, in dev and in the build.

   WORK and ABOUT are plain links here: there is no router on these pages, and
   the app's routes live behind the hash. */

const rule = <span className="nav-rule" aria-hidden="true" />;

function StaticNav({ badgeOnOpen }: { badgeOnOpen?: string }) {
  useEffect(() => {
    if (badgeOnOpen !== "read") return;
    // Wait one frame so BadgeCard's subscription exists before the destination
    // earns and animates its arrival stamp.
    const frame = requestAnimationFrame(() => awardOnArrival("read"));
    return () => cancelAnimationFrame(frame);
  }, [badgeOnOpen]);

  return (
    <NavBar
      autoHide
      work={<a href="/#/projects">WORK{rule}</a>}
      about={<a href="/about/">ABOUT{rule}</a>}
    />
  );
}

const nav = document.getElementById("site-nav");
if (nav) {
  createRoot(nav).render(
    <StrictMode>
      <StaticNav badgeOnOpen={nav.dataset.badgeOnOpen} />
    </StrictMode>
  );
}

const foot = document.getElementById("site-foot");
if (foot) {
  createRoot(foot).render(
    <StrictMode>
      <SiteFooter painting="skyline" />
    </StrictMode>
  );
}
