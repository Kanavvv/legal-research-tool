import { useState } from "react";
import { playCorrect, playWrong, playClick } from "../sound";

const QUESTIONS = [
  {
    q: "Which case established the 'Basic Structure Doctrine', limiting Parliament's power to amend the Constitution?",
    options: ["Kesavananda Bharati v. State of Kerala", "Maneka Gandhi v. Union of India", "Shah Bano case", "Vishaka v. State of Rajasthan"],
    answer: 0,
    note: "Decided in 1973, this case held that Parliament cannot amend the 'basic structure' of the Constitution.",
  },
  {
    q: "Which case declared the Right to Privacy a fundamental right under Article 21?",
    options: ["Golaknath v. State of Punjab", "Justice K.S. Puttaswamy v. Union of India", "A.K. Gopalan v. State of Madras", "Indira Nehru Gandhi v. Raj Narain"],
    answer: 1,
    note: "The 2017 nine-judge bench decision in Puttaswamy recognized privacy as intrinsic to life and personal liberty.",
  },
  {
    q: "Which case first laid down guidelines against sexual harassment at the workplace, later codified into law?",
    options: ["Vishaka v. State of Rajasthan", "Indra Sawhney v. Union of India", "Maneka Gandhi v. Union of India", "Olga Tellis v. Bombay Municipal Corporation"],
    answer: 0,
    note: "The 1997 Vishaka guidelines preceded the POSH Act, 2013 by over a decade.",
  },
  {
    q: "Which Article of the Constitution deals with the Right to Life and Personal Liberty?",
    options: ["Article 14", "Article 19", "Article 21", "Article 32"],
    answer: 2,
    note: "Article 21 has been interpreted expansively since Maneka Gandhi v. Union of India (1978).",
  },
  {
    q: "In arbitration law, on what ground can a court set aside an arbitral award for being 'perverse'?",
    options: ["Any factual disagreement", "Patent illegality or a wrong proposition of law", "A change in market conditions", "The arbitrator's personal opinion"],
    answer: 1,
    note: "Courts intervene only in a narrow band: patent illegality or a decision based on a wrong proposition of law.",
  },
];

export default function TriviaGame() {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  function pick(i) {
    if (selected !== null) return;
    setSelected(i);
    if (i === QUESTIONS[current].answer) { setScore((s) => s + 1); playCorrect(); }
    else playWrong();
  }

  function next() {
    playClick();
    if (current + 1 >= QUESTIONS.length) {
      setDone(true);
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
    }
  }

  function restart() {
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setDone(false);
  }

  const q = QUESTIONS[current];

  return (
    <div className="puzzle-box">
      <div className="puzzle-number">01</div>
      <div className="puzzle-heading">
        <h3><span className="puzzle-icon">&#128296;</span> The Daily Docket Quiz</h3>
        <p>Five questions on landmark Indian law. No looking things up.</p>
      </div>

      {!done ? (
        <>
          <div className="puzzle-progress">Question {current + 1} of {QUESTIONS.length} &middot; Score: {score}</div>
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
              {current + 1 >= QUESTIONS.length ? "See final score" : "Next question"} &rarr;
            </button>
          )}
        </>
      ) : (
        <div className="puzzle-result">
          <div className="puzzle-result-score">{score} / {QUESTIONS.length}</div>
          <p>{score === QUESTIONS.length ? "Called to the bar with honours." : score >= 3 ? "A respectable showing." : "Back to the library with you."}</p>
          <button className="puzzle-next" onClick={restart}>Try again &rarr;</button>
        </div>
      )}
    </div>
  );
}
