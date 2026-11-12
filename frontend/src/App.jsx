import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import Reeded from "./ui/Reeded";
import Consent from "./ui/Consent";
import Nav from "./ui/Nav";
import SiteBanner from "./ui/SiteBanner";
import { prefersReducedMotion } from "./ui/motion";
import Footer from "./components/Footer";
import WelcomeModal from "./components/WelcomeModal";
import Home from "./pages/Home";
import "./App.css";
import "./world.css";
import { PRO_ON } from "./config";

// Everything off the surface loads on demand
const ArgumentBuilder = lazy(() => import("./pages/ArgumentBuilder"));
const CompareCases = lazy(() => import("./pages/CompareCases"));
const StatuteBrowser = lazy(() => import("./pages/StatuteBrowser"));
const Account = lazy(() => import("./pages/Account"));
const About = lazy(() => import("./pages/About"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Documents = lazy(() => import("./pages/Documents"));
const SharedAnswer = lazy(() => import("./pages/SharedAnswer"));
const Convert = lazy(() => import("./pages/Convert"));
const LawSection = lazy(() => import("./pages/LawSection"));
const Rights = lazy(() => import("./pages/Rights"));
const Templates = lazy(() => import("./pages/Templates"));
const Students = lazy(() => import("./pages/Students"));
const Lawyers = lazy(() => import("./pages/Lawyers"));
const Digest = lazy(() => import("./pages/Digest"));
const Tools = lazy(() => import("./pages/Tools"));
const Admin = lazy(() => import("./pages/Admin"));

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
  "/pricing": PRO_ON
    ? ["Pricing · Nyaya", "Nyaya is free to use. Nyaya Pro (Rs 199 for 30 days) adds 200 questions a day, document review, drafts and case alerts."]
    : ["Pricing · Nyaya", "Nyaya is free to use. Nyaya Pro is paused for a few days."],
  "/documents": ["Explain a legal document · Nyaya", "Upload a notice, agreement, FIR or order, even a phone photo, and get it explained in plain words with the Indian law that applies."],
  "/convert": ["IPC to BNS converter: old and new criminal law sections · Nyaya", "Convert IPC to BNS, CrPC to BNSS and Evidence Act to BSA sections, both ways, and read the old and new text side by side."],
  "/rights": ["Know your rights: plain guides to Indian law · Nyaya", "Short, cited guides to your rights in India: arrest, FIR, bail, tenants, consumers, workplace and more. In English and Hindi."],
  "/templates": ["Free legal templates: RTI, consumer complaint, cheque bounce notice · Nyaya", "Fill-in templates for an RTI application, consumer complaint, cheque-bounce notice and rent agreement. Free, no sign-in."],
  "/students": ["Law student mode: case briefs, moot practice, quizzes · Nyaya", "Case briefs from real judgments, moot court practice with a questioning bench, and quizzes on the new criminal codes."],
  "/lawyers": ["Find a lawyer · Nyaya", "A directory of advocates in India who listed themselves, by city and area of practice."],
  "/lawyers/join": ["List yourself as an advocate · Nyaya", "Advocates can add a free listing to Nyaya's directory."],
  "/digest": ["This week in the Supreme Court · Nyaya", "A short weekly digest of new Supreme Court judgments, in plain words."],
  "/tools": ["All tools · Nyaya", "Every Nyaya tool in one place: ask, convert, compare, argue, draft, and more."],
  "/drafts": ["Draft a legal document · Nyaya", "First drafts of legal notice replies, RTI applications and consumer complaints, grounded in cited law."],
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
    if (pathname.startsWith("/a/")) {
      // Shared answers set their own title; keep them out of search results
      setMeta('link[rel="canonical"]', "href", SITE + pathname);
      return;
    }
    if (/^\/(law|rights|templates)\/./.test(pathname)) {
      // These pages set their own title and description once their content loads
      document.head.querySelector('meta[name="robots"]')?.remove();
      setMeta('meta[property="og:url"]', "content", SITE + pathname);
      setMeta('link[rel="canonical"]', "href", SITE + pathname);
      return;
    }
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
          <SiteBanner />
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
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/documents" element={<Documents />} />
                <Route path="/drafts" element={<Documents />} />
                <Route path="/a/:id" element={<SharedAnswer />} />
                <Route path="/convert" element={<Convert />} />
                <Route path="/law/:act/:num" element={<LawSection />} />
                <Route path="/rights" element={<Rights />} />
                <Route path="/rights/:slug" element={<Rights />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/templates/:slug" element={<Templates />} />
                <Route path="/students" element={<Students />} />
                <Route path="/lawyers" element={<Lawyers />} />
                <Route path="/lawyers/join" element={<Lawyers join />} />
                <Route path="/digest" element={<Digest />} />
                <Route path="/tools" element={<Tools />} />
                <Route path="/admin" element={<Admin />} />
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
