import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { API_URL } from "../api";
import ResultView from "../ui/ResultView";
import ShareTools from "../ui/ShareTools";

const day = (v) => (v ? new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "");

// Who stands behind the answer and how fresh it is: shown to people, and the same facts
// go into the page's structured data for search engines (see /seo/a/<id> in library.py).
function Byline({ data }) {
  const { review } = data;
  const updated = review?.date || data.updated || data.created;
  return (
    <div className="answer-byline">
      {review ? (
        <p><span className="answer-reviewed" aria-hidden="true">✓</span> Reviewed by <strong>{review.name}</strong>{review.credential ? `, ${review.credential}` : ""}, on {day(review.date)}</p>
      ) : data.library ? (
        <p>Written by Nyaya from the judgments and Acts listed with it. Not yet reviewed by an advocate.</p>
      ) : (
        <p>Answered by Nyaya for someone who asked, from the sources listed with it.</p>
      )}
      <p className="mono muted">{data.created && `Written ${day(data.created)}`}{updated && updated !== data.created ? ` · Updated ${day(updated)}` : ""} · <Link to="/about#checks" className="text-link">How we check answers</Link></p>
    </div>
  );
}

export default function SharedAnswer() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [more, setMore] = useState([]);

  // Listed answers link to other answers, so people and crawlers keep going.
  // (Structured data comes with the page itself: see /seo/a/<id> in library.py.)
  useEffect(() => {
    if (!data?.public) return undefined;
    let live = true;
    fetch(`${API_URL}/answers?limit=12`).then((r) => (r.ok ? r.json() : null))
      .then((d) => live && d && setMore((d.answers || []).filter((a) => a.id !== id).slice(0, 6)))
      .catch(() => {});
    return () => { live = false; };
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
        {data && <Byline data={data} />}
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
