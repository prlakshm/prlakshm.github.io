import { useEffect, useRef } from "react";
import Footer from "../../components/Footer.js";
import "./case-study-3.css";


function CaseStudy3() {
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
    <div className="case-study-3">
      <div className="study">
        <div className="water-full"></div>
        <div className="water-full-mask" ref={waterElementRef}></div>

        <div className="main">
          <h1>Mi Fonda Storefront</h1>
          <div className="overview-info">
            <div className="role">
              <h3>Role</h3>
              <p>UI/UX Designer</p>
            </div>
            <div className="timeline">
              <h3>Timeline</h3>
              <p>May 2024</p>
            </div>
            <div className="team">
              <h3>Team</h3>
              <p style={{ paddingLeft: "20px" }}>
                Jackie Cohen, Anna Wang, Brooke Wangenheim (UI/UX Designers)
              </p>
            </div>
            <div className="skills">
              <h3>Skills</h3>
              <div className="all-skills">
                <div className="skill-row">
                  <div className="skill">
                    <p>Figma</p>
                  </div>
                  <div className="skill">
                    <p>UI/UX</p>
                  </div>
                </div>
                <div className="skill-row">
                  <div className="skill">
                    <p>Accessibility</p>
                  </div>
                  <div className="skill">
                    <p>Responsive Design</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="overview">
            <p>
              Mi Fonda is a {" "}
              <span className="bold">tech startup</span>{" "}
              that <span className="bold">serves 100+ clients and consolidates food ordering apps</span> through partnerships with UberEats,
              GrubHub, DoorDash, etc. to decrease third-party fees and increase
              profit.
              <div className="seperator" /> Our team's job was to <span className="bold">redesign the storefront to appeal to a younger generation of users</span>. And who better to do this than a group of Gen-Zers?
              <div className="seperator" />
              <a href="https://www.figma.com/design/iRwhq0w4NT9zuXu6B2jSnr/Iterative-Design?node-id=724-999&t=RGIXh9TZEBI2kvla-1" target="_blank">
                <span className="app-link bold">Figma Design</span>
              </a>
              <span className="vert-bar">
                {" | "}
              </span>
              <a href="https://www.loom.com/share/8862788a2cf540b5a9a351cbbc9ca51e" target="_blank">
                <span className="app-link bold">Loom Walkthrough</span>
              </a>
              <span className="vert-bar">
                {" | "}
              </span>
              <span className="bold">Technologies used:</span> Figma, Photoshop, <a href="https://app.prodia.com/" target="_blank"><span className="app-link bold">Prodia AI</span>
              </a>, Loom
            </p>
            <div className="img-container">
              <img
                src="/case-study-3/artists-corner-overview.png"
                alt="Artist's Corner PVD website displayed on desktop"
              />
            </div>
          </div>
          <div className="pain-points">
            <h2>Pain Points</h2>
            <ul>
              <li>
                <p><span className="bold">Gamification:</span> We were on a tight deadline, so to maximize output I intitiated a feedback loop where team members critiqued each other's work. This allowed us to iteratively improve while still conserving time and resources.</p>
              </li>
              <li>
                <p><span className="bold">Appealing to Younger Audiences:</span> Using MongoDB Atlas, AWS, and lots of YouTube videos,
                  I designed a cloud database to accelerate and simplify how we stored data. I also used MQL (similar to SQL) to create data query functions for our front-end.</p>
              </li>
              <li>
                <p><span className="bold">Defending Design Choices:</span> Our team changed the layout of the storefront to adhere to design principles and scan patterns. The clients were initally hesitant, and we had to defend our design choices to demonstrate how they increased usability.</p>
              </li>
            </ul>
          </div>
          <div className="video-container">
            <video
              src="/case-study-3/artists-corner-screen.mp4"
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
                  <span className="bold">Iterative Design:</span> {" "}
                  Iterating through rounds of design and feedback{" "}
                  <span className="bold">helps maximize client satisfaction</span>.
                </p>
              </li>
              <li>
                <p>
                  <span className="bold">Platform Inspiration:</span> When a client doesn't know what direction to take their
                  design,{" "}
                  <span className="bold">
                    ask for platforms whose UI they admire!
                  </span>
                  {" "} We as designers can use these platforms to draw inspiration.</p>
              </li>
              <li>
                <p>
                  <span className="bold">Team Collaboration:</span> Designing in a team{" "}
              <span className="bold">generates innovative solutions</span> and
              introduces ideas I wouldn't have thought of on my own. It also
              creates a <span className="bold">more user-centered design</span>,
              because everyone offers a diverse perspective.
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

export default CaseStudy3;
