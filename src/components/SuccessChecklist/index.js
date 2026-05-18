import React, { useState, useEffect } from 'react';

function CheckItem({ text, checked, onToggle }) {
  return (
    <li
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.6rem',
        padding: '0.5rem 0',
        cursor: 'pointer',
        userSelect: 'none',
        listStyle: 'none',
      }}
    >
      <span style={{
        fontSize: '1.2rem',
        lineHeight: '1.4',
        flexShrink: 0,
      }}>
        {checked ? '✅' : '⬜'}
      </span>
      <span style={{
        lineHeight: '1.5',
        textDecoration: checked ? 'line-through' : 'none',
        opacity: checked ? 0.7 : 1,
      }}>
        {text}
      </span>
    </li>
  );
}

export default function SuccessChecklist({ items, storageKey }) {
  const [checked, setChecked] = useState({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`success-${storageKey}`);
      if (saved) setChecked(JSON.parse(saved));
    } catch {}
  }, [storageKey]);

  const toggle = (idx) => {
    const updated = { ...checked, [idx]: !checked[idx] };
    setChecked(updated);
    try {
      localStorage.setItem(`success-${storageKey}`, JSON.stringify(updated));
    } catch {}
  };

  const reset = () => {
    setChecked({});
    try {
      localStorage.removeItem(`success-${storageKey}`);
    } catch {}
  };

  const total = items.length;
  const done = Object.values(checked).filter(Boolean).length;

  return (
    <div>
      {done > 0 && (
        <div style={{
          fontSize: '0.85rem',
          marginBottom: '0.5rem',
          color: done === total ? '#27ae60' : 'var(--ifm-color-emphasis-600)',
          fontWeight: done === total ? 600 : 400,
        }}>
          {done}/{total} completed {done === total && '- All done!'}
        </div>
      )}
      <ul style={{ margin: 0, padding: 0 }}>
        {items.map((item, idx) => (
          <CheckItem
            key={idx}
            text={item}
            checked={!!checked[idx]}
            onToggle={() => toggle(idx)}
          />
        ))}
      </ul>
      {done > 0 && (
        <button
          onClick={reset}
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
          Reset
        </button>
      )}
    </div>
  );
}
