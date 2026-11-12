import { useEffect, useState } from "react";

// Which voice to read with, from the script the answer is written in.
const SCRIPTS = [[/[\u0980-\u09FF]/, "bn-IN"], [/[\u0A80-\u0AFF]/, "gu-IN"], [/[\u0B80-\u0BFF]/, "ta-IN"],
  [/[\u0C00-\u0C7F]/, "te-IN"], [/[\u0C80-\u0CFF]/, "kn-IN"], [/[\u0900-\u097F]/, "hi-IN"]];
const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

// Reads an answer aloud with the browser's own voice, in the language the answer is written in.
export default function SpeakButton({ text }) {
  const [on, setOn] = useState(false);
  useEffect(() => () => canSpeak && window.speechSynthesis.cancel(), []);
  if (!canSpeak || !text) return null;

  function toggle() {
    window.speechSynthesis.cancel();
    if (on) { setOn(false); return; }
    const plain = text
      .replace(/\[Source \d+\]\(#src-\d+\)|\[Source \d+\]/g, "")
      .replace(/[#*_>`|]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const u = new SpeechSynthesisUtterance(plain);
    u.lang = SCRIPTS.find(([rx]) => rx.test(plain))?.[1] || "en-IN";
    u.onend = () => setOn(false);
    u.onerror = () => setOn(false);
    window.speechSynthesis.speak(u);
    setOn(true);
  }

  return (
    <button type="button" className="btn btn--ghost btn--sm" onClick={toggle} aria-pressed={on}>
      {on ? "Stop reading" : "Read aloud"}
    </button>
  );
}
