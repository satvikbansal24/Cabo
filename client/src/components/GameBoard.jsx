import React, { useMemo, useState, useEffect } from 'react';
import Card from './Card.jsx';
import PlayerHand from './PlayerHand.jsx';

const POWER_LABEL = {
  'peek-own': 'Peek at one of your own cards',
  'peek-other': "Peek at an opponent's card",
  'swap-blind': 'Blindly swap two cards on the table (any players)',
};

export default function GameBoard({ game, myId, hostId, socket, code, myDrawnCard }) {
  const [swapFirstPick, setSwapFirstPick] = useState(null);

  useEffect(() => {
    setSwapFirstPick(null);
  }, [game.pendingPower, game.phase]);

  const me = game.players.find((p) => p.id === myId);
  const others = game.players.filter((p) => p.id !== myId);
  const isMyTurn = game.turnPlayerId === myId;
  const iAmDeciding = game.phase === 'turn-awaiting-decision' && game.awaitingDecisionPlayerId === myId;
  const iAmResolvingPower = game.phase === 'turn-awaiting-power' && game.pendingPower?.playerId === myId;
  const matchingAllowed = game.phase === 'turn-awaiting-draw';

  function emit(event, payload) {
    socket.emit(event, { code, ...payload }, (res) => {
      if (res && res.ok === false) {
        // surfaced via global error listener too; nothing else to do here
      }
    });
  }

  function selectableFor(playerId, slots) {
    const set = new Set();
    if (iAmDeciding && playerId === myId) {
      slots.forEach((c, i) => set.add(i));
      return set;
    }
    if (iAmResolvingPower) {
      const type = game.pendingPower.type;
      if (type === 'peek-own' && playerId === myId) {
        slots.forEach((c, i) => c !== null && set.add(i));
      } else if (type === 'peek-other' && playerId !== myId) {
        slots.forEach((c, i) => c !== null && set.add(i));
      } else if (type === 'swap-blind') {
        slots.forEach((c, i) => c !== null && set.add(i));
      }
      return set;
    }
    if (matchingAllowed && playerId === myId) {
      slots.forEach((c, i) => c !== null && set.add(i));
    }
    return set;
  }

  function onCardClick(playerId, handIndex) {
    if (iAmDeciding && playerId === myId) {
      emit('game:swap', { handIndex });
      return;
    }
    if (iAmResolvingPower) {
      const type = game.pendingPower.type;
      if (type === 'peek-own') {
        emit('game:usePower', { payload: { handIndex } });
      } else if (type === 'peek-other') {
        emit('game:usePower', { payload: { targetPlayerId: playerId, handIndex } });
      } else if (type === 'swap-blind') {
        const pick = { playerId, handIndex };
        if (!swapFirstPick) {
          setSwapFirstPick(pick);
        } else if (swapFirstPick.playerId === pick.playerId && swapFirstPick.handIndex === pick.handIndex) {
          setSwapFirstPick(null);
        } else {
          emit('game:usePower', { payload: { a: swapFirstPick, b: pick } });
          setSwapFirstPick(null);
        }
      }
      return;
    }
    if (matchingAllowed && playerId === myId) {
      emit('game:matchAttempt', { handIndex });
    }
  }

  const mySlots = game.hands[myId] || [];

  return (
    <div className="game-board">
      <div className="game-meta">
        <span>Round {game.round}</span>
        <span>Target score {game.targetScore}</span>
      </div>

      <div className="opponents-row">
        {others.map((p) => (
          <PlayerHand
            key={p.id}
            player={p}
            slots={game.hands[p.id] || []}
            isCurrentTurn={game.turnPlayerId === p.id}
            isCaboCaller={game.caboCalledBy === p.id}
            selectableIndices={selectableFor(p.id, game.hands[p.id] || [])}
            selectedIndex={swapFirstPick?.playerId === p.id ? swapFirstPick.handIndex : undefined}
            onCardClick={(i) => onCardClick(p.id, i)}
          />
        ))}
      </div>

      <div className="piles-row">
        <div className="pile">
          <div className="pile-label">Draw ({game.drawCount})</div>
          <Card
            card={'hidden'}
            empty={game.drawCount === 0}
            selectable={game.phase === 'turn-awaiting-draw' && isMyTurn && game.drawCount > 0}
            onClick={() =>
              game.phase === 'turn-awaiting-draw' && isMyTurn && game.drawCount > 0 && emit('game:drawDeck')
            }
          />
        </div>
        <div className="pile">
          <div className="pile-label">Discard</div>
          <Card
            card={game.discardTop}
            empty={!game.discardTop}
            selectable={game.phase === 'turn-awaiting-draw' && isMyTurn && !!game.discardTop}
            onClick={() =>
              game.phase === 'turn-awaiting-draw' && isMyTurn && game.discardTop && emit('game:drawDiscard')
            }
          />
        </div>

        {iAmDeciding && (
          <div className="drawn-card-panel">
            <div className="pile-label">Your drawn card</div>
            <Card card={myDrawnCard?.card} />
            <div className="drawn-actions">
              <p>Click one of your cards below to swap it in.</p>
              {myDrawnCard?.source === 'deck' && (
                <button onClick={() => emit('game:discardDrawn')}>Discard it instead</button>
              )}
            </div>
          </div>
        )}
      </div>

      {game.phase === 'turn-awaiting-draw' && isMyTurn && (
        <div className="action-row">
          <button
            className="cabo-btn"
            disabled={!!game.caboCalledBy}
            onClick={() => emit('game:callCabo')}
          >
            Call Cabo!
          </button>
        </div>
      )}

      {iAmResolvingPower && (
        <div className="power-banner">
          <strong>Power:</strong> {POWER_LABEL[game.pendingPower.type]}
          {game.pendingPower.type === 'swap-blind' && swapFirstPick && (
            <span> — first card selected, pick the second</span>
          )}
          <button className="link-btn" onClick={() => emit('game:skipPower')}>
            Skip power
          </button>
        </div>
      )}

      {!iAmResolvingPower && game.pendingPower && (
        <div className="power-banner power-banner-waiting">
          Waiting for {game.players.find((p) => p.id === game.pendingPower.playerId)?.name} to use their power…
        </div>
      )}

      {matchingAllowed && (
        <div className="hint">Spot a match? Click one of your own cards to discard it if it matches the top of the discard pile. Wrong guesses draw a penalty card!</div>
      )}

      <div className="self-row">
        <PlayerHand
          player={me}
          slots={mySlots}
          isSelf
          isCurrentTurn={game.turnPlayerId === myId}
          isCaboCaller={game.caboCalledBy === myId}
          selectableIndices={selectableFor(myId, mySlots)}
          selectedIndex={swapFirstPick?.playerId === myId ? swapFirstPick.handIndex : undefined}
          onCardClick={(i) => onCardClick(myId, i)}
        />
      </div>
    </div>
  );
}
