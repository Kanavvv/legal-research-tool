import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { linkCitations } from "../api";
import { courtWeight } from "./courtWeight";

// A finished (or streaming) answer on judgment paper, with its sources.
// Used by shared answers, document reviews and drafts.
export default function ResultView({ label = "answer", answer, sources = [], check, writing, actions }) {
  const components = {
    a({ href, children }) {
      if (href && href.startsWith("#src-")) {
        const n = Number(href.slice(5));
        return (
          <button type="button" className="cite-chip" onClick={() => document.getElementById(`src-${n}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}>
            {children}
          </button>
        );
      }
      return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
    },
  };

  return (
    <div className="result-grid">
      <article className={`card answer paper${writing ? "" : " paper--done"}`}>
        {!writing && answer && sources.length > 0 && (
          <span className="stamp" aria-hidden="true">
            <span className="stamp-top mono">nyaya</span>
            <span className="stamp-main">Cited</span>
            <span className="stamp-bot mono">{sources.length} sources</span>
          </span>
        )}
        <div className="card-bar">
          <span className="mono">{label}</span>
          <span className="pipe-status"><span className="dot" aria-hidden="true" />{writing ? "writing" : "complete"}</span>
        </div>
        {!answer ? (
          <div className="skeleton" aria-hidden="true"><span /><span /><span /><span /></div>
        ) : (
          <div className="prose">
            {writing ? (
              <div className="answer-plain">{answer}<span className="caret" aria-hidden="true" /></div>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{linkCitations(answer)}</ReactMarkdown>
            )}
          </div>
        )}
        {!writing && check && (check.invalid?.length > 0 || check.unverified?.length > 0) && (
          <p className="cite-check cite-check--warn" role="status">
            Citation check:
            {check.invalid?.length > 0 && <> {check.invalid.map((n) => `[Source ${n}]`).join(", ")} doesn't exist.</>}
            {check.unverified?.length > 0 && <> Not among the sources, so verify before relying on it: {check.unverified.join("; ")}.</>}
          </p>
        )}
        {!writing && actions}
      </article>

      <aside className="card sources" aria-label="Sources">
        <div className="card-bar">
          <span className="mono">sources</span>
          <span className="mono muted">{sources.length ? `${sources.length} cited` : ""}</span>
        </div>
        {sources.length === 0 ? (
          <p className="muted">{writing ? "Searching…" : "No sources were used."}</p>
        ) : (
          <ol className="source-list">
            {sources.map((s, i) => (
              <li key={s.case_id || i} id={`src-${i + 1}`} className="source" style={{ "--i": i, "--rel": 1 }}>
                <div className="source-top">
                  <span className="source-n mono">{String(i + 1).padStart(2, "0")}</span>
                  <span className="mono muted">{[s.doc_type === "statute" ? "Act" : s.court, s.year].filter(Boolean).join(" · ")}</span>
                </div>
                {courtWeight(s) && (
                  <p className={`court-weight court-weight--${courtWeight(s).level}`} title={courtWeight(s).long}>{courtWeight(s).short}</p>
                )}
                <h3 className="source-title">
                  {s.source_url && s.source_url !== "nan" ? <a href={s.source_url} target="_blank" rel="noreferrer">{s.title}</a> : s.title}
                </h3>
                <p className="source-cite mono">{s.citation}</p>
              </li>
            ))}
          </ol>
        )}
      </aside>
    </div>
  );
}
