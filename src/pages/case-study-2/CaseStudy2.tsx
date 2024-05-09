import Footer from "../../components/Footer";
import "./case-study-2.css";

function CaseStudy2() {
  return (
    <div className="case-study-2">
      <div className="title-block">
        <h1>Mi Fonda Storefront</h1>
        <img
          src="/case-study-2/skew-carousel.png"
          alt="Examples of sandwitch item cards from web app"
        />
      </div>
      <div className="study">
        <div className="sticky-quick-links">
          <div className="quick-links">
            <a href="#overview">
              <h5>Overview</h5>
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
              <p>Designer</p>
            </div>
            <div className="timeline">
              <h3>Timeline</h3>
              <p>May 2024</p>
            </div>
            <div className="team">
              <h3>Team</h3>
              <p>Jackie Cohen, Anna Wang, Brooke Wangenheim (All Designers)</p>
            </div>
            <div className="skills">
              <h3>Skills</h3>
              <div className="all-skills">
                <div className="skill">
                  <p>Figma</p>
                </div>
                <div className="skill">
                  <p>UI/UX Design</p>
                </div>
              </div>
            </div>
          </div>
          <div className="overview">
            <p>
              <a href="https://mifonda.io/" target="_blank">
                <span className="app-link bold">Mi Fonda</span>
              </a>{" "}
              is a{" "}
              <span className="bold">tech startup/all-in-one platform</span>{" "}
              that helps restaurants manage and market their online presence.
              They consolidate ordering apps through partnerships with UberEats,
              GrubHub, DoorDash, etc. to decrease third-party fees and increase
              profit.
            </p>
            <p>
              Our team's job was to{" "}
              <span className="bold">
                redesign the storefront page for mobile and desktop
              </span>{" "}
              to attract the next generation of users. And who better to do this
              than a group of Gen Zers?
            </p>
            <div className="img-container">
              <img
                src="/case-study-2/mi-fonda-overview.png"
                alt="Mi Fonda Storefront designs displayed on phones"
              />
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
                src="/case-study-2/company-logos.png"
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
                src="/case-study-2/timeline.png"
                alt="Process timeline with design, AI generating images, photoshopping images,coding web app, and inserting animation as steps "
              />
            </div>
            <h3>Sketching</h3>
            <p>Below are my sketches for mobile and desktop.</p>
            <div className="img-container" style={{ marginLeft: "-1rem" }}>
              <img
                src="/case-study-2/final-sketches.png"
                alt="Sketches of mobile and desktop designs for Mi Fonda storefront"
              />
              <p>Fig 1. Left: Mobile sketches; Right: Desktop Sketches</p>
            </div>

            <h3>Low-fi Wireframes + Feedback</h3>
            <p> I worked on desktop low-fidelity wireframes for my team. I also created Looms after each iteration for feedback from the founders.</p>
            <div className="img-container">
              <img
                src="/case-study-2/design-1.png"
                alt="Initial low-fi wireframes"
              />
            </div>

            <div className="img-container">
              <img
                src="/case-study-2/design-2.png"
                alt="Low-fi wireframes after first round feedback"
              />
            </div>

            <h3 style={{marginTop:"4rem"}}>Hi-Fi Prototypes + Feedback</h3>
            <p>For high-fidelity prototypes, I switched over to mobile. Again, I created the Loom for our team to receive feedback.</p>
            <div className="video-container">
              <video
                src="/case-study-2/design-3.mp4"
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
            <div className="video-container" style={{marginTop:"-2.5rem"}}>
              <video
                src="/case-study-2/design-4.mp4"
                typeof="video/mp4"
                controls
                autoPlay
                muted
              >
                Your browser does not support the video tag.
              </video>
            </div>

            <h3 style={{marginTop:"4rem"}}>Presenting to Founders</h3>
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
            <h3>2. Platform Inspiration</h3>
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