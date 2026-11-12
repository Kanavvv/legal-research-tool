// How much weight a source carries, in plain words, from its court.
// Article 141: Supreme Court law binds every court in India. A High Court binds
// the courts below it in its own state and is persuasive elsewhere.
export function courtWeight(s) {
  if (!s) return null;
  if (s.doc_type === "statute") return { level: "act", short: "the law itself", long: "Text of the Act or section" };
  const court = s.court || "";
  if (/supreme court/i.test(court) || /^sc$/i.test(court.trim())) {
    return { level: "sc", short: "binding on all courts", long: "Supreme Court: binding on every court in India (Article 141)" };
  }
  const hc = court.match(/^(.*?)\s*high court/i);
  if (hc) {
    const where = hc[1].trim();
    return {
      level: "hc",
      short: where ? `binding in ${where} courts` : "binding in its state",
      long: "High Court: binding on lower courts in its state, persuasive elsewhere",
    };
  }
  if (/tribunal|commission|forum|nclt|nclat|itat|cat\b/i.test(court)) {
    return { level: "other", short: "tribunal ruling", long: "Tribunal or commission: persuasive, binds only its own proceedings" };
  }
  return null;
}
