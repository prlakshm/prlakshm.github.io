import { useEffect } from "react";
import Footer from "../../components/Footer.js";
import funData from "./fun-data.json";
import "./fun.css";
import ProjectCard from "../projects/ProjectCard.js";

function Fun() {
    // This will run once when the component mounts scroll to top page
    useEffect(() => {
      window.scrollTo(0, 0);
    }, []); 

  return (
    <div className="fun">

        <div className="grid">
        <div className="fun-cards">
        {funData.map(
              (
                fun,
                index 
              ) => (
                <a href={fun.link} key={index}>
                <ProjectCard
                  name={fun.name}
                  color={fun.color}
                  skills={fun.skills}
                  logline={fun.logline}
                  image={fun.image}
                /> {/* fun card component*/}
                </a>
              )
            )}
        </div>
        </div>
        <Footer />
    </div>
  );
}

export default Fun;
