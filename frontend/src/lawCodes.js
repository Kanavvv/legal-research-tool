// Acts Nyaya holds section by section: URL slug -> names. The slug is also the
// prefix of each section's id in the index ("bns_s318").
export const ACTS = {
  bns: { short: "BNS", name: "Bharatiya Nyaya Sanhita, 2023", replaces: "ipc" },
  bnss: { short: "BNSS", name: "Bharatiya Nagarik Suraksha Sanhita, 2023", replaces: "crpc" },
  bsa: { short: "BSA", name: "Bharatiya Sakshya Adhiniyam, 2023", replaces: "iea" },
  ipc: { short: "IPC", name: "Indian Penal Code, 1860", replacedBy: "bns" },
  crpc: { short: "CrPC", name: "Code of Criminal Procedure, 1973", replacedBy: "bnss" },
  iea: { short: "Evidence Act", name: "Indian Evidence Act, 1872", replacedBy: "bsa" },
  cpc: { short: "CPC", name: "Code of Civil Procedure, 1908" },
  "constitution-of-india": { short: "Constitution", name: "Constitution of India", unit: "Article" },
  "contract-act": { short: "Contract Act", name: "Indian Contract Act, 1872" },
  "tp-act": { short: "TP Act", name: "Transfer of Property Act, 1882" },
  "ni-act": { short: "NI Act", name: "Negotiable Instruments Act, 1881" },
  "mv-act": { short: "MV Act", name: "Motor Vehicles Act, 1988" },
  "consumer-protection-act": { short: "Consumer Protection Act", name: "Consumer Protection Act, 2019" },
  "arbitration-act": { short: "Arbitration Act", name: "Arbitration and Conciliation Act, 1996" },
  "hindu-marriage-act": { short: "Hindu Marriage Act", name: "Hindu Marriage Act, 1955" },
  "specific-relief-act": { short: "Specific Relief Act", name: "Specific Relief Act, 1963" },
  "sale-of-goods-act": { short: "Sale of Goods Act", name: "Sale of Goods Act, 1930" },
  "divorce-act": { short: "Divorce Act", name: "Divorce Act, 1869" },
};

export const sectionPath = (act, num) => `/law/${act}/${encodeURIComponent(num)}`;
export const sectionLabel = (act, num) => `${ACTS[act]?.unit === "Article" ? "Art." : (ACTS[act]?.short || act.toUpperCase()) + " s."}${num}`;

// "IPC 420", "420 ipc", "s. 438 Cr.P.C.", "BNS 318(4)", "65B evidence" -> { code, num }
const CODE_WORDS = [
  ["bnss", /\bb\.?\s*n\.?\s*s\.?\s*s\.?\b|nagarik/],
  ["bns", /\bb\.?\s*n\.?\s*s\.?\b|nyaya sanhita/],
  ["bsa", /\bb\.?\s*s\.?\s*a\.?\b|sakshya/],
  ["crpc", /\bcr\.?\s*p\.?\s*c\.?\b|criminal procedure/],
  ["ipc", /\bi\.?\s*p\.?\s*c\.?\b|penal code/],
  ["iea", /\biea\b|evidence act|\bevidence\b/],
];
export function parseCodeQuery(q) {
  const s = q.toLowerCase();
  const code = CODE_WORDS.find(([, re]) => re.test(s))?.[0];
  const m = s.match(/\b(\d{1,3}[a-z]{0,2})(?:\s*\(\s*\d+\s*\))?/);
  if (!code || !m) return null;
  return { code, num: m[1].toUpperCase() };
}
