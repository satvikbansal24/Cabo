import React from 'react';

const SUIT_SYMBOL = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const RED_SUITS = new Set(['hearts', 'diamonds']);

export default function Card({ card, empty, onClick, selectable, highlighted, small, peeking }) {
  if (empty) {
    return <div className="card card-empty" />;
  }

  const classes = ['card'];
  if (selectable) classes.push('card-selectable');
  if (highlighted) classes.push('card-highlighted');
  if (small) classes.push('card-small');
  if (peeking) classes.push('card-peeking');

  const faceUp = card && typeof card === 'object';

  if (!faceUp) {
    return (
      <div className={classes.concat('card-back').join(' ')} onClick={onClick}>
        <span className="card-back-emblem">🃏</span>
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
