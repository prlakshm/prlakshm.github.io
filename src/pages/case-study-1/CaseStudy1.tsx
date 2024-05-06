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
          <h2 style={{marginTop:"-0.75rem"}}>Overview</h2>
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
            purposes of aggregating items in cart and checkout. I wanted to
            explore different ways an online ordering platform can use
            <span className="bold"> interaction and animation to engage users</span> in the purchase
            experience.
          </p>
          </div>

          <h2>Research</h2>
          <div className="research">
            <p>To learn how to sucessfully build an online ordering platform, I researched popular companies. In a <span className="bold"> competetive analysis</span>, I examined
                the pros and cons of their cart aggregators and shopping UX. 
            </p>
            <img src="/case-study-1/company-logos.png" alt="Amazon, Etsy, and Sephora logos for competitive analysis summary"/>
            <p>Best features to include:
            <ul>
                <li>Sorting functionality (by price low to high, by name A to Z)</li>
                <li>Filtering functionality (by category of item)</li>
                <li>Reset option (to reset sort and filter)</li>
                <li>One-click remove (can remove items from cart individually and all at once)</li>
            </ul>
            </p>
          </div>
    
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default CaseStudy1;
