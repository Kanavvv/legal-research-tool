import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import Reeded from "./ui/Reeded";
import Consent from "./ui/Consent";
import Nav from "./ui/Nav";
import { prefersReducedMotion } from "./ui/motion";
import Footer from "./components/Footer";
import WelcomeModal from "./components/WelcomeModal";
import Home from "./pages/Home";
import "./App.css";
import "./world.css";

// Everything off the surface loads on demand
const ArgumentBuilder = lazy(() => import("./pages/ArgumentBuilder"));
const CompareCases = lazy(() => import("./pages/CompareCases"));
const StatuteBrowser = lazy(() => import("./pages/StatuteBrowser"));
const Account = lazy(() => import("./pages/Account"));
const About = lazy(() => import("./pages/About"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const NotFound = lazy(() => import("./pages/NotFound"));

const SITE = "https://asknyaya.in";
const DEFAULT_DESC = "Ask a question about Indian law in plain English. Nyaya reads real Supreme Court and High Court judgments and central Acts, and cites every answer.";
const META = {
  "/": ["Nyaya: Indian law, answered with receipts", DEFAULT_DESC],
  "/argument-builder": ["Argument Builder · Nyaya", "Build both sides of a legal argument from real Indian judgments, each point cited to its source."],
  "/compare": ["Compare Cases · Nyaya", "Put two Indian judgments side by side: facts, holdings and reasoning, with citations."],
  "/statutes": ["Statute Browser · Nyaya", "Read India's central Acts section by section, with plain-English help on each provision."],
  "/account": ["My Desk · Nyaya", "Your saved answers, arguments and comparisons on Nyaya."],
  "/about": ["How Nyaya works", "How Nyaya finds, reads and cites Indian judgments and Acts, and where its limits are."],
  "/privacy": ["Privacy Policy · Nyaya", "How Nyaya handles your information."],
  "/terms": ["Terms of Use · Nyaya", "The terms for using Nyaya. Nyaya is a research aid, not legal advice."],
};

function setMeta(sel, attr, value) {
  const el = document.head.querySelector(sel);
  if (el) el.setAttribute(attr, value);
}

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
  useEffect(() => {
    const [title, desc] = META[pathname] || ["Page not found · Nyaya", DEFAULT_DESC];
    document.title = title;
    setMeta('meta[name="description"]', "content", desc);
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", desc);
    setMeta('meta[property="og:url"]', "content", SITE + pathname);
    setMeta('link[rel="canonical"]', "href", SITE + pathname);
    let robots = document.head.querySelector('meta[name="robots"]');
    if (!META[pathname]) {
      if (!robots) { robots = document.createElement("meta"); robots.name = "robots"; document.head.appendChild(robots); }
      robots.content = "noindex";
    } else if (robots) robots.remove();
  }, [pathname]);
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
        <Reeded />
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
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <Footer />
          </div>
        </div>
        <Consent />
      </BrowserRouter>
    </AuthProvider>
  );
}
