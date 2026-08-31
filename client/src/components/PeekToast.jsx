import React from 'react';
import Card from './Card.jsx';

export default function PeekToast({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="peek-toasts">
      {toasts.map((t) => (
        <div className="peek-toast" key={t.id} onClick={() => onDismiss(t.id)}>
          <Card card={t.card} small />
          <div className="peek-toast-text">
            <strong>{t.label}</strong>
            <span>tap to dismiss</span>
          </div>
        </div>
      ))}
    </div>
  );
}
