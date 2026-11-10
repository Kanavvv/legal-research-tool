// The sources behind a comparison or brief, in the same card as the home page.
export default function SourceList({ title, sources }) {
  if (!sources.length) return null;
  return (
    <aside className="card sources" aria-label={title}>
      <div className="card-bar">
        <span className="mono">{title.toLowerCase()}</span>
        <span className="mono muted">{sources.length} found</span>
      </div>
      <ol className="source-list">
        {sources.map((s, i) => (
          <li key={s.case_id || i} className="source" style={{ "--i": i, "--rel": Math.max(0.3, 1 - i * 0.1) }}>
            <div className="source-top">
              <span className="source-n mono">{String(i + 1).padStart(2, "0")}</span>
              {(s.court || s.year) && <span className="mono muted">{[s.court, s.year].filter(Boolean).join(" · ")}</span>}
            </div>
            <h3 className="source-title">
              {s.source_url && s.source_url !== "nan" ? (
                <a href={s.source_url} target="_blank" rel="noreferrer">{s.title}</a>
              ) : s.title}
            </h3>
            <p className="source-cite mono">{s.citation}</p>
          </li>
        ))}
      </ol>
    </aside>
  );
}
