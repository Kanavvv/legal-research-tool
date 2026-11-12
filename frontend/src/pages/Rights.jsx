import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { pageLang, setLang } from "../api";
import { RIGHTS, findGuide } from "../data/rights";
import { ACTS, sectionLabel, sectionPath } from "../lawCodes";
import { setPageMeta } from "../ui/meta";
import NotFound from "./NotFound";
import LangSwitch from "../ui/LangSwitch";

const UI = {
  en: { title: "Know your", em: "rights.", lede: "Short guides to the rights people most often need, each point tied to the section it comes from. Research help, not legal advice.", ask: "Ask Nyaya about your situation", all: "All guides", help: "Getting help", template: "Use the free template", listen: "Read aloud", stop: "Stop" },
  hi: { title: "अपने", em: "अधिकार जानें।", lede: "उन अधिकारों पर छोटी गाइड जिनकी लोगों को सबसे ज़्यादा ज़रूरत पड़ती है, हर बात उस धारा से जुड़ी जहाँ से वह आती है। यह शोध सहायता है, क़ानूनी सलाह नहीं।", ask: "अपनी स्थिति के बारे में Nyaya से पूछें", all: "सभी गाइड", help: "मदद कहाँ मिलेगी", template: "मुफ़्त टेम्पलेट इस्तेमाल करें", listen: "पढ़कर सुनाएँ", stop: "रोकें" },
};

function Guide({ g, lang, t }) {
  const navigate = useNavigate();
  const [speaking, setSpeaking] = useState(false);
  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => () => canSpeak && window.speechSynthesis.cancel(), [canSpeak]);

  function speak() {
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const text = [g.title[lang], g.lede[lang], ...g.points.map((p) => p[lang]), g.help[lang]].join(". ");
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "hi" ? "hi-IN" : "en-IN";
    u.onend = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  }

  return (
    <>
      <ol className="rights-points">
        {g.points.map((p, i) => (
          <li key={i} className="card">
            <p lang={lang}>{p[lang]}</p>
            {p.cite && ACTS[p.cite[0]] && (
              <Link to={sectionPath(...p.cite)} className="rights-cite mono">{sectionLabel(...p.cite)}</Link>
            )}
          </li>
        ))}
      </ol>
      <aside className="card rights-help" lang={lang}>
        <h2 className="zone-title">{t.help}</h2>
        <p>{g.help[lang]}</p>
      </aside>
      <div className="answer-actions">
        <button type="button" className="btn btn--lime btn--sm" onClick={() => navigate("/", { state: { rerunQuestion: `${g.title.en}: what are my rights and what should I do?` } })}>{t.ask}</button>
        {g.template && <Link to={`/templates/${g.template}`} className="btn btn--ghost btn--sm">{t.template}</Link>}
        {canSpeak && <button type="button" className="btn btn--ghost btn--sm" onClick={speak} aria-pressed={speaking}>{speaking ? t.stop : t.listen}</button>}
        <Link to="/rights" className="btn btn--ghost btn--sm">{t.all}</Link>
      </div>
    </>
  );
}

export default function Rights() {
  const { slug } = useParams();
  const [lang, setLangState] = useState(pageLang);
  const t = UI[lang];
  const g = slug ? findGuide(slug) : null;

  function changeLang(l) { setLang(l); setLangState(l); }

  useEffect(() => {
    if (g) {
      setPageMeta({
        title: `${g.title.en} (${g.title.hi}): know your rights · Nyaya`,
        description: g.lede.en,
        path: `/rights/${g.slug}`,
      });
    }
  }, [g]);

  if (slug && !g) return <NotFound />;

  return (
    <main id="main" className="station">
      <header className="station-head">
        {g ? (
          <>
            <p className="mono muted"><Link to="/rights" className="text-link">{t.all}</Link></p>
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

      {g ? (
        <Guide g={g} lang={lang} t={t} />
      ) : (
        <ul className="tile-grid">
          {RIGHTS.map((r) => (
            <li key={r.slug}>
              <Link to={`/rights/${r.slug}`} className="card tile">
                <span className="tile-title" lang={lang}>{r.title[lang]}</span>
                <span className="tile-sub muted" lang={lang}>{r.lede[lang]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
