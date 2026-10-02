import { useState, useEffect } from "react";

const API_URL = "https://legal-research-backend-256323345647.us-central1.run.app";

export default function Leaderboard({ refreshKey }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/leaderboard`)
      .then((res) => res.json())
      .then((data) => setRows(data.leaderboard || []))
      .catch(() => setRows([]));
  }, [refreshKey]);

  if (rows === null) return null;
  if (rows.length === 0) {
    return (
      <div className="leaderboard-box">
        <div className="section-label">Leaderboard</div>
        <div className="related-empty">No scores yet &mdash; be the first on the board.</div>
      </div>
    );
  }

  return (
    <div className="leaderboard-box">
      <div className="section-label">Leaderboard</div>
      <div className="leaderboard-list">
        {rows.map((r, i) => (
          <div key={i} className="leaderboard-row">
            <span className="leaderboard-rank">{i + 1}</span>
            <span className="leaderboard-name">{r.displayName}</span>
            {r.streak > 1 && <span className="leaderboard-streak">&#128293;{r.streak}</span>}
            <span className="leaderboard-score">{r.totalScore} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
}
