import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import FadeVideo from "../ui/FadeVideo";
import Reveal from "../ui/Reveal";
import { Mark } from "../ui/Nav";
import { prefersReducedMotion } from "../ui/motion";

const API_URL = "https://legal-research-backend-256323345647.us-central1.run.app";
const DOOR_VIDEO = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260808_112712_da9d53df-6d27-4b12-bdf6-aa9dc2622bdf.mp4";

export default function Footer() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(""); // "", "loading", "done", "already", "error"

  async function handleSubscribe(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch(`${API_URL}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Something went wrong");
      setStatus(data.status === "already_subscribed" ? "already" : "done");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  function askNow() {
    const go = () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
      setTimeout(() => document.getElementById("home-question")?.focus({ preventScroll: true }), 500);
    };
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(go, 80);
    } else go();
  }

  return (
    <footer className="foot">
      <section className="door" aria-labelledby="door-title">
        <FadeVideo src={DOOR_VIDEO} className="door-video" />
        <div className="door-scrim" aria-hidden="true" />
        <Reveal className="door-copy">
          <h2 id="door-title" className="door-title">Ask the question you've been <em>putting off</em>.</h2>
          <p className="door-lede">The notice, the clause, the case your professor keeps citing. Start with the question; the judgments come with it.</p>
          <button type="button" className="btn btn--lime btn--lg" onClick={askNow}>
            Ask Nyaya
            <span className="btn-arrow" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 12 12"><path d="M1.5 6h8.5M6.5 2.5 10 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
          </button>
        </Reveal>
      </section>

      <div className="foot-panels">
        <Reveal className="card foot-brand">
          <Link to="/" className="brand" aria-label="Nyaya, home"><Mark /><span>Nyaya</span></Link>
          <p>Indian law, read for you and cited back to the page. Free to use.</p>
          <p className="mono muted">not legal advice / check the source</p>
        </Reveal>

        <Reveal className="foot-news" style={{ "--i": 1 }}>
          <p className="mono foot-news-label">weekly</p>
          <h2 className="foot-news-title">The week's judgments, <em>briefly</em>.</h2>
          <p className="foot-news-sub">One short email on notable new Supreme Court decisions. No spam; leave whenever you like.</p>
          {status === "done" ? (
            <p className="foot-news-status" role="status">You're on the list. The first one arrives after the next notable week.</p>
          ) : status === "already" ? (
            <p className="foot-news-status" role="status">You're already on the list.</p>
          ) : (
            <form className="email-pill" onSubmit={handleSubscribe}>
              <label className="sr-only" htmlFor="news-email">Email address</label>
              <input id="news-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <button type="submit" disabled={status === "loading"}>{status === "loading" ? "Sending…" : "Subscribe"}</button>
            </form>
          )}
          {status === "error" && <p className="foot-news-status" role="alert">Couldn't subscribe right now. Try again shortly.</p>}
        </Reveal>
      </div>

      <ul className="foot-status mono" aria-label="How Nyaya works">
        <li><span className="dot" aria-hidden="true" />every answer cites its sources</li>
        <li><span className="dot" aria-hidden="true" />reads only real judgments and Acts</li>
        <li><span className="dot" aria-hidden="true" />free, no account needed</li>
      </ul>

      <div className="foot-cols">
        <div>
          <p className="mono muted">tools</p>
          <Link to="/">Ask</Link>
          <Link to="/compare">Compare</Link>
          <Link to="/argument-builder">Argument</Link>
          <Link to="/statutes">Statutes</Link>
        </div>
        <div>
          <p className="mono muted">learn</p>
          <Link to="/#games">Games</Link>
          <Link to="/about">How it works</Link>
        </div>
        <div>
          <p className="mono muted">you</p>
          <Link to="/account">Sign in / My desk</Link>
        </div>
        <div>
          <p className="mono muted">legal</p>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </div>
      </div>

      <div className="foot-bottom mono">
        <span>{new Date().getFullYear()}, Nyaya</span>
        <span>built in India, for anyone who reads the law</span>
      </div>
    </footer>
  );
}
