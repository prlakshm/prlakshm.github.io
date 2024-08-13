import { useEffect, useRef } from "react";
import Footer from "../../components/Footer.js";
import "./case-study-1.css";


function CaseStudy1() {
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
        <div className="case-study-1">
            <div className="study">
                <div className="water-full"></div>
                <div className="water-full-mask" ref={waterElementRef}></div>

                <div className="main">
                    <h1>Binary Escape</h1>
                    <div className="overview-info">
                        <div className="role">
                            <h3>Role</h3>
                            <p>Design Lead, <br/>Software Engineer</p>
                        </div>
                        <div className="timeline">
                            <h3>Timeline</h3>
                            <p>Jun - Aug 2024</p>
                        </div>
                        <div className="team">
                            <h3>Team</h3>
                            <p>
                            Sage Ellefson (PM), Alexandru Soroiu, Demilade Onasanya,
                            Sergio Montufar (Software Engineers)
                            </p>
                        </div>
                        <div className="skills">
                            <h3 style={{marginLeft:"-3rem"}}>Skills</h3>
                            <div className="all-skills">
                                <div className="skill">
                                    <p>Game Development</p>
                                </div>
                                <div className="skill">
                                    <p>3D Animation</p>
                                </div>
                                <div className="skill">
                                    <p>Javascript</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="overview">
                        <p>
                            Binary Escape is an <span className="bold">8-round puzzle-adventure game</span> that challenges players' critical thinking skills.
                            An intern is <span className="bold">trapped inside a computer</span> and the player has to solve riddles to help the intern escape!
                            <div className="seperator" />
                            <a href="https://binaryescape.netlify.app/" target="_blank">
                                <span className="app-link bold">Binary Escape</span>
                            </a>
                            <span className="vert-bar">
                                {" | "}
                            </span>
                            <a href="https://github.com/sageellefson0/binary-escape" target="_blank">
                                <span className="app-link bold">Repo Link</span>
                            </a>
                            <span className="vert-bar">
                                {" | "}
                            </span>
                            <span className="bold">Technologies used:</span> JavaScript, HTML/CSS, Blender, <a href="https://www.mixamo.com/" target="_blank"><span className="app-link bold">Mixamo</span>
                            </a>, Photoshop, After Effects, Firebase
                        </p>
                        <div className="img-container">
                            <img
                                src="/case-study-1/artists-corner-overview.png"
                                alt="Artist's Corner PVD website displayed on desktop"
                            />
                        </div>
                    </div>
                    <div className="pain-points">
                        <h2>Pain Points</h2>
                        <ul>
                            <li>
                                <p><span className="bold">Simulating Apps:</span> To invoke familiarity and nostalgia from users, I recreated the Microsoft Word 2007 application. This was by far the most complicated UI I've worked on with lots of toggles, buttons, and components.</p>
                            </li>
                            <li>
                                <p><span className="bold">Character Rigging:</span> </p></li>
                        </ul>
                    </div>
                    <div className="video-container">
                        <video
                            src="/case-study-1/artists-corner-screen.mp4"
                            aria-label="Artist's Corner PVD website playing on laptop"
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
                        <ul>
                            <li>
                                <p>
                                    <span className="bold">Outsource Whenever Possible:</span> Creating the 3D characters was , but using <a href="https://www.mixamo.com/" target="_blank"><span className="app-link bold">Mixamo</span>
                                    </a> for action animations simplified the process. <span className="bold">Coders are friends!</span> I also built my Microsoft Word UI off of Rahul's open-source <a href="https://github.com/lolstring/window98-html-css-js" target="_blank"><span className="app-link bold">recreation of Microsoft Word 95</span>
                                    </a>. 
                                </p>
                            </li>
                            <li>
                                <p>
                                    <span className="bold">Design Versatile Assets:</span> 
                                </p>
                            </li>
                            <li>
                              <p><span className="bold">Balance Creativity and Consistency:</span></p>
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

export default CaseStudy1;
