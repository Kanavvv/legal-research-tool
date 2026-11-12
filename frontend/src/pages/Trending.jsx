import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_URL } from "../api";
import { HUBS } from "../data/hubs";
import { trackEvent } from "../ui/track";

// What people are asking: questions the team picked this week, the most-read answers people
// chose to make public, and everyday questions by topic.
export default function Trending() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let live = true;
    fetch(`${API_URL}/trending`).then((r) => (r.ok ? r.json() : null)).then((d) => live && setData(d || { featured: [], most_read: [] }))
      .catch(() => live && setData({ featured: [], most_read: [] }));
    return () => { live = false; };
  }, []);

  const featured = data?.featured || [];
  const mostRead = data?.most_read || [];
  const everyday = HUBS.slice(0, 6).map((h) => ({ topic: h.title.en, slug: h.slug, q: h.questions.en[0] }));

  return (
    <main id="main" className="station">
      <header className="station-head">
        <p className="mono muted">this week</p>
        <h1 className="station-title">What India is <em>asking</em></h1>
        <p className="station-lede">Real questions people bring to Nyaya, picked each week. Tap one to get the answer, with the law and judgments behind it. Free.</p>
      </header>

      {!data && <div className="skeleton" aria-hidden="true"><span /><span /><span /></div>}

      {featured.length > 0 && (
        <ol className="trend-list">
          {featured.map((f, i) => (
            <li key={`${f.title}-${i}`}>
              <Link className="card trend-item" to={f.share_id ? `/a/${f.share_id}` : "/"} state={f.share_id ? undefined : { rerunQuestion: f.question }}
                onClick={() => trackEvent("trending_open")}>
                <span className="trend-rank mono" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <span className="trend-body">
                  {f.topic && <span className="trend-topic mono">{f.topic}</span>}
                  <span className="trend-title">{f.title}</span>
                  <span className="trend-go muted">{f.share_id ? "Read the answer" : "Get the answer"} →</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}

      {mostRead.length > 0 && (
        <section className="trend-section">
          <h2 className="zone-title">Most-read answers</h2>
          <ul className="hub-questions">
            {mostRead.map((m) => (
              <li key={m.share_id}><Link to={`/a/${m.share_id}`} className="choice hub-q" onClick={() => trackEvent("trending_open")}>{m.title}</Link></li>
            ))}
          </ul>
        </section>
      )}

      <section className="trend-section">
        <h2 className="zone-title">{featured.length || mostRead.length ? "Everyday questions, by topic" : "Questions people ask every day"}</h2>
        <ul className="trend-topics">
          {everyday.map((e) => (
            <li key={e.slug} className="card">
              <Link to={`/help/${e.slug}`} className="trend-topic mono">{e.topic}</Link>
              <Link to="/" state={{ rerunQuestion: e.q }} className="trend-q" onClick={() => trackEvent("trending_open")}>{e.q}</Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="shared-note muted">Nyaya answers are research help, not legal advice. <Link to="/" className="text-link">Ask your own question</Link></p>
    </main>
  );
}
