import { useEffect, useRef } from "react";
import "./home.css";
import Projects from "../projects/Projects.js";

function Home() {
  const waterElementRef = useRef<HTMLDivElement>(null);
  const waterElement2Ref = useRef<HTMLDivElement>(null);

  

  useEffect(() => {
    // Reapply the SVG filter when the component mounts
    if (waterElementRef.current) {
      waterElementRef.current.style.filter = "url(#turbulence)";
      console.log("mounted water")
    }
    if (waterElement2Ref.current) {
      waterElement2Ref.current.style.filter = "url(#turbulence)";
      console.log("mounted water full")
    }
  }, []);

  return (
    <div className="home">
      <div className="landing-page">
        <div className="water" ref={waterElementRef}></div>
        <div className="lilies plain1"></div>
        <div className="lilies plain2"></div>
        <div className="lilies plain3"></div>
        <div className="lilies plain4"></div>
        <div className="lilies plain5"></div>

        <div className="title">
        <h1>Hi, I'm Pranavi</h1>
        <h2>
          I'm a software engineer passionate about story-based design and GenAI.
          You might know me from Brown University, Tech Cadets, or Rewriting the
          Code.
        </h2>
        <div className="contact">
            <a href="mailto:pranavi_lakshminarayanan@brown.edu" target="_blank">
              <img src="./icons/email-icon.png" alt="Email icon" />
            </a>
            <a href="https://github.com/prlakshm" target="_blank">
              <img src="./icons/github-icon.png" alt="Github icon" />
            </a>
            <a href="https://www.linkedin.com/in/prlakshm" target="_blank">
              <img src="./icons/linkedin-icon.png" alt="Linkedin icon" />
            </a>
          </div>
        </div>
      </div>
      <div className="projects-page">
        <div className="water-full" ref={waterElement2Ref}></div>
        <div className="projects-container"><Projects /></div>
      </div>
      <svg>
        <filter id="turbulence" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            id="sea-filter"
            numOctaves="3"
            seed="2"
            baseFrequency="0.05 0.1"
          ></feTurbulence>
          <feDisplacementMap scale="10" in="SourceGraphic"></feDisplacementMap>
          <animate
            xlinkHref="#sea-filter"
            attributeName="baseFrequency"
            dur="150s"
            keyTimes="0;0.5;1"
            values="0.01 0.05;0.03 0.09;0.01 0.05"
            repeatCount="indefinite"
          />
        </filter>
      </svg>
    </div>
  );
}

export default Home;
