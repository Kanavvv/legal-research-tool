import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { API_URL, apiFetch, readStream, responseError, getLang } from "../api";
import ResultView from "../ui/ResultView";
import LangToggle from "../components/LangToggle";
import { CasePicker } from "./CompareCases";
import { QUIZ } from "../data/quiz";
import { sectionLabel, sectionPath } from "../lawCodes";
import { PRO_ON } from "../config";

const TABS = [
  { id: "brief", label: "Case brief" },
  { id: "moot", label: "Moot practice" },
  { id: "quiz", label: "Quiz" },
];

function errorText(err) {
  return err?.userMessage || "That didn't go through. Check your connection and try again.";
}

function Brief() {
  const [picked, setPicked] = useState(null);
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [check, setCheck] = useState(null);
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState("");
  const [upgrade, setUpgrade] = useState(false);

  async function run() {
    if (!picked || phase === "writing") return;
    setError(""); setUpgrade(false); setAnswer(""); setSources([]); setCheck(null); setPhase("writing");
    try {
      const res = await apiFetch(`${API_URL}/brief`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: picked.case_id, lang: getLang() }),
      });
      if (!res.ok) throw await responseError(res);
      let text = "";
      await readStream(res, (m) => {
        if (m.type === "sources") setSources(m.sources || []);
        else if (m.type === "delta") { text += m.text; setAnswer(text); }
        else if (m.type === "check") setCheck(m);
      });
      setPhase("done");
    } catch (err) {
      setPhase("error"); setError(errorText(err)); setUpgrade(!!err?.upgrade);
    }
  }

  return (
    <>
      <div className="card doc-form">
        <CasePicker id="brief-case" label="The judgment" selected={picked} onSelect={setPicked} onClear={() => setPicked(null)} />
        <p className="muted">Get facts, issues, arguments, holding, reasoning and ratio, written from the judgment's own text.</p>
        {error && <div className="alert" role="alert">{error}{upgrade && PRO_ON && <> <Link to="/pricing" className="alert-link">See Nyaya Pro</Link></>}</div>}
        <div className="doc-submit">
          <button type="button" className="btn btn--lime" onClick={run} disabled={!picked || phase === "writing"}>{phase === "writing" ? "Writing the brief…" : "Write the brief"}</button>
          <LangToggle />
        </div>
      </div>
      {(phase === "writing" || phase === "done") && (
        <section className="result" aria-live="polite">
          <ResultView label="brief" answer={answer} sources={sources} check={check} writing={phase === "writing"}
            actions={<div className="answer-actions"><button type="button" className="btn btn--ghost btn--sm" onClick={() => navigator.clipboard.writeText(answer)}>Copy</button></div>} />
        </section>
      )}
    </>
  );
}

const SAMPLE_PROP = "The State of Arcadia passed a law requiring every news website to register with a government officer, who may cancel registration for content \"likely to disturb public order\". A digital news outlet whose registration was cancelled without a hearing challenges the law under Articles 14, 19(1)(a) and 21.";

function Moot() {
  const [prop, setProp] = useState("");
  const [side, setSide] = useState("petitioner");
  const [turns, setTurns] = useState([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);
  const started = turns.length > 0;

  async function send(history) {
    setBusy(true); setError("");
    const next = [...history, { role: "bench", text: "" }];
    setTurns(next);
    try {
      const res = await apiFetch(`${API_URL}/moot`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposition: prop.trim(), side, history, lang: getLang() }),
      });
      if (!res.ok) throw await responseError(res);
      let text = "";
      await readStream(res, (m) => {
        if (m.type === "delta") {
          text += m.text;
          setTurns([...history, { role: "bench", text }]);
        }
      });
    } catch (err) {
      setTurns(history);
      setError(errorText(err));
    }
    setBusy(false);
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
  }

  function start(e) {
    e.preventDefault();
    if (prop.trim().length < 30) { setError("Paste or write the moot proposition first (a few sentences at least)."); return; }
    send([]);
  }

  function submit(e) {
    e.preventDefault();
    if (!draft.trim() || busy) return;
    const history = [...turns, { role: "counsel", text: draft.trim() }];
    setDraft("");
    send(history);
  }

  if (!started) {
    return (
      <form className="card doc-form" onSubmit={start}>
        <div className="field">
          <label htmlFor="moot-prop">Moot proposition</label>
          <textarea id="moot-prop" rows={6} value={prop} maxLength={4000} onChange={(e) => setProp(e.target.value)} placeholder="Paste the moot problem, or write a short one." />
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setProp(SAMPLE_PROP)}>Use a sample problem</button>
        </div>
        <div className="segmented" role="group" aria-label="You appear for">
          <button type="button" aria-pressed={side === "petitioner"} onClick={() => setSide("petitioner")}>Petitioner</button>
          <button type="button" aria-pressed={side === "respondent"} onClick={() => setSide("respondent")}>Respondent</button>
        </div>
        {error && <div className="alert" role="alert">{error}</div>}
        <div className="doc-submit">
          <button type="submit" className="btn btn--lime" disabled={busy}>Begin, may it please the court</button>
          <LangToggle />
          <p className="mono muted">The bench questions you from real judgments. After about eight exchanges it gives you a scorecard.</p>
        </div>
      </form>
    );
  }

  return (
    <section className="moot" aria-live="polite">
      <ol className="moot-log">
        {turns.map((t, i) => (
          <li key={i} className={`card moot-turn moot-turn--${t.role}`}>
            <p className="mono muted">{t.role === "bench" ? "the bench" : `counsel for the ${side}`}</p>
            {t.text ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{t.text.replace(/\[Source \d+\]/g, "")}</ReactMarkdown> : <p className="muted">The bench is considering…</p>}
          </li>
        ))}
      </ol>
      {error && <div className="alert" role="alert">{error}</div>}
      <form className="card doc-form" onSubmit={submit}>
        <div className="field">
          <label htmlFor="moot-say">Your submission</label>
          <textarea id="moot-say" rows={4} value={draft} maxLength={3000} onChange={(e) => setDraft(e.target.value)} placeholder="My Lords, the impugned law fails the test of reasonableness because…" />
        </div>
        <div className="doc-submit">
          <button type="submit" className="btn btn--lime" disabled={busy || !draft.trim()}>{busy ? "The bench is speaking…" : "Submit"}</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setTurns([]); setError(""); }}>New session</button>
        </div>
      </form>
      <span ref={endRef} />
    </section>
  );
}

const ROUND = 10;
const pick = (pool) => [...pool].sort(() => Math.random() - 0.5).slice(0, ROUND);

function Quiz() {
  const tags = useMemo(() => ["All", ...new Set(QUIZ.map((q) => q.tag))], []);
  const [tag, setTag] = useState("All");
  const [set, setSet] = useState(() => pick(QUIZ));
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState(null);
  const [score, setScore] = useState(0);

  function restart(t = tag) {
    setTag(t);
    setSet(pick(t === "All" ? QUIZ : QUIZ.filter((q) => q.tag === t)));
    setI(0); setChosen(null); setScore(0);
  }

  if (i >= set.length) {
    return (
      <div className="card quiz-end">
        <p className="mono muted">your score</p>
        <p className="quiz-score">{score}<span className="muted"> / {set.length}</span></p>
        <p>{score === set.length ? "Full marks. The bench is impressed." : score >= set.length * 0.7 ? "Strong. Review the ones you missed and go again." : "Good start. Each answer links to its section: read those, then try again."}</p>
        <button type="button" className="btn btn--lime" onClick={() => restart()}>Another round</button>
      </div>
    );
  }

  const q = set[i];
  return (
    <>
      <div className="segmented quiz-tags" role="group" aria-label="Topic">
        {tags.map((t) => <button key={t} type="button" aria-pressed={tag === t} onClick={() => restart(t)}>{t}</button>)}
      </div>
      <div className="card quiz-card">
        <p className="mono muted">question {i + 1} of {set.length} · score {score}</p>
        <h2 className="quiz-q">{q.q}</h2>
        <ul className="quiz-options">
          {q.o.map((opt, k) => {
            const state = chosen === null ? "" : k === q.a ? " quiz-opt--right" : k === chosen ? " quiz-opt--wrong" : "";
            return (
              <li key={k}>
                <button type="button" className={`quiz-opt${state}`} disabled={chosen !== null}
                  onClick={() => { setChosen(k); if (k === q.a) setScore((s) => s + 1); }}>
                  {opt}
                </button>
              </li>
            );
          })}
        </ul>
        {chosen !== null && (
          <div className="quiz-why" role="status">
            <p><b>{chosen === q.a ? "Right." : "Not quite."}</b> {q.why} {q.law && <Link to={sectionPath(...q.law)} className="text-link">Read {sectionLabel(...q.law)}</Link>}</p>
            <button type="button" className="btn btn--lime btn--sm" onClick={() => { setI(i + 1); setChosen(null); }}>{i + 1 < set.length ? "Next question" : "See your score"}</button>
          </div>
        )}
      </div>
    </>
  );
}

export default function Students() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get("tab")) ? params.get("tab") : "brief";
  useEffect(() => { window.scrollTo(0, 0); }, [tab]);

  return (
    <main id="main" className="station">
      <header className="station-head">
        <h1 className="station-title">Study like it's <em>the night before.</em></h1>
        <p className="station-lede">Brief any judgment in the index, argue before a bench that pushes back, and test yourself on the new criminal codes and the cases every exam asks about.</p>
      </header>
      <div className="segmented doc-modes" role="tablist" aria-label="Student tools">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} aria-pressed={tab === t.id} onClick={() => setParams({ tab: t.id })}>{t.label}</button>
        ))}
      </div>
      {tab === "brief" && <Brief />}
      {tab === "moot" && <Moot />}
      {tab === "quiz" && <Quiz />}
      <p className="shared-note muted">For study and research, not legal advice. Check every brief against the judgment itself before you rely on it.</p>
    </main>
  );
}
