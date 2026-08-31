import { Server } from 'socket.io';
import { verifyToken } from './auth.js';
import { RoomManager } from './rooms.js';
import { Game } from './game/engine.js';

export function attachSocket(httpServer, corsOrigin) {
  const io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
  });
  const roomManager = new RoomManager();

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) throw new Error('Missing token');
      const payload = verifyToken(token);
      socket.user = { id: payload.sub, username: payload.username };
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  function makeGameCallbacks(room) {
    return {
      broadcast: (event, payload) => io.to(room.code).emit(event, payload),
      sendTo: (playerId, event, payload) => {
        const player = room.players.find((p) => p.id === playerId);
        if (player?.socketId) io.to(player.socketId).emit(event, payload);
      },
    };
  }

  function emitLobby(room) {
    io.to(room.code).emit('room:update', room.lobbyState());
  }

  io.on('connection', (socket) => {
    const user = socket.user;

    socket.on('room:create', ({ targetScore } = {}, ack) => {
      try {
        const room = roomManager.createRoom(user, socket.id, targetScore);
        socket.join(room.code);
        ack?.({ ok: true, room: room.lobbyState() });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('room:join', ({ code } = {}, ack) => {
      try {
        const room = roomManager.joinRoom(code, user, socket.id);
        socket.join(room.code);
        emitLobby(room);
        if (room.game && room.status === 'playing') {
          socket.emit('game:state', room.game.publicState());
        }
        ack?.({ ok: true, room: room.lobbyState() });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    socket.on('room:leave', ({ code } = {}) => {
      const room = roomManager.getRoom(code);
      if (!room) return;
      const player = room.players.find((p) => p.id === user.id);
      if (player) player.connected = false;
      socket.leave(room.code);
      emitLobby(room);
      roomManager.removeEmptyRoom(room);
    });

    socket.on('room:start', ({ code, targetScore } = {}, ack) => {
      try {
        const room = roomManager.getRoom(code);
        if (!room) throw new Error('Room not found');
        if (room.hostId !== user.id) throw new Error('Only the host can start the game');
        if (room.players.length < 2) throw new Error('Need at least 2 players');
        if (targetScore) room.targetScore = targetScore;
        room.status = 'playing';
        room.game = new Game({
          players: room.players.map((p) => ({ id: p.id, name: p.name })),
          targetScore: room.targetScore,
          ...makeGameCallbacks(room),
        });
        emitLobby(room);
        room.game.startGame();
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
      }
    });

    function withGame(code, fn, ack) {
      try {
        const room = roomManager.getRoom(code);
        if (!room || !room.game) throw new Error('Game not found');
        fn(room.game);
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err.message });
        socket.emit('error', { message: err.message });
      }
    }

    socket.on('game:peekReady', ({ code } = {}, ack) =>
      withGame(code, (g) => g.peekReadyMark(user.id), ack));

    socket.on('game:drawDeck', ({ code } = {}, ack) =>
      withGame(code, (g) => g.drawDeck(user.id), ack));

    socket.on('game:drawDiscard', ({ code } = {}, ack) =>
      withGame(code, (g) => g.drawDiscard(user.id), ack));

    socket.on('game:callCabo', ({ code } = {}, ack) =>
      withGame(code, (g) => g.callCabo(user.id), ack));

    socket.on('game:swap', ({ code, handIndex } = {}, ack) =>
      withGame(code, (g) => g.swap(user.id, handIndex), ack));

    socket.on('game:discardDrawn', ({ code } = {}, ack) =>
      withGame(code, (g) => g.discardDrawn(user.id), ack));

    socket.on('game:usePower', ({ code, payload } = {}, ack) =>
      withGame(code, (g) => g.usePower(user.id, payload), ack));

    socket.on('game:skipPower', ({ code } = {}, ack) =>
      withGame(code, (g) => g.skipPower(user.id), ack));

    socket.on('game:matchAttempt', ({ code, handIndex } = {}, ack) =>
      withGame(code, (g) => g.matchAttempt(user.id, handIndex), ack));

    socket.on('game:nextRound', ({ code } = {}, ack) =>
      withGame(code, (g) => g.nextRound(user.id), ack));

    socket.on('disconnect', () => {
      const room = roomManager.findRoomBySocket(socket.id);
      if (!room) return;
      const player = room.players.find((p) => p.socketId === socket.id);
      if (player) player.connected = false;
      emitLobby(room);
      roomManager.removeEmptyRoom(room);
    });
  });

  return io;
}
