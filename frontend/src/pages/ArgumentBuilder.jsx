import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const API_URL = "https://legal-research-backend-256323345647.us-central1.run.app";

const LOADING_MESSAGES = [
  "Weighing both sides...",
  "Digging up counterarguments...",
  "Playing devil's advocate...",
  "Consulting the archives...",
];

export default function ArgumentBuilder() {
  const [position, setPosition] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [brief, setBrief] = useState("");
  const [sources, setSources] = useState([]);
  const [msgIndex, setMsgIndex] = useState(0);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!position.trim()) return;

    setLoading(true);
    setError("");
    setBrief("");
    setSources([]);

    const interval = setInterval(() => setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length), 1400);

    try {
      const res = await fetch(`${API_URL}/argument`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position }),
      });
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = await res.json();
      setBrief(data.brief);

      const uniqueSources = [];
      const seen = new Set();
      for (const s of data.sources || []) {
        if (!seen.has(s.case_id)) { seen.add(s.case_id); uniqueSources.push(s); }
      }
      setSources(uniqueSources);
    } catch (err) {
      setError(`The presses have jammed. Make sure the backend is running at ${API_URL}`);
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }

  return (
    <main className="page-body">
      <section className="front-page">
        <div className="kicker">MOOT COURT DESK</div>
        <h1 className="headline">Argument Builder</h1>
        <p className="deck">
          Describe one side of a dispute. Nyaya will find real precedents supporting it
          &mdash; and, just as importantly, the counterarguments a real opponent would raise.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="submit-box">
        <div className="submit-label">Describe Your Position</div>
        <textarea
          className="argument-textarea"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          placeholder="e.g. My client signed a lease for 3 years. The landlord wants to terminate early over a minor, curable breach. I'm arguing the termination is disproportionate and the lease should be specifically enforced."
          rows={5}
        />
        <div className="argument-submit-row">
          <button type="submit" disabled={loading}>
            {loading ? "Building..." : "Build My Argument"}
          </button>
        </div>
      </form>

      {error && <div className="error-box">{error}</div>}

      {loading && (
        <div className="printing-block">
          <div className="press-bars"><span /><span /><span /><span /><span /></div>
          <div className="press-text">{LOADING_MESSAGES[msgIndex]}</div>
        </div>
      )}

      {brief && !loading && (
        <div className="article">
          <div className="article-dateline">FROM THE MOOT COURT DESK</div>
          <div className="article-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{brief}</ReactMarkdown>
          </div>

          {sources.length > 0 && (
            <div className="clippings-section">
              <div className="section-label">Sources Consulted ({sources.length})</div>
              <div className="clippings-grid">
                {sources.map((s, i) => (
                  <div key={i} className="clipping" style={{ animationDelay: `${i * 0.06}s` }}>
                    <a
                      href={s.source_url || undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="clipping-link-wrap"
                      onClick={(e) => { if (!s.source_url) e.preventDefault(); }}
                    >
                      <div className="clipping-badge">{s.case_id}</div>
                      <div className="clipping-title">{s.title}</div>
                      <div className="clipping-citation">{s.citation}</div>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
