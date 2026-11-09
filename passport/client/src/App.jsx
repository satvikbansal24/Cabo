import React, { useEffect, useState } from 'react';
import { emit, session, socket } from './session.js';
import { GAME_NAME } from './brand.js';
import Home from './components/Home.jsx';
import Dashboard from './components/Dashboard.jsx';
import PlayerLobby from './components/PlayerLobby.jsx';
import PlayerGame from './components/PlayerGame.jsx';
import GameOver from './components/GameOver.jsx';
import Rules from './components/Rules.jsx';

export default function App() {
  const [countries, setCountries] = useState([]);
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(socket.connected);
  const [notice, setNotice] = useState('');
  const [showRules, setShowRules] = useState(false);
  const [clockOffset, setClockOffset] = useState(0);

  useEffect(() => {
    fetch('/api/countries')
      .then((r) => r.json())
      .then(setCountries)
      .catch(() => setNotice('Couldn’t load the country list. Is the server running?'));
  }, []);

  useEffect(() => {
    // On every (re)connect, put this tab back in the room its URL points at.
    const rejoin = async () => {
      setConnected(true);
      const place = session.place;
      if (!place) return;
      const res =
        place.role === 'host'
          ? await emit('room:host', { code: place.code, token: session.hostToken })
          : await emit('room:join', { code: place.code, token: session.playerToken, ...session.profile });
      if (!res.ok) {
        session.place = null;
        setState(null);
        setNotice(`Couldn’t get back into room ${place.code}: ${res.error}`);
      }
    };
    const onState = (s) => {
      setClockOffset(s.serverNow - Date.now());
      setState(s);
    };
    const onKicked = (msg) => {
      session.place = null;
      setState(null);
      setNotice(msg);
    };
    const onDisconnect = () => setConnected(false);
    socket.on('connect', rejoin);
    socket.on('disconnect', onDisconnect);
    socket.on('room:state', onState);
    socket.on('room:kicked', onKicked);
    if (socket.connected) rejoin();
    return () => {
      socket.off('connect', rejoin);
      socket.off('disconnect', onDisconnect);
      socket.off('room:state', onState);
      socket.off('room:kicked', onKicked);
    };
  }, []);

  const leave = async () => {
    if (state?.isHost && !window.confirm('Close the dashboard? The room stays open and you can reopen it from this browser.')) return;
    await emit('room:leave');
    session.place = null;
    setState(null);
  };

  const flagOf = (code) => countries.find((c) => c.code === code)?.flag || '🌍';
  const props = { state, countries, flagOf, clockOffset };

  let screen;
  if (!state) screen = <Home countries={countries} onNotice={setNotice} />;
  else if (state.isHost) screen = <Dashboard {...props} />;
  else if (state.phase === 'lobby') screen = <PlayerLobby {...props} />;
  else if (state.phase === 'over') screen = <GameOver {...props} />;
  else screen = <PlayerGame {...props} />;

  return (
    <div className={`app ${state?.isHost ? 'is-host' : ''}`}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">🌍</span> {GAME_NAME}
        </div>
        <div className="topbar-actions">
          {state && !state.isHost && <span className="room-chip">Room {state.code}</span>}
          <button className="ghost" onClick={() => setShowRules(true)}>Rules</button>
          {state && <button className="ghost" onClick={leave}>{state.isHost ? 'Close' : 'Leave'}</button>}
        </div>
      </header>
      {!connected && <div className="banner warn">Reconnecting…</div>}
      {notice && (
        <button className="banner" onClick={() => setNotice('')}>
          {notice} <span className="dismiss">✕</span>
        </button>
      )}
      <main>{screen}</main>
      {showRules && <Rules onClose={() => setShowRules(false)} />}
    </div>
  );
}
