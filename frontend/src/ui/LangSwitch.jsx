export default function LangSwitch({ lang, onChange }) {
  return (
    <div className="segmented" role="group" aria-label="Language">
      <button type="button" aria-pressed={lang === "en"} onClick={() => onChange("en")}>English</button>
      <button type="button" aria-pressed={lang === "hi"} onClick={() => onChange("hi")} lang="hi">हिन्दी</button>
    </div>
  );
}
