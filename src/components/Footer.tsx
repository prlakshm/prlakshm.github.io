import useDarkMode from "../hooks/useDarkMode.js";




function Footer() {
  const darkMode = useDarkMode();
  
    return (
        <div className={`footer ${darkMode ? 'dark-mode' : ''}`}>
          <div className="left">
            Coded with 💖 by Pranavi Lakshminarayanan
          </div>
          <div className="right">
          <div className="contact">
            <a href="mailto:pranavi_lakshminarayanan@brown.edu" target="_blank">
              <img src="./icons/email-icon.png" alt="Email icon" />
            </a>
            <a href="https://github.com/prlakshm" target="_blank">
              <img src="./icons/github-icon.png" alt="Github icon" />
            </a>
            <a href="https://www.linkedin.com/in/prlakshm" target="_blank">
              <img src="./icons/linkedin-icon.png" alt="Linkedin icon" />
            </a>
          </div>
          </div>
        </div>
      );
}

export default Footer;