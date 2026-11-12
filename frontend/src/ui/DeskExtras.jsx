import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_URL, apiFetch, responseError } from "../api";
import { exportToWord } from "../exportToWord";

const USAGE_LABELS = { ask: "questions", compare: "comparisons", argument: "briefs", document: "documents", draft: "drafts" };

// The signed-in desk: plan and today's usage, folders of saved answers, and case alerts.
export default function DeskExtras() {
  const [me, setMe] = useState(null);
  const [folders, setFolders] = useState(null);
  const [openFolder, setOpenFolder] = useState(null); // {id, name, items}
  const [alerts, setAlerts] = useState(null);
  const [topic, setTopic] = useState("");
  const [alertMsg, setAlertMsg] = useState("");

  useEffect(() => {
    apiFetch(`${API_URL}/me`).then((r) => (r.ok ? r.json() : null)).then(setMe).catch(() => setMe(null));
    apiFetch(`${API_URL}/folders`).then((r) => (r.ok ? r.json() : { folders: [] })).then((d) => setFolders(d.folders)).catch(() => setFolders([]));
    apiFetch(`${API_URL}/alerts`).then((r) => (r.ok ? r.json() : { alerts: [] })).then((d) => setAlerts(d.alerts)).catch(() => setAlerts([]));
  }, []);

  const isPro = me?.plan === "pro";
  const until = me?.pro_until ? new Date(me.pro_until).toLocaleDateString("en-IN", { day: "numeric", month: "long" }) : "";

  async function showFolder(f) {
    if (openFolder?.id === f.id) { setOpenFolder(null); return; }
    setOpenFolder({ id: f.id, name: f.name, items: null });
    try {
      const r = await apiFetch(`${API_URL}/folders/${f.id}`);
      const d = await r.json();
      setOpenFolder({ id: f.id, name: f.name, items: d.items || [] });
    } catch {
      setOpenFolder({ id: f.id, name: f.name, items: [] });
    }
  }

  async function removeItem(itemId) {
    setOpenFolder((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== itemId) }));
    setFolders((prev) => prev.map((f) => (f.id === openFolder.id ? { ...f, count: Math.max(0, f.count - 1) } : f)));
    await apiFetch(`${API_URL}/folders/${openFolder.id}/items/${itemId}`, { method: "DELETE" }).catch(() => {});
  }

  async function deleteFolder(f) {
    if (!window.confirm(`Delete the folder "${f.name}" and the ${f.count} answers in it? This can't be undone.`)) return;
    setFolders((prev) => prev.filter((x) => x.id !== f.id));
    if (openFolder?.id === f.id) setOpenFolder(null);
    await apiFetch(`${API_URL}/folders/${f.id}`, { method: "DELETE" }).catch(() => {});
  }

  function exportFolder() {
    const md = openFolder.items
      .map((i) => `## ${i.question}\n\n${i.answer}${i.sources?.length ? `\n\n*Sources:* ${i.sources.map((s) => `${s.title} (${s.citation})`).join("; ")}` : ""}`)
      .join("\n\n---\n\n");
    exportToWord({ title: openFolder.name, markdown: md, filename: `${openFolder.name.replace(/[^\w-]+/g, "-").toLowerCase() || "folder"}.docx` });
  }

  async function addAlert(e) {
    e.preventDefault();
    setAlertMsg("");
    try {
      const r = await apiFetch(`${API_URL}/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
      });
      if (!r.ok) throw await responseError(r);
      const a = await r.json();
      setAlerts((prev) => [...(prev || []), a]);
      setTopic("");
    } catch (err) {
      setAlertMsg(err?.userMessage || "Couldn't add that alert.");
    }
  }

  async function removeAlert(id) {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    await apiFetch(`${API_URL}/alerts/${id}`, { method: "DELETE" }).catch(() => {});
  }

  return (
    <div className="desk desk--extras">
      <section className={isPro ? "card desk-card plan-card plan-card--pro" : "card desk-card plan-card"} aria-labelledby="desk-plan">
        <div className="card-bar">
          <h2 id="desk-plan" className="mono">your plan</h2>
          <span className="mono muted">{me ? (isPro ? `pro until ${until}` : "free") : ""}</span>
        </div>
        {me && (
          <>
            <ul className="usage">
              {Object.entries(USAGE_LABELS).filter(([k]) => me.limits[k] > 0).map(([k, label]) => (
                <li key={k}>
                  <span className="usage-n">{me.used_today[k] || 0}<span className="muted"> / {me.limits[k]}</span></span>
                  <span className="mono muted">{label} today</span>
                </li>
              ))}
            </ul>
            {!isPro && <Link to="/pricing" className="btn btn--lime btn--sm">Get Pro, ₹{me.price_inr} for 30 days</Link>}
          </>
        )}
      </section>

      <section className="card desk-card" aria-labelledby="desk-folders">
        <div className="card-bar">
          <h2 id="desk-folders" className="mono">folders</h2>
          <span className="mono muted">{folders ? folders.length : ""}</span>
        </div>
        {folders === null ? (
          <p className="muted">Loading…</p>
        ) : folders.length === 0 ? (
          <p className="muted">No folders yet. Use "Save to folder" under any answer to group your research by matter.</p>
        ) : (
          <ul className="desk-list">
            {folders.map((f) => (
              <li key={f.id}>
                <div className="folder-row">
                  <button type="button" className="desk-row" aria-expanded={openFolder?.id === f.id} onClick={() => showFolder(f)}>
                    <span className="dot" aria-hidden="true" />
                    <span>{f.name}</span>
                    <span className="mono muted desk-go">{f.count} saved</span>
                  </button>
                  <button type="button" className="text-link folder-del" onClick={() => deleteFolder(f)} aria-label={`Delete folder ${f.name}`}>Delete</button>
                </div>
                {openFolder?.id === f.id && (
                  <div className="folder-items">
                    {openFolder.items === null ? <p className="muted">Loading…</p> : openFolder.items.length === 0 ? <p className="muted">Empty.</p> : (
                      <>
                        {openFolder.items.map((i) => (
                          <details key={i.id} className="folder-item">
                            <summary>{i.question}</summary>
                            <div className="thread-a">{i.answer}</div>
                            <button type="button" className="text-link" onClick={() => removeItem(i.id)}>Remove from folder</button>
                          </details>
                        ))}
                        <button type="button" className="btn btn--ghost btn--sm" onClick={exportFolder}>Export folder to Word</button>
                      </>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card desk-card" aria-labelledby="desk-alerts">
        <div className="card-bar">
          <h2 id="desk-alerts" className="mono">case alerts</h2>
          <span className="mono muted">{alerts ? `${alerts.length} / 5` : ""}</span>
        </div>
        <p className="muted">Each week, new Supreme Court judgments that match these topics arrive by email.</p>
        {alerts?.length > 0 && (
          <ul className="alert-list">
            {alerts.map((a) => (
              <li key={a.id}><span>{a.topic}</span><button type="button" className="text-link" onClick={() => removeAlert(a.id)}>Stop</button></li>
            ))}
          </ul>
        )}
        {isPro ? (
          <form className="alert-add" onSubmit={addAlert}>
            <label htmlFor="alert-topic" className="sr-only">Topic to follow</label>
            <input id="alert-topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. anticipatory bail in cheating cases" maxLength={200} />
            <button type="submit" className="btn btn--lime btn--sm" disabled={topic.trim().length < 3}>Follow</button>
          </form>
        ) : (
          <p><Link to="/pricing" className="text-link">Alerts are part of Nyaya Pro.</Link></p>
        )}
        {alertMsg && <p className="folder-status" role="alert">{alertMsg}</p>}
      </section>
    </div>
  );
}
