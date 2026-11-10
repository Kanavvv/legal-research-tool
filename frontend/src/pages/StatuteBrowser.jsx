import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";

const API_URL = "https://legal-research-backend-256323345647.us-central1.run.app";

export default function StatuteBrowser() {
  const [acts, setActs] = useState([]);
  const [loadingActs, setLoadingActs] = useState(true);
  const [section, setSection] = useState(null);
  const [failedSectionId, setFailedSectionId] = useState(null);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionRef = useRef(null);

  // The chosen Act and section live in the URL, so a section can be linked to directly
  const actName = searchParams.get("act");
  const sectionId = searchParams.get("section");
  const act = acts.find((a) => a.name === actName) || null;

  // Derived from the URL rather than cleared in an effect: a stale section
  // is simply hidden until the newly chosen one arrives
  const shownSection = section && section.case_id === sectionId ? section : null;
  const sectionFailed = failedSectionId !== null && failedSectionId === sectionId;
  const loadingSection = !!sectionId && !shownSection && !sectionFailed;

  useEffect(() => {
    fetch(`${API_URL}/statutes`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server responded with ${res.status}`);
        return res.json();
      })
      .then((data) => setActs(data.acts || []))
      .catch(() => setError("The statute book couldn't be fetched. Please try again."))
      .finally(() => setLoadingActs(false));
  }, []);

  useEffect(() => {
    if (!sectionId) return;
    let cancelled = false;
    fetch(`${API_URL}/statutes/${encodeURIComponent(sectionId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server responded with ${res.status}`);
        return res.json();
      })
      .then((data) => !cancelled && setSection(data))
      .catch(() => !cancelled && setFailedSectionId(sectionId));
    return () => { cancelled = true; };
  }, [sectionId]);

  useEffect(() => {
    if (shownSection && sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [shownSection]);

  function chooseAct(name) {
    setFilter("");
    setSearchParams({ act: name });
  }

  function chooseSection(caseId) {
    setSearchParams({ act: actName, section: caseId });
  }

  const needle = filter.trim().toLowerCase();
  const visibleSections = act
    ? act.sections.filter((s) =>
        !needle || s.number.toLowerCase() === needle || s.heading.toLowerCase().includes(needle)
      )
    : [];

  const position = act && shownSection ? act.sections.findIndex((s) => s.case_id === shownSection.case_id) : -1;
  const prev = position > 0 ? act.sections[position - 1] : null;
  const next = position >= 0 && position < act.sections.length - 1 ? act.sections[position + 1] : null;

  return (
    <main className="page-body">
      <section className="front-page">
        <div className="kicker">THE STATUTE BOOK</div>
        <h1 className="headline">Statute Browser</h1>
        <p className="deck">Leaf through the indexed Acts section by section, from the Constitution to the Contract Act. No search query needed.</p>
      </section>

      {error && <div className="error-box" role="alert">{error}</div>}
      {sectionFailed && <div className="error-box" role="alert">That section couldn't be fetched. Please try again.</div>}

      {loadingActs && (
        <div className="printing-block">
          <div className="press-bars"><span /><span /><span /><span /><span /></div>
          <div className="press-text">Fetching the statute book...</div>
        </div>
      )}

      {!loadingActs && acts.length > 0 && (
        <div className="headlines-section" style={{ marginTop: 0 }}>
          <div className="section-label">The Acts</div>
          <div className="headlines-grid">
            {acts.map((a) => (
              <button
                key={a.name}
                className={a.name === actName ? "headline-item statute-act active" : "headline-item statute-act"}
                onClick={() => chooseAct(a.name)}
              >
                <span className="headline-tag">{a.sections.length} {a.unit.toUpperCase()}S</span>
                <span className="headline-text">{a.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {act && (
        <div className="headlines-section">
          <div className="section-label">Contents &middot; {act.name}</div>
          <input
            type="text"
            className="compare-input"
            aria-label={`Filter ${act.name} contents`}
            placeholder={`Narrow by ${act.unit.toLowerCase()} number or heading...`}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <div className="statute-contents">
            {visibleSections.map((s) => (
              <button
                key={s.case_id}
                className={s.case_id === sectionId ? "statute-row active" : "statute-row"}
                onClick={() => chooseSection(s.case_id)}
              >
                <span className="statute-row-number">{s.number}</span>
                <span className="statute-row-heading">{s.heading}</span>
              </button>
            ))}
            {visibleSections.length === 0 && (
              <div className="related-empty statute-empty">No {act.unit.toLowerCase()}s match that.</div>
            )}
          </div>
        </div>
      )}

      {loadingSection && (
        <div className="printing-block">
          <div className="press-bars"><span /><span /><span /><span /><span /></div>
          <div className="press-text">Turning to the page...</div>
        </div>
      )}

      {shownSection && (
        <div className="article" ref={sectionRef}>
          <div className="article-dateline">
            {(act ? act.unit : "Section").toUpperCase()} {shownSection.number} &middot; {shownSection.act}
          </div>
          <div className="article-body">
            <h2>{shownSection.heading}</h2>
            {shownSection.text.split("\n\n").map((para, i) => <p key={i}>{para}</p>)}
          </div>

          <div className="article-actions">
            {prev && (
              <button className="action-btn" onClick={() => chooseSection(prev.case_id)}>
                &larr; {act.unit} {prev.number}
              </button>
            )}
            {next && (
              <button className="action-btn" onClick={() => chooseSection(next.case_id)}>
                {act.unit} {next.number} &rarr;
              </button>
            )}
            {shownSection.source_url && shownSection.source_url !== "nan" && (
              <a href={shownSection.source_url} target="_blank" rel="noreferrer" className="clipping-link">Read on India Code &rarr;</a>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
