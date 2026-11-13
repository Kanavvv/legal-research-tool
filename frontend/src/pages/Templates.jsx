import { useEffect, useMemo, useState } from "react";
import { API_URL, apiFetch, responseError } from "../api";
import { useFeatureOn } from "../ui/siteConfig";
import { Link, useParams } from "react-router-dom";
import { TEMPLATES, findTemplate } from "../data/templates";
import { setPageMeta } from "../ui/meta";
import NotFound from "./NotFound";
import { trackEvent } from "../ui/track";

const STORE = "nyaya-template-";
const CREDIT = "Prepared free with Nyaya · asknyaya.in/templates";

function load(slug) {
  try { return JSON.parse(localStorage.getItem(STORE + slug)) || {}; } catch { return {}; }
}

function Field({ f, value, onChange }) {
  const id = `tpl-${f.id}`;
  if (f.type === "checkbox") {
    return (
      <label className="tpl-check" htmlFor={id}>
        <input id={id} type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
        <span>{f.label}</span>
      </label>
    );
  }
  return (
    <div className="field">
      <label htmlFor={id}>{f.label}{f.required && <span aria-hidden="true"> *</span>}</label>
      {f.type === "select" ? (
        <select id={id} className="field-input" value={value || ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">Choose…</option>
          {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : f.type === "textarea" ? (
        <textarea id={id} className="field-input" rows={f.rows || 3} value={value || ""} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} type={f.type || "text"} value={value || ""} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

// "Help me fill this": describe the problem and Nyaya suggests the key fields.
const ASSIST = {
  "rti-application": {
    kind: "rti", ph: "e.g. I applied for a property tax refund in March 2024 at the MCD South Zone office and have heard nothing since.",
    map: (o) => ({ pio: o.pio, questions: o.questions, period: o.period }),
  },
  "consumer-complaint": {
    kind: "consumer", ph: "e.g. I bought a fridge from XYZ Electronics in June for Rs 32,000. It stopped cooling in August and they refuse to repair it under warranty.",
    map: (o) => ({ opp: o.opposite_party, product: o.product, facts: [o.facts, o.deficiency].filter(Boolean).join("\n"), relief: o.relief }),
  },
};

function Assist({ cfg, onFill }) {
  const [open, setOpen] = useState(false);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tips, setTips] = useState([]);

  async function run() {
    if (problem.trim().length < 15) { setError("Describe the problem in a sentence or two."); return; }
    setBusy(true); setError("");
    try {
      const res = await apiFetch(`${API_URL}/assist`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: cfg.kind, problem: problem.trim() }),
      });
      if (!res.ok) throw await responseError(res);
      const out = await res.json();
      const fill = Object.fromEntries(Object.entries(cfg.map(out)).filter(([, v]) => v && String(v).trim()));
      onFill(fill);
      setTips([...(out.commission ? [out.commission] : []), ...(out.tips || [])]);
    } catch (e) {
      setError(e.userMessage || "Couldn't help with that right now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return <button type="button" className="btn btn--lime btn--sm tpl-assist-open" onClick={() => setOpen(true)}>Help me fill this</button>;
  return (
    <div className="tpl-assist">
      <label htmlFor="tpl-assist-q">What happened? Nyaya will suggest the key parts. You check and edit them.</label>
      <textarea id="tpl-assist-q" rows={3} maxLength={1500} value={problem} placeholder={cfg.ph} onChange={(e) => setProblem(e.target.value)} />
      <div className="doc-submit">
        <button type="button" className="btn btn--lime btn--sm" onClick={run} disabled={busy}>{busy ? "Working…" : "Suggest"}</button>
        <p className="mono muted">Only this description is sent to Nyaya.</p>
      </div>
      {error && <div className="alert" role="alert">{error}</div>}
      {tips.length > 0 && <ul className="tpl-assist-tips">{tips.map((x) => <li key={x}>{x}</li>)}</ul>}
    </div>
  );
}

function Filler({ tpl }) {
  const [values, setValues] = useState(() => load(tpl.slug));
  const [copied, setCopied] = useState(false);
  const [credit, setCredit] = useState(() => { try { return localStorage.getItem("nyaya-template-credit") !== "0"; } catch { return true; } });
  const text = useMemo(() => tpl.render(values), [tpl, values]);

  useEffect(() => {
    try { localStorage.setItem(STORE + tpl.slug, JSON.stringify(values)); } catch { /* storage off */ }
  }, [tpl.slug, values]);

  const assistOn = useFeatureOn("assist");
  const set = (id) => (val) => setValues((prev) => ({ ...prev, [id]: val }));

  async function copy() {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked */ }
  }

  function toggleCredit(on) {
    setCredit(on);
    try { localStorage.setItem("nyaya-template-credit", on ? "1" : "0"); } catch { /* storage off */ }
  }

  // A real Word file, so people can edit it before printing. Loaded only when asked for.
  async function word() {
    const { Document, Packer, Paragraph, TextRun } = await import("docx");
    const para = (line, opts = {}) => new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: line, font: "Times New Roman", size: 24, ...opts })] });
    const body = text.split("\n").map((line) => para(line));
    if (credit) body.push(para(""), para(CREDIT, { size: 16, color: "888888" }));
    const doc = new Document({ sections: [{ properties: { page: { margin: { top: 1250, bottom: 1250, left: 1250, right: 1250 } } }, children: body }] });
    const blob = await Packer.toBlob(doc);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${tpl.slug}.docx`;
    a.click();
    URL.revokeObjectURL(a.href);
    trackEvent("template_word");
  }

  function download() {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${tpl.slug}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function print() {
    const w = window.open("", "_blank");
    if (!w) return;
    const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const foot = credit ? `<p class="credit">${CREDIT}</p>` : "";
    w.document.write(`<!doctype html><title>${tpl.title}</title><style>body{font:12pt/1.6 "Times New Roman",serif;margin:2.2cm}.doc{white-space:pre-wrap}.credit{margin-top:2em;font:8pt/1.4 Arial,sans-serif;color:#888}</style><body><div class="doc">${esc}</div>${foot}`);
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <div className="tpl-layout">
      <form className="card tpl-form" onSubmit={(e) => e.preventDefault()}>
        {assistOn && ASSIST[tpl.slug] && <Assist cfg={ASSIST[tpl.slug]} onFill={(fill) => setValues((prev) => ({ ...prev, ...fill }))} />}
        {tpl.fields.map((f) => <Field key={f.id} f={f} value={values[f.id]} onChange={set(f.id)} />)}
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setValues({})}>Clear the form</button>
        <p className="mono muted tpl-private">Saved only in this browser. What you type in the form is never sent to Nyaya.</p>
      </form>
      <section className="tpl-preview" aria-label="Your document">
        <div className="answer-actions">
          <button type="button" className="btn btn--lime btn--sm" onClick={print}>Print or save as PDF</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={copy}>{copied ? "Copied" : "Copy text"}</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={word}>Download Word</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={download}>Download .txt</button>
        </div>
        <label className="tpl-check tpl-credit">
          <input type="checkbox" checked={credit} onChange={(e) => toggleCredit(e.target.checked)} />
          <span>Add a small “Prepared free with Nyaya” line at the bottom</span>
        </label>
        <pre className="card tpl-doc">{text}</pre>
      </section>
    </div>
  );
}

export default function Templates() {
  const { slug } = useParams();
  const tpl = slug ? findTemplate(slug) : null;

  useEffect(() => {
    if (tpl) setPageMeta({ title: `Free ${/^[A-Z][a-z]/.test(tpl.title) ? tpl.title[0].toLowerCase() + tpl.title.slice(1) : tpl.title} template · Nyaya`, description: tpl.blurb, path: `/templates/${tpl.slug}` });
  }, [tpl]);

  if (slug && !tpl) return <NotFound />;

  return (
    <main id="main" className="station">
      <header className="station-head">
        {tpl ? (
          <>
            <p className="mono muted"><Link to="/templates" className="text-link">Templates</Link></p>
            <h1 className="station-title"><em>{tpl.title}</em></h1>
            <p className="station-lede">{tpl.blurb}</p>
          </>
        ) : (
          <>
            <h1 className="station-title">Fill in, <em>print, send.</em></h1>
            <p className="station-lede">Free templates for the documents people need most. Fill the form and the document writes itself. No sign-in, and nothing leaves your browser.</p>
          </>
        )}
      </header>

      {tpl ? (
        <>
          <div className="card code-switch"><p>{tpl.note}{tpl.rights && <> <Link to={`/rights/${tpl.rights}`} className="text-link">Read the guide</Link>.</>}</p></div>
          <Filler key={tpl.slug} tpl={tpl} />
          <p className="shared-note muted">A template is a starting point, not legal advice. For anything with a lot at stake, have a lawyer read it. Need something custom? <Link to="/drafts" className="text-link">Nyaya Pro drafts from your facts</Link>.</p>
        </>
      ) : (
        <ul className="tile-grid">
          {TEMPLATES.map((x) => (
            <li key={x.slug}>
              <Link to={`/templates/${x.slug}`} className="card tile">
                <span className="tile-title">{x.title}</span>
                <span className="tile-sub muted">{x.blurb}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
