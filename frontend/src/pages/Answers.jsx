import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { API_URL } from "../api";
import { trackEvent } from "../ui/track";

// Every answer listed publicly, in one place search engines and people can browse:
// the owner's library answers and shared answers their makers chose to list.
export default function Answers() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const [text, setText] = useState(q);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    fetch(`${API_URL}/answers?limit=120${q ? `&q=${encodeURIComponent(q)}` : ""}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => { if (live) { setData(d); setError(""); } })
      .catch(() => live && setError("Couldn't load the answers right now. Please try again."));
    return () => { live = false; };
  }, [q]);

  function search(e) {
    e.preventDefault();
    setParams(text.trim() ? { q: text.trim() } : {});
  }

  return (
    <main id="main" className="station">
      <header className="station-head">
        <h1 className="station-title">Questions people <em>asked</em>.</h1>
        <p className="station-lede">Real questions about Indian law, each answered from judgments and Acts with the sources shown. Find yours, or ask your own free.</p>
      </header>

      <form className="card doc-form answers-search" onSubmit={search} role="search">
        <label htmlFor="answers-q" className="sr-only">Search answered questions</label>
        <div className="answers-search-row">
          <input id="answers-q" className="field-input" value={text} maxLength={120} onChange={(e) => setText(e.target.value)} placeholder="deposit, cheque, FIR, maintenance…" />
          <button type="submit" className="btn btn--lime btn--sm">Search</button>
        </div>
      </form>

      {error && <div className="alert" role="alert">{error}</div>}
      {!data && !error && <div className="skeleton" aria-hidden="true"><span /><span /><span /></div>}

      {data && (
        <>
          {!q && data.most_read?.length > 0 && (
            <section className="trend-section" aria-labelledby="ans-top">
              <h2 id="ans-top" className="zone-title">Most read</h2>
              <ul className="hub-questions">
                {data.most_read.map((a) => (
                  <li key={a.id}><Link to={`/a/${a.id}`} className="choice hub-q" onClick={() => trackEvent("answers_open")}>{a.question}</Link></li>
                ))}
              </ul>
            </section>
          )}
          <section className="trend-section" aria-labelledby="ans-all">
            <h2 id="ans-all" className="zone-title">{q ? `${data.total} answer${data.total === 1 ? "" : "s"} for “${q}”` : "Newest"}</h2>
            {data.answers.length === 0 ? (
              <p className="muted">Nothing answered on that yet. <Link to="/" state={{ rerunQuestion: q }} className="text-link">Ask it now</Link>, free.</p>
            ) : (
              <ul className="answers-list">
                {data.answers.map((a) => (
                  <li key={a.id}>
                    <Link to={`/a/${a.id}`} className="card answers-item" onClick={() => trackEvent("answers_open")}>
                      <span className="answers-q">{a.question}</span>
                      <span className="muted answers-snip">{a.snippet}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
      <div className="answer-actions"><Link to="/" className="btn btn--lime btn--sm">Ask your own question</Link></div>
      <p className="shared-note muted">Research help, not legal advice. Laws and judgments change; check the sources on each answer.</p>
    </main>
  );
}
