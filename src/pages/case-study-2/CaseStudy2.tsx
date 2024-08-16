import { useEffect, useRef } from "react";
import Footer from "../../components/Footer.js";
import "./case-study-2.css";


function CaseStudy2() {
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
        <div className="case-study-2">
            <div className="study">
                <div className="water-full"></div>
                <div className="water-full-mask" ref={waterElementRef}></div>

                <div className="main">
                    <h1>RichDreamer Text-to-3D</h1>
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
                                <div className="skill">
                                    <p>ML/GenAI</p>
                                </div>
                                <div className="skill">
                                    <p>Prompt Engineering</p>
                                </div>
                                <div className="skill">
                                    <p>Python</p>
                                </div>
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
                            <a href="https://github.com/modelscope/richdreamer" target="_blank">
                                <span className="app-link bold">Repo Link</span>
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
                    <div className="pain-points">
                        <h2 style={{marginTop:"2rem"}}>Pain Points</h2>
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

                    <h2>Takeaways</h2>
          <div className="takeaways">
              {" "}
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
              <p>Check out animations I made of the model's 3D outputs in Blender!</p>
              <div className="video-container">
            <video
              src="/case-study-2/strawberry_donut.mp4"
              aria-label="camera spin animation of strayberry donut 3d output"
              typeof="video/mp4"
              autoPlay
              muted
              loop
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
            >
              Your browser does not support the video tag.
            </video>
          </div>
          <div className="seperator" />
          <div className="seperator" style={{height:"1rem"}}/>
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

export default CaseStudy2;
