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
    setIsMenuOpen((isOpen) => !isOpen);
  };

  useEffect(() => {
    setHeaderClass('visible-transparent');

    const handleResize = () => {
      const mobile = window.innerWidth <= 600;
      setIsMobile(mobile);
      if (!mobile) setIsMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
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
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
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
        <button
          type="button"
          className="menu-icon"
          onClick={handleMenuToggle}
          aria-label={isMenuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-navigation"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 220 170"
            className="icon"
            aria-hidden="true"
            focusable="false"
          >
            <line
              x1="210"
              y1="85"
              x2="10"
              y2="85"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="20"
            />
            <line
              x1="210"
              y1="10"
              x2="10"
              y2="10"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="20"
            />
            <line
              x1="10"
              y1="160"
              x2="210"
              y2="160"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="20"
            />
          </svg>
        </button>

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
            href="/docs/Pranavi_Lakshminarayanan_AI_Product_Resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            Resume
          </a>
        </div>
      )}
      {isMenuOpen && isMobile && (
        <nav
          id="mobile-navigation"
          className="dropdown-menu"
          aria-label="Mobile navigation"
        >
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
            href="/docs/Pranavi_Lakshminarayanan_AI_Product_Resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            Resume
          </a>
        </nav>
      )}
    </div>
  );
}

export default Header;
