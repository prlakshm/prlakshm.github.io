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
import About from './pages/about/About.js';
import './app.css';
import Fun from './pages/fun/Fun.js';

/* The worktable homepage ships its own nav and footer as part of the surface,
   so the global chrome is suppressed there and kept everywhere else. */
const OWN_CHROME = ['/', '/projects'];

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
        <Route path="/hbo-max-rtw" element={<CaseStudyHBOMax2 />} />
        <Route path="/binary-escape" element={<CaseStudyBinary />} />
        <Route path="/richdreamer" element={<CaseStudyDreamer />} />
        <Route path="/about" element={<About />} />
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
