import Footer from "../../components/Footer";
import "./case-study-1.css";

function CaseStudy1() {
  return (
    <div className="case-study-1">
      <div className="title-block">
        <h1>Devlopment</h1>
        <img
          src="/case-study-1/skew-carousel.png"
          alt="Examples of sandwitch item cards from web app"
        />
      </div>
      <div className="study">
        <div className="quick-links">
          <h5>Overview</h5>
          <h5>Research</h5>
          <h5>Process</h5>
          <h5>Takeaways</h5>
        </div>
        <div className="main">
          <h2 style={{ marginTop: "-0.75rem" }}>Overview</h2>
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
              Many e-commerce websites are static and serve only functionality
              purposes of aggregating items in cart and checkout.{" "}
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
            <img
              src="/case-study-1/pbj-time-overview.png"
              alt="PB&J Time web app displayed on laptop"
            />
          </div>

          <h2>Research</h2>
          <div className="research">
            <p>
              To learn how to sucessfully build an online ordering platform, I
              researched popular companies. In a{" "}
              <span className="bold"> competetive analysis</span>, I examined
              the pros and cons of their cart aggregators and shopping UX.
            </p>
            <img
              src="/case-study-1/company-logos.png"
              alt="Amazon, Etsy, and Sephora logos for competitive analysis summary"
            />
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

          <h2>Process</h2>
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
            
            
            <h3>AI Generating Images with Prodia + Editing Images with Photoshop</h3>
            <p>
              <span className="bold">Problem:</span> I needed my sandwitch ingrediant images to all be the same illustration aesthetic, but this was hard to find with stock photos.<br/>
              <span className="bold">Solution:</span> I used Prodia AI, an online image generator, to generate images with the same style!
            </p>
            <p>
            <span className="bold">Problem:</span> The AI sometimes generated images with gibberour of erranoues features. <br/>
            <span className="bold">Solution:</span> Photoshop to the rescue!
            </p>
            <p>Below are my AI generated images before and after editing with Photoshop.</p>
            <div className="img-container">
            <img
                src="/case-study-1/ai-ps-images.png"
                alt="AI generated images before and after editing with Photoshop"
                style={{margin:"2rem 0"}}
              />
          </div>

          <h3>Coding Web App</h3>
          <p>While coding the web app, I implemented a cart aggregator as well as sort and filter functionality from the competitive analysis best features list. In the end, I had to <span className="bold">adjust colors to increase contrast and accessiblity</span>.</p>
          <div className="img-container">
            <img
                src="/case-study-1/style-guide.png"
                alt="AI generated images before and after editing with Photoshop"
              />
          </div>

          <h3>Inserting Animation</h3>
          <p>I added animation to show ingrediants "fall" on the sandwitch. This visual display entinces users to interact with the interface and keep shopping. The <span className="bold">challenge was to make the animation responsive</span> so that all the ingrediants line up on different screens.</p>
          <div className="img-container">
            <img
                src="/case-study-1/style-guide.png"
                alt="AI generated images before and after editing with Photoshop"
              />
          </div>
          </div>

          
          <h2></h2>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default CaseStudy1;
