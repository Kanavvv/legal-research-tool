import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// Anonymous page-view counts (Vercel Web Analytics) load only after the
// visitor says yes. "No" is remembered just as firmly as "yes".

const KEY = "nyaya-consent";

function read() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

function startAnalytics() {
  import("@vercel/analytics").then(({ inject }) => inject({ mode: "auto" })).catch(() => {});
}

export default function Consent() {
  const [choice, setChoice] = useState(read);

  useEffect(() => {
    if (choice === "yes") startAnalytics();
  }, [choice]);

  if (choice) return null;

  function decide(v) {
    try { localStorage.setItem(KEY, v); } catch { /* private mode: ask again next time */ }
    setChoice(v);
  }

  return (
    <div className="consent" role="region" aria-label="Analytics consent">
      <p>
        May we count page visits? It's anonymous: no ads, no tracking across sites.{" "}
        <Link to="/privacy">Privacy policy</Link>
      </p>
      <div className="consent-actions">
        <button type="button" className="btn btn--ghost" onClick={() => decide("no")}>No thanks</button>
        <button type="button" className="btn btn--lime" onClick={() => decide("yes")}>Allow</button>
      </div>
    </div>
  );
}
