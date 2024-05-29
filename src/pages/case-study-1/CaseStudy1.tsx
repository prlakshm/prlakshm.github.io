import { RefObject, useEffect, useRef } from "react";
import Footer from "../../components/Footer";
import "./case-study-1.css";

function CaseStudy1() {
  // This will run once when the component mounts scroll to top page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const overviewRef = useRef<HTMLDivElement>(null);
  const researchRef = useRef<HTMLDivElement>(null);
  const processRef = useRef<HTMLDivElement>(null);
  const takeawaysRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (ref: RefObject<HTMLDivElement>, offset = -137) => {
    if (ref.current) {
      const elementTop =
        ref.current.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementTop + offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="case-study-1">
      <div className="title-block">
        <h1>PB&J Time</h1>
        <img
          src="/case-study-1/skew-carousel.png"
          alt="Examples of sandwitch item cards from web app"
        />
      </div>
      <div className="study">
        <div className="sticky-quick-links">
          <div className="quick-links">
            <h5 onClick={() => scrollToSection(overviewRef)}>Overview</h5>
            <h5 onClick={() => scrollToSection(researchRef)}>Research</h5>
            <h5 onClick={() => scrollToSection(processRef)}>Process</h5>
            <h5 onClick={() => scrollToSection(takeawaysRef)}>Takeaways</h5>
          </div>
        </div>

        <div className="main">
          <h2 ref={overviewRef} style={{ marginTop: "-0.75rem" }}>
            Overview
          </h2>
          <div className="overview-info">
            <div className="role">
              <h3>Role</h3>
              <p>Frontend Engineer</p>
            </div>
            <div className="timeline">
              <h3>Timeline</h3>
              <p>April 2024</p>
            </div>
            <div className="skills">
              <h3>Skills</h3>
              <div className="all-skills">
                <div className="skill">
                  <p>Prodia AI</p>
                </div>
                <div className="skill">
                  <p>Photoshop</p>
                </div>
                <div className="skill">
                  <p>Javascript/React</p>
                </div>
              </div>
            </div>
          </div>
          <div className="overview">
            <p>
              Many e-commerce websites only serve functionality purpose of
              aggregating items in a cart and checking out.{" "}
              <a href="https://sandwitch-builder.vercel.app/" target="_blank">
                <span className="app-link bold">PB&J Time</span>
              </a>{" "}
              is a gourmet sandwitch building app that explores different ways
              an online ordering platform can use
              <span className="bold">
                {" "}
                interaction and animation to engage users
              </span>{" "}
              in the purchasing experience.
            </p>
            <div className="img-container">
              <img
                src="/case-study-1/pbj-time-overview.png"
                alt="PB&J Time web app displayed on laptop"
              />
            </div>
          </div>

          <h2 ref={researchRef}>Research</h2>
          <div className="research">
            <p>
              To learn how to sucessfully build an online ordering platform, I
              researched popular companies. In a{" "}
              <span className="bold"> competitive analysis</span>, I examined
              the pros and cons of their cart aggregators and shopping UX.
            </p>
            <div className="img-container">
              <img
                src="/case-study-1/company-logos.png"
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

          <h2 ref={processRef}>Process</h2>
          <div className="process">
            <div className="img-container">
              <img
                src="/case-study-1/timeline.png"
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
                src="/case-study-1/design-inspo.png"
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
              images with gibberish or erroneous features. <br />
              <span className="bold">Solution:</span> Photoshop to the rescue!
            </p>
            <p>
              Below are my AI generated images before and after editing with
              Photoshop.
            </p>
            <div className="img-container">
              <img
                src="/case-study-1/ai-ps-images.png"
                alt="AI generated images before and after editing with Photoshop"
                style={{ margin: "2rem 0" }}
              />
            </div>

            <h3>Coding Web App</h3>
            <p>
              While coding the web app, I implemented the cart aggregator as
              well as sorting and filtering functionality from the competitive
              analysis best features list. In the end, I had to{" "}
              <span className="bold">
                adjust colors to increase contrast and accessiblity
              </span>
              .
            </p>
            <div className="img-container">
              <img
                src="/case-study-1/style-guide.png"
                alt="Style Guide Colors for PB&J Time with high contrast"
              />
            </div>

            <h3>Inserting Animation</h3>
            <p>
              Animations:
              <ul>
                <li>Item card tilts when hovered</li>
                <li>Ingrediants "fall" on sandwitch when added to cart</li>
              </ul>
              These visual displays entice users to interact with the interface
              and keep shopping. The{" "}
              <span className="bold">
                challenge was to make the animation responsive
              </span>{" "}
              so that all the ingrediants line up on different screens.
            </p>
            <div className="video-container">
              <video
                src="/case-study-1/responsive-screens.mp4"
                typeof="video/mp4"
                autoPlay
                muted
                loop
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>

          <h2 ref={takeawaysRef}>Takeaways</h2>
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
                <li>Item card tilting notifies users item is selected</li>
                <li>
                  Ingrediants "falling" on sandwitch notifies users item is
                  added to order
                </li>
              </ul>
            </p>
            <h3>2. AI Generated Images</h3>
            <p>
              AI generating images for software development can{" "}
              <span className="bold">save money and resources</span>. Though it
              can be{" "}
              <span className="bold">tedious to edit with Photoshop</span>, the
              benefit is creating images with consistent styles. Overall, using
              AI generated images can help{" "}
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

export default CaseStudy1;
