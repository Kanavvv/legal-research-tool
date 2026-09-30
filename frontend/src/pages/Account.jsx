import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { useAuth } from "../AuthContext";

export default function Account() {
  const { user, signOutUser } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
        <div className="submit-box" style={{ textAlign: "center", padding: "20px" }}>
          <button
            className="puzzle-next"
            onClick={async () => { await signOutUser(); navigate("/"); }}
          >
            Sign Out
          </button>
        </div>
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
