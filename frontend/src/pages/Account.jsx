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
    } catch (_) {}
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
      <main className="page-body">
        <section className="front-page">
          <div className="kicker">YOUR DESK</div>
          <h1 className="headline">Welcome back</h1>
          <p className="deck">Signed in as {user.displayName || user.email}</p>
        </section>

        <div className="submit-box" style={{ textAlign: "center", padding: "16px" }}>
          <button className="puzzle-next" onClick={async () => { await signOutUser(); navigate("/"); }}>
            Sign Out
          </button>
        </div>

        <section className="desk-section">
          <div className="footer-heading">Search History</div>
          {history === null ? (
            <div className="related-empty">Loading...</div>
          ) : history.length === 0 ? (
            <div className="related-empty">No searches saved yet &mdash; ask something on The Docket.</div>
          ) : (
            <div className="desk-list">
              {history.map((q, i) => (
                <button key={i} className="desk-history-item" onClick={() => rerunSearch(q)}>
                  {q}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="desk-section">
          <div className="footer-heading">Favorite Cases</div>
          {favorites === null ? (
            <div className="related-empty">Loading...</div>
          ) : favorites.length === 0 ? (
            <div className="related-empty">No favorites saved yet &mdash; look for the Save button on a search result.</div>
          ) : (
            <div className="desk-list">
              {favorites.map((f) => (
                <div key={f.case_id} className="desk-favorite-item">
                  <div>
                    <div className="related-title">{f.title}</div>
                    <div className="related-citation">{f.citation}</div>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {f.source_url && (
                      <a href={f.source_url} target="_blank" rel="noreferrer" className="related-btn" style={{ textDecoration: "none" }}>
                        Read
                      </a>
                    )}
                    <button className="favorite-btn" onClick={() => removeFavorite(f.case_id)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="page-body">
      <section className="front-page">
        <div className="kicker">READER'S DESK</div>
        <h1 className="headline">{mode === "signup" ? "Create an Account" : "Sign In"}</h1>
        <p className="deck">
          Save your search history and favorite cases permanently, across any device.
        </p>
      </section>

      <div className="submit-box" style={{ padding: "24px" }}>
        <button
          type="button"
          className="puzzle-next"
          style={{ width: "100%", marginBottom: "16px" }}
          onClick={handleGoogle}
          disabled={loading}
        >
          Continue with Google
        </button>

        <div style={{ textAlign: "center", color: "var(--ink-dim)", fontSize: "12px", margin: "12px 0" }}>
          &mdash; or with email &mdash;
        </div>

        <form onSubmit={handleEmailSubmit}>
          {mode === "signup" && (
            <div className="filter-field" style={{ marginBottom: "10px" }}>
              <label>Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: "100%" }} />
            </div>
          )}
          <div className="filter-field" style={{ marginBottom: "10px" }}>
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: "100%" }} />
          </div>
          <div className="filter-field" style={{ marginBottom: "14px" }}>
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} style={{ width: "100%" }} />
          </div>
          {error && <div className="error-box" style={{ marginBottom: "14px" }}>{error}</div>}
          <button type="submit" className="puzzle-next" style={{ width: "100%" }} disabled={loading}>
            {loading ? "..." : mode === "signup" ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "16px", fontSize: "13px" }}>
          {mode === "signup" ? (
            <>Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setMode("signin"); setError(""); }}>Sign in</a></>
          ) : (
            <>New here? <a href="#" onClick={(e) => { e.preventDefault(); setMode("signup"); setError(""); }}>Create an account</a></>
          )}
        </div>
      </div>
    </main>
  );
}
