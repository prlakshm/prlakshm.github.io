import { HashRouter as Router, Routes, Route } from 'react-router-dom';
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



function App() {

  return (
    <Router>
      <Header />
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
      <Footer />
    </Router>
  );
}

export default App;
