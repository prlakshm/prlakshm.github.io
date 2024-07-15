import { useEffect, useRef } from "react";
import "./home.css";
import Projects from "../projects/Projects.js";

function Home() {
  const waterElementRef = useRef<HTMLDivElement>(null);
  const waterElement2Ref = useRef<HTMLDivElement>(null);
  const projectsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === "#projects" && projectsRef.current) {
        // Wait for 1 second before scrolling to projects section
        setTimeout(() => {
          const yOffset = 45; // Offset value
          if (projectsRef.current) {
            window.scrollTo({
              top: projectsRef.current.offsetTop + yOffset,
              behavior: "smooth",
            });
          }
        }, 50);
      }
    };

    // Listen for hash changes
    window.addEventListener("hashchange", handleHashChange);

    // Call the handler once in case the hash is already '#projects' when the component mounts
    handleHashChange();

    // Cleanup: remove the event listener
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [projectsRef]);

  useEffect(() => {
    // Reapply the SVG filter when the component mounts
    if (waterElementRef.current) {
      waterElementRef.current.style.filter = "url(#turbulence)";
    }
    if (waterElement2Ref.current) {
      waterElement2Ref.current.style.filter = "url(#turbulence2)";
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
            I'm a software engineer bringing ideas to life with story-based design and
            GenAI. You might know me from{" "}
            <a href="https://www.brown.edu" target="_blank">
              Brown University  
            </a>
            ,
            <a href="https://bit.ly/TheTechCadets" target="_blank">
              Tech Cadets  
            </a>
            , or{" "}
            <a href="https://rewritingthecode.org/" target="_blank">
              Rewriting the Code            
            </a>
            .
          </h2>
          <div className="contact">
            <a href="mailto:pranavi_lakshminarayanan@brown.edu" target="_blank">
              <img src="./icons/email-icon.svg" alt="Email icon" />
            </a>
            <a href="https://github.com/prlakshm" target="_blank">
              <img src="./icons/github-icon.svg" alt="Github icon" />
            </a>
            <a href="https://www.linkedin.com/in/prlakshm" target="_blank">
              <img src="./icons/linkedin-icon.svg" alt="Linkedin icon" />
            </a>
          </div>
        </div>
      </div>
      <div className="projects-page" ref={projectsRef}>
        <div className="water-full"></div>
        <div className="water-full-mask" ref={waterElement2Ref}></div>
        <Projects />
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

export default Home;
