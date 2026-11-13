// Free fill-in templates. Each one is a list of fields and a function that turns the
// answers into the document text. Everything runs in the browser; nothing is sent anywhere.
// Blank fields print as a line to fill by hand, so a half-filled form still prints usefully.

const v = (x, blank = "__________") => (x && String(x).trim()) || blank;
const today = () => new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
const lines = (x) => v(x).split("\n").map((l) => l.trim()).filter(Boolean);
const numbered = (x) => lines(x).map((l, i) => `${i + 1}. ${l}`).join("\n");

export const TEMPLATES = [
  {
    slug: "rti-application",
    title: "RTI application",
    blurb: "Ask any public authority for information under the Right to Information Act, 2005.",
    note: "Fee: Rs 10 for central public authorities (by postal order, demand draft, or online at rtionline.gov.in). States set their own fee. People below the poverty line pay nothing; attach a copy of the BPL card. The reply is due within 30 days (48 hours if it concerns someone's life or liberty).",
    rights: null,
    fields: [
      { id: "pio", label: "Public authority and office", placeholder: "e.g. Municipal Corporation of Delhi, Property Tax Department", required: true },
      { id: "address", label: "Office address", type: "textarea", placeholder: "Full postal address of the office" },
      { id: "name", label: "Your name", required: true },
      { id: "applicant_address", label: "Your address", type: "textarea" },
      { id: "phone", label: "Phone or email (optional)" },
      { id: "questions", label: "Information you want, one item per line", type: "textarea", rows: 6, required: true, placeholder: "Certified copy of the file noting on my application no. ... dated ...\nThe current status of my application and the name of the officer handling it" },
      { id: "period", label: "Period it covers (optional)", placeholder: "e.g. 1 April 2024 to date" },
      { id: "fee", label: "How you are paying the fee", placeholder: "e.g. Indian Postal Order no. ... for Rs 10" },
      { id: "bpl", label: "I am below the poverty line (no fee)", type: "checkbox" },
    ],
    render: (f) => `To,
The Public Information Officer,
${v(f.pio)}
${v(f.address)}

Subject: Application for information under Section 6(1) of the Right to Information Act, 2005

Sir/Madam,

I request the following information:

${numbered(f.questions)}
${f.period ? `\nPeriod: ${f.period}\n` : ""}
${f.bpl ? "I belong to the Below Poverty Line category; a copy of my BPL certificate is attached, so no fee is payable." : `The application fee has been paid: ${v(f.fee)}.`}

If any part of this information is held by another public authority, please transfer this application to it under Section 6(3) of the Act and let me know.

I am a citizen of India.

Name: ${v(f.name)}
Address: ${v(f.applicant_address)}
${f.phone ? `Contact: ${f.phone}\n` : ""}Date: ${today()}
Place: __________

Signature: __________`,
  },
  {
    slug: "consumer-complaint",
    title: "Consumer complaint",
    blurb: "A complaint to the District Consumer Commission about a defective product or deficient service.",
    note: "File in the District Commission where you live or work, or where the seller is, for claims up to Rs 50 lakh, within two years. You can file online at edaakhil.nic.in. Attach copies of the bill, warranty, emails or chats, and any notice you sent. Court fee is nil up to Rs 5 lakh.",
    rights: "consumer",
    fields: [
      { id: "district", label: "District Commission (district and state)", placeholder: "e.g. North Delhi, Delhi", required: true },
      { id: "name", label: "Your name", required: true },
      { id: "address", label: "Your address", type: "textarea" },
      { id: "opp", label: "Seller or service provider (name)", required: true },
      { id: "opp_address", label: "Their address", type: "textarea" },
      { id: "product", label: "What you bought or the service you paid for", placeholder: "e.g. a refrigerator, model ..., invoice no. ..." },
      { id: "date", label: "Date of purchase", type: "date" },
      { id: "amount", label: "Amount paid (Rs)", type: "number" },
      { id: "facts", label: "What went wrong, in order", type: "textarea", rows: 6, placeholder: "One event per line, with dates" },
      { id: "relief", label: "What you want", type: "textarea", rows: 3, placeholder: "Refund of Rs ...\nCompensation of Rs ... for harassment\nRs ... as costs of this complaint" },
    ],
    render: (f) => `BEFORE THE DISTRICT CONSUMER DISPUTES REDRESSAL COMMISSION, ${v(f.district).toUpperCase()}

Complaint No. ______ of ${new Date().getFullYear()}

IN THE MATTER OF:

${v(f.name)}
${v(f.address)}
                                                    ... Complainant

Versus

${v(f.opp)}
${v(f.opp_address)}
                                                    ... Opposite Party

COMPLAINT UNDER SECTION 35 OF THE CONSUMER PROTECTION ACT, 2019

The Complainant states as follows:

1. The Complainant is a consumer within the meaning of Section 2(7) of the Consumer Protection Act, 2019. On ${v(f.date)}, the Complainant bought/hired ${v(f.product)} from the Opposite Party for Rs ${v(f.amount)}.

2. The facts giving rise to this complaint are:
${numbered(f.facts)}

3. The above amounts to a defect in goods and/or deficiency in service and/or an unfair trade practice under Section 2 of the Act.

4. Jurisdiction: The Complainant resides/works within the jurisdiction of this Commission, and the value of the goods or services paid for does not exceed the pecuniary limit of this Commission.

5. Limitation: The cause of action arose on ${v(f.date)} and continues; this complaint is filed within two years, as Section 69 of the Act requires.

PRAYER

The Complainant prays that this Commission direct the Opposite Party to pay or provide:
${numbered(f.relief)}
and pass any other order it thinks fit.

VERIFICATION

I, ${v(f.name)}, the Complainant, verify that the contents of this complaint are true to my knowledge and belief, and nothing material has been concealed.

Place: __________
Date: ${today()}
                                                    Signature of Complainant`,
  },
  {
    slug: "cheque-bounce-notice",
    title: "Cheque bounce notice",
    blurb: "The demand notice under Section 138 of the Negotiable Instruments Act that must go out before any case.",
    note: "Send this within 30 days of receiving the bank's return memo, by registered post with acknowledgement (and email or WhatsApp too, if you can). Keep the postal receipt. If they don't pay within 15 days of receiving it, you have one month to file a complaint before the Magistrate.",
    rights: "cheque-bounce",
    fields: [
      { id: "name", label: "Your name", required: true },
      { id: "address", label: "Your address", type: "textarea" },
      { id: "drawer", label: "Name of the person who gave the cheque", required: true },
      { id: "drawer_address", label: "Their address", type: "textarea" },
      { id: "reason", label: "What the cheque was for", placeholder: "e.g. repayment of a friendly loan of Rs ... given on ..." },
      { id: "cheque_no", label: "Cheque number" },
      { id: "cheque_date", label: "Date on the cheque", type: "date" },
      { id: "amount", label: "Cheque amount (Rs)", type: "number", required: true },
      { id: "bank", label: "Drawn on (bank and branch)" },
      { id: "presented", label: "Date you deposited it", type: "date" },
      { id: "memo_date", label: "Date of the bank's return memo", type: "date" },
      { id: "memo_reason", label: "Reason on the memo", placeholder: "e.g. Funds insufficient" },
    ],
    render: (f) => `LEGAL NOTICE UNDER SECTION 138 OF THE NEGOTIABLE INSTRUMENTS ACT, 1881

By Registered Post A.D.

Date: ${today()}

To,
${v(f.drawer)}
${v(f.drawer_address)}

Subject: Demand for payment of Rs ${v(f.amount)} against dishonoured cheque no. ${v(f.cheque_no)}

Sir/Madam,

1. You owed me a legally enforceable debt, being ${v(f.reason)}.

2. Towards it, you issued cheque no. ${v(f.cheque_no)} dated ${v(f.cheque_date)} for Rs ${v(f.amount)}, drawn on ${v(f.bank)}.

3. I deposited the cheque on ${v(f.presented)}. It was returned unpaid with the remark "${v(f.memo_reason)}", by the bank's memo dated ${v(f.memo_date)}.

4. I therefore call upon you to pay me Rs ${v(f.amount)}, the amount of the cheque, within 15 days of receiving this notice.

5. If you fail to pay within that time, I will be compelled to file a criminal complaint against you under Sections 138 and 142 of the Negotiable Instruments Act, 1881, and to take any other proceedings open to me, entirely at your risk as to costs and consequences.

${v(f.name)}
${v(f.address)}

Signature: __________`,
  },
  {
    slug: "rent-agreement",
    title: "Rent agreement (11 months)",
    blurb: "A plain residential leave-and-licence style rent agreement for up to 11 months.",
    note: "Print it on non-judicial stamp paper of the value your state requires (or e-stamp it), sign every page, and have two witnesses sign. An 11-month agreement doesn't have to be registered, but registering it, or a police tenant verification, is still wise in many cities. Check your state's rent law for anything it adds.",
    rights: "tenant",
    fields: [
      { id: "city", label: "City where it is signed", required: true },
      { id: "owner", label: "Owner's name", required: true },
      { id: "owner_address", label: "Owner's address", type: "textarea" },
      { id: "tenant", label: "Tenant's name", required: true },
      { id: "tenant_address", label: "Tenant's permanent address", type: "textarea" },
      { id: "property", label: "Address of the rented property", type: "textarea", required: true },
      { id: "start", label: "Start date", type: "date" },
      { id: "rent", label: "Monthly rent (Rs)", type: "number", required: true },
      { id: "due", label: "Rent due by (day of month)", type: "number", placeholder: "e.g. 5" },
      { id: "deposit", label: "Security deposit (Rs)", type: "number" },
      { id: "notice", label: "Notice period (months)", type: "number", placeholder: "e.g. 1" },
      { id: "increase", label: "Rent increase on renewal (%)", type: "number", placeholder: "e.g. 5" },
      { id: "fittings", label: "Fittings provided (optional)", type: "textarea", placeholder: "e.g. 2 fans, 1 geyser, 4 tube lights" },
    ],
    render: (f) => `RENT AGREEMENT

This Rent Agreement is made at ${v(f.city)} on ${today()}

BETWEEN

${v(f.owner)}, residing at ${v(f.owner_address)} (the "Owner")

AND

${v(f.tenant)}, permanently residing at ${v(f.tenant_address)} (the "Tenant").

The Owner owns the residential premises at ${v(f.property)} (the "Premises"), and has agreed to let them to the Tenant on these terms:

1. Term. This agreement runs for 11 months from ${v(f.start)}. It may be renewed by mutual written consent${f.increase ? `, with the rent increased by ${f.increase}%` : ""}.

2. Rent. The Tenant shall pay Rs ${v(f.rent)} a month, in advance, by the ${v(f.due, "____")} day of each month. The Owner shall give a receipt or the payment shall be made by bank transfer.

3. Security deposit. The Tenant has paid Rs ${v(f.deposit)} as an interest-free security deposit. The Owner shall refund it when the Tenant hands back the Premises, less only unpaid rent or bills and the cost of damage beyond normal wear and tear.

4. Bills. The Tenant shall pay electricity, water and gas charges for the period of occupation, as per the meters. Property tax shall be paid by the Owner.

5. Use. The Premises are for residence only. The Tenant shall not sublet or part with possession, and shall not make structural changes without the Owner's written consent.

6. Upkeep. The Tenant shall keep the Premises clean and in good condition and make minor day-to-day repairs. Major and structural repairs are the Owner's responsibility.

7. Inspection. The Owner may inspect the Premises at a reasonable time after giving prior notice.

8. Notice. Either party may end this agreement by giving ${v(f.notice, "one")} month(s)' written notice.

9. Handover. At the end of the term, the Tenant shall hand back vacant and peaceful possession of the Premises with the fittings listed below, in the condition received, normal wear and tear excepted.
${f.fittings ? `\nFittings: ${f.fittings}\n` : ""}
IN WITNESS of which the parties have signed this agreement on the date first written above.

OWNER                                   TENANT
__________                              __________
${v(f.owner)}                           ${v(f.tenant)}

WITNESSES
1. Name and address: __________________   Signature: __________
2. Name and address: __________________   Signature: __________`,
  },
  {
    slug: "police-complaint",
    title: "Police complaint (to register an FIR)",
    blurb: "A written complaint to the officer in charge of a police station asking for an FIR under Section 173 of the BNSS.",
    note: "Hand it in at the police station of the area where it happened (any station must register a Zero FIR and transfer it). Keep a copy and get it stamped or signed as received. The FIR copy is free. If they refuse, send this complaint by post to the Superintendent of Police (Section 173(4) BNSS), and after that you can apply to the Magistrate (Section 175(3) BNSS). Many states also take e-FIRs online for theft and lost property.",
    rights: "fir",
    fields: [
      { id: "station", label: "Police station", required: true, placeholder: "e.g. Police Station Saket, New Delhi" },
      { id: "name", label: "Your name", required: true },
      { id: "relation", label: "Son / daughter / wife of (optional)" },
      { id: "address", label: "Your address", type: "textarea" },
      { id: "phone", label: "Your phone number" },
      { id: "when", label: "Date and time it happened", placeholder: "e.g. 12 November 2026, around 9:30 pm" },
      { id: "where", label: "Where it happened", placeholder: "e.g. outside Gate 2, Select Citywalk Mall, Saket" },
      { id: "accused", label: "Who did it (name, description, or 'unknown persons')", type: "textarea", rows: 2 },
      { id: "facts", label: "What happened, in order, one point per line", type: "textarea", rows: 7, required: true, placeholder: "I was walking to the metro station when two men on a black motorcycle snatched my phone.\nThe phone is a Samsung Galaxy S23, IMEI ...\nI shouted for help; a shopkeeper, Mr ..., saw it." },
      { id: "loss", label: "Loss or injury (optional)", type: "textarea", rows: 2, placeholder: "e.g. phone worth Rs 62,000; scratches on my left arm" },
      { id: "witnesses", label: "Witnesses (optional)", type: "textarea", rows: 2 },
      { id: "docs", label: "What you are attaching (optional)", type: "textarea", rows: 2, placeholder: "e.g. phone bill, photos, medical report" },
    ],
    render: (f) => `To,
The Station House Officer,
${v(f.station)}

Subject: Complaint for registration of an FIR under Section 173 of the Bharatiya Nagarik Suraksha Sanhita, 2023

Sir/Madam,

I, ${v(f.name)}${f.relation ? `, ${f.relation}` : ""}, residing at ${v(f.address)}, wish to report the following cognizable offence and request that an FIR be registered.

Date and time: ${v(f.when)}
Place: ${v(f.where)}
Person(s) responsible: ${v(f.accused)}

What happened:
${numbered(f.facts)}
${f.loss ? `\nLoss or injury: ${f.loss}\n` : ""}${f.witnesses ? `\nWitnesses: ${f.witnesses}\n` : ""}
I request you to register an FIR, investigate, and give me a free copy of the FIR as Section 173(2) of the BNSS requires.
${f.docs ? `\nAttached: ${f.docs}\n` : ""}
The facts above are true to the best of my knowledge.

Name: ${v(f.name)}
Phone: ${v(f.phone)}
Date: ${today()}

Signature: __________`,
  },
  {
    slug: "rti-first-appeal",
    title: "RTI first appeal",
    blurb: "Appeal to the First Appellate Authority when an RTI reply is late, incomplete or refused.",
    note: "File within 30 days of the reply, or of the date the reply was due (30 days after your application). Send it to the First Appellate Authority named in the reply (an officer senior to the PIO, in the same office). Central public authorities charge no fee for a first appeal; check your state's rules. The appeal should be decided within 30 days, or 45 with written reasons. If it isn't, or you're still not satisfied, a second appeal goes to the Information Commission within 90 days.",
    rights: null,
    fields: [
      { id: "faa", label: "First Appellate Authority (name or designation, and office)", required: true, placeholder: "e.g. Deputy Commissioner (First Appellate Authority), MCD South Zone" },
      { id: "address", label: "Office address", type: "textarea" },
      { id: "name", label: "Your name", required: true },
      { id: "applicant_address", label: "Your address", type: "textarea" },
      { id: "rti_date", label: "Date of your RTI application", type: "date" },
      { id: "rti_ref", label: "Registration or reference number (if any)" },
      { id: "pio", label: "PIO it was addressed to" },
      { id: "reply_date", label: "Date of the PIO's reply (leave blank if none came)", type: "date" },
      { id: "ground", label: "Main ground", type: "select", options: ["No reply within 30 days", "Information refused", "Incomplete or misleading reply", "Fee demanded wrongly"] },
      { id: "details", label: "What was wrong, one point per line", type: "textarea", rows: 5, placeholder: "Point 2 of my application was not answered.\nThe PIO cited Section 8(1)(j) without saying how the information is personal." },
    ],
    render: (f) => `To,
The First Appellate Authority,
${v(f.faa)}
${v(f.address)}

Subject: First appeal under Section 19(1) of the Right to Information Act, 2005

Sir/Madam,

1. Name and address of the appellant: ${v(f.name)}, ${v(f.applicant_address)}

2. Particulars of the RTI application: dated ${v(f.rti_date)}${f.rti_ref ? `, reference no. ${f.rti_ref}` : ""}, addressed to ${v(f.pio, "the Public Information Officer")}.

3. ${f.reply_date ? `Reply received: dated ${f.reply_date}.` : "No reply was received within the 30 days allowed by Section 7(1) of the Act, which amounts to a refusal under Section 7(2)."}

4. Ground of appeal: ${v(f.ground, "__________")}.

5. Details:
${f.details ? numbered(f.details) : "__________"}

6. Prayer: I request you to direct the Public Information Officer to provide the complete information sought, free of charge under Section 7(6) since the time limit was not met${f.reply_date ? " (where applicable)" : ""}, and to pass any other order you think fit.

A copy of my RTI application${f.reply_date ? " and of the reply" : ""} is attached.

Name: ${v(f.name)}
Date: ${today()}
Place: __________

Signature: __________`,
  },
  {
    slug: "deposit-refund-notice",
    title: "Security deposit refund notice",
    blurb: "A firm written demand to your landlord to return your security deposit after you've moved out.",
    note: "Send it by registered post with acknowledgement and also on WhatsApp or email, and keep the receipts. Attach copies of the rent agreement, your deposit receipt or bank transfer, and photos of the flat when you left. If the deposit still isn't returned, you can file a civil suit for recovery (a small amount can also go to Lok Adalat), and in states that have adopted the Model Tenancy Act, the Rent Authority.",
    rights: "tenant",
    fields: [
      { id: "name", label: "Your name", required: true },
      { id: "address", label: "Your current address", type: "textarea" },
      { id: "landlord", label: "Landlord's name", required: true },
      { id: "landlord_address", label: "Landlord's address", type: "textarea" },
      { id: "premises", label: "The flat or house you rented", placeholder: "e.g. Flat 302, Shanti Apartments, Sector 21, Gurugram" },
      { id: "agreement_date", label: "Date of the rent agreement", type: "date" },
      { id: "deposit", label: "Deposit paid (Rs)", type: "number", required: true },
      { id: "vacated", label: "Date you handed over the keys", type: "date" },
      { id: "deductions", label: "Any agreed deductions (optional)", placeholder: "e.g. Rs 3,000 for the broken geyser, as agreed on WhatsApp" },
      { id: "days", label: "Days you are giving them to pay", type: "number", placeholder: "15" },
      { id: "upi", label: "Where to pay (UPI ID or bank account)" },
    ],
    render: (f) => `By Registered Post A.D. / WhatsApp / Email

Date: ${today()}

To,
${v(f.landlord)}
${v(f.landlord_address)}

Subject: Demand for refund of security deposit of Rs ${v(f.deposit)}

Sir/Madam,

1. I was your tenant at ${v(f.premises)} under a rent agreement dated ${v(f.agreement_date)}.

2. At the start of the tenancy I paid you a refundable security deposit of Rs ${v(f.deposit)}.

3. I vacated the premises and handed over vacant possession and the keys to you on ${v(f.vacated)}, with all rent paid up to that date.

4. The deposit was refundable on my vacating the premises.${f.deductions ? ` The only deduction agreed between us is: ${f.deductions}.` : " No deduction has been agreed or justified to me in writing."} Despite this, you have not returned it.

5. I therefore call upon you to refund Rs ${v(f.deposit)}${f.deductions ? ", less the agreed deduction," : ""} within ${v(f.days, "15")} days of receiving this notice${f.upi ? `, to ${f.upi}` : ""}.

6. If you fail to do so, I will be compelled to take legal proceedings for recovery of the amount with interest and costs, without further notice.

${v(f.name)}
${v(f.address)}

Signature: __________`,
  },
  {
    slug: "salary-dues-notice",
    title: "Unpaid salary notice",
    blurb: "A written demand to a former or current employer for unpaid salary or final settlement dues.",
    note: "Send it to the company's registered office and HR by email and registered post, and keep proof. Under the Code on Wages, 2019, wages due to someone who resigns or is removed must be paid within two working days of leaving. If the employer still doesn't pay, you can file a claim with the Labour Department's authority under the Code, or, if you were a manager or in a senior role the Code doesn't cover, a civil suit for recovery.",
    rights: null,
    fields: [
      { id: "name", label: "Your name", required: true },
      { id: "address", label: "Your address", type: "textarea" },
      { id: "employee_id", label: "Employee ID (optional)" },
      { id: "designation", label: "Your designation" },
      { id: "company", label: "Company name", required: true },
      { id: "company_address", label: "Company address", type: "textarea" },
      { id: "joined", label: "Date you joined", type: "date" },
      { id: "left", label: "Last working day (leave blank if still employed)", type: "date" },
      { id: "dues", label: "What is unpaid, one item per line", type: "textarea", rows: 4, required: true, placeholder: "Salary for September 2026: Rs 48,000\nSalary for 1 to 15 October 2026: Rs 24,000\nLeave encashment for 12 days: Rs 19,200" },
      { id: "total", label: "Total due (Rs)", type: "number" },
      { id: "days", label: "Days you are giving them to pay", type: "number", placeholder: "7" },
    ],
    render: (f) => `By Email and Registered Post A.D.

Date: ${today()}

To,
The Managing Director / HR Head,
${v(f.company)}
${v(f.company_address)}

Subject: Demand for payment of unpaid salary and dues${f.total ? ` of Rs ${f.total}` : ""}

Sir/Madam,

1. I, ${v(f.name)}${f.employee_id ? ` (Employee ID ${f.employee_id})` : ""}, was employed with your company as ${v(f.designation)} from ${v(f.joined)}${f.left ? ` to ${f.left}, my last working day` : ""}.

2. The following amounts are due to me and remain unpaid:
${numbered(f.dues)}
${f.total ? `\nTotal: Rs ${f.total}\n` : ""}
3. I have done the work these amounts are for, and ${f.left ? "my final settlement was due within two working days of my leaving under Section 17(2) of the Code on Wages, 2019" : "they fell due on the company's usual pay dates"}. My requests to pay them have not been met.

4. I call upon you to pay the full amount due within ${v(f.days, "7")} days of receiving this notice, along with my salary slips${f.left ? ", relieving letter and experience certificate" : ""}.

5. If you fail to do so, I will file a claim before the competent authority under the Code on Wages, 2019, and take any other legal proceedings open to me, at your risk as to costs.

${v(f.name)}
${v(f.address)}

Signature: __________`,
  },
  {
    slug: "legal-aid-application",
    title: "Legal aid application (free lawyer)",
    blurb: "Ask the District Legal Services Authority for a free lawyer under the Legal Services Authorities Act, 1987.",
    note: "Take it to the District Legal Services Authority office (usually inside the district court complex), or apply online on the NALSA portal, or call 15100. Attach proof of the category you fall in (for example a caste certificate, disability certificate, or an income certificate or affidavit) and copies of any papers in your case. If you qualify and have a case worth pursuing, the Authority assigns a lawyer and pays the court fees. Not sure if you qualify? Use Nyaya's free legal aid checker first.",
    rights: "free-legal-aid",
    fields: [
      { id: "district", label: "District", required: true, placeholder: "e.g. South District, Saket, New Delhi" },
      { id: "name", label: "Your name", required: true },
      { id: "relation", label: "Son / daughter / wife of (optional)" },
      { id: "age", label: "Age" },
      { id: "address", label: "Your address", type: "textarea" },
      { id: "phone", label: "Phone number" },
      { id: "category", label: "Why you qualify", type: "select", options: ["I am a woman", "I am a child (or applying for a child)", "I belong to a Scheduled Caste or Scheduled Tribe", "I am a person with a disability", "I am an industrial worker", "I am in custody", "I am a victim of trafficking or forced labour", "I am a victim of a disaster, ethnic or caste violence", "My annual income is below the limit"] },
      { id: "income", label: "Annual family income (Rs, optional)", type: "number" },
      { id: "matter", label: "Your legal problem, briefly", type: "textarea", rows: 5, required: true, placeholder: "My husband left me and our two children in March 2026 and pays nothing. I want to claim maintenance." },
      { id: "court", label: "Court and case number, if a case is already filed (optional)" },
    ],
    render: (f) => `To,
The Member Secretary / Secretary,
District Legal Services Authority,
${v(f.district)}

Subject: Application for free legal services under Sections 12 and 13 of the Legal Services Authorities Act, 1987

Sir/Madam,

1. Name: ${v(f.name)}${f.relation ? `, ${f.relation}` : ""}
   Age: ${v(f.age)}
   Address: ${v(f.address)}
   Phone: ${v(f.phone)}

2. I am entitled to free legal services under Section 12 of the Act because: ${v(f.category)}.${f.income ? `\n   My annual family income is Rs ${f.income}.` : ""}

3. My legal problem:
${v(f.matter)}
${f.court ? `\n4. Case already filed: ${f.court}\n` : ""}
I request you to provide me free legal services, including a panel lawyer to advise and represent me, and the court fees and other costs of the case.

I declare that the facts above are true to the best of my knowledge. I am attaching proof of my eligibility and copies of the papers I have.

Name: ${v(f.name)}
Date: ${today()}
Place: __________

Signature / Thumb impression: __________`,
  },
];

export const findTemplate = (slug) => TEMPLATES.find((t) => t.slug === slug);
