import { useEffect, useRef } from "react";
import Footer from "../../components/Footer.js";
import "./case-study-dreamer.css";


function CaseStudyDreamer() {
    const waterElementRef = useRef<HTMLDivElement>(null);

    // This will run once when the component mounts scroll to top page
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

     // Section references
     const topRef = useRef(null);
     const problemRef = useRef(null);
     const iterationsRef = useRef(null);
     const solutionRef = useRef(null);
     const reflectionRef = useRef(null);
 
     // Scroll to section smoothly
     const scrollToSection = (ref : React.RefObject<HTMLElement>) => {
         ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
     };


    return (
        <div className="case-study-dreamer"  ref={topRef}>
            <div className="content">
            <div className="side-nav">
                <p onClick={() => scrollToSection(topRef)}>(<img src="/icons/up-arrow.png" alt="up arrow icon"/>) Top</p>
                    <p onClick={() => scrollToSection(problemRef)}>Pain Points</p>
                    <p onClick={() => scrollToSection(solutionRef)}>Takeaways</p>
                    <p onClick={() => scrollToSection(iterationsRef)}>Animations</p>
            </div>
            <div className="study">

                <div className="main">
                    <h1>RichDreamer Text-to-3D</h1>
                    <div className="overview">
                    <div className="video-container">
                    <video
                            src="/case-study-2/dreamer.mp4"
                            aria-label="RichDreamer Text-to-3D AI model cover art"
                            typeof="video/mp4"
                            autoPlay
                            muted
                            loop
                            playsInline
                        >
                            Your browser does not support the video tag.
                        </video>
                        </div>
                    </div>
                    <div className="overview-info">
                        <div className="role">
                            <h3>Role</h3>
                            <p>Machine Learning Engineer</p>
                        </div>
                        <div className="timeline">
                            <h3>Timeline</h3>
                            <p>Jun - Aug 2024</p>
                        </div>
                        <div className="skills">
                            <h3>Skills</h3>
                            <div className="all-skills">
                                    <p>ML/GenAI ● Prompt Engineering ●<br /> Python</p>
                            </div>
                        </div>
                    </div>
                    <div className="overview">
                        <p>
                            RichDreamer is an <span className="bold">
                                {" "}
                                open-source text-to-3D GenAI model
                            </span>{" "}
                            that uses text inputs to generate high-quality 3D outputs.
                            Text-to-3D can be used for <span className="bold">CGI in movies, TV shows, 
                            and animated films</span> to generate 3D assets,
                            speed up the production process, and reduce costs.
                            <div className="seperator" />
                            <a href="https://aigc3d.github.io/richdreamer/" target="_blank">
                                <span className="app-link bold">Project Link</span>
                            </a>
                            <span className="vert-bar">
                                {" | "}
                            </span>
                            <a href="https://arxiv.org/pdf/2311.16918" target="_blank">
                                <span className="app-link bold">Published Paper</span>
                            </a>
                            <span className="vert-bar">
                                {" | "}
                            </span>
                            <span className="bold">Technologies used:</span> Python, PyTorch, SSH, Bash/Shell Scripting, NVIDIA Quadro GPU
                        </p>
                    </div>
                    <div className="pain-points" ref={problemRef}>
                        <h2>Pain Points</h2>
                        <ul>
                            <li>
                                <p><span className="bold">Running the Model:</span> After a summer of struggling with setup, I finally succeeded in running the RichDreamer model on my GPU! I created a <a href="https://github.com/modelscope/richdreamer/blob/main/gpu_installation_guide.md" target="_blank"><span className="app-link bold">step-by-step installation guide</span>
                                    </a> to help users resolve dependency issues, set up the conda environment, and configure the model to correctly utilize GPU.</p>
                            </li>
                            <li>
                                <p><span className="bold">Expanding GPU Compatibility:</span> I expanded GPU compatibility by enabling support for CUDA 11.7 <span style={{fontStyle:"italic", paddingRight:"5px"}}>and</span> 11.8. I modified code, managed python package 
                                dependencies, and tested the model in different environments. Users can now run the model on various NVIDIA GPUs.</p> 
                            </li>
                        </ul>
                    </div>

                    
          <div className="pain-points" ref={solutionRef}>
          <h2 >Takeaways</h2>
              <ul><li>
            <p>
              <span className="bold">Every Prompt Matters:</span> Because the model takes ≈2 hours to generate an output, it's important to <span className="bold">utilize every 
              prompt</span>. I created a <a href="https://github.com/modelscope/richdreamer/blob/main/prompt_engineering_basics.md" target="_blank"><span className="app-link bold">prompt engineering basics guide </span>
              </a> to help users maximize model performance.
              </p>
              </li>
              <li>
                <p>
            <span className="bold">Open-source Contributing:</span> Contributing to open-source projects is a <span className="bold">great way to {" "}
              gain experience</span>. The <span className="bold">opportunity is available to anyone</span>  (regardless of age) at anytime. It’s an excellent way to discover side projects and enhance skills!
              </p>
              </li>
              </ul>
            </div>
            <div className="pain-points" ref={iterationsRef}>
            <h2>Animations!</h2>
              <p style={{ marginBottom: "1.5rem" }}>Check out animations of the model's 3D outputs I made in Blender!</p>
              <div className="video-container">
            <video
              src="/case-study-2/strawberry_donut.mp4"
              aria-label="camera spin animation of strayberry donut 3d output"
              typeof="video/mp4"
              autoPlay
              muted
              loop
              playsInline
            >
              Your browser does not support the video tag.
            </video>
          </div>
          <div className="video-container">
            <video
              src="/case-study-2/fig.mp4"
              aria-label="camera spin animation of fig 3d output"
              typeof="video/mp4"
              autoPlay
              muted
              loop
              playsInline
            >
              Your browser does not support the video tag.
            </video>
          </div>
          <div className="video-container">
            <video
              src="/case-study-2/realistic tiger.mp4"
              aria-label="camera spin animation of realistic tiger 3d output"
              typeof="video/mp4"
              autoPlay
              muted
              loop
              playsInline
            >
              Your browser does not support the video tag.
            </video>
          </div>
          <div className="video-container">
            <video
              src="/case-study-2/stuffed_dog.mp4"
              aria-label="camera spin animation of stuffed animal dog 3d output"
              typeof="video/mp4"
              autoPlay
              muted
              loop
              playsInline
            >
              Your browser does not support the video tag.
            </video>
          </div>
          <div className="seperator" />
          <div className="seperator" style={{height:"1rem"}}/>
          </div>

                </div>

               
            </div>
            </div>
            <Footer />
        </div>
    );
}

export default CaseStudyDreamer;
