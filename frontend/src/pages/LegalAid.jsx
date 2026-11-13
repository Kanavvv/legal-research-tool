import { useState } from "react";
import { Link } from "react-router-dom";
import { pageLang, setLang } from "../api";
import { CATEGORIES, GETS } from "../data/legalAid";
import LangSwitch from "../ui/LangSwitch";
import { trackEvent } from "../ui/track";

const UI = {
  en: {
    title: "Can I get a", em: "free lawyer?",
    lede: "Under the Legal Services Authorities Act, many people in India are entitled to a lawyer, court fees and help with papers, all paid for by the State. Check in a minute.",
    q1: "Do any of these describe you?", none: "None of these",
    q2: "Is your family's yearly income low?",
    q2help: "Each state sets its own income limit for free legal aid, and the limit is usually higher for cases in the High Court and Supreme Court. If money is tight, apply anyway: the legal services office will check it for you.",
    low: "Yes, it's low", notLow: "No, it's comfortably above", unsure: "I'm not sure",
    yesTitle: "You qualify for free legal aid.",
    yesWhy: (c) => `Because ${c.replace(/^I am /, "you are ").replace(/^I have /, "you have ").replace(/^I was /, "you were ").replace(/^I belong /, "you belong ")}, the law entitles you to free legal services whatever your income (Section 12, Legal Services Authorities Act).`,
    maybeTitle: "You very likely qualify. Apply.",
    maybeWhy: "If your income is below your state's limit, you are entitled to free legal services (Section 12(h)). The legal services office decides; applying costs nothing.",
    noTitle: "You may not qualify for a free lawyer, but you still have free help.",
    noWhy: "Lok Adalats settle many disputes with no court fee, legal aid clinics give free advice, and the NALSA helpline answers questions. Many advocates also give a first consultation at a low fee.",
    custody: "In custody? The Magistrate must tell you that you can have a free lawyer and appoint one if you ask, from your very first production in court. Ask for one.",
    merit: "Legal aid is for a real legal problem: the Authority checks that you have a case worth pursuing (Section 13).",
    gets: "What you get", apply: "How to apply",
    steps: [
      ["Call 15100", "NALSA's free legal aid helpline. They'll tell you the nearest office and what to bring."],
      ["Go to the District Legal Services Authority", "It's usually inside the district court complex. Taluka courts have a Taluk Legal Services Committee; High Courts and the Supreme Court have their own committees."],
      ["Or apply online", "On the NALSA legal services portal at nalsa.gov.in."],
      ["Bring proof and your papers", "Proof of the category you're in (for example a caste or disability certificate) or of your income (an income certificate or a short affidavit), and copies of any notice, FIR or court papers."],
    ],
    form: "Fill in the application", formSub: "Free, prints ready to hand in",
    again: "Start over", help: "Want to understand your problem first?", ask: "Ask Nyaya, free",
    fine: "This checks the categories in the Act. The legal services authority makes the final decision.",
  },
  hi: {
    title: "क्या मुझे", em: "मुफ़्त वकील मिल सकता है?",
    lede: "विधिक सेवा प्राधिकरण अधिनियम के तहत भारत में बहुत से लोगों को वकील, कोर्ट फ़ीस और काग़ज़ों में मदद, सब सरकार के ख़र्च पर पाने का हक़ है। एक मिनट में जाँचें।",
    q1: "क्या इनमें से कोई आप पर लागू होता है?", none: "इनमें से कोई नहीं",
    q2: "क्या आपके परिवार की सालाना आय कम है?",
    q2help: "हर राज्य मुफ़्त क़ानूनी सहायता के लिए अपनी आय सीमा तय करता है, और हाई कोर्ट और सुप्रीम कोर्ट के मामलों के लिए यह सीमा अक्सर ज़्यादा होती है। पैसे की तंगी है तो आवेदन ज़रूर करें: विधिक सेवा कार्यालय आपके लिए जाँच करेगा।",
    low: "हाँ, कम है", notLow: "नहीं, काफ़ी ज़्यादा है", unsure: "पक्का नहीं पता",
    yesTitle: "आप मुफ़्त क़ानूनी सहायता के पात्र हैं।",
    yesWhy: () => "आपकी आय कुछ भी हो, क़ानून आपको मुफ़्त क़ानूनी सेवाओं का हक़ देता है (धारा 12, विधिक सेवा प्राधिकरण अधिनियम)।",
    maybeTitle: "आप बहुत संभव है पात्र हैं। आवेदन करें।",
    maybeWhy: "अगर आपकी आय आपके राज्य की सीमा से कम है, तो आपको मुफ़्त क़ानूनी सेवाओं का हक़ है (धारा 12(h))। फ़ैसला विधिक सेवा कार्यालय करता है; आवेदन मुफ़्त है।",
    noTitle: "शायद मुफ़्त वकील न मिले, पर मुफ़्त मदद फिर भी है।",
    noWhy: "लोक अदालतें कई विवाद बिना कोर्ट फ़ीस के सुलझाती हैं, लीगल एड क्लिनिक मुफ़्त सलाह देते हैं, और NALSA हेल्पलाइन सवालों के जवाब देती है।",
    custody: "हिरासत में हैं? मजिस्ट्रेट को आपको बताना होगा कि आप मुफ़्त वकील ले सकते हैं, और माँगने पर पहली पेशी से ही वकील देना होगा। ज़रूर माँगें।",
    merit: "क़ानूनी सहायता असली क़ानूनी समस्या के लिए है: प्राधिकरण देखता है कि आपका मामला आगे बढ़ाने लायक़ है (धारा 13)।",
    gets: "आपको क्या मिलता है", apply: "आवेदन कैसे करें",
    steps: [
      ["15100 पर कॉल करें", "NALSA की मुफ़्त क़ानूनी सहायता हेल्पलाइन। वे नज़दीकी कार्यालय और ज़रूरी काग़ज़ बताएँगे।"],
      ["ज़िला विधिक सेवा प्राधिकरण जाएँ", "यह आमतौर पर ज़िला अदालत परिसर में होता है। तहसील अदालतों में तालुक विधिक सेवा समिति होती है; हाई कोर्ट और सुप्रीम कोर्ट की अपनी समितियाँ हैं।"],
      ["या ऑनलाइन आवेदन करें", "nalsa.gov.in पर NALSA के विधिक सेवा पोर्टल पर।"],
      ["सबूत और काग़ज़ साथ लाएँ", "आपकी श्रेणी का सबूत (जैसे जाति या दिव्यांगता प्रमाणपत्र) या आय का सबूत (आय प्रमाणपत्र या छोटा हलफ़नामा), और किसी नोटिस, FIR या अदालती काग़ज़ों की प्रतियाँ।"],
    ],
    form: "आवेदन भरें", formSub: "मुफ़्त, जमा करने के लिए तैयार प्रिंट",
    again: "फिर से शुरू करें", help: "पहले अपनी समस्या समझना चाहते हैं?", ask: "Nyaya से पूछें, मुफ़्त",
    fine: "यह अधिनियम की श्रेणियों से जाँचता है। अंतिम फ़ैसला विधिक सेवा प्राधिकरण करता है।",
  },
};

export default function LegalAid() {
  const [lang, setLangState] = useState(pageLang);
  const t = UI[lang];
  const [picked, setPicked] = useState([]);
  const [none, setNone] = useState(false);
  const [income, setIncome] = useState("");

  const cat = CATEGORIES.find((c) => picked.includes(c.id));
  const result = cat ? "yes" : none && income === "low" ? "maybe" : none && income === "unsure" ? "maybe" : none && income === "high" ? "no" : null;

  function changeLang(l) { setLang(l); setLangState(l); }
  function toggle(id) {
    setNone(false);
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }
  function chooseIncome(v) { setIncome(v); trackEvent("legal_aid_check"); }
  function reset() { setPicked([]); setNone(false); setIncome(""); }

  return (
    <main id="main" className="station station--narrow">
      <header className="station-head">
        <h1 className="station-title" lang={lang}>{t.title} <em>{t.em}</em></h1>
        <p className="station-lede" lang={lang}>{t.lede}</p>
        <LangSwitch lang={lang} onChange={changeLang} />
      </header>

      <section className="card aid-q" aria-labelledby="aid-q1">
        <h2 id="aid-q1" className="zone-title" lang={lang}>{t.q1}</h2>
        <ul className="aid-options">
          {CATEGORIES.map((c) => (
            <li key={c.id}>
              <label className={`aid-option${picked.includes(c.id) ? " is-on" : ""}`}>
                <input type="checkbox" checked={picked.includes(c.id)} onChange={() => { toggle(c.id); if (!picked.length) trackEvent("legal_aid_check"); }} />
                <span lang={lang}>{c[lang]}</span>
              </label>
            </li>
          ))}
          <li>
            <label className={`aid-option${none ? " is-on" : ""}`}>
              <input type="checkbox" checked={none} onChange={(e) => { setNone(e.target.checked); setPicked([]); setIncome(""); }} />
              <span lang={lang}>{t.none}</span>
            </label>
          </li>
        </ul>
      </section>

      {none && (
        <section className="card aid-q" aria-labelledby="aid-q2">
          <h2 id="aid-q2" className="zone-title" lang={lang}>{t.q2}</h2>
          <p className="muted" lang={lang}>{t.q2help}</p>
          <div className="aid-choices" role="radiogroup" aria-labelledby="aid-q2">
            {[["low", t.low], ["unsure", t.unsure], ["high", t.notLow]].map(([v, label]) => (
              <button key={v} type="button" role="radio" aria-checked={income === v} className={`choice${income === v ? " is-on" : ""}`} onClick={() => chooseIncome(v)} lang={lang}>{label}</button>
            ))}
          </div>
        </section>
      )}

      {result && (
        <section className={`card aid-result aid-result--${result}`} aria-live="polite">
          <h2 className="aid-verdict" lang={lang}>{result === "yes" ? t.yesTitle : result === "maybe" ? t.maybeTitle : t.noTitle}</h2>
          <p lang={lang}>{result === "yes" ? t.yesWhy(cat.en) : result === "maybe" ? t.maybeWhy : t.noWhy}</p>
          {picked.includes("custody") && <p className="aid-flag" lang={lang}>{t.custody}</p>}
          {result !== "no" && <p className="muted" lang={lang}>{t.merit}</p>}

          {result !== "no" && (
            <>
              <h3 className="zone-title" lang={lang}>{t.gets}</h3>
              <ul className="aid-gets">{GETS[lang].map((g) => <li key={g} lang={lang}>{g}</li>)}</ul>
            </>
          )}

          <h3 className="zone-title" lang={lang}>{t.apply}</h3>
          <ol className="aid-steps">
            {t.steps.map(([h, d], i) => (
              <li key={h}>
                <strong lang={lang}>{i === 0 ? <a href="tel:15100">{h}</a> : i === 2 ? <a href="https://nalsa.gov.in" target="_blank" rel="noreferrer">{h}</a> : h}</strong>
                <span className="muted" lang={lang}>{d}</span>
              </li>
            ))}
          </ol>

          <div className="answer-actions">
            {result !== "no" && (
              <Link to="/templates/legal-aid-application" className="btn btn--lime btn--sm" lang={lang}>{t.form}</Link>
            )}
            <a href="tel:15100" className="btn btn--ghost btn--sm">15100</a>
            <button type="button" className="btn btn--ghost btn--sm" onClick={reset} lang={lang}>{t.again}</button>
          </div>
          {result !== "no" && <p className="mono muted" lang={lang}>{t.formSub}</p>}
        </section>
      )}

      <p className="shared-note muted" lang={lang}>{t.help} <Link to="/" className="text-link">{t.ask}</Link> · <Link to="/rights/free-legal-aid" className="text-link">Free legal aid: your rights</Link> · {t.fine}</p>
    </main>
  );
}
