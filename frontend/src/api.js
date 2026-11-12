import { auth } from "./firebase";

// One place for the backend's address. Set VITE_API_URL in Vercel to move it
// (for example to https://api.asknyaya.in) without touching the code.
export const API_URL = (import.meta.env.VITE_API_URL || "https://api.asknyaya.in").replace(/\/$/, "");

// fetch, plus the signed-in user's token when there is one, so the server can
// apply their plan. Signed-out visitors are sent exactly as before.
export async function apiFetch(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  const user = auth.currentUser;
  if (user) {
    try { headers.Authorization = `Bearer ${await user.getIdToken()}`; } catch { /* send without it */ }
  }
  return fetch(url, { ...options, headers });
}

// For limits (429), Pro-only features (402), the daily cap (503) and bad input
// (400), the server's own message is written for people, so show it instead of
// a generic error. `upgrade` marks errors that Pro would solve.
export async function responseError(res) {
  let detail = "";
  try { detail = (await res.json()).detail || ""; } catch { /* not JSON */ }
  const err = new Error(detail || `Server responded with ${res.status}`);
  if (detail && [400, 401, 402, 429, 503].includes(res.status)) err.userMessage = detail;
  err.upgrade = res.status === 402 || (res.status === 429 && /Pro/.test(detail));
  err.status = res.status;
  return err;
}

// Reads the server's newline-delimited JSON stream, calling onEvent for each
// message. Throws if the server reports an error mid-stream.
export async function readStream(res, onEvent) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const handle = (line) => {
    if (!line.trim()) return;
    const msg = JSON.parse(line);
    if (msg.type === "error") throw new Error(msg.detail || "stream error");
    onEvent(msg);
  };
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    lines.forEach(handle);
  }
  handle(buffer);
}

// [Source 3] -> a link to that source card
export function linkCitations(md) {
  return md.replace(/\[Source (\d+)\]/g, "[Source $1](#src-$1)");
}

// Answer language. One choice for the whole site, kept in this browser.
const LANG_KEY = "nyaya_lang";
export function getLang() {
  try { return localStorage.getItem(LANG_KEY) === "hi" ? "hi" : "en"; } catch { return "en"; }
}
export function setLang(lang) {
  try { localStorage.setItem(LANG_KEY, lang); } catch { /* storage off */ }
  window.dispatchEvent(new CustomEvent("nyaya-lang", { detail: lang }));
}
