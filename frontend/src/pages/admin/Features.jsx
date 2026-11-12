import { useState } from "react";
import { Loading } from "./ui";
import { inr, num, post, useLoad } from "./shared";

const PAGE = {
  ask: "/", check: "/is-it-legal", notice: "/notice", assist: "/templates/rti-application", compare: "/compare",
  argument: "/argument-builder", brief: "/students?tab=brief", moot: "/students?tab=moot", lawyers_join: "/lawyers/join",
};
const ABOUT = {
  ask: "The heart of Nyaya. Switching it off stops new answers on the website (WhatsApp has its own pause in Settings).",
  check: "Straight answers to \"is this legal?\" with the law behind them.",
  notice: "Explains a legal notice from a photo or text. Free, 3 a day.",
  assist: "Suggests the key parts of an RTI or consumer complaint.",
  compare: "Two judgments side by side.",
  argument: "Both sides of a legal question, each point cited.",
  brief: "Facts, issues, holding and ratio of a judgment.",
  moot: "Argue before an AI bench and get a scorecard.",
  lawyers_join: "Advocates adding themselves to the directory.",
};
const USD_INR = 88;

// Every tool, its use and cost, and a switch that pauses it on the live site within 30 seconds.
export default function Features() {
  const [state, reload] = useLoad("/admin/features");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [override, setOverride] = useState(null);
  const list = override || state.data?.features;

  async function flip(f) {
    if (f.on && f.name === "ask" && !window.confirm("Switch off Ask Nyaya? The main question box on the website will stop answering.")) return;
    setBusy(f.name); setMsg("");
    try {
      const d = await post("/admin/features", { name: f.name, on: !f.on });
      setOverride(d.features);
      setMsg(`${f.label} is ${f.on ? "paused" : "back on"}. The site picks this up within 30 seconds.`);
    } catch (e) { setMsg(e.message); } finally { setBusy(""); }
  }

  return (
    <Loading state={state}>
      {list && (
        <>
          {msg && <p className="adm-note" role="status">{msg}</p>}
          <ul className="cr-features">
            {list.map((f) => (
              <li key={f.name} className={`cr-feature${f.on ? "" : " cr-feature--off"}`}>
                <div className="cr-feature-head">
                  <span className={`cr-light cr-light--${f.on ? "ok" : "off"}`} aria-hidden="true" />
                  <h3>{f.label}</h3>
                  <button type="button" role="switch" aria-checked={f.on} aria-label={`${f.label}: ${f.on ? "on" : "off"}`}
                    className="cr-switch" disabled={busy === f.name} onClick={() => flip(f)}><span /></button>
                </div>
                <p className="cr-muted">{ABOUT[f.name]}</p>
                <dl className="cr-feature-stats">
                  <div><dt>AI calls, 30 days</dt><dd>{num(f.calls_30d)}</dd></div>
                  <div><dt>Cost, 30 days</dt><dd>{inr(f.usd_30d * USD_INR)}</dd></div>
                </dl>
                <a className="adm-link" href={PAGE[f.name]} target="_blank" rel="noreferrer">Open the page ↗</a>
              </li>
            ))}
          </ul>
          <p className="cr-muted">A paused tool shows visitors a short "paused for a little while" note. Pages that work without AI (rights guides, templates, deadlines, the IPC↔BNS converter) are always on. <button type="button" className="adm-link" onClick={() => { setOverride(null); reload(); }}>Refresh</button></p>
        </>
      )}
    </Loading>
  );
}
