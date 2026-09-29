import { useState } from "react";
import { Link } from "react-router-dom";

const API_URL = "https://legal-research-backend-256323345647.us-central1.run.app";

export default function Footer() {
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
    } catch (err) {
      setStatus("error");
    }
  }

  return (
    <footer className="gazette-footer">
      <div className="masthead-rule-thin" />

      <div className="newsletter-block">
        <div className="footer-heading">Subscribe to the Gazette</div>
        <p className="newsletter-sub">
          "This Week in the Supreme Court" &mdash; a short digest of notable new judgments,
          straight to your inbox. No spam, unsubscribe anytime.
        </p>
        {status === "done" ? (
          <div className="newsletter-status">You're subscribed. First issue lands next notable week.</div>
        ) : status === "already" ? (
          <div className="newsletter-status">You're already on the list.</div>
        ) : (
          <form className="newsletter-form" onSubmit={handleSubscribe}>
            <input
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" disabled={status === "loading"}>
              {status === "loading" ? "..." : "Subscribe"}
            </button>
          </form>
        )}
        {status === "error" && <div className="newsletter-status error">Couldn't subscribe right now &mdash; try again shortly.</div>}
      </div>

      <div className="masthead-rule-thin" />

      <div className="footer-columns">
        <div className="footer-col">
          <div className="footer-heading">The Fine Print</div>
          <p>
            Nyaya is an educational research gazette, set in type from real Indian
            Supreme Court judgments. It is not a substitute for professional legal
            advice, however convincingly it may argue otherwise.
          </p>
        </div>
        <div className="footer-col">
          <div className="footer-heading">Filed Under</div>
          <Link to="/about">About the Paper</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
        </div>
      </div>
      <div className="footer-bottom">
        Nyaya &middot; printed fresh daily &middot; the editor does not practice law, and would appreciate not being asked to.
      </div>
    </footer>
  );
}
