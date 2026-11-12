import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { API_URL } from "../api";
import ResultView from "../ui/ResultView";
import ShareTools from "../ui/ShareTools";

export default function SharedAnswer() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [more, setMore] = useState([]);

  // Listed answers: structured data for search, and links to other answers so people and crawlers keep going
  useEffect(() => {
    if (!data?.public) return undefined;
    const plain = data.answer.replace(/\[Source \d+\]/g, "").replace(/[#*_>`]/g, "").trim();
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.text = JSON.stringify({
      "@context": "https://schema.org", "@type": "QAPage",
      mainEntity: { "@type": "Question", name: data.question, answerCount: 1, dateCreated: data.created,
        acceptedAnswer: { "@type": "Answer", text: plain.slice(0, 5000), dateCreated: data.created, url: window.location.href.split("?")[0],
          author: { "@type": "Organization", name: "Nyaya", url: "https://asknyaya.in" } } },
    });
    document.head.appendChild(el);
    let live = true;
    fetch(`${API_URL}/answers?limit=12`).then((r) => (r.ok ? r.json() : null))
      .then((d) => live && d && setMore((d.answers || []).filter((a) => a.id !== id).slice(0, 6)))
      .catch(() => {});
    return () => { live = false; el.remove(); };
  }, [data, id]);

  useEffect(() => {
    let live = true;
    fetch(`${API_URL}/share/${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        if (!live) return;
        setData(d);
        document.title = `${d.question.slice(0, 70)} · Nyaya`;
        const desc = d.answer.replace(/[#*_>`[\]]/g, "").replace(/\s+/g, " ").trim().slice(0, 155);
        document.head.querySelector('meta[name="description"]')?.setAttribute("content", desc);
        document.head.querySelector('meta[property="og:title"]')?.setAttribute("content", d.question.slice(0, 90));
        document.head.querySelector('meta[property="og:description"]')?.setAttribute("content", desc);
        // Only answers their maker chose to list are indexed; the rest stay private.
        let robots = document.head.querySelector('meta[name="robots"]');
        if (d.public) robots?.remove();
        else {
          if (!robots) { robots = document.createElement("meta"); robots.name = "robots"; document.head.appendChild(robots); }
          robots.content = "noindex";
        }
      })
      .catch(() => live && setError("This shared answer doesn't exist, or the link was copied incompletely."));
    return () => { live = false; };
  }, [id]);

  return (
    <main id="main" className="station">
      <header className="result-head">
        <p className="mono muted">shared answer</p>
        <h1 className="result-q">{data ? data.question : error ? "Not found" : "Loading…"}</h1>
        {data?.created && <p className="mono muted">answered {new Date(data.created).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>}
      </header>
      {error && <div className="alert" role="alert">{error}</div>}
      {data && (
        <ResultView
          answer={data.answer}
          sources={data.sources}
          actions={
            <div className="answer-actions">
              <Link to="/" className="btn btn--lime btn--sm">Ask your own question</Link>
              <ShareTools question={data.question} answer={data.answer} sources={data.sources.length} url={`${window.location.origin}/a/${id}`} />
            </div>
          }
        />
      )}
      {more.length > 0 && (
        <section className="trend-section" aria-labelledby="more-answers">
          <h2 id="more-answers" className="zone-title">More questions people asked</h2>
          <ul className="hub-questions">
            {more.map((a) => <li key={a.id}><Link to={`/a/${a.id}`} className="choice hub-q">{a.question}</Link></li>)}
          </ul>
          <p><Link to="/answers" className="text-link">See all answered questions</Link></p>
        </section>
      )}
      <p className="shared-note muted">Nyaya answers are research help, not legal advice. Laws and judgments change; check the sources.</p>
    </main>
  );
}
