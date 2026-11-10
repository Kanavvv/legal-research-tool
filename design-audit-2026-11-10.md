# Nyaya frontend audit (2026-11-10)

| # | Dimension | Score | Key finding |
|---|---|---|---|
| 1 | Accessibility | 2 | Search box has no visible focus state; welcome popup isn't a real dialog |
| 2 | Performance | 3 | One ~975 KB JS bundle (docx + Firebase load up front); 4 font families |
| 3 | Theming | 3 | Good light/dark tokens; leftover Vite boilerplate in index.css |
| 4 | Responsive | 2 | Mobile nav breaks words over 3 lines; 20px tap targets |
| 5 | Implementation integrity | 3 | Strong, coherent gazette concept; developer-facing error text |
| **Total** | | **13/20** | **Acceptable** |

## P1
- No visible focus on search input / argument textarea (App.css:253, 1044 `outline:none`, no replacement). /impeccable harden
- Welcome modal: no role="dialog"/aria-modal, Escape does nothing, focus not moved or trapped; "Not today" is a href="#" link (WelcomeModal.jsx:50-68). /impeccable harden
- Labels not tied to inputs: Year/Court/Type filters (Home.jsx:384-401), Account form (Account.jsx:187-196); search input has no label (Home.jsx:355). /impeccable harden
- Error text exposes backend URL and blames user: "Make sure the backend is running at …" (Home.jsx:287). /impeccable clarify
- Functional text 9.5–10.5px (tags, Standard/Explain Simply, Surprise Me, Dim the lamps, Submit Your Query). /impeccable typeset

## P2
- No prefers-reduced-motion anywhere (stamp, press bars, shake, fades). /impeccable animate
- Mobile nav: "Moot Court Desk", "About the Paper" wrap to 3 lines at 375px. /impeccable adapt
- Tap targets ~20px (level toggle, lamp toggle). /impeccable adapt
- index.css is Vite starter: #root width 1126px, text-align:center, purple accent, h1 56px. /impeccable distill
- Theme ignores system dark-mode preference on first visit (App.jsx:18). /impeccable polish
- Heading skip h1 -> h3 on home (games). /impeccable harden
- Single 975 KB bundle; lazy-load docx export, games, Firebase auth UI. /impeccable optimize

## P3
- Email placeholder contrast 4.3:1.
- Kicker label above every heading; card inside card in clippings.

## Notes
- Live site lacks Statute Browser; local has uncommitted Statute Browser + nav/CSS changes.
- Positives: distinctive newspaper world, real tokens for both themes, no horizontal overflow at 375px, streaming answer UX, firebase key correctly gitignored.
