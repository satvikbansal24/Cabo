import React from 'react';
import { MixBar, playerById, teamIndex, teamOf } from './shared.jsx';

export default function PlayerLobby({ state, flagOf }) {
  const myTeam = teamOf(state, state.you);
  const i = myTeam ? teamIndex(state, myTeam.id) : -1;
  return (
    <div className="player-screen">
      <div className={`you-card team-${i}`}>
        <span className="muted">You’re on</span>
        <h1>{myTeam ? `Team ${myTeam.name}` : 'No team yet'}</h1>
        <ul className="mates">
          {myTeam?.memberIds.map((id) => {
            const p = playerById(state, id);
            return p && (
              <li key={id} className={p.connected ? '' : 'offline'}>
                {flagOf(p.country)} {p.name}{id === state.you ? ' (you)' : ''}
              </li>
            );
          })}
        </ul>
      </div>
      <p className="waiting">Waiting for the host to start the game…</p>
      <div className="panel">
        <h3>Other teams</h3>
        {state.teams.filter((t) => t.id !== myTeam?.id).map((t) => (
          <p key={t.id} className="other-team">
            <span className={`team-tag team-${teamIndex(state, t.id)}`}>{t.name}</span>{' '}
            {t.memberIds.map((id) => {
              const p = playerById(state, id);
              return p ? `${flagOf(p.country)} ${p.name}` : '';
            }).join(', ') || <span className="muted">no one yet</span>}
          </p>
        ))}
        <h3>This room’s deck</h3>
        <MixBar mix={state.mix} />
        <p className="muted small">
          {state.settings.numRounds} rounds · {state.settings.turnSeconds}s turns
        </p>
      </div>
    </div>
  );
}
