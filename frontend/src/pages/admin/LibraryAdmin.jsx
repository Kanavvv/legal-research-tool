import { useState } from "react";
import { Loading } from "./ui";
import { API_URL, apiFetch } from "../../api";
import { ago, post, useLoad } from "./shared";

// The answer library: answer the questions people ask most and list them publicly, so
// each becomes a page Google can find (asknyaya.in/a/…, also on /answers and /trending).
// The preview needs the admin's token, so fetch it and open the HTML in a new tab
async function openPreview() {
  const w = window.open("", "_blank");
  try {
    const res = await apiFetch(`${API_URL}/admin/newsletter/preview`);
    w.document.write(res.ok ? await res.text() : `<p>Couldn't load the preview (${res.status}).</p>`);
  } catch (e) { w.document.write(`<p>${String(e.message).replace(/</g, "&lt;")}</p>`); }
  w.document.close();
}

export default function LibraryAdmin() {
  const [state, reload] = useLoad("/admin/library");
  const [asked] = useLoad("/admin/trending");
  const [text, setText] = useState("");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  // The advocate checking answers; remembered in this browser so each review is one click
  const [reviewer, setReviewer] = useState(() => { try { return JSON.parse(localStorage.getItem("nyaya-reviewer")) || { name: "", credential: "" }; } catch { return { name: "", credential: "" }; } });
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  async function publish() {
    setBusy(true); setMsg("");
    try {
      const r = await post("/admin/library", { questions: lines.slice(0, 3), topic });
      const ok = r.made.filter((m) => m.id);
      const bad = r.made.filter((m) => m.error);
      setMsg(`Published ${ok.length}.${bad.length ? ` ${bad.length} didn't work: ${bad.map((b) => b.question).join("; ")}` : ""}`);
      setText(lines.slice(3).join("\n"));
      reload();
    } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  }

  async function toggle(row) {
    try { await post(`/admin/library/${row.id}`, { public: !row.public }); reload(); } catch (e) { setMsg(e.message); }
  }

  function saveReviewer(next) {
    setReviewer(next);
    try { localStorage.setItem("nyaya-reviewer", JSON.stringify(next)); } catch { /* storage off */ }
  }

  async function review(row, clear = false) {
    if (!clear && !reviewer.name.trim()) { setMsg("Add the reviewing advocate's name above first."); return; }
    try {
      await post(`/admin/library/${row.id}/review`, clear ? { name: "" } : reviewer);
      setMsg(clear ? "Review removed." : `Marked as reviewed by ${reviewer.name.trim()}.`);
      reload();
    } catch (e) { setMsg(e.message); }
  }

  function addQ(q) { setText((t) => (t.trim() ? `${t.trim()}\n${q}` : q)); }

  return (
    <>
      <section className="adm-card">
        <h2>Answer and publish</h2>
        <p className="cr-muted">One question per line, written the way people search ("Can my landlord keep my deposit?"). Nyaya answers each from the index in plain words with sources, and lists it publicly. Up to 3 at a time (about 20 seconds each). Leave out names and anything personal.</p>
        <textarea className="adm-input" rows={4} value={text} maxLength={1200} onChange={(e) => setText(e.target.value)} placeholder={"Can my landlord keep my security deposit?\nWhat happens if my cheque bounces?"} aria-label="Questions, one per line" />
        <div className="adm-actions">
          <input className="adm-input" value={topic} maxLength={40} onChange={(e) => setTopic(e.target.value)} placeholder="Topic (optional), e.g. Tenants" aria-label="Topic" />
          <button type="button" className="cr-btn cr-btn--primary" onClick={publish} disabled={busy || lines.length === 0}>
            {busy ? "Answering…" : `Answer and publish ${Math.min(lines.length, 3) || ""}`}
          </button>
        </div>
        {msg && <p className="cr-muted" role="status">{msg}</p>}
      </section>

      {asked.data?.asked?.length > 0 && (
        <section className="adm-card">
          <h2>Asked most this week</h2>
          <p className="cr-muted">Good candidates. Reword them before publishing so they read like a search.</p>
          <table className="adm-table">
            <thead><tr><th>Question</th><th>Times</th><th /></tr></thead>
            <tbody>
              {asked.data.asked.slice(0, 15).map((a) => (
                <tr key={a.question}><td>{a.question}</td><td>{a.count}</td>
                  <td><button type="button" className="adm-link" onClick={() => addQ(a.question.slice(0, 300))}>Add</button></td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="adm-card">
        <h2>Advocate review</h2>
        <p className="cr-muted">Only after an advocate has actually read an answer and agrees with it: their name, enrolment and the date then show on the page and in what Google reads. This is what makes legal pages rank. Fix or unlist anything they flag.</p>
        <div className="adm-actions">
          <input className="adm-input" value={reviewer.name} maxLength={80} onChange={(e) => saveReviewer({ ...reviewer, name: e.target.value })} placeholder="Adv. Priya Sharma" aria-label="Reviewing advocate's name" />
          <input className="adm-input" value={reviewer.credential} maxLength={120} onChange={(e) => saveReviewer({ ...reviewer, credential: e.target.value })} placeholder="Advocate, Delhi High Court (D/1234/2015)" aria-label="Court and enrolment number" />
        </div>
      </section>

      <section className="adm-card">
        <div className="adm-row-between">
          <h2>Sunday email</h2>
          <button type="button" className="adm-link" onClick={openPreview}>Preview this week's ↗</button>
        </div>
        <p className="cr-muted">"Your rights this week" goes to everyone on the weekly list every Sunday at 9am: one right, the most-read answers, any explainer from the week, and a free template.</p>
      </section>

      <Loading state={state}>
        {state.data && (
          <section className="adm-card">
            <div className="adm-row-between">
              <h2>In the library ({state.data.library.length})</h2>
              <a className="adm-link" href="/answers" target="_blank" rel="noreferrer">Open /answers ↗</a>
            </div>
            {state.data.library.length === 0 ? <p className="cr-muted">Nothing yet. Start with the ten questions people ask you most.</p> : (
              <table className="adm-table">
                <thead><tr><th>Question</th><th>Reads</th><th>Made</th><th>Reviewed</th><th /></tr></thead>
                <tbody>
                  {state.data.library.map((r) => (
                    <tr key={r.id}>
                      <td><a className="adm-link" href={`/a/${r.id}`} target="_blank" rel="noreferrer">{r.question}</a>{r.topic ? <span className="cr-muted"> · {r.topic}</span> : null}</td>
                      <td>{r.views}</td><td>{ago(r.date)}</td>
                      <td>{r.review
                        ? <span title={r.review.credential}>{r.review.name} · {ago(r.review.date)} <button type="button" className="adm-link adm-link--bad" onClick={() => review(r, true)}>Clear</button></span>
                        : <button type="button" className="adm-link" onClick={() => review(r)}>Mark reviewed</button>}</td>
                      <td><button type="button" className={`adm-link${r.public ? " adm-link--bad" : ""}`} onClick={() => toggle(r)}>{r.public ? "Unlist" : "List again"}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}
      </Loading>
    </>
  );
}
