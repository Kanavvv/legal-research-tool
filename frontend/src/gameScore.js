import { authFetch } from "./authFetch";
import { API_URL } from "./api";


/**
 * Submits a game result if signed in. Silently does nothing if signed out --
 * games stay fully playable without an account, this is just the "count it
 * toward my streak and the leaderboard" layer on top.
 * Returns { is_new_best, streak, total_score } or null.
 */
export async function submitGameScore(game, score, maxScore) {
  try {
    const res = await authFetch(`${API_URL}/game-score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game, score, max_score: maxScore }),
    });
    if (!res) return null; // not signed in
    return await res.json();
  } catch (_) {
    return null;
  }
}
