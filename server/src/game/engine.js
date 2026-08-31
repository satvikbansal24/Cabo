import { buildDeck, shuffle, cardValue, cardPower } from './deck.js';

const HAND_SIZE = 4;
const PEEK_INDICES = [1, 3]; // bottom row in the 2-row grid (see client grid-auto-flow: column)
const CABO_WIN_BONUS = -30;
const CABO_LOSE_PENALTY = 30;

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

  seatIndex(playerId) {
    return this.players.findIndex((p) => p.id === playerId);
  }

  currentPlayer() {
    return this.players[this.turnIndex];
  }

  isLocked(playerId) {
    return playerId === this.caboCalledBy;
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

  assertNotLocked(playerId) {
    if (this.isLocked(playerId)) {
      throw new Error('That player called Cabo — their cards are locked');
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
    this.matchable = false;
    this.discardTopWasMatched = false;
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

  giveCardTo(playerId) {
    const hand = this.hands[playerId];
    hand.push(this.drawOne());
    return hand.length - 1;
  }

  // ---- Turn: draw ----

  drawDeck(playerId) {
    this.assertPhase('turn-awaiting-draw');
    this.assertTurn(playerId);
    const card = this.drawOne();
    this.drawnCard = { card, source: 'deck' };
    this.phase = 'turn-awaiting-play';
    this.sendTo(playerId, 'game:private', { type: 'drawn', card: publicCard(card), source: 'deck' });
    this.broadcastState();
  }

  drawDiscard(playerId) {
    this.assertPhase('turn-awaiting-draw');
    this.assertTurn(playerId);
    if (this.discardPile.length === 0) throw new Error('Discard pile is empty');
    if (this.discardTopWasMatched) throw new Error('The last played card was matched — you cannot take it');
    const card = this.discardPile.pop();
    this.drawnCard = { card, source: 'discard' };
    this.phase = 'turn-awaiting-play';
    this.sendTo(playerId, 'game:private', { type: 'drawn', card: publicCard(card), source: 'discard' });
    this.broadcastState();
  }

  // ---- Turn: play ----

  playDrawnCard(playerId) {
    this.assertPhase('turn-awaiting-play');
    this.assertTurn(playerId);
    if (!this.drawnCard) throw new Error('No drawn card to play');
    if (this.drawnCard.source !== 'deck') throw new Error('A card taken from the discard pile must be kept, not played');
    const card = this.drawnCard.card;
    this.discardPile.push(card);
    this.drawnCard = null;
    this.matchable = true;
    this.discardTopWasMatched = false;

    const power = cardPower(card);
    if (power) {
      this.pendingPower = { type: power, stage: power === 'look-and-swap' ? 'peek' : 'act', targetPlayerId: null };
      this.phase = 'turn-awaiting-power';
    } else {
      this.phase = 'turn-end';
    }
    this.broadcastState();
  }

  keepAndSwap(playerId, handIndex) {
    this.assertPhase('turn-awaiting-play');
    this.assertTurn(playerId);
    if (!this.drawnCard) throw new Error('No drawn card to keep');
    const hand = this.hands[playerId];
    if (handIndex < 0 || handIndex >= hand.length) throw new Error('Invalid hand index');
    const old = hand[handIndex];
    hand[handIndex] = this.drawnCard.card;
    this.drawnCard = null;
    if (old) {
      this.discardPile.push(old);
      this.matchable = true;
      this.discardTopWasMatched = false;
    }
    this.phase = 'turn-end';
    this.broadcastState();
  }

  // ---- Turn: power resolution ----

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
      this.pendingPower = null;
      this.phase = 'turn-end';
    } else if (power.type === 'peek-other') {
      const { targetPlayerId, handIndex } = payload;
      if (targetPlayerId === playerId) throw new Error('Choose an opponent card');
      this.assertNotLocked(targetPlayerId);
      const hand = this.hands[targetPlayerId];
      if (!hand || handIndex < 0 || handIndex >= hand.length || !hand[handIndex]) throw new Error('Invalid card');
      this.sendTo(playerId, 'game:private', {
        type: 'power-peek',
        playerId: targetPlayerId,
        index: handIndex,
        card: publicCard(hand[handIndex]),
      });
      this.pendingPower = null;
      this.phase = 'turn-end';
    } else if (power.type === 'swap-blind') {
      const { a, b } = payload;
      this.performSwap(a, b);
      this.pendingPower = null;
      this.phase = 'turn-end';
    } else if (power.type === 'look-and-swap') {
      if (power.stage === 'peek') {
        const { ownIndex, targetPlayerId, otherIndex } = payload;
        if (targetPlayerId === playerId) throw new Error('Choose an opponent');
        this.assertNotLocked(targetPlayerId);
        const ownHand = this.hands[playerId];
        const otherHand = this.hands[targetPlayerId];
        if (!ownHand || ownIndex < 0 || ownIndex >= ownHand.length || !ownHand[ownIndex]) throw new Error('Invalid own card');
        if (!otherHand || otherIndex < 0 || otherIndex >= otherHand.length || !otherHand[otherIndex]) throw new Error('Invalid opponent card');
        this.sendTo(playerId, 'game:private', { type: 'power-peek', playerId, index: ownIndex, card: publicCard(ownHand[ownIndex]) });
        this.sendTo(playerId, 'game:private', { type: 'power-peek', playerId: targetPlayerId, index: otherIndex, card: publicCard(otherHand[otherIndex]) });
        this.pendingPower = { type: 'look-and-swap', stage: 'swap', targetPlayerId };
        // stays in turn-awaiting-power; the swap is mandatory next
      } else {
        const { ownIndex, otherIndex } = payload;
        const targetPlayerId = power.targetPlayerId;
        this.performSwap({ playerId, handIndex: ownIndex }, { playerId: targetPlayerId, handIndex: otherIndex });
        this.pendingPower = null;
        this.phase = 'turn-end';
      }
    } else {
      throw new Error('Unknown power');
    }

    this.broadcastState();
  }

  performSwap(a, b) {
    this.assertNotLocked(a.playerId);
    this.assertNotLocked(b.playerId);
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
  }

  skipPower(playerId) {
    this.assertPhase('turn-awaiting-power');
    this.assertTurn(playerId);
    if (this.pendingPower?.type === 'look-and-swap' && this.pendingPower.stage === 'swap') {
      throw new Error('You already peeked — you must complete the swap');
    }
    this.pendingPower = null;
    this.phase = 'turn-end';
    this.broadcastState();
  }

  // ---- Turn: end / Cabo ----

  endTurn(playerId) {
    this.assertPhase('turn-end');
    this.assertTurn(playerId);
    this.advanceTurn();
    this.broadcastState();
  }

  callCabo(playerId) {
    this.assertPhase('turn-end');
    this.assertTurn(playerId);
    if (this.caboCalledBy) throw new Error('Cabo already called this round');
    this.caboCalledBy = playerId;
    this.caboCallerSeat = this.turnIndex;
    this.advanceTurn();
    this.broadcastState();
  }

  advanceTurn() {
    const upcoming = (this.turnIndex + 1) % this.players.length;
    if (this.caboCalledBy !== null && upcoming === this.caboCallerSeat) {
      this.endRound();
    } else {
      this.turnIndex = upcoming;
      this.phase = 'turn-awaiting-draw';
    }
  }

  // ---- Matching ----

  matchAttempt(playerId, payload) {
    if (!this.matchable) throw new Error('No card to match right now');
    if (this.discardPile.length === 0) throw new Error('Discard pile is empty');
    this.assertNotLocked(playerId);
    const hand = this.hands[playerId];
    if (!hand) throw new Error('Unknown player');
    const topRank = this.discardPile[this.discardPile.length - 1].rank;

    if (payload.mode === 'opponent') {
      const { targetPlayerId, targetHandIndex, giveIndex } = payload;
      if (targetPlayerId === playerId) throw new Error('Choose an opponent');
      this.assertNotLocked(targetPlayerId);
      const targetHand = this.hands[targetPlayerId];
      if (!targetHand || targetHandIndex < 0 || targetHandIndex >= targetHand.length || !targetHand[targetHandIndex]) {
        throw new Error('Invalid target card');
      }
      if (giveIndex < 0 || giveIndex >= hand.length || !hand[giveIndex]) throw new Error('You need a card to give');

      const targetCard = targetHand[targetHandIndex];
      this.matchable = false;

      if (targetCard.rank === topRank) {
        const givenCard = hand[giveIndex];
        targetHand[targetHandIndex] = givenCard;
        hand[giveIndex] = null;
        this.discardPile.push(targetCard);
        this.discardTopWasMatched = true;
        this.broadcast('game:matchResult', {
          mode: 'opponent',
          playerId,
          targetPlayerId,
          targetHandIndex,
          giveIndex,
          correct: true,
        });
        this.maybeEndOnEmptyHand(playerId);
      } else {
        const penaltyIndex = this.giveCardTo(playerId);
        this.broadcast('game:matchResult', {
          mode: 'opponent',
          playerId,
          targetPlayerId,
          targetHandIndex,
          correct: false,
          penaltyIndex,
        });
      }
    } else {
      const { handIndex } = payload;
      if (handIndex < 0 || handIndex >= hand.length || !hand[handIndex]) throw new Error('Invalid card');
      const card = hand[handIndex];
      this.matchable = false;

      if (card.rank === topRank) {
        hand[handIndex] = null;
        this.discardPile.push(card);
        this.discardTopWasMatched = true;
        this.broadcast('game:matchResult', { mode: 'own', playerId, handIndex, correct: true });
        this.maybeEndOnEmptyHand(playerId);
      } else {
        const penaltyIndex = this.giveCardTo(playerId);
        this.broadcast('game:matchResult', { mode: 'own', playerId, handIndex, correct: false, penaltyIndex });
      }
    }

    this.broadcastState();
  }

  maybeEndOnEmptyHand(playerId) {
    const hand = this.hands[playerId];
    const isEmpty = hand.every((c) => c === null);
    if (isEmpty && !this.caboCalledBy) {
      this.endRound({ endedByEmptyHand: true });
    }
  }

  // ---- Round end / scoring ----

  endRound({ endedByEmptyHand = false } = {}) {
    const totals = {};
    for (const p of this.players) {
      totals[p.id] = this.hands[p.id].reduce((sum, c) => sum + (c ? cardValue(c) : 0), 0);
    }
    const minTotal = Math.min(...Object.values(totals));
    const lowestPlayers = this.players.filter((p) => totals[p.id] === minTotal).map((p) => p.id);

    const scores = {};
    if (this.caboCalledBy && !endedByEmptyHand) {
      const callerId = this.caboCalledBy;
      const callerWins = lowestPlayers.length === 1 && lowestPlayers[0] === callerId;
      if (callerWins) {
        scores[callerId] = CABO_WIN_BONUS;
        for (const p of this.players) if (p.id !== callerId) scores[p.id] = totals[p.id];
      } else {
        scores[callerId] = CABO_LOSE_PENALTY;
        const winners = lowestPlayers.filter((id) => id !== callerId);
        const share = CABO_WIN_BONUS / winners.length;
        for (const w of winners) scores[w] = share;
        for (const p of this.players) {
          if (p.id !== callerId && !winners.includes(p.id)) scores[p.id] = totals[p.id];
        }
      }
    } else {
      const share = CABO_WIN_BONUS / lowestPlayers.length;
      for (const w of lowestPlayers) scores[w] = share;
      for (const p of this.players) if (!lowestPlayers.includes(p.id)) scores[p.id] = totals[p.id];
    }

    for (const p of this.players) {
      this.totalScores[p.id] = (this.totalScores[p.id] || 0) + scores[p.id];
    }
    this.lastRoundScores = scores;
    this.roundHandTotals = totals;
    this.endedByEmptyHand = endedByEmptyHand;
    this.matchable = false;
    this.pendingPower = null;
    this.drawnCard = null;
    this.phase = 'round-end';

    if (Object.values(this.totalScores).some((s) => s >= this.targetScore)) {
      this.phase = 'game-end';
    }
    this.broadcastState();
  }

  nextRound() {
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
      matchable: !!this.matchable,
      canDrawDiscard: this.phase === 'turn-awaiting-draw' && this.discardPile?.length > 0 && !this.discardTopWasMatched,
      pendingPower: this.pendingPower
        ? { type: this.pendingPower.type, stage: this.pendingPower.stage, playerId: this.currentPlayer()?.id, targetPlayerId: this.pendingPower.targetPlayerId }
        : null,
      awaitingPlayPlayerId: this.phase === 'turn-awaiting-play' ? this.currentPlayer()?.id : null,
      drawnCardSource: this.drawnCard ? this.drawnCard.source : null,
      totalScores: this.totalScores,
      lastRoundScores: this.lastRoundScores,
      roundHandTotals: this.roundHandTotals,
      endedByEmptyHand: this.endedByEmptyHand,
      peekReady: this.peekReady ? Array.from(this.peekReady) : [],
      winnerId: winner,
    };
  }

  broadcastState() {
    this.broadcast('game:state', this.publicState());
  }
}
