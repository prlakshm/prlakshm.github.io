import { useEffect, useRef } from "react";
import Footer from "../../components/Footer.js";
import funData from "./fun-data.json";
import "./fun.css";
import "../projects/projects.css";
import ProjectCard from "../projects/ProjectCard.js";

function Fun() {
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
  }, []);

  return (
    <div className="fun">
      <div className="fun-page">
      <div className="water-full"></div>
      <div className="water-full-mask" ref={waterElementRef}></div>
      <div className="grid">
        <h1>Fun Stuff!</h1>
        <h2>Screenplay, movie ideas, and more...</h2>
        <div className="fun-cards">
          {funData.map((fun, index) => (
            <a href={fun.link} key={index}>
              <ProjectCard
                name={fun.name}
                color={fun.color}
                skills={fun.skills}
                logline={fun.logline}
                image={fun.image}
              />{" "}
              {/* fun card component*/}
            </a>
          ))}
        </div>
      </div>
      <Footer />
      </div>
      <svg>
        <filter id="turbulence" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            id="sea-filter2"
            numOctaves="3"
            seed="2"
            baseFrequency="0.05 0.1"
          ></feTurbulence>
          <feDisplacementMap scale="10" in="SourceGraphic"></feDisplacementMap>
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

export default Fun;
