// Titles and descriptions for pages with fixed content. App.jsx sets them as you
// navigate; scripts/prerender.mjs writes them into each page's HTML at build time.
import { PRO_ON } from "./config.js";

export const SITE = "https://asknyaya.in";
export const DEFAULT_DESC = "Ask a question about Indian law in plain English. Nyaya reads real Supreme Court and High Court judgments and central Acts, and cites every answer.";
export const META = {
  "/": ["Nyaya: Indian law, answered with receipts", DEFAULT_DESC],
  "/argument-builder": ["Argument Builder · Nyaya", "Build both sides of a legal argument from real Indian judgments, each point cited to its source."],
  "/compare": ["Compare Cases · Nyaya", "Put two Indian judgments side by side: facts, holdings and reasoning, with citations."],
  "/statutes": ["Statute Browser · Nyaya", "Read India's central Acts section by section, with plain-English help on each provision."],
  "/account": ["My Desk · Nyaya", "Your saved answers, arguments and comparisons on Nyaya."],
  "/about": ["About Nyaya: how answers are made and checked", "Who is behind Nyaya, how it finds, reads and cites Indian judgments and Acts, how answers are checked and corrected, and where its limits are."],
  "/privacy": ["Privacy Policy · Nyaya", "How Nyaya handles your information."],
  "/terms": ["Terms of Use · Nyaya", "The terms for using Nyaya. Nyaya is a research aid, not legal advice."],
  "/pricing": PRO_ON
    ? ["Pricing · Nyaya", "Nyaya is free to use. Nyaya Pro (Rs 199 for 30 days) adds 200 questions a day, document review, drafts and case alerts."]
    : ["Pricing · Nyaya", "Nyaya is free to use. Nyaya Pro is paused for a few days."],
  "/documents": ["Explain a legal document · Nyaya", "Upload a notice, agreement, FIR or order, even a phone photo, and get it explained in plain words with the Indian law that applies."],
  "/convert": ["IPC to BNS converter: old and new criminal law sections · Nyaya", "Convert IPC to BNS, CrPC to BNSS and Evidence Act to BSA sections, both ways, and read the old and new text side by side."],
  "/rights": ["Know your rights: plain guides to Indian law · Nyaya", "Short, cited guides to your rights in India: arrest, FIR, bail, tenants, consumers, workplace and more. In English and Hindi."],
  "/templates": ["Free legal templates: RTI, police complaint, consumer complaint, legal notices · Nyaya", "Fill-in templates for an RTI application and appeal, police complaint for an FIR, consumer complaint, cheque-bounce, deposit and salary notices, legal aid application and rent agreement. Print or download as Word. Free, no sign-in."],
  "/students": ["Law student mode: case briefs, moot practice, quizzes · Nyaya", "Case briefs from real judgments, moot court practice with a questioning bench, and quizzes on the new criminal codes."],
  "/lawyers": ["Find a lawyer · Nyaya", "A directory of advocates in India who listed themselves, by city and area of practice."],
  "/lawyers/join": ["List yourself as an advocate · Nyaya", "Advocates can add a free listing to Nyaya's directory."],
  "/digest": ["This week in the Supreme Court · Nyaya", "A short weekly digest of new Supreme Court judgments, in plain words."],
  "/tools": ["All tools · Nyaya", "Every Nyaya tool in one place: ask, convert, compare, argue, draft, and more."],
  "/trending": ["What India is asking: this week's legal questions · Nyaya", "The legal questions people are asking this week, answered with the law behind them. Ask any of them free."],
  "/now": ["Something just happened? What to do now · Nyaya", "Step-by-step help for online fraud, arrest, a refused FIR, cheque bounce, road accidents, legal notices, domestic violence and more. English and Hindi."],
  "/deadlines": ["Legal deadline calculator: cheque bounce, consumer, RTI, appeals · Nyaya", "Work out the last day to send a cheque-bounce notice, file a consumer complaint, appeal an RTI, claim for an accident and more, from the law that sets it."],
  "/is-it-legal": ["Is this legal? Quick answers on Indian law · Nyaya", "Describe a situation and get a straight answer from Indian law, with the sections and judgments behind it."],
  "/notice": ["Got a legal notice? Free notice decoder · Nyaya", "Upload a photo of a legal notice, summons, FIR or court order and get what it means, how urgent it is and what to do next. Free."],
  "/help": ["Help with everyday law: tenants, consumers, RTI, women's rights · Nyaya", "Everything on one problem in one place: what to do now, your rights, deadlines and free templates."],
  "/answers": ["Questions people asked about Indian law, answered with sources · Nyaya", "Real questions about Indian law: tenants, cheques, FIRs, consumers, family and more, each answered from judgments and Acts with the sources shown."],
  "/explained": ["Legal news explained: what it means for you · Nyaya", "When a judgment or new rule makes headlines, what it actually says and what it means for you, from the law itself."],
  "/cases": ["My cases: hearing reminders and court orders explained · Nyaya", "Keep your court cases with the next hearing date, get email reminders before each hearing, and upload an order to have it explained in plain words. Free."],
  "/legal-aid": ["Free legal aid: can I get a free lawyer in India? · Nyaya", "Women, children, SC/ST, people with disabilities, industrial workers, people in custody and low-income families get a free lawyer from the State. Check if you qualify and how to apply."],
  "/how-long": ["How long will my case take? Cheque bounce, divorce, consumer, bail · Nyaya", "The time limits Indian law sets for cheque bounce, consumer, divorce, maintenance, bail, DV and civil cases, why cases take longer, and how to speed yours up."],
  "/widget": ["Free IPC to BNS lookup widget for your website · Nyaya", "Add a free IPC ↔ BNS section lookup to your blog, college, moot society or law firm website with two lines of code."],
  "/drafts": ["Draft a legal document · Nyaya", "First drafts of legal notice replies, RTI applications and consumer complaints, grounded in cited law."],
};

