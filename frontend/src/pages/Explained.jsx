import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { API_URL } from "../api";
import ResultView from "../ui/ResultView";
import ShareTools from "../ui/ShareTools";
import { trackEvent } from "../ui/track";

function setHead(title, desc) {
  document.title = title;
  document.head.querySelector('meta[name="description"]')?.setAttribute("content", desc);
  document.head.querySelector('meta[property="og:title"]')?.setAttribute("content", title);
  document.head.querySelector('meta[property="og:description"]')?.setAttribute("content", desc);
}

const day = (v) => (v ? new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "");

function List() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch(`${API_URL}/explainers`).then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => setRows(d.explainers || []))
      .catch(() => setError("Couldn't load explainers right now."));
  }, []);
  return (
    <main id="main" className="station">
      <header className="station-head">
        <h1 className="station-title">In the news, <em>explained</em>.</h1>
        <p className="station-lede">When a judgment or a new rule makes headlines, what it actually says and what it means for you, from the law itself.</p>
      </header>
      {error && <div className="alert" role="alert">{error}</div>}
      {!rows && !error && <div className="skeleton" aria-hidden="true"><span /><span /><span /></div>}
      {rows && rows.length === 0 && <p className="muted">The first explainers are on their way. Meanwhile, <Link to="/digest" className="text-link">read this week in the Supreme Court</Link>.</p>}
      {rows && rows.length > 0 && (
        <ul className="answers-list">
          {rows.map((x) => (
            <li key={x.slug}>
              <Link to={`/explained/${x.slug}`} className="card answers-item" onClick={() => trackEvent("explainer_open")}>
                <span className="mono muted">{day(x.date)}</span>
                <span className="answers-q">{x.title}</span>
                {x.dek && <span className="muted answers-snip">{x.dek}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function One({ slug }) {
  const [x, setX] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    fetch(`${API_URL}/explainers/${encodeURIComponent(slug)}`).then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        if (!live) return;
        setX(d);
        setHead(`${d.title} · Nyaya`, d.dek || d.title);
      })
      .catch(() => live && setError("This explainer doesn't exist or was taken down."));
    return () => { live = false; };
  }, [slug]);

  // Structured data so search engines can show the questions and answers directly
  useEffect(() => {
    if (!x) return undefined;
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.text = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "Article", headline: x.title, description: x.dek, datePublished: x.published_at || x.created,
          dateModified: x.updated, publisher: { "@type": "Organization", name: "Nyaya", url: "https://asknyaya.in" } },
        ...(x.faq?.length ? [{ "@type": "FAQPage", mainEntity: x.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }] : []),
      ],
    });
    document.head.appendChild(el);
    return () => el.remove();
  }, [x]);

  return (
    <main id="main" className="station">
      <header className="result-head">
        <p className="mono muted"><Link to="/explained" className="text-link">explained</Link>{x?.published_at ? ` · ${day(x.published_at)}` : ""}</p>
        <h1 className="result-q">{x ? x.title : error ? "Not found" : "Loading…"}</h1>
        {x?.dek && <p className="station-lede">{x.dek}</p>}
      </header>
      {error && <div className="alert" role="alert">{error}</div>}
      {x && (
        <ResultView answer={x.body} sources={x.sources || []}
          actions={
            <div className="answer-actions">
              <Link to="/" className="btn btn--lime btn--sm">Ask about your situation</Link>
              <ShareTools question={x.title} answer={x.dek || x.title} sources={(x.sources || []).length}
                url={`${window.location.origin}/explained/${x.slug}`} text={`${x.title}\n\nWhat it means for you, explained with the law:`} />
            </div>
          } />
      )}
      {x?.faq?.length > 0 && (
        <section className="trend-section" aria-labelledby="exp-faq">
          <h2 id="exp-faq" className="zone-title">Questions people ask</h2>
          {x.faq.map((f) => (
            <details key={f.q} className="card explainer-faq">
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>
      )}
      <p className="shared-note muted">Research help, not legal advice.</p>
    </main>
  );
}

export default function Explained() {
  const { slug } = useParams();
  return slug ? <One slug={slug} /> : <List />;
}
