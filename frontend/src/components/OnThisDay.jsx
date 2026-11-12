import { useState, useEffect } from "react";
import Reveal from "../ui/Reveal";
import { API_URL } from "../api";


export default function OnThisDay() {
  const [judgment, setJudgment] = useState(undefined); // undefined = loading, null = none found

  useEffect(() => {
    fetch(`${API_URL}/on-this-day`)
      .then((res) => res.json())
      .then((data) => setJudgment(data.judgment || null))
      .catch(() => setJudgment(null));
  }, []);

  if (!judgment) return null;

  const d = new Date(judgment.decision_date);
  const dateLabel = isNaN(d)
    ? judgment.decision_date
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  return (
    <Reveal as="section" className="card tool tool--day" style={{ "--i": 3 }} aria-labelledby="otd-title">
      <div className="card-bar">
        <span className="mono">on this day</span>
        <span className="mono muted">{dateLabel}</span>
      </div>
      <h3 id="otd-title" className="otd-title">{judgment.title}</h3>
      <p className="mono muted">{judgment.citation}</p>
      {judgment.blurb && <p className="otd-blurb">{judgment.blurb}</p>}
      {judgment.source_url && judgment.source_url !== "nan" && (
        <a href={judgment.source_url} target="_blank" rel="noreferrer" className="text-link">Read the full judgment</a>
      )}
    </Reveal>
  );
}
