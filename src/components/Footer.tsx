import React from 'react';
import {
	BrowserRouter as Router,
	Routes,
	Route,
    Link,
} from "react-router-dom";



function Footer() {
    return (
        <div className="footer">
          <div className="left">
            Coded with 💖 by Pranavi Lakshminarayanan
          </div>
          <div className="right">
            <a href="/">Email</a>
            <a href="/projects">Github</a>
            <a href="/about">LinkedIn</a>
          </div>
        </div>
      );
}

export default Footer;