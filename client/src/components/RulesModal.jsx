import React from 'react';
import RulesContent from './RulesContent.jsx';

export default function RulesModal({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <RulesContent />
      </div>
    </div>
  );
}
