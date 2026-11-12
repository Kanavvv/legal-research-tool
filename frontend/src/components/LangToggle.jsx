import { useEffect, useState } from "react";
import { getLang, setLang } from "../api";

// English / Hindi switch for answers. Every copy on the page stays in step.
export default function LangToggle() {
  const [lang, setLocal] = useState(getLang);
  useEffect(() => {
    const on = (e) => setLocal(e.detail);
    window.addEventListener("nyaya-lang", on);
    return () => window.removeEventListener("nyaya-lang", on);
  }, []);
  return (
    <div className="segmented" role="group" aria-label="Answer language">
      <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>English</button>
      <button type="button" lang="hi" aria-pressed={lang === "hi"} onClick={() => setLang("hi")}>हिन्दी</button>
    </div>
  );
}
