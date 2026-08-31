import React from 'react';
import { Link } from 'react-router-dom';

export default function GameEndPanel({ game }) {
  const winner = game.players.find((p) => p.id === game.winnerId);
  const sorted = [...game.players].sort((a, b) => game.totalScores[a.id] - game.totalScores[b.id]);
  return (
    <div className="overlay-panel">
      <h2>🏆 {winner?.name} wins the game!</h2>
      <table className="score-table">
        <thead>
          <tr>
            <th>Player</th>
            <th>Total score</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{game.totalScores[p.id]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Link to="/">
        <button>Back to dashboard</button>
      </Link>
    </div>
  );
}
