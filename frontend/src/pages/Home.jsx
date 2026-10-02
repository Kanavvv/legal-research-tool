import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { authFetch } from "../authFetch";
import { useAuth } from "../AuthContext";
import TriviaGame from "../games/TriviaGame";
import LatinMatchGame from "../games/LatinMatchGame";
import VerdictGame from "../games/VerdictGame";
import { playStamp } from "../sound";

const API_URL = "https://legal-research-backend-256323345647.us-central1.run.app";

const EXAMPLE_QUESTIONS = [
  { tag: "CONTRACTS", q: "What did the court decide about specific performance of a contract?" },
  { tag: "COMMERCIAL", q: "What did the court say about termination of a dealership agreement?" },
  { tag: "ARBITRATION", q: "What is the standard for judicial interference with an arbitral award?" },
  { tag: "TORTS", q: "How does the court determine compensation in motor accident claims?" },
];

const SURPRISE_POOL = [
  ...EXAMPLE_QUESTIONS,
  { tag: "PROPERTY", q: "What did the court say about adverse possession claims?" },
  { tag: "CRIMINAL", q: "What is the standard of proof required for a criminal conviction?" },
  { tag: "CONSTITUTIONAL", q: "How has the court interpreted the right to equality under Article 14?" },
  { tag: "FAMILY LAW", q: "What factors does the court consider in child custody disputes?" },
];

const HISTORY_KEY = "nyaya-search-history";

const LOADING_MESSAGES = [
  "Setting the type...",
  "Consulting the archives...",
  "The presses are running...",
  "Fact-checking with the bench...",
  "Inking the final draft...",
];

function SearchIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

export default function Home() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [answer, setAnswer] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [favorited, setFavorited] = useState({}); // case_id -> true/false
  const [relatedOpen, setRelatedOpen] = useState({});
  const [relatedData, setRelatedData] = useState({});

  async function toggleRelated(caseId) {
    setRelatedOpen((prev) => ({ ...prev, [caseId]: !prev[caseId] }));
    if (relatedData[caseId] !== undefined) return; // already fetched
    setRelatedData((prev) => ({ ...prev, [caseId]: "loading" }));
    try {
      const res = await fetch(`${API_URL}/related/${encodeURIComponent(caseId)}`);
      const data = await res.json();
      setRelatedData((prev) => ({ ...prev, [caseId]: data.related || [] }));
    } catch (_) {
      setRelatedData((prev) => ({ ...prev, [caseId]: [] }));
    }
  }
  const [sources, setSources] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [stampKey, setStampKey] = useState(0);
  const [history, setHistory] = useState([]);
  const [copyStatus, setCopyStatus] = useState("");
  const [feedbackGiven, setFeedbackGiven] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterYear, setFilterYear] = useState("");
  const [filterCourt, setFilterCourt] = useState("");
  const [filterDocType, setFilterDocType] = useState("");
  const [readingLevel, setReadingLevel] = useState("standard");
  const [citationCopied, setCitationCopied] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      setHistory(saved);
    } catch (e) {}
  }, []);

  function saveToHistory(q) {
    setHistory((prev) => {
      const updated = [q, ...prev.filter((h) => h !== q)].slice(0, 5);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch (e) {}
      return updated;
    });
    if (user) {
      authFetch(`${API_URL}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      }).catch(() => {}); // best-effort, local history already covers the offline/signed-out case
    }
  }

  async function toggleFavorite(s) {
    if (!user) {
      navigate("/account");
      return;
    }
    const isFav = favorited[s.case_id];
    setFavorited((prev) => ({ ...prev, [s.case_id]: !isFav }));
    try {
      if (isFav) {
        await authFetch(`${API_URL}/favorites/${encodeURIComponent(s.case_id)}`, { method: "DELETE" });
      } else {
        await authFetch(`${API_URL}/favorites`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            case_id: s.case_id, title: s.title, citation: s.citation, source_url: s.source_url || "",
          }),
        });
      }
    } catch (_) {
      setFavorited((prev) => ({ ...prev, [s.case_id]: isFav })); // revert on failure
    }
  }

  useEffect(() => {
    const rerun = location.state && location.state.rerunQuestion;
    if (rerun) {
      setQuestion(rerun);
      runSearch(rerun);
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  useEffect(() => {
    if (loading) {
      setLoadingMsgIndex(0);
      intervalRef.current = setInterval(() => {
        setLoadingMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
      }, 1400);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [loading]);

  async function runSearch(q) {
    if (!q.trim()) return;
    setQuestion(q);
    setLoading(true);
    setError("");
    setAnswer("");
    setIsStreaming(false);
    setSources([]);
    setHasSearched(true);
    setFeedbackGiven(null);
    setCopyStatus("");

    try {
      const res = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          year: filterYear ? parseInt(filterYear) : null,
          court: filterCourt || null,
          doc_type: filterDocType || null,
          level: readingLevel,
        }),
      });

      if (!res.ok) {
        let detail = `Server responded with ${res.status}`;
        try {
          const errData = await res.json();
          if (errData.detail) detail = errData.detail;
        } catch (_) {}
        throw new Error(detail);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let gotFirstContent = false;
      let pendingText = "";
      let flushTimer = null;

      function flushPending() {
        if (pendingText) {
          const chunk = pendingText;
          pendingText = "";
          setAnswer((prev) => prev + chunk);
        }
        flushTimer = null;
      }

      function scheduleFlush() {
        if (!flushTimer) {
          flushTimer = setTimeout(flushPending, 30);
        }
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (flushTimer) clearTimeout(flushTimer);
          flushPending();
          if (buffer.trim()) {
            try {
              const msg = JSON.parse(buffer);
              if (msg.type === "delta") setAnswer((prev) => prev + msg.text);
            } catch (_) {}
          }
          setIsStreaming(false);
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // last (possibly incomplete) line stays in the buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          const msg = JSON.parse(line);

          if (msg.type === "sources") {
            const uniqueSources = [];
            const seen = new Set();
            for (const s of msg.sources || []) {
              if (!seen.has(s.case_id)) {
                seen.add(s.case_id);
                uniqueSources.push(s);
              }
            }
            setSources(uniqueSources);
          } else if (msg.type === "delta") {
            if (!gotFirstContent) {
              gotFirstContent = true;
              setLoading(false); // reveal the article box now, text will keep growing
              setIsStreaming(true);
            }
            pendingText += msg.text;
            scheduleFlush();
          } else if (msg.type === "error") {
            throw new Error(msg.detail || "Something went wrong while writing the answer.");
          } else if (msg.type === "done") {
            if (flushTimer) clearTimeout(flushTimer);
            flushPending();
            setIsStreaming(false);
            setStampKey((k) => k + 1);
            setTimeout(() => playStamp(), 150);
            saveToHistory(q);
          }
        }
      }
    } catch (err) {
      setError(`The presses have jammed. Make sure the backend is running at ${API_URL}`);
    } finally {
      setLoading(false);
      setIsStreaming(false);
    }
  }

  async function copyCitation(s, index) {
    const formatted = `${s.title}, ${s.citation}.`;
    try {
      await navigator.clipboard.writeText(formatted);
      setCitationCopied(index);
      setTimeout(() => setCitationCopied(null), 1500);
    } catch (e) {}
  }

  function handleSubmit(e) {
    e.preventDefault();
    runSearch(question);
  }

  function surpriseMe() {
    const pick = SURPRISE_POOL[Math.floor(Math.random() * SURPRISE_POOL.length)];
    runSearch(pick.q);
  }

  async function copyAnswer() {
    try {
      await navigator.clipboard.writeText(`Q: ${question}\n\n${answer}`);
      setCopyStatus("Copied to clipboard");
      setTimeout(() => setCopyStatus(""), 2000);
    } catch (e) {
      setCopyStatus("Couldn't copy");
    }
  }

  async function sendFeedback(value) {
    setFeedbackGiven(value);
    try {
      await fetch(`${API_URL}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, helpful: value }),
      });
    } catch (e) {
      // non-critical, fail silently
    }
  }

  return (
    <main className="page-body">
      {!hasSearched && (
        <section className="front-page">
          <div className="kicker">TODAY'S LEAD STORY</div>
          <h1 className="headline">
            Ask a legal question.<br />We'll fetch the verdict.
          </h1>
          <p className="deck">
            Nyaya searches real Indian Supreme Court judgments using semantic AI search,
            then files a cited, structured answer &mdash; not a guess, a grounded report.
          </p>
        </section>
      )}

      <form onSubmit={handleSubmit} className="submit-box">
        <div className="submit-label">Submit Your Query</div>
        <div className="submit-row">
          <SearchIcon />
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. What did the court decide about specific performance of a contract?"
          />
          <button type="submit" disabled={loading}>
            {loading ? "Filing..." : "Submit"}
          </button>
        </div>
      </form>

      <div className="filters-row">
        <button type="button" className="filters-toggle" onClick={() => setShowFilters((s) => !s)}>
          {showFilters ? "Hide filters" : "+ Narrow your search"}
        </button>
        <div className="level-toggle">
          <button
            className={readingLevel === "standard" ? "level-btn active" : "level-btn"}
            onClick={() => setReadingLevel("standard")}
          >Standard</button>
          <button
            className={readingLevel === "simple" ? "level-btn active" : "level-btn"}
            onClick={() => setReadingLevel("simple")}
          >Explain Simply</button>
        </div>
        {showFilters && (
          <div className="filters-panel">
            <div className="filter-field">
              <label>Year</label>
              <input
                type="number"
                placeholder="e.g. 2023"
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
              />
            </div>
            <div className="filter-field">
              <label>Court</label>
              <select value={filterCourt} onChange={(e) => setFilterCourt(e.target.value)}>
                <option value="">All Courts</option>
                <option value="Supreme Court of India">Supreme Court of India</option>
                <option value="Bombay High Court">Bombay High Court</option>
              </select>
            </div>
            <div className="filter-field">
              <label>Type</label>
              <select value={filterDocType} onChange={(e) => setFilterDocType(e.target.value)}>
                <option value="">Case Law &amp; Statutes</option>
                <option value="judgment">Case Law Only</option>
                <option value="statute">Statutes Only</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {!hasSearched && (
        <div className="headlines-section">
          <div className="section-label-row">
            <div className="section-label">In Today's Edition</div>
            <button className="surprise-btn" onClick={surpriseMe}>Surprise Me &#127775;</button>
          </div>
          <div className="headlines-grid">
            {EXAMPLE_QUESTIONS.map((item, i) => (
              <button key={i} className="headline-item" onClick={() => runSearch(item.q)}>
                <span className="headline-tag">{item.tag}</span>
                <span className="headline-text">{item.q}</span>
              </button>
            ))}
          </div>

          {history.length > 0 && (
            <div className="recent-searches">
              <div className="section-label">Back Issues You've Read</div>
              <div className="recent-chips">
                {history.map((h, i) => (
                  <button key={i} className="recent-chip" onClick={() => runSearch(h)}>{h}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      {loading && (
        <div className="printing-block">
          <div className="press-bars">
            <span /><span /><span /><span /><span />
          </div>
          <div className="press-text">{LOADING_MESSAGES[loadingMsgIndex]}</div>
        </div>
      )}

      {answer && !loading && (
        <div className="article" key={stampKey}>
          <div className="article-dateline">FROM THE LAW DESK</div>
          <div className="article-body">
            <div className="stamp">On the<br />Record</div>
            {isStreaming ? (
              <div className="article-plain">{answer}</div>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
            )}
          </div>

          {sources.length > 0 && (
            <div className="clippings-section">
              <div className="section-label">Related Clippings ({sources.length})</div>
              <div className="clippings-grid">
                {sources.map((s, i) => (
                  <div key={i} className="clipping" style={{ animationDelay: `${i * 0.08}s` }}>
                    <a
                      href={s.source_url || undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="clipping-link-wrap"
                      style={{ cursor: s.source_url ? "pointer" : "default" }}
                      onClick={(e) => { if (!s.source_url) e.preventDefault(); }}
                    >
                      <div className="clipping-badge">{s.case_id}</div>
                      <div className="clipping-title">{s.title}</div>
                      <div className="clipping-citation">{s.citation}</div>
                      {s.source_url && <div className="clipping-link">Read full judgment &rarr;</div>}
                    </a>
                    <button className="cite-btn" onClick={() => copyCitation(s, i)}>
                      {citationCopied === i ? "Copied!" : "Copy Citation"}
                    </button>
                    <button className="related-btn" onClick={() => toggleRelated(s.case_id)}>
                      {relatedOpen[s.case_id] ? "Hide Related Cases" : "Related Cases"}
                    </button>
                    <button className="favorite-btn" onClick={() => toggleFavorite(s)}>
                      {favorited[s.case_id] ? "\u2605 Saved" : "\u2606 Save"}
                    </button>
                    {relatedOpen[s.case_id] && (
                      <div className="related-list">
                        {relatedData[s.case_id] === "loading" ? (
                          <div className="related-empty">Checking the index...</div>
                        ) : relatedData[s.case_id] && relatedData[s.case_id].length > 0 ? (
                          relatedData[s.case_id].map((r, j) => (
                            <div key={j} className="related-item">
                              <span className="related-title">{r.title}</span>
                              <span className="related-citation">{r.citation}</span>
                            </div>
                          ))
                        ) : (
                          <div className="related-empty">No related cases found in the corpus yet.</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="article-actions">
            <button className="action-btn" onClick={copyAnswer}>
              {copyStatus || "Copy this report"}
            </button>
            <div className="feedback-row">
              <span>Useful?</span>
              <button
                className={`feedback-btn ${feedbackGiven === true ? "active" : ""}`}
                onClick={() => sendFeedback(true)}
              >Yes</button>
              <button
                className={`feedback-btn ${feedbackGiven === false ? "active" : ""}`}
                onClick={() => sendFeedback(false)}
              >No</button>
            </div>
          </div>
        </div>
      )}

      <div className="games-section">
        <div className="games-divider">
          <span>While You're Here</span>
        </div>
        <p className="games-intro">Three small legal puzzles, for readers who somehow still want more.</p>
        <TriviaGame />
        <LatinMatchGame />
        <VerdictGame />
      </div>
    </main>
  );
}
