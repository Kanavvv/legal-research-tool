import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { authFetch } from "../authFetch";
import { useAuth } from "../AuthContext";
import TriviaGame from "../games/TriviaGame";
import LatinMatchGame from "../games/LatinMatchGame";
import VerdictGame from "../games/VerdictGame";
import OnThisDay from "../components/OnThisDay";
import Pipeline from "../ui/Pipeline";
import Reveal from "../ui/Reveal";
import Scales from "../ui/Scales";
import HeroFeatures from "../ui/HeroFeatures";
import { playSonar } from "../sound";
import { pulseCurrents, smoothScrollTo } from "../ui/motion";
import { API_URL, apiFetch, responseError, linkCitations } from "../api";
import SaveToFolder from "../ui/SaveToFolder";


const QUESTION_POOL = [
  "What did the court decide about specific performance of a contract?",
  "What did the court say about termination of a dealership agreement?",
  "What is the standard for judicial interference with an arbitral award?",
  "How does the court determine compensation in motor accident claims?",
  "What did the court say about adverse possession claims?",
  "What is the standard of proof required for a criminal conviction?",
  "How has the court interpreted the right to equality under Article 14?",
  "What factors does the court consider in child custody disputes?",
  "When is circumstantial evidence sufficient to convict someone?",
  "What constitutes wrongful termination of employment in India?",
  "What is the test for trademark infringement under Indian law?",
  "What remedies are available for deficiency in service under consumer law?",
];

const HISTORY_KEY = "nyaya-search-history";


function relevance(sources) {
  const scores = sources.map((s) => (typeof s.score === "number" ? s.score : null));
  if (scores.some((v) => v === null)) {
    return sources.map((_, i) => 1 - (i / Math.max(1, sources.length)) * 0.75);
  }
  const hi = Math.max(...scores);
  const lo = Math.min(...scores);
  return scores.map((v) => (hi === lo ? 1 : 0.25 + ((v - lo) / (hi - lo)) * 0.75));
}

function readHistory() {
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    // Older versions stored plain strings
    return raw.map((r) => (typeof r === "string" ? { q: r } : r)).filter((r) => r && r.q);
  } catch {
    return [];
  }
}

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | running | writing | done | error
  const [step, setStep] = useState(0);
  const [timings, setTimings] = useState({});
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [error, setError] = useState("");
  const [highlight, setHighlight] = useState(null);

  const [history, setHistory] = useState(readHistory);
  const [favorited, setFavorited] = useState({});
  const [relatedOpen, setRelatedOpen] = useState({});
  const [relatedData, setRelatedData] = useState({});
  const [copyStatus, setCopyStatus] = useState("");
  const [citationCopied, setCitationCopied] = useState(null);
  const [feedbackGiven, setFeedbackGiven] = useState(null);

  const [showSettings, setShowSettings] = useState(false);
  const [filterYear, setFilterYear] = useState("");
  const [filterCourt, setFilterCourt] = useState("");
  const [filterDocType, setFilterDocType] = useState("");
  const [readingLevel, setReadingLevel] = useState("standard");
  const [askHint, setAskHint] = useState("");
  const [thread, setThread] = useState([]); // earlier turns of this conversation
  const [check, setCheck] = useState(null); // the server's citation check
  const [followUp, setFollowUp] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [upgradeHint, setUpgradeHint] = useState(false);

  const timers = useRef([]);
  const resultRef = useRef(null);

  const busy = phase === "running" || phase === "writing";
  const widths = useMemo(() => relevance(sources), [sources]);
  const settingsCount = [filterYear, filterCourt, filterDocType].filter(Boolean).length;
  const pipeStatus = busy ? "running" : phase === "done" ? "answered" : phase === "error" ? "error" : "ready";

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    const rerun = location.state && location.state.rerunQuestion;
    if (rerun) {
      runSearch(rerun);
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  function saveToHistory(q, ms) {
    setHistory((prev) => {
      const updated = [{ q, ms }, ...prev.filter((h) => h.q !== q)].slice(0, 6);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch { /* storage off */ }
      return updated;
    });
    if (user) {
      authFetch(`${API_URL}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      }).catch(() => {}); // best effort; local history covers signed-out use
    }
  }

  async function runSearch(raw, opts = {}) {
    const q = raw.trim();
    if (!q || busy) return;
    const t0 = performance.now();
    const turns = opts.followUp && asked && answer ? [...thread, { q: asked, a: answer }].slice(-3) : [];
    setThread(turns);
    setCheck(null);
    setFollowUp("");
    setShareStatus("");
    setUpgradeHint(false);

    setQuestion(q);
    setAsked(q);
    setPhase("running");
    setError("");
    setAnswer("");
    setSources([]);
    setFeedbackGiven(null);
    setCopyStatus("");
    setHighlight(null);
    setTimings({});
    setStep(0);
    pulseCurrents(1);

    // The first stages run inside the server before anything streams back, so
    // the diagram paces them; measured timings arrive with the sources.
    timers.current.forEach(clearTimeout);
    timers.current = [
      setTimeout(() => setStep((s) => Math.max(s, 1)), 350),
      setTimeout(() => setStep((s) => Math.max(s, 2)), 1200),
    ];

    try {
      const res = await apiFetch(`${API_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          year: filterYear ? parseInt(filterYear, 10) : null,
          court: filterCourt || null,
          doc_type: filterDocType || null,
          level: readingLevel,
          history: turns.map((t) => ({ question: t.q, answer: t.a })),
        }),
      });
      if (!res.ok) throw await responseError(res);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let pending = "";
      let flushTimer = null;
      let wrote = false;
      let finished = false;

      const flush = () => {
        if (pending) {
          const chunk = pending;
          pending = "";
          setAnswer((prev) => prev + chunk);
        }
        flushTimer = null;
      };

      const finish = () => {
        if (finished) return;
        finished = true;
        if (flushTimer) clearTimeout(flushTimer);
        flush();
        const total = performance.now() - t0;
        setTimings((prev) => ({ ...prev, total }));
        setPhase("done");
        setStep(5);
        playSonar();
        pulseCurrents(0.6);
        saveToHistory(q, total);
      };

      const handle = (msg) => {
        if (msg.type === "sources") {
          timers.current.forEach(clearTimeout);
          const seen = new Set();
          const unique = (msg.sources || []).filter((s) => !seen.has(s.case_id) && seen.add(s.case_id));
          setSources(unique);
          // Retrieval is one server call: the time to sources covers stages 1-3
          setTimings({ 3: performance.now() - t0 });
          setStep(4);
          requestAnimationFrame(() => smoothScrollTo(resultRef.current));
        } else if (msg.type === "delta") {
          if (!wrote) {
            wrote = true;
            setPhase("writing");
            setStep(4);
          }
          pending += msg.text;
          if (!flushTimer) flushTimer = setTimeout(flush, 30);
        } else if (msg.type === "check") {
          setCheck(msg);
        } else if (msg.type === "error") {
          throw new Error(msg.detail || "stream error");
        } else if (msg.type === "done") {
          finish();
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) if (line.trim()) handle(JSON.parse(line));
      }
      if (buffer.trim()) handle(JSON.parse(buffer));
      finish();
    } catch (err) {
      timers.current.forEach(clearTimeout);
      setPhase("error");
      setUpgradeHint(!!err?.upgrade);
      setError(err?.userMessage || "We couldn't reach the index just now, so no answer came back. Check your connection and try again in a moment.");
      requestAnimationFrame(() => smoothScrollTo(resultRef.current));
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const q = question.trim();
    if (!q) { setAskHint("Type a question first, for example: can my landlord keep my deposit?"); return; }
    if (q.length < 8) { setAskHint("Add a little more detail so Nyaya knows what to look for."); return; }
    if (q.length > 600) { setAskHint("Keep it under 600 characters. Ask the core question; you can follow up after."); return; }
    setAskHint("");
    runSearch(q);
  }

  function surprise() {
    runSearch(QUESTION_POOL[Math.floor(Math.random() * QUESTION_POOL.length)]);
  }

  async function toggleRelated(caseId) {
    setRelatedOpen((prev) => ({ ...prev, [caseId]: !prev[caseId] }));
    if (relatedData[caseId] !== undefined) return;
    setRelatedData((prev) => ({ ...prev, [caseId]: "loading" }));
    try {
      const res = await fetch(`${API_URL}/graph/${encodeURIComponent(caseId)}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setRelatedData((prev) => ({ ...prev, [caseId]: data }));
    } catch {
      setRelatedData((prev) => ({ ...prev, [caseId]: null }));
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
          body: JSON.stringify({ case_id: s.case_id, title: s.title, citation: s.citation, source_url: s.source_url || "" }),
        });
      }
    } catch {
      setFavorited((prev) => ({ ...prev, [s.case_id]: isFav }));
    }
  }

  async function copyCitation(s, index) {
    try {
      await navigator.clipboard.writeText(`${s.title}, ${s.citation}.`);
      setCitationCopied(index);
      setTimeout(() => setCitationCopied(null), 1500);
    } catch { /* clipboard blocked */ }
  }

  async function shareAnswer() {
    setShareStatus("Making a link…");
    try {
      const res = await apiFetch(`${API_URL}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: asked, answer, sources }),
      });
      if (!res.ok) throw await responseError(res);
      const { id } = await res.json();
      const url = `${window.location.origin}/a/${id}`;
      try {
        if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
          await navigator.share({ title: asked, url });
          setShareStatus("Shared");
          return;
        }
      } catch { /* fall back to copying */ }
      await navigator.clipboard.writeText(url);
      setShareStatus("Link copied");
    } catch (err) {
      setShareStatus(err?.userMessage ? "Try again later" : "Couldn't share");
    }
  }

  async function copyAnswer() {
    try {
      await navigator.clipboard.writeText(`Q: ${asked}\n\n${answer}`);
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Couldn't copy");
    }
    setTimeout(() => setCopyStatus(""), 2000);
  }

  async function exportWord() {
    const { exportToWord } = await import("../exportToWord");
    exportToWord({ title: asked, markdown: answer, sources });
  }

  async function sendFeedback(value) {
    setFeedbackGiven(value);
    try {
      await fetch(`${API_URL}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: asked, helpful: value }),
      });
    } catch { /* non-critical */ }
  }

  function jumpToSource(n) {
    const el = document.getElementById(`src-${n}`);
    if (!el) return;
    setHighlight(n);
    smoothScrollTo(el, "center");
    setTimeout(() => setHighlight(null), 2200);
  }

  const markdownComponents = {
    a({ href, children }) {
      if (href && href.startsWith("#src-")) {
        const n = Number(href.slice(5));
        return (
          <button type="button" className="cite-chip" onClick={() => jumpToSource(n)}>
            {children}
          </button>
        );
      }
      return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
    },
  };

  return (
    <main id="main" className="home">
      {/* ---------- Hero ---------- */}
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-scrim" aria-hidden="true" />

        <div className="hero-copy">
          <p className="pill enter" style={{ "--d": 0 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5v13M3 14.5h10M2 5h12M2 5l-1.5 4.5a2 2 0 0 0 3 0L2 5Zm12 0-1.5 4.5a2 2 0 0 0 3 0L14 5Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Supreme Court · High Courts · Central Acts
            <span className="pill-chip">beta</span>
          </p>
          <h1 id="hero-title" className="hero-title">
            <span className="line"><span style={{ "--d": 1 }}>Indian law,</span></span>
            <span className="line"><span style={{ "--d": 2 }}>answered with</span></span>
            <span className="line"><span style={{ "--d": 3 }}><em>receipts.</em></span></span>
          </h1>
          <p className="hero-lede enter" style={{ "--d": 4 }}>
            Ask in plain English. Nyaya reads the judgments and the Acts, and every line of the
            answer points back to the passage it came from. No login, no jargon you didn't ask for.
          </p>

          <form className="ask enter" style={{ "--d": 5 }} onSubmit={handleSubmit} role="search">
            <label className="sr-only" htmlFor="home-question">Your legal question</label>
            <div className="ask-row">
              <input
                id="home-question"
                type="text"
                value={question}
                onChange={(e) => { setQuestion(e.target.value); if (askHint) setAskHint(""); }}
                aria-invalid={askHint ? true : undefined}
                aria-describedby={askHint ? "ask-hint" : undefined}
                maxLength={600}
                placeholder="Can a landlord evict a tenant without notice?"
                autoComplete="off"
              />
              <button type="submit" className="btn btn--lime" disabled={busy}>
                {busy ? "Searching…" : "Ask"}
                <span className="btn-arrow" aria-hidden="true">
                  <svg width="12" height="12" viewBox="0 0 12 12"><path d="M1.5 6h8.5M6.5 2.5 10 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </button>
            </div>

            {askHint && <p id="ask-hint" className="ask-hint" role="alert">{askHint}</p>}

            <div className="ask-tools">
              <div className="segmented" role="group" aria-label="Answer style">
                <button type="button" aria-pressed={readingLevel === "standard"} onClick={() => setReadingLevel("standard")}>Standard</button>
                <button type="button" aria-pressed={readingLevel === "simple"} onClick={() => setReadingLevel("simple")}>Explain simply</button>
              </div>
              <button type="button" className="btn btn--ghost btn--sm" aria-expanded={showSettings} aria-controls="ask-settings" onClick={() => setShowSettings((s) => !s)}>
                Filters{settingsCount > 0 ? ` · ${settingsCount}` : ""}
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={surprise} disabled={busy}>Surprise me</button>
            </div>

            {showSettings && (
              <div id="ask-settings" className="settings">
                <div className="field">
                  <label htmlFor="filter-year">Year</label>
                  <input id="filter-year" type="number" inputMode="numeric" placeholder="Any" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="filter-court">Court</label>
                  <select id="filter-court" value={filterCourt} onChange={(e) => setFilterCourt(e.target.value)}>
                    <option value="">All courts</option>
                    <option value="Supreme Court of India">Supreme Court of India</option>
                    <option value="Bombay High Court">Bombay High Court</option>
                    <option value="Delhi High Court">Delhi High Court</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="filter-doctype">Search in</label>
                  <select id="filter-doctype" value={filterDocType} onChange={(e) => setFilterDocType(e.target.value)}>
                    <option value="">Judgments and Acts</option>
                    <option value="judgment">Judgments only</option>
                    <option value="statute">Acts only</option>
                  </select>
                </div>
              </div>
            )}
          </form>

          <p className="hero-fine mono enter" style={{ "--d": 6 }}>free / no sign-up / research help, not legal advice</p>
        </div>

        <div className="hero-visual enter" style={{ "--d": 4 }}>
          <div className="seal" aria-hidden="true">
            <Scales status={pipeStatus} size={92} />
            <span className="seal-ring">
              <svg viewBox="0 0 120 120"><defs><path id="seal-path" d="M60 60 m-48 0 a48 48 0 1 1 96 0 a48 48 0 1 1 -96 0" /></defs><text><textPath href="#seal-path">nyaya · justice by reason · every claim cited · nyaya · justice by reason · every claim cited · </textPath></text></svg>
            </span>
          </div>
          <Pipeline
            step={step}
            status={pipeStatus}
            question={asked}
            timings={timings}
            log={history}
            onReplay={(q) => runSearch(q)}
          />
        </div>

        <HeroFeatures />
      </section>

      {/* ---------- Result ---------- */}
      <section ref={resultRef} className={phase === "idle" ? "result result--empty" : "result"} aria-live="polite" aria-busy={busy}>
        {phase !== "idle" && (
          <>
            <header className="result-head">
              {thread.length > 0 && (
                <ol className="thread" aria-label="Earlier in this conversation">
                  {thread.map((t, i) => (
                    <li key={i}>
                      <details>
                        <summary>{t.q}</summary>
                        <div className="thread-a">{t.a.slice(0, 900)}{t.a.length > 900 ? "…" : ""}</div>
                      </details>
                    </li>
                  ))}
                </ol>
              )}
              <p className="mono muted">{thread.length ? "and then you asked" : "you asked"}</p>
              <h2 className="result-q">{asked}</h2>
            </header>

            {error && (
              <div className="alert" role="alert">
                {error}
                {upgradeHint && <> <Link to="/pricing" className="alert-link">See Nyaya Pro</Link></>}
              </div>
            )}

            {phase !== "error" && (
              <div className="result-grid">
                <article className={`card answer paper${phase === "done" ? " paper--done" : ""}`}>
                  {phase === "done" && answer && (
                    <span className="stamp" aria-hidden="true">
                      <span className="stamp-top mono">nyaya</span>
                      <span className="stamp-main">Cited</span>
                      <span className="stamp-bot mono">{sources.length} sources</span>
                    </span>
                  )}
                  <div className="card-bar">
                    <span className="mono">answer</span>
                    <span className={`pipe-status pipe-status--${pipeStatus}`}><span className="dot" aria-hidden="true" />{phase === "done" ? "complete" : phase === "writing" ? "writing" : "searching"}</span>
                  </div>
                  {!answer && (
                    <div className="skeleton" aria-hidden="true"><span /><span /><span /><span /></div>
                  )}
                  {answer && (
                    <div className="prose">
                      {phase === "writing" ? (
                        <div className="answer-plain">{answer}<span className="caret" aria-hidden="true" /></div>
                      ) : (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                          {linkCitations(answer)}
                        </ReactMarkdown>
                      )}
                    </div>
                  )}
                  {phase === "done" && answer && (
                    <div className="answer-actions">
                      <button type="button" className="btn btn--ghost btn--sm" onClick={copyAnswer}>{copyStatus || "Copy answer"}</button>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={exportWord}>Export to Word</button>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={shareAnswer}>{shareStatus || "Share link"}</button>
                      <SaveToFolder question={asked} answer={answer} sources={sources} />
                      <div className="feedback" role="group" aria-label="Was this useful?">
                        <span className="mono muted">useful?</span>
                        <button type="button" aria-pressed={feedbackGiven === true} onClick={() => sendFeedback(true)}>Yes</button>
                        <button type="button" aria-pressed={feedbackGiven === false} onClick={() => sendFeedback(false)}>No</button>
                      </div>
                    </div>
                  )}
                  {phase === "done" && check && (check.cited.length > 0 || check.invalid.length > 0 || check.unverified.length > 0) && (
                    <p className={check.invalid.length || check.unverified.length ? "cite-check cite-check--warn" : "cite-check"} role="status">
                      {check.invalid.length || check.unverified.length ? (
                        <>
                          Citation check: {check.cited.length} of the references match the sources.
                          {check.invalid.length > 0 && <> {check.invalid.map((n) => `[Source ${n}]`).join(", ")} doesn't exist.</>}
                          {check.unverified.length > 0 && <> Not among the sources, so verify before relying on it: {check.unverified.join("; ")}.</>}
                        </>
                      ) : (
                        <>Citation check: all {check.cited.length} references point to the sources listed.</>
                      )}
                    </p>
                  )}
                  {phase === "done" && answer && (
                    <form
                      className="follow"
                      onSubmit={(e) => { e.preventDefault(); if (followUp.trim().length >= 3) runSearch(followUp, { followUp: true }); }}
                    >
                      <label htmlFor="follow-q" className="mono muted">ask a follow-up</label>
                      <div className="follow-row">
                        <input
                          id="follow-q"
                          value={followUp}
                          onChange={(e) => setFollowUp(e.target.value)}
                          placeholder="What if the tenant had paid rent late?"
                          maxLength={600}
                          autoComplete="off"
                        />
                        <button type="submit" className="btn btn--lime btn--sm" disabled={followUp.trim().length < 3}>Ask</button>
                      </div>
                    </form>
                  )}
                </article>

                <aside className="card sources" aria-label="Sources">
                  <div className="card-bar">
                    <span className="mono">sources</span>
                    <span className="mono muted">{sources.length ? `${sources.length} found` : "searching"}</span>
                  </div>
                  {sources.length === 0 && (
                    <div className="skeleton skeleton--list" aria-hidden="true"><span /><span /><span /></div>
                  )}
                  <ol className="source-list">
                    {sources.map((s, i) => (
                      <li
                        key={s.case_id}
                        id={`src-${i + 1}`}
                        className={highlight === i + 1 ? "source source--lit" : "source"}
                        style={{ "--i": i, "--rel": widths[i] }}
                      >
                        <div className="source-top">
                          <span className="source-n mono">{String(i + 1).padStart(2, "0")}</span>
                          <span className="mono muted">
                            {[s.doc_type === "statute" ? "Act" : s.court, s.year].filter(Boolean).join(" · ")}
                          </span>
                        </div>
                        {(s.cited_by_count > 0 || s.overruled_hint) && (
                          <p className="source-graph mono">
                            {s.cited_by_count > 0 && <span>cited by {s.cited_by_count} later {s.cited_by_count === 1 ? "judgment" : "judgments"}</span>}
                            {s.overruled_hint && <span className="source-warn">check: later called overruled</span>}
                          </p>
                        )}
                        <h3 className="source-title">
                          {s.source_url && s.source_url !== "nan" ? (
                            <a href={s.source_url} target="_blank" rel="noreferrer">{s.title}</a>
                          ) : s.title}
                        </h3>
                        <p className="source-cite mono">{s.citation}</p>
                        <div className="meter" aria-hidden="true"><span /></div>
                        <div className="source-actions">
                          <button type="button" onClick={() => copyCitation(s, i)}>{citationCopied === i ? "Copied" : "Copy citation"}</button>
                          <button type="button" aria-expanded={!!relatedOpen[s.case_id]} onClick={() => toggleRelated(s.case_id)}>Precedents</button>
                          <button type="button" aria-pressed={!!favorited[s.case_id]} onClick={() => toggleFavorite(s)}>
                            {favorited[s.case_id] ? "Saved" : "Save"}
                          </button>
                        </div>
                        {relatedOpen[s.case_id] && (
                          <div className="related">
                            {relatedData[s.case_id] === "loading" ? (
                              <p className="muted">Tracing citations…</p>
                            ) : !relatedData[s.case_id] || (relatedData[s.case_id].cites_count === 0 && relatedData[s.case_id].cited_by_count === 0) ? (
                              <p className="muted">No citations to or from this one in the index yet.</p>
                            ) : (
                              <>
                                {relatedData[s.case_id].overruled_mentions?.length > 0 && (
                                  <div className="related-warn">
                                    <p>Later judgments describe this as overruled near where they cite it. Read them before relying on it:</p>
                                    {relatedData[s.case_id].overruled_mentions.slice(0, 3).map((r) => (
                                      <p key={r.case_id} className="related-item"><span>{r.title}</span><span className="mono muted">{r.citation}</span></p>
                                    ))}
                                  </div>
                                )}
                                {relatedData[s.case_id].cited_by_count > 0 && (
                                  <>
                                    <p className="related-head mono">cited by {relatedData[s.case_id].cited_by_count} · newest first</p>
                                    {relatedData[s.case_id].cited_by.slice(0, 5).map((r) => (
                                      <p key={r.case_id} className="related-item"><span>{r.title}</span><span className="mono muted">{r.citation}</span></p>
                                    ))}
                                  </>
                                )}
                                {relatedData[s.case_id].cites_count > 0 && (
                                  <>
                                    <p className="related-head mono">relies on {relatedData[s.case_id].cites_count}</p>
                                    {relatedData[s.case_id].cites.slice(0, 5).map((r) => (
                                      <p key={r.case_id} className="related-item"><span>{r.title}</span><span className="mono muted">{r.citation}</span></p>
                                    ))}
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                </aside>
              </div>
            )}
            <p className="fine mono">Research help, not legal advice. Check the judgment before you rely on it.</p>
          </>
        )}
      </section>

      {/* ---------- Tools ---------- */}
      <section className="block" aria-labelledby="tools-title">
        <Reveal className="block-head">
          <div>
            <p className="pill"><span className="dot" aria-hidden="true" />tools</p>
            <h2 id="tools-title" className="block-title">Most of research is <em>reading</em>.</h2>
          </div>
          <p className="block-lede">
            Finding the right judgment is half the work. Then you compare it, argue from it and go back to the Act.
            Nyaya does the reading with you.
          </p>
        </Reveal>

        <div className="bento">
          <Reveal as={Link} to="/compare" className="card tool tool--wide" style={{ "--i": 0 }}>
            <div className="tool-copy">
              <h3>Compare two judgments</h3>
              <p>Pick any two cases. See how each court reasoned and exactly where they part ways.</p>
            </div>
            <div className="mini mini--compare" aria-hidden="true">
              <div className="mini-case"><span className="mono">case a</span><span className="mini-line" /><span className="mini-line mini-line--short" /></div>
              <span className="mini-vs mono">vs</span>
              <div className="mini-case"><span className="mono">case b</span><span className="mini-line" /><span className="mini-line mini-line--short" /></div>
            </div>
            <span className="tool-go mono">open compare</span>
          </Reveal>

          <Reveal as={Link} to="/argument-builder" className="card tool" style={{ "--i": 1 }}>
            <div className="tool-copy">
              <h3>Build an argument</h3>
              <p>Describe your side. Get the precedents for it and the ones your opponent will raise.</p>
            </div>
            <div className="mini mini--bars" aria-hidden="true">
              <div><span className="mono">for</span><span className="bar" style={{ "--w": "78%" }} /></div>
              <div><span className="mono">against</span><span className="bar bar--dim" style={{ "--w": "52%" }} /></div>
            </div>
            <span className="tool-go mono">open argument</span>
          </Reveal>

          <Reveal as={Link} to="/statutes" className="card tool" style={{ "--i": 2 }}>
            <div className="tool-copy">
              <h3>Read the Acts</h3>
              <p>Every indexed Act, section by section, each with a link you can share.</p>
            </div>
            <div className="mini mini--rows" aria-hidden="true">
              <span><b className="mono">§ 10</b><i /></span>
              <span><b className="mono">§ 23</b><i /></span>
              <span className="on"><b className="mono">§ 73</b><i /></span>
            </div>
            <span className="tool-go mono">open statutes</span>
          </Reveal>

          <OnThisDay />
        </div>
      </section>

      {/* ---------- Games ---------- */}
      <section id="games" className="block" aria-labelledby="games-title">
        <Reveal className="block-head">
          <div>
            <p className="pill"><span className="dot" aria-hidden="true" />games</p>
            <h2 id="games-title" className="block-title">Learn the law in <em>short bursts</em>.</h2>
          </div>
          <p className="block-lede">Three quick games. Sign in to keep a daily streak and get on the leaderboard.</p>
        </Reveal>
        <div className="games">
          <TriviaGame />
          <LatinMatchGame />
          <VerdictGame />
        </div>
      </section>
    </main>
  );
}
