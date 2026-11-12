import { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Sonar from "../ui/Sonar";
import SourceList from "../ui/SourceList";
import { API_URL, apiFetch, responseError } from "../api";


const LOADING_MESSAGES = [
  "Pulling both judgments up from the wall…",
  "Reading each one's reasoning…",
  "Setting them side by side…",
  "Writing the comparison…",
];

function CasePicker({ id, label, selected, onSelect, onClear }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
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
    setSearching(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/case-search?q=${encodeURIComponent(val)}`);
        const data = await res.json();
        setResults(data.cases || []);
      } catch {
        setResults([]);
      }
      setOpen(true);
      setSearching(false);
    }, 350);
  }

  return (
    <div className="slot">
      <label className="slot-label" htmlFor={id}>{label}</label>
      {selected ? (
        <div className="slot-picked">
          <div>
            <p className="slot-title">{selected.title}</p>
            <p className="mono muted">{selected.citation}</p>
          </div>
          <button type="button" className="ghost-btn" onClick={onClear}>Change</button>
        </div>
      ) : (
        <div className="slot-search">
          <input
            id={id}
            type="text"
            className="field-input"
            placeholder="Type at least 3 letters of a case name"
            value={query}
            onChange={handleChange}
            onFocus={() => results.length > 0 && setOpen(true)}
            onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
            autoComplete="off"
            aria-expanded={open}
            aria-controls={`${id}-list`}
          />
          {searching && <span className="slot-pinging" aria-hidden="true" />}
          {open && (
            <ul id={`${id}-list`} className="slot-list">
              {results.length === 0 ? (
                <li className="muted slot-none">No judgment by that name in the index.</li>
              ) : (
                results.map((c) => (
                  <li key={c.case_id}>
                    <button type="button" onClick={() => { onSelect(c); setOpen(false); setQuery(""); }}>
                      <span>{c.title}</span>
                      <span className="mono muted">{c.citation}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
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
      const res = await apiFetch(`${API_URL}/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id_a: caseA.case_id, case_id_b: caseB.case_id }),
      });
      if (!res.ok) throw await responseError(res);

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
      setError(err?.userMessage || "We lost the line on the way down. Try the comparison again in a moment.");
    } finally {
      clearInterval(msgTimer);
      setLoading(false);
    }
  }

  async function exportWord() {
    const { exportToWord } = await import("../exportToWord");
    exportToWord({ title: "Case Comparison", markdown: result, sources, filename: "nyaya-case-comparison.docx" });
  }

  return (
    <main id="main" className="station">
      <header className="station-head">
        <h1 className="station-title">Compare two <em>judgments</em>.</h1>
        <p className="station-lede">Pick two cases. Nyaya reads both and sets out, point by point, how each court reasoned and where they part ways.</p>
      </header>

      <div className="instrument compare-rig">
        <CasePicker id="case-a" label="First judgment" selected={caseA} onSelect={setCaseA} onClear={() => setCaseA(null)} />
        <div className="compare-vs" aria-hidden="true"><span>vs</span></div>
        <CasePicker id="case-b" label="Second judgment" selected={caseB} onSelect={setCaseB} onClear={() => setCaseB(null)} />
        <div className="rig-foot">
          <button type="button" className="primary-btn" onClick={runCompare} disabled={!caseA || !caseB || loading || isStreaming}>
            {loading || isStreaming ? "Comparing…" : "Compare"}
          </button>
          {(!caseA || !caseB) && <p className="muted">Choose both judgments to start.</p>}
        </div>
      </div>

      {error && <div className="alert" role="alert">{error}</div>}
      {loading && <Sonar text={LOADING_MESSAGES[msgIndex]} />}

      {result && !loading && (
        <div className="result-grid">
          <div className="result-main">
            <article className="card answer" aria-live="polite">
              {isStreaming ? (
                <div className="answer-plain">{result}<span className="caret" aria-hidden="true" /></div>
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
              )}
            </article>
            {!isStreaming && (
              <div className="answer-actions">
                <button type="button" className="ghost-btn" onClick={exportWord}>Export to Word</button>
                <p className="disclaimer">Research help, not legal advice.</p>
              </div>
            )}
          </div>
          <SourceList title="Judgments compared" sources={sources} />
        </div>
      )}
    </main>
  );
}
