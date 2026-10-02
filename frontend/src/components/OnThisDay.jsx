import { useState, useEffect } from "react";

const API_URL = "https://legal-research-backend-256323345647.us-central1.run.app";

export default function OnThisDay() {
  const [judgment, setJudgment] = useState(undefined); // undefined = loading, null = none found

  useEffect(() => {
    fetch(`${API_URL}/on-this-day`)
      .then((res) => res.json())
      .then((data) => setJudgment(data.judgment || null))
      .catch(() => setJudgment(null));
  }, []);

  if (judgment === undefined || judgment === null) return null;

  const dateLabel = (() => {
    const d = new Date(judgment.decision_date);
    return isNaN(d) ? judgment.decision_date : d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  })();

  return (
    <div className="on-this-day">
      <div className="kicker">ON THIS DAY</div>
      <div className="otd-title">{judgment.title}</div>
      <div className="otd-meta">{judgment.citation} &middot; decided {dateLabel}</div>
      {judgment.blurb && <p className="otd-blurb">{judgment.blurb}</p>}
      {judgment.source_url && judgment.source_url !== "nan" && (
        <a href={judgment.source_url} target="_blank" rel="noreferrer" className="otd-link">
          Read the full judgment &rarr;
        </a>
      )}
    </div>
  );
}
