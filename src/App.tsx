import React from 'react'
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header.js";
import Home from "./pages/home/Home.js";
import CaseStudy1 from "./pages/case-study-1/CaseStudy1.js";
import CaseStudy2 from "./pages/case-study-2/CaseStudy2.js";
import About from "./pages/about/About.js";
import CaseStudy3 from "./pages/case-study-3/CaseStudy3.js";
import "./app.css"


function App() {

  return (
    
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/projects" element={<Home />} />
        <Route path="/pbj-time" element={<CaseStudy1 />} />
        <Route path="/mi-fonda" element={<CaseStudy2 />} />
        <Route path="/artists-corner" element={<CaseStudy3 />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Router>
  );
}

export default App;
