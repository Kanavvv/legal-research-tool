import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Sonar from "../ui/Sonar";
import SourceList from "../ui/SourceList";
import { API_URL, apiFetch, responseError } from "../api";


const LOADING_MESSAGES = [
  "Looking for precedents on your side…",
  "Looking for the ones against you…",
  "Weighing both sides…",
  "Drafting the brief…",
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
      const res = await apiFetch(`${API_URL}/argument`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position }),
      });
      if (!res.ok) throw await responseError(res);
      const data = await res.json();
      setBrief(data.brief);

      const uniqueSources = [];
      const seen = new Set();
      for (const s of data.sources || []) {
        if (!seen.has(s.case_id)) { seen.add(s.case_id); uniqueSources.push(s); }
      }
      setSources(uniqueSources);
    } catch (err) {
      setError(err?.userMessage || "We couldn't build your argument just now. Check your connection and try again in a moment.");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }

  async function exportWord() {
    const { exportToWord } = await import("../exportToWord");
    exportToWord({ title: "Moot Court Brief", markdown: brief, sources, filename: "nyaya-moot-court-brief.docx" });
  }

  return (
    <main id="main" className="station">
      <header className="station-head">
        <h1 className="station-title">Build your <em>argument</em>.</h1>
        <p className="station-lede">
          Describe one side of a dispute. Nyaya finds real precedents that support it, and the counterarguments
          your opponent will raise, so you walk into the moot court ready for both.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="instrument">
        <label className="slot-label" htmlFor="argument-position">Your position</label>
        <textarea
          id="argument-position"
          className="field-input field-input--area"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          placeholder="My client signed a three-year lease. The landlord wants to end it early over a small breach that can be fixed. I'm arguing termination is disproportionate."
          rows={5}
        />
        <div className="rig-foot">
          <button type="submit" className="primary-btn" disabled={loading || !position.trim()}>
            {loading ? "Building…" : "Build the brief"}
          </button>
          <p className="muted">{position.trim().split(/\s+/).filter(Boolean).length} words</p>
        </div>
      </form>

      {error && <div className="alert" role="alert">{error}</div>}
      {loading && <Sonar text={LOADING_MESSAGES[msgIndex]} />}

      {brief && !loading && (
        <div className="result-grid">
          <div className="result-main">
            <article className="card answer">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{brief}</ReactMarkdown>
            </article>
            <div className="answer-actions">
              <button type="button" className="ghost-btn" onClick={exportWord}>Export to Word</button>
              <p className="disclaimer">A practice brief for study and moots, not legal advice.</p>
            </div>
          </div>
          <SourceList title="Sources consulted" sources={sources} />
        </div>
      )}
    </main>
  );
}
