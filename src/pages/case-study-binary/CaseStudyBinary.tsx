import { useEffect, useRef } from "react";
import Footer from "../../components/Footer.js";
import "./case-study-binary.css";


function CaseStudyBinary() {

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
        <div className="case-study-binary" ref={topRef}>
             <div className="content">
            <div className="side-nav">
            <p onClick={() => scrollToSection(topRef)}>Overview</p>
                    <p onClick={() => scrollToSection(problemRef)}>Pain Points</p>
                    <p onClick={() => scrollToSection(solutionRef)}>Takeaways</p>
            </div>
            <div className="study">
                <div className="main">
                    <h1>Binary Escape</h1>
                    <div className="overview">
                    <div className="video-container">
                    <video
                            src="/case-study-1/binary-escape-preview.mp4"
                            aria-label="Binary scape logo animation cover art"
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
                            <p>Design Lead, <br/>Software Engineer</p>
                        </div>
                        <div className="timeline">
                            <h3>Timeline</h3>
                            <p>Jun - Aug 2024</p>
                        </div>
                        <div className="team">
                            <h3>Team</h3>
                            <p>
                            <a href="https://www.linkedin.com/in/sage-ellefson-aa2405211/" target="_blank">
                                <span className="app-link">Sage Ellefson</span>
                            </a> (PM), <br />
                            {" "} <a href="https://www.linkedin.com/in/alexandrudanielsoroiu/" target="_blank">
                                <span className="app-link">Alexandru Soroiu</span>
                            </a> (SWE), <br />
                            {" "} <a href="https://www.linkedin.com/in/demilade-onasanya/" target="_blank">
                                <span className="app-link">Demilade Onasanya</span>
                            </a> (SWE), <br />
                            </p>
                        </div>
                        <div className="skills">
                            <h3>Skills</h3>
                            <div className="all-skills">
                                    <div className="skill">
                                    <h5>Game Development</h5>
                                    </div>
                                    <div className="skill">
                                    <h5>3D Animation</h5>
                                    </div>
                                    <div className="skill">
                                    <h5>Javascript</h5>
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
                    </div>
                    <div className="pain-points" ref={problemRef}>
                        <h2>Pain Points</h2>
                        <ul>
                            <li>
                                <p><span className="bold">Simulating Apps:</span> To invoke familiarity and nostalgia from users, I recreated the Microsoft Word 2007 application. This was by far the most complicated UI I've worked on with lots of toggles, buttons, and components.</p>
                            </li>
                            <li>
                                <p><span className="bold">Character Rigging:</span> Character rigging is the process of attaching bones to a character to create a movable digital skeleton. Even though I've worked with Blender for a year, I still find this process difficult with all the steps and manual marking required.</p></li>
                                <li>
                                <p><span className="bold">Cross-browser Compatibility:</span> The animations needed to be consistent across web browsers. They were initially WebM videos with transparent backgrounds, but I changed them to MP4s to work on Safari, Chrome, Firefox, and Microsoft Edge.</p>
                            </li>
                        </ul>
                    </div>
                    <div className="video-container">
                        <video
                            src="/case-study-1/start-screen.mp4"
                            aria-label="Start page animation"
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
                            src="/case-study-1/pranavi-level-screen.mp4"
                            aria-label="Microsoft Word 2007 recreation puzzle round"
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
                            src="/case-study-1/end-screen.mp4"
                            aria-label="End page animation"
                            typeof="video/mp4"
                            autoPlay
                            muted
                            loop
                            playsInline
                        >
                            Your browser does not support the video tag.
                        </video>
                    </div>

                    
                    <div className="takeaways" ref={solutionRef}>
                    <h2>Takeaways</h2>
                        <ul>
                            <li>
                                <p>
                                    <span className="bold">Outsource Whenever Possible:</span> Creating the 3D characters was arduous, but using <a href="https://www.mixamo.com/" target="_blank"><span className="app-link bold">Mixamo</span>
                                    </a> for action animations simplified the process. Coders are friends! I also built my Microsoft Word UI off of Rahul's open-source <a href="https://github.com/lolstring/window98-html-css-js" target="_blank"><span className="app-link bold">recreation of Microsoft Word 95</span>
                                    </a>. Outsourcing can <span className="bold">significantly ease the software development process.</span>
                                </p>
                            </li>
                            <li>
                                <p>
                                    <span className="bold">Design Versatile Assets:</span> I designed logo and character assets that could be used in my round and reused by my teammates in their rounds. This streamlined workflow and established <span className="bold">visual consistency across the project</span>.
                                </p>
                            </li>
                            <li>
                              <p><span className="bold">Balance Creativity and Consistency:</span> As design lead, I would review my teammates' puzzle rounds for UI design. I had to give feedback that ensured <span className="bold">cohesive UI design across rounds</span> while still allowing them to <span className="bold">showcase their individuality</span>.</p>
                            </li>
                        </ul>
                    </div>

                </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}

export default CaseStudyBinary;
