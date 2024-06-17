import { useEffect } from "react";
import Footer from "../../components/Footer.js";
import ProjectCard from "./ProjectCard.js";
import projectData from "./project-data.json";
import "./projects.css";

function Projects() {
    // This will run once when the component mounts scroll to top page
    useEffect(() => {
      window.scrollTo(0, 0);
    }, []); 

  return (
    <div className="projects">
        <div className="grid">
        <div className="project-cards">
        {projectData.map(
              (
                project,
                index 
              ) => (
                <a href={project.link} key={index}>
                <ProjectCard
                  name={project.name}
                  color={project.color}
                  skills={project.skills}
                  logline={project.logline}
                  image={project.image}
                /> {/* project card component*/}
                </a>
              )
            )}
        </div>
        </div>
        <Footer />
    </div>
  );
}

export default Projects;
