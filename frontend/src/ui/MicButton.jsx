import { useEffect, useRef, useState } from "react";
import { getLang, speechLang } from "../api";

const Recognition = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

// Speak the question instead of typing it. Uses the browser's own speech
// recognition (Chrome, Edge, Safari), in the chosen Indian language to match the
// answer language. Hidden where the browser has none.
export default function MicButton({ onText, onFinal }) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const rec = useRef(null);

  useEffect(() => () => rec.current?.abort(), []);
  if (!Recognition) return null;

  function toggle() {
    if (listening) { rec.current?.stop(); return; }
    setError("");
    const r = new Recognition();
    r.lang = speechLang();
    r.interimResults = true;
    r.maxAlternatives = 1;
    let finalText = "";
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      onText((finalText + interim).trim());
    };
    r.onerror = (e) => {
      setError(e.error === "not-allowed" ? "Allow the microphone to speak your question." : e.error === "no-speech" ? "Didn't catch that. Try again." : "");
    };
    r.onend = () => {
      setListening(false);
      if (finalText.trim()) onFinal?.(finalText.trim());
    };
    rec.current = r;
    r.start();
    setListening(true);
  }

  return (
    <>
      <button type="button" className={`mic${listening ? " mic--on" : ""}`} onClick={toggle} aria-pressed={listening}
        aria-label={listening ? "Stop listening" : getLang() === "hi" ? "Speak your question in Hindi" : "Speak your question"}
        title={getLang() === "hi" ? "हिन्दी में बोलें" : "Speak"}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
        </svg>
      </button>
      {error && <span className="mic-error" role="status">{error}</span>}
    </>
  );
}
