import Footer from "../../components/Footer";
import ProjectCard from "./ProjectCard";
import projectData from "./project-data.json";
import "./projects.css";

function Projects() {
  return (
    <div className="projects">
        <div className="transition"><br /><br /></div>
        <div className="grid">
        <div className="project-cards">
        {projectData.map(
              (
                project,
                index 
              ) => (
                <a href={project.link}>
                <ProjectCard
                  key={index}
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
