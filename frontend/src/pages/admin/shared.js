import { useCallback, useEffect, useState } from "react";
import { API_URL, apiFetch } from "../../api";

// Local preview only (npm run dev with VITE_ADMIN_PREVIEW=1 against a local backend); never true in a build.
export const PREVIEW = import.meta.env.DEV && import.meta.env.VITE_ADMIN_PREVIEW === "1";

export const ago = (v) => {
  if (!v) return "";
  const s = Math.max(0, (Date.now() - new Date(v).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export async function api(path, options) {
  const res = await apiFetch(`${API_URL}${path}`, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.detail || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return body;
}
export const post = (path, data) => api(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data || {}) });

export const inr = (n) => (n == null ? "–" : `₹${Math.round(n).toLocaleString("en-IN")}`);
export const num = (n) => (n == null ? "–" : Number(n).toLocaleString("en-IN"));
export const when = (v) => {
  if (!v) return "–";
  const d = typeof v === "number" ? new Date(v) : new Date(v);
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};
export const shortDay = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export function useLoad(path) {
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState({ data: null, error: "", loading: true });
  useEffect(() => {
    let live = true;
    api(path)
      .then((data) => live && setState({ data, error: "", loading: false }))
      .catch((e) => live && setState({ data: null, error: e.message, loading: false }));
    return () => { live = false; };
  }, [path, nonce]);
  const reload = useCallback(() => { setState((s) => ({ ...s, loading: true })); setNonce((n) => n + 1); }, []);
  return [state, reload];
}

export const ROUTE_NAMES = {
  ask: "Ask (website)", whatsapp: "WhatsApp answers", whatsapp_document: "WhatsApp documents", whatsapp_daily: "Law of the day",
  document: "Document review", document_ocr: "Reading scans", argument: "Argument builder", compare: "Compare cases",
  brief: "Case briefs", moot: "Moot practice", draft: "Drafts", digest: "Weekly digest", on_this_day: "On this day",
  check: "Is this legal?", notice: "Notice decoder", assist_rti: "RTI help", assist_consumer: "Complaint help",
};

