import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { act, inviteUrl } from '../session.js';
import {
  CardList, MixBar, PlayerName, Scoreboard, Standings, TeamTag, Timer, TurnCounts, playerById, teamOf,
} from './shared.jsx';

// The host screen: made to sit on a TV. It runs the room but never shows the
// card being described.
export default function Dashboard(props) {
  const { state } = props;
  const [error, setError] = useState('');
  const run = async (action, args) => {
    setError('');
    const res = await act(action, args);
    if (!res.ok) setError(res.error);
  };
  const p = { ...props, run };

  return (
    <div className="dashboard">
      {error && <p className="error dash-error">{error}</p>}
      {state.phase === 'lobby' && <DashLobby {...p} />}
      {['ready', 'active', 'review'].includes(state.phase) && <DashGame {...p} />}
      {state.phase === 'over' && <DashOver {...p} />}
    </div>
  );
}

function JoinPanel({ code, small = false }) {
  const [qr, setQr] = useState('');
  const url = inviteUrl(code);
  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 360, color: { dark: '#1d1846', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(''));
  }, [url]);
  return (
    <div className={`join-panel ${small ? 'small' : ''}`}>
      <div>
        <div className="join-label">Join at</div>
        <div className="join-url">{window.location.host}</div>
        <div className="join-label">with code</div>
        <div className="join-code">{code}</div>
      </div>
      {qr && <img className="qr" src={qr} alt={`QR code to join room ${code}`} />}
    </div>
  );
}

function DashLobby({ state, flagOf, run }) {
  const { settings } = state;
  const tooSmall = state.teams.filter((t) => t.memberIds.length < 2);
  return (
    <div className="dash-lobby">
      <section className="dash-left">
        <JoinPanel code={state.code} />
        <div className="panel">
          <h3>Game settings</h3>
          <div className="setting-row">
            <span>Teams</span>
            <Stepper value={settings.numTeams} min={2} max={4} onChange={(v) => run('settings', { numTeams: v })} />
          </div>
          <div className="setting-row">
            <span>Rounds</span>
            <Stepper value={settings.numRounds} min={1} max={10} onChange={(v) => run('settings', { numRounds: v })} />
          </div>
          <p className="muted small">
            Each round, every team gets one {settings.turnSeconds}-second turn: {state.totalTurns} turns in total.
          </p>
          <h3>Deck mix</h3>
          <MixBar mix={state.mix} />
          <p className="muted small">Weighted by where players are from. Cards are never repeated in this room.</p>
        </div>
      </section>

      <section className="dash-right">
        <div className="dash-teams-head">
          <h2>{state.players.length} {state.players.length === 1 ? 'player' : 'players'}</h2>
          <button onClick={() => run('autoBalance')} disabled={!state.players.length}>
            ⚖️ Auto-balance teams
          </button>
        </div>
        <p className="muted small">
          New players are added to the smallest team. Auto-balance evens out team sizes and spreads each
          country across the teams. Use “Move” to adjust by hand.
        </p>
        <TeamColumns state={state} flagOf={flagOf} run={run} editable />
        <div className="start-row">
          {tooSmall.length > 0 && (
            <span className="muted">Every team needs at least 2 players.</span>
          )}
          <button className="primary big" disabled={tooSmall.length > 0} onClick={() => run('start')}>
            Start game
          </button>
        </div>
      </section>
    </div>
  );
}

function Stepper({ value, min, max, onChange }) {
  return (
    <div className="stepper">
      <button aria-label="Fewer" disabled={value <= min} onClick={() => onChange(value - 1)}>−</button>
      <span>{value}</span>
      <button aria-label="More" disabled={value >= max} onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}

function TeamColumns({ state, flagOf, run, editable = false, highlight = {} }) {
  return (
    <div className={`team-columns cols-${state.teams.length}`}>
      {state.teams.map((team, i) => (
        <div key={team.id} className={`team-col team-${i} ${state.turn?.teamId === team.id ? 'playing' : ''}`}>
          <div className="team-col-head">
            {editable ? (
              <TeamNameInput team={team} run={run} />
            ) : (
              <span className="team-col-name">{team.name}</span>
            )}
            {!editable && <span className="team-col-score">{team.score}</span>}
          </div>
          <ul>
            {team.memberIds.map((id) => {
              const p = playerById(state, id);
              if (!p) return null;
              return (
                <li key={id} className={p.connected ? '' : 'offline'}>
                  <span className="flag">{flagOf(p.country)}</span>
                  <span className="pname">{p.name}</span>
                  {highlight[id] && <span className="role-chip">{highlight[id]}</span>}
                  {!p.connected && <span className="offline-chip">away</span>}
                  {editable && (
                    <span className="player-tools">
                      <select
                        aria-label={`Move ${p.name}`}
                        value=""
                        onChange={(e) => e.target.value && run('movePlayer', { playerId: id, teamId: e.target.value })}
                      >
                        <option value="">Move…</option>
                        {state.teams.filter((t) => t.id !== team.id).map((t) => (
                          <option key={t.id} value={t.id}>to {t.name}</option>
                        ))}
                      </select>
                      <button
                        className="icon-btn"
                        aria-label={`Remove ${p.name}`}
                        onClick={() => window.confirm(`Remove ${p.name} from the room?`) && run('kick', { playerId: id })}
                      >
                        ✕
                      </button>
                    </span>
                  )}
                </li>
              );
            })}
            {!team.memberIds.length && <li className="muted empty">No one yet</li>}
          </ul>
        </div>
      ))}
    </div>
  );
}

function TeamNameInput({ team, run }) {
  const [name, setName] = useState(team.name);
  useEffect(() => setName(team.name), [team.name]);
  const save = () => name.trim() && name !== team.name && run('renameTeam', { teamId: team.id, name });
  return (
    <input
      className="team-name-input"
      value={name}
      maxLength={20}
      aria-label="Team name"
      onChange={(e) => setName(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  );
}

function DashGame({ state, flagOf, clockOffset, run }) {
  const { turn } = state;
  const giver = playerById(state, turn.giverId);
  const checker = playerById(state, turn.checkerId);
  const checkerTeam = teamOf(state, turn.checkerId);
  // Anyone not on the guessing team can take over as checker.
  const checkerOptions = state.players.filter((p) => teamOf(state, p.id)?.id !== turn.teamId);

  return (
    <div className="dash-game">
      <div className="dash-game-top">
        <div className="round-info">
          Round {turn.round} of {state.settings.numRounds} · Turn {state.turnNumber} of {state.totalTurns}
          <span className="muted"> · {state.cardsLeft} cards left</span>
        </div>
        <JoinPanel code={state.code} small />
      </div>

      <section className="stage">
        <div className="stage-who">
          <TeamTag state={state} teamId={turn.teamId} />
          <h1>
            {state.phase === 'ready' && <>Up next: <PlayerName state={state} id={turn.giverId} flagOf={flagOf} /></>}
            {state.phase === 'active' && <><PlayerName state={state} id={turn.giverId} flagOf={flagOf} /> is giving clues</>}
            {state.phase === 'review' && <>Time’s up!</>}
          </h1>
          <p className="stage-sub">
            Checking: <PlayerName state={state} id={turn.checkerId} flagOf={flagOf} />
            {checkerTeam && <> (<TeamTag state={state} teamId={checkerTeam.id} />)</>}
          </p>
          {state.phase === 'ready' && (
            <p className="stage-hint">{giver?.name} taps <strong>Start</strong> on their phone when the team is ready.</p>
          )}
          {state.phase === 'review' && (
            <p className="stage-hint">{checker?.name} is checking the results on their phone.</p>
          )}
        </div>

        {state.phase === 'active' && (
          <div className="stage-live">
            <Timer endsAt={turn.endsAt} clockOffset={clockOffset} total={state.settings.turnSeconds} size="xl" />
            <TurnCounts turn={turn} />
          </div>
        )}
        {state.phase === 'review' && (
          <div className="stage-review">
            <TurnCounts turn={turn} />
            <CardList cards={turn.cards} />
          </div>
        )}
      </section>

      <TeamColumns
        state={state}
        flagOf={flagOf}
        run={run}
        highlight={{ [turn.giverId]: 'clues', [turn.checkerId]: 'checker' }}
      />

      <details className="host-tools">
        <summary>Host controls</summary>
        <div className="host-tools-body">
          {checker && !checker.connected && (
            <p className="warn-text">{checker.name} is away. Pick someone else to check cards.</p>
          )}
          <label className="inline">
            Checker
            <select value={turn.checkerId} onChange={(e) => run('reassignChecker', { playerId: e.target.value })}>
              {checkerOptions.map((p) => (
                <option key={p.id} value={p.id}>{flagOf(p.country)} {p.name}</option>
              ))}
            </select>
          </label>
          {state.phase === 'ready' && (
            <button onClick={() => window.confirm(`Skip ${giver?.name}'s turn? It scores 0.`) && run('skipTurn')}>
              Skip this turn
            </button>
          )}
          <button className="danger" onClick={() => window.confirm('End the game now? Scores so far are final.') && run('endGame')}>
            End game
          </button>
        </div>
      </details>

      <History state={state} flagOf={flagOf} />
    </div>
  );
}

function History({ state, flagOf }) {
  if (!state.history.length) return null;
  return (
    <section className="history">
      <h3>Previous turns</h3>
      <ul>
        {[...state.history].reverse().map((h, i) => (
          <li key={i}>
            <TeamTag state={state} teamId={h.teamId} />
            <PlayerName state={state} id={h.giverId} flagOf={flagOf} />
            <span className="muted">
              {h.cards.filter((c) => c.result === 'guessed').length} guessed ·{' '}
              {h.cards.filter((c) => c.result === 'skipped').length} skipped
            </span>
            <strong>{h.points > 0 ? `+${h.points}` : h.points}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DashOver({ state, flagOf, run }) {
  return (
    <div className="dash-over">
      <Standings state={state} />
      <div className="start-row center">
        <button className="primary big" onClick={() => run('lobby')}>
          Back to lobby
        </button>
      </div>
      <p className="muted center small">Teams stay as they are. You can change them before the next game. New games won’t repeat cards.</p>
      <History state={state} flagOf={flagOf} />
    </div>
  );
}
