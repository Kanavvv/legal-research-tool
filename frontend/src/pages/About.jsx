export default function About() {
  return (
    <main id="main" className="station station--narrow">
      <article className="prose prose--page">
      <h1>How Nyaya <em>works</em>.</h1>
      <p className="prose-lead">
        Nyaya is a free research tool that searches real Indian judgments and Acts, and answers legal questions with citations grounded in the actual text.
      </p>

      <h2>How it works</h2>
      <p>
        When you ask a question, Nyaya doesn't just match keywords. Each judgment in our
        database has been broken into passages and converted into a mathematical representation
        of its meaning using an AI embedding model. Your question goes through the same process,
        and the system finds passages whose meaning is closest to what you asked -- even if the
        exact words don't match.
      </p>
      <p>
        Those candidate passages are then re-ranked by a second, more precise model before being
        handed to Claude (Anthropic's AI), which reads them and writes a structured answer,
        citing exactly which passage supports each claim.
      </p>

      <h2>Our data</h2>
      <p>
        Supreme Court judgments come from the public{" "}
        <a href="https://github.com/vanga/indian-supreme-court-judgments" target="_blank" rel="noreferrer">
          Indian Supreme Court Judgments dataset
        </a>
        , and High Court judgments (Delhi, Bombay, Madras, Karnataka, Allahabad and Calcutta) from its
        companion High Court dataset, both hosted on AWS Open Data and licensed CC-BY-4.0. This is official
        eCourts data made publicly available.
      </p>
      <p>
        The text of the Acts comes from India Code. The Bharatiya Nyaya Sanhita, Bharatiya Nagarik Suraksha
        Sanhita and Bharatiya Sakshya Adhiniyam come from the Acts as published (via PRS Legislative Research),
        and the old IPC, CrPC and Evidence Act from public section-by-section copies. The IPC ↔ BNS matches are
        worked out by comparing the section texts and checked against known pairs.
      </p>

      <h2>Limitations</h2>
      <ul>
        <li>Our database currently covers a growing subset of judgments, not the complete historical archive.</li>
        <li>AI-generated answers can occasionally misread or misattribute details -- always verify against the actual judgment for anything important.</li>
        <li>Nyaya provides research assistance, not legal advice. See our <a href="/terms">Terms of Service</a> for details.</li>
      </ul>

      <h2>Why we built this</h2>
      <p>
        Legal research shouldn't require expensive subscriptions or knowing the exact right
        keywords. Nyaya is an attempt to make searching real case law more accessible, especially
        for students and early-career researchers.
      </p>
      </article>
    </main>
  );
}
