import { useEffect } from "react";
import "./home.css";

function Home() {

  useEffect(() => {
    // Reapply the SVG filter when the component mounts
    const waterElement = document.querySelector('.water');
    if (waterElement && waterElement instanceof HTMLElement) {
      waterElement.style.filter = 'url(#turbulence)';
    }
  }, []);

  return (
    <div className="home">
      <div className="water"></div>
      <div className="lilies plain1"></div>
      <div className="lilies plain2"></div>
      <div className="lilies plain3"></div>
      <div className="lilies plain4"></div>
      <div className="lilies plain5"></div>
      <svg>
        <filter id="turbulence" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            id="sea-filter"
            numOctaves="3"
            seed="2"
            baseFrequency="0.05 0.1"
          ></feTurbulence>
          <feDisplacementMap scale="10" in="SourceGraphic"></feDisplacementMap>
          <animate
            xlinkHref="#sea-filter"
            attributeName="baseFrequency"
            dur="100s"
            keyTimes="0;0.5;1"
            values="0.01 0.05;0.03 0.09;0.01 0.05"
            repeatCount="indefinite"
          />
        </filter>
      </svg>
    </div>
  );
}

export default Home;
