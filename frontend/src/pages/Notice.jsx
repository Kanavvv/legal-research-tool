import { useState } from "react";
import { Link } from "react-router-dom";
import { API_URL, apiFetch, getLang, pageLang, responseError, setLang } from "../api";
import LangSwitch from "../ui/LangSwitch";
import SourceList from "../ui/SourceList";
import { shrinkImage } from "../ui/shrinkImage";
import { trackEvent } from "../ui/track";
import { WHATSAPP_URL } from "../config";

const UI = {
  en: {
    title: "Got a", em: "notice?",
    lede: "A legal notice, summons, FIR, court order or bank letter. Upload a photo or paste the text: Nyaya tells you what it is, how urgent it is, and what to do next. Free. Research help, not legal advice.",
    photo: "Photo or file", paste: "Paste text",
    choose: "Choose a file, or take a photo of the page", chooseSub: "Photo, PDF, Word or text · read once, never stored",
    pastePh: "Paste the full text of the notice here.",
    go: "Explain this notice", busy: "Reading it…",
    urgency: { urgent: "Urgent: act now", soon: "Needs a reply or action", none: "For information" },
    deadline: "Key date", from: "From", points: "What it says", next: "What to do next", law: "Law it relies on", warn: "Be careful",
    scanned: "Read from a photo: check names, dates and amounts against the paper.",
    reply: "How should I reply?", lawyer: "Find a lawyer", guide: "What to do when you get a notice", sources: "Related sources", again: "Explain another",
  },
  hi: {
    title: "कोई", em: "नोटिस आया है?",
    lede: "क़ानूनी नोटिस, समन, FIR, कोर्ट का आदेश या बैंक का पत्र। फ़ोटो डालें या टेक्स्ट पेस्ट करें: Nyaya बताएगा यह क्या है, कितना ज़रूरी है, और आगे क्या करें। मुफ़्त। यह शोध सहायता है, क़ानूनी सलाह नहीं।",
    photo: "फ़ोटो या फ़ाइल", paste: "टेक्स्ट पेस्ट करें",
    choose: "फ़ाइल चुनें, या पन्ने की फ़ोटो लें", chooseSub: "फ़ोटो, PDF, Word या टेक्स्ट · एक बार पढ़ा जाता है, सहेजा नहीं जाता",
    pastePh: "नोटिस का पूरा टेक्स्ट यहाँ पेस्ट करें।",
    go: "यह नोटिस समझाएँ", busy: "पढ़ रहे हैं…",
    urgency: { urgent: "ज़रूरी: अभी कार्रवाई करें", soon: "जवाब या कार्रवाई चाहिए", none: "सिर्फ़ जानकारी के लिए" },
    deadline: "मुख्य तारीख़", from: "किसकी ओर से", points: "इसमें क्या लिखा है", next: "आगे क्या करें", law: "किस क़ानून के तहत", warn: "सावधान रहें",
    scanned: "फ़ोटो से पढ़ा गया: नाम, तारीख़ें और रक़म काग़ज़ से मिला लें।",
    reply: "जवाब कैसे दूँ?", lawyer: "वकील खोजें", guide: "नोटिस मिलने पर क्या करें", sources: "संबंधित स्रोत", again: "दूसरा समझाएँ",
  },
};

export default function Notice() {
  const [lang, setLangState] = useState(pageLang);
  const t = UI[lang];
  const [mode, setMode] = useState("file");
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [out, setOut] = useState(null);

  function changeLang(l) { setLang(l); setLangState(l); }

  async function submit(e) {
    e.preventDefault();
    setError("");
    const form = new FormData();
    form.append("lang", getLang()); // answers can come in any Indian language; this page is English or Hindi
    if (mode === "file") {
      if (!file) { setError(lang === "hi" ? "पहले फ़ाइल या फ़ोटो चुनें।" : "Choose a file or a photo first."); return; }
      const upload = await shrinkImage(file);
      if (upload.size > 5 * 1024 * 1024) { setError(lang === "hi" ? "फ़ाइल 5 MB से बड़ी है।" : "That file is over 5 MB."); return; }
      form.append("file", upload);
    } else {
      if (text.trim().length < 80) { setError(lang === "hi" ? "नोटिस का पूरा टेक्स्ट पेस्ट करें।" : "Paste the notice's full text (at least a few lines)."); return; }
      form.append("text", text.trim());
    }
    setBusy(true); setOut(null);
    try {
      const res = await apiFetch(`${API_URL}/notice`, { method: "POST", body: form });
      if (!res.ok) throw await responseError(res);
      setOut(await res.json());
    } catch (err) {
      setError(err.userMessage || (lang === "hi" ? "अभी नहीं पढ़ सके। फिर कोशिश करें।" : "Couldn't read that right now. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  const list = (title, items, ordered) => items?.length > 0 && (
    <>
      <h3 className="zone-title" lang={lang}>{title}</h3>
      {ordered
        ? <ol className="verdict-todo">{items.map((x) => <li key={x} lang={lang}>{x}</li>)}</ol>
        : <ul className="notice-list">{items.map((x) => <li key={x} lang={lang}>{x}</li>)}</ul>}
    </>
  );

  return (
    <main id="main" className="station">
      <header className="station-head">
        <h1 className="station-title" lang={lang}>{t.title} <em>{t.em}</em></h1>
        <p className="station-lede" lang={lang}>{t.lede}</p>
        <LangSwitch lang={lang} onChange={changeLang} />
        <p className="muted wa-alt" lang={lang}>
          {lang === "hi" ? "फ़ोन पर हैं? " : "On your phone? "}
          <a className="text-link" href={WHATSAPP_URL} target="_blank" rel="noreferrer" onClick={() => trackEvent("wa_notice")}>
            {lang === "hi" ? "नोटिस की फ़ोटो सीधे WhatsApp पर Nyaya को भेजें" : "Send a photo of the notice to Nyaya on WhatsApp"}
          </a>
          {lang === "hi" ? ", जवाब वहीं मिलेगा।" : " and get the answer there."}
        </p>
      </header>

      {!out && (
        <form className="card doc-form" onSubmit={submit}>
          <div className="segmented doc-modes" role="group" aria-label={lang === "hi" ? "कैसे दें" : "How to add it"}>
            <button type="button" aria-pressed={mode === "file"} onClick={() => setMode("file")} lang={lang}>{t.photo}</button>
            <button type="button" aria-pressed={mode === "text"} onClick={() => setMode("text")} lang={lang}>{t.paste}</button>
          </div>
          {mode === "file" ? (
            <label className={file ? "drop drop--has" : "drop"}>
              <input type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <span className="drop-icon" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></svg>
              </span>
              <span className="drop-main" lang={lang}>{file ? file.name : t.choose}</span>
              <span className="drop-sub mono muted" lang={lang}>{file ? `${(file.size / 1024).toFixed(0)} KB` : t.chooseSub}</span>
            </label>
          ) : (
            <textarea aria-label={t.paste} value={text} maxLength={30000} placeholder={t.pastePh} onChange={(e) => setText(e.target.value)} lang={lang} />
          )}
          <div className="doc-submit">
            <button type="submit" className="btn btn--lime" disabled={busy}>{busy ? t.busy : t.go}</button>
          </div>
          {error && <div className="alert" role="alert">{error}</div>}
        </form>
      )}

      {busy && <div className="skeleton" aria-hidden="true"><span /><span /><span /><span /></div>}

      {out && (
        <section className="check-result" aria-live="polite">
          <article className={`card verdict notice-card notice-card--${out.urgency}`}>
            <p className="verdict-tag mono" lang={lang}>{t.urgency[out.urgency]}</p>
            {out.kind && <h2 className="verdict-head" lang={lang}>{out.kind}</h2>}
            <dl className="notice-meta">
              {out.deadline && <><dt lang={lang}>{t.deadline}</dt><dd lang={lang}>{out.deadline}</dd></>}
              {out.from && <><dt lang={lang}>{t.from}</dt><dd lang={lang}>{out.from}</dd></>}
            </dl>
            <p className="verdict-why" lang={lang}>{out.summary}</p>
            {list(t.points, out.key_points)}
            {list(t.next, out.next_steps, true)}
            {out.law?.length > 0 && (
              <>
                <h3 className="zone-title" lang={lang}>{t.law}</h3>
                <ul className="verdict-law">{out.law.map((l) => <li key={l} className="mono">{l}</li>)}</ul>
              </>
            )}
            {list(t.warn, out.warnings)}
            {out.scanned && <p className="muted notice-scanned" lang={lang}>{t.scanned}</p>}
          </article>
          <div className="answer-actions">
            <Link to="/" state={{ rerunQuestion: `I received ${out.kind || "a legal notice"}${out.from ? ` from ${out.from}` : ""}. ${out.summary} How should I reply, and what are my options?`.slice(0, 900) }} className="btn btn--lime btn--sm">{t.reply}</Link>
            <Link to="/lawyers" className="btn btn--ghost btn--sm">{t.lawyer}</Link>
            <Link to="/now/legal-notice" className="btn btn--ghost btn--sm">{t.guide}</Link>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setOut(null); setFile(null); setText(""); }}>{t.again}</button>
          </div>
          <SourceList title={t.sources} sources={out.sources || []} />
        </section>
      )}
    </main>
  );
}
