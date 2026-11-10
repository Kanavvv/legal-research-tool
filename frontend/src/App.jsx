import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import Currents from "./ui/Currents";
import Nav from "./ui/Nav";
import { prefersReducedMotion } from "./ui/motion";
import Footer from "./components/Footer";
import WelcomeModal from "./components/WelcomeModal";
import Home from "./pages/Home";
import "./App.css";

// Everything off the surface loads on demand
const ArgumentBuilder = lazy(() => import("./pages/ArgumentBuilder"));
const CompareCases = lazy(() => import("./pages/CompareCases"));
const StatuteBrowser = lazy(() => import("./pages/StatuteBrowser"));
const Account = lazy(() => import("./pages/Account"));
const About = lazy(() => import("./pages/About"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      // Wait a frame so the target section exists
      requestAnimationFrame(() => {
        const el = document.getElementById(hash.slice(1));
        if (el) el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
      });
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
  return null;
}

function Loading() {
  return (
    <div className="sonar" role="status">
      <span className="sonar-ring" aria-hidden="true" />
      <span className="sonar-text">Loading…</span>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollManager />
        <Currents />
        <div className="site">
          <Nav />
          <WelcomeModal />
          <div className="column">
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/argument-builder" element={<ArgumentBuilder />} />
                <Route path="/compare" element={<CompareCases />} />
                <Route path="/statutes" element={<StatuteBrowser />} />
                <Route path="/account" element={<Account />} />
                <Route path="/about" element={<About />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
              </Routes>
            </Suspense>
            <Footer />
          </div>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
