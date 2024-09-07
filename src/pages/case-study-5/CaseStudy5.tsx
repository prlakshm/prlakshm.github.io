import { useEffect, useRef } from "react";
import Footer from "../../components/Footer.js";
import "./case-study-5.css";


function CaseStudy5() {
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
        <div className="case-study-5">
            <div className="study">
                <div className="water-full"></div>
                <div className="water-full-mask" ref={waterElementRef}></div>

                <div className="main">
                    <h1>Artist's Corner PVD</h1>
                    <div className="overview-info">
                        <div className="role">
                            <h3>Role</h3>
                            <p>PM, Fullstack Engineer</p>
                        </div>
                        <div className="timeline">
                            <h3>Timeline</h3>
                            <p>Dec 2023 - Jan 2024</p>
                        </div>
                        <div className="team">
                            <h3>Team</h3>
                            <p>
                                Jeffrey Tao, Dorinda Kyeremateng, Marissa Tam (Designers and
                                Front-end Engineers)
                            </p>
                        </div>
                        <div className="skills">
                            <h3>Skills</h3>
                            <div className="all-skills">
                                <div className="skill">
                                    <p>MongoDB/MQL</p>
                                </div>
                                <div className="skill">
                                    <p>Search Algorithm</p>
                                </div>
                                <div className="skill">
                                    <p>Typescript/React</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="overview">
                        <p>
                            Every fall and spring, Brown and RISD students look forward to
                            seasonal markets to buy and sell art. Outside of these
                            spaces, there is{" "}
                            <span className="bold">
                                no school-sanctioned platform for students to sell their
                                creations
                            </span>
                            .
                            <div className="seperator" /> Aimed at <span className="bold">1,200+ potential users</span>,{" "}
                            Artist's Corner PVD is a{" "}

                            <span className="bold">website for students to sell their crafts and
                                handmade goods</span>
                            {" "}
                            year-round. Only artists with an authorized school email can
                            create listings, so students can trust the seller.
                            <div className="seperator" />
                            <a href="https://artistscornerpvd.github.io/" target="_blank">
                                <span className="app-link bold">Artist's Corner PVD</span>
                            </a>
                            <span className="vert-bar">
                                {" | "}
                            </span>
                            <a href="https://github.com/artistscornerpvd/artistscornerpvd.github.io" target="_blank">
                                <span className="app-link bold">Repo Link</span>
                            </a>
                            <span className="vert-bar">
                                {" | "}
                            </span>
                            <span className="bold">Technologies used:</span> Typescript, React, Node.js, Vite, Figma, MQL, MongoDB, AWS
                        </p>
                        <div className="img-container">
                            <img
                                src="/case-study-5/artists-corner-overview.png"
                                alt="Artist's Corner PVD website displayed on desktop"
                            />
                        </div>
                    </div>
                    <div className="pain-points">
                        <h2>Pain Points</h2>
                        <ul>
                            <li>
                                <p><span className="bold">Receiveing Feedback:</span> We were on a tight deadline, so to maximize output I intitiated a feedback loop where team members critiqued each other's work. This allowed us to iteratively improve while still conserving time and resources.</p>
                            </li>
                            <li>
                                <p><span className="bold">Cloud Database Design:</span> Using MongoDB Atlas, AWS, and lots of YouTube videos,
                                    I designed a cloud database to accelerate and simplify how we stored data. I also used MQL (similar to SQL) to create data query functions for our front-end.</p>
                            </li>
                            <li>
                                <p><span className="bold">Search Algorithm:</span> Implementing the search algorithm was the hardest, because there
                                    was no "typical behavior" to follow for search results order. I developed an algorithm that ranked items based on partial-word matches in their descriptions.</p>
                            </li>
                        </ul>
                    </div>
                    <div className="video-container">
                        <video
                            src="/case-study-5/artists-corner-screen.mp4"
                            aria-label="Artist's Corner PVD website playing on laptop"
                            typeof="video/mp4"
                            autoPlay
                            muted
                            loop
                            playsInline
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

export default CaseStudy5;
