import Footer from "../../components/Footer";
import "./about.css";

function About() {
  return (
    <div className="about">
      <div className="left"></div>
      <div className="photo">
        <img src="/about/profile-photo.JPEG" alt="Profile photo of me" />
      </div>
      <Footer />
    </div>
  );
}

export default About;
