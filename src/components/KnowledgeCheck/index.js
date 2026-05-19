import React, { useState } from 'react';
import styles from './styles.module.css';

export default function KnowledgeCheck({ questions }) {
  const [answers, setAnswers] = useState({});

  const allAnswered = Object.keys(answers).length === questions.length;
  const correctCount = Object.values(answers).filter(Boolean).length;

  const handleAnswer = (qIndex, isCorrect) => {
    setAnswers((prev) => ({ ...prev, [qIndex]: isCorrect }));
  };

  return (
    <div className={styles.container}>
      {questions.map((q, index) => (
        <Question
          key={index}
          index={index}
          question={q.question}
          options={q.options}
          correctIndex={q.correctIndex}
          explanation={q.explanation}
          onAnswer={handleAnswer}
        />
      ))}
      {allAnswered && (
        <div className={styles.scoreCard}>
          <strong>Score: {correctCount}/{questions.length}</strong>
          {correctCount === questions.length ? (
            <span className={styles.perfect}> — Perfect!</span>
          ) : correctCount >= questions.length * 0.75 ? (
            <span className={styles.good}> — Good job!</span>
          ) : (
            <span className={styles.review}> — Review the explanations above.</span>
          )}
        </div>
      )}
    </div>
  );
}

function Question({ index, question, options, correctIndex, explanation, onAnswer }) {
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);

  const handleSelect = (optIndex) => {
    if (revealed) return;
    setSelected(optIndex);
    setRevealed(true);
    onAnswer(index, optIndex === correctIndex);
  };

  return (
    <div className={styles.question}>
      <p className={styles.questionText}>
        <span className={styles.questionNumber}>{index + 1}.</span> {question}
      </p>
      <div className={styles.options}>
        {options.map((option, optIndex) => {
          let optionClass = styles.option;
          if (revealed) {
            if (optIndex === correctIndex) {
              optionClass += ' ' + styles.correct;
            } else if (optIndex === selected) {
              optionClass += ' ' + styles.incorrect;
            } else {
              optionClass += ' ' + styles.dimmed;
            }
          }
          return (
            <button
              key={optIndex}
              className={optionClass}
              onClick={() => handleSelect(optIndex)}
              disabled={revealed}
            >
              <span className={styles.optionLetter}>
                {String.fromCharCode(65 + optIndex)}
              </span>
              <span className={styles.optionText}>{option}</span>
              {revealed && optIndex === correctIndex && (
                <span className={styles.checkmark}>✓</span>
              )}
              {revealed && optIndex === selected && optIndex !== correctIndex && (
                <span className={styles.crossmark}>✗</span>
              )}
            </button>
          );
        })}
      </div>
      {revealed && (
        <div className={
          selected === correctIndex
            ? styles.explanationCorrect
            : styles.explanationIncorrect
        }>
          <strong>{selected === correctIndex ? 'Correct!' : 'Incorrect.'}</strong>{' '}
          {explanation}
        </div>
      )}
    </div>
  );
}
