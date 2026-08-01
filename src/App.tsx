import { useEffect, useRef } from 'react';
import {
  HashRouter as Router,
  Routes,
  Route,
  useLocation,
} from 'react-router-dom';
import { animate } from 'motion';
import Header from './components/Header.js';
import Footer from './components/Footer.js';
import Home from './pages/home/Home.js';
import CaseStudyHBOMax1 from './pages/case-study-hbo-max1/CaseStudyHBOMax1.js';
import CaseStudyHBOMax2 from './pages/case-study-hbo-max2/CaseStudyHBOMax2.js';
import CaseStudyBinary from './pages/case-study-binary/CaseStudyBinary.js';
import CaseStudyDreamer from './pages/case-study-dreamer/CaseStudyDreamer.js';
import SurpriseRailV1 from './pages/surprise-rail-v1/SurpriseRailV1.js';
import './app.css';
import Fun from './pages/fun/Fun.js';

/* Pages that ship their own nav and footer as part of their surface, so the
   global chrome is suppressed there and kept elsewhere. The worktable homepage
   and the case-study exhibition rooms both own their chrome. */
const OWN_CHROME = ['/', '/projects', '/about', '/surprise-rail-v1'];

function Shell() {
  const { pathname } = useLocation();
  const ownsChrome = OWN_CHROME.includes(pathname);
  const viewRef = useRef<HTMLDivElement>(null);

  /* Cross-fade between routes. Keyed on pathname only, so in-page interactions
     never retrigger it.

     The inline opacity is cleared on completion deliberately: an element with
     opacity < 1 becomes the containing block for its position:fixed
     descendants, and the homepage's fixed cutting-mat grid is one of those.
     Leaving a stray opacity behind would anchor the grid to this wrapper
     instead of the viewport. */
  useEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const controls = animate(el, { opacity: [0, 1] }, { duration: 0.18, ease: 'linear' });
    controls.finished
      .then(() => el.style.removeProperty('opacity'))
      .catch(() => {
        // Interrupted by a faster navigation; the next run reasserts opacity.
      });

    return () => controls.stop();
  }, [pathname]);

  return (
    <>
      {!ownsChrome && <Header />}
      <div ref={viewRef}>
      <Routes>
        <Route path="" element={<Home />} />
        <Route path="/projects" element={<Home />} />
        <Route path="/fun" element={<Fun />} />
        <Route path="/hbo-max-surprise" element={<CaseStudyHBOMax1 />} />
        {/* Superseded by the finished static case study at /surprise-rail/.
            Kept routed, not linked, so the exhibition-room treatment is not lost. */}
        <Route path="/surprise-rail-v1" element={<SurpriseRailV1 />} />
        <Route path="/hbo-max-rtw" element={<CaseStudyHBOMax2 />} />
        <Route path="/binary-escape" element={<CaseStudyBinary />} />
        <Route path="/richdreamer" element={<CaseStudyDreamer />} />
        {/* /about deep-links to the manifesto section on the homepage. */}
        <Route path="/about" element={<Home />} />
      </Routes>
      </div>
      {!ownsChrome && <Footer />}
    </>
  );
}

function App() {
  return (
    <Router>
      <Shell />
    </Router>
  );
}

export default App;
