import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (loading) return;
    if (user) return;
    if (sessionStorage.getItem(SEEN_KEY)) return;

    setVisible(true);
    const t = setTimeout(() => setEntering(true), 20);
    return () => clearTimeout(t);
  }, [loading, user]);

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
    } catch (err) {
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
      <div className="welcome-modal" onClick={(e) => e.stopPropagation()}>
        <button className="welcome-close" onClick={dismiss} aria-label="Close">&times;</button>
        <div className="welcome-stamp">EXTRA</div>
        <div className="kicker" style={{ marginTop: "6px" }}>SPECIAL NOTICE</div>
        <h2 className="welcome-headline">Get Your Own Desk at the Gazette</h2>
        <p className="welcome-body">
          Sign in to permanently save your search history and favorite cases &mdash;
          synced across every device, kept for as long as you want it.
        </p>

        <button className="puzzle-next welcome-google-btn" onClick={handleGoogle} disabled={signingIn}>
          {signingIn ? "..." : "Continue with Google"}
        </button>

        <div className="welcome-links">
          <a href="#" onClick={(e) => { e.preventDefault(); goToEmailSignIn(); }}>Sign in with email instead</a>
          <span>&middot;</span>
          <a href="#" onClick={(e) => { e.preventDefault(); dismiss(); }}>Not today</a>
        </div>
      </div>
    </div>
  );
}
