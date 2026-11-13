// "How long will my case take?" for the cases people ask about most. For each: the time
// the law itself sets (with the section), why real cases take longer, and what speeds one up.
// We don't print average durations: they vary hugely by court, and the live numbers for any
// court are on the National Judicial Data Grid (NJDG), which each page links to.

export const NJDG = "https://njdg.ecourts.gov.in";

export const HOW_LONG = [
  {
    slug: "cheque-bounce-case",
    title: "Cheque bounce case",
    q: "How long does a cheque bounce case take in India?",
    short: "The law asks the Magistrate to finish a cheque bounce trial within six months of the complaint, but in busy courts it often takes a year or more, mostly because the accused avoids the summons.",
    law: [
      { step: "Send the demand notice", time: "within 30 days of the bank's return memo", law: "NI Act s.138(b)", cite: ["ni-act", "138"] },
      { step: "The other side can pay", time: "15 days from receiving the notice", law: "NI Act s.138(c)", cite: ["ni-act", "138"] },
      { step: "File the complaint", time: "within one month after those 15 days end", law: "NI Act s.142(1)(b)", cite: ["ni-act", "142"] },
      { step: "Trial", time: "to be concluded within six months of filing, as far as possible, tried summarily", law: "NI Act s.143(3)", cite: ["ni-act", "143"] },
    ],
    why: "The commonest delay is serving the summons: people change address or refuse to accept it. Adjournments for evidence and a crowded docket add months.",
    faster: [
      "Give the court every address, phone number and email you have for the accused; courts can serve summons by email and WhatsApp too.",
      "Ask for interim compensation of up to 20% of the cheque amount while the case is pending (s.143A).",
      "Settle: the case can be compounded at any stage (s.147), and Lok Adalats settle many cheque cases in a day.",
    ],
    links: [["/now/cheque-bounced", "Your cheque bounced: what to do now"], ["/templates/cheque-bounce-notice", "Free cheque bounce notice"], ["/deadlines?for=cheque", "Cheque bounce deadline calculator"]],
  },
  {
    slug: "consumer-complaint",
    title: "Consumer complaint",
    q: "How long does a consumer court case take in India?",
    short: "The Consumer Protection Act asks the Commission to decide a complaint within three months of notice to the other side (five if goods need lab testing). In practice many cases take a year or two.",
    law: [
      { step: "File the complaint", time: "within two years of the problem", law: "CPA s.69", cite: ["consumer-protection-act", "69"] },
      { step: "Admission", time: "the Commission decides whether to admit it within 21 days, or it is treated as admitted", law: "CPA s.36(3)", cite: ["consumer-protection-act", "36"] },
      { step: "The other side replies", time: "within 30 days of notice, extendable by 15", law: "CPA s.38(2)(a)", cite: ["consumer-protection-act", "38"] },
      { step: "Decision", time: "within three months of notice to the other side; five months if testing is needed", law: "CPA s.38(7)", cite: ["consumer-protection-act", "38"] },
    ],
    why: "Commissions have vacancies and long lists, and adjournments are common. Cases needing expert evidence take longer.",
    faster: [
      "File online on e-Daakhil (now e-Jagriti) with all bills, warranty and chats attached, so nothing is missing at admission.",
      "Agree to mediation if the Commission offers it (s.37): a settlement there is final and quick.",
      "Send a written complaint or legal notice first; many companies settle before a hearing.",
    ],
    links: [["/now/consumer", "Faulty product or bad service: what to do"], ["/templates/consumer-complaint", "Free consumer complaint template"], ["/rights/consumer", "Your rights as a consumer"]],
  },
  {
    slug: "mutual-consent-divorce",
    title: "Divorce by mutual consent",
    q: "How long does a mutual consent divorce take in India?",
    short: "Usually six months to a year and a half: you file after living apart for a year, and the court waits six months before the second motion. That wait can be waived in the right case.",
    law: [
      { step: "Live separately", time: "at least one year before filing", law: "Hindu Marriage Act s.13B(1)", cite: ["hindu-marriage-act", "13B"] },
      { step: "Second motion", time: "not earlier than six months and not later than 18 months after filing", law: "Hindu Marriage Act s.13B(2)", cite: ["hindu-marriage-act", "13B"] },
      { step: "Waiver of the six months", time: "the court can waive it if settlement is complete and there's no chance of reconciliation", law: "Amardeep Singh v Harveen Kaur (2017)" },
    ],
    why: "Delays come from disagreements over alimony, child custody or property that surface late, and from one side not turning up for the second motion.",
    faster: [
      "Settle everything (alimony, custody, jewellery, property) in a written agreement before filing.",
      "If you've already lived apart long and settled, ask for the six-month wait to be waived.",
      "Both of you should attend every date, or appear by video if the court allows it.",
    ],
    links: [["/help/women", "Women's rights: help in one place"]],
  },
  {
    slug: "contested-divorce",
    title: "Contested divorce",
    q: "How long does a contested divorce take in India?",
    short: "The Hindu Marriage Act asks courts to try a divorce petition within six months of notice to the other side, but contested divorces commonly take several years, longer with appeals.",
    law: [
      { step: "Trial", time: "as fast as possible, aiming to finish within six months of notice to the respondent", law: "Hindu Marriage Act s.21B(2)", cite: ["hindu-marriage-act", "21B"] },
      { step: "Appeal", time: "to be decided within three months of notice, as far as possible", law: "Hindu Marriage Act s.21B(3)", cite: ["hindu-marriage-act", "21B"] },
    ],
    why: "Each side leads evidence and cross-examines, connected cases (maintenance, domestic violence, custody) run in parallel, and family courts are heavily loaded.",
    faster: [
      "Try mediation: family courts refer most cases there, and many contested divorces turn into mutual consent ones.",
      "Keep evidence organised and file affidavits of assets early (the Supreme Court's Rajnesh v Neha rules).",
      "Ask for connected cases to be heard together.",
    ],
    links: [["/help/women", "Women's rights: help in one place"], ["/how-long/maintenance-case", "How long a maintenance case takes"]],
  },
  {
    slug: "maintenance-case",
    title: "Maintenance case (wife, children, parents)",
    q: "How long does a maintenance case take in India?",
    short: "The law asks the Magistrate to decide interim maintenance within 60 days of notice to the husband or son. The final order often takes much longer, but interim maintenance can start meanwhile.",
    law: [
      { step: "Interim maintenance", time: "to be decided within 60 days of service of notice, as far as possible", law: "BNSS s.144 (old CrPC s.125)", cite: ["bnss", "144"] },
      { step: "Arrears", time: "maintenance can be ordered from the date of the application", law: "BNSS s.144(2)", cite: ["bnss", "144"] },
    ],
    why: "Delays come from serving notice, disputes about income, and adjournments. Both sides must now file affidavits of assets and income, which helps.",
    faster: [
      "Ask for interim maintenance in your very first application.",
      "Attach whatever proof of the other side's income you have: salary slips, bank statements, property papers.",
      "If maintenance isn't paid, the court can issue a warrant to recover it (s.144(3)).",
    ],
    links: [["/rights/domestic-violence", "Rights against domestic violence"], ["/legal-aid", "Check if you get a free lawyer"]],
  },
  {
    slug: "bail",
    title: "Bail",
    q: "How long does it take to get bail in India?",
    short: "For a bailable offence, bail is a right at the police station or first hearing. For others, a bail application is usually heard within days to a few weeks. If the police don't file the chargesheet in time, the accused gets a right to default bail.",
    law: [
      { step: "Bailable offence", time: "bail is a right, at the police station or court", law: "BNSS s.478 (old CrPC s.436)", cite: ["bnss", "478"] },
      { step: "Default bail", time: "if the chargesheet isn't filed within 60 days (90 for the gravest offences)", law: "BNSS s.187(3) (old CrPC s.167(2))", cite: ["bnss", "187"] },
      { step: "Anticipatory bail", time: "apply before arrest to the Sessions Court or High Court", law: "BNSS s.482 (old CrPC s.438)", cite: ["bnss", "482"] },
    ],
    why: "Serious charges, opposition by the prosecution, and waiting for the case diary slow things down. High Court bail can take longer than Sessions Court.",
    faster: [
      "Apply as soon as possible, and have a surety and their ID ready.",
      "Track the 60 or 90 days from the first remand: on the next day, apply for default bail before the chargesheet is filed.",
      "Can't afford a lawyer? Anyone in custody gets a free one through legal aid.",
    ],
    links: [["/now/arrested", "Someone was arrested: what to do now"], ["/rights/bail", "Your rights on bail"], ["/legal-aid", "Free lawyer checker"]],
  },
  {
    slug: "domestic-violence-case",
    title: "Domestic violence case",
    q: "How long does a domestic violence case take in India?",
    short: "The Protection of Women from Domestic Violence Act asks the Magistrate to hold the first hearing within three days and decide within 60 days of it. Protection orders can be passed urgently, even the same day.",
    law: [
      { step: "First hearing", time: "usually within three days of the application", law: "DV Act s.12(4)" },
      { step: "Decision", time: "the Magistrate should try to decide within 60 days of the first hearing", law: "DV Act s.12(5)" },
      { step: "Urgent orders", time: "interim and ex parte protection orders can be passed at once", law: "DV Act s.23" },
    ],
    why: "Serving notice, counter-allegations and connected cases often stretch it to months or longer, but interim protection and residence orders don't wait for the end.",
    faster: [
      "Go through the Protection Officer, who files the Domestic Incident Report and helps with service.",
      "Ask for interim protection, residence and maintenance orders in the first application.",
      "You qualify for a free lawyer as a woman, whatever your income.",
    ],
    links: [["/now/domestic-violence", "Facing domestic violence: what to do now"], ["/rights/domestic-violence", "Your rights"], ["/legal-aid", "Free lawyer checker"]],
  },
  {
    slug: "rti-reply",
    title: "RTI reply and appeals",
    q: "How long does an RTI reply take?",
    short: "The PIO must reply within 30 days (48 hours if it concerns someone's life or liberty). A first appeal should be decided in 30 to 45 days. Second appeals at Information Commissions can take months.",
    law: [
      { step: "Reply", time: "30 days; 48 hours for life or liberty; 35 days if filed through an Assistant PIO", law: "RTI Act s.7(1), s.5(2)" },
      { step: "First appeal", time: "file within 30 days; decided within 30 days, or 45 with reasons", law: "RTI Act s.19(1), s.19(6)" },
      { step: "Second appeal", time: "file within 90 days, at the Information Commission", law: "RTI Act s.19(3)" },
    ],
    why: "Replies are often late or incomplete, and Information Commissions have large backlogs.",
    faster: [
      "Ask precise questions about records that exist, one per line.",
      "If 30 days pass with no reply, file the first appeal straight away: a late reply must be free (s.7(6)).",
    ],
    links: [["/templates/rti-application", "Free RTI application"], ["/templates/rti-first-appeal", "Free RTI first appeal"], ["/help/rti", "RTI: help in one place"]],
  },
  {
    slug: "civil-suit",
    title: "Civil suit (recovery of money, property)",
    q: "How long does a civil case take in India?",
    short: "The Code of Civil Procedure sets tight steps (30 to 90 days for the defence, no more than three adjournments, judgment within 30 to 60 days of arguments), but civil suits commonly take several years.",
    law: [
      { step: "Written statement (defence)", time: "30 days from summons, extendable to 90", law: "CPC Order VIII rule 1" },
      { step: "Adjournments", time: "no more than three to a party during hearing", law: "CPC Order XVII rule 1" },
      { step: "Judgment", time: "within 30 days of arguments ending, at most 60", law: "CPC Order XX rule 1" },
      { step: "Commercial disputes", time: "written statement strictly within 120 days", law: "Commercial Courts Act, 2015" },
    ],
    why: "Evidence, cross-examination, applications in between, and appeals add years. Property suits are slowest.",
    faster: [
      "For a debt backed by a written contract, cheque or invoice, a summary suit (Order XXXVII) is much faster.",
      "Try Lok Adalat or mediation: a settlement there is final and refunds the court fee.",
      "For business disputes, the Commercial Court route has strict timelines.",
    ],
    links: [["/legal-aid", "Check if you get a free lawyer"], ["/deadlines", "Legal deadline calculator"]],
  },
];

export const findHowLong = (slug) => HOW_LONG.find((h) => h.slug === slug);
