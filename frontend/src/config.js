// Nyaya Pro is paused until Cashfree is live. To bring it back, set this to true
// and set PRO_ENABLED=1 on the backend (Cloud Run env var).
export const PRO_ON = false;

// The Nyaya WhatsApp bot (+91 91364 23655).
export const WHATSAPP_URL = "https://wa.me/919136423655";

// Prefilled WhatsApp links: open the chat with the first message typed in.
export const waText = (text) => `${WHATSAPP_URL}?text=${encodeURIComponent(text)}`;
export const WA_DAILY = waText("daily");
