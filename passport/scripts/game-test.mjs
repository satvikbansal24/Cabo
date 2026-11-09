// Unit test of the game rules, deck mixing and team balancing. No server.
import assert from 'node:assert/strict';
import { Room, turnPoints, TURN_SECONDS } from '../server/game.js';
import { buildDeck, deckMix } from '../server/deck.js';
import { balanceTeams } from '../server/teams.js';

let seed = 42;
const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
let clock = 1_000_000;
const now = () => clock;

// --- scoring ---
const c = (...rs) => rs.map((result) => ({ result }));
assert.equal(turnPoints(c('guessed', 'guessed', 'guessed')), 3);
assert.equal(turnPoints(c('guessed', 'skipped')), 1, 'first skip is free');
assert.equal(turnPoints(c('guessed', 'skipped', 'skipped', 'skipped')), -1, 'later skips cost 1 each');
assert.equal(turnPoints(c('guessed', 'missed')), 1, 'card on screen at the buzzer scores 0');

// --- deck mix ---
const mix = deckMix(['IN', 'IN', 'IN', 'US', 'XX', 'XX']);
const share = Object.fromEntries(mix.map((m) => [m.source, m.share]));
assert.ok(Math.abs(mix.reduce((s, m) => s + m.share, 0) - 1) < 1e-9, 'shares sum to 1');
assert.ok(share.IN > share.US, 'bigger groups get more cards');
assert.ok(share.global > 0.35, 'players without a pack add to global');
const deck = buildDeck(['IN', 'IN', 'BR'], { rng });
assert.equal(new Set(deck.map((d) => d.text)).size, deck.length, 'no duplicate cards');
const first60 = deck.slice(-60);
const origins = new Set(first60.map((d) => d.origin));
assert.ok(origins.has('IN') && origins.has('BR') && origins.has('global'), 'early draws are mixed');
assert.ok(!deck.some((d) => d.origin === 'US'), 'no packs for absent countries');

// --- team balancing ---
const players = [
  ...Array.from({ length: 4 }, (_, i) => ({ id: `in${i}`, country: 'IN' })),
  ...Array.from({ length: 2 }, (_, i) => ({ id: `us${i}`, country: 'US' })),
  { id: 'br0', country: 'BR' },
  { id: 'gb0', country: 'GB' },
];
const teams = balanceTeams(players, 2, rng);
assert.deepEqual(teams.map((t) => t.length), [4, 4]);
for (const t of teams) {
  assert.equal(t.filter((id) => id.startsWith('in')).length, 2, 'Indians split 2/2');
  assert.equal(t.filter((id) => id.startsWith('us')).length, 1, 'Americans split 1/1');
}

// --- full game flow ---
const room = new Room('TEST', 'host', { now, rng });
assert.throws(() => room.addPlayer({ id: 'host', name: 'TV', country: 'IN' }), /dashboard/);
const names = [['a', 'Asha', 'IN'], ['b', 'Ben', 'US'], ['c', 'Chidi', 'NG'], ['d', 'Dev', 'IN'], ['e', 'Eve', 'US']];
for (const [id, name, country] of names) room.addPlayer({ id, name, country });
assert.throws(() => room.addPlayer({ id: 'z', name: 'asha', country: 'IN' }), /already has that name/);
assert.throws(() => room.startGame('a'), /Only the host/, 'players are not the host');

room.updateSettings('host', { numRounds: 2 });
room.movePlayer('host', 'e', 't0');
room.movePlayer('host', 'b', 't0');
room.movePlayer('host', 'c', 't0');
assert.throws(() => room.startGame('host'), /at least 2 players/, 'team 2 too small');
room.autoBalance('host');
assert.ok(room.teams.every((t) => t.memberIds.length >= 2));
room.startGame('host');
assert.equal(room.phase, 'ready');

const turn = room.turn;
const team = room.teams.find((t) => t.id === turn.teamId);
const prev = room.teams.find((t) => t.id !== turn.teamId);
assert.ok(team.memberIds.includes(turn.giverId), 'giver is on the playing team');
assert.ok(prev.memberIds.includes(turn.checkerId), 'checker is on the previous team');

// Visibility.
const guesser = team.memberIds.find((id) => id !== turn.giverId);
room.startTurn(turn.giverId);
assert.equal(room.phase, 'active');
assert.ok(room.viewFor(turn.giverId).turn.current, 'giver sees card');
assert.ok(room.viewFor(turn.checkerId).turn.current, 'checker sees card');
assert.equal(room.viewFor(guesser).turn.current, null, 'guesser does not');
assert.equal(room.viewFor('host').turn.current, null, 'host dashboard (TV) never does');
assert.equal(room.viewFor('host').turn.cards.length, 0);

assert.throws(() => room.mark(turn.giverId, 'guessed'), /checker/, 'giver cannot mark');
room.mark(turn.checkerId, 'guessed');
room.mark(turn.checkerId, 'guessed');
room.mark(turn.checkerId, 'skipped');
room.mark(turn.checkerId, 'skipped');
assert.equal(room.viewFor(guesser).turn.points, 1);

clock += TURN_SECONDS * 1000;
assert.ok(room.endTurn(turn.id));
assert.ok(!room.endTurn(turn.id), 'endTurn is idempotent');
assert.equal(room.phase, 'review');
assert.equal(room.turn.cards.length, 5);
assert.equal(room.turn.cards[4].result, 'missed');
assert.equal(room.viewFor(guesser).turn.cards.length, 5, 'everyone sees cards in review');
room.toggleResult(turn.checkerId, 4); // missed -> guessed (got it on the buzzer)
room.confirmTurn(turn.checkerId);
assert.equal(team.score, 2);

// Play out the rest; each turn guesses one card.
const played = new Set(room.history.flatMap((h) => h.cards.map((x) => x.text)));
while (room.phase === 'ready') {
  const t = room.turn;
  room.startTurn(t.giverId);
  room.mark(t.checkerId, 'guessed');
  room.mark(t.checkerId, 'guessed');
  clock += TURN_SECONDS * 1000;
  room.mark(t.checkerId, 'guessed'); // after the buzzer: ends the turn instead
  assert.equal(room.phase, 'review');
  for (const card of room.turn.cards) {
    assert.ok(!played.has(card.text), 'cards are never reused');
    played.add(card.text);
  }
  room.confirmTurn(t.checkerId);
}
assert.equal(room.phase, 'over');
assert.equal(room.history.length, 4, '2 teams x 2 rounds');
const givers = room.history.filter((h) => h.teamId === team.id).map((h) => h.giverId);
assert.notEqual(givers[0], givers[1], 'clue giver rotates');

// A second game in the same room doesn't reuse cards.
room.backToLobby('host');
room.startGame('host');
assert.ok(!room.deck.some((d) => played.has(d.text)), 'new game skips cards already played');

console.log('All game tests passed.');
