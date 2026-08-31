// Requires the server to already be running (npm run dev / npm start).
// Exercises register/login, room create/join, dealing, a full turn, calling
// Cabo, and round scoring end-to-end over real sockets.
import { io } from 'socket.io-client';

const BASE = process.env.SMOKE_TEST_URL || 'http://localhost:3001';

async function registerOrLogin(username, password) {
  let res = await fetch(`${BASE}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (res.status === 400) {
    res = await fetch(`${BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
  }
  const data = await res.json();
  if (!res.ok) throw new Error('auth failed: ' + JSON.stringify(data));
  return data;
}

function connect(token) {
  return new Promise((resolve, reject) => {
    const s = io(BASE, { auth: { token }, transports: ['websocket'] });
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
  });
}

function emit(socket, event, payload) {
  return new Promise((resolve, reject) => {
    socket.emit(event, payload, (res) => {
      if (res && res.ok === false) reject(new Error(`${event} failed: ${res.error}`));
      else resolve(res);
    });
  });
}

function waitUntil(getArr, predicate, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const iv = setInterval(() => {
      const arr = getArr();
      const hit = arr.find(predicate);
      if (hit) {
        clearInterval(iv);
        resolve(hit);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(iv);
        reject(new Error('timeout waiting for state'));
      }
    }, 30);
  });
}

async function main() {
  const alice = await registerOrLogin('smoke_alice', 'password123');
  const bob = await registerOrLogin('smoke_bob', 'password123');
  console.log('registered/logged in', alice.user.username, bob.user.username);

  const sAlice = await connect(alice.token);
  const sBob = await connect(bob.token);
  console.log('sockets connected');

  const stateAlice = [];
  const stateBob = [];
  sAlice.on('game:state', (g) => stateAlice.push(g));
  sBob.on('game:state', (g) => stateBob.push(g));
  sAlice.on('error', (e) => console.log('ALICE ERROR', e));
  sBob.on('error', (e) => console.log('BOB ERROR', e));

  const createRes = await emit(sAlice, 'room:create', { targetScore: 100 });
  const code = createRes.room.code;
  console.log('room created', code);

  await emit(sBob, 'room:join', { code });
  console.log('bob joined');

  await emit(sAlice, 'room:start', { code });
  console.log('game started');

  await waitUntil(() => stateAlice, (g) => g.phase === 'peek');
  console.log('phase peek reached');

  await emit(sAlice, 'game:peekReady', { code });
  await emit(sBob, 'game:peekReady', { code });

  const afterPeek = await waitUntil(() => stateAlice, (g) => g.phase === 'turn-awaiting-draw');
  console.log('turn phase reached, turnPlayerId matches alice?', afterPeek.turnPlayerId === alice.user.id);

  let round = 0;
  let latestPhase = 'turn-awaiting-draw';
  let latestTurn = afterPeek.turnPlayerId;
  let caboCalled = false;

  while (latestPhase !== 'round-end' && round < 15) {
    round++;
    const actorId = latestTurn;
    const actorSocket = actorId === alice.user.id ? sAlice : sBob;
    const actorArr = actorId === alice.user.id ? stateAlice : stateBob;

    await emit(actorSocket, 'game:drawDeck', { code });
    const playState = actorArr[actorArr.length - 1];
    if (playState.phase !== 'turn-awaiting-play') throw new Error('expected turn-awaiting-play phase, got ' + playState.phase);

    await emit(actorSocket, 'game:keepAndSwap', { code, handIndex: 0 });
    const endState = actorArr[actorArr.length - 1];
    if (endState.phase !== 'turn-end') throw new Error('expected turn-end phase, got ' + endState.phase);

    if (!caboCalled && round === 3) {
      await emit(actorSocket, 'game:callCabo', { code });
      caboCalled = true;
    } else {
      await emit(actorSocket, 'game:endTurn', { code });
    }
    const s = actorArr[actorArr.length - 1];
    latestPhase = s.phase;
    latestTurn = s.turnPlayerId;
    if (caboCalled && round === 3) console.log('cabo called by', s.caboCalledBy, 'now phase', s.phase, 'next turn', s.turnPlayerId);
  }

  const finalState = stateAlice[stateAlice.length - 1];
  console.log('round ended, phase=', finalState.phase);
  console.log('lastRoundScores=', finalState.lastRoundScores);
  console.log('totalScores=', finalState.totalScores);
  if (finalState.phase !== 'round-end') throw new Error('did not reach round-end');

  console.log('SMOKE TEST PASSED');
  process.exit(0);
}

main().catch((err) => {
  console.error('SMOKE TEST FAILED', err);
  process.exit(1);
});
