import express from 'express';
import http from 'http';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { COUNTRIES, OTHER } from './cards.js';
import { GameError, Room } from './game.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3002;
const EMPTY_ROOM_TTL_MS = 30 * 60_000;

const app = express();
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.get('/api/countries', (req, res) => {
  const list = Object.entries(COUNTRIES)
    .map(([code, c]) => ({ code, ...c }))
    .sort((a, b) => a.name.localeCompare(b.name));
  list.push({ code: OTHER, name: 'Somewhere else', flag: '🌍' });
  res.json(list);
});

const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => err && next());
});

const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: process.env.CORS_ORIGIN || true } });

// code -> { room, sockets: Map(id -> socket), timers }. The host dashboard's
// socket is in `sockets` too, under the host id.
const rooms = new Map();

// Each browser keeps a secret token in localStorage. The public player id is
// derived from it, so seeing someone's id in the room state doesn't let you
// act as them.
function playerIdFrom(token) {
  if (typeof token !== 'string' || token.length < 16) throw new GameError('Missing player token.');
  return crypto.createHash('sha256').update(token).digest('hex').slice(0, 16);
}

function newCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code;
  do {
    code = Array.from({ length: 4 }, () => letters[crypto.randomInt(letters.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function broadcast(entry) {
  for (const [pid, socket] of entry.sockets) socket.emit('room:state', entry.room.viewFor(pid));
}

function scheduleTurnEnd(entry) {
  const { room } = entry;
  clearTimeout(entry.turnTimer);
  if (room.phase !== 'active') return;
  const turnId = room.turn.id;
  entry.turnTimer = setTimeout(() => {
    if (room.endTurn(turnId)) broadcast(entry);
  }, Math.max(0, room.turn.endsAt - Date.now()) + 250);
}

function scheduleCleanup(code) {
  const entry = rooms.get(code);
  if (!entry) return;
  clearTimeout(entry.cleanupTimer);
  if (!entry.room.isEmpty()) return;
  entry.cleanupTimer = setTimeout(() => {
    const e = rooms.get(code);
    if (e && e.room.isEmpty()) {
      clearTimeout(e.turnTimer);
      rooms.delete(code);
    }
  }, EMPTY_ROOM_TTL_MS);
}

function joinRoom(socket, entry, { token, name, country }) {
  const pid = playerIdFrom(token);
  entry.room.addPlayer({ id: pid, name, country });
  attach(socket, entry, pid);
}

function attach(socket, entry, pid) {
  const same = socket.data?.code === entry.room.code && socket.data?.pid === pid;
  if (!same) leaveCurrent(socket);
  const old = entry.sockets.get(pid);
  if (old && old.id !== socket.id) old.emit('room:kicked', 'You joined this room from another tab or device.');
  entry.sockets.set(pid, socket);
  socket.data = { code: entry.room.code, pid };
  socket.join(entry.room.code);
  clearTimeout(entry.cleanupTimer);
  broadcast(entry);
}

function leaveCurrent(socket) {
  const { code, pid } = socket.data || {};
  const entry = code && rooms.get(code);
  socket.data = {};
  if (!entry) return;
  socket.leave(code);
  if (entry.sockets.get(pid) === socket) entry.sockets.delete(pid);
  if (pid === entry.room.hostId) entry.room.setConnected(pid, false);
  else entry.room.removePlayer(pid);
  broadcast(entry);
  scheduleCleanup(code);
}

// Wraps a handler so errors go back to the caller instead of crashing.
function handler(socket, fn) {
  return (payload, ack) => {
    const reply = typeof ack === 'function' ? ack : () => {};
    try {
      reply({ ok: true, ...(fn(payload || {}) || {}) });
    } catch (err) {
      if (!(err instanceof GameError)) console.error(err);
      reply({ ok: false, error: err instanceof GameError ? err.message : 'Something went wrong.' });
    }
  };
}

io.on('connection', (socket) => {
  // Creates a room with this screen as the host dashboard.
  socket.on('room:create', handler(socket, (p) => {
    const hostId = playerIdFrom(p.token);
    const code = newCode();
    const entry = { room: new Room(code, hostId), sockets: new Map() };
    rooms.set(code, entry);
    attach(socket, entry, hostId);
    return { code };
  }));

  // Reconnects a host dashboard after a reload or dropped connection.
  socket.on('room:host', handler(socket, (p) => {
    const entry = rooms.get(String(p.code || '').toUpperCase());
    const hostId = playerIdFrom(p.token);
    if (!entry || entry.room.hostId !== hostId) throw new GameError('That room is gone or isn’t hosted from this screen.');
    entry.room.setConnected(hostId, true);
    attach(socket, entry, hostId);
    return { code: entry.room.code };
  }));

  socket.on('room:join', handler(socket, (p) => {
    const code = String(p.code || '').trim().toUpperCase();
    const entry = rooms.get(code);
    if (!entry) throw new GameError('No room with that code.');
    joinRoom(socket, entry, p);
    return { code };
  }));

  // Every in-room action: { action, ...args }.
  const actions = {
    settings: (r, pid, p) => r.updateSettings(pid, p),
    autoBalance: (r, pid) => r.autoBalance(pid),
    movePlayer: (r, pid, p) => r.movePlayer(pid, p.playerId, p.teamId),
    renameTeam: (r, pid, p) => r.renameTeam(pid, p.teamId, p.name),
    start: (r, pid) => r.startGame(pid),
    startTurn: (r, pid) => r.startTurn(pid),
    mark: (r, pid, p) => r.mark(pid, p.result),
    toggle: (r, pid, p) => r.toggleResult(pid, p.index),
    confirm: (r, pid) => r.confirmTurn(pid),
    skipTurn: (r, pid) => r.skipTurn(pid),
    reassignChecker: (r, pid, p) => r.reassignChecker(pid, p.playerId),
    kick: (r, pid, p) => {
      r.kick(pid, p.playerId);
      const entry = rooms.get(r.code);
      const s = entry.sockets.get(p.playerId);
      if (s) {
        entry.sockets.delete(p.playerId);
        s.leave(r.code);
        s.data = {};
        s.emit('room:kicked', 'The host removed you from the room.');
      }
    },
    endGame: (r, pid) => r.endGame(pid),
    lobby: (r, pid) => r.backToLobby(pid),
  };

  socket.on('room:action', handler(socket, (p) => {
    const entry = rooms.get(socket.data?.code);
    if (!entry) throw new GameError('You are not in a room.');
    const fn = actions[p.action];
    if (!fn) throw new GameError('Unknown action.');
    fn(entry.room, socket.data.pid, p);
    scheduleTurnEnd(entry);
    broadcast(entry);
  }));

  socket.on('room:leave', handler(socket, () => leaveCurrent(socket)));

  socket.on('disconnect', () => {
    const { code, pid } = socket.data || {};
    const entry = rooms.get(code);
    if (!entry || entry.sockets.get(pid) !== socket) return;
    entry.sockets.delete(pid);
    entry.room.setConnected(pid, false);
    broadcast(entry);
    scheduleCleanup(code);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Passport server listening on port ${PORT}`);
});
