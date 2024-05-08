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
              To learn how to sucessfully build an online ordering platform, I
              researched popular companies. In a{" "}
              <span className="bold"> competetive analysis</span>, I examined
              the pros and cons of their cart aggregators and shopping UX.
            </p>
            <div className="img-container">
              <img
                src="/case-study-2/company-logos.png"
                alt="Amazon, Etsy, and Sephora logos for competitive analysis summary"
              />
            </div>
            <p>
              Best features to include:
              <ul>
                <li>
                  Sorting functionality (sort items by price low to high, by
                  name A to Z)
                </li>
                <li>Filtering functionality (filter items by category)</li>
                <li>Reset option (to reset sort and filter)</li>
                <li>
                  One-click remove (can remove items from cart individually and
                  all at once)
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
            <h3>Design</h3>
            <p>
              Below is my final sketch for my web app. I based the visual design
              off of a mock-website I made called{" "}
              <a href="https://blueno-bakery.vercel.app/" target="_blank">
                <span className="app-link bold">Blueno's Bakery</span>
              </a>
              !
            </p>
            <div className="img-container">
              <img
                src="/case-study-2/design-inspo.png"
                alt="Final sketch and Blueno's Bakery website I used as inspiration for my web app"
              />
            </div>

            <h3>
              AI Generating Images with Prodia + Editing Images with Photoshop
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

            <h3>Coding Web App</h3>
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

            <h3>Inserting Animation</h3>
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
            <h3>1. Accessibility</h3>
            <p>
              {" "}
              Animation <span className="bold">
                should be used sparingly
              </span>{" "}
              because they could distract users or not be accessibile. However,
              when used thoughtfully, they can increase accessibility and serve
              as an{" "}
              <span className="bold">
                additional way to notify users of updates to the system
              </span>
              .{" "}
            </p>
            <p>
              For example:
              <ul>
                <li>Item card tilting notifies users item was selected</li>
                <li>
                  Ingrediants "falling" on sandwitch notifies users item was
                  added to order
                </li>
              </ul>
            </p>
            <h3>2. AI Generated Images</h3>
            <p>
              AI generating images for software development can{" "}
              <span className="bold">save money and resources</span>. Though
              they can be{" "}
              <span className="bold">tedious to edit with Photoshop</span>,
              their main benefit is creating images with consistent styles.
              Overall, using AI generated images can help{" "}
              <span className="bold">
                create a unified visual identity for a website
              </span>
              .
            </p>
          </div>

          <div className="thanks">
            <p>
              If you've made it this far, thanks for coming along on this
              journey! Now go and build your own sandwitch!
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default CaseStudy2;
