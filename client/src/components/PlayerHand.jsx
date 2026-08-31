import React from 'react';
import Card from './Card.jsx';

export default function PlayerHand({ player, slots, isSelf, isCurrentTurn, isCaboCaller, selectableIndices, selectedIndex, onCardClick }) {
  return (
    <div className={'player-hand' + (isCurrentTurn ? ' player-hand-active' : '') + (isSelf ? ' player-hand-self' : '')}>
      <div className="player-hand-name">
        {!player.connected && <span className="dot-offline" title="disconnected" />}
        {player.name}
        {isSelf && ' (you)'}
        {isCurrentTurn && <span className="badge badge-turn">turn</span>}
        {isCaboCaller && <span className="badge badge-cabo">CABO</span>}
      </div>
      <div className="hand-cards">
        {slots.map((card, i) => (
          <Card
            key={i}
            card={card}
            empty={card === null}
            selectable={selectableIndices?.has(i)}
            highlighted={selectedIndex === i}
            onClick={() => selectableIndices?.has(i) && onCardClick?.(i)}
          />
        ))}
      </div>
    </div>
  );
}
