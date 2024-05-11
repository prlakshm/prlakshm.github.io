import React from 'react'
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/home/Home";
import Projects from "./pages/projects/Projects";
import CaseStudy1 from "./pages/case-study-1/CaseStudy1";
import CaseStudy2 from "./pages/case-study-2/CaseStudy2";
import About from "./pages/about/About";
import CaseStudy3 from "./pages/case-study-3/CaseStudy3";


function App() {

  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/#" element={<Home />} />
        <Route path="#/projects" element={<Projects />} />
        <Route path="#/pbj-time" element={<CaseStudy1 />} />
        <Route path="#/mi-fonda" element={<CaseStudy2 />} />
        <Route path="#/artists-corner" element={<CaseStudy3 />} />
        <Route path="#/about" element={<About />} />
      </Routes>
    </Router>
  );
}

export default App;
