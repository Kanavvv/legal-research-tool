import { Link } from "react-router-dom";
import Scales from "../ui/Scales";

export default function NotFound() {
  return (
    <main id="main" className="station station--narrow">
      <section className="lost">
        <Scales status="error" size={96} />
        <p className="lost-code" aria-hidden="true">404</p>
        <h1 className="block-title">This page was <em>never filed</em>.</h1>
        <p className="lost-lede">The link may be old or mistyped. The law is still where you left it.</p>
        <div className="lost-ctas">
          <Link to="/" className="btn btn--lime">Ask Nyaya a question</Link>
          <Link to="/statutes" className="btn btn--ghost">Browse the Acts</Link>
        </div>
      </section>
    </main>
  );
}
