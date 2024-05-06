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
          <img src="./icons/email-icon.png" alt="Email icon" />
          <img src="./icons/github-icon.png" alt="Github icon" />
          <img src="./icons/linkedin-icon.png" alt="Linkedin icon" />
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
