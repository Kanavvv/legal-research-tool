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
