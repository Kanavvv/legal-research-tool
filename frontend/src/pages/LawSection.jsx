import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { API_URL } from "../api";
import { ACTS, sectionLabel, sectionPath } from "../lawCodes";
import { setPageMeta } from "../ui/meta";
import { forward, backward, isOldCode, isNewCode } from "../codeMap";

// One section of one Act at its own address (/law/bns/318), so search engines
// can find it and people can link to it.
export default function LawSection() {
  const { act, num } = useParams();
  // A fresh page for each section, so nothing from the last one lingers
  return <Section key={`${act}/${num}`} act={act} num={num} />;
}

function Section({ act, num }) {
  const navigate = useNavigate();
  const info = ACTS[act];
  const [section, setSection] = useState(null);
  const [error, setError] = useState("");
  const [related, setRelated] = useState(null);

  useEffect(() => {
    let live = true;
    fetch(`${API_URL}/statutes/${encodeURIComponent(`${act}_s${num}`)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        if (!live) return;
        setSection(d);
        setPageMeta({
          title: `${sectionLabel(act, num)}: ${d.heading} · ${info?.name || d.act} · Nyaya`,
          description: d.text.replace(/\s+/g, " ").slice(0, 155),
          path: sectionPath(act, num),
        });
      })
      .catch(() => live && setError("That section isn't in Nyaya's library, or the link is incomplete."));
    return () => { live = false; };
  }, [act, num, info]);

  useEffect(() => {
    if (!section) return;
    let live = true;
    fetch(`${API_URL}/search?q=${encodeURIComponent(`${section.act} section ${num} ${section.heading}`)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => live && setRelated((d?.results || []).filter((r) => !r.case_id.includes("_s")).slice(0, 4)))
      .catch(() => live && setRelated([]));
    return () => { live = false; };
  }, [section, num]);

  const next = isOldCode(act) ? forward(act, num) : null;
  const prev = isNewCode(act) ? backward(act, num) : [];
  const label = sectionLabel(act, num);

  function ask() {
    navigate("/", { state: { rerunQuestion: `Explain ${label} (${section?.heading}) in simple words, with the leading judgments on it.` } });
  }

  return (
    <main id="main" className="station">
      <header className="station-head">
        <p className="mono muted"><Link to="/statutes" className="text-link">Acts</Link> / {info?.name || act}</p>
        <h1 className="station-title">{label}{section ? <>: <em>{section.heading}</em></> : ""}</h1>
      </header>

      {error && <div className="alert" role="alert">{error}</div>}
      {!section && !error && <p className="muted">Turning to the section…</p>}

      {section && (
        <>
          {next && (
            <div className={`card code-switch code-switch--${next.status}`}>
              {next.status === "none" ? (
                <p><b>No direct counterpart in the {ACTS[next.to].short}.</b> {next.note || "The closest text is shown below; read both before relying on it."}</p>
              ) : (
                <p>
                  Replaced from 1 July 2024 by{" "}
                  <Link to={sectionPath(next.to, next.new)} className="text-link">
                    {ACTS[next.to].short} s.{next.new}{next.sub ? `(${next.sub})` : ""}: {next.new_heading}
                  </Link>
                  {next.status === "close" && <span className="muted">. Closest match by wording; read both.</span>}
                  <span className="muted"> It still applies to offences and proceedings from before that date.</span>
                </p>
              )}
            </div>
          )}
          {prev.length > 0 && (
            <div className="card code-switch">
              <p>
                Replaces{" "}
                {prev.slice(0, 4).map((p, i) => (
                  <span key={p.code + p.num}>
                    {i > 0 && ", "}
                    <Link to={sectionPath(p.code, p.num)} className="text-link">{ACTS[p.code].short} s.{p.num}</Link>
                    {p.status === "close" && <span className="muted"> (closest)</span>}
                  </span>
                ))}
                <span className="muted"> from the old code.</span>
              </p>
            </div>
          )}

          <article className="card answer statute">
            <p className="statute-where">{section.act}</p>
            {section.text.split("\n\n").map((para, i) => <p key={i}>{para}</p>)}
            <div className="answer-actions">
              <button type="button" className="btn btn--lime btn--sm" onClick={ask}>Ask Nyaya about this section</button>
              <Link to={`/statutes?act=${encodeURIComponent(section.act)}&section=${encodeURIComponent(section.case_id)}`} className="btn btn--ghost btn--sm">Browse the whole Act</Link>
              <Link to="/convert" className="btn btn--ghost btn--sm">IPC ↔ BNS converter</Link>
            </div>
          </article>

          {related && related.length > 0 && (
            <section className="law-related">
              <h2 className="zone-title">Judgments that discuss it</h2>
              <ul>
                {related.map((r) => (
                  <li key={r.case_id}>
                    <b>{r.title}</b> <span className="mono muted">{r.citation}</span>
                    <p className="muted">{r.excerpt.slice(0, 220)}…</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <p className="shared-note muted">Text as enacted, from the official Gazette or a public copy. Research help, not legal advice.</p>
        </>
      )}
    </main>
  );
}
