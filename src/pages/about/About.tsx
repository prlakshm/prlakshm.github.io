import { useEffect } from "react";
import Footer from "../../components/Footer";
import "./about.css";

function About() {
    // This will run once when the component mounts scroll to top page
    useEffect(() => {
      window.scrollTo(0, 0);
    }, []); 
    
  return (
    <div className="about">
      <div></div>
      <Footer />
    </div>
  );
}

export default About;
