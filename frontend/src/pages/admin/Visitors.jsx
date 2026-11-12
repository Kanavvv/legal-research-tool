import { useState } from "react";
import { Bars, Loading, Tile } from "./ui";
import { num, useLoad } from "./shared";

const EVENT_NAMES = {
  share_link: "Share links made", friend_wa: "Answers sent on WhatsApp", guide_wa: "Guides sent on WhatsApp",
  card_saved: "Answer pictures saved", card_shared: "Answer pictures shared", trending_open: "Trending questions opened",
};
const PAGE_NAMES = {
  "/": "Home (Ask Nyaya)", "/a/:shared": "Shared answers", "/acts/:section": "Act sections", "/trending": "What India is asking",
  "/is-it-legal": "Is this legal?", "/notice": "Notice decoder", "/tools": "All tools", "/now": "Something just happened?",
};

function refName(r) {
  if (r === "direct") return "Typed the address or a bookmark";
  if (r.startsWith("tag:wa")) return "A WhatsApp share from Nyaya";
  if (r.startsWith("tag:")) return `Tagged link: ${r.slice(4)}`;
  return r.replace(/_/g, ".");
}

function List({ title, rows, name, empty }) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <section className="adm-card">
      <h2>{title}</h2>
      {rows.length === 0 ? <p className="cr-muted">{empty}</p> : (
        <ul className="cr-hbars">
          {rows.map((r) => (
            <li key={r.name}>
              <span className="cr-hbar-name">{name(r.name)}</span>
              <span className="cr-hbar-track"><span className="cr-hbar" style={{ "--w": r.count / max }} /></span>
              <span className="cr-hbar-val">{num(r.count)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Who's visiting, from where, and how much they share. Counts only people who allowed counting.
export default function Visitors() {
  const [days, setDays] = useState(30);
  const [state] = useLoad(`/admin/visitors?days=${days}`);
  const d = state.data;
  return (
    <>
      <div className="cr-toolbar">
        <div className="cr-seg" role="group" aria-label="Period">
          {[7, 30, 90].map((n) => <button key={n} type="button" aria-pressed={days === n} onClick={() => setDays(n)}>{n} days</button>)}
        </div>
      </div>
      <Loading state={state}>
        {d && (() => {
          const today = d.days[d.days.length - 1] || { views: 0, visits: 0 };
          const mobile = d.devices.mobile || 0, desktop = d.devices.desktop || 0;
          const shares = Object.entries(d.events).filter(([k]) => k !== "trending_open").reduce((a, [, v]) => a + v, 0);
          return (
            <>
              <div className="adm-tiles">
                <Tile label="Visits today" value={num(today.visits)} note={`${num(today.views)} pages viewed`} />
                <Tile label={`Visits, ${days} days`} value={num(d.visits)} note={`${(d.visits / days).toFixed(1)} a day on average`} />
                <Tile label="Pages per visit" value={d.visits ? (d.views / d.visits).toFixed(1) : "–"} note="how far people explore" />
                <Tile label="On phones" value={mobile + desktop ? `${Math.round((mobile / (mobile + desktop)) * 100)}%` : "–"} note={`${num(mobile)} phone · ${num(desktop)} computer page views`} />
                <Tile label="Shares" value={num(shares)} note="links, WhatsApp sends and pictures" />
              </div>
              <div className="adm-charts">
                <Bars title="Visits per day" values={d.days.map((x) => x.visits)} labels={d.days.map((x) => x.day)} format={num} total={d.visits} />
                <Bars title="Pages viewed per day" values={d.days.map((x) => x.views)} labels={d.days.map((x) => x.day)} format={num} total={d.views} />
              </div>
              <div className="cr-split">
                <List title="Most-visited pages" rows={d.paths} name={(p) => PAGE_NAMES[p] || p} empty="No visits counted yet." />
                <List title="Where visitors came from" rows={d.refs} name={refName} empty="No visits counted yet." />
              </div>
              <List title="Sharing" rows={Object.entries(d.events).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)}
                name={(e) => EVENT_NAMES[e] || e} empty="Nobody has shared anything yet. Answer pages now have Send on WhatsApp and Save as picture." />
              <p className="cr-muted">Counts only visitors who tapped "Allow" on the site's consent banner, so real traffic is higher. Nothing personal is stored: no names, numbers, IP addresses or cookies, just one total per page per day.</p>
            </>
          );
        })()}
      </Loading>
    </>
  );
}
