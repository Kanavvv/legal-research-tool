import { useState, useEffect } from "react";
import { playCorrect, playWrong, playFlip } from "../sound";

const PAIRS = [
  { term: "Habeas Corpus", meaning: "You shall have the body" },
  { term: "Res Judicata", meaning: "A matter already judged" },
  { term: "Mens Rea", meaning: "A guilty mind" },
  { term: "Actus Reus", meaning: "A guilty act" },
  { term: "Ratio Decidendi", meaning: "The reason for the decision" },
  { term: "Prima Facie", meaning: "On first appearance" },
];

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function buildDeck() {
  const cards = [];
  PAIRS.forEach((p, i) => {
    cards.push({ id: `t${i}`, pairId: i, label: p.term, type: "term" });
    cards.push({ id: `m${i}`, pairId: i, label: p.meaning, type: "meaning" });
  });
  return shuffle(cards);
}

export default function LatinMatchGame() {
  const [deck, setDeck] = useState(buildDeck());
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);

  useEffect(() => {
    if (flipped.length === 2) {
      const [a, b] = flipped;
      if (a.pairId === b.pairId) {
        playCorrect();
        setTimeout(() => {
          setMatched((m) => [...m, a.pairId]);
          setFlipped([]);
        }, 500);
      } else {
        playWrong();
        setTimeout(() => setFlipped([]), 800);
      }
    }
  }, [flipped]);

  function handleClick(card) {
    if (flipped.length === 2 || flipped.some((f) => f.id === card.id) || matched.includes(card.pairId)) return;
    playFlip();
    setFlipped((f) => [...f, card]);
  }

  function restart() {
    setDeck(buildDeck());
    setFlipped([]);
    setMatched([]);
  }

  const allDone = matched.length === PAIRS.length;

  return (
    <div className="puzzle-box">
      <div className="puzzle-number">02</div>
      <div className="puzzle-heading">
        <h3><span className="puzzle-icon">&#9878;</span> Match the Maxim</h3>
        <p>Pair each Latin term with its meaning. {matched.length} of {PAIRS.length} matched.</p>
      </div>

      <div className="match-grid">
        {deck.map((card) => {
          const isFlipped = flipped.some((f) => f.id === card.id) || matched.includes(card.pairId);
          return (
            <button
              key={card.id}
              className={`match-card ${isFlipped ? "flipped" : ""} ${matched.includes(card.pairId) ? "matched" : ""} ${card.type}`}
              onClick={() => handleClick(card)}
            >
              {isFlipped ? card.label : <span className="card-back-icon">&#9878;</span>}
            </button>
          );
        })}
      </div>

      {allDone && (
        <div className="puzzle-result">
          <p>All matched. The bench is impressed.</p>
          <button className="puzzle-next" onClick={restart}>Shuffle again &rarr;</button>
        </div>
      )}
    </div>
  );
}
