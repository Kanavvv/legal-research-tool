import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { pageLang, setLang } from "../api";
import { DEADLINES, compute, icsFor, isClosedDay } from "../data/deadlines";
import { ACTS, sectionPath } from "../lawCodes";
import LangSwitch from "../ui/LangSwitch";

const UI = {
  en: {
    title: "Legal", em: "deadline calculator.",
    lede: "Pick your situation and enter the date. Nyaya works out the last day for each step, from the law that sets it. Check the result with a lawyer before you rely on it.",
    situation: "Your situation", left: (n) => (n === 0 ? "Today" : n > 0 ? `${n} day${n === 1 ? "" : "s"} left` : `${-n} day${n === -1 ? "" : "s"} ago`),
    passed: "Passed", waiting: "Enter the date above to work this out.",
    sunday: "Falls on a Sunday: you can file on the next working day.",
    ics: "Add to my calendar", how: "How the days are counted",
    howText: "The day of the event isn't counted, so \"30 days from 1 January\" ends on 31 January. If the last day is a court holiday, you can file on the next working day. Many of these limits can be extended for a good reason, but don't count on it: file in time.",
  },
  hi: {
    title: "क़ानूनी", em: "समय-सीमा कैलकुलेटर।",
    lede: "अपनी स्थिति चुनें और तारीख़ डालें। Nyaya हर क़दम की आख़िरी तारीख़ उस क़ानून से निकालता है जो उसे तय करता है। भरोसा करने से पहले किसी वकील से जाँच लें।",
    situation: "आपकी स्थिति", left: (n) => (n === 0 ? "आज" : n > 0 ? `${n} दिन बाक़ी` : `${-n} दिन पहले`),
    passed: "बीत गई", waiting: "यह निकालने के लिए ऊपर तारीख़ डालें।",
    sunday: "रविवार पड़ रहा है: अगले कामकाजी दिन दाख़िल कर सकते हैं।",
    ics: "मेरे कैलेंडर में जोड़ें", how: "दिन कैसे गिने जाते हैं",
    howText: "घटना वाला दिन नहीं गिना जाता, इसलिए \"1 जनवरी से 30 दिन\" 31 जनवरी को पूरे होते हैं। आख़िरी दिन कोर्ट की छुट्टी हो तो अगले कामकाजी दिन दाख़िल कर सकते हैं। ठोस वजह से कई समय-सीमाएँ बढ़ सकती हैं, पर इस पर भरोसा न करें: समय पर दाख़िल करें।",
  },
};

function todayUTC() {
  const n = new Date();
  return Date.UTC(n.getFullYear(), n.getMonth(), n.getDate());
}

function fmt(d, lang) {
  return d.toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export default function Deadlines() {
  const [params, setParams] = useSearchParams();
  const [lang, setLangState] = useState(pageLang);
  const t = UI[lang];
  const id = DEADLINES.some((d) => d.id === params.get("for")) ? params.get("for") : DEADLINES[0].id;
  const calc = DEADLINES.find((d) => d.id === id);
  const [values, setValues] = useState({});
  const vals = values[id] || {};
  const results = useMemo(() => compute(calc, values[id] || {}), [calc, values, id]);
  const today = todayUTC();

  function changeLang(l) { setLang(l); setLangState(l); }
  function pick(next) { setParams(next === DEADLINES[0].id ? {} : { for: next }, { replace: true }); }
  function setVal(k, v) { setValues((p) => ({ ...p, [id]: { ...(p[id] || {}), [k]: v } })); }

  function download() {
    const items = results.filter((r) => r.date && r.date.getTime() >= today).map((r) => ({ date: r.date, label: r.label.en, law: r.law }));
    const blob = new Blob([icsFor(calc.title.en, items)], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `nyaya-${calc.id}-deadlines.ics`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const upcoming = results.some((r) => r.date && r.date.getTime() >= today);

  return (
    <main id="main" className="station">
      <header className="station-head">
        <h1 className="station-title" lang={lang}>{t.title} <em>{t.em}</em></h1>
        <p className="station-lede" lang={lang}>{t.lede}</p>
        <LangSwitch lang={lang} onChange={changeLang} />
      </header>

      <div className="dl-layout">
        <section className="card dl-form" aria-label={t.situation}>
          <div className="field">
            <label htmlFor="dl-kind" lang={lang}>{t.situation}</label>
            <select id="dl-kind" value={id} onChange={(e) => pick(e.target.value)}>
              {DEADLINES.map((d) => <option key={d.id} value={d.id}>{d.title[lang]}</option>)}
            </select>
            <p className="muted dl-blurb" lang={lang}>{calc.blurb[lang]}</p>
          </div>
          {calc.inputs.map((i) => (
            <div className="field" key={i.id}>
              <label htmlFor={`dl-${i.id}`} lang={lang}>{i.label[lang]}</label>
              <input id={`dl-${i.id}`} type="date" value={vals[i.id] || ""} max="2100-12-31" onChange={(e) => setVal(i.id, e.target.value)} />
            </div>
          ))}
        </section>

        <section aria-live="polite">
          <ol className="dl-steps">
            {results.map((r) => {
              const days = r.date ? Math.round((r.date.getTime() - today) / 86400000) : null;
              const state = days === null ? "wait" : days < 0 ? "past" : days <= 7 ? "near" : "ok";
              return (
                <li key={r.id} className={`card dl-step dl-step--${state}`}>
                  <p className="dl-label" lang={lang}>{r.label[lang]}</p>
                  {r.date ? (
                    <>
                      <p className="dl-date">{fmt(r.date, lang)}</p>
                      <p className="dl-left mono">{days < 0 ? `${t.passed} · ${t.left(days)}` : t.left(days)}</p>
                      {isClosedDay(r.date) && <p className="dl-note" lang={lang}>{t.sunday}</p>}
                    </>
                  ) : <p className="muted dl-wait" lang={lang}>{t.waiting}</p>}
                  {r.note && <p className="dl-note" lang={lang}>{r.note[lang]}</p>}
                  {r.cite && ACTS[r.cite[0]]
                    ? <Link to={sectionPath(...r.cite)} className="rights-cite mono">{r.law}</Link>
                    : <span className="rights-cite mono">{r.law}</span>}
                </li>
              );
            })}
          </ol>
          <div className="answer-actions">
            {upcoming && <button type="button" className="btn btn--lime btn--sm" onClick={download} lang={lang}>{t.ics}</button>}
          </div>
          <details className="dl-how">
            <summary lang={lang}>{t.how}</summary>
            <p lang={lang}>{t.howText}</p>
          </details>
        </section>
      </div>
    </main>
  );
}
