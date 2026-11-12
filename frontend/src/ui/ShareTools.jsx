import { useState } from "react";
import { trackEvent } from "./track";
import { WHATSAPP_URL } from "../config";

// "Send on WhatsApp" and "Save as picture" for any answer.
// Pass `url` when the page already has a link, or `getLink` (async) to make one on demand.
export default function ShareTools({ question, answer, sources = 0, url, getLink, text, event = "friend_wa", card = true }) {
  const [waNote, setWaNote] = useState("");
  const [cardNote, setCardNote] = useState("");
  const [fallback, setFallback] = useState("");

  function waHref(link) {
    const lead = text || `${question.trim().slice(0, 200)}\n\nI asked Nyaya. Here's the answer, with the law behind it:`;
    // The forward carries Nyaya's own number, so whoever receives it can ask their own question.
    const invite = `\n\nAsk your own question free on WhatsApp: ${WHATSAPP_URL}`;
    return `https://wa.me/?text=${encodeURIComponent(`${lead}\n${link}${invite}`)}`;
  }

  function withRef(link) {
    return `${link}${link.includes("?") ? "&" : "?"}ref=wa`;
  }

  async function sendWa(e) {
    if (url) { trackEvent(event); return; } // plain link: the <a> does the work
    e.preventDefault();
    // Open the window now, while the tap still counts, then point it at WhatsApp once the link exists.
    const w = window.open("about:blank", "_blank");
    setWaNote("Making a link…");
    try {
      const link = withRef(await getLink());
      const href = waHref(link);
      trackEvent(event);
      if (w) { w.location.href = href; setWaNote(""); } else { setFallback(href); setWaNote(""); }
    } catch {
      w?.close();
      setWaNote("Couldn't make a link. Try again.");
    }
  }

  async function saveCard() {
    setCardNote("Drawing…");
    try {
      const { drawAnswerCard, shareOrSaveCard } = await import("./answerCard");
      const blob = await drawAnswerCard({ question, answer, sources });
      const how = await shareOrSaveCard(blob);
      if (how !== "cancelled") trackEvent(how === "shared" ? "card_shared" : "card_saved");
      setCardNote(how === "saved" ? "Saved" : how === "shared" ? "Shared" : "");
      setTimeout(() => setCardNote(""), 2500);
    } catch {
      setCardNote("Couldn't draw it");
    }
  }

  return (
    <>
      <a className="btn btn--ghost btn--sm btn--wa" href={url ? waHref(withRef(url)) : "#"} target="_blank" rel="noreferrer" onClick={sendWa}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 18.7z" /></svg>
        {waNote || "Send on WhatsApp"}
      </a>
      {fallback && <a className="btn btn--lime btn--sm" href={fallback} target="_blank" rel="noreferrer" onClick={() => setFallback("")}>Open WhatsApp</a>}
      {card && <button type="button" className="btn btn--ghost btn--sm" onClick={saveCard}>{cardNote || "Save as picture"}</button>}
    </>
  );
}
