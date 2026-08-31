// Deterministic unit test for the rules engine (no network). Seeds known
// hands/piles directly on the Game instance so match/power/scoring outcomes
// are predictable, then asserts against them.
import { Game } from '../src/game/engine.js';

let failures = 0;
function assertEqual(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures++;
    console.error(`FAIL: ${label}\n  expected: ${e}\n  actual:   ${a}`);
  } else {
    console.log(`ok: ${label}`);
  }
}
function assertThrows(fn, label) {
  try {
    fn();
    failures++;
    console.error(`FAIL: ${label} (expected throw, none occurred)`);
  } catch {
    console.log(`ok: ${label}`);
  }
}

const card = (rank, suit = 'hearts') => ({ id: `${rank}${suit}${Math.random()}`, rank, suit });

function makeGame(playerCount = 2) {
  const players = Array.from({ length: playerCount }, (_, i) => ({ id: `p${i}`, name: `P${i}` }));
  const events = [];
  const game = new Game({
    players,
    targetScore: 1000,
    broadcast: (event, payload) => events.push({ event, payload }),
    sendTo: (playerId, event, payload) => events.push({ playerId, event, payload }),
  });
  game.startGame();
  for (const p of players) game.peekReadyMark(p.id);
  return { game, players, events };
}

// --- Own-card match: correct ---
{
  const { game } = makeGame();
  game.hands.p0 = [card('5'), card('K'), card('A'), card('Q')];
  game.hands.p1 = [card('5'), card('2'), card('3'), card('4')];
  game.discardPile = [card('9')];
  game.drawPile = [card('5', 'clubs')];
  game.drawDeck('p0');
  game.playDrawnCard('p0'); // discard top now rank 5, matchable=true
  assertEqual(game.matchable, true, 'own-match: matchable opens after playing a card');
  game.matchAttempt('p1', { mode: 'own', handIndex: 0 }); // p1's 5 matches
  assertEqual(game.hands.p1[0], null, 'own-match: correct match empties the slot');
  assertEqual(game.matchable, false, 'own-match: window closes after first attempt');
  assertEqual(game.discardTopWasMatched, true, 'own-match: discardTopWasMatched set on success');
  game.phase = 'turn-awaiting-draw';
  game.turnIndex = 1;
  assertThrows(() => game.drawDiscard('p1'), 'own-match: discard draw blocked after a successful match');
}

// --- Own-card match: wrong guess gives a penalty card ---
{
  const { game } = makeGame();
  game.hands.p0 = [card('5'), card('K'), card('A'), card('Q')];
  game.hands.p1 = [card('7'), card('2'), card('3'), card('4')];
  game.discardPile = [card('9')];
  game.drawPile = [card('5', 'clubs'), card('2', 'clubs')];
  game.drawDeck('p0');
  game.playDrawnCard('p0');
  const before = game.hands.p1.length;
  game.matchAttempt('p1', { mode: 'own', handIndex: 0 }); // p1's 7 != 5, wrong
  assertEqual(game.hands.p1.length, before + 1, 'wrong own-match: penalty card appended');
  assertEqual(game.hands.p1[0].rank, '7', 'wrong own-match: original card stays in place');
}

// --- Opponent match: correct, blind give ---
{
  const { game } = makeGame();
  game.hands.p0 = [card('5'), card('K'), card('A'), card('Q')];
  game.hands.p1 = [card('5'), card('2'), card('3'), card('4')];
  game.discardPile = [card('9')];
  game.drawPile = [card('5', 'clubs')];
  game.drawDeck('p0');
  game.playDrawnCard('p0'); // discard top rank 5
  // p1 believes p0's slot 0 (rank 5) matches; gives p1's own slot 1 (a '2') blindly
  const givenCard = game.hands.p1[1];
  game.matchAttempt('p1', { mode: 'opponent', targetPlayerId: 'p0', targetHandIndex: 0, giveIndex: 1 });
  assertEqual(game.hands.p1[1], null, 'opponent-match: matcher slot emptied');
  assertEqual(game.hands.p0[0], givenCard, "opponent-match: target's slot filled with matcher's blind card");
}

// --- Opponent match: wrong guess penalizes the matcher, target untouched ---
{
  const { game } = makeGame();
  game.hands.p0 = [card('K'), card('K'), card('A'), card('Q')];
  game.hands.p1 = [card('7'), card('2'), card('3'), card('4')];
  game.discardPile = [card('9')];
  game.drawPile = [card('5', 'clubs'), card('2', 'clubs')];
  game.drawDeck('p0');
  game.playDrawnCard('p0'); // top rank 5
  const targetCardBefore = game.hands.p0[0];
  const before = game.hands.p1.length;
  game.matchAttempt('p1', { mode: 'opponent', targetPlayerId: 'p0', targetHandIndex: 0, giveIndex: 1 });
  assertEqual(game.hands.p0[0], targetCardBefore, 'wrong opponent-match: target keeps their card');
  assertEqual(game.hands.p1.length, before + 1, 'wrong opponent-match: matcher gets penalty card');
}

// --- Cabo lock excludes caller from being matched/targeted ---
{
  const { game } = makeGame();
  game.turnIndex = 0;
  game.phase = 'turn-end';
  game.caboCalledBy = 'p0';
  game.caboCallerSeat = 0;
  game.hands.p0 = [card('5'), card('K'), card('A'), card('Q')];
  game.hands.p1 = [card('5'), card('2'), card('3'), card('4')];
  game.discardPile = [card('9')];
  game.matchable = true;
  assertThrows(
    () => game.matchAttempt('p1', { mode: 'opponent', targetPlayerId: 'p0', targetHandIndex: 0, giveIndex: 1 }),
    'cabo-lock: cannot target the caller with opponent-match'
  );
  assertThrows(() => game.matchAttempt('p0', { mode: 'own', handIndex: 0 }), 'cabo-lock: caller cannot act');
}

// --- Queen (look-and-swap): two-stage, mandatory swap ---
{
  const { game } = makeGame();
  game.hands.p0 = [card('3'), card('4'), card('5'), card('6')];
  game.hands.p1 = [card('7'), card('8'), card('9'), card('10')];
  game.discardPile = [card('2')];
  game.drawPile = [card('Q')];
  game.drawDeck('p0');
  game.playDrawnCard('p0');
  assertEqual(game.phase, 'turn-awaiting-power', 'queen: enters power phase');
  assertEqual(game.pendingPower.stage, 'peek', 'queen: starts at peek stage');
  game.usePower('p0', { ownIndex: 0, targetPlayerId: 'p1', otherIndex: 0 });
  assertEqual(game.pendingPower.stage, 'swap', 'queen: advances to swap stage after peek');
  assertThrows(() => game.skipPower('p0'), 'queen: cannot skip mandatory swap');
  const p0Card = game.hands.p0[2];
  const p1Card = game.hands.p1[3];
  game.usePower('p0', { ownIndex: 2, otherIndex: 3 });
  assertEqual(game.hands.p0[2], p1Card, 'queen: swap moved opponent card in');
  assertEqual(game.hands.p1[3], p0Card, 'queen: swap moved own card out');
  assertEqual(game.phase, 'turn-end', 'queen: turn-end reached after mandatory swap');
}

// --- Scoring: Cabo caller wins outright ---
{
  const { game, players } = makeGame(3);
  game.caboCalledBy = 'p0';
  game.hands.p0 = [card('A')]; // total 1
  game.hands.p1 = [card('5')]; // total 5
  game.hands.p2 = [card('K')]; // total 0... careful, must not tie with caller
  game.hands.p2 = [card('5'), card('5')]; // total 10
  game.endRound();
  assertEqual(game.totalScores.p0, -30, 'scoring: cabo caller wins gets -30');
  assertEqual(game.totalScores.p1, 5, "scoring: non-caller gets own hand total");
  assertEqual(game.totalScores.p2, 10, "scoring: non-caller gets own hand total");
}

// --- Scoring: Cabo caller loses to a single lowest opponent ---
{
  const { game } = makeGame(3);
  game.caboCalledBy = 'p0';
  game.hands.p0 = [card('5')]; // total 5
  game.hands.p1 = [card('A')]; // total 1 (lowest)
  game.hands.p2 = [card('10')]; // total 10
  game.endRound();
  assertEqual(game.totalScores.p0, 30, 'scoring: cabo caller loses gets +30');
  assertEqual(game.totalScores.p1, -30, 'scoring: sole winner gets -30');
  assertEqual(game.totalScores.p2, 10, 'scoring: everyone else gets own total');
}

// --- Scoring: Cabo caller ties for lowest -> still loses, tied players split -30 ---
{
  const { game } = makeGame(3);
  game.caboCalledBy = 'p0';
  game.hands.p0 = [card('A')]; // total 1
  game.hands.p1 = [card('A')]; // total 1, ties caller
  game.hands.p2 = [card('10')];
  game.endRound();
  assertEqual(game.totalScores.p0, 30, 'scoring: caller tied for lowest still loses (+30)');
  assertEqual(game.totalScores.p1, -30, 'scoring: sole non-caller winner gets full -30');
  assertEqual(game.totalScores.p2, 10, 'scoring: non-winner gets own total');
}

// --- Scoring: ended by empty hand (no cabo), split among tied winners ---
{
  const { game } = makeGame(3);
  game.hands.p0 = [card('A')]; // total 1
  game.hands.p1 = [card('A')]; // total 1, tied lowest
  game.hands.p2 = [card('10')];
  game.endRound({ endedByEmptyHand: true });
  assertEqual(game.totalScores.p0, -15, 'scoring: empty-hand tie split -30 two ways (p0)');
  assertEqual(game.totalScores.p1, -15, 'scoring: empty-hand tie split -30 two ways (p1)');
  assertEqual(game.totalScores.p2, 10, 'scoring: empty-hand non-winner gets own total');
}

// --- Empty hand via match auto-ends the round when Cabo not called ---
{
  const { game } = makeGame(2);
  game.hands.p0 = [card('5')];
  game.hands.p1 = [card('5'), card('2')];
  game.discardPile = [card('9')];
  game.drawPile = [card('5', 'clubs')];
  game.drawDeck('p0');
  game.playDrawnCard('p0');
  game.matchAttempt('p0', { mode: 'own', handIndex: 0 }); // p0 empties their only card
  assertEqual(game.phase, 'round-end', 'empty-hand: round auto-ends when a hand empties and Cabo not called');
  assertEqual(game.endedByEmptyHand, true, 'empty-hand: flagged correctly');
}

console.log(failures === 0 ? '\nALL ENGINE TESTS PASSED' : `\n${failures} ENGINE TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
