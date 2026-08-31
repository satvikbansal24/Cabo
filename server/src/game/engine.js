import { buildDeck, shuffle, cardValue, cardPower } from './deck.js';

const HAND_SIZE = 4;
const PEEK_INDICES = [2, 3];
const CABO_PENALTY = 5;

function publicCard(card) {
  return card ? { rank: card.rank, suit: card.suit } : null;
}

export class Game {
  constructor({ players, targetScore, broadcast, sendTo }) {
    // players: [{id, name}] in seat order
    this.players = players;
    this.targetScore = targetScore || 100;
    this.broadcast = broadcast; // (event, payload) => void, sent to whole room
    this.sendTo = sendTo; // (playerId, event, payload) => void, private
    this.totalScores = Object.fromEntries(players.map((p) => [p.id, 0]));
    this.round = 0;
    this.phase = 'lobby';
  }

  playerIds() {
    return this.players.map((p) => p.id);
  }

  seatIndex(playerId) {
    return this.players.findIndex((p) => p.id === playerId);
  }

  currentPlayer() {
    return this.players[this.turnIndex];
  }

  assertPhase(...phases) {
    if (!phases.includes(this.phase)) {
      throw new Error(`Action not allowed during phase "${this.phase}"`);
    }
  }

  assertTurn(playerId) {
    if (this.currentPlayer().id !== playerId) {
      throw new Error('Not your turn');
    }
  }

  // ---- Round lifecycle ----

  startGame() {
    this.assertPhase('lobby', 'round-end');
    this.startRound();
  }

  startRound() {
    this.round += 1;
    const deck = shuffle(buildDeck());
    this.hands = {};
    for (const p of this.players) {
      this.hands[p.id] = deck.splice(0, HAND_SIZE);
    }
    this.discardPile = [deck.pop()];
    this.drawPile = deck;
    this.drawnCard = null;
    this.pendingPower = null;
    this.caboCalledBy = null;
    this.caboCallerSeat = null;
    this.lastRoundScores = null;
    this.peekReady = new Set();
    this.turnIndex = (this.round - 1) % this.players.length;
    this.phase = 'peek';

    for (const p of this.players) {
      const cards = PEEK_INDICES.map((i) => ({ index: i, card: publicCard(this.hands[p.id][i]) }));
      this.sendTo(p.id, 'game:private', { type: 'initial-peek', cards });
    }
    this.broadcastState();
  }

  peekReadyMark(playerId) {
    this.assertPhase('peek');
    this.peekReady.add(playerId);
    if (this.peekReady.size >= this.players.length) {
      this.phase = 'turn-awaiting-draw';
    }
    this.broadcastState();
  }

  // ---- Draw pile helpers ----

  drawOne() {
    if (this.drawPile.length === 0) {
      const top = this.discardPile.pop();
      this.drawPile = shuffle(this.discardPile);
      this.discardPile = top ? [top] : [];
    }
    if (this.drawPile.length === 0) {
      throw new Error('No cards left to draw');
    }
    return this.drawPile.pop();
  }

  // ---- Turn actions ----

  drawDeck(playerId) {
    this.assertPhase('turn-awaiting-draw');
    this.assertTurn(playerId);
    const card = this.drawOne();
    this.drawnCard = { card, source: 'deck' };
    this.phase = 'turn-awaiting-decision';
    this.sendTo(playerId, 'game:private', { type: 'drawn', card: publicCard(card), source: 'deck' });
    this.broadcastState();
  }

  drawDiscard(playerId) {
    this.assertPhase('turn-awaiting-draw');
    this.assertTurn(playerId);
    if (this.discardPile.length === 0) throw new Error('Discard pile is empty');
    const card = this.discardPile.pop();
    this.drawnCard = { card, source: 'discard' };
    this.phase = 'turn-awaiting-decision';
    this.sendTo(playerId, 'game:private', { type: 'drawn', card: publicCard(card), source: 'discard' });
    this.broadcastState();
  }

  callCabo(playerId) {
    this.assertPhase('turn-awaiting-draw');
    this.assertTurn(playerId);
    if (this.caboCalledBy) throw new Error('Cabo already called this round');
    this.caboCalledBy = playerId;
    this.caboCallerSeat = this.turnIndex;
    this.advanceTurn();
    this.broadcastState();
  }

  swap(playerId, handIndex) {
    this.assertPhase('turn-awaiting-decision');
    this.assertTurn(playerId);
    if (!this.drawnCard) throw new Error('No drawn card to swap');
    if (handIndex < 0 || handIndex >= this.hands[playerId].length) throw new Error('Invalid hand index');
    const old = this.hands[playerId][handIndex];
    this.hands[playerId][handIndex] = this.drawnCard.card;
    if (old) this.discardPile.push(old);
    this.drawnCard = null;
    this.phase = 'turn-awaiting-draw';
    this.advanceTurn();
    this.broadcastState();
  }

  discardDrawn(playerId) {
    this.assertPhase('turn-awaiting-decision');
    this.assertTurn(playerId);
    if (!this.drawnCard) throw new Error('No drawn card to discard');
    if (this.drawnCard.source !== 'deck') throw new Error('Cards drawn from the discard pile must be swapped in');
    const card = this.drawnCard.card;
    this.discardPile.push(card);
    this.drawnCard = null;
    const power = cardPower(card);
    if (power) {
      this.pendingPower = { type: power, card: publicCard(card) };
      this.phase = 'turn-awaiting-power';
    } else {
      this.phase = 'turn-awaiting-draw';
      this.advanceTurn();
    }
    this.broadcastState();
  }

  usePower(playerId, payload) {
    this.assertPhase('turn-awaiting-power');
    this.assertTurn(playerId);
    const power = this.pendingPower;
    if (!power) throw new Error('No power to resolve');

    if (power.type === 'peek-own') {
      const { handIndex } = payload;
      const hand = this.hands[playerId];
      if (handIndex < 0 || handIndex >= hand.length || !hand[handIndex]) throw new Error('Invalid card');
      this.sendTo(playerId, 'game:private', {
        type: 'power-peek',
        playerId,
        index: handIndex,
        card: publicCard(hand[handIndex]),
      });
    } else if (power.type === 'peek-other') {
      const { targetPlayerId, handIndex } = payload;
      if (targetPlayerId === playerId) throw new Error('Choose an opponent card');
      const hand = this.hands[targetPlayerId];
      if (!hand || handIndex < 0 || handIndex >= hand.length || !hand[handIndex]) throw new Error('Invalid card');
      this.sendTo(playerId, 'game:private', {
        type: 'power-peek',
        playerId: targetPlayerId,
        index: handIndex,
        card: publicCard(hand[handIndex]),
      });
    } else if (power.type === 'swap-blind') {
      const { a, b } = payload;
      const handA = this.hands[a.playerId];
      const handB = this.hands[b.playerId];
      if (!handA || !handB) throw new Error('Invalid target');
      if (a.handIndex < 0 || a.handIndex >= handA.length || b.handIndex < 0 || b.handIndex >= handB.length) {
        throw new Error('Invalid card slot');
      }
      if (a.playerId === b.playerId && a.handIndex === b.handIndex) throw new Error('Choose two different cards');
      if (!handA[a.handIndex] || !handB[b.handIndex]) throw new Error('Both slots must have a card');
      const tmp = handA[a.handIndex];
      handA[a.handIndex] = handB[b.handIndex];
      handB[b.handIndex] = tmp;
    } else {
      throw new Error('Unknown power');
    }

    this.pendingPower = null;
    this.phase = 'turn-awaiting-draw';
    this.advanceTurn();
    this.broadcastState();
  }

  skipPower(playerId) {
    this.assertPhase('turn-awaiting-power');
    this.assertTurn(playerId);
    this.pendingPower = null;
    this.phase = 'turn-awaiting-draw';
    this.advanceTurn();
    this.broadcastState();
  }

  matchAttempt(playerId, handIndex) {
    if (this.drawnCard || this.pendingPower) throw new Error('Cannot match right now');
    this.assertPhase('turn-awaiting-draw');
    if (this.discardPile.length === 0) throw new Error('Discard pile is empty');
    const hand = this.hands[playerId];
    if (!hand) throw new Error('Unknown player');
    if (handIndex < 0 || handIndex >= hand.length || !hand[handIndex]) throw new Error('Invalid card');

    const card = hand[handIndex];
    const topRank = this.discardPile[this.discardPile.length - 1].rank;

    if (card.rank === topRank) {
      hand[handIndex] = null;
      this.discardPile.push(card);
      this.broadcast('game:matchResult', { playerId, handIndex, correct: true });
    } else {
      const penalty = this.drawOne();
      const emptySlot = hand.findIndex((c) => c === null);
      if (emptySlot >= 0) {
        hand[emptySlot] = penalty;
      } else {
        hand.push(penalty);
      }
      this.broadcast('game:matchResult', { playerId, handIndex, correct: false });
    }
    this.broadcastState();
  }

  // ---- Turn/round transitions ----

  advanceTurn() {
    const upcoming = (this.turnIndex + 1) % this.players.length;
    if (this.caboCalledBy !== null && upcoming === this.caboCallerSeat) {
      this.endRound();
    } else {
      this.turnIndex = upcoming;
      this.phase = 'turn-awaiting-draw';
    }
  }

  endRound() {
    const scores = {};
    for (const p of this.players) {
      scores[p.id] = this.hands[p.id].reduce((sum, c) => sum + (c ? cardValue(c) : 0), 0);
    }
    const minScore = Math.min(...Object.values(scores));
    if (this.caboCalledBy && scores[this.caboCalledBy] > minScore) {
      scores[this.caboCalledBy] += CABO_PENALTY;
    }
    for (const p of this.players) {
      this.totalScores[p.id] = (this.totalScores[p.id] || 0) + scores[p.id];
    }
    this.lastRoundScores = scores;
    this.phase = 'round-end';

    if (Object.values(this.totalScores).some((s) => s >= this.targetScore)) {
      this.phase = 'game-end';
    }
    this.broadcastState();
  }

  nextRound(playerId) {
    this.assertPhase('round-end');
    this.startRound();
  }

  // ---- State serialization ----

  publicState() {
    const revealAll = this.phase === 'round-end' || this.phase === 'game-end';
    const hands = {};
    for (const p of this.players) {
      hands[p.id] = (this.hands ? this.hands[p.id] : []).map((c) => {
        if (!c) return null;
        return revealAll ? publicCard(c) : 'hidden';
      });
    }
    const winner = this.phase === 'game-end'
      ? this.players.reduce((best, p) => (this.totalScores[p.id] < this.totalScores[best.id] ? p : best), this.players[0]).id
      : null;

    return {
      phase: this.phase,
      round: this.round,
      targetScore: this.targetScore,
      players: this.players.map((p) => ({ id: p.id, name: p.name })),
      turnPlayerId: this.phase && this.turnIndex != null ? this.currentPlayer()?.id : null,
      caboCalledBy: this.caboCalledBy || null,
      discardTop: this.discardPile && this.discardPile.length ? publicCard(this.discardPile[this.discardPile.length - 1]) : null,
      drawCount: this.drawPile ? this.drawPile.length : 0,
      hands,
      handSizes: Object.fromEntries(this.players.map((p) => [p.id, (this.hands?.[p.id] || []).filter(Boolean).length])),
      pendingPower: this.pendingPower ? { type: this.pendingPower.type, playerId: this.currentPlayer()?.id } : null,
      awaitingDecisionPlayerId: this.phase === 'turn-awaiting-decision' ? this.currentPlayer()?.id : null,
      drawnCardSource: this.drawnCard ? this.drawnCard.source : null,
      totalScores: this.totalScores,
      lastRoundScores: this.lastRoundScores,
      peekReady: this.peekReady ? Array.from(this.peekReady) : [],
      winnerId: winner,
    };
  }

  broadcastState() {
    this.broadcast('game:state', this.publicState());
  }
}
