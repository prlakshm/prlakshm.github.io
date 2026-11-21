import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import About from "./pages/about/About.js";
import "./motion/stormHandoff.js"; // the way into EVERYTHING (cross-page storm)
import "./motion/caveIn.js"; // ...and the cave-in that takes you there

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <About />
    </BrowserRouter>
  </React.StrictMode>,
);
