import React from 'react';

const SUIT_SYMBOL = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const RED_SUITS = new Set(['hearts', 'diamonds']);

export default function Card({ card, empty, onClick, selectable, highlighted, small, flash }) {
  if (empty) {
    return <div className="card card-empty" />;
  }

  const classes = ['card'];
  if (selectable) classes.push('card-selectable');
  if (highlighted) classes.push('card-highlighted');
  if (small) classes.push('card-small');
  if (flash) classes.push('card-flash-penalty');

  const faceUp = card && typeof card === 'object';

  if (!faceUp) {
    return (
      <div className={classes.concat('card-back').join(' ')} onClick={onClick}>
        <span className="card-back-emblem">🃏</span>
      </div>
    );
  }

  if (card.rank === 'JOKER') {
    return (
      <div className={classes.concat('card-face', 'card-joker').join(' ')} onClick={onClick}>
        <span className="card-joker-emblem">🃟</span>
        <span className="card-joker-label">JOKER</span>
      </div>
    );
  }

  const red = RED_SUITS.has(card.suit);
  return (
    <div className={classes.concat('card-face', red ? 'card-red' : 'card-black').join(' ')} onClick={onClick}>
      <span className="card-rank">{card.rank}</span>
      <span className="card-suit">{SUIT_SYMBOL[card.suit]}</span>
    </div>
  );
}
