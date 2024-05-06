import Pdf from "/docs/Pranavi_Resume_2024.pdf";
import "../app.css";

function Header() {
  return (
    <div className="header">
      <div className="left">
        <a href="/">
          <img
            src="./header/home-icon.png"
            alt="Home icon takes you back to landing page when clicked"
          />
        </a>
      </div>
      <div className="right">
        <a href="/">Home</a>
        <a href="/projects">Projects</a>
        <a href="/about">About</a>
        <a
          href={Pdf}
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
