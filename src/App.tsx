import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header.js';
import Home from './pages/home/Home.js';
import CaseStudy1 from './pages/case-study-1/CaseStudy1.js';
import CaseStudy2 from './pages/case-study-2/CaseStudy2.js';
import About from './pages/about/About.js';
import CaseStudy3 from './pages/case-study-3/CaseStudy3.js';
import './app.css';
import Fun from './pages/fun/Fun.js';
import CaseStudy4 from './pages/case-study-4/CaseStudy4.js';
import CaseStudy5 from './pages/case-study-5/CaseStudy5.js';


function App() {

  return (
    <Router>
      <Header />
        <Routes>
          <Route path="" element={<Home />} />
          <Route path="/projects" element={<Home />} />
          <Route path="/fun" element={<Fun />} />
          <Route path="/pbj-time" element={<CaseStudy4 />} />
          <Route path="/mi-fonda" element={<CaseStudy3 />} />
          <Route path="/binary-escape" element={<CaseStudy1 />} />
          <Route path="/richdreamer" element={<CaseStudy2 />} />
          <Route path="/artists-corner" element={<CaseStudy5 />} />
          <Route path="/about" element={<About />} />
        </Routes>
    </Router>
  );
}

export default App;
