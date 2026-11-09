import React from 'react';
import { Standings } from './shared.jsx';

export default function GameOver({ state }) {
  return (
    <div className="player-screen">
      <Standings state={state} />
      <p className="waiting">The host can start a new game from the big screen.</p>
    </div>
  );
}
