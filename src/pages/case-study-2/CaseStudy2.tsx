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
          <h2 id="overview" style={{ marginTop: "-0.75rem" }}>Overview</h2>
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
              <p >Jackie Cohen, Anna Wang, Brooke Wangenheim (All Designers)</p>
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
              </a> is a <span className="bold">tech startup/all-in-one platform</span> that helps restaurants manage and market their online presence. They consolidate ordering apps through partnerships with UberEats, GrubHub, DoorDash, etc. 
              to decrease third-party fees and increase profit. 
            </p>
            <p>Our team's job was to <span className="bold">redesign the storefront page for mobile and desktop</span> to attract the next generation of users. And who better to do this than a group of Gen Zers?</p>
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
              The CEO and CTO knew they wanted a fresh new look. They wanted to <span className="bold">gamify their storefront and make it more visually focused</span>, but weren't exactly sure how to do that.  
            </p>
            <p>We drew inspiration from social media and other online ordering platforms: </p>
            <div className="img-container">
              <img
                src="/case-study-2/company-logos.png"
                alt="Doordash, Grubhub, TikTok logos for inspiration"
              />
            </div>
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
            <p>
              Below are my sketches for mobile and desktop.
            </p>
            <div className="img-container" style={{marginLeft:"-1rem"}}>
              <img
                src="/case-study-2/final-sketches.png"
                alt="Sketches of mobile and desktop designs for Mi Fonda storefront"
              />
              <p>Fig 1. Left: Mobile sketches; Right: Desktop Sketches</p>
            </div>

            <h3>
              Low-fi Wireframes + Feedback
            </h3>
            <p>
              <span className="bold">Problem:</span> I needed my sandwitch
              ingrediant images to all be the same illustration aesthetic, but
              this was hard to find with stock photos.
              <br />
              <span className="bold">Solution:</span> I used Prodia AI, an
              online image generator, to generate images with the same style!
            </p>
            <p>
              <span className="bold">Problem:</span> The AI sometimes generated
              images with gibberour of erranoues features. <br />
              <span className="bold">Solution:</span> Photoshop to the rescue!
            </p>
            <p>
              Below are my AI generated images before and after editing with
              Photoshop.
            </p>
            <div className="img-container">
              <img
                src="/case-study-2/ai-ps-images.png"
                alt="AI generated images before and after editing with Photoshop"
                style={{ margin: "2rem 0" }}
              />
            </div>

            <h3>Hi-Fi Prototypes + Feedback</h3>
            <p>
              While coding the web app, I implemented a cart aggregator as well
              as sort and filter functionality from the competitive analysis
              best features list. In the end, I had to{" "}
              <span className="bold">
                adjust colors to increase contrast and accessiblity
              </span>
              .
            </p>
            <div className="img-container">
              <img
                src="/case-study-2/style-guide.png"
                alt="AI generated images before and after editing with Photoshop"
              />
            </div>

            <h3>Presenting to Founders</h3>
            <p>
              Animations:
              <ul>
                <li>Item card tilts when hovered</li>
                <li>Ingrediants "fall" on sandwitch when added to cart</li>
              </ul>
              These visual displays entince users to interact with the interface
              and keep shopping. The{" "}
              <span className="bold">
                challenge was to make the animation responsive
              </span>{" "}
              so that all the ingrediants line up on different screens.
            </p>
            <div className="video-container">
              <video
                src="/case-study-2/responsive-screens.mp4"
                typeof="video/mp4"
                controls
                autoPlay
                muted
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>

          <h2 id="takeaways">Takeaways</h2>
          <div className="takeaways">
            <h3>1. Iterative Design</h3>
            <p>
             Iterating through rounds of design and feedback <span className="bold">helps maximize client satisfaction</span>.
            </p>
            <h3>2. Platform Inspiration</h3>
            <p>Tip: When a client doesn't know what direction to take their design, <span className="bold">asking for platforms whose UI they admire</span> is a great place to start! We as designers can use these platforms to draw inspiration.</p>
            <h3>3. Team Collaboration</h3>
            <p>
              Designing in a team <span className="bold">generates more innovative solutions</span> and introduces ideas I couldn't have thought of on my own.  It also creates a more <span className="bold">user-centered design</span>, because everyone offers a diverse perspective.
            </p>
          </div>

          <div className="thanks">
            <p>
              Thank you reading till the end! This project was especially grueling yet rewarding, so I appreciate it!
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default CaseStudy2;
