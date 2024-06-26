import { useEffect } from "react";
import Footer from "../../components/Footer";
import "./about.css";

function About() {
    // This will run once when the component mounts scroll to top page
    useEffect(() => {
      window.scrollTo(0, 0);
    }, []); 
    
  return (
    <div className="about">
    <div className="main">
      <div className="about-me">
        <h1>About Me</h1>
        <p>I'm Pranavi 👋, a <span className="bold">sophomore at Brown University</span> studying computer science. I name all my ML models and paste pictures of websites I've built in my room! 
            When I'm not coding, I'm singing, dancing, and having a good time with my friends.</p>
            <p>I'm part of <span className="bold">Full Stack @ Brown</span>, where I work in a team of designers and developers to code websites for student clubs. I'm also a member of <span className="bold">Rewriting the Code</span>, a global organization that helps empower and connect women in CS. 
                Previously, I was an encryption intern at <a href="https://www.mantech.com/" target="_blank">ManTech</a>, where I learned I love algorithms, and currently am a data science intern at <a href="https://www.carync.gov/" target="_blank">Town of Cary</a>, a smart city and the <a href="https://livability.com/best-places/2024-top-100-best-places-to-live-in-the-us/" target="_blank">#2 best city to live in the US</a>!
            </p>
            <p>Outside of CS, I take literary arts classes at Brown where I explore different forms of storytelling. <span className="bold">I love movies</span> (ask me for recs!) and recently got into screenwriting!  </p>
            <p>If you're also interested in any of these things, I'd love to chat!</p>
      </div>

      <img className="pink-blob" src="/about/pink-blob.png" alt="pink blob background decoration"/>

      <img className="purple-blob" src="/about/purple-blob.png" alt="purple blob background decoration"/>
      <div className="photo">
        <img src="/about/profile-photo.png" alt="Profile photo of me" />
      </div>
      </div>
      <Footer />
    </div>
  );
}

export default About;
