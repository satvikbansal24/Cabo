import React, { useEffect, useState } from 'react';
import Card from './Card.jsx';
import PlayerHand from './PlayerHand.jsx';

const POWER_LABEL = {
  'peek-own': 'Know your fate — click one of your own cards to peek',
  'peek-other': "Know a friend — click one of an opponent's cards to peek",
  'swap-blind': 'Blind swap — click any two cards on the table to swap them, unseen',
  'look-and-swap': 'Look & swap',
};

export default function GameBoard({
  game,
  myId,
  socket,
  code,
  myDrawnCard,
  myPeekCards,
  recentPenalty,
  onOpenRules,
}) {
  const [pick1, setPick1] = useState(null); // generic two-click accumulator for swap-style powers
  const [matchModeArmed, setMatchModeArmed] = useState(false);
  const [matchGiveTarget, setMatchGiveTarget] = useState(null);

  useEffect(() => {
    setPick1(null);
  }, [game.pendingPower?.type, game.pendingPower?.stage, game.phase, game.turnPlayerId]);

  useEffect(() => {
    if (!game.matchable) {
      setMatchModeArmed(false);
      setMatchGiveTarget(null);
    }
  }, [game.matchable, game.discardTop]);

  const me = game.players.find((p) => p.id === myId);
  const others = game.players.filter((p) => p.id !== myId);
  const isMyTurn = game.turnPlayerId === myId;
  const isPeek = game.phase === 'peek';
  const iAmPlaying = game.phase === 'turn-awaiting-play' && game.awaitingPlayPlayerId === myId;
  const iAmResolvingPower = game.phase === 'turn-awaiting-power' && game.pendingPower?.playerId === myId;
  const iAmAtTurnEnd = game.phase === 'turn-end' && isMyTurn;
  const iAmLocked = game.caboCalledBy === myId;
  const iCanMatch = game.matchable && !iAmLocked;

  function emit(event, payload) {
    socket.emit(event, { code, ...payload }, () => {});
  }
  function emitUsePower(payload) {
    emit('game:usePower', { payload });
  }

  function handleMatchClick(playerId, index) {
    if (matchGiveTarget) {
      if (playerId !== myId) return;
      emit('game:matchAttempt', {
        payload: {
          mode: 'opponent',
          targetPlayerId: matchGiveTarget.targetPlayerId,
          targetHandIndex: matchGiveTarget.targetHandIndex,
          giveIndex: index,
        },
      });
      setMatchGiveTarget(null);
      setMatchModeArmed(false);
      return;
    }
    if (playerId === myId) {
      emit('game:matchAttempt', { payload: { mode: 'own', handIndex: index } });
      setMatchModeArmed(false);
    } else {
      setMatchGiveTarget({ targetPlayerId: playerId, targetHandIndex: index });
    }
  }

  function handlePowerClick(playerId, index) {
    const power = game.pendingPower;
    if (power.type === 'peek-own') {
      if (playerId === myId) emitUsePower({ handIndex: index });
      return;
    }
    if (power.type === 'peek-other') {
      if (playerId !== myId) emitUsePower({ targetPlayerId: playerId, handIndex: index });
      return;
    }
    if (power.type === 'swap-blind') {
      const p = { playerId, handIndex: index };
      if (!pick1) return setPick1(p);
      if (pick1.playerId === p.playerId && pick1.handIndex === p.handIndex) return setPick1(null);
      emitUsePower({ a: pick1, b: p });
      setPick1(null);
      return;
    }
    if (power.type === 'look-and-swap' && power.stage === 'peek') {
      if (playerId === myId) {
        if (pick1 && pick1.playerId !== myId) {
          emitUsePower({ ownIndex: index, targetPlayerId: pick1.playerId, otherIndex: pick1.handIndex });
          setPick1(null);
        } else {
          setPick1({ playerId, handIndex: index });
        }
      } else {
        if (pick1 && pick1.playerId === myId) {
          emitUsePower({ ownIndex: pick1.handIndex, targetPlayerId: playerId, otherIndex: index });
          setPick1(null);
        } else {
          setPick1({ playerId, handIndex: index });
        }
      }
      return;
    }
    if (power.type === 'look-and-swap' && power.stage === 'swap') {
      const targetId = power.targetPlayerId;
      if (playerId !== myId && playerId !== targetId) return;
      if (playerId === myId) {
        if (pick1 && pick1.playerId === targetId) {
          emitUsePower({ ownIndex: index, otherIndex: pick1.handIndex });
          setPick1(null);
        } else {
          setPick1({ playerId, handIndex: index });
        }
      } else {
        if (pick1 && pick1.playerId === myId) {
          emitUsePower({ ownIndex: pick1.handIndex, otherIndex: index });
          setPick1(null);
        } else {
          setPick1({ playerId, handIndex: index });
        }
      }
    }
  }

  function onCardClick(playerId, index) {
    if (matchModeArmed && iCanMatch) return handleMatchClick(playerId, index);
    if (iAmPlaying && playerId === myId) return emit('game:keepAndSwap', { handIndex: index });
    if (iAmResolvingPower) return handlePowerClick(playerId, index);
  }

  function selectableFor(playerId, slots) {
    const set = new Set();
    const addNonNull = () => slots.forEach((c, i) => c !== null && set.add(i));

    if (matchModeArmed && iCanMatch) {
      if (matchGiveTarget) {
        if (playerId === myId) addNonNull();
      } else if (playerId !== game.caboCalledBy) {
        addNonNull();
      }
      return set;
    }
    if (iAmPlaying && playerId === myId) {
      slots.forEach((c, i) => set.add(i));
      return set;
    }
    if (iAmResolvingPower) {
      const power = game.pendingPower;
      if (power.type === 'peek-own' && playerId === myId) addNonNull();
      else if (power.type === 'peek-other' && playerId !== myId && playerId !== game.caboCalledBy) addNonNull();
      else if (power.type === 'swap-blind' && playerId !== game.caboCalledBy) addNonNull();
      else if (power.type === 'look-and-swap') {
        if (power.stage === 'peek') {
          if (playerId === myId || playerId !== game.caboCalledBy) addNonNull();
        } else if (playerId === myId || playerId === power.targetPlayerId) {
          addNonNull();
        }
      }
      return set;
    }
    return set;
  }

  function displaySlots(playerId, rawSlots) {
    if (isPeek && playerId === myId && myPeekCards) {
      return rawSlots.map((c, i) => (myPeekCards[i] ? myPeekCards[i] : c));
    }
    return rawSlots;
  }

  const mySlots = displaySlots(myId, game.hands[myId] || []);

  function renderHand(p) {
    const slots = displaySlots(p.id, game.hands[p.id] || []);
    return (
      <PlayerHand
        key={p.id}
        player={p}
        slots={slots}
        isSelf={p.id === myId}
        isCurrentTurn={game.turnPlayerId === p.id}
        isCaboCaller={game.caboCalledBy === p.id}
        selectableIndices={selectableFor(p.id, game.hands[p.id] || [])}
        selectedIndex={pick1?.playerId === p.id ? pick1.handIndex : matchGiveTarget?.targetPlayerId === p.id ? matchGiveTarget.targetHandIndex : undefined}
        penaltyIndex={recentPenalty?.playerId === p.id ? recentPenalty.index : undefined}
        onCardClick={(i) => onCardClick(p.id, i)}
      />
    );
  }

  return (
    <div className="game-board">
      <div className="game-meta">
        <span>Round {game.round}</span>
        <span>Target score {game.targetScore}</span>
        <button className="link-btn" onClick={onOpenRules}>Rules</button>
      </div>

      {isPeek && (
        <div className="peek-banner">
          <strong>Memorize your bottom two cards</strong> (highlighted below), then click ready. They'll flip back down once everyone's ready.
          <button disabled={game.peekReady.includes(myId)} onClick={() => emit('game:peekReady', {})}>
            {game.peekReady.includes(myId) ? 'Waiting for others…' : "I'm ready"}
          </button>
          <span className="hint">{game.peekReady.length}/{game.players.length} ready</span>
        </div>
      )}

      {iCanMatch && !isPeek && (
        <div className="match-banner">
          <span>⚡ A card can be matched right now — first to claim it wins.</span>
          {!matchModeArmed ? (
            <button className="match-btn" onClick={() => setMatchModeArmed(true)}>Try to match</button>
          ) : (
            <>
              <span className="hint">
                {matchGiveTarget ? 'Pick one of your own cards to give away, blind.' : 'Tap a card — yours, or an opponent\'s.'}
              </span>
              <button className="link-btn" onClick={() => { setMatchModeArmed(false); setMatchGiveTarget(null); }}>Cancel</button>
            </>
          )}
        </div>
      )}

      <div className="opponents-row">{others.map(renderHand)}</div>

      {!isPeek && (
        <div className="piles-row">
          <div className="pile">
            <div className="pile-label">Draw ({game.drawCount})</div>
            <Card
              card="hidden"
              empty={game.drawCount === 0}
              selectable={game.phase === 'turn-awaiting-draw' && isMyTurn && game.drawCount > 0}
              onClick={() =>
                game.phase === 'turn-awaiting-draw' && isMyTurn && game.drawCount > 0 && emit('game:drawDeck', {})
              }
            />
          </div>
          <div className="pile">
            <div className="pile-label">Discard</div>
            <Card
              card={game.discardTop}
              empty={!game.discardTop}
              selectable={game.phase === 'turn-awaiting-draw' && isMyTurn && game.canDrawDiscard}
              onClick={() =>
                game.phase === 'turn-awaiting-draw' && isMyTurn && game.canDrawDiscard && emit('game:drawDiscard', {})
              }
            />
            {game.phase === 'turn-awaiting-draw' && isMyTurn && game.discardTop && !game.canDrawDiscard && (
              <div className="pile-label">last play was matched — can't take it</div>
            )}
          </div>

          {iAmPlaying && (
            <div className="drawn-card-panel">
              <div className="pile-label">Your drawn card</div>
              <Card card={myDrawnCard?.card} />
              <div className="drawn-actions">
                {myDrawnCard?.source === 'deck' ? (
                  <>
                    <button onClick={() => emit('game:playDrawnCard', {})}>Play it</button>
                    <p>or click one of your cards below to keep it instead</p>
                  </>
                ) : (
                  <p>Taken from the discard pile — click one of your cards below to keep it.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {iAmResolvingPower && (
        <div className="power-banner">
          <strong>Power:</strong>{' '}
          {game.pendingPower.type === 'look-and-swap'
            ? game.pendingPower.stage === 'peek'
              ? 'Look & swap — click one of your own cards and one of an opponent\'s to peek at both.'
              : "Now the mandatory swap — click one of your cards and one of that opponent's to swap them."
            : POWER_LABEL[game.pendingPower.type]}
          {pick1 && <span className="hint"> — first card selected, pick the second</span>}
          {!(game.pendingPower.type === 'look-and-swap' && game.pendingPower.stage === 'swap') && (
            <button className="link-btn" onClick={() => emit('game:skipPower', {})}>Skip power</button>
          )}
        </div>
      )}

      {!iAmResolvingPower && game.pendingPower && (
        <div className="power-banner power-banner-waiting">
          Waiting for {game.players.find((p) => p.id === game.pendingPower.playerId)?.name} to use their power…
        </div>
      )}

      {iAmAtTurnEnd && (
        <div className="action-row">
          <button onClick={() => emit('game:endTurn', {})}>End turn</button>
          <button className="cabo-btn" disabled={!!game.caboCalledBy} onClick={() => emit('game:callCabo', {})}>
            Call Cabo!
          </button>
        </div>
      )}

      <div className="self-row">
        <PlayerHand
          player={me}
          slots={mySlots}
          isSelf
          isCurrentTurn={game.turnPlayerId === myId}
          isCaboCaller={game.caboCalledBy === myId}
          selectableIndices={selectableFor(myId, game.hands[myId] || [])}
          selectedIndex={pick1?.playerId === myId ? pick1.handIndex : matchGiveTarget?.targetPlayerId === myId ? matchGiveTarget.targetHandIndex : undefined}
          penaltyIndex={recentPenalty?.playerId === myId ? recentPenalty.index : undefined}
          onCardClick={(i) => onCardClick(myId, i)}
        />
      </div>
    </div>
  );
}
