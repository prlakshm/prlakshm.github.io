import useDarkMode from "../hooks/useDarkMode.js";




function Footer() {
  const darkMode = useDarkMode();
  
    return (
        <div className={`footer ${darkMode ? 'dark-mode' : ''}`}>
          <div className="left">
          © 2024 Coded with 💖 by Pranavi Lakshminarayanan
          </div>
          <div className="right">
          <div className="contact">
            <a href="mailto:pranavi_lakshminarayanan@brown.edu" target="_blank">
              <img src={darkMode? "./icons/email-icon-light.svg" : "./icons/email-icon.svg"} alt="Email icon" />
            </a>
            <a href="https://github.com/prlakshm" target="_blank">
              <img src={darkMode? "./icons/github-icon-light.svg" : "./icons/github-icon.svg"} alt="Github icon" />
            </a>
            <a href="https://www.linkedin.com/in/prlakshm" target="_blank">
              <img src={darkMode? "./icons/linkedin-icon-light.svg" : "./icons/linkedin-icon.svg"} alt="Linkedin icon" />
            </a>
          </div>
          </div>
        </div>
      );
}

export default Footer;