import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import Gallery from "./pages/gallery/Gallery.js";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Gallery />
    </BrowserRouter>
  </React.StrictMode>,
);
