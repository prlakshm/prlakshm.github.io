import { useEffect, useRef } from "react";
import Footer from "../../components/Footer.js";
import "./case-study-hbo-max2.css";


function CaseStudyHBOMax2() {

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
        <div className="case-study-hbo-max2">
            <div className="content">
            <div className="side-nav">
                <p onClick={() => scrollToSection(topRef)}>(<img src="/icons/up-arrow.png" alt="up arrow icon"/>) Top</p>
                    <p onClick={() => scrollToSection(problemRef)}>Problem</p>
                    <p onClick={() => scrollToSection(solutionRef)}>Solution</p>
                    <p onClick={() => scrollToSection(iterationsRef)}>Iterations</p>
                    <p onClick={() => scrollToSection(reflectionRef)}>Reflection</p>
            </div>
            <div className="study">

                <div className="main">
                    <h1>Surprise Rail - HBO Max</h1>
                    <div className="overview">
                    <div className="video-container">
                    <video
                            src="/case-study-hbo-max2/surprise-rail-overview.mp4"
                            aria-label="Surprise Tail Click Through Animation"
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
                            <p>Product Designer</p>
                        </div>
                        <div className="timeline">
                            <h3>Timeline</h3>
                            <p>Jun - Jul 2025</p>
                        </div>
                        <div className="team">
                            <h3>Team</h3>
                            <p>
                            <a href="https://www.linkedin.com/in/annahoprofile/" target="_blank">
                                <span className="app-link">Anna Ho</span>
                            </a> (UX Research), <br />
                            {" "} <a href="https://www.linkedin.com/in/ccmorrison/" target="_blank">
                                <span className="app-link">Caitlin Morrison</span>
                            </a> (UX Research), <br />
                            {" "} <a href="https://www.linkedin.com/in/natalialopezleon/" target="_blank">
                                <span className="app-link">Natalia Lopez Leon</span>
                            </a> (Visual Designer), <br />
                            {" "} <a href="https://www.linkedin.com/in/hakha-mashayekhi-964b38a/" target="_blank">
                                <span className="app-link">Hakha Mashayekhi</span>
                            </a> (Manager) 
                            </p>
                        </div>
                        <div className="skills">
                            <h3>Skills</h3>
                            <div className="all-skills">
                                    <p>Human-AI Interaction ● <br /> Visual Design ● Figma</p>
                            </div>
                        </div>
                    </div>
                    <div className="overview">
                        <p>
                        The Surprise Rail is an <span className="bold">AI-powered feature </span> for the HBO Max streaming app
                        that hides keyart and replaces it with teaser descriptors. It's designed to  {" "}
                            <span className="bold">
                            spark curiosity and increase traffic on subpages
                            </span>
                            .
                        
                            <div className="seperator" />
                            <a href="https://www.figma.com/proto/XVlsXuMb5tnBTed7jCXIKf/Surprise-Tiles-Component-Idea?page-id=6006%3A97068&node-id=6196-44768&viewport=1022%2C366%2C0.04&t=fJQsBq8Ro4YMNmMp-1&scaling=contain&content-scaling=fixed&starting-point-node-id=6196%3A44768&show-proto-sidebar=1" target="_blank">
                                <span className="app-link bold">Presentation</span>
                            </a>
                            <span className="vert-bar">
                                {" | "}
                            </span>
                            <a href="https://www.figma.com/proto/XVlsXuMb5tnBTed7jCXIKf/Surprise-Tiles-Component-Idea?page-id=6006%3A97068&node-id=6069-227551&viewport=1022%2C366%2C0.04&t=fJQsBq8Ro4YMNmMp-1&scaling=contain&content-scaling=fixed&starting-point-node-id=6069%3A227551&show-proto-sidebar=1" target="_blank">
                                <span className="app-link bold">Prototype</span>
                            </a>
                            <span className="vert-bar">
                                {" | "}
                            </span>
                            <span className="bold">Technologies used:</span> Figma 
                        </p>
                    </div>
                    <div className="pain-points" ref={problemRef}>
                        <h2>Current Problems</h2>
                        <ul>
                            <li>
                                <p><span className="bold">Lack of Engagement on Subpages:</span> 98% of users don't make it past the HBO Max home page and most of the interior pages aren't driving any meaningful traffic .</p>
                            </li>
                            <li>
                                <p><span className="bold">Lack of Context:</span> Users don't know what they're getting themselves into when clicking a title based on just the keyart.</p>
                            </li>
                            <li>
                            {/* Do they beleive they'll like it before pressing play? */}
                                <p><span className="bold">Lack of Confidence:</span> Users spend an average of 2 minutes searching for something to watch. When they can’t decide with confidence, they leave the app and turn to competitors.</p>
                            </li> 
                        </ul>
                    </div>
                    <div className="pain-points" ref={solutionRef}>
                        <h2>My Idea</h2>
                        {/* Introducing the Surprise Rail... */}
                        <p>Inspired by <span className="italic">Blind Date with a Book</span>, I came up with surprise tiles where the key art is hidden and replaced with AI-generated teaser descriptors.</p>
                        
                        <h2 ref={iterationsRef}>What will it look like?</h2>
                        {/* <div className="img-container">
                            <img
                                src="/case-study-hbo-max2/CTV-Themed-Rail.png"
                                alt="Surprise Rail Overview Image"
                            />
                        </div> */}
                    
                    </div>

                    <h2>Reflection</h2>
                    <div className="takeaways" ref={reflectionRef}>
                        {" "}
                        <ul>
                            <li>
                                <p>
                                    <span className="bold">Prioritize for Deadlines:</span> There were features we
                                    initially planned to implement, like Google OAuth
                                    for login. I{" "}
                                    
                                        prioritized <span className="bold">optimizing existing features instead of adding new
                                        ones
                                    </span>
                                    . Limiting the scope was better than delivering a half-baked
                                    product.
                                </p>
                            </li>
                            <li>
                                <p>
                                    <span className="bold">Keep Future Engineers in Mind:</span> I created query functions for current use cases and for use cases
                                    that might come up in the future. By commenting and coding with future software engineers in mind, we can <span className="bold">streamline development workflow and new feature integrations</span>.
                                </p>
                            </li>
                            <li>
                                <p>
                                    <span className="bold">Scalable Database:</span> Storing account and item information in a <span className="bold">MongoDB database
                                    ensured data security</span>. Data
                                    can be scaled, meaning even when data is added (the website gets
                                    more users) the system still runs smoothly.
                                </p>
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

export default CaseStudyHBOMax2;
