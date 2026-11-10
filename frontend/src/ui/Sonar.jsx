// Loading state for the deeper stations: a sonar sweep with a status line.
export default function Sonar({ text }) {
  return (
    <div className="sonar sonar--inline" role="status">
      <span className="sonar-ring" aria-hidden="true" />
      <span className="sonar-text">{text}</span>
    </div>
  );
}
