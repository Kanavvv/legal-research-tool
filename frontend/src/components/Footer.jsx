import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import DoorScene from "../ui/DoorScene";
import Reveal from "../ui/Reveal";
import { Mark } from "../ui/Nav";
import { prefersReducedMotion } from "../ui/motion";
import { API_URL } from "../api";
import { PRO_ON, WHATSAPP_URL } from "../config";


export default function Footer() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(""); // "", "loading", "done", "already", "error"
  const [hint, setHint] = useState("");
  const [trap, setTrap] = useState(""); // honeypot: people never see it, bots fill it
  const shownAt = useRef(0);
  useEffect(() => { shownAt.current = Date.now(); }, []);

  async function handleSubscribe(e) {
    e.preventDefault();
    const clean = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) {
      setHint("That doesn't look like an email address. Check for a typo.");
      return;
    }
    setHint("");
    // Bots fill the hidden field or submit within a second; pretend it worked
    if (trap || Date.now() - shownAt.current < 1500) { setStatus("done"); return; }
    setStatus("loading");
    try {
      const res = await fetch(`${API_URL}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: clean }),
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
        <DoorScene />
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
          <h2 className="foot-news-title">Your rights, <em>every Sunday</em>.</h2>
          <p className="foot-news-sub">One right most people don't know, the answers India read most, and a free template. Plus the Supreme Court's notable judgments on Mondays. Leave whenever you like.</p>
          {status === "done" ? (
            <p className="foot-news-status" role="status">You're on the list. The first one arrives on Sunday.</p>
          ) : status === "already" ? (
            <p className="foot-news-status" role="status">You're already on the list.</p>
          ) : (
            <form className="email-pill" onSubmit={handleSubscribe} noValidate>
              <label className="sr-only" htmlFor="news-email">Email address</label>
              <input id="news-email" type="email" autoComplete="email" placeholder="you@example.com" value={email}
                onChange={(e) => { setEmail(e.target.value); if (hint) setHint(""); }}
                aria-invalid={hint ? true : undefined} aria-describedby={hint ? "news-hint" : undefined} maxLength={254} />
              <div className="hp-field" aria-hidden="true">
                <label htmlFor="news-company">Company</label>
                <input id="news-company" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
              </div>
              <button type="submit" disabled={status === "loading"}>{status === "loading" ? "Sending…" : "Subscribe"}</button>
            </form>
          )}
          {hint && <p id="news-hint" className="foot-news-status" role="alert">{hint}</p>}
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
          {PRO_ON && <Link to="/documents">Documents</Link>}
          {PRO_ON && <Link to="/drafts">Drafts</Link>}
          <Link to="/convert">IPC ↔ BNS</Link>
        </div>
        <div>
          <p className="mono muted">for everyone</p>
          <Link to="/trending">What India is asking</Link>
          <Link to="/answers">Questions people asked</Link>
          <Link to="/explained">In the news, explained</Link>
          <Link to="/cases">My cases: hearing reminders</Link>
          <Link to="/now">Something just happened?</Link>
          <Link to="/notice">Got a notice?</Link>
          <Link to="/is-it-legal">Is this legal?</Link>
          <Link to="/deadlines">Deadline calculator</Link>
          <Link to="/how-long">How long will my case take?</Link>
          <Link to="/legal-aid">Free lawyer? Check</Link>
          <Link to="/rights">Know your rights</Link>
          <Link to="/templates">Free templates</Link>
          <Link to="/lawyers">Find a lawyer</Link>
          <Link to="/widget">Free widget for your site</Link>
          <Link to="/digest">Weekly digest</Link>
        </div>
        <div>
          <p className="mono muted">learn</p>
          <Link to="/students">Student mode</Link>
          <Link to="/#games">Games</Link>
          <Link to="/about">How it works</Link>
        </div>
        <div>
          <p className="mono muted">you</p>
          <Link to="/account">Sign in / My desk</Link>
          {PRO_ON && <Link to="/pricing">Pricing</Link>}
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">Ask on WhatsApp</a>
          <Link to="/lawyers/join">Advocates: list free</Link>
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
