import { Link } from "react-router-dom";
import { waText } from "../config";

export default function About() {
  return (
    <main id="main" className="station station--narrow">
      <article className="prose prose--page">
      <h1>How Nyaya <em>works</em>.</h1>
      <p className="prose-lead">
        Nyaya is a free research tool that searches real Indian judgments and Acts, and answers legal questions with citations grounded in the actual text.
      </p>

      <h2>Who is behind Nyaya</h2>
      <p>
        Nyaya is an independent project built in India. It is not a law firm and does not give legal advice.
        Nobody pays to be mentioned in an answer, and Nyaya does not recommend or rank advocates: the{" "}
        <Link to="/lawyers">lawyer directory</Link> lists only advocates who added themselves, without ranking or
        endorsement, because Bar Council of India rules don't allow advocates to advertise.
      </p>

      <h2>How an answer is made</h2>
      <p>
        When you ask a question, Nyaya doesn't just match keywords. Each judgment in our
        database has been broken into passages and converted into a mathematical representation
        of its meaning using an AI embedding model. Your question goes through the same process,
        and the system finds passages whose meaning is closest to what you asked, even if the
        exact words don't match.
      </p>
      <p>
        Those candidate passages are then re-ranked by a second, more precise model before being
        handed to Claude (Anthropic's AI), which reads them and writes a structured answer,
        citing exactly which passage supports each claim.
      </p>

      <h2 id="checks">How we check answers</h2>
      <ul>
        <li><strong>Every claim points to its source.</strong> Each answer lists the judgments and sections it relied on, and marks which sentence comes from which source, so you can read the original yourself.</li>
        <li><strong>No source, no citation.</strong> When the material Nyaya found doesn't cover part of a question, the answer says "More generally" and attaches no citation to that part, rather than inventing one.</li>
        <li><strong>Old and new criminal law.</strong> Since 1 July 2024 the BNS, BNSS and BSA have replaced the IPC, CrPC and Evidence Act. Answers name the new section and the old one it replaced, and the <Link to="/convert">converter</Link> shows both texts side by side.</li>
        <li><strong>Published answers are dated and reviewed.</strong> Answers in the public <Link to="/answers">answer library</Link> show when they were written and last updated. When an advocate has read and checked one, the page names them and the date they reviewed it.</li>
        <li><strong>Guides are written from the law itself.</strong> The <Link to="/rights">rights guides</Link>, <Link to="/now">"what to do now" guides</Link> and <Link to="/deadlines">deadline calculator</Link> cite the section behind every step.</li>
      </ul>

      <h2>Spotted a mistake?</h2>
      <p>
        Tell us and we'll check it against the source and correct it.{" "}
        <a href={waText("Correction for Nyaya: ")} target="_blank" rel="noreferrer">Send a correction on WhatsApp</a>,
        or use the thumbs-down under any answer to say what's wrong.
      </p>
      <p>
        Are you an advocate? You can help review published answers, with your name and enrolment shown on each one
        you check. <a href={waText("I'm an advocate and would like to review Nyaya answers. Enrolment no.: ")} target="_blank" rel="noreferrer">Message us</a>.
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
        <li>Our database covers a growing subset of judgments, not the complete historical archive.</li>
        <li>AI-generated answers can occasionally misread or misattribute details. Always check the actual judgment for anything important.</li>
        <li>Nyaya provides research help, not legal advice. For anything with a lot at stake, speak to an advocate. If you can't afford one, you may qualify for <Link to="/legal-aid">a free lawyer through legal aid</Link>.</li>
        <li>See our <Link to="/terms">Terms of Use</Link> and <Link to="/privacy">Privacy Policy</Link>.</li>
      </ul>

      <h2>Why we built this</h2>
      <p>
        Most people in India face a legal problem without knowing what the law says or what to do first.
        Legal research shouldn't require expensive subscriptions or knowing the exact right keywords.
        Nyaya is an attempt to make the law itself readable for everyone: people with a problem, and the
        students and young lawyers who help them.
      </p>
      </article>
    </main>
  );
}
