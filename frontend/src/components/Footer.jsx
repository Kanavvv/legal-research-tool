import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="gazette-footer">
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
