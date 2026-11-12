import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getLang, setLang } from "../api";
import { GUIDES, HELPLINES, WHEN, findGuideNow } from "../data/guides";
import { ACTS, sectionLabel, sectionPath } from "../lawCodes";
import LangSwitch from "../ui/LangSwitch";
import { setPageMeta } from "../ui/meta";
import NotFound from "./NotFound";

const UI = {
  en: {
    title: "Something just", em: "happened?",
    lede: "Step-by-step help for the moments that can't wait: what to do now, today and this week, with the law behind each step. Research help, not legal advice.",
    all: "All situations", call: "Call", rights: "Know your rights", template: "Use the free template",
    deadline: "Work out your deadlines", hub: "More help on this", tool: "Explain your notice",
    ask: "Ask Nyaya about your situation",
    golden: "When did the money go?",
    goldenOpts: [["hour", "Under an hour ago"], ["day", "Earlier today"], ["older", "Before today"]],
    goldenMsg: {
      hour: "You're inside the golden hour. Call 1930 before anything else: the sooner it's reported, the better the chance the money is frozen before it moves on.",
      day: "Call 1930 now anyway. Money often passes through several accounts, and a fresh report can still catch it in one of them.",
      older: "It's still worth reporting at cybercrime.gov.in and to your bank in writing today. Recovery is harder, but the complaint is what any later refund or case rests on.",
    },
  },
  hi: {
    title: "अभी कुछ", em: "हुआ है?",
    lede: "उन पलों के लिए क़दम-दर-क़दम मदद जो इंतज़ार नहीं कर सकते: अभी, आज और इस हफ़्ते क्या करें, हर क़दम के पीछे का क़ानून भी। यह शोध सहायता है, क़ानूनी सलाह नहीं।",
    all: "सभी स्थितियाँ", call: "कॉल करें", rights: "अपने अधिकार जानें", template: "मुफ़्त टेम्पलेट इस्तेमाल करें",
    deadline: "अपनी समय-सीमा निकालें", hub: "इस पर और मदद", tool: "अपना नोटिस समझें",
    ask: "अपनी स्थिति के बारे में Nyaya से पूछें",
    golden: "पैसा कब गया?",
    goldenOpts: [["hour", "एक घंटे से कम पहले"], ["day", "आज ही, पहले"], ["older", "आज से पहले"]],
    goldenMsg: {
      hour: "आप \"गोल्डन आवर\" में हैं। सबसे पहले 1930 पर कॉल करें: जितनी जल्दी रिपोर्ट, उतनी ज़्यादा संभावना कि पैसा आगे जाने से पहले रोक दिया जाए।",
      day: "फिर भी अभी 1930 पर कॉल करें। पैसा अक्सर कई खातों से होकर जाता है, और ताज़ा रिपोर्ट से किसी एक में रुक सकता है।",
      older: "आज ही cybercrime.gov.in पर और बैंक को लिखित में रिपोर्ट करना फिर भी ज़रूरी है। पैसा वापस मिलना मुश्किल है, लेकिन आगे का कोई भी रिफ़ंड या केस इसी शिकायत पर टिकता है।",
    },
  },
};

function Helplines({ nums, lang, t }) {
  if (!nums?.length) return null;
  return (
    <ul className="now-lines" aria-label={lang === "hi" ? "हेल्पलाइन" : "Helplines"}>
      {nums.map((n) => (
        <li key={n}>
          <a href={`tel:${n}`} className="now-line">
            <span className="now-line-num mono">{n}</span>
            <span className="now-line-name" lang={lang}>{HELPLINES[n]?.[lang]}</span>
            <span className="now-line-call" aria-hidden="true">{t.call}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function GoldenHour({ lang, t }) {
  const [pick, setPick] = useState(null);
  return (
    <section className="card now-golden" aria-labelledby="golden-q">
      <h2 id="golden-q" className="zone-title" lang={lang}>{t.golden}</h2>
      <div className="now-golden-opts" role="group" aria-labelledby="golden-q">
        {t.goldenOpts.map(([k, label]) => (
          <button key={k} type="button" className="choice" aria-pressed={pick === k} onClick={() => setPick(k)} lang={lang}>{label}</button>
        ))}
      </div>
      {pick && <p className={`now-golden-msg now-golden-msg--${pick}`} role="status" lang={lang}>{t.goldenMsg[pick]}</p>}
    </section>
  );
}

function Guide({ g, lang, t }) {
  const navigate = useNavigate();
  const groups = Object.keys(WHEN).map((w) => [w, g.steps.filter((s) => s.when === w)]).filter(([, s]) => s.length);
  const l = g.links || {};
  return (
    <>
      <Helplines nums={g.helplines} lang={lang} t={t} />
      {g.slug === "cyber-fraud" && <GoldenHour lang={lang} t={t} />}
      {groups.map(([w, steps]) => (
        <section key={w} className="now-when">
          <h2 className="now-when-title" lang={lang}><span className={`now-dot now-dot--${w}`} aria-hidden="true" />{WHEN[w][lang]}</h2>
          <ol className="rights-points">
            {steps.map((s, i) => (
              <li key={i} className="card">
                <p lang={lang}>{s[lang]}</p>
                {s.cite && ACTS[s.cite[0]] && (
                  <Link to={sectionPath(...s.cite)} className="rights-cite mono">{sectionLabel(...s.cite)}</Link>
                )}
              </li>
            ))}
          </ol>
        </section>
      ))}
      <div className="answer-actions">
        <button type="button" className="btn btn--lime btn--sm" onClick={() => navigate("/", { state: { rerunQuestion: `${g.title.en}: what should I do?` } })}>{t.ask}</button>
        {g.deadline && <Link to={`/deadlines?for=${g.deadline}`} className="btn btn--ghost btn--sm">{t.deadline}</Link>}
        {l.tool && <Link to={l.tool} className="btn btn--ghost btn--sm">{t.tool}</Link>}
        {l.template && <Link to={`/templates/${l.template}`} className="btn btn--ghost btn--sm">{t.template}</Link>}
        {l.rights && <Link to={`/rights/${l.rights}`} className="btn btn--ghost btn--sm">{t.rights}</Link>}
        {l.hub && <Link to={`/help/${l.hub}`} className="btn btn--ghost btn--sm">{t.hub}</Link>}
        <Link to="/now" className="btn btn--ghost btn--sm">{t.all}</Link>
      </div>
    </>
  );
}

export default function Now() {
  const { slug } = useParams();
  const [lang, setLangState] = useState(getLang());
  const t = UI[lang];
  const g = slug ? findGuideNow(slug) : null;

  function changeLang(l) { setLang(l); setLangState(l); }

  useEffect(() => {
    if (g) setPageMeta({ title: `${g.title.en}: what to do now · Nyaya`, description: g.lede.en, path: `/now/${g.slug}` });
  }, [g]);

  if (slug && !g) return <NotFound />;

  return (
    <main id="main" className="station">
      <header className="station-head">
        {g ? (
          <>
            <p className="mono muted"><Link to="/now" className="text-link">{t.all}</Link></p>
            <h1 className="station-title" lang={lang}><em>{g.title[lang]}</em></h1>
            <p className="station-lede" lang={lang}>{g.lede[lang]}</p>
          </>
        ) : (
          <>
            <h1 className="station-title" lang={lang}>{t.title} <em>{t.em}</em></h1>
            <p className="station-lede" lang={lang}>{t.lede}</p>
          </>
        )}
        <LangSwitch lang={lang} onChange={changeLang} />
      </header>

      {g ? <Guide g={g} lang={lang} t={t} /> : (
        <>
          <Helplines nums={["112", "1930", "181", "15100"]} lang={lang} t={t} />
          <ul className="tile-grid">
            {GUIDES.map((x) => (
              <li key={x.slug}>
                <Link to={`/now/${x.slug}`} className="card tile">
                  <span className="tile-title" lang={lang}>{x.title[lang]}</span>
                  <span className="tile-sub muted" lang={lang}>{x.lede[lang]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
