import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import Chrome from "./ui/Chrome";
import FeatureGate from "./ui/FeatureGate";
import { prefersReducedMotion } from "./ui/motion";
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
const Now = lazy(() => import("./pages/Now"));
const Trending = lazy(() => import("./pages/Trending"));
const Deadlines = lazy(() => import("./pages/Deadlines"));
const IsItLegal = lazy(() => import("./pages/IsItLegal"));
const Notice = lazy(() => import("./pages/Notice"));
const Hub = lazy(() => import("./pages/Hub"));
const Answers = lazy(() => import("./pages/Answers"));
const Explained = lazy(() => import("./pages/Explained"));
const Cases = lazy(() => import("./pages/Cases"));

import { SITE, DEFAULT_DESC, META } from "./routeMeta";

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
    if (/^\/(law|rights|templates|now|help|explained)\/./.test(pathname)) {
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
        <Routes>
          <Route path="/admin" element={<Suspense fallback={null}><Admin /></Suspense>} />
          <Route path="*" element={
            <Chrome>
              <Suspense fallback={<Loading />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/argument-builder" element={<FeatureGate name="argument"><ArgumentBuilder /></FeatureGate>} />
                  <Route path="/compare" element={<FeatureGate name="compare"><CompareCases /></FeatureGate>} />
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
                  <Route path="/trending" element={<Trending />} />
                  <Route path="/now" element={<Now />} />
                  <Route path="/now/:slug" element={<Now />} />
                  <Route path="/deadlines" element={<Deadlines />} />
                  <Route path="/is-it-legal" element={<FeatureGate name="check"><IsItLegal /></FeatureGate>} />
                  <Route path="/notice" element={<FeatureGate name="notice"><Notice /></FeatureGate>} />
                  <Route path="/help" element={<Hub />} />
                  <Route path="/help/:slug" element={<Hub />} />
                  <Route path="/answers" element={<Answers />} />
                  <Route path="/explained" element={<Explained />} />
                  <Route path="/explained/:slug" element={<Explained />} />
                  <Route path="/cases" element={<Cases />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </Chrome>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
