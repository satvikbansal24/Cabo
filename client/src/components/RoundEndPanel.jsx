import React from 'react';
import Card from './Card.jsx';

export default function RoundEndPanel({ game, isHost, socket, code }) {
  return (
    <div className="overlay-panel">
      <h2>Round {game.round} results</h2>
      {game.caboCalledBy && (
        <p>
          Cabo called by <strong>{game.players.find((p) => p.id === game.caboCalledBy)?.name}</strong>
        </p>
      )}
      <table className="score-table">
        <thead>
          <tr>
            <th>Player</th>
            <th>Hand</th>
            <th>Round score</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {game.players.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>
                <div className="hand-cards hand-cards-inline">
                  {(game.hands[p.id] || []).map((c, i) => (
                    <Card key={i} card={c} empty={c === null} small />
                  ))}
                </div>
              </td>
              <td>{game.lastRoundScores?.[p.id]}</td>
              <td>{game.totalScores[p.id]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {isHost ? (
        <button onClick={() => socket.emit('game:nextRound', { code })}>Start next round</button>
      ) : (
        <p className="hint">Waiting for the host to start the next round…</p>
      )}
    </div>
  );
}
