import { useState, useEffect, useRef } from "react";
import { playCorrect, playWrong, playClick } from "../sound";
import { submitGameScore } from "../gameScore";
import Leaderboard from "../components/Leaderboard";

const QUESTION_BANK = [
  { q: "Which case established the 'Basic Structure Doctrine', limiting Parliament's power to amend the Constitution?", options: ["Kesavananda Bharati v. State of Kerala", "Maneka Gandhi v. Union of India", "Shah Bano case", "Vishaka v. State of Rajasthan"], answer: 0, note: "Decided in 1973, this case held that Parliament cannot amend the 'basic structure' of the Constitution." },
  { q: "Which case declared the Right to Privacy a fundamental right under Article 21?", options: ["Golaknath v. State of Punjab", "Justice K.S. Puttaswamy v. Union of India", "A.K. Gopalan v. State of Madras", "Indira Nehru Gandhi v. Raj Narain"], answer: 1, note: "The 2017 nine-judge bench decision in Puttaswamy recognized privacy as intrinsic to life and personal liberty." },
  { q: "Which case first laid down guidelines against sexual harassment at the workplace, later codified into law?", options: ["Vishaka v. State of Rajasthan", "Indra Sawhney v. Union of India", "Maneka Gandhi v. Union of India", "Olga Tellis v. Bombay Municipal Corporation"], answer: 0, note: "The 1997 Vishaka guidelines preceded the POSH Act, 2013 by over a decade." },
  { q: "Which Article of the Constitution deals with the Right to Life and Personal Liberty?", options: ["Article 14", "Article 19", "Article 21", "Article 32"], answer: 2, note: "Article 21 has been interpreted expansively since Maneka Gandhi v. Union of India (1978)." },
  { q: "In arbitration law, on what ground can a court set aside an arbitral award for being 'perverse'?", options: ["Any factual disagreement", "Patent illegality or a wrong proposition of law", "A change in market conditions", "The arbitrator's personal opinion"], answer: 1, note: "Courts intervene only in a narrow band: patent illegality or a decision based on a wrong proposition of law." },
  { q: "Which Article guarantees equality before the law?", options: ["Article 14", "Article 15", "Article 16", "Article 17"], answer: 0, note: "Article 14 is the bedrock of India's equal-protection jurisprudence." },
  { q: "What does the Latin maxim 'res judicata' refer to?", options: ["A matter already judged, barring re-litigation", "A thing that speaks for itself", "Let the buyer beware", "A friend of the court"], answer: 0, note: "Res judicata prevents the same parties from re-litigating a matter already finally decided." },
  { q: "Which landmark case upheld reservation but capped it at 50%, with limited exceptions?", options: ["Indra Sawhney v. Union of India", "Champakam Dorairajan v. State of Madras", "M. Nagaraj v. Union of India", "Ashoka Kumar Thakur v. Union of India"], answer: 0, note: "The 1992 Mandal Commission case (Indra Sawhney) set the 50% ceiling on reservations." },
  { q: "Under the Indian Contract Act, what makes an agreement void for 'uncertainty'?", options: ["It is in writing", "Its meaning is not certain or capable of being made certain", "It involves two parties", "It has a lawful object"], answer: 1, note: "Section 29 of the Indian Contract Act, 1872 voids agreements whose meaning is uncertain." },
  { q: "Which case is considered the origin of Public Interest Litigation (PIL) in India?", options: ["S.P. Gupta v. Union of India", "Hussainara Khatoon v. State of Bihar", "Olga Tellis v. Bombay Municipal Corporation", "M.C. Mehta v. Union of India"], answer: 1, note: "Hussainara Khatoon (1979), on undertrial prisoners, is widely seen as the starting point of PIL in India." },
  { q: "What is the standard of proof required in a criminal trial in India?", options: ["Preponderance of probabilities", "Beyond reasonable doubt", "Clear and convincing evidence", "Prima facie satisfaction"], answer: 1, note: "Criminal convictions require proof beyond reasonable doubt, a much higher bar than civil cases." },
  { q: "Which writ is issued to produce a person who has been unlawfully detained?", options: ["Mandamus", "Certiorari", "Habeas Corpus", "Quo Warranto"], answer: 2, note: "Habeas Corpus, literally 'you shall have the body', protects against unlawful detention." },
  { q: "In the Sale of Goods Act, what does 'caveat emptor' mean?", options: ["Let the buyer beware", "Let the seller beware", "Buyer gets a full refund always", "Goods must be inspected by court"], answer: 0, note: "Caveat emptor places the burden on the buyer to examine goods, subject to statutory exceptions." },
  { q: "Which case recognized the 'Right to a Clean Environment' as part of Article 21?", options: ["M.C. Mehta v. Union of India", "Subhash Kumar v. State of Bihar", "Vellore Citizens Welfare Forum v. Union of India", "All of the above, across different rulings"], answer: 3, note: "Indian courts built environmental jurisprudence into Article 21 across several landmark rulings." },
  { q: "What does 'ultra vires' mean in administrative law?", options: ["Within one's powers", "Beyond one's legal power or authority", "In good faith", "By unanimous consent"], answer: 1, note: "An act is ultra vires when it exceeds the authority legally granted to the person or body." },
  { q: "Which amendment introduced the Right to Education as a fundamental right?", options: ["42nd Amendment", "86th Amendment", "73rd Amendment", "101st Amendment"], answer: 1, note: "The 86th Amendment (2002) inserted Article 21A, making free education a fundamental right for children aged 6-14." },
  { q: "In tort law, what is 'vicarious liability'?", options: ["Liability for one's own direct acts only", "Liability imposed on one person for the acts of another, like an employer for an employee", "A defence available only to the government", "Liability that never requires fault"], answer: 1, note: "Employers can be held vicariously liable for torts committed by employees in the course of employment." },
  { q: "What is the minimum age prescribed for a marriage to be valid for a woman under Indian law (per the Prohibition of Child Marriage Act)?", options: ["16", "18", "21", "15"], answer: 1, note: "18 is the minimum legal age of marriage for women under the Prohibition of Child Marriage Act, 2006." },
];

function pickRandomQuestions(count = 6) {
  const shuffled = [...QUESTION_BANK].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function Confetti() {
  const pieces = Array.from({ length: 60 });
  return (
    <div className="confetti-burst">
      {pieces.map((_, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 0.4}s`,
            animationDuration: `${1.8 + Math.random() * 1.2}s`,
            background: ["#9c2b2b", "#2f4f3e", "#c9a84c", "#1f3d30", "#e8ddc4"][i % 5],
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export default function TriviaGame() {
  const [questions] = useState(() => pickRandomQuestions(6));
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [done, setDone] = useState(false);
  const [shake, setShake] = useState(false);
  const [popScore, setPopScore] = useState(false);
  const [gameResult, setGameResult] = useState(null); // backend response after submitting
  const [leaderboardKey, setLeaderboardKey] = useState(0);
  const highScoreRef = useRef(null);

  function pick(i) {
    if (selected !== null) return;
    setSelected(i);
    if (i === questions[current].answer) {
      setScore((s) => s + 1);
      setStreak((s) => {
        const next = s + 1;
        setBestStreak((b) => Math.max(b, next));
        return next;
      });
      setPopScore(true);
      setTimeout(() => setPopScore(false), 700);
      playCorrect();
    } else {
      setStreak(0);
      setShake(true);
      setTimeout(() => setShake(false), 450);
      playWrong();
    }
  }

  function next() {
    playClick();
    if (current + 1 >= questions.length) {
      finishGame();
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
    }
  }

  async function finishGame() {
    setDone(true);
    const result = await submitGameScore("trivia", score, questions.length);
    setGameResult(result);
    setLeaderboardKey((k) => k + 1);
  }

  function restart() {
    window.location.reload(); // simplest way to reshuffle a fresh question set
  }

  const q = questions[current];
  const isGreatScore = done && score >= questions.length - 1;

  return (
    <div className={`puzzle-box ${shake ? "shake" : ""}`}>
      {isGreatScore && <Confetti />}
      <div className="puzzle-number">01</div>
      <div className="puzzle-heading">
        <h3><span className="puzzle-icon">&#128296;</span> The Daily Docket Quiz</h3>
        <p>Landmark Indian law, shuffled fresh every time. No looking things up.</p>
      </div>

      {!done ? (
        <>
          <div className="puzzle-progress-row">
            <div className="puzzle-progress">Question {current + 1} of {questions.length} &middot; Score: {score}</div>
            {streak >= 2 && (
              <div className="streak-badge">&#128293; {streak} in a row</div>
            )}
          </div>
          <div className="quiz-question">{q.q}</div>
          <div className="quiz-options">
            {q.options.map((opt, i) => {
              let cls = "quiz-option";
              if (selected !== null) {
                if (i === q.answer) cls += " correct";
                else if (i === selected) cls += " wrong";
              }
              return (
                <button key={i} className={cls} onClick={() => pick(i)}>
                  {opt}
                  {selected !== null && i === q.answer && popScore && (
                    <span className="score-pop">+1</span>
                  )}
                </button>
              );
            })}
          </div>
          {selected !== null && (
            <div className="quiz-note">
              {selected === q.answer ? "Correct. " : "Not quite. "}
              {q.note}
            </div>
          )}
          {selected !== null && (
            <button className="puzzle-next" onClick={next}>
              {current + 1 >= questions.length ? "See final score" : "Next question"} &rarr;
            </button>
          )}
        </>
      ) : (
        <div className="puzzle-result">
          <div className="puzzle-result-score">{score} / {questions.length}</div>
          <p>
            {score === questions.length ? "Called to the bar with honours." : score >= questions.length - 2 ? "A respectable showing." : "Back to the library with you."}
          </p>
          {bestStreak >= 3 && (
            <div className="streak-badge" style={{ margin: "8px auto" }}>&#128293; Best streak this round: {bestStreak}</div>
          )}
          {gameResult && gameResult.is_new_best && (
            <div className="new-best-banner">&#127942; New personal best!</div>
          )}
          {gameResult && gameResult.streak && gameResult.streak.current > 1 && (
            <div className="new-best-banner" style={{ background: "var(--card)", color: "var(--ink)" }}>
              &#128293; {gameResult.streak.current}-day play streak
            </div>
          )}
          {!gameResult && (
            <p className="related-empty" style={{ marginTop: "8px" }}>
              Sign in to save your streak and climb the leaderboard.
            </p>
          )}
          <button className="puzzle-next" onClick={restart}>Play again, new questions &rarr;</button>
          <div style={{ marginTop: "20px" }}>
            <Leaderboard refreshKey={leaderboardKey} />
          </div>
        </div>
      )}
    </div>
  );
}
