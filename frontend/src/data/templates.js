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
];

export const findTemplate = (slug) => TEMPLATES.find((t) => t.slug === slug);
