import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { HOW_LONG, NJDG, findHowLong } from "../data/howLong";
import { ACTS, sectionPath } from "../lawCodes";
import { setPageMeta } from "../ui/meta";
import { trackEvent } from "../ui/track";
import NotFound from "./NotFound";

function One({ h }) {
  useEffect(() => {
    setPageMeta({ title: `${h.q.replace(/\?$/, "")}: what the law says · Nyaya`, description: h.short, path: `/how-long/${h.slug}` });
    trackEvent("how_long_open");
  }, [h]);

  return (
    <main id="main" className="station station--narrow">
      <header className="station-head">
        <p className="mono muted"><Link to="/how-long" className="text-link">How long will my case take?</Link></p>
        <h1 className="station-title">{h.q.replace(/ in India\?$/, "?")}</h1>
        <p className="station-lede">{h.short}</p>
      </header>

      <section aria-labelledby="hl-law">
        <h2 id="hl-law" className="zone-title">What the law says</h2>
        <ol className="dl-steps">
          {h.law.map((s) => (
            <li key={s.step} className="card dl-step dl-step--ok">
              <p className="dl-label">{s.step}</p>
              <p className="hl-time">{s.time}</p>
              {s.cite && ACTS[s.cite[0]]
                ? <Link to={sectionPath(...s.cite)} className="rights-cite mono">{s.law}</Link>
                : <span className="rights-cite mono">{s.law}</span>}
            </li>
          ))}
        </ol>
      </section>

      <section className="card hl-real" aria-labelledby="hl-why">
        <h2 id="hl-why" className="zone-title">Why it usually takes longer</h2>
        <p>{h.why}</p>
        <p className="muted">For the live numbers in your own court (how many cases are pending and for how long), look up your district on the <a href={NJDG} target="_blank" rel="noreferrer" className="text-link">National Judicial Data Grid</a>. You can track your own case there or on the eCourts app with its CNR number.</p>
      </section>

      <section aria-labelledby="hl-fast">
        <h2 id="hl-fast" className="zone-title">How to make yours faster</h2>
        <ul className="aid-gets">{h.faster.map((f) => <li key={f}>{f}</li>)}</ul>
      </section>

      <div className="answer-actions">
        <Link to="/cases" className="btn btn--lime btn--sm">Get hearing-date reminders</Link>
        <Link to="/" className="btn btn--ghost btn--sm">Ask about your case</Link>
      </div>

      {h.links?.length > 0 && (
        <section className="trend-section" aria-labelledby="hl-more">
          <h2 id="hl-more" className="zone-title">Related</h2>
          <ul className="hub-questions">{h.links.map(([to, label]) => <li key={to}><Link to={to} className="choice hub-q">{label}</Link></li>)}</ul>
        </section>
      )}
      <p className="shared-note muted">These are the time limits the law sets, not a promise about any case. Research help, not legal advice.</p>
    </main>
  );
}

export default function HowLong() {
  const { slug } = useParams();
  if (slug) {
    const h = findHowLong(slug);
    return h ? <One key={h.slug} h={h} /> : <NotFound />;
  }
  return (
    <main id="main" className="station">
      <header className="station-head">
        <h1 className="station-title">How long will <em>my case</em> take?</h1>
        <p className="station-lede">The first thing everyone asks a lawyer. For the cases people face most: the time the law itself sets, why real cases take longer, and what you can do to speed yours up.</p>
      </header>
      <ul className="tile-grid">
        {HOW_LONG.map((h) => (
          <li key={h.slug}>
            <Link to={`/how-long/${h.slug}`} className="card tile">
              <span className="tile-title">{h.title}</span>
              <span className="tile-sub muted">{h.short}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="shared-note muted">Live pendency for every court is on the <a href={NJDG} target="_blank" rel="noreferrer" className="text-link">National Judicial Data Grid</a>.</p>
    </main>
  );
}
