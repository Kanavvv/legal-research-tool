import { useEffect, useState } from "react";

const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

// Reads an answer aloud with the browser's own voice, in Hindi when the text is in Devanagari.
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
    u.lang = /[ऀ-ॿ]/.test(plain) ? "hi-IN" : "en-IN";
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
