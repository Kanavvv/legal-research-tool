import { useEffect, useRef, useState } from "react";
import { ROUTE_NAMES, ago, api } from "./shared";

const KINDS = [["all", "Everything"], ["question", "Questions"], ["feedback", "Feedback"], ["payment", "Payments"]];

// What's happening right now: questions, feedback and payments, newest first.
export default function Feed() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [paused, setPaused] = useState(false);
  const [kind, setKind] = useState("all");
  const [fresh, setFresh] = useState(new Set());
  const [lastHour, setLastHour] = useState(0);
  const seen = useRef(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (paused) return undefined;
    let live = true;
    const load = () => api("/admin/activity").then((d) => {
      if (!live) return;
      const keys = d.items.map((i) => `${i.kind}|${i.at}|${i.text || ""}`);
      if (seen.current) setFresh(new Set(keys.filter((k) => !seen.current.has(k))));
      seen.current = new Set(keys);
      const now = new Date(d.now).getTime();
      setLastHour(d.items.filter((i) => i.kind === "question" && now - new Date(i.at).getTime() < 3600e3).length);
      setItems(d.items);
      setError("");
    }).catch((e) => live && setError(e.message));
    load();
    const t = setInterval(load, 15000);
    return () => { live = false; clearInterval(t); };
  }, [paused]);

  useEffect(() => { const t = setInterval(() => setTick((n) => n + 1), 30000); return () => clearInterval(t); }, []);

  const shown = (items || []).filter((i) => kind === "all" || i.kind === kind);

  return (
    <>
      <div className="cr-toolbar">
        <div className="cr-seg" role="group" aria-label="Show">
          {KINDS.map(([k, l]) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}>{l}</button>)}
        </div>
        <span className={`cr-live${paused ? " cr-live--off" : ""}`}><span className="cr-live-dot" aria-hidden="true" />{paused ? "Paused" : "Live"}</span>
        <button type="button" className="cr-btn" onClick={() => setPaused((p) => !p)}>{paused ? "Resume" : "Pause"}</button>
        <span className="cr-muted">{lastHour} question{lastHour === 1 ? "" : "s"} in the last hour</span>
      </div>
      {error && <p className="adm-error" role="alert">{error}</p>}
      {!items && !error && <p className="cr-muted">Connecting…</p>}
      {items && shown.length === 0 && <p className="cr-muted">Nothing yet.</p>}
      <ol className="cr-feed" aria-live="polite">
        {shown.map((i) => {
          const k = `${i.kind}|${i.at}|${i.text || ""}`;
          return (
            <li key={k} className={`cr-event cr-event--${i.kind}${i.kind === "feedback" && !i.helpful ? " cr-event--bad" : ""}${fresh.has(k) ? " cr-event--new" : ""}`}>
              <span className="cr-event-icon" aria-hidden="true">{i.kind === "question" ? "?" : i.kind === "payment" ? "₹" : i.helpful ? "+" : "−"}</span>
              <div className="cr-event-body">
                <div className="cr-event-meta">
                  <span className="cr-tag">{i.kind === "payment" ? "Payment" : ROUTE_NAMES[i.route] || i.route || i.kind}</span>
                  {i.kind === "question" && i.cached && <span className="cr-tag cr-tag--dim">from cache, free</span>}
                  {i.kind === "question" && i.lang === "hi" && <span className="cr-tag cr-tag--dim">Hindi</span>}
                  {i.kind === "feedback" && <span className={`cr-tag ${i.helpful ? "cr-tag--ok" : "cr-tag--bad"}`}>{i.helpful ? "helpful" : "not helpful"}</span>}
                  <time className="cr-muted" dateTime={i.at} title={new Date(i.at).toLocaleString("en-IN")}>{ago(i.at)}</time>
                </div>
                {i.kind === "payment" ? <p>₹{i.amount_inr} received</p> : <p lang={i.lang === "hi" ? "hi" : undefined}>{i.text}</p>}
                {i.reason && <p className="cr-quote">“{i.reason}”</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
