import { useEffect, useState } from "react";
import "../app.css";
import useScrollDirection from "../hooks/useScrollDirection.js";
import { useNavigate } from "react-router-dom";

function Header() {
  const scrollDirection = useScrollDirection();
  const [headerClass, setHeaderClass] = useState('visible-transparent');
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 600);

  const handleLinkClick = (hash: string) => {
    navigate(hash);
    window.location.hash = hash;
    setIsMenuOpen(false); // Close the menu after clicking a link
  };

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    setHeaderClass('visible-transparent');

    const handleResize = () => {
      setIsMobile(window.innerWidth <= 600);
    };

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
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, [scrollDirection]);

  return (
    <div className={`header ${headerClass}`}>
      <div className="left">
        <a href="" onClick={() => handleLinkClick('')} title="Go Back Home!">
          <img
            src="./icons/punch-holes-favicon-inverted.png"
            alt="P.L. Home icon takes you back to landing page when clicked"
          />
        </a>
      </div>
      {isMobile ? (
        <div className="menu-icon" onClick={handleMenuToggle}>
          <img src="./icons/menu-icon.svg" alt="Menu" />
        </div>
      ) : (
        <div className="right">
          <a href="/#projects" onClick={() => handleLinkClick('#projects')}>
            Work
          </a>
          <a href="#/fun" onClick={() => handleLinkClick('#fun')}>
            Fun
          </a>
          <a href="#/about" onClick={() => handleLinkClick('#about')}>
            About
          </a>
          <a
            href="/docs/Pranavi Lakshminarayanan Resume 2026.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            Resume
          </a>
        </div>
      )}
      {isMenuOpen && isMobile && (
        <div className="dropdown-menu">
          <a href="/#projects" onClick={() => handleLinkClick('#projects')}>
            Work
          </a>
          <a href="#/fun" onClick={() => handleLinkClick('#fun')}>
            Fun
          </a>
          <a href="#/about" onClick={() => handleLinkClick('#about')}>
            About
          </a>
          <a
            href="/docs/Pranavi Lakshminarayanan New Grad 2026 Resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            Resume
          </a>
        </div>
      )}
    </div>
  );
}

export default Header;
