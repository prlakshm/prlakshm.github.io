import { useEffect, useState } from "react";
import "../app.css";
import useScrollDirection from "../hooks/useScrollDirection.js";
import { useNavigate } from "react-router-dom";

function Header() {
  const scrollDirection = useScrollDirection();
  const [headerClass, setHeaderClass] = useState('visible-transparent');
  const navigate = useNavigate();

  const handleLinkClick = (hash : string) => {
    navigate(hash);
    // Ensure the hash change triggers the effect
    window.location.hash = hash;
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY;
      if (scrollDirection === "up") {
        if (scrollPos > 100) {
          setHeaderClass("visible-color");
        } else {
          setHeaderClass("visible-transparent");
        }
      } else if (scrollDirection === "down") {
        setHeaderClass("hidden");
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [scrollDirection]);


  return (
    <div className={`header ${headerClass}`}>
      <div className="left">
        <a href="/">
          <img
            src="./icons/favicon.png"
            alt="Home icon takes you back to landing page when clicked"
          />
        </a>
      </div>
      <div className="right">
      <a href="/" onClick={() => handleLinkClick('/')}>Home</a>
      <a href="/#projects" onClick={() => handleLinkClick('#projects')}>Projects</a>
      <a href="#/about" onClick={() => handleLinkClick('#/about')}>About</a>
        <a
          href="/docs/Pranavi_Resume_2024.pdf"
          target="_blank"
          rel="noopener noreferrer"
        >
          Resume
        </a>
      </div>
    </div>
  );
}

export default Header;
