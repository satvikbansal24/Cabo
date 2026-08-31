import React from 'react';

export default function Lobby({ room, isHost, socket }) {
  return (
    <div className="lobby">
      <h2>Room {room.code}</h2>
      <p className="hint">Share this code with friends so they can join.</p>
      <div className="room-code">{room.code}</div>
      <h3>Players</h3>
      <ul className="player-list">
        {room.players.map((p) => (
          <li key={p.id}>
            {p.name}
            {p.id === room.hostId && ' (host)'}
            {!p.connected && ' — disconnected'}
          </li>
        ))}
      </ul>
      {isHost ? (
        <button disabled={room.players.length < 2} onClick={() => socket.emit('room:start', { code: room.code })}>
          {room.players.length < 2 ? 'Need at least 2 players' : 'Start game'}
        </button>
      ) : (
        <p className="hint">Waiting for the host to start the game…</p>
      )}
    </div>
  );
}
