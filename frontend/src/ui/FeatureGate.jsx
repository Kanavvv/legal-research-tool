import { Link } from "react-router-dom";
import { useFeatureOn } from "./siteConfig";

// Shows a short "paused" note instead of a tool the owner has switched off.
export default function FeatureGate({ name, children }) {
  if (useFeatureOn(name)) return children;
  return (
    <main id="main" className="station station--narrow">
      <section className="card paused-tool" role="status">
        <h1 className="block-title">This tool is <em>paused</em> for a little while.</h1>
        <p>Please try again later. Everything else on Nyaya is working.</p>
        <div className="answer-actions">
          <Link to="/" className="btn btn--lime btn--sm">Ask Nyaya a question</Link>
          <Link to="/tools" className="btn btn--ghost btn--sm">All tools</Link>
        </div>
      </section>
    </main>
  );
}
