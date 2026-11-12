import { useEffect, useState } from "react";
import { prefersReducedMotion } from "./motion";

// The strip along the bottom of the hero: what Nyaya reads and promises.
// A coral bar walks across it, one promise at a time.

const I = {
  court: <path d="M3 9.5 10 5l7 4.5M4.5 9.5v6M8 9.5v6M12 9.5v6M15.5 9.5v6M3 16.5h14" />,
  bench: <path d="M4 16.5V8l6-3.5L16 8v8.5M3 16.5h14M8 16.5v-4h4v4M7 9.5h6" />,
  act: <path d="M6 3.5h6.5L15 6v10.5H6zM12.5 3.5V6H15M8.5 9.5h4M8.5 12h4M8.5 14.5h2.5" />,
  cite: <path d="M8 6.5H5.5A1.5 1.5 0 0 0 4 8v2.5A1.5 1.5 0 0 0 5.5 12H8V8.5M15.5 6.5H13A1.5 1.5 0 0 0 11.5 8v2.5A1.5 1.5 0 0 0 13 12h2.5V8.5M8 12c0 2-1 3-3 3.5M15.5 12c0 2-1 3-3 3.5" />,
  free: <path d="m4.5 10.5 3.5 3.5 7.5-8" />,
};

const ITEMS = [
  ["court", "Supreme Court", "judgments"],
  ["bench", "Bombay & Delhi HCs", "2023 judgments"],
  ["act", "Central Acts", "read by section"],
  ["cite", "Every claim", "cited to its source"],
  ["free", "Free to use", "no sign-up needed"],
];

export default function HeroFeatures() {
  const [on, setOn] = useState(0);
  const still = prefersReducedMotion();

  useEffect(() => {
    if (still) return;
    const id = setInterval(() => setOn((n) => (n + 1) % ITEMS.length), 3200);
    return () => clearInterval(id);
  }, [still]);

  return (
    <ul className="feats enter" style={{ "--d": 7 }} aria-label="What Nyaya reads">
      {ITEMS.map(([icon, a, b], i) => (
        <li key={a} className={i === on ? "feat feat--on" : "feat"}>
          <span className="feat-bar" aria-hidden="true" />
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{I[icon]}</svg>
          <span>{a}<br /><span className="feat-sub">{b}</span></span>
        </li>
      ))}
    </ul>
  );
}
