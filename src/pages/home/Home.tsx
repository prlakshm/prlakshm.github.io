import "./home.css";

function Home() {
  return (
    <div className="home">
      <div className="title">
        <h1>Hi, I'm Pranavi</h1>
        <h2>
          I’m a software engineer interested in full-stack development and
          AI-assisted design. <br />
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
        </h2>
      </div>
      <div className="character">
        <img src="./home/character.png" alt="AI generated image of me" />
      </div>
    </div>
  );
}

export default Home;
