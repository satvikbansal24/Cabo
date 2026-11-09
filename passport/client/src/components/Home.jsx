import React, { useState } from 'react';
import { emit, session } from '../session.js';

export default function Home({ countries, onNotice }) {
  const saved = session.profile;
  const [name, setName] = useState(saved.name);
  const [country, setCountry] = useState(saved.country);
  const [code, setCode] = useState(session.inviteCode);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const host = async () => {
    setError('');
    onNotice('');
    setBusy(true);
    const res = await emit('room:create', { token: session.hostToken });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    session.place = { code: res.code, role: 'host' };
  };

  const join = async (e) => {
    e.preventDefault();
    setError('');
    onNotice('');
    if (code.trim().length !== 4) return setError('Room codes are 4 letters. The host screen shows the code.');
    if (!name.trim()) return setError('Enter your name.');
    if (!country) return setError('Pick where you’re from. It decides which cards end up in the deck.');
    const profile = { name: name.trim(), country };
    session.profile = profile;
    setBusy(true);
    const res = await emit('room:join', { code: code.trim(), token: session.playerToken, ...profile });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    session.place = { code: res.code, role: 'player' };
  };

  return (
    <div className="home">
      <section className="hero">
        <h1>Describe it. Don’t say it.</h1>
        <p>
          A team clue game for groups from all over. Everyone says where they’re from, and the deck
          mixes in things your room will actually know.
        </p>
      </section>

      <div className="home-grid">
        <form className="panel" onSubmit={join}>
          <h2>Join a game</h2>
          <label>
            Room code
            <input
              className="code-input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))}
              placeholder="ABCD"
              autoCapitalize="characters"
              autoComplete="off"
            />
          </label>
          <label>
            Your name
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder="e.g. Priya" autoComplete="nickname" />
          </label>
          <label>
            Where are you from?
            <select value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="">Choose a country…</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="primary big" disabled={busy}>
            Join
          </button>
        </form>

        <div className="panel host-card">
          <h2>Hosting?</h2>
          <p>
            Open this on the TV or laptop everyone can see and start a room here. That screen becomes the
            scoreboard and control panel; it never shows the cards. Then join from your own phone to play.
          </p>
          <button className="big" disabled={busy} onClick={host}>
            Host on this screen
          </button>
        </div>
      </div>
    </div>
  );
}
