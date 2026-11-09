// End-to-end check over real sockets. Start the server first (npm start),
// then: npm run smoke-test. Set URL to test a deployed copy.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { io } from 'socket.io-client';

const URL = process.env.URL || 'http://localhost:3002';

function client() {
  const s = io(URL, { transports: ['websocket'], forceNew: true });
  s.token = crypto.randomBytes(24).toString('hex');
  s.state = null;
  s.on('room:state', (st) => (s.state = st));
  s.call = (event, payload = {}) =>
    new Promise((resolve, reject) =>
      s.timeout(5000).emit(event, payload, (err, res) => (err ? reject(err) : resolve(res))));
  s.act = async (action, args = {}) => {
    const res = await s.call('room:action', { action, ...args });
    assert.ok(res.ok, `${action} failed: ${res.error}`);
    return res;
  };
  return s;
}
const settle = () => new Promise((r) => setTimeout(r, 150));

const host = client();
const created = await host.call('room:create', { token: host.token });
assert.ok(created.ok, created.error);
const code = created.code;
console.log('room', code);

const people = [['Asha', 'IN'], ['Ben', 'US'], ['Chidi', 'NG'], ['Dev', 'IN']];
const phones = [];
for (const [name, country] of people) {
  const s = client();
  const res = await s.call('room:join', { code, token: s.token, name, country });
  assert.ok(res.ok, res.error);
  s.name = name;
  phones.push(s);
}
await settle();
assert.equal(host.state.players.length, 4, 'host sees 4 players');
assert.ok(host.state.isHost);
assert.ok(!phones[0].state.isHost);

// Players can't run the room.
const denied = await phones[0].call('room:action', { action: 'start' });
assert.equal(denied.ok, false);

await host.act('autoBalance');
await settle();
for (const t of host.state.teams) {
  const countries = t.memberIds.map((id) => host.state.players.find((p) => p.id === id).country);
  assert.equal(countries.filter((c) => c === 'IN').length, 1, 'Indian players split across teams');
}

await host.act('settings', { numRounds: 1 });
await host.act('start');
await settle();
const byId = (id) => phones.find((p) => p.state.you === id);
const turn = host.state.turn;
const giver = byId(turn.giverId);
const checker = byId(turn.checkerId);
const guesser = phones.find((p) => p !== giver && host.state.teams.find((t) => t.id === turn.teamId).memberIds.includes(p.state.you));

await giver.act('startTurn');
await settle();
assert.ok(giver.state.turn.current?.text, 'giver sees the card');
assert.equal(checker.state.turn.current?.text, giver.state.turn.current.text, 'checker sees the same card');
assert.equal(guesser.state.turn.current, null, 'guesser does not see the card');
assert.equal(host.state.turn.current, null, 'TV dashboard does not see the card');

await checker.act('mark', { result: 'guessed' });
await checker.act('mark', { result: 'skipped' });
await checker.act('mark', { result: 'skipped' });
await settle();
assert.equal(host.state.turn.points, 0, '1 guessed, 2 skips (1 free) = 0');

// Host can't end the turn early, but the server timer will. Ending the game
// is quicker to test than waiting 60s, so check review via the engine test.
await host.act('endGame');
await settle();
assert.equal(host.state.phase, 'over');
assert.equal(phones[0].state.phase, 'over');

// Host dashboard can reconnect after a reload.
host.disconnect();
const host2 = client();
host2.token = host.token;
const again = await host2.call('room:host', { code, token: host2.token });
assert.ok(again.ok, again.error);
await settle();
assert.ok(host2.state.isHost);

for (const s of [host2, ...phones]) s.disconnect();
console.log('Smoke test passed.');
