import { useEffect, useRef } from "react";
import Footer from "../../components/Footer.js";
import funData from "./fun-data.json";
import "./fun.css";
import "../projects/projects.css";
import ProjectCard from "../projects/ProjectCard.js";

function Fun() {

  // This will run once when the component mounts scroll to top page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);


  return (
    <div className="fun">
        <h1 className="cutout-text">
        <span className="word">
          <span>F</span>
          <span>U</span>
          <span>N</span>
        </span>
        {" "}
        <span className="word">
          <span>S</span>
          <span>T</span>
          <span>U</span>
          <span>F</span>
          <span>F</span>
        </span>
      </h1>

      <h2>Screenplay, movie ideas, and more...</h2>
      <div className="grid">
      {funData.map(
                  (
                    project,
                    index
                  ) => (
                    <div className="project-cards">
                    <a href={project.link} target="_blank" key={index}>
                      <ProjectCard
                        name={project.name}
                        color={project.color}
                        skills={project.skills}
                        logline={project.logline}
                        image={project.image}
                        alphaColor={0.9}
                      /> {/* project card component*/}
                    </a>
                    </div>
                  )
                )}
        </div>
      <div>
      <Footer />
    </div>
    </div>
  );
}

export default Fun;
