import { useState } from "react";
import { Link } from "react-router-dom";
import { API_URL, apiFetch, getLang, pageLang, responseError, setLang } from "../api";
import LangSwitch from "../ui/LangSwitch";
import MicButton from "../ui/MicButton";
import SourceList from "../ui/SourceList";
import ShareTools from "../ui/ShareTools";

const UI = {
  en: {
    title: "Is this", em: "legal?",
    lede: "Describe what happened or what someone wants to do. Nyaya gives a straight answer from Indian law, with the sections and judgments it rests on. Research help, not legal advice.",
    label: "What's the situation?", placeholder: "My landlord says he'll keep my whole deposit because I'm leaving two weeks early.",
    go: "Check", busy: "Checking the law…", examples: "Try one",
    verdicts: { legal: "Legal", illegal: "Not legal", depends: "It depends", unclear: "Not clear from the law found" },
    law: "The law", todo: "What you can do", lawyer: "This is worth taking to a lawyer.", lawyerLink: "Find a lawyer",
    deeper: "Ask a follow-up in full", sources: "Sources", again: "Check something else",
    help: "If you or someone else needs help right now",
  },
  hi: {
    title: "क्या यह", em: "क़ानूनी है?",
    lede: "बताइए क्या हुआ या कोई क्या करना चाहता है। Nyaya भारतीय क़ानून से सीधा जवाब देता है, उन धाराओं और फ़ैसलों के साथ जिन पर वह टिका है। यह शोध सहायता है, क़ानूनी सलाह नहीं।",
    label: "स्थिति क्या है?", placeholder: "मकान मालिक कह रहा है कि दो हफ़्ते पहले छोड़ने पर वह पूरा डिपॉज़िट रख लेगा।",
    go: "जाँचें", busy: "क़ानून देख रहे हैं…", examples: "इनमें से कोई आज़माएँ",
    verdicts: { legal: "क़ानूनी है", illegal: "क़ानूनी नहीं है", depends: "हालात पर निर्भर", unclear: "मिले क़ानून से साफ़ नहीं" },
    law: "क़ानून", todo: "आप क्या कर सकते हैं", lawyer: "इस पर किसी वकील से बात करना ठीक रहेगा।", lawyerLink: "वकील खोजें",
    deeper: "पूरा सवाल पूछें", sources: "स्रोत", again: "कुछ और जाँचें",
    help: "अगर आपको या किसी और को अभी मदद चाहिए",
  },
};

const EXAMPLES = {
  en: [
    "My employer is holding back my last month's salary because I resigned without serving notice.",
    "Can the police take my phone and ask for my password?",
    "A shop refused to give a refund and says 'no exchange, no return'.",
    "My society is charging a fine for keeping a pet dog.",
  ],
  hi: [
    "नौकरी छोड़ने पर कंपनी आख़िरी महीने की तनख़्वाह रोक रही है क्योंकि मैंने नोटिस पीरियड पूरा नहीं किया।",
    "क्या पुलिस मेरा फ़ोन लेकर पासवर्ड माँग सकती है?",
    "दुकानदार ने रिफ़ंड देने से मना कर दिया और कहता है 'बिका माल वापस नहीं होगा'।",
    "सोसाइटी पालतू कुत्ता रखने पर जुर्माना लगा रही है।",
  ],
};

export default function IsItLegal() {
  const [lang, setLangState] = useState(pageLang);
  const t = UI[lang];
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [out, setOut] = useState(null);

  function changeLang(l) { setLang(l); setLangState(l); }

  async function check(situation) {
    const q = (situation ?? text).trim();
    if (q.length < 8) { setError(lang === "hi" ? "थोड़ा और बताइए।" : "Tell us a little more."); return; }
    setText(q);
    setBusy(true); setError(""); setOut(null);
    try {
      const res = await apiFetch(`${API_URL}/check`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation: q, lang: getLang() }),
      });
      if (!res.ok) throw await responseError(res);
      setOut(await res.json());
    } catch (e) {
      setError(e.userMessage || (lang === "hi" ? "अभी जवाब नहीं मिल सका। फिर कोशिश करें।" : "Couldn't check that right now. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main id="main" className="station">
      <header className="station-head">
        <h1 className="station-title" lang={lang}>{t.title} <em>{t.em}</em></h1>
        <p className="station-lede" lang={lang}>{t.lede}</p>
        <LangSwitch lang={lang} onChange={changeLang} />
      </header>

      <form className="card doc-form" onSubmit={(e) => { e.preventDefault(); check(); }}>
        <div className="field">
          <label htmlFor="check-q" lang={lang}>{t.label}</label>
          <textarea id="check-q" value={text} maxLength={800} rows={4} placeholder={t.placeholder} lang={lang}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) check(); }} />
          <p className="field-count mono muted">{text.length}/800</p>
        </div>
        <div className="doc-submit">
          <button type="submit" className="btn btn--lime" disabled={busy}>{busy ? t.busy : t.go}</button>
          <MicButton onText={setText} />
        </div>
        {!out && !busy && (
          <div className="check-examples">
            <p className="mono muted" lang={lang}>{t.examples}</p>
            <ul>
              {EXAMPLES[lang].map((x) => (
                <li key={x}><button type="button" className="choice" onClick={() => check(x)} lang={lang}>{x}</button></li>
              ))}
            </ul>
          </div>
        )}
        {error && <div className="alert" role="alert">{error}</div>}
      </form>

      {busy && <div className="skeleton" aria-hidden="true"><span /><span /><span /></div>}

      {out && (
        <section className="check-result" aria-live="polite">
          {out.emergency?.length > 0 && (
            <div className="helplines" role="alert">
              <p className="helplines-head" lang={lang}>{t.help}</p>
              <ul>
                {out.emergency.map((e) => (
                  <li key={e.number}><a className="helpline-num" href={`tel:${e.number}`}>{e.number}</a><span><strong>{e.name}</strong> {e.note}</span></li>
                ))}
              </ul>
            </div>
          )}
          <article className={`card verdict verdict--${out.verdict}`}>
            <p className="verdict-tag mono" lang={lang}>{t.verdicts[out.verdict]}</p>
            <h2 className="verdict-head" lang={lang}>{out.headline}</h2>
            <p className="verdict-why" lang={lang}>{out.why}</p>
            {out.law?.length > 0 && (
              <>
                <h3 className="zone-title" lang={lang}>{t.law}</h3>
                <ul className="verdict-law">{out.law.map((l) => <li key={l} className="mono">{l}</li>)}</ul>
              </>
            )}
            {out.what_to_do?.length > 0 && (
              <>
                <h3 className="zone-title" lang={lang}>{t.todo}</h3>
                <ol className="verdict-todo">{out.what_to_do.map((s) => <li key={s} lang={lang}>{s}</li>)}</ol>
              </>
            )}
            {out.ask_lawyer && <p className="verdict-lawyer" lang={lang}>{t.lawyer} <Link to="/lawyers" className="text-link">{t.lawyerLink}</Link></p>}
          </article>
          <div className="answer-actions">
            <Link to="/" state={{ rerunQuestion: text }} className="btn btn--ghost btn--sm">{t.deeper}</Link>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setOut(null); setText(""); }}>{t.again}</button>
            <ShareTools question={text} answer={`${out.headline}. ${out.why}`} sources={(out.sources || []).length}
              url={`${window.location.origin}/is-it-legal`} text={`${text.trim().slice(0, 200)}\n\nNyaya says: ${out.headline}\nCheck your own question free:`} />
          </div>
          <SourceList title={t.sources} sources={out.sources || []} />
        </section>
      )}
    </main>
  );
}
