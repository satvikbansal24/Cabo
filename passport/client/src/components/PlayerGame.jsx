import React, { useState } from 'react';
import { act } from '../session.js';
import { CardList, PlayerName, Scoreboard, TeamTag, Timer, TurnCounts, playerById, teamOf } from './shared.jsx';

// One phone's view of a turn. What it shows depends on this player's role:
//  - giver:    sees the card, describes it out loud
//  - checker:  (from the team that played before) sees the card, marks it
//  - guesser:  on the giver's team, sees only the timer
//  - watcher:  everyone else, sees the timer and the running count
export default function PlayerGame({ state, flagOf, clockOffset }) {
  const { turn, you } = state;
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async (action, args) => {
    if (busy) return;
    setBusy(true);
    setError('');
    const res = await act(action, args);
    setBusy(false);
    if (!res.ok) setError(res.error);
  };

  const role =
    you === turn.giverId ? 'giver'
      : turn.youCheck ? 'checker'
        : teamOf(state, you)?.id === turn.teamId ? 'guesser'
          : 'watcher';
  const giverName = <PlayerName state={state} id={turn.giverId} flagOf={flagOf} />;
  const checkerName = <PlayerName state={state} id={turn.checkerId} flagOf={flagOf} />;

  let body;
  if (state.phase === 'ready') {
    body = {
      giver: (
        <div className="role-panel">
          <div className="role-badge">You’re giving clues!</div>
          <RuleReminder />
          <button className="primary huge" disabled={busy} onClick={() => run('startTurn')}>
            Start my turn
          </button>
          <p className="muted small">{checkerName} will mark each card on their phone.</p>
        </div>
      ),
      checker: (
        <div className="role-panel">
          <div className="role-badge alt">You’re the checker</div>
          <p>
            When {giverName} starts, you’ll see each card. Tap <strong>Got it</strong> when their team says it, or{' '}
            <strong>Skip</strong> if they pass or break a rule.
          </p>
          <RuleReminder short />
        </div>
      ),
      guesser: (
        <div className="role-panel">
          <div className="role-badge">Your team is up!</div>
          <p>{giverName} is about to give clues. Get ready to shout answers.</p>
        </div>
      ),
      watcher: (
        <div className="role-panel">
          <p>
            Up next: {giverName} for <TeamTag state={state} teamId={turn.teamId} />.
          </p>
          <p className="muted">{checkerName} is checking the cards.</p>
        </div>
      ),
    }[role];
  } else if (state.phase === 'active') {
    const timer = <Timer endsAt={turn.endsAt} clockOffset={clockOffset} total={state.settings.turnSeconds} size="lg" />;
    if (role === 'giver' || role === 'checker') {
      body = (
        <div className="role-panel live">
          {timer}
          <div className="the-card" aria-live="polite">
            <span className="card-origin">{turn.current?.origin}</span>
            <span className="card-text">{turn.current?.text || '…'}</span>
          </div>
          {role === 'checker' ? (
            <>
              <div className="mark-buttons">
                <button className="skip-btn" disabled={busy} onClick={() => run('mark', { result: 'skipped' })}>
                  Skip
                </button>
                <button className="got-btn" disabled={busy} onClick={() => run('mark', { result: 'guessed' })}>
                  Got it ✓
                </button>
              </div>
              <p className="muted small">
                {turn.skipped === 0 ? 'First skip is free.' : 'Each extra skip costs 1 point.'} Said part of the word, a translation or a synonym? Tap Skip.
              </p>
            </>
          ) : (
            <p className="muted small">
              Don’t say any part of the word, a translation or a synonym. {checkerName} is marking the cards.
            </p>
          )}
          <TurnCounts turn={turn} />
        </div>
      );
    } else {
      body = (
        <div className="role-panel live">
          {timer}
          <h2 className="big-call">{role === 'guesser' ? 'Guess!' : <>Listen in</>}</h2>
          <p className="muted">
            {role === 'guesser' ? <>{giverName} is describing.</> : <>Spot a rule break? Tell {checkerName}.</>}
          </p>
          <TurnCounts turn={turn} />
        </div>
      );
    }
  } else if (state.phase === 'review') {
    body = (
      <div className="role-panel">
        <h2>Time’s up!</h2>
        <TurnCounts turn={turn} />
        {role === 'checker' ? (
          <>
            <p className="muted small">Tap a card to fix its result. Got the last one just as time ran out? Mark it Guessed.</p>
            <CardList cards={turn.cards} onToggle={(index) => run('toggle', { index })} />
            <button className="primary huge" disabled={busy} onClick={() => run('confirm')}>
              Confirm {turn.points > 0 ? `+${turn.points}` : turn.points} for {state.teams.find((t) => t.id === turn.teamId)?.name}
            </button>
          </>
        ) : (
          <>
            <CardList cards={turn.cards} />
            <p className="muted">Waiting for {checkerName} to confirm…</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="player-screen">
      <Scoreboard state={state} compact />
      <p className="round-line">
        Round {turn.round}/{state.settings.numRounds} · <TeamTag state={state} teamId={turn.teamId} /> playing
      </p>
      {error && <p className="error">{error}</p>}
      {body}
    </div>
  );
}

function RuleReminder({ short = false }) {
  return (
    <ul className="rules-mini">
      <li>Describe it in words. No acting, no pointing.</li>
      <li>Don’t say the word, any part of it, a translation or a synonym. Doing so counts as a skip.</li>
      {!short && <li>60 seconds. First skip is free, each extra skip is −1.</li>}
    </ul>
  );
}
