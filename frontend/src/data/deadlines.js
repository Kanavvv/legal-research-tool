// Legal time limits people most often miss. Each calculator takes one or more dates and
// works out the deadlines from them.
// Counting: the day of the event is left out (Limitation Act, s.12(1)), so "30 days from
// 1 January" ends on 31 January. Default bail is the exception: the day of remand counts
// (Supreme Court, Enforcement Directorate v. Kapil Wadhawan, 2023).
// If the last day falls on a day the court or office is closed, you can file on the next
// working day (Limitation Act, s.4).

export const DEADLINES = [
  {
    id: "cheque",
    title: { en: "Cheque bounce", hi: "चेक बाउंस" },
    blurb: { en: "Legal notice, payment window and court complaint.", hi: "क़ानूनी नोटिस, भुगतान की अवधि और कोर्ट में शिकायत।" },
    inputs: [
      { id: "memo", label: { en: "Date you got the bank's return memo", hi: "बैंक का रिटर्न मेमो मिलने की तारीख़" } },
      { id: "served", label: { en: "Date they received your notice (if sent)", hi: "उन्हें आपका नोटिस मिलने की तारीख़ (अगर भेजा)" }, optional: true },
    ],
    steps: [
      { id: "notice", from: "memo", days: 30, label: { en: "Send the legal notice by", hi: "क़ानूनी नोटिस भेजने की आख़िरी तारीख़" }, cite: ["ni-act", "138"], law: "NI Act s.138(b)" },
      { id: "pay", from: "served", days: 15, label: { en: "Their 15 days to pay end on", hi: "भुगतान के उनके 15 दिन ख़त्म" }, cite: ["ni-act", "138"], law: "NI Act s.138(c)" },
      { id: "complaint", from: "pay", months: 1, label: { en: "File the complaint before the Magistrate by", hi: "मजिस्ट्रेट के सामने शिकायत दर्ज करने की आख़िरी तारीख़" }, cite: ["ni-act", "142"], law: "NI Act s.142(1)(b)",
        note: { en: "Not before the 15 days have run out: a complaint filed too early can be dismissed.", hi: "15 दिन पूरे होने से पहले नहीं: जल्दी दर्ज की गई शिकायत ख़ारिज हो सकती है।" } },
    ],
  },
  {
    id: "consumer",
    title: { en: "Consumer complaint", hi: "उपभोक्ता शिकायत" },
    blurb: { en: "Two years from when the problem arose.", hi: "समस्या शुरू होने से दो साल।" },
    inputs: [{ id: "cause", label: { en: "Date the problem arose (defect found, service refused)", hi: "समस्या शुरू होने की तारीख़ (ख़राबी मिली, सेवा से इनकार)" } }],
    steps: [
      { id: "file", from: "cause", years: 2, label: { en: "File with the Consumer Commission by", hi: "उपभोक्ता आयोग में शिकायत की आख़िरी तारीख़" }, cite: ["consumer-protection-act", "69"], law: "Consumer Protection Act s.69" },
    ],
  },
  {
    id: "rti",
    title: { en: "RTI reply and appeals", hi: "RTI जवाब और अपील" },
    blurb: { en: "When the reply is due, and the last days to appeal.", hi: "जवाब कब तक, और अपील की आख़िरी तारीख़ें।" },
    inputs: [
      { id: "filed", label: { en: "Date your RTI reached the office", hi: "आपकी RTI दफ़्तर पहुँचने की तारीख़" } },
      { id: "decided", label: { en: "Date of the first appeal's decision (if any)", hi: "पहली अपील के फ़ैसले की तारीख़ (अगर हुआ)" }, optional: true },
    ],
    steps: [
      { id: "reply", from: "filed", days: 30, label: { en: "Reply due by", hi: "जवाब की आख़िरी तारीख़" }, law: "RTI Act s.7(1)",
        note: { en: "48 hours if it concerns someone's life or liberty; 5 more days if you filed with an Assistant PIO.", hi: "जान या आज़ादी से जुड़ा हो तो 48 घंटे; सहायक PIO के पास दी हो तो 5 दिन और।" } },
      { id: "appeal1", from: "reply", days: 30, label: { en: "If there's no reply, first appeal by", hi: "जवाब न मिले तो पहली अपील की आख़िरी तारीख़" }, law: "RTI Act s.19(1)",
        note: { en: "If you did get a reply, it's 30 days from the day you received it.", hi: "अगर जवाब मिला, तो उसे पाने के दिन से 30 दिन।" } },
      { id: "appeal2", from: "decided", days: 90, label: { en: "Second appeal to the Information Commission by", hi: "सूचना आयोग में दूसरी अपील की आख़िरी तारीख़" }, law: "RTI Act s.19(3)" },
    ],
  },
  {
    id: "accident",
    title: { en: "Road accident claim", hi: "सड़क दुर्घटना दावा" },
    blurb: { en: "Six months to claim compensation.", hi: "मुआवज़े के दावे के लिए छह महीने।" },
    inputs: [{ id: "date", label: { en: "Date of the accident", hi: "दुर्घटना की तारीख़" } }],
    steps: [
      { id: "claim", from: "date", months: 6, label: { en: "File the claim with the MACT by", hi: "MACT में दावे की आख़िरी तारीख़" }, cite: ["mv-act", "166"], law: "Motor Vehicles Act s.166(3)" },
    ],
  },
  {
    id: "default-bail",
    title: { en: "Default bail", hi: "डिफ़ॉल्ट ज़मानत" },
    blurb: { en: "When bail becomes a right if no chargesheet is filed.", hi: "चार्जशीट न आने पर ज़मानत कब अधिकार बनती है।" },
    inputs: [{ id: "remand", label: { en: "Date of the first remand (custody ordered by the Magistrate)", hi: "पहली रिमांड की तारीख़ (मजिस्ट्रेट का हिरासत आदेश)" } }],
    steps: [
      { id: "d60", from: "remand", days: 59, label: { en: "60th day of custody (most offences)", hi: "हिरासत का 60वाँ दिन (ज़्यादातर अपराध)" }, cite: ["bnss", "187"], law: "BNSS s.187(3)",
        note: { en: "If no chargesheet is filed by then, apply for default bail the next day, before it is filed.", hi: "तब तक चार्जशीट न आए तो अगले दिन, चार्जशीट आने से पहले, डिफ़ॉल्ट ज़मानत माँगें।" } },
      { id: "d90", from: "remand", days: 89, label: { en: "90th day of custody (offences punishable with death, life, or 10 years or more)", hi: "हिरासत का 90वाँ दिन (मृत्यु, आजीवन या 10 साल या ज़्यादा की सज़ा वाले अपराध)" }, cite: ["bnss", "187"], law: "BNSS s.187(3)" },
    ],
  },
  {
    id: "criminal-appeal",
    title: { en: "Appeal against a conviction", hi: "सज़ा के ख़िलाफ़ अपील" },
    blurb: { en: "30 days to the Sessions Court, 60 days to the High Court.", hi: "सेशन कोर्ट में 30 दिन, हाई कोर्ट में 60 दिन।" },
    inputs: [{ id: "judgment", label: { en: "Date of the judgment", hi: "फ़ैसले की तारीख़" } }],
    steps: [
      { id: "sessions", from: "judgment", days: 30, label: { en: "Appeal to the Sessions Court by", hi: "सेशन कोर्ट में अपील की आख़िरी तारीख़" }, law: "Limitation Act, Article 115",
        note: { en: "The time taken to get the certified copy of the judgment is added on.", hi: "फ़ैसले की प्रमाणित कॉपी मिलने में लगा समय जोड़ा जाता है।" } },
      { id: "hc", from: "judgment", days: 60, label: { en: "Appeal to the High Court by", hi: "हाई कोर्ट में अपील की आख़िरी तारीख़" }, law: "Limitation Act, Article 115" },
    ],
  },
  {
    id: "money",
    title: { en: "Recovering money owed", hi: "बकाया पैसा वसूलना" },
    blurb: { en: "Most suits for money: three years.", hi: "पैसे के ज़्यादातर मुक़दमे: तीन साल।" },
    inputs: [{ id: "due", label: { en: "Date the money became due (loan date, invoice due date, deposit refusal)", hi: "पैसा देय होने की तारीख़ (क़र्ज़, बिल की तारीख़, डिपॉज़िट से इनकार)" } }],
    steps: [
      { id: "suit", from: "due", years: 3, label: { en: "File the suit by", hi: "मुक़दमा दायर करने की आख़िरी तारीख़" }, law: "Limitation Act, Schedule (Articles 19 to 55)",
        note: { en: "A written acknowledgment of the debt, or a part-payment, before the deadline starts a fresh three years.", hi: "समय-सीमा से पहले क़र्ज़ की लिखित स्वीकृति या आंशिक भुगतान से नए तीन साल शुरू हो जाते हैं।" } },
    ],
  },
  {
    id: "arbitration",
    title: { en: "Challenging an arbitration award", hi: "मध्यस्थता अवार्ड को चुनौती" },
    blurb: { en: "Three months from receiving the award.", hi: "अवार्ड मिलने से तीन महीने।" },
    inputs: [{ id: "received", label: { en: "Date you received the signed award", hi: "हस्ताक्षरित अवार्ड मिलने की तारीख़" } }],
    steps: [
      { id: "s34", from: "received", months: 3, label: { en: "File the challenge by", hi: "चुनौती दायर करने की आख़िरी तारीख़" }, cite: ["arbitration-act", "34"], law: "Arbitration Act s.34(3)" },
      { id: "s34x", from: "s34", days: 30, label: { en: "Absolute last day, only with a good reason for the delay", hi: "बिल्कुल आख़िरी दिन, सिर्फ़ देरी की ठोस वजह के साथ" }, cite: ["arbitration-act", "34"], law: "Arbitration Act s.34(3) proviso" },
    ],
  },
  {
    id: "tenancy",
    title: { en: "Notice to vacate (monthly tenancy)", hi: "मकान ख़ाली करने का नोटिस (मासिक किराएदारी)" },
    blurb: { en: "15 days' notice when the agreement doesn't say otherwise.", hi: "अनुबंध में कुछ और न लिखा हो तो 15 दिन का नोटिस।" },
    inputs: [{ id: "notice", label: { en: "Date the notice was received", hi: "नोटिस मिलने की तारीख़" } }],
    steps: [
      { id: "ends", from: "notice", days: 15, label: { en: "Tenancy can end on", hi: "किराएदारी ख़त्म हो सकती है" }, cite: ["tp-act", "106"], law: "Transfer of Property Act s.106",
        note: { en: "Your agreement or your state's rent law may give a longer period, and only a court can order an eviction.", hi: "आपका अनुबंध या राज्य का किराया क़ानून ज़्यादा समय दे सकता है, और बेदख़ली का आदेश सिर्फ़ कोर्ट दे सकता है।" } },
    ],
  },
];

const parse = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

export function addPeriod(date, { days = 0, months = 0, years = 0 }) {
  const d = new Date(date.getTime());
  if (years || months) {
    const day = d.getUTCDate();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + months + years * 12);
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(day, last));
  }
  if (days) d.setUTCDate(d.getUTCDate() + days);
  return d;
}

// Works out every step it can from the dates given. Returns [{...step, date}] with date null
// when an input it depends on is missing.
export function compute(calc, values) {
  const known = {};
  for (const i of calc.inputs) if (values[i.id]) known[i.id] = parse(values[i.id]);
  return calc.steps.map((s) => {
    const base = known[s.from];
    const date = base ? addPeriod(base, s) : null;
    if (date) known[s.id] = date;
    return { ...s, date };
  });
}

export const isClosedDay = (d) => d.getUTCDay() === 0; // Sunday; courts also close on holidays

export function icsFor(title, items) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const fmt = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");
  const esc = (s) => s.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  const events = items.map((it, n) => [
    "BEGIN:VEVENT", `UID:nyaya-${fmt(it.date)}-${n}-${Math.random().toString(36).slice(2)}@asknyaya.in`, `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${fmt(it.date)}`, `DTEND;VALUE=DATE:${fmt(addPeriod(it.date, { days: 1 }))}`,
    `SUMMARY:${esc(`${title}: ${it.label}`)}`, `DESCRIPTION:${esc(`${it.law || ""}. Worked out by Nyaya (asknyaya.in). Check with a lawyer.`)}`,
    "BEGIN:VALARM", "TRIGGER:-P3D", "ACTION:DISPLAY", `DESCRIPTION:${esc(it.label)}`, "END:VALARM",
    "END:VEVENT",
  ].join("\r\n"));
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Nyaya//Deadlines//EN", "CALSCALE:GREGORIAN", ...events, "END:VCALENDAR"].join("\r\n");
}
