import { useEffect, useState } from "react";
import { API_URL } from "../api";

// The weekly digest the Monday job writes, kept here too so people can read it without email.
function clean(html) {
  // The job asks for <p>, <h2>, <strong> only; keep it to those (and lists) before showing it.
  const doc = new DOMParser().parseFromString(html || "", "text/html");
  const allowed = new Set(["P", "H2", "H3", "STRONG", "EM", "B", "I", "UL", "OL", "LI", "BR"]);
  const walk = (node) => {
    [...node.children].forEach((el) => {
      walk(el);
      if (!allowed.has(el.tagName)) el.replaceWith(...el.childNodes);
      else [...el.attributes].forEach((a) => el.removeAttribute(a.name));
    });
  };
  walk(doc.body);
  return doc.body.innerHTML;
}

function Subscribe() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("");
  async function submit(e) {
    e.preventDefault();
    setState("sending");
    try {
      const res = await fetch(`${API_URL}/subscribe`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const d = await res.json().catch(() => ({}));
      setState(res.ok ? (d.status === "already_subscribed" ? "You're already on the list." : "Subscribed. See you Monday.") : d.detail || "That didn't work. Try again.");
    } catch {
      setState("That didn't work. Check your connection.");
    }
  }
  return (
    <form className="ask" onSubmit={submit}>
      <label className="sr-only" htmlFor="digest-email">Email</label>
      <div className="ask-row">
        <input id="digest-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
        <button type="submit" className="btn btn--lime" disabled={state === "sending"}>Get it by email</button>
      </div>
      {state && state !== "sending" && <p className="ask-hint" role="status">{state}</p>}
    </form>
  );
}

export default function Digest() {
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/digests`).then((r) => (r.ok ? r.json() : { digests: [] })).then((d) => {
      setList(d.digests || []);
      if (d.digests?.[0]) fetch(`${API_URL}/digests/${d.digests[0].id}`).then((r) => r.json()).then(setOpen).catch(() => {});
    }).catch(() => setList([]));
  }, []);

  function show(id) {
    fetch(`${API_URL}/digests/${id}`).then((r) => r.json()).then((d) => { setOpen(d); window.scrollTo({ top: 0, behavior: "smooth" }); }).catch(() => {});
  }

  return (
    <main id="main" className="station">
      <header className="station-head">
        <h1 className="station-title">This week in <em>the Supreme Court.</em></h1>
        <p className="station-lede">Every Monday, Nyaya reads the week's new Supreme Court judgments and writes up the ones worth knowing, in plain words.</p>
        <Subscribe />
      </header>

      {list === null && <p className="muted">Fetching the digests…</p>}
      {list?.length === 0 && <div className="card code-switch"><p>The first digest on this page goes out next Monday. Subscribe above to get it by email.</p></div>}

      {open && (
        <article className="card answer digest">
          <p className="mono muted">{open.date} · {open.count} new judgment{open.count === 1 ? "" : "s"}</p>
          <div dangerouslySetInnerHTML={{ __html: clean(open.html) }} />
          {open.cases?.length > 0 && (
            <ul className="digest-cases">
              {open.cases.map((c) => (
                <li key={c.case_id}>
                  {c.source_url ? <a href={c.source_url} target="_blank" rel="noreferrer" className="text-link">{c.title}</a> : c.title}
                  <span className="mono muted"> {c.citation}</span>
                </li>
              ))}
            </ul>
          )}
        </article>
      )}

      {list?.length > 1 && (
        <section className="law-related">
          <h2 className="zone-title">Earlier digests</h2>
          <ul>
            {list.map((d) => (
              <li key={d.id}><button type="button" className="text-link digest-pick" onClick={() => show(d.id)} aria-current={open?.id === d.id}>{d.title || d.date}</button></li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
