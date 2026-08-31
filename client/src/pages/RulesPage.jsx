import React from 'react';
import { Link } from 'react-router-dom';
import RulesContent from '../components/RulesContent.jsx';

export default function RulesPage() {
  return (
    <div className="page">
      <header className="topbar">
        <h1>🃏 Cabo</h1>
        <div className="topbar-right">
          <Link to="/"><button className="link-btn">← Back</button></Link>
        </div>
      </header>
      <div className="panel rules-page-panel">
        <RulesContent />
      </div>
    </div>
  );
}
