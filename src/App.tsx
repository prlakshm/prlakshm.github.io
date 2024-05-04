import React from 'react';
import {
	BrowserRouter as Router,
	Routes,
	Route,
} from "react-router-dom";
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/home/Home';


function App() {
	return (
		<Router>
            <Header />
            <Routes>
                <Route path="/" element={<Home />} />

                </Routes>
            <Footer />
		</Router>
	);
}

export default App;
