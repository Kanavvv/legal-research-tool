// The hero's live diagram: the real path a question takes through Nyaya.
// Idle, it runs a slow demo loop. During a search it follows the actual
// stream, and each node shows how long its stage really took.

const NODES = [
  { id: "q", step: 0, x: 0, y: 40, title: "Question", sub: "plain English" },
  { id: "embed", step: 1, x: 26.5, y: 40, title: "Understand", sub: "by meaning" },
  { id: "sc", step: 2, x: 53, y: 6, title: "Judgments", sub: "SC + Bombay, Delhi HC" },
  { id: "acts", step: 2, x: 53, y: 74, title: "Acts", sub: "by section" },
  { id: "rerank", step: 3, x: 79.5, y: 40, title: "Re-rank", sub: "best matches" },
];

const EDGES = [
  ["q", "embed"],
  ["embed", "sc"],
  ["embed", "acts"],
  ["sc", "rerank"],
  ["acts", "rerank"],
];

// Node anchor points in a 100 x 100 box (nodes are 20.5 wide, 20 tall)
function anchor(id, side) {
  const n = NODES.find((x) => x.id === id);
  return { x: side === "out" ? n.x + 20.5 : n.x, y: n.y + 10 };
}

function edgePath(a, b) {
  const p = anchor(a, "out");
  const q = anchor(b, "in");
  const mid = (p.x + q.x) / 2;
  return `M ${p.x} ${p.y} C ${mid} ${p.y}, ${mid} ${q.y}, ${q.x} ${q.y}`;
}

function fmt(ms) {
  if (ms == null) return null;
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
}

export default function Pipeline({ step, status, question, timings = {}, log = [], onReplay }) {
  // status: "ready" | "running" | "answered" | "error"
  const demo = status === "ready";
  const stateOf = (s) => (demo ? "demo" : s < step ? "done" : s === step ? "on" : "off");
  const statusLabel = { ready: "ready", running: "running", answered: "answered", error: "line lost" }[status];

  return (
    <figure className={`pipe pipe--${status}`} aria-label="How Nyaya answers a question">
      <header className="pipe-head">
        <span className="pipe-q" title={question || undefined}>{question || "Any question about Indian law"}</span>
        <span className="pipe-meta">5 stages / 2 sources of law</span>
        <span className={`pipe-status pipe-status--${status}`}>
          <span className="dot" aria-hidden="true" />{statusLabel}
        </span>
      </header>

      <div className="pipe-stage">
        <svg className="pipe-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M 89.75 60 L 89.75 100" className={`edge edge--${stateOf(4)}`} vectorEffect="non-scaling-stroke" />
          {EDGES.map(([a, b]) => {
            const to = NODES.find((n) => n.id === b);
            const st = stateOf(to.step);
            return <path key={a + b} d={edgePath(a, b)} className={`edge edge--${st}`} vectorEffect="non-scaling-stroke" />;
          })}
        </svg>

        {NODES.map((n, i) => {
          const st = stateOf(n.step);
          const time = fmt(timings[n.step]);
          return (
            <div key={n.id} className={`node node--${st}`} style={{ left: `${n.x}%`, top: `${n.y}%`, "--i": i }}>
              <span className="node-title">{n.title}</span>
              <span className="node-sub">{time && st === "done" ? time : n.sub}</span>
            </div>
          );
        })}

      </div>

      <div className={`answer-node answer-node--${stateOf(4)}`}>
          <span className="answer-node-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <span className="node-title">Cited answer</span>
          <span className="node-sub">{status === "answered" && timings.total ? `answered in ${fmt(timings.total)}` : "every claim linked to its source"}</span>
      </div>

      <footer className="pipe-log">
        <span className="pipe-log-title">{log.length ? "your last dives" : "try one"}</span>
        <ul>
          {(log.length ? log : [
            { q: "Can a landlord evict a tenant without notice?" },
            { q: "When is circumstantial evidence enough to convict?" },
            { q: "What is the test for trademark infringement?" },
          ]).slice(0, 3).map((row) => (
            <li key={row.q}>
              <button type="button" onClick={() => onReplay(row.q)} disabled={status === "running"}>
                <span className="dot" aria-hidden="true" />
                <span className="pipe-log-q">{row.q}</span>
                {row.ms && <span className="pipe-log-ms">{fmt(row.ms)}</span>}
              </button>
            </li>
          ))}
        </ul>
      </footer>
    </figure>
  );
}
