import { useState } from "react";
import { shortDay } from "./shared";

/* ---------- loading state, a one-series bar chart with a hover readout, and a number tile ---------- */
export function Loading({ state, children }) {
  if (state.loading && !state.data) return <p className="adm-muted">Loading…</p>;
  if (state.error) return <p className="adm-error" role="alert">{state.error}</p>;
  return children;
}


export function Bars({ title, values, labels, format, total }) {
  const [hover, setHover] = useState(null);
  const W = 640, H = 150, pad = 24;
  const max = Math.max(...values, 0) || 1;
  const step = (W - pad) / values.length;
  const bw = Math.max(2, step - 2);
  const shown = hover == null ? values.length - 1 : hover;
  return (
    <figure className="adm-chart">
      <figcaption>
        <span>{title}</span>
        <span className="adm-chart-read">
          {shortDay(labels[shown])}: <strong>{format(values[shown])}</strong>
          {total != null && <span className="adm-muted"> · {values.length} days: {format(total)}</span>}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H + 18}`} role="img" aria-label={`${title}, last ${values.length} days`}
           onMouseLeave={() => setHover(null)}>
        <line x1={pad} x2={W} y1={H} y2={H} className="adm-axis" />
        <text x={pad - 4} y={10} className="adm-tick" textAnchor="end">{format(max)}</text>
        {values.map((v, i) => {
          const h = v > 0 ? Math.max(2, (v / max) * (H - 14)) : 0;
          const x = pad + i * step;
          return (
            <g key={labels[i]} onMouseEnter={() => setHover(i)}>
              <rect x={x} y={0} width={step} height={H} fill="transparent" />
              {h > 0 && <path className={i === shown ? "adm-bar adm-bar--on" : "adm-bar"}
                d={`M${x},${H} V${H - h + Math.min(3, h / 2)} q0,-${Math.min(3, h / 2)} ${Math.min(3, bw / 2)},-${Math.min(3, h / 2)} H${x + bw - Math.min(3, bw / 2)} q${Math.min(3, bw / 2)},0 ${Math.min(3, bw / 2)},${Math.min(3, h / 2)} V${H} Z`} />}
            </g>
          );
        })}
        <text x={pad} y={H + 14} className="adm-tick">{shortDay(labels[0])}</text>
        <text x={W} y={H + 14} className="adm-tick" textAnchor="end">today</text>
      </svg>
      <details className="adm-table-toggle">
        <summary>Table</summary>
        <table className="adm-table adm-table--compact">
          <tbody>{labels.slice().reverse().map((d, i) => <tr key={d}><td>{shortDay(d)}</td><td>{format(values[values.length - 1 - i])}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}


export function Tile({ label, value, note, tone }) {
  return (
    <div className={`adm-tile${tone ? ` adm-tile--${tone}` : ""}`}>
      <span className="adm-tile-label">{label}</span>
      <span className="adm-tile-value">{value}</span>
      {note && <span className="adm-tile-note">{note}</span>}
    </div>
  );
}

