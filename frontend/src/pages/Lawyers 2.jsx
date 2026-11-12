import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_URL, apiFetch, responseError } from "../api";
import { useAuth } from "../AuthContext";

const NOTE = "Advocates list themselves here, and Nyaya checks each listing before it appears. Nyaya doesn't rank, rate or recommend anyone, and takes no fee from advocates or from you. Check an advocate's enrolment with their State Bar Council before you engage them.";

function Card({ l }) {
  return (
    <li className="card lawyer">
      <h2 className="lawyer-name">{l.name}</h2>
      <p className="mono muted">{[l.city, l.state].filter(Boolean).join(", ")}{l.years ? ` · ${l.years} yrs in practice` : ""}</p>
      <p className="lawyer-areas">{(l.practice_areas || []).join(" · ")}</p>
      {l.courts && <p className="muted">Appears in: {l.courts}</p>}
      {l.languages && <p className="muted">Languages: {l.languages}</p>}
      {l.about && <p>{l.about}</p>}
      <p className="mono muted">Enrolment {l.enrolment_no}, {l.bar_council}</p>
      <div className="answer-actions">
        {l.phone && <a className="btn btn--ghost btn--sm" href={`tel:${l.phone.replace(/[^\d+]/g, "")}`}>Call {l.phone}</a>}
        {l.email && <a className="btn btn--ghost btn--sm" href={`mailto:${l.email}`}>Email</a>}
        {l.website && <a className="btn btn--ghost btn--sm" href={l.website} target="_blank" rel="noreferrer nofollow">Website</a>}
      </div>
    </li>
  );
}

function Directory() {
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`${API_URL}/lawyers?city=${encodeURIComponent(city.trim())}&area=${encodeURIComponent(area)}`)
        .then((r) => (r.ok ? r.json() : { lawyers: [], areas: [] }))
        .then(setData)
        .catch(() => setData({ lawyers: [], areas: [] }));
    }, 300);
    return () => clearTimeout(t);
  }, [city, area]);

  return (
    <>
      <div className="card doc-form lawyer-filters">
        <div className="field">
          <label htmlFor="lw-city">City</label>
          <input id="lw-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Jaipur" />
        </div>
        <div className="field">
          <label htmlFor="lw-area">Area of practice</label>
          <select id="lw-area" value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">Any</option>
            {(data?.areas || []).map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>
      {data === null ? <p className="muted">Looking…</p> : data.lawyers.length === 0 ? (
        <div className="card code-switch">
          <p>No listed advocates {city || area ? "match that yet" : "yet"}. The directory is new and fills as advocates add themselves. For free help now, call the legal aid helpline <b>15100</b>.</p>
        </div>
      ) : (
        <ul className="lawyer-list">{data.lawyers.map((l) => <Card key={l.id} l={l} />)}</ul>
      )}
    </>
  );
}

const EMPTY = { name: "", enrolment_no: "", bar_council: "", city: "", state: "", courts: "", practice_areas: [], languages: "", years: "", phone: "", email: "", website: "", about: "", consent: false };

function Join() {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [areas, setAreas] = useState([]);
  const [status, setStatus] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!user) return;
    apiFetch(`${API_URL}/lawyers/me`).then((r) => r.json()).then((d) => {
      setAreas(d.areas || []);
      if (d.listing) {
        setForm({ ...EMPTY, ...d.listing, years: d.listing.years ?? "", consent: false });
        setStatus(d.listing.status);
      }
    }).catch(() => {});
  }, [user]);

  if (!user) {
    return <div className="card code-switch"><p>Sign in first, so only you can change your listing. <Link to="/account" className="text-link">Sign in</Link></p></div>;
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const toggleArea = (a) => setForm((f) => ({ ...f, practice_areas: f.practice_areas.includes(a) ? f.practice_areas.filter((x) => x !== a) : [...f.practice_areas, a].slice(0, 6) }));

  async function save(e) {
    e.preventDefault();
    setMsg("");
    try {
      const res = await apiFetch(`${API_URL}/lawyers`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, years: form.years === "" ? null : Number(form.years) }) });
      if (!res.ok) throw await responseError(res);
      setStatus("pending");
      setMsg("Saved. Nyaya will check your enrolment and publish the listing, usually within two working days.");
    } catch (err) {
      setMsg(err?.userMessage || "That didn't save. Try again.");
    }
  }

  async function remove() {
    if (!window.confirm("Remove your listing from Nyaya?")) return;
    await apiFetch(`${API_URL}/lawyers/me`, { method: "DELETE" });
    setForm(EMPTY); setStatus(null); setMsg("Your listing is removed.");
  }

  const text = (k, label, props = {}) => (
    <div className="field"><label htmlFor={`lj-${k}`}>{label}</label><input id={`lj-${k}`} value={form[k]} onChange={set(k)} {...props} /></div>
  );

  return (
    <form className="card doc-form lawyer-join" onSubmit={save}>
      {status && <p className="mono muted">Your listing: {status === "approved" ? "live" : status === "rejected" ? "not approved (edit and resubmit)" : "waiting for review"}</p>}
      <div className="lawyer-grid">
        {text("name", "Full name (as enrolled) *", { required: true, maxLength: 80 })}
        {text("enrolment_no", "Enrolment number *", { required: true, maxLength: 40, placeholder: "e.g. D/1234/2015" })}
        {text("bar_council", "State Bar Council *", { required: true, maxLength: 80, placeholder: "e.g. Bar Council of Delhi" })}
        {text("years", "Years in practice", { type: "number", min: 0, max: 70 })}
        {text("city", "City *", { required: true, maxLength: 60 })}
        {text("state", "State *", { required: true, maxLength: 60 })}
        {text("courts", "Courts you appear in", { maxLength: 160, placeholder: "e.g. District Courts Saket, Delhi High Court" })}
        {text("languages", "Languages", { maxLength: 80, placeholder: "e.g. Hindi, English, Punjabi" })}
        {text("phone", "Phone", { maxLength: 20, inputMode: "tel" })}
        {text("email", "Email", { type: "email", maxLength: 120 })}
        {text("website", "Website", { maxLength: 160 })}
      </div>
      <fieldset className="kinds">
        <legend className="slot-label">Areas of practice * (up to 6)</legend>
        {areas.map((a) => (
          <label key={a} className={form.practice_areas.includes(a) ? "kind kind--on" : "kind"}>
            <input type="checkbox" checked={form.practice_areas.includes(a)} onChange={() => toggleArea(a)} />{a}
          </label>
        ))}
      </fieldset>
      <div className="field">
        <label htmlFor="lj-about">About your practice (plain facts, up to 400 characters)</label>
        <textarea id="lj-about" rows={3} maxLength={400} value={form.about} onChange={set("about")} />
      </div>
      <label className="tpl-check">
        <input type="checkbox" checked={form.consent} onChange={set("consent")} required />
        <span>I am an advocate enrolled with the Bar Council named above. The details are true, and I agree to them being shown publicly. This listing is information, not an advertisement or solicitation of work.</span>
      </label>
      {msg && <div className="alert" role="status">{msg}</div>}
      <div className="doc-submit">
        <button type="submit" className="btn btn--lime">{status ? "Save changes" : "Submit my listing"}</button>
        {status && <button type="button" className="btn btn--ghost btn--sm" onClick={remove}>Remove my listing</button>}
      </div>
    </form>
  );
}

function Admin() {
  const [rows, setRows] = useState(null);
  const load = () => apiFetch(`${API_URL}/admin/lawyers?status=pending`).then((r) => (r.ok ? r.json() : null)).then((d) => setRows(d?.lawyers ?? null)).catch(() => setRows(null));
  useEffect(() => { load(); }, []);
  if (!rows) return null;
  async function review(uid, status) {
    await apiFetch(`${API_URL}/admin/lawyers/${uid}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    load();
  }
  return (
    <section className="law-related">
      <h2 className="zone-title">Waiting for review ({rows.length})</h2>
      <ul className="lawyer-list">
        {rows.map((l) => (
          <li key={l.id} className="card lawyer">
            <h3 className="lawyer-name">{l.name}</h3>
            <p className="mono muted">{l.enrolment_no} · {l.bar_council} · {l.city} · account {l.account_email}</p>
            <p>{(l.practice_areas || []).join(" · ")}</p>
            <div className="answer-actions">
              <button type="button" className="btn btn--lime btn--sm" onClick={() => review(l.id, "approved")}>Approve</button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => review(l.id, "rejected")}>Reject</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Lawyers({ join = false }) {
  const { user } = useAuth();
  return (
    <main id="main" className="station">
      <header className="station-head">
        {join ? (
          <>
            <p className="mono muted"><Link to="/lawyers" className="text-link">Find a lawyer</Link></p>
            <h1 className="station-title">List your <em>practice.</em></h1>
            <p className="station-lede">Free, for enrolled advocates. Name, enrolment, courts, areas of practice and how to reach you: nothing more.</p>
          </>
        ) : (
          <>
            <h1 className="station-title">Find <em>a lawyer.</em></h1>
            <p className="station-lede">{NOTE}</p>
            <p><Link to="/lawyers/join" className="text-link">Are you an advocate? List yourself free</Link></p>
          </>
        )}
      </header>
      {join ? <Join /> : <Directory />}
      {!join && user && <Admin />}
    </main>
  );
}
