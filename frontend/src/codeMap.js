import MAP from "./data/code_map.json";

// Old code -> new code lookups, built by build_code_map.py from the section texts.
// status: "match" (wording carried over), "close" (closest text; read both), "none".

export function forward(code, num) {
  const table = MAP[code];
  if (!table) return null;
  const row = table.sections[num];
  return row ? { from: code, num, to: table.to, ...row } : null;
}

// New section -> every old section whose closest match it is.
const REVERSE = {};
for (const [oldCode, { to, sections }] of Object.entries(MAP)) {
  for (const [num, row] of Object.entries(sections)) {
    if (row.status === "none") continue;
    const list = ((REVERSE[to] ||= {})[row.new] ||= []);
    list.push({ code: oldCode, num, heading: row.heading, sub: row.sub, status: row.status });
  }
}

export function backward(code, num) {
  return (REVERSE[code]?.[num] || []).sort((a, b) => (a.status === "match" ? 0 : 1) - (b.status === "match" ? 0 : 1));
}

export const isOldCode = (code) => Boolean(MAP[code]);
export const isNewCode = (code) => Boolean(REVERSE[code]);

// Old-code section references in a piece of text ("Section 420 IPC", "s. 438 CrPC",
// "Sections 498A and 406 of the Indian Penal Code", "IPC 302"), with what replaced
// each one on 1 July 2024. Skips a reference when the text already names its new section.
const OLD_CODES = [
  ["ipc", "IPC|I\\.P\\.C\\.?|Indian Penal Code|Penal Code"],
  ["crpc", "CrPC|Cr\\.?\\s?P\\.?\\s?C\\.?|Code of Criminal Procedure"],
  ["iea", "Indian Evidence Act|Evidence Act"],
];
const NUM = "\\d{1,3}[A-Z]{0,2}(?:\\s?\\(\\d+\\))?";
const NUMS = `${NUM}(?:\\s*(?:,|and|&|/|or)\\s*${NUM})*`;
const NEW_SHORT = { bns: "BNS", bnss: "BNSS", bsa: "BSA" };

export function oldLawRefs(text) {
  if (!text) return [];
  const found = new Map();
  for (const [code, names] of OLD_CODES) {
    const patterns = [
      new RegExp(`(?:sections?|secs?\\.?|ss?\\.)\\s*(${NUMS})\\s*(?:of\\s+(?:the\\s+)?)?(?:${names})`, "gi"),
      new RegExp(`(?:${names})\\s*(?:sections?|secs?\\.?|ss?\\.)?\\s*(${NUMS})`, "gi"),
    ];
    for (const re of patterns) {
      for (const m of text.matchAll(re)) {
        for (const raw of m[1].split(/\s*(?:,|and|&|\/|or)\s*/i)) {
          const num = raw.replace(/\s?\(\d+\)/, "").toUpperCase();
          const row = forward(code, num);
          if (!row || row.status === "none" || found.has(`${code}${num}`)) continue;
          const to = NEW_SHORT[row.to];
          const already = new RegExp(`\\b${row.new}\\b[^.\\n]{0,25}${to}\\b|\\b${to}\\b[^.\\n]{0,25}\\b${row.new}\\b`, "i");
          if (already.test(text)) continue;
          found.set(`${code}${num}`, row);
        }
      }
    }
  }
  return [...found.values()].slice(0, 6);
}
