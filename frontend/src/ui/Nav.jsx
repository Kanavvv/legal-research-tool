import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext";

const LINKS = [
  { to: "/", label: "Ask", end: true },
  { to: "/compare", label: "Compare" },
  { to: "/argument-builder", label: "Argument" },
  { to: "/statutes", label: "Statutes" },
  { to: "/documents", label: "Documents" },
  { to: "/pricing", label: "Pro" },
];

export function Mark({ size = 28 }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <rect width="28" height="28" rx="7" fill="currentColor" />
      <path d="M8.5 20V8.5l11 11V8" fill="none" stroke="#14213D" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Nav() {
  const { user } = useAuth();
  const location = useLocation();
  // The menu belongs to the page it was opened on, so navigating closes it
  const routeKey = location.pathname + location.hash;
  const [openAt, setOpenAt] = useState(null);
  const open = openAt === routeKey;
  const setOpen = (next) => setOpenAt(next ? routeKey : null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpenAt(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <header className={`nav${scrolled ? " nav--solid" : ""}${open ? " nav--open" : ""}`}>
        <div className="nav-inner">
          <Link to="/" className="brand" aria-label="Nyaya, home">
            <Mark />
            <span>Nyaya</span>
          </Link>

          <nav id="site-links" className="nav-links" aria-label="Main">
            {LINKS.map((l) =>
              l.to.includes("#") ? (
                <Link key={l.to} to={l.to} className={location.hash === "#games" ? "nav-link nav-link--on" : "nav-link"}>
                  {l.label}
                </Link>
              ) : (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) => (isActive && !(l.end && location.hash) ? "nav-link nav-link--on" : "nav-link")}
                >
                  {l.label}
                </NavLink>
              )
            )}
            <Link to="/about" className="nav-link nav-link--phone">About</Link>
          </nav>

          <div className="nav-end">
            <span className="status-chip"><span className="dot" aria-hidden="true" />free · every answer cited</span>
            <Link to="/account" className="btn btn--lime btn--sm">{user ? "My desk" : "Sign in"}</Link>
            <button
              type="button"
              className="nav-menu"
              aria-expanded={open}
              aria-controls="site-links"
              onClick={() => setOpen(!open)}
            >
              <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
              <span className="nav-menu-bars" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
