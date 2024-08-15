import { useEffect, useRef } from "react";
import Footer from "../../components/Footer.js";
import "./case-study-4.css";


function CaseStudy4() {
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
        <div className="case-study-4">
            <div className="study">
                <div className="water-full"></div>
                <div className="water-full-mask" ref={waterElementRef}></div>

                <div className="main">
                    <h1>PB&J Time</h1>
                    <div className="overview-info">
                        <div className="role">
                            <h3>Role</h3>
                            <p>Front-end Engineer</p>
                        </div>
                        <div className="timeline">
                            <h3>Timeline</h3>
                            <p>April 2024</p>
                        </div>
                        <div className="skills">
                            <h3>Skills</h3>
                            <div className="all-skills">
                                <div className="skill">
                                    <p>Prodia AI</p>
                                </div>
                                <div className="skill">
                                    <p>Photoshop</p>
                                </div>
                                <div className="skill">
                                    <p>2D Animation</p>
                                </div>
                                <div className="skill">
                                    <p>Javascript/React</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="overview">
                        <p>
                            PB&J Time is a <span className="bold">gourmet sandwitch building app</span> that explores different ways
                            an online ordering platform can use
                            <span className="bold">
                                {" "}
                                interaction and animation to engage users
                            </span>{" "}
                            in the purchasing experience.
                            <div className="seperator" />
                            <a href="https://sandwitch-builder.vercel.app/" target="_blank">
                                <span className="app-link bold">PB&J Time</span>
                            </a>
                            <span className="vert-bar">
                                {" | "}
                            </span>
                            <a href="https://github.com/prlakshm/pbj-time" target="_blank">
                                <span className="app-link bold">Repo Link</span>
                            </a>
                            <span className="vert-bar">
                                {" | "}
                            </span>
                            <span className="bold">Technologies used:</span> <a href="https://app.prodia.com/" target="_blank"><span className="app-link bold">Prodia AI</span>
                            </a>, Photoshop, Javascript, React, Node.js, HTML/CSS
                        </p>
                        <div className="img-container">
                            <img
                                src="/case-study-4/pbj-time-overview.png"
                                alt="PB&J Time web app displayed on laptop"
                            />
                        </div>
                    </div>
                    <div className="pain-points">
                        <h2>Pain Points</h2>
                        <ul>
                            <li>
                                <p><span className="bold">Cohesive Image Assets:</span> I needed my images to be in the same illustration style, but
                                    this was hard to find with stock photos. I used <a href="https://app.prodia.com/" target="_blank"><span className="app-link bold">Prodia AI</span>
                                    </a>, an
                                    AI image generator, to generate images with the same "Children's Stories V1 3D" style!</p>
                            </li>
                            <li>
                                <p><span className="bold">Learning Photoshop:</span> The AI sometimes generated
                                images with gibberish or erroneous features. I used Photoshop to edit these photos, which was a tedious but rewarding process.</p>
                            </li>
                            <li>
                                <p><span className="bold">Responsive 2D Animations:</span> The 2D animation of the ingediants falling on the sandwitch entice users to keep interacting with the web app. The
                                    challenge was to make it responsive so that the ingrediants line up on different screens.</p>
                            </li>
                        </ul>
                    </div>
                    <div className="video-container">
              <video
                src="/case-study-4/pbj-time-screens.mp4"
                aria-label="PB&J Time web app playing on laptop and phone"
                typeof="video/mp4"
                autoPlay
                muted
                loop
              >
                Your browser does not support the video tag.
              </video>
            </div>

                    <h2>Takeaways</h2>
          <div className="takeaways">
              {" "}
              <ul><li>
            <p>
              <span className="bold">Accessibility:</span> Animation <span className="bold">
                should be used sparingly
              </span>{" "}
              because they could distract users or not be accessibile. However,
              when used thoughtfully, they can increase accessibility and serve
              as an{" "}
              <span className="bold">
                additional way to notify users of updates to the system
              </span>
              .{" "}
              <br />
              <div className="sub-section">
              For example:
              <ul>
                <li>Item card tilting notifies users item is selected</li>
                <li>
                  Ingrediants "falling" on sandwitch notifies users item is
                  added to order
                </li>
              </ul>
              </div>
              </p>
              </li>
              <li>
                <p>
            <span className="bold">AI Generated Images:</span> AI generating images can{" "}
              <span className="bold">save money and resources</span>. Though it
              can be tedious to edit with Photoshop, the
              benefit is creating images with consistent styles. AI-generated images can help{" "}
              <span className="bold">
                create a unified visual identity
              </span>
              .
              </p>
              </li>
              </ul>
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

export default CaseStudy4;
