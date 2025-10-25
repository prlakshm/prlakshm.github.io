import { useEffect, useRef } from "react";
import Footer from "../../components/Footer.js";
import "./case-study-hbo-max1.css";


function CaseStudyHBOMax1() {

    // This will run once when the component mounts scroll to top page
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

     // Section references
     const topRef = useRef(null);
     const problemRef = useRef(null);
     const researchRef = useRef(null);
     const iterationsRef = useRef(null);
     const solutionRef = useRef(null);
     const reflectionRef = useRef(null);
 
     // Scroll to section smoothly
     const scrollToSection = (ref : React.RefObject<HTMLElement>) => {
         ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
     };


    return (
        <div className="case-study-hbo-max1" ref={topRef}>
            <div className="content">
            <div className="side-nav">
                <p onClick={() => scrollToSection(topRef)}>(<img src="/icons/up-arrow.png" alt="up arrow icon"/>) Top</p>
                    <p onClick={() => scrollToSection(problemRef)}>Problem</p>
                    <p onClick={() => scrollToSection(researchRef)}>Research</p>
                    <p onClick={() => scrollToSection(iterationsRef)}>Iterations</p>
                    <p onClick={() => scrollToSection(solutionRef)}>Solution</p>
                    <p onClick={() => scrollToSection(reflectionRef)}>Reflection</p>
            </div>
            <div className="study">

                <div className="main">
                    <h1 >Surprise Rail - HBO Max</h1>
                    <div className="overview">
                    <div className="video-container">
                    <video
                            src="/case-study-hbo-max1/surprise-rail-overview.mp4"
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
                    <div className="pain-points" ref={researchRef}>
                        <h2>My Idea</h2>
                        {/* Introducing the Surprise Rail... */}
                        <p>Inspired by <span className="italic">Blind Date with a Book</span>, I came up with surprise tiles where the key art is hidden and replaced with AI-generated teaser descriptors. This way, lesser known titles can get discovered by playing off  the appeal of surprise.</p>
                        
                        <h4>From UX Research we found...</h4>

                        <p>Out of atmospheric, behavior, thematic, and tactical descriptors, thematic and tactical descriptors have the highest impact on decision making. As a bonus, they tell more about the title. </p>

                        <h4>I decided to use 2-3 word thematic or tactical descriptors.</h4>
                        <p> Going back to our intitial problems, we are trying to help users feel more confident choosing a title and give them more context on what the its is about. 
                        <br />
                        <br />
                        So, thematic and tactical descriptors replace the key art in surprise tiles. I'm keeping them to 2-3 words as per advice from our UX writer, because then they are easily skimmable and invite exploration. </p>

                        <h4 ref={iterationsRef}>How will the AI work?</h4>

                        <p>The AI will take in 3 inputs: the title, the point of the user journey the user is on (current HBO Max subpage), and the copy guide with descriptor guidelines and title metadata.
                        <br />
                        <br />

                        Inputs → Title, Point in User Journey, Copy Guide
                        <br />Outputs → Teaser Descriptor

                        <br />
                        <br />

                        The key is that the page the user is on gives us a hint on what they are interested in and what might intrigue them!
                        </p>

                        <div className="img-container">
                            <div className="img-caption">
                            <img
                                
                                src="/case-study-hbo-max1/Hacks Example.png"
                                alt="Hacks through Comedy subpage is described as 'Fame gets Feral' and LGBTQ+ is 'Outsiders with Mics'"
                            />
                            <h5 style={{transform: "translateY(-1.9rem)"}}>The descriptors for <span className="italic">Hacks</span> would be different if the user was on the Comedy genre page vs. the LGBTQ+ collection page.</h5>
                            </div>
                            <div className="img-caption">
                            <img
                               
                                src="/case-study-hbo-max1/GOT Example.png"
                                alt="Game of Thrones through Drama subpage is described as 'Bloodline Betrayal' and Sci-fi & Fantasy is 'Ancient Powers Rise'"
                            />
                            <h5 style={{transform: "translateY(-1.5rem)"}}>Based on the subpage, the descriptor would appeal to the content focus and theme.</h5>
                            </div>
                        </div>
                        <p></p>
                        
                        <h2 ref={iterationsRef}>What will it look like?</h2>
                        <p>My first iteration of the tile was a film-reel design with tiles placed randomly on the page.</p>

                        <div className="img-caption">
                            <img
                               
                                src="/case-study-hbo-max1/film-reel-tiles.png"
                                alt="first iteration tile design where surprise tiles are rectangle film reels'"
                            />
                            <h5 style={{transform: "translateY(-1.5rem)"}}>Through cubby testing, I found randomly-placed tiles disrupted existing mental models for users and they were confused why those tiles are hidden. </h5>
                            </div>

                        <p>So, I decided to turn the surprise tiles into their own rail. I also received feedback from my skip-level <a href="https://www.linkedin.com/in/mmcwatters/" target="_blank">
                                <span className="app-link">Michael McWatters</span>
                            </a> and he thought the film-reel concept was overdone in the entertainment/media industry.</p>

                        <h4>A/B Testing</h4>
                        <p>I now presented my test group with two new tile designs: a solid black and a frosted-glass inspired by HBO Max's new visual style rebrand.</p>

                        <div className="img-caption">
                            <img
                               
                                src="/case-study-hbo-max1/tile-testing-options.png"
                                alt="solid black vs. frosted glass tile designs'"
                            />
                            <h5 style={{transform: "translateY(-2.25rem)"}}>Participants preferred the frosted glass design because it was more visually engaging and indicated that there was something behind the tile.</h5>
                            </div>

                            <p>I narrowed down to two names: "Blind Date with a [theme]" or "Surprise [theme]." It's important the title changes based on the subpage to indicate how the AI results change based on the point of the user journey.</p>

                            <div className="img-caption">
                            <img
                               
                                src="/case-study-hbo-max1/name-options.png"
                                alt="solid black vs. frosted glass tile designs'"
                            />
                            <h5 style={{transform: "translateY(-1.5rem)"}}>Younger ages 18-25 understood the play on <span className="italic">blind date</span>, but older ages took it more literal and thought it involved romance.</h5>
                            </div>

                            <p>As per advice from our UX writers, I decided on "Surprise [theme]" because it clearly communicated the concept and was the most straightforward. </p>
                        
                        <h2 ref={solutionRef}>Final Design</h2>
                        <p>I added a card-flip animation and a delayed reveal for the top preview rail for a more playful interactive experience!</p>
                        <div className="video-container" style={{marginTop: "1.5rem"}}>
                    <video
                            src="/case-study-hbo-max1/demo-video.mp4"
                            aria-label="Final Design for Surprise Tail on CTV Click-Through Animation"
                            autoPlay
                            muted
                            loop
                            playsInline
                        >
                            Your browser does not support the video tag.
                        </video>
                        </div>



                    
                    </div>

                    <h2>Reflection</h2>
                    <div className="takeaways" ref={reflectionRef}>
                        {" "}
                        <ul>
                            <li>
                                <p>
                                    <span className="bold">Presenting to PMs:</span> Even if your idea doesn't get picked up by a PM, presenting  gets you visibility as a designer so they can understand where your skills and interests lie (AI-enhanced discovery in my case!).
                                </p>
                            </li>
                            <li>
                                <p>
                                    <span className="bold">Hold on Tightly, Let Go Lightly:</span> I learned to fight for my ideas and defend my design choices when asked in reviews, but also let go if something isn't working. We pivot quickly and often, so I learned to not get too attached to one idea.
                                </p>
                            </li>
                            <li>
                                <p>
                                    <span className="bold">Sometimes Naming is the Hardest Part:</span> I tossed out many name ideas like "Mystery Match," "Blindbox," "Surprise Inside," and "What's This?" to name a few. <span className="bold">Being direct is more effective because it helps users instantly understand what’s going on</span>. 
                                    Still, we aren't the happiest with this because TedEx has a feature called "Surprise Me!"
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

export default CaseStudyHBOMax1;
