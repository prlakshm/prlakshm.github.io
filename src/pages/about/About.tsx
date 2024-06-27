import { useEffect, useRef } from "react";
import Footer from "../../components/Footer.js";
import "./about.css";

function About() {

  const waterElementRef = useRef<HTMLDivElement>(null);

    // This will run once when the component mounts scroll to top page
    useEffect(() => {
      window.scrollTo(0, 0);
    }, []); 

    useEffect(() => {
      // Reapply the SVG filter when the component mounts
      if (waterElementRef.current) {
        waterElementRef.current.style.filter = "url(#turbulence)";
      }
      if (waterElementRef.current) {
        waterElementRef.current.style.filter = "url(#turbulence2)";
  
      }
    }, []);
    
  return (
    <div className="about">
      <div className="about-page"><div className="water" ref={waterElementRef}></div>
      <div className="main">
      <div className="about-me">
        <h1>About Me</h1>
        <p>I'm Pranavi 👋, a <span className="bold">sophomore at Brown University</span> studying computer science. I name all my ML models and paste pictures of websites I've built in my room! 
            When I'm not coding, I'm singing, dancing, and having a good time with my friends.</p>
            <p>I'm part of <span className="bold">Full Stack @ Brown</span>, where I work in a team of designers and developers to code websites for student clubs. I'm also a member of <span className="bold">Rewriting the Code</span>, a global organization that helps empower and connect women in CS. 
                Previously, I was an encryption intern at <a href="https://www.mantech.com/" target="_blank">ManTech</a>, where I learned I love algorithms, and currently am a data science intern at <a href="https://www.carync.gov/" target="_blank">Town of Cary</a>, a smart city and the <a href="https://livability.com/best-places/2024-top-100-best-places-to-live-in-the-us/" target="_blank">#2 best city to live in the US</a>!
            </p>
            <p>Outside of CS, I take literary arts classes at Brown where I explore different forms of storytelling. <span className="bold">I love movies</span> (ask me for recs!) and recently got into screenwriting!  </p>
            <p>If you're also interested in any of these things, I'd love to chat!</p>
      </div>
      </div>
      <Footer />
      </div>
      <svg>
        <filter id="turbulence" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            id="sea-filter"
            numOctaves="3"
            seed="2"
            baseFrequency="0.05 0.1"
          ></feTurbulence>
          <feDisplacementMap scale="8" in="SourceGraphic"></feDisplacementMap>
          <animate
            xlinkHref="#sea-filter"
            attributeName="baseFrequency"
            dur="150s"
            keyTimes="0;0.5;1"
            values="0.01 0.05;0.03 0.09;0.01 0.05"
            repeatCount="indefinite"
          />
        </filter>
        <filter id="turbulence2" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            id="sea-filter2"
            numOctaves="3"
            seed="2"
            baseFrequency="0.05 0.1"
          ></feTurbulence>
          <feDisplacementMap scale="12" in="SourceGraphic"></feDisplacementMap>
          <animate
            xlinkHref="#sea-filter2"
            attributeName="baseFrequency"
            dur="60s"
            keyTimes="0;0.5;1"
            values="0.01 0.05;0.03 0.09;0.01 0.05"
            repeatCount="indefinite"
          />
        </filter>
      </svg>
    </div>
  );
}

export default About;
