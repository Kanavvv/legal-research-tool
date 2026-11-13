import { useEffect, useState } from "react";
import { backward, forward, isOldCode } from "../codeMap";
import { ACTS, parseCodeQuery } from "../lawCodes";
import { trackEvent } from "../ui/track";

// The section lookup other sites embed (asknyaya.in/embed/law, set up from /widget).
// No site chrome, no sign-in, no cookies of its own; every link opens Nyaya in a new tab.
// ?theme=dark|light forces a theme; otherwise it follows the visitor's system setting.

const SITE = "https://asknyaya.in";
const EXAMPLES = ["IPC 420", "CrPC 438", "BNS 103", "IPC 498A"];

function lookup(q) {
  const p = parseCodeQuery(q);
  if (!p) return { kind: "help" };
  if (isOldCode(p.code)) {
    const f = forward(p.code, p.num);
    if (!f || f.status === "none") return { kind: "missing", p };
    return { kind: "forward", p, f };
  }
  const b = backward(p.code, p.num);
  return b.length ? { kind: "backward", p, b } : { kind: "missing", p };
}

const link = (act, num) => `${SITE}/law/${act}/${encodeURIComponent(num)}?utm_source=embed`;

export default function Embed() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState(null);
  const theme = new URLSearchParams(window.location.search).get("theme");

  useEffect(() => {
    document.documentElement.classList.add("embed-doc");
    trackEvent("embed_view");
    return () => document.documentElement.classList.remove("embed-doc");
  }, []);

  function go(e, value = q) {
    e?.preventDefault();
    if (!value.trim()) return;
    setQ(value);
    setRes(lookup(value));
    trackEvent("embed_lookup");
  }

  return (
    <div className={`embed${theme ? ` embed--${theme === "dark" ? "dark" : "light"}` : ""}`}>
      <form className="embed-form" onSubmit={go} role="search">
        <label htmlFor="embed-q" className="embed-label">IPC ↔ BNS section lookup</label>
        <div className="embed-row">
          <input id="embed-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="IPC 420, CrPC 438, BNS 103…" maxLength={40} autoComplete="off" />
          <button type="submit">Look up</button>
        </div>
      </form>

      <div className="embed-out" aria-live="polite">
        {!res && (
          <p className="embed-muted">Try {EXAMPLES.map((x, i) => (
            <span key={x}>{i ? ", " : ""}<button type="button" className="embed-ex" onClick={() => go(null, x)}>{x}</button></span>
          ))}</p>
        )}
        {res?.kind === "help" && <p className="embed-muted">Type a code and a number, like “IPC 302” or “BNSS 482”.</p>}
        {res?.kind === "missing" && <p className="embed-muted">No match for {ACTS[res.p.code].short} {res.p.num}. <a href={`${SITE}/convert?utm_source=embed`} target="_blank" rel="noopener">Open the full converter</a>.</p>}
        {res?.kind === "forward" && (
          <p>
            <a href={link(res.p.code, res.p.num)} target="_blank" rel="noopener"><strong>{ACTS[res.p.code].short} {res.p.num}</strong></a>
            {res.f.heading ? ` (${res.f.heading})` : ""} is now{" "}
            <a href={link(res.f.to, res.f.new)} target="_blank" rel="noopener"><strong>{ACTS[res.f.to].short} {res.f.new}{res.f.sub ? `(${res.f.sub})` : ""}</strong></a>
            {res.f.new_heading ? `: ${res.f.new_heading}` : ""}.
            {res.f.status === "close" && <span className="embed-muted"> Closest match; read both.</span>}
          </p>
        )}
        {res?.kind === "backward" && (
          <p>
            <a href={link(res.p.code, res.p.num)} target="_blank" rel="noopener"><strong>{ACTS[res.p.code].short} {res.p.num}</strong></a> replaced{" "}
            {res.b.slice(0, 3).map((o, i) => (
              <span key={`${o.code}${o.num}`}>{i ? ", " : ""}<a href={link(o.code, o.num)} target="_blank" rel="noopener">{ACTS[o.code].short} {o.num}</a>{o.heading ? ` (${o.heading})` : ""}</span>
            ))}.
          </p>
        )}
      </div>

      <p className="embed-foot">
        <a href={`${SITE}/?utm_source=embed`} target="_blank" rel="noopener">Nyaya</a> · free Indian law research · <a href={`${SITE}/widget?utm_source=embed`} target="_blank" rel="noopener">Add to your site</a>
      </p>
    </div>
  );
}
