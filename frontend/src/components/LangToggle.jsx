import { useEffect, useState } from "react";
import { getLang, setLang, LANGS } from "../api";

// Answer language for the whole site. English and Hindi are one tap; the other
// Indian languages sit in a menu next to them. Every copy on the page stays in step.
export default function LangToggle() {
  const [lang, setLocal] = useState(getLang);
  useEffect(() => {
    const on = (e) => setLocal(e.detail);
    window.addEventListener("nyaya-lang", on);
    return () => window.removeEventListener("nyaya-lang", on);
  }, []);
  const more = LANGS.slice(2);
  const inMore = more.some((l) => l.code === lang);
  return (
    <div className="lang-pick">
      <div className="segmented" role="group" aria-label="Answer language">
        <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>English</button>
        <button type="button" lang="hi" aria-pressed={lang === "hi"} onClick={() => setLang("hi")}>हिन्दी</button>
      </div>
      <label className="sr-only" htmlFor="lang-more">More answer languages</label>
      <select id="lang-more" className={`lang-more${inMore ? " lang-more--on" : ""}`} value={inMore ? lang : ""}
        onChange={(e) => e.target.value && setLang(e.target.value)}>
        <option value="">More languages</option>
        {more.map((l) => <option key={l.code} value={l.code} lang={l.code}>{l.name} · {l.en}</option>)}
      </select>
    </div>
  );
}
