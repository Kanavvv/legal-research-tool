import { useState } from "react";
import { Loading } from "./ui";
import { ago, post, useLoad } from "./shared";

// News explainers: paste a headline (and what the story says), Claude drafts an explainer
// from the index, you check and edit it, then publish to asknyaya.in/explained/<slug>.
// Speed matters: publish while the story is still being searched for.
export default function ExplainersAdmin() {
  const [state, reload] = useLoad("/admin/explainers");
  const [headline, setHeadline] = useState("");
  const [notes, setNotes] = useState("");
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const set = (k) => (e) => setDraft({ ...draft, [k]: e.target.value });

  async function makeDraft() {
    setBusy("draft"); setMsg("");
    try { setDraft(await post("/admin/explainers/draft", { headline, notes })); } catch (e) { setMsg(e.message); } finally { setBusy(""); }
  }

  async function save(published) {
    setBusy("save"); setMsg("");
    try {
      const r = await post("/admin/explainers", { ...draft, published });
      setMsg(published ? `Published at asknyaya.in/explained/${r.slug} (live within 10 minutes).` : "Saved as a draft.");
      setDraft({ ...draft, slug: r.slug, published });
      reload();
    } catch (e) { setMsg(e.message); } finally { setBusy(""); }
  }

  return (
    <>
      <section className="adm-card">
        <h2>New explainer</h2>
        <p className="cr-muted">Paste the headline and the key facts from the news story (who, what, which court, what was decided). Claude only uses the facts you give for the news, and the index for the law. Always read the draft against the source before publishing.</p>
        <input className="adm-input" value={headline} maxLength={300} onChange={(e) => setHeadline(e.target.value)} placeholder="Supreme Court says … / New rule on …" aria-label="Headline" />
        <textarea className="adm-input" rows={5} value={notes} maxLength={5000} onChange={(e) => setNotes(e.target.value)} placeholder="Facts from the story: the court, the date, what was decided, quotes…" aria-label="Facts from the story" />
        <div className="adm-actions">
          <button type="button" className="cr-btn cr-btn--primary" onClick={makeDraft} disabled={!!busy || headline.trim().length < 10}>{busy === "draft" ? "Drafting…" : "Draft it"}</button>
        </div>
        {msg && <p className="cr-muted" role="status">{msg}</p>}
      </section>

      {draft && (
        <section className="adm-card">
          <h2>Edit and publish</h2>
          <label className="cr-muted" htmlFor="ex-title">Title</label>
          <input id="ex-title" className="adm-input" value={draft.title} maxLength={120} onChange={set("title")} />
          <label className="cr-muted" htmlFor="ex-slug">Address: asknyaya.in/explained/…</label>
          <input id="ex-slug" className="adm-input" value={draft.slug} maxLength={70} onChange={set("slug")} />
          <label className="cr-muted" htmlFor="ex-dek">One line under the title</label>
          <input id="ex-dek" className="adm-input" value={draft.dek} maxLength={200} onChange={set("dek")} />
          <label className="cr-muted" htmlFor="ex-body">Body (markdown; [Source N] links to the sources)</label>
          <textarea id="ex-body" className="adm-input" rows={16} value={draft.body} onChange={set("body")} />
          {draft.faq?.map((f, i) => (
            <div key={i} className="cr-trend-fields">
              <input className="adm-input" value={f.q} aria-label={`FAQ question ${i + 1}`} onChange={(e) => setDraft({ ...draft, faq: draft.faq.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)) })} />
              <textarea className="adm-input" rows={2} value={f.a} aria-label={`FAQ answer ${i + 1}`} onChange={(e) => setDraft({ ...draft, faq: draft.faq.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)) })} />
            </div>
          ))}
          <p className="cr-muted">Sources: {(draft.sources || []).map((s) => s.title).join(" · ") || "none"}</p>
          <div className="adm-actions">
            <button type="button" className="cr-btn" onClick={() => save(false)} disabled={!!busy}>Save draft</button>
            <button type="button" className="cr-btn cr-btn--primary" onClick={() => save(true)} disabled={!!busy}>{busy === "save" ? "Saving…" : "Publish"}</button>
          </div>
        </section>
      )}

      <Loading state={state}>
        {state.data && (
          <section className="adm-card">
            <div className="adm-row-between">
              <h2>All explainers ({state.data.explainers.length})</h2>
              <a className="adm-link" href="/explained" target="_blank" rel="noreferrer">Open /explained ↗</a>
            </div>
            {state.data.explainers.length === 0 ? <p className="cr-muted">None yet.</p> : (
              <table className="adm-table">
                <thead><tr><th>Title</th><th>Status</th><th>Updated</th><th /></tr></thead>
                <tbody>
                  {state.data.explainers.map((x) => (
                    <tr key={x.slug}>
                      <td>{x.published ? <a className="adm-link" href={`/explained/${x.slug}`} target="_blank" rel="noreferrer">{x.title}</a> : x.title}</td>
                      <td>{x.published ? "Live" : "Draft"}</td><td>{ago(x.updated)}</td>
                      <td><button type="button" className="adm-link" onClick={() => { setDraft({ ...x, faq: x.faq || [], sources: x.sources || [] }); window.scrollTo(0, 0); }}>Edit</button></td>
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
