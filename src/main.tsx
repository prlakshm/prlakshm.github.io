// Import React, ReactDOM, your main App component, and styles.
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";


// Use ReactDOM.createRoot to render your app into the root element in "index.html".
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  // Wrap your App component with React.StrictMode for development-related checks.
  <React.StrictMode>
    <App />
  </React.StrictMode>
);