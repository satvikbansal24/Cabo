import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { socket, connected } = useSocket();
  const navigate = useNavigate();
  const [targetScore, setTargetScore] = useState(100);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function createRoom() {
    if (!socket) return;
    setError('');
    setBusy(true);
    socket.emit('room:create', { targetScore: Number(targetScore) || 100 }, (res) => {
      setBusy(false);
      if (res.ok) navigate(`/room/${res.room.code}`);
      else setError(res.error);
    });
  }

  function joinRoom(e) {
    e.preventDefault();
    if (!socket || !joinCode) return;
    setError('');
    setBusy(true);
    socket.emit('room:join', { code: joinCode.trim().toUpperCase() }, (res) => {
      setBusy(false);
      if (res.ok) navigate(`/room/${res.room.code}`);
      else setError(res.error);
    });
  }

  return (
    <div className="page">
      <header className="topbar">
        <h1>🃏 Cabo</h1>
        <div className="topbar-right">
          <span>Hi, {user.username}</span>
          <Link to="/rules"><button className="link-btn">Rules</button></Link>
          <button className="link-btn" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <div className="dashboard-grid">
        <section className="panel">
          <h2>Create a room</h2>
          <label>
            Target score to end the game
            <input
              type="number"
              min={20}
              value={targetScore}
              onChange={(e) => setTargetScore(e.target.value)}
            />
          </label>
          <button disabled={!connected || busy} onClick={createRoom}>
            Create room
          </button>
        </section>

        <section className="panel">
          <h2>Join a room</h2>
          <form onSubmit={joinRoom}>
            <label>
              Room code
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="e.g. 7K4QM"
                maxLength={5}
                style={{ textTransform: 'uppercase' }}
              />
            </label>
            <button type="submit" disabled={!connected || busy || !joinCode}>
              Join room
            </button>
          </form>
        </section>
      </div>

      {error && <div className="error" style={{ marginTop: 16 }}>{error}</div>}
      {!connected && <p className="hint">Connecting…</p>}
    </div>
  );
}
