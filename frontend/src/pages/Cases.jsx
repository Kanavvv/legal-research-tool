import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_URL, apiFetch, getLang, responseError } from "../api";
import { useAuth } from "../AuthContext";
import { shrinkImage } from "../ui/shrinkImage";
import { trackEvent } from "../ui/track";

// My cases: keep each court case with its next hearing date, and Nyaya emails a reminder
// 3 days and 1 day before. Upload the latest order and Nyaya fills in the details and says
// what the order means. Status itself comes from the person or their order, not eCourts.

const BLANK = { id: "", title: "", court: "", case_no: "", cnr: "", next_date: "", purpose: "", notes: "", summary: "", remind: true };
const ECOURTS = "https://services.ecourts.gov.in/ecourtindia_v6/";

function daysUntil(iso) {
  if (!iso) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${iso}T00:00:00`) - today) / 86400000);
}

function whenText(iso) {
  const n = daysUntil(iso);
  if (n === null) return "No hearing date yet";
  const d = new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
  if (n < 0) return `${d} (passed: add the next date)`;
  if (n === 0) return `${d} (today)`;
  if (n === 1) return `${d} (tomorrow)`;
  return `${d} (in ${n} days)`;
}

function Editor({ start, onSaved, onCancel }) {
  const [f, setF] = useState(start);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [todo, setTodo] = useState([]);
  const [error, setError] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  async function readOrder(file) {
    if (!file) return;
    setReading(true); setError(""); setTodo([]);
    try {
      const upload = file.type.startsWith("image/") ? await shrinkImage(file) : file;
      if (upload.size > 5 * 1024 * 1024) throw Object.assign(new Error(), { userMessage: "That file is over 5 MB." });
      const form = new FormData();
      form.append("file", upload, file.name);
      form.append("lang", getLang());
      const res = await apiFetch(`${API_URL}/cases/read-order`, { method: "POST", body: form });
      if (!res.ok) throw await responseError(res);
      const o = await res.json();
      setF((prev) => ({
        ...prev,
        title: prev.title || o.parties || "",
        court: o.court || prev.court, case_no: o.case_no || prev.case_no, cnr: o.cnr || prev.cnr,
        next_date: o.next_date || prev.next_date, purpose: o.purpose || prev.purpose,
        summary: [o.order_date ? `Order of ${o.order_date}: ` : "", o.summary].join(""),
      }));
      setTodo(o.to_do || []);
    } catch (err) {
      setError(err.userMessage || "Couldn't read that order. Try a clearer photo, or fill in the details yourself.");
    } finally {
      setReading(false);
    }
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const notes = todo.length && !f.notes ? `To do before the next date:\n${todo.map((t) => `- ${t}`).join("\n")}` : f.notes;
      const res = await apiFetch(`${API_URL}/cases`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, notes }),
      });
      if (!res.ok) throw await responseError(res);
      if (!f.id) trackEvent("case_added");
      onSaved(await res.json());
    } catch (err) {
      setError(err.userMessage || "Couldn't save. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card doc-form" onSubmit={save}>
      <div className="field">
        <label htmlFor="case-order">Fill it in from the latest order (photo or PDF)</label>
        <input id="case-order" type="file" accept="image/*,application/pdf" onChange={(e) => readOrder(e.target.files?.[0])} disabled={reading} />
        <p className="muted case-hint">{reading ? "Reading the order…" : "Nyaya reads the court, case number, next date and what the order says. The file isn't stored."}</p>
      </div>
      {f.summary && <div className="card case-summary"><p className="mono muted">what the order says</p><p>{f.summary}</p></div>}
      {todo.length > 0 && <ol className="verdict-todo">{todo.map((t) => <li key={t}>{t}</li>)}</ol>}
      <div className="case-grid">
        <div className="field"><label htmlFor="c-title">Name for this case</label><input id="c-title" value={f.title} maxLength={100} onChange={set("title")} placeholder="Deposit case vs landlord" required /></div>
        <div className="field"><label htmlFor="c-date">Next hearing</label><input id="c-date" type="date" value={f.next_date} onChange={set("next_date")} /></div>
        <div className="field"><label htmlFor="c-court">Court</label><input id="c-court" value={f.court} maxLength={140} onChange={set("court")} placeholder="District Consumer Commission, Pune" /></div>
        <div className="field"><label htmlFor="c-no">Case number</label><input id="c-no" value={f.case_no} maxLength={80} onChange={set("case_no")} placeholder="CC/123/2026" /></div>
        <div className="field"><label htmlFor="c-cnr">CNR number (optional)</label><input id="c-cnr" value={f.cnr} maxLength={20} onChange={set("cnr")} placeholder="16 letters and numbers" /></div>
        <div className="field"><label htmlFor="c-purpose">Listed for</label><input id="c-purpose" value={f.purpose} maxLength={140} onChange={set("purpose")} placeholder="Evidence, arguments, reply…" /></div>
      </div>
      <div className="field"><label htmlFor="c-notes">Notes</label><textarea id="c-notes" className="field-input field-input--area" value={f.notes} maxLength={2000} onChange={set("notes")} placeholder="What to bring, what your advocate said…" /></div>
      <label className="share-public"><input type="checkbox" checked={f.remind} onChange={set("remind")} /><span>Email me 3 days and 1 day before the hearing</span></label>
      {error && <div className="alert" role="alert">{error}</div>}
      <div className="doc-submit">
        <button type="submit" className="btn btn--lime" disabled={busy || reading}>{busy ? "Saving…" : "Save case"}</button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function Cases() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    apiFetch(`${API_URL}/cases`).then(async (r) => { if (!r.ok) throw await responseError(r); return r.json(); })
      .then((d) => setRows(d.cases || []))
      .catch((err) => setError(err.userMessage || "Couldn't load your cases."));
  }, [user]);

  async function remove(c) {
    if (!window.confirm(`Remove "${c.title}" from your cases? This can't be undone.`)) return;
    const r = await apiFetch(`${API_URL}/cases/${c.id}`, { method: "DELETE" });
    if (r.ok) setRows(rows.filter((x) => x.id !== c.id));
  }

  function saved(c) {
    const next = [...(rows || []).filter((x) => x.id !== c.id), c];
    next.sort((a, b) => (a.next_date || "9999").localeCompare(b.next_date || "9999"));
    setRows(next); setEditing(null);
  }

  return (
    <main id="main" className="station">
      <header className="station-head">
        <h1 className="station-title">Never miss <em>a hearing.</em></h1>
        <p className="station-lede">Keep your court cases here with the next date. Upload the latest order and Nyaya explains it in plain words and fills in the details. You get an email 3 days and 1 day before each hearing. Free.</p>
      </header>

      {!loading && !user && (
        <div className="card code-switch">
          <p>Sign in so your cases stay private to you and reminders reach your email. <Link to="/account" className="text-link">Sign in</Link></p>
        </div>
      )}

      {user && (
        <>
          {error && <div className="alert" role="alert">{error}</div>}
          {editing ? (
            <Editor start={editing} onSaved={saved} onCancel={() => setEditing(null)} />
          ) : (
            <div className="answer-actions"><button type="button" className="btn btn--lime" onClick={() => setEditing({ ...BLANK })}>Add a case</button></div>
          )}
          {!rows && !error && <div className="skeleton" aria-hidden="true"><span /><span /></div>}
          {rows && rows.length === 0 && !editing && <p className="muted">No cases yet. Add one, or upload the latest order and let Nyaya fill it in.</p>}
          {rows && rows.length > 0 && (
            <ul className="answers-list">
              {rows.map((c) => {
                const n = daysUntil(c.next_date);
                return (
                  <li key={c.id} className={`card case-card${n !== null && n >= 0 && n <= 3 ? " case-card--soon" : ""}`}>
                    <p className="mono muted">{whenText(c.next_date)}{c.purpose ? ` · ${c.purpose}` : ""}</p>
                    <h2 className="answers-q">{c.title}</h2>
                    <p className="muted">{[c.court, c.case_no, c.cnr && `CNR ${c.cnr}`].filter(Boolean).join(" · ")}</p>
                    {c.summary && <p>{c.summary}</p>}
                    {c.notes && <p className="case-notes">{c.notes}</p>}
                    <div className="answer-actions">
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing({ ...BLANK, ...c })}>Update date or details</button>
                      {c.cnr && <a className="btn btn--ghost btn--sm" href={ECOURTS} target="_blank" rel="noreferrer" onClick={() => navigator.clipboard?.writeText(c.cnr)}>Check on eCourts (CNR copied)</a>}
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => remove(c)}>Remove</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
      <p className="shared-note muted">Hearing dates can change at short notice. Confirm with your advocate or the eCourts app. Research help, not legal advice. Free legal aid: 15100.</p>
    </main>
  );
}
