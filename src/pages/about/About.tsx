import { useEffect, useRef } from "react";
import Footer from "../../components/Footer.js";
import "./about.css";

function About() {

  // This will run once when the component mounts scroll to top page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);


  return (
    <div className="about">
        <div className="main">
        <h1 className="cutout-text">
        <span className="word">
          <span>A</span>
          <span style={{ transform: "translateY(-3px)" }}>B</span>
          <span>O</span>
          <span>U</span>
          <span>T</span>
        </span>
        {" "}
        <span className="word">
          <span>M</span>
          <span>E</span>
        </span>
      </h1>

          <div className="about-me">
              <p>
                I’m Pranavi 👋 , a product designer and multimedia artist at
                Brown University. I create worlds through computer
                interfaces, animations, screenplays, and more, telling stories
                both on the page and on the screen.
              </p>
              <p>
                I use computer science as a tool to engineer my ideas into
                existence. I want to bridge together technology 💻 and
                imagination 🌈 to immerse people in new experiences and venture
                toward an impossible future.
              </p>
              <p>
                I love watching movies (my top three are <i>Past Lives</i>,{" "}
                <i>Tangled</i>, and <i>Walking on Sunshine</i>), writing
                spinoffs of my favorite shows, and dancing terribly with my
                friends 💃.
              </p>
              <p>
                What movie did you watch recently? Let me know and
                reach out if you need anything 💌. Thanks for stopping by!
              </p>
            </div>
            <div className="image-row">
          <img src="/about/1.jpg" alt="Fun photo 1" />
          <img src="/about/2.jpg" alt="Fun photo 2" />
          <img src="/about/3.jpg" alt="Fun photo 3" />
          <img src="/about/4.jpg" alt="Fun photo 4" />
          <img src="/about/5.jpg" alt="Fun photo 5" />
          <img src="/about/6.jpg" alt="Fun photo 6" />
          <img src="/about/7.jpg" alt="Fun photo 7" />
          <img src="/about/8.jpg" alt="Fun photo 8" />
        </div>
      </div>
      <div>
    </div>
    </div>
  );
}

export default About;
