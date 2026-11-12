import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { pageLang, setLang } from "../api";
import { DEADLINES } from "../data/deadlines";
import { GUIDES, HELPLINES } from "../data/guides";
import { HUBS, findHub } from "../data/hubs";
import { RIGHTS } from "../data/rights";
import { TEMPLATES } from "../data/templates";
import LangSwitch from "../ui/LangSwitch";
import { setPageMeta } from "../ui/meta";
import NotFound from "./NotFound";

const UI = {
  en: {
    title: "Help with", em: "everyday law.", lede: "Everything Nyaya has on one problem, in one place: what to do now, your rights, deadlines, free templates and the questions people ask most.",
    all: "All topics", now: "If something just happened", rights: "Know your rights", templates: "Free templates", deadlines: "Your deadlines",
    tips: "Good to know", ask: "Questions people ask", call: "Helplines", legal: "Is this legal?", legalSub: "Describe your situation and get a straight answer with the law behind it.",
  },
  hi: {
    title: "रोज़मर्रा के क़ानून में", em: "मदद।", lede: "एक समस्या पर Nyaya के पास जो कुछ है, एक जगह: अभी क्या करें, आपके अधिकार, समय-सीमाएँ, मुफ़्त टेम्पलेट और लोगों के सबसे आम सवाल।",
    all: "सभी विषय", now: "अगर अभी कुछ हुआ है", rights: "अपने अधिकार जानें", templates: "मुफ़्त टेम्पलेट", deadlines: "आपकी समय-सीमाएँ",
    tips: "काम की बातें", ask: "लोग क्या पूछते हैं", call: "हेल्पलाइन", legal: "क्या यह क़ानूनी है?", legalSub: "अपनी स्थिति बताइए और क़ानून के साथ सीधा जवाब पाइए।",
  },
};

function Tiles({ items, lang }) {
  return (
    <ul className="tile-grid">
      {items.map((x) => (
        <li key={x.to}>
          <Link to={x.to} className="card tile">
            <span className="tile-title" lang={lang}>{x.title}</span>
            {x.sub && <span className="tile-sub muted" lang={lang}>{x.sub}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Section({ title, children, lang }) {
  return (
    <section className="tools-group">
      <h2 className="zone-title" lang={lang}>{title}</h2>
      {children}
    </section>
  );
}

export default function Hub() {
  const { slug } = useParams();
  const [lang, setLangState] = useState(pageLang);
  const t = UI[lang];
  const h = slug ? findHub(slug) : null;

  function changeLang(l) { setLang(l); setLangState(l); }

  useEffect(() => {
    if (h) setPageMeta({ title: `${h.title.en} (${h.title.hi}): help and rights · Nyaya`, description: h.lede.en, path: `/help/${h.slug}` });
  }, [h]);

  if (slug && !h) return <NotFound />;

  const now = h ? h.now.map((s) => GUIDES.find((g) => g.slug === s)).filter(Boolean).map((g) => ({ to: `/now/${g.slug}`, title: g.title[lang], sub: g.lede[lang] })) : [];
  const rights = h ? h.rights.map((s) => RIGHTS.find((g) => g.slug === s)).filter(Boolean).map((g) => ({ to: `/rights/${g.slug}`, title: g.title[lang], sub: g.lede[lang] })) : [];
  const tpls = h ? h.templates.map((s) => TEMPLATES.find((g) => g.slug === s)).filter(Boolean).map((g) => ({ to: `/templates/${g.slug}`, title: g.title, sub: g.blurb })) : [];
  const dls = h ? h.deadlines.map((s) => DEADLINES.find((d) => d.id === s)).filter(Boolean).map((d) => ({ to: `/deadlines?for=${d.id}`, title: d.title[lang], sub: d.blurb[lang] })) : [];

  return (
    <main id="main" className="station">
      <header className="station-head">
        {h ? (
          <>
            <p className="mono muted"><Link to="/help" className="text-link">{t.all}</Link></p>
            <h1 className="station-title" lang={lang}><em>{h.title[lang]}</em></h1>
            <p className="station-lede" lang={lang}>{h.lede[lang]}</p>
          </>
        ) : (
          <>
            <h1 className="station-title" lang={lang}>{t.title} <em>{t.em}</em></h1>
            <p className="station-lede" lang={lang}>{t.lede}</p>
          </>
        )}
        <LangSwitch lang={lang} onChange={changeLang} />
      </header>

      {!h ? <Tiles lang={lang} items={HUBS.map((x) => ({ to: `/help/${x.slug}`, title: x.title[lang], sub: x.lede[lang] }))} /> : (
        <>
          {h.helplines.length > 0 && (
            <ul className="now-lines" aria-label={t.call}>
              {h.helplines.map((n) => (
                <li key={n}>
                  <a href={`tel:${n}`} className="now-line">
                    <span className="now-line-num mono">{n}</span>
                    <span className="now-line-name" lang={lang}>{HELPLINES[n]?.[lang]}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          {now.length > 0 && <Section title={t.now} lang={lang}><Tiles items={now} lang={lang} /></Section>}
          {h.tips && (
            <Section title={t.tips} lang={lang}>
              <ol className="rights-points">{h.tips[lang].map((x) => <li key={x} className="card"><p lang={lang}>{x}</p></li>)}</ol>
            </Section>
          )}
          {rights.length > 0 && <Section title={t.rights} lang={lang}><Tiles items={rights} lang={lang} /></Section>}
          {(tpls.length > 0 || dls.length > 0) && (
            <Section title={`${tpls.length ? t.templates : ""}${tpls.length && dls.length ? " · " : ""}${dls.length ? t.deadlines : ""}`} lang={lang}>
              <Tiles items={[...tpls, ...dls]} lang={lang} />
            </Section>
          )}
          <Section title={t.ask} lang={lang}>
            <ul className="hub-questions">
              {h.questions[lang].map((q) => (
                <li key={q}><Link to="/" state={{ rerunQuestion: q }} className="choice hub-q" lang={lang}>{q}</Link></li>
              ))}
            </ul>
            <Tiles lang={lang} items={[{ to: "/is-it-legal", title: t.legal, sub: t.legalSub }]} />
          </Section>
        </>
      )}
    </main>
  );
}
