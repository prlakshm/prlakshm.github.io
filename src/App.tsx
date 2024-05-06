import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/home/Home";
import Projects from "./pages/projects/Projects";
import CaseStudy1 from "./pages/case-study-1/CaseStudy1";


function App() {

  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/pbj-time" element={<CaseStudy1 />} />

      </Routes>
    </Router>
  );
}

export default App;
