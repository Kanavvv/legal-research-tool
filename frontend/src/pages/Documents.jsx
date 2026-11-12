import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { API_URL, apiFetch, readStream, responseError, getLang } from "../api";
import LangToggle from "../components/LangToggle";
import ResultView from "../ui/ResultView";
import SaveToFolder from "../ui/SaveToFolder";
import { exportToWord } from "../exportToWord";
import { PRO_ON, WHATSAPP_URL } from "../config";
import { shrinkImage } from "../ui/shrinkImage";

const KINDS = [
  { id: "notice_reply", label: "Reply to a legal notice", hint: "Who sent the notice, when, what it claims, and your side of it." },
  { id: "rti", label: "RTI application", hint: "Which office, and exactly which records or information you want." },
  { id: "consumer_complaint", label: "Consumer complaint", hint: "What you bought, from whom, when, what went wrong, what you've tried, and what you want." },
];

export default function Documents() {
  if (!PRO_ON) {
    return <Paused title={<>Your <em>paperwork</em>, read and drafted.</>}
      lede="Document review and drafts are coming back in a few days. Meanwhile, ask your question in plain words, or start from a free template." />;
  }
  return <DocumentsFull />;
}

function DocumentsFull() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState(location.pathname === "/drafts" ? "draft" : "review");

  const [file, setFile] = useState(null);
  const [question, setQuestion] = useState("");
  const [kind, setKind] = useState("notice_reply");
  const [details, setDetails] = useState("");

  const [phase, setPhase] = useState("idle"); // idle | writing | done | error
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [check, setCheck] = useState(null);
  const [error, setError] = useState("");
  const [upgrade, setUpgrade] = useState(false);
  const [title, setTitle] = useState("");
  const resultRef = useRef(null);
  const busy = phase === "writing";

  function switchMode(m) {
    setMode(m);
    navigate(m === "draft" ? "/drafts" : "/documents", { replace: true });
  }

  async function run(e) {
    e.preventDefault();
    if (busy) return;
    if (!user) { navigate("/account"); return; }
    setError(""); setUpgrade(false); setAnswer(""); setSources([]); setCheck(null);

    let res;
    try {
      if (mode === "review") {
        if (!file) { setError("Choose a file or a photo of the document first."); return; }
        const upload = await shrinkImage(file);
        if (upload.size > 5 * 1024 * 1024) { setError("That file is over 5 MB."); return; }
        setTitle(file.name);
        const form = new FormData();
        form.append("file", upload);
        form.append("question", question.trim());
        form.append("lang", getLang());
        setPhase("writing");
        res = await apiFetch(`${API_URL}/document`, { method: "POST", body: form });
      } else {
        if (details.trim().length < 40) { setError("Add a little more detail: at least a few sentences."); return; }
        setTitle(KINDS.find((k) => k.id === kind).label);
        setPhase("writing");
        res = await apiFetch(`${API_URL}/draft`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, details: details.trim(), lang: getLang() }),
        });
      }
      if (!res.ok) throw await responseError(res);
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
      let text = "";
      await readStream(res, (msg) => {
        if (msg.type === "sources") setSources(msg.sources || []);
        else if (msg.type === "delta") { text += msg.text; setAnswer(text); }
        else if (msg.type === "check") setCheck(msg);
      });
      setPhase("done");
    } catch (err) {
      setPhase("error");
      setUpgrade(!!err?.upgrade);
      setError(err?.userMessage || "That didn't go through. Check your connection and try again.");
    }
  }

  return (
    <main id="main" className="station">
      <header className="station-head">
        <div>
          <h1 className="station-title">Your <em>paperwork</em>, read and drafted.</h1>
          <p className="station-lede">
            Upload a notice, agreement, FIR or order (a phone photo works) and get it explained in plain words, with the law that applies.
            Or describe your situation and get a first draft to take to a lawyer. Part of Nyaya Pro.
          </p>
        </div>
      </header>

      <div className="segmented doc-modes" role="group" aria-label="What do you need?">
        <button type="button" aria-pressed={mode === "review"} onClick={() => switchMode("review")}>Explain a document</button>
        <button type="button" aria-pressed={mode === "draft"} onClick={() => switchMode("draft")}>Draft a document</button>
      </div>

      <form className="card doc-form" onSubmit={run}>
        {mode === "review" ? (
          <>
            <label className={file ? "drop drop--has" : "drop"}>
              <input type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <span className="drop-icon" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M12 17v-6M9.5 13.5 12 11l2.5 2.5" /></svg>
              </span>
              <span className="drop-main">{file ? file.name : "Choose a file, or take a photo of the page"}</span>
              <span className="drop-sub mono muted">{file ? `${(file.size / 1024).toFixed(0)} KB` : "PDF, Word, text or photo (even a scanned FIR) · read once, never stored"}</span>
            </label>
            <div className="field">
              <label htmlFor="doc-q">Anything specific you want to know? <span className="muted">(optional)</span></label>
              <input id="doc-q" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={600} placeholder="Can they really evict me with 15 days' notice?" />
            </div>
          </>
        ) : (
          <>
            <fieldset className="kinds">
              <legend className="sr-only">Kind of draft</legend>
              {KINDS.map((k) => (
                <label key={k.id} className={kind === k.id ? "kind kind--on" : "kind"}>
                  <input type="radio" name="kind" value={k.id} checked={kind === k.id} onChange={() => setKind(k.id)} />
                  {k.label}
                </label>
              ))}
            </fieldset>
            <div className="field">
              <label htmlFor="draft-details">The facts</label>
              <textarea id="draft-details" rows={7} value={details} onChange={(e) => setDetails(e.target.value)} maxLength={6000}
                placeholder={KINDS.find((k) => k.id === kind).hint} />
              <p className="mono muted field-count">{details.length} / 6000</p>
            </div>
          </>
        )}
        {error && (
          <div className="alert" role="alert">
            {error}
            {upgrade && PRO_ON && <> <Link to="/pricing" className="alert-link">See Nyaya Pro</Link></>}
          </div>
        )}
        <div className="doc-submit">
          <button type="submit" className="btn btn--lime" disabled={busy}>
            {busy ? "Working…" : !user ? "Sign in to continue" : mode === "review" ? "Explain this document" : "Write the draft"}
          </button>
          <LangToggle />
          <p className="mono muted">Not legal advice. Have a lawyer check anything with real stakes.</p>
        </div>
      </form>

      <section ref={resultRef} className="result" aria-live="polite" aria-busy={busy}>
        {(phase === "writing" || phase === "done") && (
          <>
            <header className="result-head">
              <p className="mono muted">{mode === "review" ? "your document" : "your draft"}</p>
              <h2 className="result-q">{title}</h2>
            </header>
            <ResultView
              label={mode === "review" ? "explained" : "draft"}
              answer={answer}
              sources={sources}
              check={check}
              writing={phase === "writing"}
              actions={
                <div className="answer-actions">
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => navigator.clipboard.writeText(answer)}>Copy</button>
                  <button type="button" className="btn btn--ghost btn--sm"
                    onClick={() => exportToWord({ title, markdown: answer, sources, filename: `nyaya-${mode === "review" ? "explained" : "draft"}.docx` })}>
                    Export to Word
                  </button>
                  <SaveToFolder question={title} answer={answer} sources={sources} />
                </div>
              }
            />
          </>
        )}
      </section>
    </main>
  );
}


function Paused({ title, lede }) {
  return (
    <main id="main" className="station">
      <header className="station-head">
        <h1 className="station-title">{title}</h1>
        <p className="station-lede">{lede}</p>
      </header>
      <div className="answer-actions">
        <Link to="/" className="btn btn--lime btn--sm">Ask a question</Link>
        <Link to="/templates" className="btn btn--ghost btn--sm">Free templates</Link>
        <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">Ask on WhatsApp</a>
      </div>
    </main>
  );
}
