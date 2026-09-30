import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import About from "./pages/About";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import ArgumentBuilder from "./pages/ArgumentBuilder";
import Account from "./pages/Account";
import WelcomeModal from "./components/WelcomeModal";
import "./App.css";

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("nyaya-theme") || "light");

  useEffect(() => {
    localStorage.setItem("nyaya-theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="gazette" data-theme={theme}>
          <div className="paper-texture" />
          <Navbar theme={theme} toggleTheme={toggleTheme} />
          <WelcomeModal />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/argument-builder" element={<ArgumentBuilder />} />
            <Route path="/account" element={<Account />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
          </Routes>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
