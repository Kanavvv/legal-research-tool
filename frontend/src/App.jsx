import { useState } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";

const API_URL = "https://legal-research-backend-256323345647.us-central1.run.app";

function App() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);

  async function handleAsk(e) {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError("");
    setAnswer("");
    setSources([]);

    try {
      const res = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }

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
      setError(
        "Couldn't reach the backend. Make sure the uvicorn server is running at " + API_URL
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="container">
        <header>
          <h1>Legal Research Tool</h1>
          <p className="subtitle">
            AI-assisted semantic search over real Indian Supreme Court judgments
          </p>
        </header>

        <form onSubmit={handleAsk} className="search-form">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a legal question, e.g. What did the court decide about specific performance of a contract?"
          />
          <button type="submit" disabled={loading}>
            {loading ? "Searching..." : "Ask"}
          </button>
        </form>

        {error && <div className="error-box">{error}</div>}

        {loading && (
          <div className="loading-box">
            Searching real judgments and generating an answer...
          </div>
        )}

        {answer && (
          <div className="answer-card">
            <h2>Answer</h2>
            <div className="answer-text">
              <ReactMarkdown>{answer}</ReactMarkdown>
            </div>
          </div>
        )}

        {sources.length > 0 && (
          <div className="sources-card">
            <h2>Sources</h2>
            {sources.map((s, i) => (
              <div key={i} className="source-item">
                <span className="source-title">{s.title}</span>
                <span className="source-citation">
                  {s.citation} &middot; {s.case_id}
                </span>
              </div>
            ))}
          </div>
        )}

        <footer>
          Educational research tool &mdash; not a substitute for professional legal advice.
        </footer>
      </div>
    </div>
  );
}

export default App;
