import { Game } from './game/engine.js';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
const MAX_PLAYERS = 8;

function generateCode() {
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

class Room {
  constructor(code, hostId, targetScore) {
    this.code = code;
    this.hostId = hostId;
    this.targetScore = targetScore;
    this.players = []; // {id, name, connected, socketId}
    this.status = 'lobby'; // 'lobby' | 'playing'
    this.game = null;
  }

  addPlayer(user, socketId) {
    let player = this.players.find((p) => p.id === user.id);
    if (player) {
      player.connected = true;
      player.socketId = socketId;
      return player;
    }
    if (this.status !== 'lobby') throw new Error('Game already in progress');
    if (this.players.length >= MAX_PLAYERS) throw new Error('Room is full');
    player = { id: user.id, name: user.username, connected: true, socketId };
    this.players.push(player);
    return player;
  }

  lobbyState() {
    return {
      code: this.code,
      hostId: this.hostId,
      status: this.status,
      targetScore: this.targetScore,
      players: this.players.map((p) => ({ id: p.id, name: p.name, connected: p.connected })),
    };
  }
}

export class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  createRoom(user, socketId, targetScore = 100) {
    let code;
    do {
      code = generateCode();
    } while (this.rooms.has(code));
    const room = new Room(code, user.id, targetScore);
    room.addPlayer(user, socketId);
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code) {
    return this.rooms.get((code || '').toUpperCase());
  }

  joinRoom(code, user, socketId) {
    const room = this.getRoom(code);
    if (!room) throw new Error('Room not found');
    room.addPlayer(user, socketId);
    return room;
  }

  findRoomBySocket(socketId) {
    for (const room of this.rooms.values()) {
      if (room.players.some((p) => p.socketId === socketId)) return room;
    }
    return null;
  }

  removeEmptyRoom(room) {
    const anyConnected = room.players.some((p) => p.connected);
    if (!anyConnected) this.rooms.delete(room.code);
  }
}
