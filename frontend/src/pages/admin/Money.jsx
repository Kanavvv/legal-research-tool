import { useState } from "react";
import { Bars, Loading, Tile } from "./ui";
import { ROUTE_NAMES, inr, num, useLoad } from "./shared";

// Where the money goes, what an answer costs, and where the month is heading.
export default function Money({ go }) {
  const [state] = useLoad("/admin/overview?days=30");
  const [perDay, setPerDay] = useState(null);
  const d = state.data;
  return (
    <Loading state={state}>
      {d && (() => {
        const t = d.totals, rate = d.usd_inr;
        const daily = d.spend.map((s) => s.usd * rate);
        const last7 = daily.slice(-7).reduce((a, b) => a + b, 0) / 7;
        const calls7 = d.spend.slice(-7).reduce((a, s) => a + s.calls, 0) / 7;
        const perCall = t.cost_per_call_inr ?? (calls7 ? last7 / calls7 : 0);
        const q = perDay ?? Math.max(10, Math.round(calls7) || 50);
        const budgetInr = t.budget_usd * rate;
        const todayPct = t.budget_usd ? Math.min(1, t.usd_today / t.budget_usd) : 0;
        const net = t.revenue_30d_inr - t.inr;
        const maxRoute = Math.max(...d.by_route.map((r) => r.usd), 0.0001);
        return (
          <>
            <div className="adm-tiles">
              <Tile label="Heading for, this month" value={inr(last7 * 30)} note={`at the last 7 days' pace (${inr(last7)} a day)`} />
              <Tile label="Spent, last 30 days" value={inr(t.inr)} note={`${num(t.calls)} AI calls`} />
              <Tile label="One AI answer costs" value={perCall ? `₹${perCall.toFixed(2)}` : "–"} note="on average; cached repeats are free" />
              <Tile label="Revenue, 30 days" value={inr(t.revenue_30d_inr)} note={d.pro_enabled ? `${num(t.pro_now)} on Pro` : "Pro is paused"} />
              <Tile label="Revenue minus AI spend" value={`${net < 0 ? "−" : ""}${inr(Math.abs(net))}`} note="30 days, before hosting" tone={net < 0 ? "warn" : null} />
            </div>

            <section className="adm-card cr-gauge-card">
              <div className="adm-row-between">
                <h2>Today against the daily cap</h2>
                <button type="button" className="adm-link" onClick={() => go("settings")}>Change the cap</button>
              </div>
              <div className="cr-gauge" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(todayPct * 100)} aria-label="Today's AI spend as a share of the daily cap">
                <span className={`cr-gauge-fill${todayPct >= 0.9 ? " cr-gauge-fill--bad" : todayPct >= 0.7 ? " cr-gauge-fill--warn" : ""}`} style={{ "--p": todayPct }} />
              </div>
              <p className="cr-muted">{inr(t.usd_today * rate)} of {inr(budgetInr)} ({Math.round(todayPct * 100)}%). When the cap is reached, new AI answers stop until midnight (India time); cached answers keep working.</p>
            </section>

            <div className="adm-charts">
              <Bars title="AI spend per day" values={daily} labels={d.days} format={inr} total={t.inr} />
              <Bars title="AI calls per day" values={d.spend.map((x) => x.calls)} labels={d.days} format={num} total={t.calls} />
            </div>

            <section className="adm-card">
              <h2>Spend by feature, 30 days</h2>
              <ul className="cr-hbars">
                {d.by_route.map((r) => (
                  <li key={r.route}>
                    <span className="cr-hbar-name">{ROUTE_NAMES[r.route] || r.route}</span>
                    <span className="cr-hbar-track"><span className="cr-hbar" style={{ "--w": r.usd / maxRoute }} /></span>
                    <span className="cr-hbar-val">{inr(r.usd * rate)}</span>
                    <span className="cr-hbar-sub">{r.calls ? `${num(r.calls)} calls · ₹${(r.usd * rate / r.calls).toFixed(2)} each` : ""}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="adm-card">
              <h2>What if Nyaya grows?</h2>
              <label className="cr-slider">
                <span>AI answers a day: <strong>{num(q)}</strong></span>
                <input type="range" min={10} max={5000} step={10} value={q} onChange={(e) => setPerDay(Number(e.target.value))} />
              </label>
              <div className="adm-tiles adm-tiles--3">
                <Tile label="AI cost a day" value={inr(q * perCall)} />
                <Tile label="AI cost a month" value={inr(q * perCall * 30)} />
                <Tile label="Pro users to cover it" value={num(Math.ceil((q * perCall * 30) / 199))} note="at ₹199 a month each" />
              </div>
              <p className="cr-muted">Uses today's average of ₹{perCall.toFixed(2)} per AI answer. Repeated questions come from the cache at no cost, so real costs run lower.</p>
            </section>
          </>
        );
      })()}
    </Loading>
  );
}
