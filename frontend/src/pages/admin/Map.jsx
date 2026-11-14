import { useState } from "react";
import { useLoad } from "./shared";

// A live map of what runs Nyaya. Statuses come from the same checks as the Issues page.
const NODES = {
  visitors: { x: 70, y: 150, w: 150, label: "Visitors", sub: "on the website",
    what: "People using asknyaya.in in a browser, on phones and computers.",
    flow: "They type or speak a question, open a guide, or use a tool. Every AI answer goes through the API server." },
  wausers: { x: 70, y: 400, w: 150, label: "WhatsApp users", sub: "texting the bot",
    what: "People messaging Nyaya's WhatsApp number with questions, photos, PDFs and voice notes.",
    flow: "Meta forwards each message to the API server, which answers within a few seconds." },
  website: { x: 280, y: 150, w: 160, label: "Website", sub: "Vercel", check: null,
    what: "The site itself: React pages built and hosted by Vercel. Merging code into main on GitHub publishes it automatically, in about a minute.",
    cost: "Free plan.", manage: "https://vercel.com/dashboard",
    broken: "The site won't load, but WhatsApp keeps working. Check Vercel's dashboard for a failed build." },
  meta: { x: 280, y: 400, w: 160, label: "WhatsApp (Meta)", sub: "Cloud API", check: "WhatsApp number", tab: "whatsapp",
    what: "Meta's WhatsApp Business platform. It receives messages to Nyaya's number and delivers the replies.",
    cost: "Replies within 24 hours of a user's message are free; Law of the day templates are paid marketing messages after the free tier.",
    manage: "https://business.facebook.com/wa/manage/home/",
    broken: "WhatsApp stops answering. Usually the quality rating dropped or the account needs attention in WhatsApp Manager." },
  api: { x: 500, y: 255, w: 190, h: 90, label: "API server", sub: "Google Cloud Run", check: "__api",
    what: "Nyaya's brain: a Python (FastAPI) server. It searches the law, asks Claude, applies limits and the budget cap, and stores what's needed.",
    flow: "Every question: check limits → look in the cache → search judgments and Acts → ask Claude with the best passages → save the answer for repeats.",
    cost: "Pay per use; small at this traffic.", manage: "https://console.cloud.google.com/run?project=legal-research-tool-509320",
    broken: "Everything that needs AI stops (website answers and WhatsApp). Guides, templates and the converter still work." },
  scheduler: { x: 500, y: 470, w: 190, label: "Scheduler", sub: "9:00 every morning", check: "Law of the day", tab: "whatsapp",
    what: "Google Cloud Scheduler. Every day at 9:00 India time it asks the API server to send Law of the day to subscribers.",
    cost: "Free tier.", manage: "https://console.cloud.google.com/cloudscheduler?project=legal-research-tool-509320",
    broken: "Law of the day doesn't go out. You can send it by hand from the WhatsApp section." },
  claude: { x: 770, y: 40, w: 190, label: "Claude", sub: "Anthropic API", check: "Claude API", tab: "money",
    what: "The AI that writes every answer, from the passages the search finds. It never answers from memory alone.",
    cost: "This is most of the bill. The daily cap in Settings stops spending past your limit.", manage: "https://console.anthropic.com/",
    broken: "No new answers anywhere. Cached answers still work. Check the API key and credit balance." },
  qdrant: { x: 770, y: 130, w: 190, label: "Search index", sub: "Qdrant", check: "Search index (Qdrant)",
    what: "Hundreds of thousands of passages from Supreme Court and High Court judgments and central Acts, stored so the closest ones to a question are found in milliseconds.",
    cost: "Hosted cluster.", manage: "https://cloud.qdrant.io/",
    broken: "Answers can't cite sources, so the server refuses to answer rather than guess." },
  firestore: { x: 770, y: 220, w: 190, label: "Database", sub: "Firestore", check: "Database (Firestore)",
    what: "Stores accounts, saved answers, shares, the answer cache, rate limits, daily spend, feedback, settings and this ideas board.",
    cost: "Free tier at this size.", manage: "https://console.firebase.google.com/project/legal-research-tool-509320/firestore",
    broken: "Sign-in extras, limits and the cache stop; the server keeps answering but can't remember anything." },
  auth: { x: 770, y: 310, w: 190, label: "Sign-in", sub: "Firebase Auth", check: null, tab: "users",
    what: "Google and email sign-in for the website. It also decides who can open this control room (your Google account).",
    cost: "Free.", manage: "https://console.firebase.google.com/project/legal-research-tool-509320/authentication/users",
    broken: "People can't sign in; signed-out use keeps working." },
  resend: { x: 770, y: 400, w: 190, label: "Email", sub: "Resend", check: "Email (Resend)",
    what: "Sends the weekly digest and sign-up emails.", cost: "Free tier.", manage: "https://resend.com/overview",
    broken: "Emails don't go out; nothing else is affected." },
  razorpay: { x: 770, y: 490, w: 190, label: "Payments", sub: "Cashfree", check: "Payments",
    what: "Takes payment for Nyaya Pro. Pro is paused until your Cashfree account is approved.",
    cost: "About 2% per payment.", manage: "https://merchant.cashfree.com/",
    broken: "People can't buy Pro; everything free keeps working." },
};
const EDGES = [
  ["visitors", "website"], ["website", "api"], ["wausers", "meta"], ["meta", "api"], ["scheduler", "api"],
  ["api", "claude"], ["api", "qdrant"], ["api", "firestore"], ["website", "auth"], ["api", "resend"], ["api", "razorpay"],
];
const GLOSSARY = [
  ["AI call", "One request to Claude. Each costs a little, depending on how much text goes in and out."],
  ["Token", "The unit Claude charges in: roughly three-quarters of a word. Hindi uses more tokens per word than English."],
  ["Cache", "A saved answer. If someone asks the same question again, Nyaya answers from the cache instantly and for free."],
  ["Rate limit", "How many requests one person can make per minute and per day, so no one can run up the bill."],
  ["Daily cap", "The most Nyaya will spend on AI in a day. Past it, new AI answers pause until midnight India time."],
  ["Quota", "A user's daily allowance of a tool, like 3 free notice checks a day."],
  ["Deploy", "Putting new code live. The website deploys when code is merged on GitHub; the API server when it's rebuilt on Cloud Run."],
  ["Revision", "One deployed version of the API server. Cloud Run keeps old ones, so a bad deploy can be rolled back."],
  ["Search index", "The law broken into passages and stored by meaning, so Nyaya finds the right paragraphs to cite."],
  ["Webhook", "An address Meta calls the moment a WhatsApp message arrives, so Nyaya can reply."],
  ["Template", "A message format Meta approves in advance, needed to message people who haven't written in 24 hours (Law of the day)."],
  ["Feature switch", "The on/off switches in Features. They pause a tool on the live site without a deploy."],
];

function center(n) { return { cx: n.x + n.w / 2, cy: n.y + (n.h || 54) / 2 }; }
function edgePath(a, b) {
  const A = center(NODES[a]), B = center(NODES[b]);
  const x1 = NODES[a].x + NODES[a].w, x2 = NODES[b].x;
  if (x2 > x1) { const mx = (x1 + x2) / 2; return `M${x1},${A.cy} C${mx},${A.cy} ${mx},${B.cy} ${x2},${B.cy}`; }
  return `M${A.cx},${A.cy} L${B.cx},${B.cy}`;
}

export default function SystemMap({ go }) {
  const [health] = useLoad("/admin/health");
  const [pick, setPick] = useState("api");
  const [motion] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const checks = Object.fromEntries((health.data?.checks || []).map((c) => [c.name, c]));
  const status = (n) => {
    if (n.check === "__api") return health.data ? "ok" : health.error ? "fail" : "wait";
    if (!n.check) return "ok";
    return checks[n.check]?.status || (health.loading ? "wait" : "ok");
  };
  const sel = NODES[pick];
  const selCheck = sel.check && sel.check !== "__api" ? checks[sel.check] : null;

  return (
    <>
      <div className="cr-map-wrap">
        <svg className="cr-map" viewBox="0 0 1000 560" role="group" aria-label="Map of the services that run Nyaya">
          <defs>
            <pattern id="crgrid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" className="cr-map-grid" /></pattern>
          </defs>
          <rect width="1000" height="560" fill="url(#crgrid)" />
          {EDGES.map(([a, b], i) => {
            const d = edgePath(a, b);
            const hot = pick === a || pick === b;
            return (
              <g key={`${a}-${b}`}>
                <path d={d} className={`cr-edge${hot ? " cr-edge--hot" : ""}`} />
                {motion && (
                  <circle r="3" className="cr-packet">
                    <animateMotion dur={`${2.4 + (i % 4) * 0.5}s`} repeatCount="indefinite" path={d} begin={`${(i * 0.37) % 2}s`} />
                  </circle>
                )}
              </g>
            );
          })}
          {Object.entries(NODES).map(([k, n]) => {
            const st = status(n);
            const h = n.h || 54;
            return (
              <g key={k} className={`cr-node${pick === k ? " cr-node--on" : ""} cr-node--${st}`} tabIndex={0} role="button"
                 aria-label={`${n.label}, ${st === "ok" ? "working" : st === "wait" ? "checking" : st}`} aria-pressed={pick === k}
                 onClick={() => setPick(k)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setPick(k))}>
                <rect x={n.x} y={n.y} width={n.w} height={h} rx="10" />
                <circle cx={n.x + 16} cy={n.y + 18} r="4.5" className="cr-node-dot" />
                <text x={n.x + 28} y={n.y + 22} className="cr-node-label">{n.label}</text>
                <text x={n.x + 28} y={n.y + 40} className="cr-node-sub">{n.sub}</text>
              </g>
            );
          })}
        </svg>
        <aside className="cr-map-panel" aria-live="polite">
          <p className="cr-kicker">{sel.sub}</p>
          <h3>{sel.label}</h3>
          {selCheck && <p className={`cr-status cr-status--${selCheck.status}`}><span className="cr-light" />{selCheck.status === "ok" ? "Working" : selCheck.status === "warn" ? "Needs a look" : "Not working"} · {selCheck.detail}</p>}
          <p>{sel.what}</p>
          {sel.flow && <><h4>How it flows</h4><p>{sel.flow}</p></>}
          {sel.cost && <><h4>Cost</h4><p>{sel.cost}</p></>}
          {sel.broken && <><h4>If it breaks</h4><p>{sel.broken}</p></>}
          <div className="adm-actions">
            {sel.manage && <a className="cr-btn" href={sel.manage} target="_blank" rel="noreferrer">Open its console ↗</a>}
            {sel.tab && <button type="button" className="cr-btn" onClick={() => go(sel.tab)}>See it in the dashboard</button>}
          </div>
        </aside>
      </div>

      <section className="adm-card">
        <h2>Words you'll see here</h2>
        <dl className="cr-glossary">
          {GLOSSARY.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}
        </dl>
      </section>
    </>
  );
}
