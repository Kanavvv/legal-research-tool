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

  return (
    <div className="board">
      <h4 className="board-title">Deepest divers</h4>
      {rows.length === 0 ? (
        <p className="muted">No scores yet. Be the first on the board.</p>
      ) : (
        <ol className="board-list">
          {rows.map((r, i) => (
            <li key={i} className="board-row">
              <span className="board-rank">{String(i + 1).padStart(2, "0")}</span>
              <span className="board-name">{r.displayName}</span>
              {r.streak > 1 && <span className="board-streak">{r.streak}-day streak</span>}
              <span className="board-score">{r.totalScore} pts</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
