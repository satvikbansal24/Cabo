import React from 'react';
import Card from './Card.jsx';

export default function PlayerHand({ player, slots, isSelf, isCurrentTurn, isCaboCaller, selectableIndices, selectedIndex, penaltyIndex, onCardClick }) {
  return (
    <div className={'player-hand' + (isCurrentTurn ? ' player-hand-active' : '') + (isSelf ? ' player-hand-self' : '') + (isCaboCaller ? ' player-hand-locked' : '')}>
      <div className="player-hand-name">
        {player.connected === false && <span className="dot-offline" title="disconnected" />}
        {player.name}
        {isSelf && ' (you)'}
        {isCurrentTurn && <span className="badge badge-turn">turn</span>}
        {isCaboCaller && <span className="badge badge-cabo">CABO — locked</span>}
      </div>
      <div className="hand-cards">
        {slots.map((card, i) => (
          <Card
            key={i}
            card={card}
            empty={card === null}
            selectable={selectableIndices?.has(i)}
            highlighted={selectedIndex === i}
            flash={penaltyIndex === i}
            onClick={() => selectableIndices?.has(i) && onCardClick?.(i)}
          />
        ))}
      </div>
    </div>
  );
}
