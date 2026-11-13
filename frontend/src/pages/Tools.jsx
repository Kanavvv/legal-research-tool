import { Link } from "react-router-dom";
import { PRO_ON } from "../config";
import { useSiteConfig } from "../ui/siteConfig";

const FEATURE_OF = { "/is-it-legal": "check", "/notice": "notice", "/compare": "compare", "/argument-builder": "argument" };

const GROUPS = [
  {
    title: "Ask and research",
    items: [
      { to: "/", name: "Ask Nyaya", sub: "A question in plain words, or just what happened, answered from judgments and Acts with every source cited. Type or speak, in English, Hindi or six more Indian languages." },
      { to: "/convert", name: "IPC ↔ BNS converter", sub: "Old section to new, and back, with both texts side by side." },
      { to: "/statutes", name: "Statute browser", sub: "Central Acts, section by section." },
      { to: "/compare", name: "Compare cases", sub: "Two judgments side by side: facts, holdings, reasoning." },
      { to: "/argument-builder", name: "Argument builder", sub: "Both sides of a legal question, each point cited." },
      { to: "/digest", name: "Weekly digest", sub: "The week's new Supreme Court judgments, in plain words." },
      { to: "/widget", name: "IPC ↔ BNS widget", sub: "Put a free section lookup on your blog, college or firm website with two lines of code." },
      { to: "/explained", name: "In the news, explained", sub: "Legal headlines, what the law actually says, and what it means for you." },
    ],
  },
  {
    title: "For everyone",
    items: [
      { to: "/trending", name: "What India is asking", sub: "This week's most-asked legal questions. Tap one for the answer." },
      { to: "/answers", name: "Questions people asked", sub: "Every answer listed publicly, searchable, each with its sources." },
      { to: "/cases", name: "My cases", sub: "Your court cases with the next hearing date, reminders by email, and orders explained in plain words." },
      { to: "/now", name: "Something just happened?", sub: "Online fraud, an arrest, a refused FIR, an accident: what to do now, today and this week." },
      { to: "/is-it-legal", name: "Is this legal?", sub: "Describe a situation, get a straight answer with the law behind it." },
      { to: "/notice", name: "Got a notice?", sub: "Photo of a legal notice, summons or FIR, explained: what it is, how urgent, what next. Free." },
      { to: "/legal-aid", name: "Free lawyer checker", sub: "Women, children, SC/ST, workers, people in custody and many more get a free lawyer from the State. Check in a minute, then apply." },
      { to: "/how-long", name: "How long will my case take?", sub: "Cheque bounce, consumer, divorce, maintenance, bail and more: the time the law sets, and how to speed yours up." },
      { to: "/deadlines", name: "Deadline calculator", sub: "Last days for cheque bounce, consumer, RTI, accident claims and appeals, with a calendar reminder." },
      { to: "/help", name: "Topic help", sub: "Tenants, consumers, RTI and women's rights, all in one place." },
      { to: "/rights", name: "Know your rights", sub: "Arrest, FIR, bail, tenants, consumers and more. English and Hindi." },
      { to: "/templates", name: "Free templates", sub: "RTI and RTI appeal, police complaint, consumer complaint, cheque-bounce, deposit and salary notices, legal aid, rent agreement. Print or Word." },
      PRO_ON && { to: "/documents", name: "Explain a document", sub: "Upload a notice or FIR, even a phone photo, and get it in plain words. Pro." },
      { to: "/lawyers", name: "Find a lawyer", sub: "Advocates who listed themselves, by city and practice." },
    ],
  },
  {
    title: "For law students",
    items: [
      { to: "/students?tab=brief", name: "Case briefs", sub: "Facts, issues, holding and ratio of any judgment in the index." },
      { to: "/students?tab=moot", name: "Moot practice", sub: "Argue before a bench (and, if you like, opposing counsel) that pushes back. Speak your submissions, get a scorecard, challenge a friend." },
      { to: "/students?tab=quiz", name: "Quizzes", sub: "The new codes, the Constitution and landmark cases." },
    ],
  },
];

export default function Tools() {
  const off = useSiteConfig()?.features_off || [];
  return (
    <main id="main" className="station">
      <header className="station-head">
        <h1 className="station-title">Everything <em>Nyaya does.</em></h1>
      </header>
      {GROUPS.map((g) => (
        <section key={g.title} className="tools-group">
          <h2 className="zone-title">{g.title}</h2>
          <ul className="tile-grid">
            {g.items.filter((t) => t && !off.includes(FEATURE_OF[t.to])).map((t) => (
              <li key={t.to}>
                <Link to={t.to} className="card tile">
                  <span className="tile-title">{t.name}</span>
                  <span className="tile-sub muted">{t.sub}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
