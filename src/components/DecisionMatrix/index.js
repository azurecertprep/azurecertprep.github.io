import React, { useState, useEffect } from 'react';

const cellStyles = {
  hidden: {
    background: 'var(--ifm-color-emphasis-200)',
    color: 'transparent',
    cursor: 'pointer',
    userSelect: 'none',
    textAlign: 'center',
    padding: '0.6rem 0.8rem',
    borderRadius: '4px',
    border: '2px dashed var(--ifm-color-emphasis-300)',
    transition: 'all 0.2s ease',
    minWidth: '80px',
  },
  revealed: {
    background: 'var(--ifm-color-emphasis-100)',
    color: 'inherit',
    textAlign: 'center',
    padding: '0.6rem 0.8rem',
    borderRadius: '4px',
    border: '2px solid var(--ifm-color-primary)',
    transition: 'all 0.2s ease',
    minWidth: '80px',
  },
  header: {
    textAlign: 'center',
    padding: '0.6rem 0.8rem',
    fontWeight: 600,
    background: 'var(--ifm-color-emphasis-100)',
  },
  criteria: {
    padding: '0.6rem 0.8rem',
    fontWeight: 500,
  },
};

function MatrixCell({ value, revealed, onReveal }) {
  if (revealed) {
    return (
      <td style={cellStyles.revealed}>
        {value}
      </td>
    );
  }
  return (
    <td
      style={cellStyles.hidden}
      onClick={onReveal}
      title="Click to reveal"
    >
      <span style={{ opacity: 0.4, fontSize: '0.8rem' }}>?</span>
    </td>
  );
}

export default function DecisionMatrix({ title, headers, rows, storageKey }) {
  const [revealed, setRevealed] = useState({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`matrix-${storageKey}`);
      if (saved) setRevealed(JSON.parse(saved));
    } catch {}
  }, [storageKey]);

  const revealCell = (rowIdx, colIdx) => {
    const key = `${rowIdx}-${colIdx}`;
    const updated = { ...revealed, [key]: true };
    setRevealed(updated);
    try {
      localStorage.setItem(`matrix-${storageKey}`, JSON.stringify(updated));
    } catch {}
  };

  const revealAll = () => {
    const all = {};
    rows.forEach((row, rIdx) => {
      row.values.forEach((_, cIdx) => {
        all[`${rIdx}-${cIdx}`] = true;
      });
    });
    setRevealed(all);
    try {
      localStorage.setItem(`matrix-${storageKey}`, JSON.stringify(all));
    } catch {}
  };

  const reset = () => {
    setRevealed({});
    try {
      localStorage.removeItem(`matrix-${storageKey}`);
    } catch {}
  };

  const totalCells = rows.length * headers.length;
  const revealedCount = Object.values(revealed).filter(Boolean).length;

  return (
    <div style={{ margin: '1.5rem 0' }}>
      {title && (
        <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '1rem' }}>
          {title}
        </div>
      )}
      <div style={{ fontSize: '0.8rem', color: 'var(--ifm-color-emphasis-600)', marginBottom: '0.5rem' }}>
        Click each cell to reveal the answer. Think about your answer first!
        {revealedCount > 0 && ` (${revealedCount}/${totalCells} revealed)`}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '4px' }}>
          <thead>
            <tr>
              <th style={cellStyles.criteria}></th>
              {headers.map((h, idx) => (
                <th key={idx} style={cellStyles.header}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <tr key={rIdx}>
                <td style={cellStyles.criteria}>{row.criteria}</td>
                {row.values.map((val, cIdx) => (
                  <MatrixCell
                    key={cIdx}
                    value={val}
                    revealed={!!revealed[`${rIdx}-${cIdx}`]}
                    onReveal={() => revealCell(rIdx, cIdx)}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={revealAll}
          style={{
            padding: '0.3rem 0.8rem',
            fontSize: '0.8rem',
            cursor: 'pointer',
            borderRadius: '4px',
            border: '1px solid var(--ifm-color-primary)',
            background: 'var(--ifm-color-primary)',
            color: 'white',
          }}
        >
          Reveal All
        </button>
        {revealedCount > 0 && (
          <button
            onClick={reset}
            style={{
              padding: '0.3rem 0.8rem',
              fontSize: '0.8rem',
              cursor: 'pointer',
              borderRadius: '4px',
              border: '1px solid #ccc',
              background: 'transparent',
            }}
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
