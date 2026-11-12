import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { API_URL, apiFetch } from "../api";
import "./admin.css";

// The owner's dashboard: numbers, health, issues with fixes, and live settings.
// The API only answers accounts listed in ADMIN_EMAILS; everyone else sees a 403 here.

// Local preview only (npm run dev with VITE_ADMIN_PREVIEW=1 against a local backend); never true in a build.
const PREVIEW = import.meta.env.DEV && import.meta.env.VITE_ADMIN_PREVIEW === "1";

const TABS = [
  ["overview", "Overview"], ["issues", "Issues"], ["questions", "Questions"], ["feedback", "Feedback"],
  ["whatsapp", "WhatsApp"], ["users", "Users"], ["errors", "Errors"], ["settings", "Settings"], ["lawyers", "Lawyers"],
];

async function api(path, options) {
  const res = await apiFetch(`${API_URL}${path}`, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.detail || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return body;
}
const post = (path, data) => api(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data || {}) });

const inr = (n) => (n == null ? "–" : `₹${Math.round(n).toLocaleString("en-IN")}`);
const num = (n) => (n == null ? "–" : Number(n).toLocaleString("en-IN"));
const when = (v) => {
  if (!v) return "–";
  const d = typeof v === "number" ? new Date(v) : new Date(v);
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};
const shortDay = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

function useLoad(path) {
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

function Loading({ state, children }) {
  if (state.loading && !state.data) return <p className="adm-muted">Loading…</p>;
  if (state.error) return <p className="adm-error" role="alert">{state.error}</p>;
  return children;
}

/* ---------- a one-series bar chart with a hover readout ---------- */
function Bars({ title, values, labels, format, total }) {
  const [hover, setHover] = useState(null);
  const W = 640, H = 150, pad = 24;
  const max = Math.max(...values, 0) || 1;
  const step = (W - pad) / values.length;
  const bw = Math.max(2, step - 2);
  const shown = hover == null ? values.length - 1 : hover;
  return (
    <figure className="adm-chart">
      <figcaption>
        <span>{title}</span>
        <span className="adm-chart-read">
          {shortDay(labels[shown])}: <strong>{format(values[shown])}</strong>
          {total != null && <span className="adm-muted"> · {values.length} days: {format(total)}</span>}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H + 18}`} role="img" aria-label={`${title}, last ${values.length} days`}
           onMouseLeave={() => setHover(null)}>
        <line x1={pad} x2={W} y1={H} y2={H} className="adm-axis" />
        <text x={pad - 4} y={10} className="adm-tick" textAnchor="end">{format(max)}</text>
        {values.map((v, i) => {
          const h = v > 0 ? Math.max(2, (v / max) * (H - 14)) : 0;
          const x = pad + i * step;
          return (
            <g key={labels[i]} onMouseEnter={() => setHover(i)}>
              <rect x={x} y={0} width={step} height={H} fill="transparent" />
              {h > 0 && <path className={i === shown ? "adm-bar adm-bar--on" : "adm-bar"}
                d={`M${x},${H} V${H - h + Math.min(3, h / 2)} q0,-${Math.min(3, h / 2)} ${Math.min(3, bw / 2)},-${Math.min(3, h / 2)} H${x + bw - Math.min(3, bw / 2)} q${Math.min(3, bw / 2)},0 ${Math.min(3, bw / 2)},${Math.min(3, h / 2)} V${H} Z`} />}
            </g>
          );
        })}
        <text x={pad} y={H + 14} className="adm-tick">{shortDay(labels[0])}</text>
        <text x={W} y={H + 14} className="adm-tick" textAnchor="end">today</text>
      </svg>
      <details className="adm-table-toggle">
        <summary>Table</summary>
        <table className="adm-table adm-table--compact">
          <tbody>{labels.slice().reverse().map((d, i) => <tr key={d}><td>{shortDay(d)}</td><td>{format(values[values.length - 1 - i])}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}

function Tile({ label, value, note, tone }) {
  return (
    <div className={`adm-tile${tone ? ` adm-tile--${tone}` : ""}`}>
      <span className="adm-tile-label">{label}</span>
      <span className="adm-tile-value">{value}</span>
      {note && <span className="adm-tile-note">{note}</span>}
    </div>
  );
}

const ROUTE_NAMES = {
  ask: "Ask (website)", whatsapp: "WhatsApp answers", whatsapp_document: "WhatsApp documents", whatsapp_daily: "Law of the day",
  document: "Document review", document_ocr: "Reading scans", argument: "Argument builder", compare: "Compare cases",
  brief: "Case briefs", moot: "Moot practice", draft: "Drafts", digest: "Weekly digest", on_this_day: "On this day",
};

/* ---------- tabs ---------- */
function Overview({ go }) {
  const [days, setDays] = useState(30);
  const [state] = useLoad(`/admin/overview?days=${days}`);
  const d = state.data;
  return (
    <Loading state={state}>
      {d && (() => {
        const t = d.totals;
        const rate = d.usd_inr;
        const spendInr = d.spend.map((s) => s.usd * rate);
        const budgetPct = t.budget_usd ? t.usd_today / t.budget_usd : 0;
        return (
          <>
            <div className="adm-filter">
              {[7, 30, 90].map((n) => (
                <button key={n} type="button" aria-pressed={days === n} onClick={() => setDays(n)}>{n} days</button>
              ))}
            </div>
            <div className="adm-tiles">
              <Tile label="Spent today" value={inr(t.usd_today * rate)} note={`of ${inr(t.budget_usd * rate)} daily cap (${Math.round(budgetPct * 100)}%)`}
                    tone={budgetPct >= 0.9 ? "bad" : budgetPct >= 0.7 ? "warn" : null} />
              <Tile label={`Spent, ${days} days`} value={inr(t.inr)} note={t.cost_per_call_inr != null ? `${inr(t.cost_per_call_inr)} per AI call` : null} />
              <Tile label="Revenue" value={inr(t.revenue_inr)} note={`${inr(t.revenue_30d_inr)} in 30 days · ${num(t.payments)} payments${d.pro_enabled ? "" : " · Pro paused"}`} />
              <Tile label="Accounts" value={num(t.users)} note={`${num(t.active_7d)} active this week · ${num(t.pro_now)} on Pro`} />
              <Tile label="Questions, 30 days" value={num(t.questions_30d)} note={`${num(t.whatsapp_questions_30d)} on WhatsApp`} />
              <Tile label="Feedback" value={`${num(t.feedback_up)} 👍  ${num(t.feedback_down)} 👎`}
                    note={<button type="button" className="adm-link" onClick={() => go("feedback")}>Read the 👎</button>} />
              <Tile label="Law of the day" value={num(t.whatsapp_subscribers)} note="WhatsApp subscribers" />
              <Tile label="Lawyers" value={num(t.lawyers_live)} note={t.lawyers_pending ? <button type="button" className="adm-link" onClick={() => go("lawyers")}>{t.lawyers_pending} waiting for review</button> : "none waiting"} />
              <Tile label="Shared answers" value={num(t.shares)} />
            </div>
            <div className="adm-charts">
              <Bars title="AI spend per day" values={spendInr} labels={d.days} format={inr} total={spendInr.reduce((a, b) => a + b, 0)} />
              <Bars title="AI calls per day" values={d.spend.map((s) => s.calls)} labels={d.days} format={num} total={t.calls} />
              <Bars title="New accounts per day" values={d.signups} labels={d.days} format={num} total={d.signups.reduce((a, b) => a + b, 0)} />
            </div>
            <section className="adm-card">
              <h2>Where the money goes ({days} days)</h2>
              <table className="adm-table">
                <thead><tr><th>Feature</th><th className="num">Calls</th><th className="num">Spend</th><th className="num">Per call</th><th>Share</th></tr></thead>
                <tbody>
                  {d.by_route.map((r) => (
                    <tr key={r.route}>
                      <td>{ROUTE_NAMES[r.route] || r.route}</td>
                      <td className="num">{r.calls ? num(r.calls) : "–"}</td>
                      <td className="num">{inr(r.usd * rate)}</td>
                      <td className="num">{r.calls ? `₹${(r.usd * rate / r.calls).toFixed(2)}` : "–"}</td>
                      <td><span className="adm-share" style={{ "--w": `${t.usd ? (r.usd / t.usd) * 100 : 0}%` }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="adm-muted">Calls per feature are counted from today on; earlier days only have spend. Rupees at ₹{rate}/$.</p>
            </section>
          </>
        );
      })()}
    </Loading>
  );
}

function Issues({ go }) {
  const [state, reload] = useLoad("/admin/health");
  const [msg, setMsg] = useState("");
  async function act(action) {
    setMsg("");
    try {
      if (action === "run_daily") { await post("/admin/whatsapp/run-daily"); setMsg("Law of the day started. Check the WhatsApp tab in a minute."); }
      if (action === "raise_budget") go("settings");
    } catch (e) { setMsg(e.message); }
  }
  const d = state.data;
  return (
    <Loading state={state}>
      {d && (
        <>
          <div className="adm-row-between">
            <p className="adm-muted">Checked {when(d.checked_at)}</p>
            <button type="button" className="btn btn--ghost btn--sm" onClick={reload} disabled={state.loading}>{state.loading ? "Checking…" : "Check again"}</button>
          </div>
          {msg && <p className="adm-note" role="status">{msg}</p>}
          <section className="adm-card">
            <h2>{d.issues.length ? `${d.issues.length} thing${d.issues.length === 1 ? "" : "s"} to look at` : "Nothing needs you right now"}</h2>
            <ul className="adm-issues">
              {d.issues.map((i, n) => (
                <li key={n} className={`adm-issue adm-issue--${i.severity}`}>
                  <span className="adm-sev">{i.severity === "high" ? "Fix now" : i.severity === "medium" ? "Soon" : "FYI"}</span>
                  <div>
                    <strong>{i.title}</strong>
                    <p>{i.detail}</p>
                    <div className="adm-actions">
                      {i.action === "run_daily" && <button type="button" className="btn btn--lime btn--sm" onClick={() => act("run_daily")}>Run it now</button>}
                      {i.action === "raise_budget" && <button type="button" className="btn btn--lime btn--sm" onClick={() => act("raise_budget")}>Change the budget</button>}
                      {i.tab && <button type="button" className="btn btn--ghost btn--sm" onClick={() => go(i.tab)}>Open {TABS.find(([k]) => k === i.tab)?.[1]}</button>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section className="adm-card">
            <h2>Services</h2>
            <ul className="adm-checks">
              {d.checks.map((c) => (
                <li key={c.name}>
                  <span className={`adm-dot adm-dot--${c.status}`} aria-hidden="true" />
                  <span className="adm-check-name">{c.name}</span>
                  <span className="adm-check-status">{c.status === "ok" ? "OK" : c.status === "warn" ? "Check" : "Failing"}</span>
                  <span className="adm-muted">{c.detail}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </Loading>
  );
}

function Questions() {
  const [route, setRoute] = useState("");
  const [state] = useLoad(`/admin/questions?limit=150${route ? `&route=${route}` : ""}`);
  const [cleared, setCleared] = useState({});
  async function clear(text) {
    const r = await post("/admin/cache/clear", { question: text });
    setCleared((c) => ({ ...c, [text]: r.cleared }));
  }
  const d = state.data;
  return (
    <>
      <div className="adm-filter">
        {[["", "Everywhere"], ["ask", "Website"], ["whatsapp", "WhatsApp"]].map(([k, l]) => (
          <button key={k} type="button" aria-pressed={route === k} onClick={() => setRoute(k)}>{l}</button>
        ))}
      </div>
      <Loading state={state}>
        {d && (
          <>
            <div className="adm-tiles adm-tiles--3">
              <Tile label="Questions, 7 days" value={num(d.total_7d)} />
              <Tile label="Answered from cache" value={d.cache_rate == null ? "–" : `${Math.round(d.cache_rate * 100)}%`} note="free and instant" />
              <Tile label="Emergencies flagged" value={num(d.emergencies_7d)} note="helplines shown first" />
            </div>
            <section className="adm-card">
              <h2>Asked most (7 days)</h2>
              <ol className="adm-top">
                {d.top.map((q) => (
                  <li key={q.text}><span className="adm-count">{q.count}×</span> {q.text}</li>
                ))}
              </ol>
            </section>
            <section className="adm-card">
              <h2>Latest</h2>
              <table className="adm-table">
                <thead><tr><th>When</th><th>Where</th><th>Question</th><th /></tr></thead>
                <tbody>
                  {d.recent.map((q, i) => (
                    <tr key={i}>
                      <td className="nowrap">{when(q.created)}</td>
                      <td className="nowrap">
                        {q.route === "whatsapp" ? "WhatsApp" : "Website"}{q.voice ? " 🎙️" : ""}
                        {q.cached && <span className="adm-pill">cache</span>}
                        {q.emergency?.length > 0 && <span className="adm-pill adm-pill--bad">helplines</span>}
                      </td>
                      <td>{q.text}</td>
                      <td>
                        {q.cached && (cleared[q.text] != null
                          ? <span className="adm-muted">cleared</span>
                          : <button type="button" className="adm-link" onClick={() => clear(q.text)} title="Forget the saved answer so the next person gets a fresh one">Refresh answer</button>)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
      </Loading>
    </>
  );
}

function Feedback() {
  const [filter, setFilter] = useState({ helpful: "no", status: "open" });
  const [state, reload] = useLoad(`/admin/feedback?helpful=${filter.helpful}&status=${filter.status}`);
  const [busy, setBusy] = useState({});
  async function run(id, fn, label) {
    setBusy((b) => ({ ...b, [id]: label }));
    try { await fn(); } catch (e) { setBusy((b) => ({ ...b, [id]: e.message })); return; }
    setBusy((b) => ({ ...b, [id]: `${label} ✓` }));
  }
  const d = state.data;
  return (
    <>
      <div className="adm-filter">
        {[["no", "👎 Not helpful"], ["yes", "👍 Helpful"], ["all", "All"]].map(([k, l]) => (
          <button key={k} type="button" aria-pressed={filter.helpful === k} onClick={() => setFilter((f) => ({ ...f, helpful: k }))}>{l}</button>
        ))}
        <span className="adm-sep" />
        {[["open", "Open"], ["resolved", "Resolved"], ["all", "Any"]].map(([k, l]) => (
          <button key={k} type="button" aria-pressed={filter.status === k} onClick={() => setFilter((f) => ({ ...f, status: k }))}>{l}</button>
        ))}
      </div>
      <Loading state={state}>
        {d && (d.feedback.length === 0 ? <p className="adm-muted">Nothing here.</p> : (
          <ul className="adm-feedback">
            {d.feedback.map((f) => (
              <li key={f.id} className="adm-card">
                <div className="adm-row-between">
                  <span className="adm-muted">{f.helpful ? "👍" : "👎"} {f.route === "whatsapp" ? "WhatsApp" : "Website"} · {when(f.created)}{f.status === "resolved" ? " · resolved" : ""}</span>
                  {busy[f.id] && <span className="adm-muted" role="status">{busy[f.id]}</span>}
                </div>
                <p className="adm-q">{f.question || <em>(question not recorded)</em>}</p>
                {f.reason && <p className="adm-reason">“{f.reason}”</p>}
                {f.answer && (
                  <details><summary>The answer they got</summary><div className="adm-answer">{f.answer}</div></details>
                )}
                <div className="adm-actions">
                  {f.question && <button type="button" className="btn btn--ghost btn--sm" title="The next person who asks gets a freshly written answer"
                    onClick={() => run(f.id, () => post(`/admin/feedback/${f.id}/clear-cache`), "Answer refreshed")}>Refresh this answer</button>}
                  <button type="button" className="btn btn--lime btn--sm"
                    onClick={() => run(f.id, async () => { await post(`/admin/feedback/${f.id}`, { status: f.status === "resolved" ? "open" : "resolved" }); reload(); }, f.status === "resolved" ? "Reopened" : "Resolved")}>
                    {f.status === "resolved" ? "Reopen" : "Mark resolved"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ))}
      </Loading>
    </>
  );
}

function WhatsApp() {
  const [state, reload] = useLoad("/admin/whatsapp");
  const [msg, setMsg] = useState("");
  const d = state.data;
  return (
    <Loading state={state}>
      {d && (
        <>
          {msg && <p className="adm-note" role="status">{msg}</p>}
          <div className="adm-tiles adm-tiles--3">
            <Tile label="Number" value={d.phone?.display_phone_number || "–"} note={d.phone ? `${d.phone.verified_name} · ${String(d.phone.name_status || "").toLowerCase().replace(/_/g, " ")}` : d.phone_error} />
            <Tile label="Quality" value={(d.phone?.quality_rating || "–").toLowerCase()} note={`limit ${d.phone?.messaging_limit_tier || "?"}`}
                  tone={d.phone?.quality_rating === "RED" ? "bad" : d.phone?.quality_rating === "YELLOW" ? "warn" : null} />
            <Tile label="Law of the day" value={num(d.subscribers)} note={`subscribers · ${d.per_day} questions per person a day`} />
          </div>
          <section className="adm-card">
            <div className="adm-row-between">
              <h2>Law of the day</h2>
              <button type="button" className="btn btn--ghost btn--sm" onClick={async () => {
                setMsg("");
                try { await post("/admin/whatsapp/run-daily"); setMsg("Sending now. Reload in a minute to see the run."); } catch (e) { setMsg(e.message); }
              }}>Send today's now</button>
            </div>
            {d.daily_job ? (
              <p>Runs daily at 9:00 India time ({String(d.daily_job.state).toLowerCase()}). Last run {when(d.daily_job.last_run)}
                {d.daily_job.last_status ? <strong className="adm-bad"> failed (code {d.daily_job.last_status})</strong> : " OK"}; next {when(d.daily_job.next_run)}.</p>
            ) : <p className="adm-muted">{d.daily_job_error || "Not set up."}</p>}
            <table className="adm-table">
              <thead><tr><th>Template</th><th>Language</th><th>Status</th><th>Note</th></tr></thead>
              <tbody>
                {(d.templates || []).map((t) => (
                  <tr key={`${t.name}${t.language}`}>
                    <td>{t.name}</td><td>{t.language}</td>
                    <td><span className={`adm-pill ${t.status === "APPROVED" ? "adm-pill--ok" : t.status === "REJECTED" || t.status === "PAUSED" ? "adm-pill--bad" : ""}`}>{t.status.toLowerCase()}</span></td>
                    <td className="adm-muted">{t.status === "PENDING" ? "Meta is reviewing it" : t.rejected_reason && t.rejected_reason !== "NONE" ? t.rejected_reason : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="adm-card">
            <div className="adm-row-between">
              <h2>Messages that didn't go through (3 days)</h2>
              <button type="button" className="btn btn--ghost btn--sm" onClick={reload}>Reload</button>
            </div>
            {(d.delivery_failures || []).filter((e) => !e.error).length === 0 ? <p className="adm-muted">None.</p> : (
              <table className="adm-table">
                <thead><tr><th>When</th><th>Meta's reason</th></tr></thead>
                <tbody>
                  {d.delivery_failures.filter((e) => !e.error).map((e, i) => (
                    <tr key={i}><td className="nowrap">{when(e.time)}</td>
                      <td>{(e.errors || []).map((x) => `${x.code}: ${x.title || x.message}${x.details ? ` (${x.details})` : ""}`).join("; ") || e.text}</td></tr>
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

function Users() {
  const { user } = useAuth();
  const [state, reload] = useLoad("/admin/users");
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const d = state.data;
  const rows = (d?.users || []).filter((u) => !q || `${u.email} ${u.name}`.toLowerCase().includes(q.toLowerCase()));
  const byCost = [...(d?.users || [])].sort((a, b) => b.cost_month.usd - a.cost_month.usd).slice(0, 5).filter((u) => u.cost_month.usd > 0);
  async function block(u, blocked) {
    if (blocked && !window.confirm(`Block ${u.email}? They won't be able to ask questions or use any tool until you unblock them.`)) return;
    setMsg("");
    try { await post(`/admin/users/${u.uid}/block`, { blocked }); reload(); } catch (e) { setMsg(e.message); }
  }
  return (
    <Loading state={state}>
      {d && (
        <>
          {msg && <p className="adm-error" role="alert">{msg}</p>}
          <section className="adm-card">
            <h2>Costliest this month</h2>
            <p className="adm-muted">Signed-out visitors together: ${d.anon_cost_month.usd.toFixed(2)} over {num(d.anon_cost_month.calls)} AI calls.</p>
            {byCost.length > 0 && (
              <table className="adm-table">
                <tbody>{byCost.map((u) => <tr key={u.uid}><td>{u.email}</td><td className="num">{num(u.cost_month.calls)} calls</td><td className="num">${u.cost_month.usd.toFixed(2)}</td></tr>)}</tbody>
              </table>
            )}
          </section>
          <section className="adm-card">
            <div className="adm-row-between">
              <h2>{num(d.users.length)} accounts</h2>
              <input className="adm-input" type="search" placeholder="Search email or name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search accounts" />
            </div>
            <table className="adm-table">
              <thead><tr><th>Account</th><th>Joined</th><th>Last sign-in</th><th>Plan</th><th className="num">This month</th><th /></tr></thead>
              <tbody>
                {rows.slice(0, 300).map((u) => (
                  <tr key={u.uid} className={u.blocked ? "adm-blocked" : ""}>
                    <td>{u.email}<br /><span className="adm-muted">{u.name}</span></td>
                    <td className="nowrap">{when(u.created)}</td>
                    <td className="nowrap">{when(u.last_seen)}</td>
                    <td>{u.pro_until ? `Pro to ${when(u.pro_until)}` : "Free"}</td>
                    <td className="num">{u.cost_month.calls ? `$${u.cost_month.usd.toFixed(2)}` : "–"}</td>
                    <td>{u.uid !== user?.uid && (u.blocked
                      ? <button type="button" className="adm-link" onClick={() => block(u, false)}>Unblock</button>
                      : <button type="button" className="adm-link adm-link--bad" onClick={() => block(u, true)}>Block</button>)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </Loading>
  );
}

function Errors() {
  const [hours, setHours] = useState(24);
  const [state, reload] = useLoad(`/admin/errors?hours=${hours}`);
  const d = state.data;
  const list = (rows) => rows.filter((e) => !e.error).length === 0
    ? <p className="adm-muted">{rows[0]?.error || "None."}</p>
    : (
      <ul className="adm-logs">
        {rows.filter((e) => !e.error).map((e, i) => (
          <li key={i}>
            <span className="nowrap adm-muted">{when(e.time)}</span>
            <span><strong>{e.event || e.severity?.toLowerCase()}</strong>{e.route ? ` · ${e.route}` : ""}{e.status ? ` · ${e.status}` : ""}</span>
            <span>{e.text}</span>
            {e.traceback && <details><summary>Details</summary><pre>{e.traceback}</pre></details>}
          </li>
        ))}
      </ul>
    );
  return (
    <>
      <div className="adm-filter">
        {[[24, "24 hours"], [72, "3 days"], [168, "7 days"]].map(([h, l]) => (
          <button key={h} type="button" aria-pressed={hours === h} onClick={() => setHours(h)}>{l}</button>
        ))}
        <button type="button" className="btn btn--ghost btn--sm" onClick={reload}>Reload</button>
      </div>
      <Loading state={state}>
        {d && (
          <>
            <section className="adm-card"><h2>Errors</h2>{list(d.errors)}</section>
            <section className="adm-card"><h2>Warnings</h2>{list(d.warnings)}</section>
          </>
        )}
      </Loading>
    </>
  );
}

function Settings() {
  const [state] = useLoad("/admin/settings");
  return (
    <Loading state={state}>
      {state.data && <SettingsForm initial={state.data.settings} defaults={state.data.defaults} />}
    </Loading>
  );
}

function SettingsForm({ initial, defaults }) {
  const [form, setForm] = useState(initial);
  const [msg, setMsg] = useState("");
  const d = { defaults };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  async function save(e) {
    e.preventDefault();
    setMsg("");
    const body = {
      ...form,
      daily_budget_usd: form.daily_budget_usd === "" || form.daily_budget_usd == null ? null : Number(form.daily_budget_usd),
      whatsapp_per_day: form.whatsapp_per_day === "" || form.whatsapp_per_day == null ? null : Number(form.whatsapp_per_day),
    };
    try { const r = await post("/admin/settings", body); setForm(r.settings); setMsg("Saved. Live within 30 seconds."); }
    catch (err) { setMsg(err.message); }
  }
  return (
    <>
      {(
        <form className="adm-settings" onSubmit={save}>
          <section className="adm-card">
            <h2>Spending</h2>
            <label>Daily AI budget (US dollars)
              <input className="adm-input" type="number" step="0.5" min="0.5" max="200" value={form.daily_budget_usd ?? ""} onChange={set("daily_budget_usd")} placeholder={`${d.defaults.daily_budget_usd} (default)`} />
              <span className="adm-muted">When it's used up, Nyaya says "come back tomorrow" until midnight India time. Empty uses the default.</span>
            </label>
          </section>
          <section className="adm-card">
            <h2>WhatsApp</h2>
            <label>Questions per person per day
              <input className="adm-input" type="number" min="1" max="100" value={form.whatsapp_per_day ?? ""} onChange={set("whatsapp_per_day")} placeholder={`${d.defaults.whatsapp_per_day} (default)`} />
            </label>
            <label className="adm-check"><input type="checkbox" checked={!!form.whatsapp_paused} onChange={set("whatsapp_paused")} /> Pause the WhatsApp bot</label>
            {form.whatsapp_paused && (
              <label>What it replies while paused
                <textarea className="adm-input" rows={2} maxLength={300} value={form.whatsapp_pause_message || ""} onChange={set("whatsapp_pause_message")} />
              </label>
            )}
            <label className="adm-check"><input type="checkbox" checked={form.daily_law_on !== false} onChange={set("daily_law_on")} /> Send Law of the day each morning</label>
          </section>
          <section className="adm-card">
            <h2>Banner on the website</h2>
            <label className="adm-check"><input type="checkbox" checked={!!form.banner_on} onChange={set("banner_on")} /> Show a banner at the top of every page</label>
            <label>Text
              <input className="adm-input" maxLength={200} value={form.banner_text || ""} onChange={set("banner_text")} placeholder="Nyaya is now on WhatsApp: send a photo of any legal notice" />
            </label>
            <label>Link (optional)
              <input className="adm-input" maxLength={300} value={form.banner_link || ""} onChange={set("banner_link")} placeholder="/tools or https://wa.me/919136423655" />
            </label>
          </section>
          <div className="adm-actions">
            <button type="submit" className="btn btn--lime">Save settings</button>
            {msg && <span role="status" className="adm-muted">{msg}</span>}
          </div>
        </form>
      )}
    </>
  );
}

function Lawyers() {
  const [status, setStatus] = useState("pending");
  const [state, reload] = useLoad(`/admin/lawyers?status=${status}`);
  async function review(uid, s) {
    await post(`/admin/lawyers/${uid}`, { status: s });
    reload();
  }
  return (
    <>
      <div className="adm-filter">
        {[["pending", "Waiting"], ["approved", "Live"], ["rejected", "Rejected"]].map(([k, l]) => (
          <button key={k} type="button" aria-pressed={status === k} onClick={() => setStatus(k)}>{l}</button>
        ))}
      </div>
      <Loading state={state}>
        {state.data && (state.data.lawyers.length === 0 ? <p className="adm-muted">None.</p> : (
          <ul className="adm-feedback">
            {state.data.lawyers.map((l) => (
              <li key={l.id} className="adm-card">
                <strong>{l.name}</strong>
                <p className="adm-muted">{l.enrolment_no} · {l.bar_council} · {l.city} · {l.account_email}</p>
                <p>{(l.practice_areas || []).join(" · ")}</p>
                <div className="adm-actions">
                  {status !== "approved" && <button type="button" className="btn btn--lime btn--sm" onClick={() => review(l.id, "approved")}>Approve</button>}
                  {status !== "rejected" && <button type="button" className="btn btn--ghost btn--sm" onClick={() => review(l.id, "rejected")}>{status === "approved" ? "Take down" : "Reject"}</button>}
                </div>
              </li>
            ))}
          </ul>
        ))}
      </Loading>
    </>
  );
}

export default function Admin() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState(() => {
    const h = window.location.hash.slice(1);
    return TABS.some(([k]) => k === h) ? h : "overview";
  });
  const [allowed, setAllowed] = useState(null);
  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.slice(1);
      if (TABS.some(([k]) => k === h)) setTab(h);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  useEffect(() => {
    document.title = "Admin · Nyaya";
    const meta = document.createElement("meta");
    meta.name = "robots"; meta.content = "noindex";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
  useEffect(() => {
    if (!user && !PREVIEW) return;
    api("/admin/settings").then(() => setAllowed(true)).catch((e) => setAllowed(e.status === 403 || e.status === 401 ? false : true));
  }, [user]);
  const go = (t) => { setTab(t); window.history.replaceState(null, "", `#${t}`); window.scrollTo({ top: 0 }); };

  if (loading && !PREVIEW) return <main id="main" className="adm"><p className="adm-muted">Loading…</p></main>;
  if ((!user && !PREVIEW) || allowed === false) {
    return (
      <main id="main" className="adm">
        <h1 className="adm-title">Admin</h1>
        <p>{user ? "This account isn't an admin." : "Sign in with the admin account to see this page."}</p>
        <p><Link to="/" className="text-link">Back to Nyaya</Link></p>
      </main>
    );
  }
  const Tab = { overview: Overview, issues: Issues, questions: Questions, feedback: Feedback, whatsapp: WhatsApp,
                users: Users, errors: Errors, settings: Settings, lawyers: Lawyers }[tab];
  return (
    <main id="main" className="adm">
      <header className="adm-head">
        <h1 className="adm-title">Nyaya admin</h1>
        <nav className="adm-tabs" aria-label="Admin sections">
          {TABS.map(([k, l]) => (
            <button key={k} type="button" aria-current={tab === k ? "page" : undefined} onClick={() => go(k)}>{l}</button>
          ))}
        </nav>
      </header>
      {allowed && <Tab go={go} />}
    </main>
  );
}
