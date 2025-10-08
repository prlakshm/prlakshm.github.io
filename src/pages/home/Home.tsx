import { useEffect, useRef } from "react";
import "./home.css";
import Footer from "../../components/Footer.js";
import ProjectCard from "../projects/ProjectCard.js";
import projectData from "../projects/project-data.json";
import "../projects/projects.css";

function Home() {

  return (
    <div className="app">
    <div className="home">
      <div className="landing-page">
        <div className="title">
          <div className="name-image">
          <img
                className="profile"
                src="/home/linkedin_profile.jpg"
                alt="Profile Picture of Pranavi"
            />
            <img
                src="/home/flowers-dense.png"
                alt="Hi, I'm Pranavi in vine font"
            /></div>
          <h2>
            I'm a product designer bringing ideas to life with story-based design and
            GenAI. You might know me from{" "}
            <a href="https://www.brown.edu" target="_blank">
              Brown University  
            </a>
            ,
            <a href="https://www.wbd.com/" target="_blank" style={{paddingLeft: "2px"}}>
              Warner Bros 
            </a>
            , or {" "}
            <a href="https://www.emmabowenfoundation.org/" target="_blank">
              Emma Bowen Foundation           
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
                {projectData.map(
                  (
                    project,
                    index
                  ) => (
                    <div className="project-cards">
                    <a href={project.link} key={index}>
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

export default Home;
