import { useState } from "react";
import { Link } from "react-router-dom";
import { API_URL, apiFetch, getLang, pageLang, responseError } from "../api";
import { GUIDES } from "../data/guides";
import { RIGHTS } from "../data/rights";
import { TEMPLATES } from "../data/templates";
import { DEADLINES } from "../data/deadlines";
import { HUBS } from "../data/hubs";
import MicButton from "./MicButton";
import { trackEvent } from "./track";

// "What happened?": the front door for people who arrive with a problem, not a question.
// The server reads the situation and picks from Nyaya's own guides, templates and
// calculators; this draws the plan from the local copies of those pages.

const UI = {
  en: {
    label: "What happened?", placeholder: "My landlord won't return my ₹40,000 deposit and stopped answering calls.",
    go: "Get help", busy: "Reading…", short: "Tell us a little more about what happened.",
    failed: "Couldn't read that right now. Please try again.",
    urgency: { emergency: "Act right now", urgent: "Urgent: act in the next few days", soon: "Act in the coming weeks", none: "No rush" },
    first: "Do this first", next: "Where to go next", full: "Get the full answer, with the law",
    lawyer: "Find an advocate for this", note: "Take this to a lawyer", copied: "Copied",
    help: "If you or someone else needs help right now",
    kinds: { guide: "Step by step", rights: "Your rights", template: "Free template", deadline: "Your deadline", hub: "Everything on this", notice: "Explain your notice or document" },
    again: "Start over", fine: "Research help, not legal advice.",
  },
  hi: {
    label: "क्या हुआ?", placeholder: "मकान मालिक मेरा ₹40,000 का डिपॉज़िट नहीं लौटा रहा और फ़ोन भी नहीं उठाता।",
    go: "मदद लें", busy: "पढ़ रहे हैं…", short: "थोड़ा और बताइए कि क्या हुआ।",
    failed: "अभी नहीं पढ़ सके। फिर कोशिश करें।",
    urgency: { emergency: "अभी कदम उठाएँ", urgent: "ज़रूरी: अगले कुछ दिनों में कदम उठाएँ", soon: "आने वाले हफ़्तों में कदम उठाएँ", none: "कोई जल्दी नहीं" },
    first: "सबसे पहले यह करें", next: "आगे कहाँ जाएँ", full: "क़ानून के साथ पूरा जवाब देखें",
    lawyer: "इसके लिए वकील खोजें", note: "वकील के लिए सारांश", copied: "कॉपी हो गया",
    help: "अगर आपको या किसी और को अभी मदद चाहिए",
    kinds: { guide: "कदम दर कदम", rights: "आपके अधिकार", template: "मुफ़्त टेम्पलेट", deadline: "आपकी आख़िरी तारीख़", hub: "इस पर सब कुछ", notice: "अपना नोटिस या दस्तावेज़ समझें" },
    again: "फिर से शुरू करें", fine: "शोध सहायता, क़ानूनी सलाह नहीं।",
  },
};

function links(plan, lang) {
  const out = [];
  const g = GUIDES.find((x) => x.slug === plan.guide);
  if (g) out.push({ kind: "guide", to: `/now/${g.slug}`, title: g.title[lang] });
  if (plan.has_document) out.push({ kind: "notice", to: "/notice", title: UI[lang].kinds.notice });
  const r = RIGHTS.find((x) => x.slug === plan.rights);
  if (r) out.push({ kind: "rights", to: `/rights/${r.slug}`, title: r.title[lang] });
  const d = DEADLINES.find((x) => x.id === plan.deadline);
  if (d) out.push({ kind: "deadline", to: `/deadlines?for=${d.id}`, title: d.title[lang] });
  const t = TEMPLATES.find((x) => x.slug === plan.template);
  if (t) out.push({ kind: "template", to: `/templates/${t.slug}`, title: t.title });
  const h = HUBS.find((x) => x.slug === plan.hub);
  if (h) out.push({ kind: "hub", to: `/help/${h.slug}`, title: h.title[lang] });
  return out;
}

// A short note someone can hand or send to an advocate, so the first call starts from facts.
function lawyerNote(situation, plan) {
  return [
    "Summary for an advocate (prepared with Nyaya, asknyaya.in)",
    "",
    "What happened:",
    situation.trim(),
    "",
    plan.summary ? `In short: ${plan.summary}` : "",
    plan.question ? `Main legal question: ${plan.question}` : "",
    plan.first_steps?.length ? `Steps taken or planned:\n${plan.first_steps.map((s) => `- ${s}`).join("\n")}` : "",
    "",
    "Questions for the advocate:",
    "- What are my options, and what does each cost in time and money?",
    "- Is there a deadline I must not miss?",
    "- Which documents should I bring?",
  ].filter((x, i, a) => x || a[i - 1]).join("\n");
}

export default function SituationBox({ onAsk }) {
  const lang = pageLang();
  const t = UI[lang];
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState(null);
  const [noteState, setNoteState] = useState("");

  async function submit(e) {
    e?.preventDefault();
    const situation = text.trim();
    if (situation.length < 12) { setError(t.short); return; }
    setBusy(true); setError(""); setPlan(null);
    try {
      const res = await apiFetch(`${API_URL}/triage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation, lang: getLang() }),
      });
      if (!res.ok) throw await responseError(res);
      setPlan(await res.json());
      trackEvent("triage");
    } catch (err) {
      setError(err.userMessage || t.failed);
    } finally {
      setBusy(false);
    }
  }

  async function shareNote() {
    const note = lawyerNote(text, plan);
    if (navigator.share) {
      try { await navigator.share({ title: "For my advocate", text: note }); return; } catch { /* cancelled; fall back to copy */ }
    }
    try { await navigator.clipboard.writeText(note); setNoteState(t.copied); setTimeout(() => setNoteState(""), 2200); } catch { /* clipboard off */ }
  }

  const items = plan ? links(plan, lang) : [];

  return (
    <div className="situation">
      <form className="ask" onSubmit={submit}>
        <label className="sr-only" htmlFor="situation-text">{t.label}</label>
        <div className="ask-row ask-row--tall">
          <textarea id="situation-text" rows={2} value={text} maxLength={1500} placeholder={t.placeholder}
            onChange={(e) => { setText(e.target.value); if (error) setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) submit(e); }} />
          <MicButton onText={setText} />
          <button type="submit" className="btn btn--lime" disabled={busy}>{busy ? t.busy : t.go}</button>
        </div>
        {error && <p className="ask-hint" role="alert">{error}</p>}
      </form>

      {busy && <div className="skeleton" aria-hidden="true"><span /><span /><span /></div>}

      {plan && (
        <section className="card plan" aria-live="polite" aria-label={t.label}>
          {plan.emergency?.length > 0 && (
            <div className="helplines" role="alert">
              <p className="helplines-head">{t.help}</p>
              <ul>
                {plan.emergency.map((e) => (
                  <li key={e.number}><a className="helpline-num" href={`tel:${e.number}`}>{e.number}</a><span><strong>{e.name}</strong> {e.note}</span></li>
                ))}
              </ul>
            </div>
          )}
          <p className={`plan-urgency plan-urgency--${plan.urgency} mono`}>{t.urgency[plan.urgency]}</p>
          <p className="plan-summary">{plan.summary}</p>
          {plan.first_steps?.length > 0 && (
            <>
              <h3 className="zone-title">{t.first}</h3>
              <ol className="verdict-todo">{plan.first_steps.map((s) => <li key={s}>{s}</li>)}</ol>
            </>
          )}
          {items.length > 0 && (
            <>
              <h3 className="zone-title">{t.next}</h3>
              <ul className="plan-links">
                {items.map((x) => (
                  <li key={x.kind}>
                    <Link to={x.to} className="plan-link" onClick={() => trackEvent("triage_open")}>
                      <span className="mono muted">{t.kinds[x.kind]}</span>
                      <span>{x.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="answer-actions">
            {plan.question && <button type="button" className="btn btn--lime btn--sm" onClick={() => onAsk(plan.question)}>{t.full}</button>}
            {(plan.needs_lawyer || plan.lawyer_area) && (
              <Link className="btn btn--ghost btn--sm" to={`/lawyers${plan.lawyer_area ? `?area=${encodeURIComponent(plan.lawyer_area)}` : ""}`}>{t.lawyer}</Link>
            )}
            <button type="button" className="btn btn--ghost btn--sm" onClick={shareNote}>{noteState || t.note}</button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setPlan(null); setText(""); }}>{t.again}</button>
          </div>
          <p className="mono muted plan-fine">{t.fine}</p>
        </section>
      )}
    </div>
  );
}
