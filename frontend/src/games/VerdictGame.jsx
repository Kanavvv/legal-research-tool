import { useState } from "react";
import { playCorrect, playWrong, playClick } from "../sound";

// Illustrative hypothetical scenarios based on real legal principles --
// not accounts of specific real cases with invented outcomes.
const SCENARIOS = [
  {
    facts: "A buyer signs an agreement to purchase a house, paying earnest money. The seller later refuses to sell, having found a buyer willing to pay more. The original buyer sues, asking the court to force the sale rather than just return the money.",
    question: "What is the buyer most likely asking the court for?",
    options: ["Specific performance", "A criminal complaint", "Judicial review", "Habeas corpus"],
    answer: 0,
    note: "Specific performance is an equitable remedy compelling a party to fulfil a contract, used when monetary compensation alone (a refund) wouldn't be adequate -- common in property disputes.",
  },
  {
    facts: "Two parties sign a contract with a clause stating any dispute will be resolved by a named arbitrator, not the courts. A dispute arises, and one party goes straight to a civil court instead.",
    question: "What will the court typically do?",
    options: ["Hear the case fully, ignoring the clause", "Refer the parties back to arbitration", "Dismiss the case permanently", "Appoint a new arbitrator itself"],
    answer: 1,
    note: "Under the Arbitration and Conciliation Act, courts generally hold parties to a valid arbitration agreement and refer disputes back to arbitration.",
  },
  {
    facts: "A person is injured due to a company's defective product. Three years later, they finally decide to sue. The company argues the case shouldn't even be heard.",
    question: "What is the company's most likely defense?",
    options: ["Lack of jurisdiction", "The claim is barred by limitation", "Res judicata", "Force majeure"],
    answer: 1,
    note: "Most civil claims in India must be filed within a limitation period (often 3 years for such claims) -- filing too late can bar the case entirely, regardless of its merits.",
  },
];

export default function VerdictGame() {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  function pick(i) {
    if (selected !== null) return;
    setSelected(i);
    if (i === SCENARIOS[current].answer) { setScore((s) => s + 1); playCorrect(); }
    else playWrong();
  }

  function next() {
    playClick();
    if (current + 1 >= SCENARIOS.length) {
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

  const s = SCENARIOS[current];

  return (
    <div className="puzzle-box">
      <div className="puzzle-number">03</div>
      <div className="puzzle-heading">
        <h3><span className="puzzle-icon">&#128220;</span> Guess the Verdict</h3>
        <p>Illustrative scenarios based on real legal principles. What's the likely outcome?</p>
      </div>

      {!done ? (
        <>
          <div className="puzzle-progress">Scenario {current + 1} of {SCENARIOS.length} &middot; Score: {score}</div>
          <div className="verdict-facts">{s.facts}</div>
          <div className="quiz-question">{s.question}</div>
          <div className="quiz-options">
            {s.options.map((opt, i) => {
              let cls = "quiz-option";
              if (selected !== null) {
                if (i === s.answer) cls += " correct";
                else if (i === selected) cls += " wrong";
              }
              return (
                <button key={i} className={cls} onClick={() => pick(i)}>
                  {opt}
                </button>
              );
            })}
          </div>
          {selected !== null && <div className="quiz-note">{s.note}</div>}
          {selected !== null && (
            <button className="puzzle-next" onClick={next}>
              {current + 1 >= SCENARIOS.length ? "See final score" : "Next scenario"} &rarr;
            </button>
          )}
        </>
      ) : (
        <div className="puzzle-result">
          <div className="puzzle-result-score">{score} / {SCENARIOS.length}</div>
          <p>{score === SCENARIOS.length ? "You'd make a fine judge." : "Even judges get reversed on appeal sometimes."}</p>
          <button className="puzzle-next" onClick={restart}>Try again &rarr;</button>
        </div>
      )}
    </div>
  );
}
