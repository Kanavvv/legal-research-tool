import { useState } from "react";
import { Loading } from "./ui";
import { post, useLoad } from "./shared";

const BLANK = { title: "", question: "", share_id: "", topic: "" };

// Pick what /trending shows. Questions people asked this week are suggestions only:
// nothing goes public until you add it here and press Save.
export default function TrendingAdmin() {
  const [state, reload] = useLoad("/admin/trending");
  const [items, setItems] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const d = state.data;
  const list = items ?? d?.featured ?? [];
  const dirty = items !== null;

  // Editing an automatic pick keeps it: it becomes yours and the weekly job leaves it alone.
  function set(i, k, v) { setItems(list.map((x, j) => (j === i ? { ...x, [k]: v, auto: false } : x))); }
  function add(item) {
    if (list.length >= 12) { setMsg("The page shows up to 12. Remove one first."); return; }
    setItems([...list, { ...BLANK, ...item }]); setMsg("");
  }
  function move(i, by) {
    const j = i + by; if (j < 0 || j >= list.length) return;
    const next = list.slice(); [next[i], next[j]] = [next[j], next[i]]; setItems(next);
  }

  async function save() {
    setBusy(true); setMsg("");
    try {
      const r = await post("/admin/trending", { items: list });
      setItems(null); setMsg(`Saved. ${r.featured.length} question${r.featured.length === 1 ? "" : "s"} on asknyaya.in/trending (live within 10 minutes).`);
      reload();
    } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  }

  return (
    <Loading state={state}>
      {d && (
        <>
          <section className="adm-card">
            <div className="adm-row-between">
              <h2>On the trending page now</h2>
              <a className="adm-link" href="/trending" target="_blank" rel="noreferrer">Open the page ↗</a>
            </div>
            <p className="cr-muted">Every Monday Nyaya picks 5 of last week's most-asked questions by itself, rewritten so nothing personal shows, and emails you the list (marked Auto). Ones you add or edit stay put. Write each one the way a visitor would read it. Leave out names, phone numbers and anything that could identify the person who asked. Paste a shared answer link (asknyaya.in/a/…) to show that exact answer; otherwise tapping it asks Nyaya fresh.</p>
            {list.length === 0 && <p className="cr-muted">Nothing featured yet. The page shows everyday questions by topic until you add some.</p>}
            <ol className="cr-trend-edit">
              {list.map((it, i) => (
                <li key={i}>
                  <span className="cr-trend-n mono">{String(i + 1).padStart(2, "0")}</span>
                  {it.auto && <span className="cr-muted" title="Picked by the weekly job. It's replaced next Monday unless you edit it.">Auto</span>}
                  <div className="cr-trend-fields">
                    <input className="adm-input" value={it.title} maxLength={140} placeholder="Headline, e.g. Can my landlord keep my deposit?" aria-label={`Headline ${i + 1}`} onChange={(e) => set(i, "title", e.target.value)} />
                    <div className="cr-trend-row">
                      <input className="adm-input" value={it.topic} maxLength={40} placeholder="Topic (e.g. Tenants)" aria-label={`Topic ${i + 1}`} onChange={(e) => set(i, "topic", e.target.value)} />
                      <input className="adm-input" value={it.share_id} maxLength={80} placeholder="Shared answer link (optional)" aria-label={`Shared answer link ${i + 1}`} onChange={(e) => set(i, "share_id", e.target.value)} />
                    </div>
                    {!it.share_id && <textarea className="adm-input" rows={2} value={it.question} maxLength={600} placeholder="The question Nyaya should answer (leave blank to use the headline)" aria-label={`Question ${i + 1}`} onChange={(e) => set(i, "question", e.target.value)} />}
                  </div>
                  <div className="cr-trend-actions">
                    <button type="button" className="cr-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                    <button type="button" className="cr-btn" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="Move down">↓</button>
                    <button type="button" className="adm-link adm-link--bad" onClick={() => setItems(list.filter((_, j) => j !== i))}>Remove</button>
                  </div>
                </li>
              ))}
            </ol>
            <div className="adm-actions">
              <button type="button" className="cr-btn" onClick={() => add({})}>Add a blank one</button>
              <button type="button" className="cr-btn cr-btn--primary" onClick={save} disabled={busy || !dirty}>{busy ? "Saving…" : dirty ? "Save and publish" : "Saved"}</button>
              {dirty && <button type="button" className="adm-link" onClick={() => { setItems(null); setMsg(""); }}>Undo changes</button>}
            </div>
            {msg && <p className="cr-muted" role="status">{msg}</p>}
          </section>

          <section className="adm-card">
            <h2>Asked most this week</h2>
            <p className="cr-muted">From the website, WhatsApp and Is this legal?. Private until you feature one, and you can reword it first.</p>
            {d.asked.length === 0 ? <p className="cr-muted">No questions in the last 7 days.</p> : (
              <table className="adm-table">
                <thead><tr><th>Question</th><th>Times</th><th /></tr></thead>
                <tbody>
                  {d.asked.map((a) => (
                    <tr key={a.question}>
                      <td>{a.question}</td><td>{a.count}</td>
                      <td><button type="button" className="adm-link" onClick={() => add({ title: a.question.slice(0, 140), question: a.question })}>Feature</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="adm-card">
            <h2>Most-read public answers</h2>
            <p className="cr-muted">Answers whose makers ticked "Let Google list this". These show on the trending page automatically.</p>
            {d.most_read.length === 0 ? <p className="cr-muted">None yet.</p> : (
              <table className="adm-table">
                <thead><tr><th>Question</th><th>Reads</th><th /></tr></thead>
                <tbody>
                  {d.most_read.map((m) => (
                    <tr key={m.share_id}>
                      <td><a className="adm-link" href={`/a/${m.share_id}`} target="_blank" rel="noreferrer">{m.title}</a></td><td>{m.views}</td>
                      <td><button type="button" className="adm-link" onClick={() => add({ title: m.title, share_id: m.share_id })}>Feature</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </Loading>
  );
}
