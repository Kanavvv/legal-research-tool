import { useState } from "react";
import { Link } from "react-router-dom";
import { trackEvent } from "../ui/track";

// Instructions for embedding the section lookup on another site. The snippet carries a
// plain text link under the iframe, which is what search engines count.
const code = (theme) => `<iframe src="https://asknyaya.in/embed/law${theme === "auto" ? "" : `?theme=${theme}`}" title="IPC to BNS section lookup" width="100%" height="230" style="border:0;max-width:520px" loading="lazy"></iframe>
<p style="font:13px/1.4 sans-serif;margin:4px 0 0"><a href="https://asknyaya.in/convert">IPC to BNS converter</a> by <a href="https://asknyaya.in">Nyaya</a></p>`;

export default function Widget() {
  const [theme, setTheme] = useState("auto");
  const [copied, setCopied] = useState(false);
  const snippet = code(theme);

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true); setTimeout(() => setCopied(false), 1800);
      trackEvent("widget_copy");
    } catch { /* clipboard blocked: the code is selectable below */ }
  }

  return (
    <main id="main" className="station station--narrow">
      <header className="station-head">
        <h1 className="station-title">Put an IPC ↔ BNS lookup <em>on your site.</em></h1>
        <p className="station-lede">Free for blogs, college and moot society pages, law firm and advocate websites, and coaching sites. Your readers type “IPC 420” and see the new BNS section at once. Paste two lines of code; nothing to install, no sign-up, no tracking cookies.</p>
      </header>

      <section className="card widget-preview" aria-label="Preview">
        <iframe src={`/embed/law${theme === "auto" ? "" : `?theme=${theme}`}`} title="IPC to BNS section lookup (preview)" width="100%" height="230" style={{ border: 0 }} />
      </section>

      <section className="card widget-code" aria-labelledby="widget-code-h">
        <div className="widget-code-head">
          <h2 id="widget-code-h" className="zone-title">Copy this into your page</h2>
          <div className="aid-choices" role="radiogroup" aria-label="Theme">
            {[["auto", "Match the visitor"], ["light", "Light"], ["dark", "Dark"]].map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={theme === v} className={`choice${theme === v ? " is-on" : ""}`} onClick={() => setTheme(v)}>{l}</button>
            ))}
          </div>
        </div>
        <pre className="widget-snippet"><code>{snippet}</code></pre>
        <div className="answer-actions">
          <button type="button" className="btn btn--lime btn--sm" onClick={copy}>{copied ? "Copied" : "Copy code"}</button>
        </div>
        <p className="muted">On WordPress, add a “Custom HTML” block and paste it in. On Blogger, Wix or Squarespace, use their HTML or embed block. Please keep the link line under the box: it's how people find the full converter.</p>
      </section>

      <p className="shared-note muted">Want a different tool on your site, like the <Link to="/deadlines" className="text-link">deadline calculator</Link> or <Link to="/legal-aid" className="text-link">legal aid checker</Link>? <Link to="/about" className="text-link">Tell us</Link>.</p>
    </main>
  );
}
