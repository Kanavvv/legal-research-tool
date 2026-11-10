import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { useAuth } from "../AuthContext";
import { authFetch } from "../authFetch";

const API_URL = "https://legal-research-backend-256323345647.us-central1.run.app";

export default function Account() {
  const { user, signOutUser } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [history, setHistory] = useState(null); // null = loading
  const [favorites, setFavorites] = useState(null);

  useEffect(() => {
    if (!user) return;
    authFetch(`${API_URL}/history`)
      .then((res) => res && res.json())
      .then((data) => setHistory(data ? data.history || [] : []))
      .catch(() => setHistory([]));
    authFetch(`${API_URL}/favorites`)
      .then((res) => res && res.json())
      .then((data) => setFavorites(data ? data.favorites || [] : []))
      .catch(() => setFavorites([]));
  }, [user]);

  async function removeFavorite(caseId) {
    setFavorites((prev) => prev.filter((f) => f.case_id !== caseId));
    try {
      await authFetch(`${API_URL}/favorites/${encodeURIComponent(caseId)}`, { method: "DELETE" });
    } catch { /* will reappear on reload */ }
  }

  function rerunSearch(question) {
    navigate("/", { state: { rerunQuestion: question } });
  }

  async function handleGoogle() {
    setError("");
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      navigate("/");
    } catch (err) {
      setError(readableError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name.trim()) {
          await updateProfile(cred.user, { displayName: name.trim() });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate("/");
    } catch (err) {
      setError(readableError(err));
    } finally {
      setLoading(false);
    }
  }

  function readableError(err) {
    const code = err.code || "";
    if (code.includes("wrong-password") || code.includes("invalid-credential")) return "Incorrect email or password.";
    if (code.includes("user-not-found")) return "No account found with that email.";
    if (code.includes("email-already-in-use")) return "An account with that email already exists.";
    if (code.includes("weak-password")) return "Password should be at least 6 characters.";
    if (code.includes("invalid-email")) return "That doesn't look like a valid email.";
    if (code.includes("popup-closed-by-user")) return "";
    return "Something went wrong. Please try again.";
  }

  if (user) {
    return (
      <main id="main" className="station">
        <header className="station-head station-head--row">
          <div>
            <h1 className="station-title">Your <em>desk</em>.</h1>
            <p className="station-lede">Signed in as {user.displayName || user.email}. Your questions and saved cases follow you across devices.</p>
          </div>
          <button type="button" className="btn btn--ghost" onClick={async () => { await signOutUser(); navigate("/"); }}>
            Sign out
          </button>
        </header>

        <div className="desk">
          <section className="card desk-card" aria-labelledby="desk-history">
            <div className="card-bar">
              <h2 id="desk-history" className="mono">recent questions</h2>
              <span className="mono muted">{history ? history.length : ""}</span>
            </div>
            {history === null ? (
              <p className="muted">Loading…</p>
            ) : history.length === 0 ? (
              <p className="muted">Nothing yet. Ask something on the home page and it will show up here.</p>
            ) : (
              <ul className="desk-list">
                {history.map((q, i) => (
                  <li key={i}>
                    <button type="button" className="desk-row" onClick={() => rerunSearch(q)}>
                      <span className="dot" aria-hidden="true" />
                      <span>{q}</span>
                      <span className="mono muted desk-go">ask again</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card desk-card" aria-labelledby="desk-saved">
            <div className="card-bar">
              <h2 id="desk-saved" className="mono">saved cases</h2>
              <span className="mono muted">{favorites ? favorites.length : ""}</span>
            </div>
            {favorites === null ? (
              <p className="muted">Loading…</p>
            ) : favorites.length === 0 ? (
              <p className="muted">No saved cases. Use Save on any source in an answer.</p>
            ) : (
              <ul className="desk-list">
                {favorites.map((f) => (
                  <li key={f.case_id} className="desk-saved">
                    <div>
                      <p className="desk-saved-title">{f.title}</p>
                      <p className="mono muted">{f.citation}</p>
                    </div>
                    <div className="desk-saved-actions">
                      {f.source_url && <a href={f.source_url} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">Read</a>}
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => removeFavorite(f.case_id)}>Remove</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main id="main" className="station station--narrow">
      <header className="station-head">
        <h1 className="station-title">{mode === "signup" ? <>Open your <em>desk</em>.</> : <>Welcome <em>back</em>.</>}</h1>
        <p className="station-lede">Sign in to keep your questions and saved cases across devices, and to put your game scores on the board.</p>
      </header>

      <div className="card auth">
        <button type="button" className="btn btn--lime btn--block" onClick={handleGoogle} disabled={loading}>
          Continue with Google
        </button>

        <p className="auth-or mono muted"><span>or with email</span></p>

        <form onSubmit={handleEmailSubmit} className="auth-form">
          {mode === "signup" && (
            <div className="field">
              <label htmlFor="account-name">Full name</label>
              <input id="account-name" autoComplete="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          <div className="field">
            <label htmlFor="account-email">Email</label>
            <input id="account-email" autoComplete="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="account-password">Password</label>
            <input id="account-password" autoComplete={mode === "signup" ? "new-password" : "current-password"} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          {error && <div className="alert" role="alert">{error}</div>}
          <button type="submit" className="btn btn--light btn--block" disabled={loading}>
            {loading ? "One moment…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="auth-switch">
          {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
          <button type="button" className="text-link" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); }}>
            {mode === "signup" ? "Sign in" : "Create an account"}
          </button>
        </p>
      </div>
    </main>
  );
}
