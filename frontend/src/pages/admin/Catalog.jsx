import { useMemo, useState } from "react";
import { PRO_ON } from "../../config";
import { useLoad } from "./shared";

// Every feature Nyaya has, in one list: what it does in plain words, who it's for,
// whether it's running, and whether each use costs money (an AI call).
// `key` links an item to its on/off switch in Features; `pro` items follow the Pro switch.
const GROUPS = [
  { name: "Ask and research", about: "The core: questions answered from real judgments and Acts.", items: [
    { name: "Ask Nyaya", what: "Type or speak a legal question in English or Hindi and get an answer with every judgment and section cited.", to: "/", who: "Everyone", ai: true, key: "ask" },
    { name: "Follow-up questions", what: "After an answer, ask a follow-up and Nyaya remembers the last few questions.", to: "/", who: "Everyone", ai: true, key: "ask" },
    { name: "Voice input and read-aloud", what: "Tap the mic to speak a question; tap the speaker to hear the answer.", to: "/", who: "Everyone" },
    { name: "Compare cases", what: "Two judgments side by side: facts, holdings, reasoning.", to: "/compare", who: "Everyone", ai: true, key: "compare" },
    { name: "Argument builder", what: "Both sides of a legal question, each point cited.", to: "/argument-builder", who: "Everyone", ai: true, key: "argument" },
    { name: "Statute browser", what: "Central Acts, section by section, with plain headings.", to: "/statutes", who: "Everyone" },
    { name: "Section pages", what: "One page per section (e.g. BNS 103) with its text and the leading judgments. Good for Google.", to: "/statutes", who: "Everyone" },
    { name: "IPC ↔ BNS converter", what: "Old section to new and back, with both texts side by side.", to: "/convert", who: "Everyone" },
    { name: "Weekly digest", what: "The week's new Supreme Court judgments in plain words, made automatically each week.", to: "/digest", who: "Everyone", ai: true },
    { name: "Save to folders", what: "Keep answers grouped by matter on your desk.", to: "/account", who: "Signed-in people" },
    { name: "Export to Word", what: "Download any answer as a Word file with its sources.", to: "/", who: "Everyone" },
  ] },
  { name: "Everyday help", about: "For ordinary people with a real problem today.", items: [
    { name: "Something just happened?", what: "Step-by-step guides for fraud, arrest, a refused FIR, accidents, notices and more: what to do now, today, this week.", to: "/now", who: "Everyone" },
    { name: "Is this legal?", what: "Describe a situation and get a straight legal / illegal / it depends answer with the law behind it.", to: "/is-it-legal", who: "Everyone", ai: true, key: "check" },
    { name: "Notice decoder", what: "Photo or text of a legal notice, summons or FIR, explained: what it is, how urgent, what to do. 3 a day.", to: "/notice", who: "Everyone", ai: true, key: "notice" },
    { name: "Deadline calculator", what: "Last day to act for cheque bounce, consumer cases, RTI, accident claims and appeals, with a calendar reminder.", to: "/deadlines", who: "Everyone" },
    { name: "Topic help pages", what: "Everything on one problem in one place: tenants, consumers, RTI, women's safety.", to: "/help", who: "Everyone" },
    { name: "Know your rights", what: "Short, cited guides: arrest, FIR, bail, tenants, consumers and more. English and Hindi.", to: "/rights", who: "Everyone" },
    { name: "Free templates", what: "RTI, consumer complaint, cheque-bounce notice, rent agreement. Fill in and download.", to: "/templates", who: "Everyone" },
    { name: "Template help", what: "\"Help me fill this\" on the RTI and consumer templates: suggests the key parts.", to: "/templates/rti-application", who: "Everyone", ai: true, key: "assist" },
    { name: "Find a lawyer", what: "Advocates who listed themselves, by city and practice. You approve each one in Lawyers.", to: "/lawyers", who: "Everyone" },
    { name: "Lawyer sign-ups", what: "Advocates add themselves to the directory; they wait for your approval.", to: "/lawyers/join", who: "Lawyers", key: "lawyers_join" },
  ] },
  { name: "Students", about: "Law students and moot practice.", items: [
    { name: "Case briefs", what: "Facts, issues, holding and ratio of any judgment in the index.", to: "/students?tab=brief", who: "Students", ai: true, key: "brief" },
    { name: "Moot practice", what: "Argue before an AI bench that asks hard questions, then get a scorecard.", to: "/students?tab=moot", who: "Students", ai: true, key: "moot" },
    { name: "Quizzes", what: "The new criminal codes, the Constitution and landmark cases.", to: "/students?tab=quiz", who: "Students" },
    { name: "Games on the home page", what: "Legal trivia, Latin maxims match and Guess the verdict, while an answer loads.", to: "/", who: "Everyone" },
    { name: "On this day", what: "A landmark judgment from this date in history, on the home page.", to: "/", who: "Everyone" },
  ] },
  { name: "Sharing and growth", about: "How people bring other people to Nyaya. New in Batch 4.", items: [
    { name: "Share links", what: "Any answer becomes a link anyone can open. The person who made it can let Google list it.", to: "/", who: "Everyone" },
    { name: "Send on WhatsApp", what: "One tap sends an answer, a guide or an Is this legal? result to a friend on WhatsApp.", to: "/", who: "Everyone", since: "Batch 4" },
    { name: "Answer pictures", what: "Saves an answer as a ready-to-post picture (Instagram size) with the Nyaya brand.", to: "/", who: "Everyone", since: "Batch 4" },
    { name: "What India is asking", what: "A public page of this week's questions. You pick them in Trending page.", to: "/trending", who: "Everyone", since: "Batch 4", admin: "trending" },
    { name: "Visitor counts", what: "Visits, pages, where people came from and shares, from visitors who allowed counting. See Visitors.", who: "You only", since: "Batch 4", admin: "visitors" },
    { name: "Newsletter sign-up", what: "Email box in the footer for updates.", to: "/", who: "Everyone" },
  ] },
  { name: "WhatsApp bot", about: "+91 91364 23655. Answers in English or Hindi, 10 questions per person a day.", items: [
    { name: "Answers questions", what: "Text a legal question, get a short cited answer back.", who: "Everyone on WhatsApp", ai: true, admin: "whatsapp" },
    { name: "Photos and PDFs", what: "Send a photo or PDF of a notice or document; it's explained, then deleted.", who: "Everyone on WhatsApp", ai: true, admin: "whatsapp" },
    { name: "Voice notes", what: "Send a voice note instead of typing.", who: "Everyone on WhatsApp", ai: true, admin: "whatsapp" },
    { name: "Law of the day", what: "One short legal fact each morning at 9:00 to people who said \"daily\". Waits on Meta's template approval.", who: "Subscribers", admin: "whatsapp" },
    { name: "Your \"admin\" command", what: "Text admin from your linked phone for today's numbers and a 10-minute link here.", who: "You only", admin: "whatsapp" },
  ] },
  { name: "Accounts and money", about: "Sign-in, the desk, and the paid plan (paused).", items: [
    { name: "Google sign-in and My desk", what: "Recent questions, saved cases, folders and alerts in one place.", to: "/account", who: "Signed-in people" },
    { name: "Pro plan and payments", what: "₹199 a month through Razorpay. Paused until your own Razorpay account is ready.", to: "/pricing", who: "Paying users", pro: true },
    { name: "Explain a document", what: "Upload a notice, agreement or FIR and get it in plain words.", to: "/documents", who: "Pro users", ai: true, pro: true },
    { name: "Drafts", what: "First drafts of letters and notices, grounded in cited law.", to: "/drafts", who: "Pro users", ai: true, pro: true },
    { name: "Case alerts", what: "Weekly email when new judgments match a topic you follow.", to: "/account", who: "Pro users", pro: true },
  ] },
  { name: "Behind the scenes", about: "Things visitors don't see that keep Nyaya safe and cheap.", items: [
    { name: "Daily spending cap", what: "AI answers stop for the day once spend reaches the cap; cached answers keep working. Change it in Settings.", who: "Automatic", admin: "settings" },
    { name: "Answer cache", what: "The same question asked again is answered from memory, free.", who: "Automatic" },
    { name: "Rate limits", what: "Stops any one person or bot from flooding the site.", who: "Automatic" },
    { name: "Safety checks", what: "Emergency helplines shown first when a question mentions danger, violence or self-harm.", who: "Automatic" },
    { name: "Site banner", what: "A message across the top of every page. Set it in Settings.", who: "Everyone", admin: "settings" },
    { name: "Consent banner", what: "Asks visitors before counting visits.", who: "Everyone" },
    { name: "Google sitemaps", what: "Tells Google about every guide, section page and public answer.", who: "Automatic" },
    { name: "Control room", what: "This dashboard. Hidden from everyone else.", who: "You only" },
  ] },
];

const FILTERS = [["all", "Everything"], ["on", "Running"], ["off", "Paused"], ["ai", "Costs per use"], ["new", "New"]];

export default function Catalog({ go }) {
  const [state] = useLoad("/admin/features");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const switches = useMemo(() => Object.fromEntries((state.data?.features || []).map((f) => [f.name, f.on])), [state.data]);

  const status = (it) => {
    if (it.pro) return PRO_ON ? ["on", "Running"] : ["off", "Paused with Pro"];
    if (it.key && switches[it.key] === false) return ["off", "Paused"];
    return ["on", "Running"];
  };
  const all = GROUPS.flatMap((g) => g.items);
  const running = all.filter((it) => status(it)[0] === "on").length;
  const needle = q.trim().toLowerCase();
  const keep = (it) => {
    if (needle && !`${it.name} ${it.what} ${it.who}`.toLowerCase().includes(needle)) return false;
    if (filter === "on" || filter === "off") return status(it)[0] === filter;
    if (filter === "ai") return it.ai;
    if (filter === "new") return Boolean(it.since);
    return true;
  };

  return (
    <>
      <div className="adm-tiles">
        <div className="adm-tile"><span className="adm-tile-label">Features</span><span className="adm-tile-value">{all.length}</span><span className="adm-tile-note">in {GROUPS.length} groups</span></div>
        <div className="adm-tile"><span className="adm-tile-label">Running</span><span className="adm-tile-value">{running}</span><span className="adm-tile-note">working on the site now</span></div>
        <div className="adm-tile"><span className="adm-tile-label">Paused</span><span className="adm-tile-value">{all.length - running}</span><span className="adm-tile-note">switched off or waiting on Pro</span></div>
        <div className="adm-tile"><span className="adm-tile-label">Cost money per use</span><span className="adm-tile-value">{all.filter((x) => x.ai).length}</span><span className="adm-tile-note">each use is an AI call</span></div>
      </div>

      <div className="cr-toolbar">
        <input className="adm-input cr-cat-search" type="search" placeholder="Find a feature…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find a feature" />
        <div className="cr-seg" role="group" aria-label="Show">
          {FILTERS.map(([k, l]) => <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>)}
        </div>
      </div>

      {GROUPS.map((g) => {
        const items = g.items.filter(keep);
        if (!items.length) return null;
        return (
          <section key={g.name} className="adm-card cr-cat">
            <header className="cr-cat-head"><h2>{g.name}</h2><span className="cr-count">{items.length}</span><p className="cr-muted">{g.about}</p></header>
            <ul className="cr-cat-list">
              {items.map((it) => {
                const [s, label] = status(it);
                return (
                  <li key={it.name} className={`cr-cat-item${s === "off" ? " cr-cat-item--off" : ""}`}>
                    <span className={`cr-light cr-light--${s === "on" ? "ok" : "off"}`} aria-hidden="true" />
                    <div className="cr-cat-body">
                      <div className="cr-cat-title">
                        <strong>{it.name}</strong>
                        <span className={`cr-tag ${s === "on" ? "cr-tag--ok" : "cr-tag--bad"}`}>{label}</span>
                        {it.ai && <span className="cr-tag cr-tag--dim">costs per use</span>}
                        {it.since && <span className="cr-tag">new · {it.since}</span>}
                      </div>
                      <p className="cr-muted">{it.what}</p>
                      <p className="cr-cat-meta">
                        <span>For: {it.who}</span>
                        {it.to && <a className="adm-link" href={it.to} target="_blank" rel="noreferrer">Open ↗</a>}
                        {it.key && <button type="button" className="adm-link" onClick={() => go("features")}>On/off switch</button>}
                        {it.admin && <button type="button" className="adm-link" onClick={() => go(it.admin)}>Manage</button>}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {GROUPS.every((g) => !g.items.some(keep)) && <p className="cr-muted">Nothing matches.</p>}
    </>
  );
}
