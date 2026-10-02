import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { exportToWord } from "../exportToWord";

const API_URL = "https://legal-research-backend-256323345647.us-central1.run.app";

const LOADING_MESSAGES = [
  "Pulling both files...",
  "Reading the fine print...",
  "Weighing one against the other...",
  "Drafting the comparison...",
];

function CasePicker({ label, selected, onSelect, onClear }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const timer = useRef(null);

  function handleChange(e) {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timer.current);
    if (val.trim().length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/case-search?q=${encodeURIComponent(val)}`);
        const data = await res.json();
        setResults(data.cases || []);
        setOpen(true);
      } catch (_) {
        setResults([]);
      }
    }, 350);
  }

  if (selected) {
    return (
      <div className="compare-slot">
        <div className="compare-slot-label">{label}</div>
        <div className="compare-selected">
          <div>
            <div className="related-title">{selected.title}</div>
            <div className="related-citation">{selected.citation}</div>
          </div>
          <button className="favorite-btn" onClick={onClear}>Change</button>
        </div>
      </div>
    );
  }

  return (
    <div className="compare-slot">
      <div className="compare-slot-label">{label}</div>
      <input
        type="text"
        placeholder="Search for a case by name..."
        value={query}
        onChange={handleChange}
        onFocus={() => results.length > 0 && setOpen(true)}
        className="compare-input"
      />
      {open && results.length > 0 && (
        <div className="compare-dropdown">
          {results.map((c) => (
            <button
              key={c.case_id}
              className="compare-dropdown-item"
              onClick={() => { onSelect(c); setOpen(false); setQuery(""); }}
            >
              <span className="related-title">{c.title}</span>
              <span className="related-citation">{c.citation}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CompareCases() {
  const [caseA, setCaseA] = useState(null);
  const [caseB, setCaseB] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);
  const [result, setResult] = useState("");
  const [sources, setSources] = useState([]);
  const [error, setError] = useState("");

  async function runCompare() {
    if (!caseA || !caseB) return;
    setLoading(true);
    setIsStreaming(false);
    setResult("");
    setSources([]);
    setError("");
    setMsgIndex(0);
    const msgTimer = setInterval(() => setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length), 2200);

    try {
      const res = await fetch(`${API_URL}/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id_a: caseA.case_id, case_id_b: caseB.case_id }),
      });
      if (!res.ok) {
        let detail = `Server responded with ${res.status}`;
        try { const d = await res.json(); if (d.detail) detail = d.detail; } catch (_) {}
        throw new Error(detail);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let pendingText = "";
      let flushTimer = null;
      let gotFirst = false;

      function flush() {
        if (pendingText) {
          const chunk = pendingText;
          pendingText = "";
          setResult((prev) => prev + chunk);
        }
        flushTimer = null;
      }
      function schedule() {
        if (!flushTimer) flushTimer = setTimeout(flush, 30);
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (flushTimer) clearTimeout(flushTimer);
          flush();
          setIsStreaming(false);
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          const msg = JSON.parse(line);
          if (msg.type === "sources") {
            setSources(msg.sources || []);
          } else if (msg.type === "delta") {
            if (!gotFirst) { gotFirst = true; setLoading(false); setIsStreaming(true); }
            pendingText += msg.text;
            schedule();
          } else if (msg.type === "error") {
            throw new Error(msg.detail);
          } else if (msg.type === "done") {
            if (flushTimer) clearTimeout(flushTimer);
            flush();
            setIsStreaming(false);
          }
        }
      }
    } catch (err) {
      setError("The presses have jammed. Please try again.");
    } finally {
      clearInterval(msgTimer);
      setLoading(false);
    }
  }

  return (
    <main className="page-body">
      <section className="front-page">
        <div className="kicker">SIDE BY SIDE</div>
        <h1 className="headline">Compare Two Cases</h1>
        <p className="deck">Pick two judgments and get a structured, side-by-side comparison of how they reasoned and ruled.</p>
      </section>

      <div className="submit-box" style={{ padding: "24px" }}>
        <CasePicker label="Case One" selected={caseA} onSelect={setCaseA} onClear={() => setCaseA(null)} />
        <div style={{ height: "14px" }} />
        <CasePicker label="Case Two" selected={caseB} onSelect={setCaseB} onClear={() => setCaseB(null)} />
        <div style={{ textAlign: "center", marginTop: "18px" }}>
          <button className="puzzle-next" onClick={runCompare} disabled={!caseA || !caseB || loading}>
            {loading ? "..." : "Compare"}
          </button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      {loading && (
        <div className="printing-block">
          <div className="press-bars"><span /><span /><span /><span /><span /></div>
          <div className="press-text">{LOADING_MESSAGES[msgIndex]}</div>
        </div>
      )}

      {result && !loading && (
        <div className="article">
          <div className="article-dateline">FROM THE LAW DESK</div>
          <div className="article-body">
            {isStreaming ? (
              <div className="article-plain">{result}</div>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
            )}
          </div>

          {!isStreaming && (
            <div className="article-actions">
              <button
                className="action-btn"
                onClick={() => exportToWord({ title: "Case Comparison", markdown: result, sources, filename: "nyaya-case-comparison.docx" })}
              >
                Export to Word
              </button>
            </div>
          )}

          {sources.length > 0 && (
            <div className="clippings-section">
              <div className="section-label">Cases Compared</div>
              <div className="clippings-grid">
                {sources.map((s, i) => (
                  <div key={i} className="clipping" style={{ animationDelay: `${i * 0.06}s` }}>
                    <div className="clipping-citation">{s.citation}</div>
                    <div className="clipping-title">{s.title}</div>
                    {s.source_url && s.source_url !== "nan" && (
                      <a href={s.source_url} target="_blank" rel="noreferrer" className="clipping-link">Read full judgment &rarr;</a>
                    )}
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
