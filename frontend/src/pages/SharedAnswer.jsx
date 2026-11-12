import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { API_URL } from "../api";
import ResultView from "../ui/ResultView";

export default function SharedAnswer() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

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
            </div>
          }
        />
      )}
      <p className="shared-note muted">Nyaya answers are research help, not legal advice. Laws and judgments change; check the sources.</p>
    </main>
  );
}
