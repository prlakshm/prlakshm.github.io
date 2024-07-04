import { useEffect, useRef } from "react";
import Footer from "../../components/Footer.js";
import "./about.css";
import EmailEmbed from "../../components/EmailEmbed.js";

function About() {
  const waterElementRef = useRef<HTMLDivElement>(null);
  const waterElement2Ref = useRef<HTMLDivElement>(null);
  const calenderRef = useRef<HTMLDivElement>(null);

  const sizes = [
    [2, 2],
    [5, 5],
    [7, 7],
    [4, 4],
    [8, 8]
  ];

  //get random position between 1 - 100;
  function randomPosition(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  const size = sizes[Math.floor(Math.random() * sizes.length)]; // Select random size from sizes array

  // This will run once when the component mounts scroll to top page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    // Reapply the SVG filter when the component mounts
    if (waterElementRef.current) {
      waterElementRef.current.style.filter = "url(#turbulence)";
    }
    if (waterElement2Ref.current) {
      waterElement2Ref.current.style.filter = "url(#turbulence2)";
    }
  }, []);


  return (
    <div className="about">
      <div className="about-page">
      {[...Array(110)].map((_, index) => {
         // Randomly select size from sizes array
         const sizeIndex = Math.floor(Math.random() * sizes.length);
         let [height, width] = sizes[sizeIndex];
          // Determine if it's a jumbo star
          if (index < 10) {
            [height, width] = [17, 15]; // Jumbo size
          } 
        let starClass = "star1"; // Default to star1, adjust as needed
        if (index > 20 && index <= 40) starClass = "star2";
        else if (index > 40 && index <= 60) starClass = "star3";
        else if (index > 60 && index <= 80) starClass = "star4";
        else if (index > 80 && index <= 100) starClass = "star5";

        return (
          <div
            key={index}
            className={`star ${starClass}`}
            style={{
              top: `${randomPosition(1, 82)}%`,
              left: `${randomPosition(1, 98)}%`,
              height: `${height}px`,
              width: `${width}px`, // Ensure both height and width are the same
            }}
          ></div>
        );
      })}
        <div className="water" ref={waterElementRef}></div>
        <div className="main">
        <h1>About Me</h1>
          <div className="about-me">
            <div className="text">
            <p>
              Hi 👋 I'm Pranavi, a junior at Brown University
              studying computer science under the AI/ML and design pathways.
            </p>
            <p>
              I'm from Virginia and love all the trees there🌲 A fun fact about
              me is that I have a twin sister!
            </p>
            <p>
              Outside of CS, I love screenwriting, watching movies🎬, and cooking dinners with my friends! 
            </p>
            <p>
              Thanks for coming on this journey with me 🥳 Feel free to reach out. I'd love to chat!
            </p>
            </div>
          <div className="photo"><img src="./about/profile-photo.png" /></div>
          </div>
        </div>
        </div>
        <div className="calendar-page" ref={calenderRef}>
        <div className="water-full"></div>
        <div className="water-full-mask" ref={waterElement2Ref}></div>
        <div className="calender"><EmailEmbed /></div>
        <Footer />
      </div>
      <svg>
        <filter id="turbulence" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            id="sea-filter"
            numOctaves="3"
            seed="2"
            baseFrequency="0.05 0.1"
          ></feTurbulence>
          <feDisplacementMap scale="8" in="SourceGraphic"></feDisplacementMap>
          <animate
            xlinkHref="#sea-filter"
            attributeName="baseFrequency"
            dur="150s"
            keyTimes="0;0.5;1"
            values="0.01 0.05;0.03 0.09;0.01 0.05"
            repeatCount="indefinite"
          />
        </filter>
        <filter id="turbulence2" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            id="sea-filter2"
            numOctaves="3"
            seed="2"
            baseFrequency="0.05 0.1"
          ></feTurbulence>
          <feDisplacementMap scale="12" in="SourceGraphic"></feDisplacementMap>
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

export default About;
