import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import Sonar from "../ui/Sonar";
import { prefersReducedMotion } from "../ui/motion";
import { API_URL } from "../api";


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
      .catch(() => setError("The Acts couldn't be brought up just now. Please try again in a moment."))
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
      sectionRef.current.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
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
    <main id="main" className="station">
      <header className="station-head">
        <h1 className="station-title">Read the <em>Acts</em>.</h1>
        <p className="station-lede">Go through each indexed Act section by section, from the Constitution to the Contract Act. No question needed; every section has its own link.</p>
      </header>

      {error && <div className="alert" role="alert">{error}</div>}
      {sectionFailed && <div className="alert" role="alert">That section couldn't be fetched. Please try again.</div>}
      {loadingActs && <Sonar text="Bringing up the Acts…" />}

      {!loadingActs && acts.length > 0 && (
        <section aria-labelledby="acts-title">
          <h2 id="acts-title" className="zone-title">The Acts</h2>
          <div className="acts">
            {acts.map((a, i) => (
              <button
                key={a.name}
                type="button"
                style={{ "--i": i }}
                className={a.name === actName ? "act act--on" : "act"}
                aria-pressed={a.name === actName}
                onClick={() => chooseAct(a.name)}
              >
                <span className="act-count">{a.sections.length} {a.unit.toLowerCase()}s</span>
                <span className="act-name">{a.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {act && (
        <div className={shownSection || loadingSection ? "reader reader--open" : "reader"}>
          <section className="contents" aria-labelledby="contents-title">
            <h2 id="contents-title" className="zone-title">Contents of {act.name}</h2>
            <label className="sr-only" htmlFor="contents-filter">Filter {act.name} contents</label>
            <input
              id="contents-filter"
              type="text"
              className="field-input"
              placeholder={`Filter by ${act.unit.toLowerCase()} number or heading`}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <div className="contents-list">
              {visibleSections.map((s) => (
                <button
                  key={s.case_id}
                  type="button"
                  className={s.case_id === sectionId ? "contents-row contents-row--on" : "contents-row"}
                  aria-current={s.case_id === sectionId ? "true" : undefined}
                  onClick={() => chooseSection(s.case_id)}
                >
                  <span className="contents-n">{s.number}</span>
                  <span>{s.heading}</span>
                </button>
              ))}
              {visibleSections.length === 0 && <p className="muted">No {act.unit.toLowerCase()}s match that.</p>}
            </div>
          </section>

          <div className="reader-page">
            {loadingSection && <Sonar text="Turning to the section…" />}
            {shownSection && (
              <article className="card answer statute" ref={sectionRef}>
                <p className="statute-where">{act ? act.unit : "Section"} {shownSection.number} · {shownSection.act}</p>
                <h2>{shownSection.heading}</h2>
                {shownSection.text.split("\n\n").map((para, i) => <p key={i}>{para}</p>)}
                <div className="answer-actions">
                  {prev && (
                    <button type="button" className="ghost-btn" onClick={() => chooseSection(prev.case_id)}>
                      Previous: {act.unit} {prev.number}
                    </button>
                  )}
                  {next && (
                    <button type="button" className="ghost-btn" onClick={() => chooseSection(next.case_id)}>
                      Next: {act.unit} {next.number}
                    </button>
                  )}
                  {shownSection.source_url && shownSection.source_url !== "nan" && (
                    <a href={shownSection.source_url} target="_blank" rel="noreferrer" className="text-link">Read on India Code</a>
                  )}
                </div>
              </article>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
