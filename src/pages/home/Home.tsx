import "./home.css"

function Home() {
  return (
    <div className="home">
        <div className="title">
            <h1>Hi, I'm Pranavi</h1>
            <h2>I’m a software engineer interested in full-stack development and AI-assisted design.</h2>
        </div>
        <div className="character">
        <img
            src="character.png"
            alt="AI generated image of me"
          />
        </div>
    </div>
  );
}

export default Home;