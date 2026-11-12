import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { API_URL } from "../api";
import { ACTS, parseCodeQuery, sectionPath } from "../lawCodes";
import { forward, backward, isOldCode } from "../codeMap";

const EXAMPLES = ["IPC 420", "IPC 498A", "CrPC 438", "IPC 302", "BNS 318", "Evidence 65B", "CrPC 154", "BNSS 482"];

function useSection(caseId) {
  const [s, setS] = useState(null);
  useEffect(() => {
    if (!caseId) return;
    let live = true;
    fetch(`${API_URL}/statutes/${encodeURIComponent(caseId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => live && setS(d))
      .catch(() => live && setS(null));
    return () => { live = false; setS(null); };
  }, [caseId]);
  return s;
}

function Side({ code, num, sub, tone }) {
  const s = useSection(code && num ? `${code}_s${num}` : null);
  if (!code) return null;
  return (
    <article className={`card answer statute convert-side convert-side--${tone}`}>
      <p className="statute-where">{ACTS[code].name}</p>
      <h2><Link to={sectionPath(code, num)} className="text-link">{ACTS[code].short} s.{num}{sub ? `(${sub})` : ""}</Link>{s ? `: ${s.heading}` : ""}</h2>
      {s ? s.text.split("\n\n").slice(0, 6).map((p, i) => <p key={i}>{p}</p>) : <p className="muted">Loading the text…</p>}
    </article>
  );
}

// IPC <-> BNS, CrPC <-> BNSS, Evidence Act <-> BSA, both ways, with both texts side by side.
export default function Convert() {
  const [params, setParams] = useSearchParams();
  const [input, setInput] = useState(params.get("q") || "");
  const q = params.get("q") || "";
  const parsed = useMemo(() => parseCodeQuery(q), [q]);

  useEffect(() => {
    document.title = "IPC to BNS converter: old and new criminal law sections · Nyaya";
  }, []);

  let result = null;
  if (parsed && isOldCode(parsed.code)) {
    const f = forward(parsed.code, parsed.num);
    result = f ? { kind: "forward", f } : { kind: "missing" };
  } else if (parsed && ["bns", "bnss", "bsa"].includes(parsed.code)) {
    const b = backward(parsed.code, parsed.num);
    result = b.length ? { kind: "backward", b } : { kind: "missing" };
  } else if (q) {
    result = { kind: "unparsed" };
  }

  function submit(e) {
    e.preventDefault();
    setParams(input.trim() ? { q: input.trim() } : {});
  }

  return (
    <main id="main" className="station">
      <header className="station-head">
        <h1 className="station-title">Old section, <em>new section.</em></h1>
        <p className="station-lede">IPC ↔ BNS, CrPC ↔ BNSS, Evidence Act ↔ BSA. Type a section, see what replaced it, and read both texts side by side.</p>
      </header>

      <form className="ask" onSubmit={submit} role="search">
        <label className="sr-only" htmlFor="convert-q">Section to convert</label>
        <div className="ask-row">
          <input id="convert-q" type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="IPC 420, CrPC 438, BNS 318…" autoComplete="off" />
          <button type="submit" className="btn btn--lime">Convert</button>
        </div>
        <div className="ask-tools">
          {EXAMPLES.map((x) => (
            <button key={x} type="button" className="btn btn--ghost btn--sm" onClick={() => { setInput(x); setParams({ q: x }); }}>{x}</button>
          ))}
        </div>
      </form>

      {result?.kind === "unparsed" && <div className="alert" role="alert">Try a code and a number, like "IPC 420" or "BNSS 482".</div>}
      {result?.kind === "missing" && <div className="alert" role="alert">Nyaya doesn't have {ACTS[parsed.code].short} s.{parsed.num}. Check the number.</div>}

      {result?.kind === "forward" && (
        <>
          <div className={`card code-switch code-switch--${result.f.status}`}>
            {result.f.status === "none" ? (
              <p><b>{ACTS[result.f.from].short} s.{result.f.num} has no direct counterpart in the {ACTS[result.f.to].short}.</b> {result.f.note || "The closest text is shown, as a pointer only."}</p>
            ) : (
              <p>
                <b>{ACTS[result.f.from].short} s.{result.f.num}</b> → <b>{ACTS[result.f.to].short} s.{result.f.new}{result.f.sub ? `(${result.f.sub})` : ""}</b>
                {result.f.status === "close" ? <span className="muted">. Closest match by wording: read both before relying on it.</span> : <span className="muted">. Wording carried over.</span>}
                <br /><span className="muted">The old section still applies to offences and proceedings from before 1 July 2024.</span>
              </p>
            )}
          </div>
          <div className="convert-pair">
            <Side code={result.f.from} num={result.f.num} tone="old" />
            {result.f.status !== "none" && <Side code={result.f.to} num={result.f.new} sub={result.f.sub} tone="new" />}
          </div>
        </>
      )}

      {result?.kind === "backward" && (
        <>
          <div className="card code-switch code-switch--match">
            <p>
              <b>{ACTS[parsed.code].short} s.{parsed.num}</b> replaces{" "}
              {result.b.map((o, i) => (
                <span key={o.code + o.num}>{i > 0 && ", "}<b>{ACTS[o.code].short} s.{o.num}</b>{o.status === "close" && <span className="muted"> (closest)</span>}</span>
              ))}
              .
            </p>
          </div>
          <div className="convert-pair">
            <Side code={parsed.code} num={parsed.num} tone="new" />
            <Side code={result.b[0].code} num={result.b[0].num} tone="old" />
          </div>
        </>
      )}

      <p className="shared-note muted">Matches come from comparing the section texts, and are checked against known pairs. A "closest" match means the wording changed; read both. Research help, not legal advice.</p>
    </main>
  );
}
