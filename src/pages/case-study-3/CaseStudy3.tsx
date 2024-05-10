import Footer from "../../components/Footer";
import "./case-study-3.css";

function CaseStudy2() {
  return (
    <div className="case-study-3">
      <div className="title-block">
        <h1>Artist's Corner PVD</h1>
        <img
          src="/case-study-3/skew-carousel.png"
          alt="Examples of MongoDB item objects"
        />
      </div>
      <div className="study">
        <div className="sticky-quick-links">
          <div className="quick-links">
            <a href="#overview">
              <h5>Overview</h5>
            </a>
            <a href="#problem">
              <h5>Problem</h5>
            </a>
            <a href="#research">
              <h5>Research</h5>
            </a>
            <a href="#process">
              <h5>Process</h5>
            </a>
            <a href="#takeaways">
              <h5>Takeaways</h5>
            </a>
          </div>
        </div>

        <div className="main">
          <h2 id="overview" style={{ marginTop: "-0.75rem" }}>
            Overview
          </h2>
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
                Frontend Engineers)
              </p>
            </div>
            <div className="skills">
              <h3>Skills</h3>
              <div className="all-skills">
                <div className="skill">
                  <p>MongoDB</p>
                </div>
                <div className="skill">
                  <p>Algorithms</p>
                </div>
                <div className="skill">
                  <p>Typescript/React</p>
                </div>
              </div>
            </div>
          </div>
          <div className="overview">
            <p>
            Every fall and spring, Brown and RISD students look forward to the seasonal markets and fairs
            to buy and sell art. Outside of these spaces, there is <span className="bold">no school-sanctioned platform for students to 
            sell their creations</span>. Some students post listings on their Instagram, but these can get
            buried in people's feeds. Additonally, students might not feel comfortable sharing their work on social media.
            </p>  
              
              <p><a
                href="https://artistscornerpvd.github.io/"
                target="_blank"
              >
                <span className="app-link bold">Artist's Corner PVD</span>
              </a>{" "}
              is a <span className="bold">website for Brown and RISD students to sell their crafts and handmade goods</span> all year round. Only artists with an authorized school email can create listings, so students can trust the seller.  
            </p>

            <p>
              We wanted to create a safe, designated environment to <span className="bold">connect student artists and art lovers</span>. Artist's Corner <span className="bold">creates a sense of community</span> within the art scene in PVD and encourages students to <span className="bold">turn hobbies into a small business</span>! 
            </p>

            <div className="img-container">
              <img
                src="/case-study-3/artists-corner-overview.png"
                alt="Artist's Corner PVD home page displayed on computer"
              />
            </div>
          </div>

          <h2 id="problem">Problem</h2>
          <div className="problem">
            <div className="row">
                <h3>Problem</h3>
                <p>No school-sanctioned platform for Brown and RISD students to sell their crafts and handmade goods outside of seasonal markets and fairs</p>
            </div>
            <div className="row">
                <h3>Objective</h3>
                <p>Create a safe environment to connect student artists and art lovers</p>
            </div>
            <div className="row">
                <h3>Outcome</h3>
                <p style={{paddingTop:"0.75rem"}}><span className="bold">1,200+</span> potential users</p>
            </div>
          </div>

          <h2 id="research">Research</h2>
          <div className="research">
            <p>
              The CEO and CTO knew they wanted a fresh new look. They wanted to{" "}
              <span className="bold">
                gamify their storefront and make it more visually focused
              </span>
              , but weren't exactly sure how to do that.
            </p>
            <p>
              We drew inspiration from social media and other online ordering
              platforms:{" "}
            </p>
            <div className="img-container">
              <img
                src="/case-study-3/company-logos.png"
                alt="Doordash, Grubhub, TikTok logos for inspiration"
              />
            </div>
            <p>
              After collective ideation, we thought of two ideas to incorporate
              into our designs:
              <ul>
                <li>
                  <span className="bold">Video carousel</span> to entice users
                  to try featured items
                </li>
                <li>
                  <span className="bold">Meal plate with badges</span> to
                  motivate users to buy different food items and "collect them
                  all"
                </li>
              </ul>
            </p>
          </div>

          <h2 id="process">Process</h2>
          <div className="process">
            <div className="img-container">
              <img
                src="/case-study-3/timeline.png"
                alt="Process timeline with design, AI generating images, photoshopping images,coding web app, and inserting animation as steps "
              />
            </div>
            <h3>Sketching</h3>
            <p>Below are my sketches for mobile and desktop.</p>
            <div className="img-container" style={{ marginLeft: "-1rem" }}>
              <img
                src="/case-study-3/final-sketches.png"
                alt="Sketches of mobile and desktop designs for Mi Fonda storefront"
              />
              <p>Fig 1. Left: Mobile sketches; Right: Desktop Sketches</p>
            </div>

            <h3>Low-fi Wireframes + Feedback</h3>
            <p>
              {" "}
              I worked on desktop low-fidelity wireframes for my team. I also
              created Looms after each iteration for feedback from the founders.
            </p>
            <div className="img-container">
              <img
                src="/case-study-3/design-1.png"
                alt="Initial low-fi wireframes"
              />
            </div>

            <div className="img-container">
              <img
                src="/case-study-3/design-3.png"
                alt="Low-fi wireframes after first round feedback"
              />
            </div>

            <h3 style={{ marginTop: "4rem" }}>Hi-Fi Prototypes + Feedback</h3>
            <p>
              For high-fidelity prototypes, I switched over to mobile. Again, I
              created the Loom for our team to receive feedback.
            </p>
            <div className="video-container">
              <video
                src="/case-study-3/design-3.mp4"
                typeof="video/mp4"
                controls
                autoPlay
                muted
              >
                Your browser does not support the video tag.
              </video>
            </div>
            <br />
            <br />
            <div className="video-container" style={{ marginTop: "-3.5rem" }}>
              <video
                src="/case-study-3/design-4.mp4"
                typeof="video/mp4"
                controls
                autoPlay
                muted
              >
                Your browser does not support the video tag.
              </video>
            </div>

            <h3 style={{ marginTop: "4rem" }}>Presenting to Founders</h3>
            <p>
              After countless emails and Loom interactions, we got to meet the
              company CEO and CTO and present our high-fidelity prototypes via
              Zoom! We walked them through our mobile and desktop designs and
              explained our intentions behind certain features.
            </p>
          </div>

          <h2 id="takeaways">Takeaways</h2>
          <div className="takeaways">
            <h3>1. Iterative Design</h3>
            <p>
              Iterating through rounds of design and feedback{" "}
              <span className="bold">helps maximize client satisfaction</span>.
            </p>
            <h3>3. Platform Inspiration</h3>
            <p>
              Tip: When a client doesn't know what direction to take their
              design,{" "}
              <span className="bold">
                asking for platforms whose UI they admire
              </span>{" "}
              is a great place to start! We as designers can use these platforms
              to draw inspiration.
            </p>
            <h3>3. Team Collaboration</h3>
            <p>
              Designing in a team{" "}
              <span className="bold">generates more innovative solutions</span>{" "}
              and introduces ideas I couldn't have thought of on my own. It also
              creates a more <span className="bold">user-centered design</span>,
              because everyone offers a diverse perspective.
            </p>
          </div>

          <div className="thanks">
            <p>
              Thank you reading till the end! This project was especially
              grueling yet rewarding, so I appreciate it!
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default CaseStudy2;
