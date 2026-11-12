// Runs after `vite build`. Writes a real HTML file for every page whose content is known
// at build time (guides, rights, hubs, templates, Act sections and the fixed pages), with
// its own title, description, canonical link, structured data and readable text.
// Search engines and link previews get the content without running JavaScript; people
// get the same page, and the app takes over as soon as it loads (React replaces #root).
//
// Vercel serves these files before the catch-all rewrite to index.html, so /now/arrested
// is answered by dist/now/arrested/index.html.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { SITE, META } from "../src/routeMeta.js";
import { GUIDES, WHEN } from "../src/data/guides.js";
import { RIGHTS } from "../src/data/rights.js";
import { HUBS } from "../src/data/hubs.js";
import { TEMPLATES } from "../src/data/templates.js";
import { DEADLINES } from "../src/data/deadlines.js";
import { ACTS } from "../src/lawCodes.js";

const here = dirname(fileURLToPath(import.meta.url));
const DIST = join(here, "..", "dist");
const template = readFileSync(join(DIST, "index.html"), "utf8");
if (!template.includes('<div id="root"></div>')) {
  throw new Error("dist/index.html was already prerendered: run `vite build` first (npm run build does both).");
}
// The untouched shell answers every other URL (vercel.json rewrites to /app.html), so pages
// like /a/<id> and /cases never show the home page's prerendered text.
writeFileSync(join(DIST, "app.html"), template);
const sections = JSON.parse(readFileSync(join(here, "sections.json"), "utf8"));
const codeMap = JSON.parse(readFileSync(join(here, "..", "src", "data", "code_map.json"), "utf8"));

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const clip = (s, n = 158) => { const t = String(s || "").replace(/\s+/g, " ").trim(); return t.length > n ? `${t.slice(0, n - 1).replace(/\s+\S*$/, "")}…` : t; };
const ORG = { "@type": "Organization", "@id": `${SITE}/#org`, name: "Nyaya", url: SITE, logo: `${SITE}/apple-touch-icon.png` };
const crumbs = (items) => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: SITE + path })),
});
const lawLink = (cite) => (cite ? ` <a href="/law/${cite[0]}/${encodeURIComponent(cite[1])}">${esc(ACTS[cite[0]]?.short || cite[0])} s.${esc(cite[1])}</a>` : "");

function page(path, { title, description, body, ld = [], noindex = false }) {
  let html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*"/, `$1${esc(description)}"`)
    .replace(/(<meta property="og:title" content=")[^"]*"/, `$1${esc(title)}"`)
    .replace(/(<meta property="og:description" content=")[^"]*"/, `$1${esc(description)}"`)
    .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${SITE}${path}"`)
    .replace(/(<link rel="canonical" href=")[^"]*"/, `$1${SITE}${path}"`)
    .replace(/(<meta property="og:image:alt" content=")[^"]*"/, `$1${esc(title)}"`);
  const graph = { "@context": "https://schema.org", "@graph": [ORG, ...ld] };
  const head = `<script type="application/ld+json">${JSON.stringify(graph).replace(/</g, "\\u003c")}</script>`
    + (noindex ? '<meta name="robots" content="noindex" />' : "");
  html = html.replace("</head>", `    ${head}\n  </head>`);
  html = html.replace('<div id="root"></div>', `<div id="root"><main class="prerender">${body}<p><a href="/">Ask Nyaya a question, free</a> · Research help, not legal advice.</p></main></div>`);
  const out = path === "/" ? join(DIST, "index.html") : join(DIST, ...path.split("/").filter(Boolean).map(decodeURIComponent), "index.html");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  return 1;
}

let count = 0;

// ---------- fixed pages ----------
const SKIP = new Set(["/account", "/drafts"]); // personal or duplicate pages: the app's noindex handles them
for (const [path, [title, description]] of Object.entries(META)) {
  if (SKIP.has(path)) continue;
  const ld = path === "/"
    ? [{ "@type": "WebSite", "@id": `${SITE}/#site`, url: SITE, name: "Nyaya", description, publisher: { "@id": `${SITE}/#org` }, inLanguage: ["en-IN", "hi-IN"],
        potentialAction: { "@type": "SearchAction", target: `${SITE}/answers?q={search_term_string}`, "query-input": "required name=search_term_string" } }]
    : [{ "@type": "WebPage", name: title, description, url: SITE + path, isPartOf: { "@id": `${SITE}/#site` } }];
  let body = `<h1>${esc(title.replace(/ · Nyaya$/, ""))}</h1><p>${esc(description)}</p>`;
  if (path === "/") {
    body += "<h2>Help with a problem right now</h2><ul>"
      + GUIDES.map((g) => `<li><a href="/now/${g.slug}">${esc(g.title.en)}</a></li>`).join("") + "</ul>"
      + "<h2>Know your rights</h2><ul>" + RIGHTS.map((g) => `<li><a href="/rights/${g.slug}">${esc(g.title.en)}</a></li>`).join("") + "</ul>"
      + '<p><a href="/answers">Questions people asked</a> · <a href="/convert">IPC to BNS converter</a> · <a href="/notice">Got a legal notice?</a> · <a href="/templates">Free templates</a> · <a href="/lawyers">Find a lawyer</a></p>';
  }
  if (path === "/now") body += "<ul>" + GUIDES.map((g) => `<li><a href="/now/${g.slug}">${esc(g.title.en)}</a>: ${esc(g.lede.en)}</li>`).join("") + "</ul>";
  if (path === "/rights") body += "<ul>" + RIGHTS.map((g) => `<li><a href="/rights/${g.slug}">${esc(g.title.en)}</a>: ${esc(g.lede.en)}</li>`).join("") + "</ul>";
  if (path === "/help") body += "<ul>" + HUBS.map((h) => `<li><a href="/help/${h.slug}">${esc(h.title.en)}</a>: ${esc(h.lede.en)}</li>`).join("") + "</ul>";
  if (path === "/templates") body += "<ul>" + TEMPLATES.map((t) => `<li><a href="/templates/${t.slug}">${esc(t.title)}</a>: ${esc(t.blurb)}</li>`).join("") + "</ul>";
  if (path === "/deadlines") body += "<ul>" + DEADLINES.map((d) => `<li>${esc(d.title.en)}: ${esc(d.blurb.en)}</li>`).join("") + "</ul>";
  count += page(path, { title, description, body, ld });
}

// ---------- "do this now" guides ----------
for (const g of GUIDES) {
  const path = `/now/${g.slug}`;
  const title = `${g.title.en}: what to do now · Nyaya`;
  const groups = Object.keys(WHEN).map((w) => [w, g.steps.filter((s) => s.when === w)]).filter(([, s]) => s.length);
  const body = `<h1>${esc(g.title.en)}</h1><p>${esc(g.lede.en)}</p>`
    + (g.helplines?.length ? `<p>Helplines: ${g.helplines.map((n) => `<a href="tel:${n}">${n}</a>`).join(", ")}</p>` : "")
    + groups.map(([w, steps]) => `<h2>${esc(WHEN[w].en)}</h2><ol>${steps.map((s) => `<li>${esc(s.en)}${lawLink(s.cite)}</li>`).join("")}</ol>`).join("");
  const ld = [
    { "@type": "HowTo", name: g.title.en, description: g.lede.en, inLanguage: "en-IN",
      step: g.steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, text: s.en })) },
    crumbs([["Nyaya", "/"], ["Something just happened?", "/now"], [g.title.en, path]]),
  ];
  count += page(path, { title, description: clip(g.lede.en), body, ld });
}

// ---------- rights guides ----------
for (const g of RIGHTS) {
  const path = `/rights/${g.slug}`;
  const title = `${g.title.en}: know your rights in India · Nyaya`;
  const body = `<h1>${esc(g.title.en)}</h1><p>${esc(g.lede.en)}</p><ol>`
    + g.points.map((p) => `<li>${esc(p.en)}${lawLink(p.cite)}</li>`).join("") + "</ol>"
    + (g.help?.en ? `<p>${esc(g.help.en)}</p>` : "");
  const ld = [
    { "@type": "Article", headline: g.title.en, description: g.lede.en, inLanguage: "en-IN", author: { "@id": `${SITE}/#org` }, publisher: { "@id": `${SITE}/#org` } },
    crumbs([["Nyaya", "/"], ["Know your rights", "/rights"], [g.title.en, path]]),
  ];
  count += page(path, { title, description: clip(g.lede.en), body, ld });
}

// ---------- topic hubs ----------
for (const h of HUBS) {
  const path = `/help/${h.slug}`;
  const title = `${h.title.en}: rights, steps and free templates · Nyaya`;
  const qs = h.questions?.en || [];
  const body = `<h1>${esc(h.title.en)}</h1><p>${esc(h.lede.en)}</p>`
    + (qs.length ? `<h2>Common questions</h2><ul>${qs.map((q) => `<li>${esc(q)}</li>`).join("")}</ul>` : "")
    + `<ul>${(h.now || []).map((s) => GUIDES.find((g) => g.slug === s)).filter(Boolean).map((g) => `<li><a href="/now/${g.slug}">${esc(g.title.en)}</a></li>`).join("")}`
    + `${(h.rights || []).map((s) => RIGHTS.find((g) => g.slug === s)).filter(Boolean).map((g) => `<li><a href="/rights/${g.slug}">${esc(g.title.en)}</a></li>`).join("")}</ul>`;
  count += page(path, { title, description: clip(h.lede.en), body, ld: [crumbs([["Nyaya", "/"], ["Topic help", "/help"], [h.title.en, path]])] });
}

// ---------- templates ----------
for (const t of TEMPLATES) {
  const path = `/templates/${t.slug}`;
  const title = `Free ${t.title} template (India) · Nyaya`;
  const body = `<h1>Free ${esc(t.title)} template</h1><p>${esc(t.blurb)}</p>${t.note ? `<p>${esc(t.note)}</p>` : ""}`
    + `<p>Fill in: ${t.fields.map((f) => esc(f.label)).join(", ")}.</p>`;
  count += page(path, { title, description: clip(`${t.blurb} Fill it in online and print it. Free, no sign-in.`), body,
    ld: [crumbs([["Nyaya", "/"], ["Free templates", "/templates"], [t.title, path]])] });
}

// ---------- Act sections ----------
// Old criminal code -> new: { "ipc_s420": ["bns", "318", "Cheating"] } and the reverse.
// A new section can absorb several old ones; it links back to the closest match.
const counterpart = {};
const best = {};
for (const [code, { to, sections: map }] of Object.entries(codeMap)) {
  for (const [num, m] of Object.entries(map)) {
    if (!m.new || m.status === "none") continue;
    counterpart[`${code}_s${num}`] = [to, m.new];
    const key = `${to}_s${m.new}`;
    if (!best[key] || (m.score || 0) > best[key]) { best[key] = m.score || 0; counterpart[key] = [code, num]; }
  }
}
const sitemap = readFileSync(join(here, "..", "public", "sitemap.xml"), "utf8");
const lawPaths = [...sitemap.matchAll(/<loc>https:\/\/asknyaya\.in(\/law\/[^<]+)<\/loc>/g)].map((m) => m[1]);
for (const path of lawPaths) {
  const [, , act, rawNum] = path.split("/");
  const num = decodeURIComponent(rawNum);
  if (!/^[0-9A-Za-z-]+$/.test(num) || !ACTS[act]) continue;
  const info = ACTS[act];
  const raw = sections[`${act}_s${num}`] || {};
  const s = { ...raw, t: (raw.t || "").replace(/^\[[^\]]*\]\s*/, "") }; // drop the "[Repealed…]" note
  const unit = info.unit === "Article" ? "Article" : "Section";
  const label = `${info.short} ${unit === "Article" ? "Article" : "Section"} ${num}`;
  const heading = s.h ? `: ${s.h}` : "";
  const other = counterpart[`${act}_s${num}`];
  const otherLabel = other ? `${ACTS[other[0]]?.short} ${other[1]}` : "";
  const title = `${label}${heading}${otherLabel ? ` (${otherLabel})` : ""} · ${info.name} · Nyaya`;
  const description = clip(`${label}${heading}. ${s.t || `Read ${unit.toLowerCase()} ${num} of the ${info.name} in full`}`);
  const body = `<h1>${esc(label)}${esc(heading)}</h1><p>${esc(info.name)}</p>`
    + (s.t ? `<p>${esc(s.t)}…</p>` : "")
    + (other ? `<p>${info.replaces ? "Replaces" : "Replaced by"} <a href="/law/${other[0]}/${encodeURIComponent(other[1])}">${esc(otherLabel)}</a>${info.replacedBy ? " from 1 July 2024" : ""}.</p>` : "")
    + `<p><a href="/statutes">Browse the ${esc(info.short)}</a> · <a href="/convert">IPC ↔ BNS converter</a></p>`;
  const ld = [
    { "@type": "Legislation", name: `${info.name}, ${unit} ${num}${heading}`, legislationIdentifier: `${info.short} ${unit === "Article" ? "Art." : "s."} ${num}`,
      legislationJurisdiction: "IN", inLanguage: "en-IN", url: SITE + path },
    crumbs([["Nyaya", "/"], ["Statutes", "/statutes"], [label, path]]),
  ];
  count += page(path, { title, description, body, ld });
}

console.log(`prerender: wrote ${count} pages`);
