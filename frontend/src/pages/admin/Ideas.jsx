import { useState } from "react";
import { Loading } from "./ui";
import { post, useLoad } from "./shared";

const COLUMNS = {
  idea: { name: "Ideas", hint: "Anything worth considering" },
  next: { name: "Up next", hint: "Build these soon" },
  building: { name: "Building", hint: "In progress" },
  live: { name: "Live", hint: "On the site" },
  parked: { name: "Parked", hint: "Waiting on something" },
};

function brief(ideas) {
  const pick = ideas.filter((i) => i.status === "next" || i.status === "building");
  const lines = pick.map((i) => `- ${i.title}${i.area ? ` (${i.area})` : ""}${i.detail ? `: ${i.detail}` : ""}`);
  return `Here's what I want built next on Nyaya (asknyaya.in), from my ideas board:\n\n${lines.join("\n")}\n\nPlease plan these, build them, and ask me before shipping.`;
}

// What to build next: add ideas, move them along, and copy a brief to hand to Claude.
export default function Ideas() {
  const [state] = useLoad("/admin/ideas");
  const [ideas, setIdeas] = useState(null);
  const [form, setForm] = useState({ title: "", detail: "", area: "" });
  const [msg, setMsg] = useState("");
  const [open, setOpen] = useState(null);
  const list = ideas || state.data?.ideas;
  const statuses = state.data?.statuses || Object.keys(COLUMNS);

  async function act(path, body, note) {
    setMsg("");
    try { const d = await post(path, body); setIdeas(d.ideas); if (note) setMsg(note); return true; } catch (e) { setMsg(e.message); return false; }
  }

  async function add(e) {
    e.preventDefault();
    if (await act("/admin/ideas", { ...form, status: "idea" }, "Added to Ideas.")) setForm({ title: "", detail: "", area: "" });
  }

  async function copy() {
    try { await navigator.clipboard.writeText(brief(list)); setMsg("Copied. Paste it into a chat with Claude to get them built."); } catch { setMsg("Couldn't copy. Your browser blocked the clipboard."); }
  }

  return (
    <Loading state={state}>
      {list && (
        <>
          <form className="adm-card cr-idea-form" onSubmit={add}>
            <h2>Add an idea</h2>
            <div className="cr-idea-fields">
              <input className="adm-input" placeholder="What should Nyaya do?" value={form.title} maxLength={140} required
                onChange={(e) => setForm({ ...form, title: e.target.value })} aria-label="Idea title" />
              <input className="adm-input cr-idea-area" placeholder="Area (e.g. Growth)" value={form.area} maxLength={40}
                onChange={(e) => setForm({ ...form, area: e.target.value })} aria-label="Area" />
            </div>
            <textarea className="adm-input" rows={2} placeholder="Details: who it's for, why, anything to watch out for" value={form.detail} maxLength={2000}
              onChange={(e) => setForm({ ...form, detail: e.target.value })} aria-label="Details" />
            <div className="adm-actions">
              <button type="submit" className="cr-btn cr-btn--primary">Add idea</button>
              <button type="button" className="cr-btn" onClick={copy}>Copy "Up next" as a brief for Claude</button>
            </div>
            {msg && <p className="cr-muted" role="status">{msg}</p>}
          </form>

          <div className="cr-board">
            {statuses.map((s) => {
              const col = list.filter((i) => i.status === s);
              return (
                <section key={s} className={`cr-col cr-col--${s}`} aria-label={COLUMNS[s]?.name || s}>
                  <header><h3>{COLUMNS[s]?.name || s}</h3><span className="cr-count">{col.length}</span></header>
                  <p className="cr-muted">{COLUMNS[s]?.hint}</p>
                  <ul>
                    {col.map((i) => (
                      <li key={i.id} className="cr-card">
                        <button type="button" className="cr-card-title" aria-expanded={open === i.id} onClick={() => setOpen(open === i.id ? null : i.id)}>{i.title}</button>
                        {i.area && <span className="cr-tag cr-tag--dim">{i.area}</span>}
                        {open === i.id && (
                          <div className="cr-card-more">
                            {i.detail && <p>{i.detail}</p>}
                            <label className="cr-muted">Move to{" "}
                              <select value={i.status} onChange={(e) => act(`/admin/ideas/${i.id}`, { status: e.target.value })}>
                                {statuses.map((x) => <option key={x} value={x}>{COLUMNS[x]?.name || x}</option>)}
                              </select>
                            </label>
                            <button type="button" className="adm-link adm-link--bad" onClick={() => window.confirm(`Delete "${i.title}"?`) && act(`/admin/ideas/${i.id}`, { delete: true })}>Delete</button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </>
      )}
    </Loading>
  );
}
