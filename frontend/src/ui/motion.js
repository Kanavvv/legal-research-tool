// Shared motion helpers.

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Ask the background currents to flare up for a moment (a search started, an answer landed). */
export function pulseCurrents(strength = 1) {
  window.dispatchEvent(new CustomEvent("nyaya:pulse", { detail: { strength } }));
}

export function smoothScrollTo(el, block = "start") {
  if (!el) return;
  el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block });
}
