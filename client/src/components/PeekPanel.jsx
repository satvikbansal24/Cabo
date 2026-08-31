import React from 'react';

export default function PeekPanel({ game, myId, socket, code, iAmReady }) {
  return (
    <div className="peek-panel">
      <h2>Memorize your cards</h2>
      <p>Two of your four cards were shown to you privately when the round began. Remember them — you won't see them again unless you use a power!</p>
      <button disabled={iAmReady} onClick={() => socket.emit('game:peekReady', { code })}>
        {iAmReady ? "Waiting for others…" : "I'm ready"}
      </button>
      <ul className="ready-list">
        {game.players.map((p) => (
          <li key={p.id}>
            {p.name} {game.peekReady.includes(p.id) ? '✅' : '…'}
          </li>
        ))}
      </ul>
    </div>
  );
}
