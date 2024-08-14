import { useEffect, useState } from "react";
import "../app.css";
import useScrollDirection from "../hooks/useScrollDirection.js";
import useDarkMode from "../hooks/useDarkMode.js"
import { useNavigate } from "react-router-dom";

function Header() {
  const darkMode = useDarkMode();
  const scrollDirection = useScrollDirection();
  const [headerClass, setHeaderClass] = useState('visible-transparent');
  const navigate = useNavigate();

  const handleLinkClick = (hash : string) => {
    navigate(hash);
    // Ensure the hash change triggers the effect
    window.location.hash = hash;
  };

  useEffect(() => {
     // Ensure the header is visible on page load
     setHeaderClass('visible-transparent');
     
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
    <div className={`header ${darkMode ? 'dark-mode' : ''} ${headerClass}`}>
      <div className="left">
        <a href="/" onClick={() => handleLinkClick('/')}>
          <img
            src={darkMode? "./icons/favicon-light.svg" : "./icons/favicon.svg"}
            alt="Home icon takes you back to landing page when clicked"
          />
        </a>
      </div>
      <div className="right">
      <a href="/#projects" onClick={() => handleLinkClick('#projects')}>Work</a>
      <a href="#/fun" onClick={() => handleLinkClick('#fun')}>Fun</a>
      <a href="#/about" onClick={() => handleLinkClick('#/about')}>About</a>
        <a
          href="/docs/Pranavi_Lakshminarayanan_Resume_2024.pdf"
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
