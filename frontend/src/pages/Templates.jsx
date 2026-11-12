import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { TEMPLATES, findTemplate } from "../data/templates";
import { setPageMeta } from "../ui/meta";
import NotFound from "./NotFound";

const STORE = "nyaya-template-";

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
      {f.type === "textarea" ? (
        <textarea id={id} className="field-input" rows={f.rows || 3} value={value || ""} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} type={f.type || "text"} value={value || ""} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function Filler({ tpl }) {
  const [values, setValues] = useState(() => load(tpl.slug));
  const [copied, setCopied] = useState(false);
  const text = useMemo(() => tpl.render(values), [tpl, values]);

  useEffect(() => {
    try { localStorage.setItem(STORE + tpl.slug, JSON.stringify(values)); } catch { /* storage off */ }
  }, [tpl.slug, values]);

  const set = (id) => (val) => setValues((prev) => ({ ...prev, [id]: val }));

  async function copy() {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked */ }
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
    w.document.write(`<!doctype html><title>${tpl.title}</title><style>body{font:12pt/1.6 "Times New Roman",serif;margin:2.2cm;white-space:pre-wrap}</style><body>${esc}`);
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <div className="tpl-layout">
      <form className="card tpl-form" onSubmit={(e) => e.preventDefault()}>
        {tpl.fields.map((f) => <Field key={f.id} f={f} value={values[f.id]} onChange={set(f.id)} />)}
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setValues({})}>Clear the form</button>
        <p className="mono muted tpl-private">Saved only in this browser. Nothing you type is sent to Nyaya.</p>
      </form>
      <section className="tpl-preview" aria-label="Your document">
        <div className="answer-actions">
          <button type="button" className="btn btn--lime btn--sm" onClick={print}>Print or save as PDF</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={copy}>{copied ? "Copied" : "Copy text"}</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={download}>Download .txt</button>
        </div>
        <pre className="card tpl-doc">{text}</pre>
      </section>
    </div>
  );
}

export default function Templates() {
  const { slug } = useParams();
  const tpl = slug ? findTemplate(slug) : null;

  useEffect(() => {
    if (tpl) setPageMeta({ title: `Free ${tpl.title} template · Nyaya`, description: tpl.blurb, path: `/templates/${tpl.slug}` });
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
