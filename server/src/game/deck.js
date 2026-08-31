const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RED_SUITS = new Set(['hearts', 'diamonds']);
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

let nextCardId = 1;

export function cardValue(card) {
  if (card.rank === 'A') return 1;
  if (card.rank === 'J') return 11;
  if (card.rank === 'Q') return 12;
  if (card.rank === 'K') return RED_SUITS.has(card.suit) ? -1 : 13;
  return Number(card.rank);
}

export function cardPower(card) {
  if (card.rank === '7' || card.rank === '8') return 'peek-own';
  if (card.rank === '9' || card.rank === '10') return 'peek-other';
  if (card.rank === 'J' || card.rank === 'Q') return 'swap-blind';
  return null;
}

export function buildDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `c${nextCardId++}`, suit, rank });
    }
  }
  return deck;
}

export function shuffle(cards) {
  const arr = cards.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
