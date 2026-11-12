import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import Chrome from "./ui/Chrome";
import FeatureGate from "./ui/FeatureGate";
import { prefersReducedMotion } from "./ui/motion";
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
const Now = lazy(() => import("./pages/Now"));
const Trending = lazy(() => import("./pages/Trending"));
const Deadlines = lazy(() => import("./pages/Deadlines"));
const IsItLegal = lazy(() => import("./pages/IsItLegal"));
const Notice = lazy(() => import("./pages/Notice"));
const Hub = lazy(() => import("./pages/Hub"));
const Answers = lazy(() => import("./pages/Answers"));
const Explained = lazy(() => import("./pages/Explained"));
const Cases = lazy(() => import("./pages/Cases"));

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
  "/trending": ["What India is asking: this week's legal questions · Nyaya", "The legal questions people are asking this week, answered with the law behind them. Ask any of them free."],
  "/now": ["Something just happened? What to do now · Nyaya", "Step-by-step help for online fraud, arrest, a refused FIR, cheque bounce, road accidents, legal notices, domestic violence and more. English and Hindi."],
  "/deadlines": ["Legal deadline calculator: cheque bounce, consumer, RTI, appeals · Nyaya", "Work out the last day to send a cheque-bounce notice, file a consumer complaint, appeal an RTI, claim for an accident and more, from the law that sets it."],
  "/is-it-legal": ["Is this legal? Quick answers on Indian law · Nyaya", "Describe a situation and get a straight answer from Indian law, with the sections and judgments behind it."],
  "/notice": ["Got a legal notice? Free notice decoder · Nyaya", "Upload a photo of a legal notice, summons, FIR or court order and get what it means, how urgent it is and what to do next. Free."],
  "/help": ["Help with everyday law: tenants, consumers, RTI, women's rights · Nyaya", "Everything on one problem in one place: what to do now, your rights, deadlines and free templates."],
  "/answers": ["Questions people asked about Indian law, answered with sources · Nyaya", "Real questions about Indian law: tenants, cheques, FIRs, consumers, family and more, each answered from judgments and Acts with the sources shown."],
  "/explained": ["Legal news explained: what it means for you · Nyaya", "When a judgment or new rule makes headlines, what it actually says and what it means for you, from the law itself."],
  "/cases": ["My cases: hearing reminders and court orders explained · Nyaya", "Keep your court cases with the next hearing date, get email reminders before each hearing, and upload an order to have it explained in plain words. Free."],
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
