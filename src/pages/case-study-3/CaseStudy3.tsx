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
            <a href="#pm-role">
              <h5>PM Role</h5>
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
              Every fall and spring, Brown and RISD students look forward to the
              seasonal markets and fairs to buy and sell art. Outside of these
              spaces, there is{" "}
              <span className="bold">
                no school-sanctioned platform for students to sell their
                creations
              </span>
              . Some students post listings on their Instagram, but these can
              get buried in people's feeds. Additonally, students might not feel
              comfortable sharing their work on social media.
            </p>

            <p>
              <a href="https://artistscornerpvd.github.io/" target="_blank">
                <span className="app-link bold">Artist's Corner PVD</span>
              </a>{" "}
              is a{" "}
              <span className="bold">
                website for Brown and RISD students to sell their crafts and
                handmade goods
              </span>{" "}
              all year round. Only artists with an authorized school email can
              create listings, so students can trust the seller.
            </p>

            <p>
              We wanted to create a safe, designated environment to{" "}
              <span className="bold">
                connect student artists and art lovers
              </span>
              . Artist's Corner{" "}
              <span className="bold">creates a sense of community</span> within
              the art scene in PVD and encourages students to{" "}
              <span className="bold">turn hobbies into a small business</span>!
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
              <p>
                No school-sanctioned platform for Brown and RISD students to
                sell their crafts and handmade goods outside of seasonal markets
                and fairs
              </p>
            </div>
            <div className="row">
              <h3>Objective</h3>
              <p>
                Create a safe environment to connect student artists and art
                lovers
              </p>
            </div>
            <div className="row">
              <h3>Outcome</h3>
              <p style={{ paddingTop: "0.75rem" }}>
                <span className="bold">1,200+</span> potential users
              </p>
            </div>
          </div>

          <h2 id="research">Research</h2>
          <div className="research">
            <p>
              Our main inspiration was Etsy, an existing platform for artists to
              sell their goods. We styled our webpage layout based on popular
              consignment sites so that users would be familiar using the
              interface.
            </p>
            <div className="img-container">
              <img
                src="/case-study-3/company-logo.png"
                alt="Etsy for inspiration"
              />
            </div>
            <p>
              Layout initiatives:
              <ul>
                <li>Search bar and navigation on top</li>
                <li>Grid of item cards</li>
                <li>Filter categories on panel left of grid</li>
                <li>
                  Sort options (by price and recent listing) as drop-down on top
                  of grid
                </li>
              </ul>
            </p>
          </div>

          <h2 id="pm-role">PM Role</h2>
          <div className="pm-role">
            <p>
              As PM, I reported our team's progress to our supervisor and was
              spokesperson for our team. Some ways I supported my teammates:
              <ul>
                <li>
                  Organizing team meetings and making sure we were on track to
                  meet deadlines
                </li>
                <li>
                  Providing feedback on designs after each iteration and
                  approving final designs
                </li>
                <li>Solving nasty frontend bugs</li>
              </ul>
            </p>
          </div>

          <h2 id="process">Process</h2>
          <div className="process">
            <div className="img-container">
              <img
                src="/case-study-3/timeline.png"
                alt="Process timeline with collecting data, connecting to MongoDB, implementing sort and filter algorithms, implementing search algorithm "
              />
            </div>
            <h3>Collecting Data</h3>
            <p>
              I DMed student artists on Instagram to ask if we could use photos
              of their work as examples in our website!
            </p>
            <div className="img-container" style={{ marginLeft: "-1rem" }}>
              <img
                src="/case-study-3/example-creations.png"
                alt="Sketches of mobile and desktop designs for Mi Fonda storefront"
              />
              <p>
                Fig 1. Left: Emily Wang's amazing crochet creations; Right:
                Sophia Cheng's gorgeous handmade jewelry
              </p>
            </div>

            <h3>MongoDB</h3>
            <p>
              Using a combination of photos from student artists I reached out
              to and stock images, I{" "}
              <span className="bold">created mock data</span> of accounts,
              current item listings, and sold item listings. I then{" "}
              <span className="bold">set up a MongoDB database</span> to store
              this data.
            </p>
            <div className="img-container screenshot">
              <img
                src="/case-study-3/mongo-db.png"
                alt="MongoDB Compass Portal"
              />
              <p>Fig 2. MongoDB Compass Portal</p>
            </div>

            <p>
              I <span className="bold">coded query functions</span> for the
              website to retreive the data from the frontend (get items by
              category, subcategory, seller, etc.). I heavily comment my code so
              that my teammates and future developers can understand my work.{" "}
              <span className="bold">40% of my code is comments!</span>
            </p>
            <div className="img-container screenshot">
              <img
                src="/case-study-3/mongo-code.png"
                alt="Screenshot of code with comments"
              />
              <p>Fig 3. My code with comments</p>
            </div>

            <h3 style={{ marginTop: "2rem" }}>Sort/Filter Algorithm</h3>
            <p>
              For the category page, I implemented sort and filter options. I
              needed sort and filter to be{" "}
              <span className="bold">
                stackable with the ability to reset
              </span>
              . Users can sort by price, sort by listing recency, and filter by
              subcategory. 
            </p>
            <div className="video-container">
              <video
                src="/case-study-3/sort-filter.mp4"
                typeof="video/mp4"
                controls
                autoPlay
                muted
              >
                Your browser does not support the video tag.
              </video>
            </div>

            <h3 style={{ marginTop: "4rem" }}>Search Algorithm</h3>
            <p>
              Implementing the search algorithm was the hardest, because there was <span className="bold">no "typical behavior" to follow for search results order</span>. 
              I <span className="bold">increased algorithm complexity incrementally</span> until I was happy with the results. 
            </p>
          </div>

          <h2 id="takeaways">Takeaways</h2>
          <div className="takeaways">
            <h3>1. Scalable Database</h3>
            <p>
              Storing account and item information in a MongoDB database{" "}
              <span className="bold">ensures the data stays secure</span>. Data
              can be scaled, meaning even when data is added (the website gets
              more users) the system still runs smoothly. For retreiving items,{" "}
              <span className="bold">
                queries can still be quick and efficient
              </span>
              .
            </p>
            <h3>2. Prioritizing for Deadlines</h3>
            <p>
              As the deadline approached, I knew we couldn't do{" "}
              <span className="italic">everything</span>. There were features we
              hadn't implemented and planned to, like integreting Google OAuth
              for login. I{" "}
              <span className="bold">
                prioritized optimizing existing features instead of adding new
                ones
              </span>
              . Limiting the scope was better than delivering a half-baked
              product.
            </p>
          </div>

          <div className="thanks">
            <p>
              This project is my pride and joy, so thank you reading! Remember
              to check out our website at{" "}
              <a href="https://artistscornerpvd.github.io/" target="_blank">
                <span className="app-link bold">Artist's Corner PVD</span>
              </a>
              !
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default CaseStudy2;
