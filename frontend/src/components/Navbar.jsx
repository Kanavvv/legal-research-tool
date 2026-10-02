import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";

export default function Navbar({ theme, toggleTheme }) {
  const location = useLocation();
  const { user } = useAuth();
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <header className="masthead">
      <div className="masthead-topline">
        <span>Vol. I &middot; No. 001</span>
        <span>{today}</span>
        <button className="lamp-toggle" onClick={toggleTheme}>
          {theme === "dark" ? "Turn up the lamps" : "Dim the lamps"}
        </button>
      </div>

      <Link to="/" className="masthead-title">
        Nyaya
      </Link>
      <div className="masthead-tagline">All the Judgments Fit to Search</div>

      <div className="masthead-rule-thick" />
      <div className="masthead-rule-thin" />

      <nav className="masthead-nav">
        <Link to="/" className={location.pathname === "/" ? "nav-link active" : "nav-link"}>The Docket</Link>
        <Link to="/argument-builder" className={location.pathname === "/argument-builder" ? "nav-link active" : "nav-link"}>Moot Court Desk</Link>
        <Link to="/compare" className={location.pathname === "/compare" ? "nav-link active" : "nav-link"}>Compare Cases</Link>
        <Link to="/about" className={location.pathname === "/about" ? "nav-link active" : "nav-link"}>About the Paper</Link>
        <Link to="/account" className={location.pathname === "/account" ? "nav-link active" : "nav-link"}>
          {user ? "My Desk" : "Sign In"}
        </Link>
      </nav>
    </header>
  );
}
