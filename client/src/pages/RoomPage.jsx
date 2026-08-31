import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import Lobby from '../components/Lobby.jsx';
import GameBoard from '../components/GameBoard.jsx';
import RoundEndPanel from '../components/RoundEndPanel.jsx';
import GameEndPanel from '../components/GameEndPanel.jsx';
import PeekToast from '../components/PeekToast.jsx';
import RulesModal from '../components/RulesModal.jsx';

let toastSeq = 1;

export default function RoomPage() {
  const { code } = useParams();
  const { user, logout } = useAuth();
  const { socket, connected } = useSocket();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [game, setGame] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [myDrawnCard, setMyDrawnCard] = useState(null);
  const [myPeekCards, setMyPeekCards] = useState({});
  const [recentPenalty, setRecentPenalty] = useState(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [error, setError] = useState('');

  const addToast = useCallback((label, card) => {
    const id = toastSeq++;
    setToasts((t) => [...t, { id, label, card }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  useEffect(() => {
    if (!socket || !connected) return;
    socket.emit('room:join', { code }, (res) => {
      if (!res.ok) {
        setError(res.error);
        setTimeout(() => navigate('/'), 1500);
      } else {
        setRoom(res.room);
      }
    });

    function onRoomUpdate(r) {
      setRoom(r);
    }
    function onGameState(g) {
      setGame(g);
      if (!(g.phase === 'turn-awaiting-play' && g.awaitingPlayPlayerId === user.id)) {
        setMyDrawnCard(null);
      }
      if (g.phase !== 'peek') {
        setMyPeekCards({});
      }
    }
    function onPrivate(msg) {
      if (msg.type === 'drawn') {
        setMyDrawnCard({ card: msg.card, source: msg.source });
      } else if (msg.type === 'initial-peek') {
        setMyPeekCards((prev) => {
          const next = { ...prev };
          msg.cards.forEach((c) => { next[c.index] = c.card; });
          return next;
        });
      } else if (msg.type === 'power-peek') {
        const who = msg.playerId === user.id ? 'Your' : nameFor(msg.playerId);
        addToast(`${who} card #${msg.index + 1}`, msg.card);
      }
    }
    function onMatchResult(m) {
      if (!m.correct && typeof m.penaltyIndex === 'number') {
        const id = Date.now();
        setRecentPenalty({ playerId: m.playerId, index: m.penaltyIndex, id });
        setTimeout(() => setRecentPenalty((cur) => (cur?.id === id ? null : cur)), 4000);
      }
    }
    function onErr(e) {
      setError(e.message);
      setTimeout(() => setError(''), 4000);
    }

    function nameFor(id) {
      const p = room?.players?.find((pp) => pp.id === id) || game?.players?.find((pp) => pp.id === id);
      return p ? `${p.name}'s` : "Opponent's";
    }

    socket.on('room:update', onRoomUpdate);
    socket.on('game:state', onGameState);
    socket.on('game:private', onPrivate);
    socket.on('game:matchResult', onMatchResult);
    socket.on('error', onErr);

    return () => {
      socket.off('room:update', onRoomUpdate);
      socket.off('game:state', onGameState);
      socket.off('game:private', onPrivate);
      socket.off('game:matchResult', onMatchResult);
      socket.off('error', onErr);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, connected, code]);

  if (!room && !error) return <div className="page">Joining room…</div>;
  if (error) return <div className="page">{error}</div>;

  const isHost = room.hostId === user.id;
  const showGame = room.status === 'playing' && game;

  return (
    <div className="page">
      <header className="topbar">
        <h1>🃏 Cabo</h1>
        <div className="topbar-right">
          <span>Room {room.code}</span>
          <span>Hi, {user.username}</span>
          <button className="link-btn" onClick={() => setRulesOpen(true)}>Rules</button>
          <button className="link-btn" onClick={() => { socket.emit('room:leave', { code }); navigate('/'); }}>
            Leave
          </button>
          <button className="link-btn" onClick={logout}>Log out</button>
        </div>
      </header>

      <PeekToast toasts={toasts} onDismiss={dismissToast} />
      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}

      {!showGame && <Lobby room={room} isHost={isHost} socket={socket} />}

      {showGame && !['round-end', 'game-end'].includes(game.phase) && (
        <GameBoard
          game={game}
          myId={user.id}
          socket={socket}
          code={code}
          myDrawnCard={myDrawnCard}
          myPeekCards={myPeekCards}
          recentPenalty={recentPenalty}
          onOpenRules={() => setRulesOpen(true)}
        />
      )}

      {showGame && game.phase === 'round-end' && (
        <RoundEndPanel game={game} isHost={isHost} socket={socket} code={code} />
      )}

      {showGame && game.phase === 'game-end' && <GameEndPanel game={game} />}
    </div>
  );
}
