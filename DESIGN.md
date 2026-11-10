# Nyaya design system

Direction (2026-11-11): a near-black canvas lit by slow light currents, one acid-lime accent, and a live
diagram of the real search pipeline as the hero. Inspired by the Relay template the owner picked; built
with the impeccable and motionsites-web-builder skills. Replaces the retired newspaper look.

## Tokens (frontend/src/App.css `:root`)
- Background `#050605`; raised panels `#0b0d0c`.
- Ink `#f2f4ee`, with opacity steps 80 / 64 / 50 % for secondary and muted text. Borders are ink at 9 % and 16 %.
- Accent lime `#d4f36b` (text on it `#0b0d0c`). Used only for: primary buttons, status dots, citation chips, active states.
- Teal `#5ee6d0` and blue `#4fa3ff` appear only inside the background currents and the relevance meter.
- Error `#ff8a7a`.

## Type
- Geist 400/500 for everything. Headlines 500, tracking -0.045 to -0.048em, line-height ~1.
- One italic word per headline in Instrument Serif, at ink 80 % ("Indian law, *answered* with receipts.").
- Geist Mono 12px, lowercase, for labels, statuses and metadata ("free / no sign-up / not legal advice").

## Surfaces
- One material, `.card`: faint white gradient, 1px hairline, 20px radius, inner top highlight, backdrop blur.
  Reading surfaces (answer, sources, games, forms) use a near-opaque fill so the currents never cross text.
- Buttons are pills. Primary lime; secondary glass; lime CTAs carry a dark arrow disc.

## Motion
- Entrance: nav drops in, hero lines rise from a mask, the rest fades up with blur, 0.1s steps, ease `cubic-bezier(.22,1,.36,1)`.
- Scroll reveals once via `ui/Reveal.jsx`.
- Background: `ui/Currents.jsx` canvas of 64 strands; flares when a search starts and when an answer lands (`pulseCurrents`).
- Hero diagram `ui/Pipeline.jsx`: idle demo loop; during a search it follows the real stream and shows measured times.
- Reduced motion: animations collapse to their end state, canvas draws one static frame, videos do not play.

## Media
- Hero light-ribbon video and closing doorway video come from the MotionSites free media shelf (hosted on their CloudFront).
  Swap for self-hosted copies if that host ever goes away; `ui/FadeVideo.jsx` lazy-loads and fades them in.

## Rules
- No eyebrows above headings except the small status pill (owner's chosen reference uses it).
- No emoji as icons; inline SVG only. No invented statistics.
- Every page: `main#main`, visible lime focus ring, 44px touch targets, no horizontal scroll at 390px.
