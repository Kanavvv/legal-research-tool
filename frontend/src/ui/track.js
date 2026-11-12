import { API_URL } from "../api";

// Our own anonymous counts: one number per page and a few share events, per day. Sent only
// when the visitor tapped "Allow" on the consent banner. No IDs, no cookies, nothing personal.

function allowed() {
  try { return localStorage.getItem("nyaya-consent") === "yes"; } catch { return false; }
}

function send(body) {
  if (!allowed()) return;
  const blob = new Blob([JSON.stringify(body)], { type: "text/plain" });
  try {
    if (navigator.sendBeacon && navigator.sendBeacon(`${API_URL}/hit`, blob)) return;
  } catch { /* fall through */ }
  fetch(`${API_URL}/hit`, { method: "POST", body: blob, keepalive: true }).catch(() => {});
}

let landed = false;

export function trackPage(path) {
  const body = { path, mobile: window.matchMedia("(pointer: coarse)").matches };
  if (!landed) {
    landed = true;
    body.landing = true;
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) body.ref = ref;
    try { if (document.referrer) body.from = new URL(document.referrer).hostname; } catch { /* bad referrer */ }
  }
  send(body);
}

export function trackEvent(event) {
  send({ event });
}
