import { useEffect } from "react";
import "./home.css";


function Home() {

  useEffect(() => {
    // Load the lottie.js script dynamically
    const lottieScript = document.createElement("script");
    lottieScript.src = "/home/lottie.js";
    lottieScript.async = true;
    document.body.appendChild(lottieScript);

    // Load the script.js script dynamically
    lottieScript.onload = () => {
      const script = document.createElement("script");
      script.src = "/home/script.js";
      script.async = true;
      document.body.appendChild(script);
    };

    // Cleanup function to remove scripts when the component unmounts
    return () => {
      document.body.removeChild(lottieScript);
      const loadedScript = document.querySelector('script[src="/script.js"]');
      if (loadedScript) {
        document.body.removeChild(loadedScript);
      }
    };
  }, []);

  return <div className="home">
    <div id="anim"></div>
  </div>;
}

export default Home;
