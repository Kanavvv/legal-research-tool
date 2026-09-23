import { useState } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";

const API_URL = "https://legal-research-backend-256323345647.us-central1.run.app";

const EXAMPLE_QUESTIONS = [
  "What did the court decide about specific performance of a contract?",
  "What did the court say about termination of a dealership agreement?",
  "What is the standard for judicial interference with an arbitral award?",
  "How does the court determine compensation in motor accident claims?",
];

function App() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  async function runSearch(q) {
    if (!q.trim()) return;
    setQuestion(q);
    setLoading(true);
    setError("");
    setAnswer("");
    setSources([]);
    setHasSearched(true);

    try {
      const res = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);

      const data = await res.json();
      setAnswer(data.answer);

      const uniqueSources = [];
      const seen = new Set();
      for (const s of data.sources || []) {
        if (!seen.has(s.case_id)) {
          seen.add(s.case_id);
          uniqueSources.push(s);
        }
      }
      setSources(uniqueSources);
    } catch (err) {
      setError(`Couldn't reach the research engine. Make sure the backend is running at ${API_URL}`);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    runSearch(question);
  }

  return (
    <div className="page">
      <div className="bg-glow bg-glow-1" />
      <div className="bg-glow bg-glow-2" />
      <div className="bg-grid" />

      <nav className="navbar">
        <div className="nav-inner">
          <div className="brand" onClick={() => { setHasSearched(false); setQuestion(""); setAnswer(""); setSources([]); }}>
            <ScalesIcon />
            <span className="brand-name">Nyaya</span>
          </div>
          <div className="nav-tag">AI Research over Indian Case Law</div>
        </div>
      </nav>

      <main className={`main ${hasSearched ? "main-results" : "main-hero"}`}>
        {!hasSearched && (
          <section className="hero">
            <h1 className="fade-up d1">
              Ask a legal question.<br />
              <span className="gradient-text">Get an answer grounded in real judgments.</span>
            </h1>
            <p className="hero-sub fade-up d2">
              Nyaya searches actual Indian Supreme Court judgments using semantic
              AI search, then synthesizes a cited, structured answer.
            </p>
          </section>
        )}

        <form onSubmit={handleSubmit} className={`search-bar fade-up ${!hasSearched ? "d3" : ""}`}>
          <SearchIcon />
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. What did the court decide about specific performance of a contract?"
          />
          <button type="submit" disabled={loading}>
            {loading ? <span className="pulse-dot" /> : "Ask"}
          </button>
        </form>

        {!hasSearched && (
          <div className="examples fade-up d4">
            <span className="examples-label">Try asking</span>
            <div className="chip-row">
              {EXAMPLE_QUESTIONS.map((q, i) => (
                <button key={i} className="chip" style={{ animationDelay: `${0.5 + i * 0.08}s` }} onClick={() => runSearch(q)}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <div className="error-box">{error}</div>}

        {loading && (
          <div className="skeleton-wrap">
            <div className="skeleton-line skeleton-title" />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
            <div className="skeleton-line" style={{ width: "70%" }} />
          </div>
        )}

        {answer && !loading && (
          <div className="results">
            <div className="answer-card">
              <div className="card-label">Answer</div>
              <div className="answer-text">
                <ReactMarkdown>{answer}</ReactMarkdown>
              </div>
            </div>

            {sources.length > 0 && (
              <div className="sources-section">
                <div className="card-label">Sources ({sources.length})</div>
                <div className="sources-grid">
                  {sources.map((s, i) => (
                    <div key={i} className="source-card" style={{ animationDelay: `${i * 0.07}s` }}>
                      <div className="source-badge">{s.case_id}</div>
                      <div className="source-title">{s.title}</div>
                      <div className="source-citation">{s.citation}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="footer">
        <p>
          Nyaya is an educational research tool built on real Indian Supreme Court judgments.
          It is not a substitute for professional legal advice.
        </p>
      </footer>
    </div>
  );
}

function ScalesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3V21M12 3L5 7M12 3L19 7M5 7L2 13H8L5 7ZM19 7L16 13H22L19 7ZM5 13C5 14.6569 6.34315 16 8 16C9.65685 16 11 14.6569 11 13M19 13C19 14.6569 17.6569 16 16 16C14.3431 16 13 14.6569 13 13M8 21H16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

export default App;
