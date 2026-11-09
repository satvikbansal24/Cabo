import React, { useEffect, useState } from 'react';

export function useCountdown(endsAt, clockOffset) {
  const calc = () => (endsAt ? Math.max(0, Math.ceil((endsAt - (Date.now() + clockOffset)) / 1000)) : null);
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    setLeft(calc());
    if (!endsAt) return;
    const t = setInterval(() => setLeft(calc()), 200);
    return () => clearInterval(t);
  }, [endsAt, clockOffset]);
  return left;
}

export function Timer({ endsAt, clockOffset, total = 60, size = 'md' }) {
  const left = useCountdown(endsAt, clockOffset);
  if (left === null) return null;
  const pct = Math.max(0, Math.min(1, left / total));
  return (
    <div className={`timer timer-${size} ${left <= 10 ? 'urgent' : ''}`} role="timer" aria-label={`${left} seconds left`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="timer-track" cx="50" cy="50" r="44" />
        <circle
          className="timer-fill"
          cx="50"
          cy="50"
          r="44"
          strokeDasharray={`${276.5 * pct} 276.5`}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <span>{left}</span>
    </div>
  );
}

export const teamIndex = (state, teamId) => state.teams.findIndex((t) => t.id === teamId);
export const playerById = (state, id) => state.players.find((p) => p.id === id);
export const teamOf = (state, playerId) => state.teams.find((t) => t.memberIds.includes(playerId));

export function TeamTag({ state, teamId }) {
  const i = teamIndex(state, teamId);
  const team = state.teams[i];
  if (!team) return null;
  return <span className={`team-tag team-${i}`}>{team.name}</span>;
}

export function PlayerName({ state, id, flagOf }) {
  const p = playerById(state, id);
  if (!p) return <span className="muted">someone</span>;
  return (
    <span className={`player-name ${p.connected ? '' : 'offline'}`}>
      {flagOf(p.country)} {p.name}
    </span>
  );
}

// Shows how the deck is split between global cards and country packs.
export function MixBar({ mix }) {
  return (
    <div className="mix">
      <div className="mix-bar">
        {mix.map((m, i) => (
          <span key={m.source} className={`mix-seg seg-${i % 6}`} style={{ flexGrow: m.share }} title={`${m.label} ${Math.round(m.share * 100)}%`} />
        ))}
      </div>
      <div className="mix-legend">
        {mix.map((m, i) => (
          <span key={m.source}>
            <i className={`dot seg-${i % 6}`} /> {m.label} {Math.round(m.share * 100)}%
          </span>
        ))}
      </div>
    </div>
  );
}

export function Scoreboard({ state, compact = false }) {
  const playing = state.turn?.teamId;
  return (
    <div className={`scoreboard ${compact ? 'compact' : ''}`}>
      {state.teams.map((t, i) => (
        <div key={t.id} className={`score-card team-${i} ${playing === t.id ? 'playing' : ''}`}>
          <span className="score-name">{t.name}</span>
          <span className="score-value">{t.score}</span>
        </div>
      ))}
    </div>
  );
}

const RESULT_LABEL = { guessed: 'Guessed', skipped: 'Skipped', missed: 'Time ran out' };

export function CardList({ cards, onToggle }) {
  if (!cards.length) return <p className="muted">No cards this turn.</p>;
  return (
    <ul className="card-list">
      {cards.map((c, i) => (
        <li key={i} className={`result-${c.result}`}>
          {onToggle ? (
            <button className="card-row" onClick={() => onToggle(i)}>
              <span>{c.text}</span>
              <span className="result-pill">{RESULT_LABEL[c.result]}</span>
            </button>
          ) : (
            <div className="card-row">
              <span>{c.text}</span>
              <span className="result-pill">{RESULT_LABEL[c.result]}</span>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export function TurnCounts({ turn }) {
  return (
    <div className="turn-counts">
      <div><strong>{turn.guessed}</strong><span>guessed</span></div>
      <div><strong>{turn.skipped}</strong><span>skipped</span></div>
      <div><strong>{turn.points > 0 ? `+${turn.points}` : turn.points}</strong><span>points</span></div>
    </div>
  );
}

export function Standings({ state }) {
  const ranked = [...state.teams].map((t, i) => ({ ...t, i })).sort((a, b) => b.score - a.score);
  const top = ranked[0]?.score;
  const winners = ranked.filter((t) => t.score === top);
  return (
    <div className="standings">
      <h2 className="winner">
        {winners.length > 1 ? `It’s a tie: ${winners.map((w) => w.name).join(' & ')}!` : `${winners[0].name} win!`}
      </h2>
      <ol>
        {ranked.map((t) => (
          <li key={t.id} className={`team-${t.i}`}>
            <span className="team-tag-inline">{t.name}</span>
            <span className="score-value">{t.score}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
