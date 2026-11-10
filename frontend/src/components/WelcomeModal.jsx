import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { useAuth } from "../AuthContext";

const SEEN_KEY = "nyaya-welcome-seen";

export default function WelcomeModal() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [entering, setEntering] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const modalRef = useRef(null);
  const primaryRef = useRef(null);
  const returnFocusRef = useRef(null);

  useEffect(() => {
    if (loading) return;
    if (user) return;
    if (sessionStorage.getItem(SEEN_KEY)) return;

    setVisible(true);
    const t = setTimeout(() => setEntering(true), 20);
    return () => clearTimeout(t);
  }, [loading, user]);

  // While open: move focus in, keep Tab inside, close on Escape,
  // then hand focus back to wherever it was.
  useEffect(() => {
    if (!visible) return;
    returnFocusRef.current = document.activeElement;
    primaryRef.current?.focus();

    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
        return;
      }
      if (e.key !== "Tab" || !modalRef.current) return;
      const focusable = modalRef.current.querySelectorAll(
        'button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const el = returnFocusRef.current;
      if (el && typeof el.focus === "function" && document.contains(el)) el.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function dismiss() {
    sessionStorage.setItem(SEEN_KEY, "1");
    setEntering(false);
    setTimeout(() => setVisible(false), 200);
  }

  async function handleGoogle() {
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
      dismiss();
    } catch {
      setSigningIn(false);
    }
  }

  function goToEmailSignIn() {
    dismiss();
    navigate("/account");
  }

  if (!visible) return null;

  return (
    <div className={`welcome-overlay ${entering ? "entering" : ""}`} onClick={dismiss}>
      <div
        ref={modalRef}
        className="welcome-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        aria-describedby="welcome-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="welcome-close" onClick={dismiss} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2 2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </button>
        <div className="welcome-gauge" aria-hidden="true"><span>000.0</span>m</div>
        <h2 id="welcome-title" className="welcome-headline">Keep a log of every dive.</h2>
        <p id="welcome-desc" className="welcome-body">
          Sign in to save your questions and the cases you pin, synced across your devices,
          and to put your Reef scores on the leaderboard.
        </p>

        <button
          ref={primaryRef}
          type="button"
          className="primary-btn welcome-google-btn"
          onClick={handleGoogle}
          disabled={signingIn}
        >
          {signingIn ? "Opening Google sign-in…" : "Continue with Google"}
        </button>

        <div className="welcome-links">
          <button type="button" onClick={goToEmailSignIn}>Sign in with email instead</button>
          <span aria-hidden="true">&middot;</span>
          <button type="button" onClick={dismiss}>Not today</button>
        </div>
      </div>
    </div>
  );
}
