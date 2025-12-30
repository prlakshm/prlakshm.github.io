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
     const contextRef = useRef(null);
     const problemRef = useRef(null);
     const iterationsRef = useRef(null);
     const solutionRef = useRef(null);
     const evaluationRef = useRef(null);
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
                <p onClick={() => scrollToSection(contextRef)}>Context</p>
                    <p onClick={() => scrollToSection(problemRef)}>Problem</p>
                    <p onClick={() => scrollToSection(iterationsRef)}>Iterations</p>
                    <p onClick={() => scrollToSection(solutionRef)}>Solution</p>
                    <p onClick={() => scrollToSection(evaluationRef)}>Evaluation</p>
                    <p onClick={() => scrollToSection(reflectionRef)}>Reflection</p>
            </div>
            <div className="study">

                <div className="main">
                    <h1>Reasons to Watch LLM</h1>
                    <div className="overview">
                    <div className="video-container">
                    <video
                            src="/case-study-hbo-max2/rtw-overview2.mp4"
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
                            <p>Jun - Aug 2025</p>
                        </div>
                        <div className="team">
                            <h3>Team</h3>
                            <p>
                            <a href="https://www.linkedin.com/in/tracy-oneil/" target="_blank">
                                <span className="app-link">Tracy O'Neil</span>
                            </a> (Product Designer), <br />
                            {" "} <a href="https://www.linkedin.com/in/jeff-romaniuk-7ab4646/" target="_blank">
                                <span className="app-link">Jeff Romaniuk</span>
                            </a> (UX Writer), <br />
                            {" "} <a href="https://www.linkedin.com/in/annahoprofile/" target="_blank">
                                <span className="app-link">Anna Ho</span>
                            </a> (UX Research), <br />
                            {" "} <a href="https://www.linkedin.com/in/hakha-mashayekhi-964b38a/" target="_blank">
                                <span className="app-link">Hakha Mashayekhi</span>
                            </a> (Manager) 
                            </p>
                        </div>
                        <div className="skills">
                            <h3>Skills</h3>
                            <div className="all-skills">
                                    <p>ML/Gen AI ● <br /> Prompt Engineering ● Prototyping</p>
                            </div>
                        </div>
                    </div>
                    <div className="overview">
                        <p>                      
                        Reasons to Watch (RTW) is a new description that appears when a user focuses on an existing recommendation. It <span className="bold">explains why the title is relevant based on their preferred themes and moods</span>. 
                        
                        <br />
                        <br />                        
                        I built a 1st-generation POC for a personalized version of RTW where <span className="bold">descriptions are specific to a user's watch history.</span>
                        
                            <div className="seperator" />
                            <a href="https://docs.google.com/presentation/d/1re-kPSn8nNVJDsieV3Misp4Xcn-eBrfK/edit?usp=sharing&ouid=116774489859738726779&rtpof=true&sd=true" target="_blank">
                                <span className="app-link bold">Presentation</span>
                            </a>
                            <span className="vert-bar">
                                {" | "}
                            </span>
                            <a href="https://drive.google.com/file/d/1-qUXaHEFNvA5jhT4-ZloqK-blHu-Oq2h/view?usp=sharing" target="_blank">
                                <span className="app-link bold">Recording</span>
                            </a>
                            <span className="vert-bar">
                                {" | "}
                            </span>
                            <span className="bold">Technologies used:</span> Python, Gemini API, Typescript, Figma 
                        </p>
                    </div>
                    <div className="pain-points" ref={contextRef} style={{marginTop: "0.5rem"}}>
                        <h2>Part of a bigger project...</h2>
                        <p> We did not start with the personalized version of RTW due to <span className="bold">cost and scalability.</span> Instead, the <span className="bold">team was pursuing optimized descriptions through user segmentation</span>.
                            <br />
                            <br />
                            Segments are content-based, where <span className="bold">each segment reflects certain themes or storylines a user is drawn to</span>. A user is assigned a segment based on what their watch history most closely aligns with. 
                            <br />
                            <br />
                            Below are examples of how RTW descriptions could differ across the different user segments.
                        </p>
                        {/* <div className="description-section">
                        <div className="column">
                            <img
                            src="/case-study-hbo-max2/gilded-age-key-art.png"
                            alt="16:9 Key Art for The Gilded Age"
                            className="show-image"
                            />

                            <h4>DEFAULT COPY</h4>
                            <p>
                                From Julian Fellowes, this sprawling period drama chronicles the great
                                conflict between old and new in New York's glittering Gilded Age.
                            </p>
                            </div>
                        

                        <div className="column">
                            <h4>GENERATED DESCRIPTIONS</h4>

                            <div className="segment">
                            <h5>Prestige Superfans</h5>
                            <p>
                                A gripping portrayal of wealth, power, and societal change in old New
                                York through the lens of layered, elite families.
                            </p>
                            </div>

                            <div className="segment">
                            <h5>Connoisseur-istas</h5>
                            <p>
                                Ambitious women navigate intricate relationships and societal pressures
                                in a fiercely stratified 19th-century New York.
                            </p>
                            </div>

                            <div className="segment">
                            <h5>Armchair Detectives</h5>
                            <p>
                                Witness the sweeping transformation of New York through the eyes of
                                powerful families during a dramatic social upheaval.
                            </p>
                            </div>
                        </div>
                        </div> */}
                        <div className="img-container">
                            <img
                                src="/case-study-hbo-max2/segmentation-example.png"
                                alt="Examples of how the RTW description of 'The Gilded Age' can differ if for the user segments 'Prestige Superfans', 'Connoisseur-istas','Armchair Detectives'."
                            />
                        </div>

                    </div>
                    <div className="pain-points" ref={problemRef}>
                        <h2>Current Problems</h2>

                        <ul>
                            <li>
                                <p><span className="bold">Users Are Pigeon-Holed:</span> A user might love slow-burn period dramas on weekdays and lighthearted comedies on weekends. A <span className="bold">single segment doesn't capture the nuances in a user's watch behavior</span>. In addition, recommendations end up feeling repetitive and focusing on the same themes.</p>
                            </li>
                            <li>
                                <p><span className="bold">Feels Too Generic:</span> Every quarter, <span className="bold">HBO Max ranks lowest on PXI</span> (Product Experience Index), a soft CPI metric that measures the extent users feel the app is "designed with them in mind." <span className="bold">Descriptions don’t feel personalized and could easily apply to anyone</span>, which doesn't help our case.</p>
                            </li>
                        </ul>

                    </div>
                    <div className="pain-points" ref={iterationsRef}>
                        <h2>My POC</h2>
                        {/* Introducing the Surprise Rail... */}
                        <p>We wanted to <span className="bold">validate the value of personalized descriptions to determine if it's worth investing in</span> for the future direction of RTW.
                        
                        <br />
                        <br />
                        
                        To streamline the manual process and scale efficiently, we wanted to <span className="bold">build an LLM agent to generate RTW descriptions</span>. I implemented the agent with Gemini API. 
                        
                        <br />
                        <br />

                        The tricky part was <span className="bold">constructing a prompt to produce consistent, high-quality outputs</span>.
                        </p>

                        <h4>First Iteration Results</h4>

                        <div className="img-container">
                            <img
                                src="/case-study-hbo-max2/single-agent-prompt.png"
                                alt="Prompt breakdown with basic specs, core tenents, and good/bad examples"
                            />
                        </div>
                        <div className="table-scroll">
                        <table className="results-table">
                        <thead>
                        <tr>
                            <th>Watch History</th>
                            <th>Recommended Title</th>
                            <th>Generated RTW</th>
                            <th>Default Copy</th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr>
                            <td rowSpan={2} style={{ width: "14rem" }}>
                                Succession,<br />
                                The Lord of the Rings: The Fellowship of the Ring,<br />
                                Friends,<br />
                                The O.C.,<br />
                                Game of Thrones,<br />
                                Big Bang Theory</td>
                            <td>House of the Dragon</td>
                            <td>The creators of <span className="italic">Game of Thrones</span> bring another epic series of power, politics, and family feuds. It's <span className="italic">Succession with dragons</span>.</td>
                            <td>Set 200 years before the events of Game of Thrones, this epic series tells the story of House Targaryen.</td>
                        </tr>
                        <tr>
                            <td>One Tree Hill</td>
                            <td>From high school halls to intense rivalries, this series explores brotherhood, love, and self-discovery. A perfect watch after <span className="italic">The O.C</span>.</td>
                            <td>In a small North Carolina town, two estranged half brothers carry on very different lives.</td>
                        </tr>
                        </tbody>
                    </table>
                    </div>
                        
                        <h2>Modifying Inputs</h2>

                        <p>The model kept namedropping titles from the watch history, so I wanted to add limitations on when another title was mentioned. <span className="bold">I added a "Liked List" input</span> to denote which titles can be referenced in RTW descriptions. 
                        
                        <br />
                        <br />
                        
                        This is <span className="bold">from HBO Max’s new ratings feature where you can rate titles as "like," "love," or "not for me."</span> So now the inputs are:

                        <br />
                        <br />

                        <span className="bold">Inputs → Watch History, Liked List</span>
                        <br /><span className="bold">Outputs → RTW Description</span>

                        
                        </p>

                        <h4>Testing More Variables</h4>

                        <p> I also tested different <span className="bold">temperatures, character lengths, and external sources</span> to evaluate their impact on blurb writing.</p>

                        <div className="table-scroll">
                        <table className="results-table">
                        <thead>
                            <tr>
                            <th>Variable</th>
                            <th>Options Tested</th>
                            <th>Best Performing</th>
                            <th>Reason</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                            <td><strong>Temperature</strong></td>
                            <td>0.5, 0.6, 0.7, 0.8, 0.9</td>
                            <td>0.7</td>
                            <td>Creative, varied sentence structures. Best aligned with the core tenet "embrace variation."</td>
                            </tr>
                            <tr>
                            <td><strong>Character Length</strong></td>
                            <td>135-character, 175-character</td>
                            <td>135-character</td>
                            <td>Shorter descriptions were easier to skim and can be just as effective in compelling to press play.</td>
                            </tr>
                            <tr>
                            <td><strong>External Sources</strong></td>
                            <td>(any combination of) IMDB, OMDB, Wikipedia, Youtube</td>
                            <td>IMDB, OMDB, and Wikipedia</td>
                            <td>More sources improved quality, but we ran into YouTube API quota limits so we used these three.</td>
                            </tr>
                        </tbody>
                        </table>
                        </div>

                        <h4>More Agents...</h4>

                        <p>The blurbs still felt generic and <span className="bold">didn't feel personalized</span>. Additionally, they <span className="bold">didn't always meet the basic specs</span> of being within 135 characters, having no exclamation marks, etc. 
                            
                            <br />
                            <br />

                            I realized the one agent was doing too much. 
                            
                            <br />
                            <br />
                            
                            Instead of single agent, I <span className="bold">split the tasks into 3 seperate agents</span>: a pattern anaylst to analyze the watch history, the blurb writer, and the editor to ensure compliance. Then, I added an optional 4th agent too choose the best out of three.</p>

                         <div className="img-container">
                            <img
                                src="/case-study-hbo-max2/agent-breakdown.png"
                                alt="Tasks and Roles of the 4 agents: Pattern Analyst to anaylze watch history, Blurb Writer, Editor to ensure compliance, and Critic to choose best out of 3"
                            />
                        </div>

                        <p>You can see my notes and the results from each individual iteration in the Figjam below.</p>
                        <div className="figma-embed">
                        <iframe
                            title="RTW POC — Hyper Personalized Iteration Notes"
                            src="https://embed.figma.com/board/QSKdEIHPB35s2UbyV7oEyI/RTW-POC-%E2%80%93-Hyper-Personalized?node-id=0-1&embed-host=share"
                            style={{ border: "1px solid rgba(0, 0, 0, 0.1)" }}
                            allowFullScreen
                            loading="lazy"
                        />
                        </div>
                    
                    </div>

                    <div className="pain-points" ref={solutionRef}>
                            <h2>Final Results</h2>

                            <p>Below are exmaples of the RTW descriptions generated by the LLM agents I created. We can also see how <span className="bold">themes extracted from the watch history effected the generated output</span>. </p>

                            <div className="img-container">
                            <img
                                src="/case-study-hbo-max2/final-result1.png"
                                alt="Final generated result of House of the Dragon: “The creators of Game of Thrones bring another epic series of power, politics, and family feuds. It's Succession with dragons.”"
                            />
                        </div>
                        <p>Now, the only referenced titles are from the liked list.</p>
                        <div className="img-container">
                            <img
                                src="/case-study-hbo-max2/final-result2.png"
                                alt="Final result of Succession: “Love the chaos of The Righteous Gemstones? Its corporate cousin is a vicious fight for Daddy's love where the jokes cut like glass.”"
                            />
                        </div>

                        <p>Compared to the default copy, these descriptions <span className="bold">feel more personalized</span> and are  <span className="bold">intentially designed to compel the veiwer to press play</span>.</p>

                    </div>

                    <h2>Evaluation</h2>
                    <div className="pain-points" ref={evaluationRef}>
                        <p>I worked with design technologist <a href="https://www.linkedin.com/in/travis-swan/" target="_blank">
                                <span className="app-link">Travis Swan</span>
                            </a> to build an <span className="bold">internal evalation tool to evaluation the RTW descriptions generated by the LLM agents</span>. We sent this tool to others in the global tech org to help collect data on quality of outputs.</p>

                            <div className="img-caption">
                            <img
                               
                                src="/case-study-hbo-max2/eval-tool1.png"
                                alt="screenshot of internal eval tool selecting watch history"
                            />
                            <h5 style={{transform: "translateY(-2.25rem)"}}>Users first input their watched titles and liked content.</h5>
                            </div>

                            <div className="img-caption">
                            <img
                               
                                src="/case-study-hbo-max2/eval-tool2.png"
                                alt="screenshot of internal eval tool ratings page"
                            />
                            <h5 style={{transform: "translateY(-2.25rem)"}}>Then, they blindly choose between and rate the default copy and the generated description.</h5>
                            </div>

                            <p>Below you can see the wireframes I designed for the internal evaluation tool and see the <a href="https://www.figma.com/proto/smeu6Gk9QM7PKQmlMOvii4/Hyper-personalized-RTW-Wireframes?node-id=3001-26320&t=67CCRJtqBsHvYXae-1" target="_blank">
                                <span className="app-link">Figma Prototype</span>
                            </a> here.</p>
                            <div className="figma-embed">
                        <iframe
                            title="RTW POC — Internal Evaluation Tool Wireframes"
                            src="https://embed.figma.com/design/smeu6Gk9QM7PKQmlMOvii4/Hyper-personalized-RTW-Wireframes?node-id=3001-26320&embed-host=share" 
                            style={{ border: "1px solid rgba(0, 0, 0, 0.1)" }}
                            allowFullScreen
                            loading="lazy"
                        />
                        </div>
                        

                        <h4>In the meantime... </h4>
                        <p>While the internal tool was being tested, I created an <span className="bold">asynchronous spreadsheet to collect feedback faster and compare results</span>.</p>

                        <div className="img-container">
                            <img
                                src="/case-study-hbo-max2/synch-spreadsheet.png"
                                alt="Asynchronous Spreadsheet sheet"
                            />
                        </div>

                        <p>The RTW working team and my intern friends evaluated descriptions blind through the spreadsheet.</p>

                        <h4>Findings</h4>

                        <p>With the help of <a href="https://www.linkedin.com/in/annahoprofile/" target="_blank">
                                <span className="app-link">Anna Ho</span>
                            </a> from UX Research, I <span className="bold">extracted key insights from the user feedback</span>. Participants repeatedly highlighted that the RTW descriptions stood out because they:</p>
                        
                        <div className="table-scroll">
                            <table className="findings-table">
                        <thead>
                        <tr>
                            <th><div className="findings-heading"><img src="/case-study-hbo-max2/theater-masks.svg"/>Capture preferred mood and tone</div></th>
                            <th><div className="findings-heading"><img src="/case-study-hbo-max2/thumbs-up.svg"/>Are engaging and fun to read</div></th>
                            <th><div className="findings-heading"><img src="/case-study-hbo-max2/connections.svg"/>Build trust by linking to past favorites</div></th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr>
                            <td>Uses mood-based language, emphasizing themes that match the feelings and atmosphere the user enjoys.</td>
                            <td>Makes the experience memorable while adding personality and warmth to brand’s voice.</td>
                            <td>Highlights meaningful connections to past favorite themes and titles, helping users see why this title fits their tastes.</td>
                        </tr>
                        <tr>
                            <td>“Intriguing” <br/> “Very me”  <br/> - Participant </td>
                            <td>“Hilarious, fun to read, and from what I recall, fairly accurate.” <br /> - Participant </td>
                            <td>“I love [liked title]. I like how it draws the connection between this title and [liked title]” <br /> - Participant </td>
                        </tr>
                        </tbody>
                    </table>
                    </div>

                        <p>The POC was sucessful in validating the impact of RTW, and the team is <span className="bold">now identifying touchpoints to bring these personalized descriptions into the HBO Max product experience</span>.
                        </p>
                    </div>

                    <h2>Reflection</h2>
                    <div className="takeaways" ref={reflectionRef}>
                        {" "}
                        <ul>
                            <li>
                                <p>
                                    <span className="bold">Requirements Change Constantly:</span> Project leads introduced new requests and changes almost weekly. I <span className="bold">replanned tasks and revised prompts</span> to accommodate updates without slowing down the team's workflow.
                                </p>
                            </li>
                            <li>
                                <p>
                                    <span className="bold">Communicate Vision Early and Often:</span> I regularly <span className="bold">synced with teammates to clarify the project’s direction</span>, ensuring everyone was on the same page about the purpose, privacy level, and design of the descriptions. 
                                </p>
                            </li>
                            <li>
                                <p>
                                    <span className="bold">Frame Progress for Leadership:</span> I presented the status of the project in a way that aligned with how executives perceived the project. Even when we were weeks ahead, I often had to <span className="bold">step back and show RTW at an earlier state, highlighting progress in a way that matched their understanding</span>.
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
