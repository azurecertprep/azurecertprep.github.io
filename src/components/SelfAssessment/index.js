import React, { useState, useEffect } from 'react';

const STATES = ['none', 'comfortable', 'review', 'new'];
const ICONS = { none: '⬜', comfortable: '✅', review: '⚠️', new: '❌' };
const LABELS = { none: 'Click to rate', comfortable: 'Comfortable', review: 'Need Review', new: 'New to Me' };

function AssessmentRow({ skill, id, value, onChange }) {
  const cycle = () => {
    const next = STATES[(STATES.indexOf(value) + 1) % STATES.length];
    onChange(id, next);
  };

  return (
    <tr>
      <td>{skill}</td>
      <td
        onClick={cycle}
        style={{
          cursor: 'pointer',
          textAlign: 'center',
          fontSize: '1.3rem',
          userSelect: 'none',
          minWidth: '140px',
        }}
        title={`Click to cycle: ${LABELS[value]}`}
      >
        <span>{ICONS[value]}</span>
        <span style={{ fontSize: '0.75rem', marginLeft: '0.5rem', opacity: 0.7 }}>
          {value !== 'none' ? LABELS[value] : ''}
        </span>
      </td>
    </tr>
  );
}

function Summary({ ratings }) {
  const values = Object.values(ratings);
  const total = values.filter(v => v !== 'none').length;
  const comfortable = values.filter(v => v === 'comfortable').length;
  const review = values.filter(v => v === 'review').length;
  const newToMe = values.filter(v => v === 'new').length;

  if (total === 0) return null;

  let message, color;
  if (newToMe >= 4) {
    message = 'Consider starting with AZ-900 fundamentals before AZ-104.';
    color = '#e74c3c';
  } else if (review >= 4 || newToMe >= 2) {
    message = 'You can start the challenges but give yourself extra time on weaker areas.';
    color = '#f39c12';
  } else {
    message = "You're ready! Head to Lab Setup and start Challenge 01.";
    color = '#27ae60';
  }

  return (
    <div style={{
      padding: '1rem',
      borderRadius: '8px',
      background: `${color}15`,
      border: `1px solid ${color}40`,
      marginTop: '1rem',
    }}>
      <strong style={{ color }}>Your Assessment ({total} rated):</strong>
      <span style={{ marginLeft: '1rem' }}>
        ✅ {comfortable} | ⚠️ {review} | ❌ {newToMe}
      </span>
      <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>{message}</p>
    </div>
  );
}

export default function SelfAssessment({ skills, storageKey }) {
  const [ratings, setRatings] = useState({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`self-assessment-${storageKey}`);
      if (saved) setRatings(JSON.parse(saved));
    } catch {}
  }, [storageKey]);

  const handleChange = (id, value) => {
    const updated = { ...ratings, [id]: value };
    setRatings(updated);
    try {
      localStorage.setItem(`self-assessment-${storageKey}`, JSON.stringify(updated));
    } catch {}
  };

  const handleReset = () => {
    setRatings({});
    try {
      localStorage.removeItem(`self-assessment-${storageKey}`);
    } catch {}
  };

  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>Skill</th>
            <th style={{ textAlign: 'center' }}>Your Level (click to rate)</th>
          </tr>
        </thead>
        <tbody>
          {skills.map((skill, idx) => (
            <AssessmentRow
              key={idx}
              skill={skill}
              id={`${storageKey}-${idx}`}
              value={ratings[`${storageKey}-${idx}`] || 'none'}
              onChange={handleChange}
            />
          ))}
        </tbody>
      </table>
      <Summary ratings={ratings} />
      {Object.keys(ratings).length > 0 && (
        <button
          onClick={handleReset}
          style={{
            marginTop: '0.5rem',
            padding: '0.3rem 0.8rem',
            fontSize: '0.8rem',
            cursor: 'pointer',
            borderRadius: '4px',
            border: '1px solid #ccc',
            background: 'transparent',
          }}
        >
          Reset All
        </button>
      )}
    </div>
  );
}
