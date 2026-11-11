// The scales of justice, drawn live. Idle, the beam breathes. While a search
// runs, the pans weigh the evidence and swing. When the answer lands with its
// sources, the beam settles level and the fulcrum glows.

export default function Scales({ status = "ready", size = 120 }) {
  return (
    <svg
      className={`scales scales--${status}`}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="scales-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF6B5B" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FF6B5B" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle className="scales-glow" cx="60" cy="30" r="26" fill="url(#scales-glow)" />
      {/* pillar and base */}
      <path d="M60 30 V100" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M40 104 H80" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M48 100 H72" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
      <circle cx="60" cy="27" r="3.4" className="scales-pivot" />
      {/* the beam and pans swing together around the pivot */}
      <g className="scales-beam">
        <path d="M22 32 H98" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <g className="scales-pan scales-pan--l">
          <path d="M22 32 L12 62 M22 32 L32 62" stroke="currentColor" strokeWidth="1.1" opacity="0.7" />
          <path d="M8 62 Q22 74 36 62 Z" fill="currentColor" opacity="0.9" />
        </g>
        <g className="scales-pan scales-pan--r">
          <path d="M98 32 L88 62 M98 32 L108 62" stroke="currentColor" strokeWidth="1.1" opacity="0.7" />
          <path d="M84 62 Q98 74 112 62 Z" fill="currentColor" opacity="0.9" />
        </g>
      </g>
    </svg>
  );
}
