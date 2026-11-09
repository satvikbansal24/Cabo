import { COUNTRIES, OTHER } from './cards.js';
import { buildDeck, deckMix, originLabel } from './deck.js';
import { balanceTeams, bestTeamFor } from './teams.js';

// TURN_SECONDS can be overridden by env var for quick testing; the game is designed for 60.
export const TURN_SECONDS = Number(globalThis.process?.env?.TURN_SECONDS) || 60;
export const MIN_TEAMS = 2;
export const MAX_TEAMS = 4;
export const MAX_ROUNDS = 10;
export const MIN_PLAYERS_PER_TEAM = 2;
const TEAM_NAMES = ['Red', 'Blue', 'Green', 'Gold'];

export class GameError extends Error {}

const fail = (msg) => {
  throw new GameError(msg);
};

// Turn score: +1 per guessed card. The first skip in a turn is free; each
// skip after that costs 1. Breaking a rule (saying part of the word, a
// translation or a synonym) is marked as a skip.
export function turnPoints(cards) {
  const guessed = cards.filter((c) => c.result === 'guessed').length;
  const skipped = cards.filter((c) => c.result === 'skipped').length;
  return guessed - Math.max(0, skipped - 1);
}

// In review the checker can fix mistakes. "missed" is the card still showing
// when time ran out: it scores nothing unless it's changed to guessed.
const NEXT_RESULT = { guessed: 'skipped', skipped: 'missed', missed: 'guessed' };

export function normalizeCountry(code) {
  return COUNTRIES[code] ? code : OTHER;
}

export class Room {
  // The host is the dashboard screen (e.g. a TV), not a player. It runs the
  // room but never sees card text. Whoever is hosting plays on their phone.
  constructor(code, hostId, { now = () => Date.now(), rng = Math.random } = {}) {
    this.code = code;
    this.now = now;
    this.rng = rng;
    this.players = new Map(); // id -> { id, name, country, connected }
    this.hostId = hostId;
    this.hostConnected = true;
    this.settings = { numTeams: 2, numRounds: 3 };
    this.teams = this.makeTeams(2);
    this.phase = 'lobby'; // lobby | ready | active | review | over
    this.usedCards = new Set(); // never repeat a card within a room
    this.resetGameState();
  }

  makeTeams(n) {
    return Array.from({ length: n }, (_, i) => ({
      id: `t${i}`,
      name: TEAM_NAMES[i],
      memberIds: [],
      score: 0,
      giverCursor: 0,
      checkerCursor: 0,
    }));
  }

  resetGameState() {
    this.deck = [];
    this.turnIndex = 0;
    this.turn = null;
    this.history = [];
    for (const t of this.teams) {
      t.score = 0;
      t.giverCursor = 0;
      t.checkerCursor = 0;
    }
  }

  // ---------- players ----------

  get totalTurns() {
    return this.settings.numTeams * this.settings.numRounds;
  }

  teamOf(playerId) {
    return this.teams.find((t) => t.memberIds.includes(playerId));
  }

  addPlayer({ id, name, country }) {
    name = String(name || '').trim().slice(0, 24);
    if (!name) fail('Please enter a name.');
    country = normalizeCountry(country);
    const existing = this.players.get(id);
    if (id === this.hostId) fail('This screen is the host dashboard. Join from your phone to play.');
    if (existing) {
      existing.connected = true;
      existing.name = name;
      // Changing country mid-game would change nothing useful (the deck is
      // already built), so it's only allowed in the lobby.
      if (this.phase === 'lobby') existing.country = country;
      return existing;
    }
    if (this.players.size >= 24) fail('This room is full.');
    if ([...this.players.values()].some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      fail('Someone in this room already has that name.');
    }
    const player = { id, name, country, connected: true };
    this.players.set(id, player);
    const members = this.teams.map((t) => t.memberIds.map((mid) => this.players.get(mid)));
    this.teams[bestTeamFor(country, members)].memberIds.push(id);
    return player;
  }

  setConnected(id, connected) {
    if (id === this.hostId) this.hostConnected = connected;
    const p = this.players.get(id);
    if (p) p.connected = connected;
  }

  // Leaving from the lobby removes the player. Mid-game they stay on their
  // team (so turn order and scores make sense) but are marked as gone.
  removePlayer(id) {
    if (!this.players.has(id)) return;
    if (this.phase === 'lobby' || this.phase === 'over') {
      this.players.delete(id);
      for (const t of this.teams) t.memberIds = t.memberIds.filter((m) => m !== id);
    } else {
      this.players.get(id).connected = false;
    }
  }

  kick(by, playerId) {
    this.requireHost(by);
    this.requirePhase('lobby', 'over');
    this.removePlayer(playerId);
  }

  isEmpty() {
    return !this.hostConnected && ![...this.players.values()].some((p) => p.connected);
  }

  requireHost(by) {
    if (by !== this.hostId) fail('Only the host can do that.');
  }

  requirePhase(...phases) {
    if (!phases.includes(this.phase)) fail('That can’t be done right now.');
  }

  // ---------- lobby ----------

  updateSettings(by, { numTeams, numRounds }) {
    this.requireHost(by);
    this.requirePhase('lobby', 'over');
    if (numRounds !== undefined) {
      const r = Number(numRounds);
      if (!Number.isInteger(r) || r < 1 || r > MAX_ROUNDS) fail(`Rounds must be 1–${MAX_ROUNDS}.`);
      this.settings.numRounds = r;
    }
    if (numTeams !== undefined && Number(numTeams) !== this.settings.numTeams) {
      const n = Number(numTeams);
      if (!Number.isInteger(n) || n < MIN_TEAMS || n > MAX_TEAMS) fail(`Teams must be ${MIN_TEAMS}–${MAX_TEAMS}.`);
      this.settings.numTeams = n;
      this.teams = this.makeTeams(n);
      this.autoBalance(by);
    }
  }

  autoBalance(by) {
    this.requireHost(by);
    this.requirePhase('lobby', 'over');
    const groups = balanceTeams([...this.players.values()], this.settings.numTeams, this.rng);
    this.teams.forEach((t, i) => {
      t.memberIds = groups[i];
    });
  }

  movePlayer(by, playerId, teamId) {
    this.requireHost(by);
    this.requirePhase('lobby', 'over');
    const target = this.teams.find((t) => t.id === teamId);
    if (!target || !this.players.has(playerId)) fail('Unknown player or team.');
    for (const t of this.teams) t.memberIds = t.memberIds.filter((m) => m !== playerId);
    target.memberIds.push(playerId);
  }

  renameTeam(by, teamId, name) {
    this.requireHost(by);
    const team = this.teams.find((t) => t.id === teamId);
    name = String(name || '').trim().slice(0, 20);
    if (!team || !name) fail('Invalid team name.');
    team.name = name;
  }

  startGame(by) {
    this.requireHost(by);
    this.requirePhase('lobby', 'over');
    for (const t of this.teams) {
      if (t.memberIds.length < MIN_PLAYERS_PER_TEAM) {
        fail(`Every team needs at least ${MIN_PLAYERS_PER_TEAM} players (one gives clues, the rest guess).`);
      }
    }
    this.resetGameState();
    const countries = [...this.players.values()].map((p) => p.country);
    this.deck = buildDeck(countries, { exclude: this.usedCards, rng: this.rng });
    if (this.deck.length < 10) fail('This room has used up almost every card. Start a new room for a fresh deck.');
    this.setupTurn();
  }

  // ---------- turns ----------

  // Picks the next player in a team's rotation, preferring connected players.
  pickFrom(team, cursorKey, excludeIds = []) {
    const ids = team.memberIds.filter((id) => !excludeIds.includes(id));
    if (!ids.length) return null;
    for (let k = 0; k < ids.length; k++) {
      const id = ids[(team[cursorKey] + k) % ids.length];
      if (this.players.get(id)?.connected) {
        team[cursorKey] = (team[cursorKey] + k + 1) % ids.length;
        return id;
      }
    }
    const id = ids[team[cursorKey] % ids.length];
    team[cursorKey] = (team[cursorKey] + 1) % ids.length;
    return id;
  }

  setupTurn() {
    const n = this.teams.length;
    const teamIdx = this.turnIndex % n;
    const team = this.teams[teamIdx];
    const prevTeam = this.teams[(teamIdx - 1 + n) % n];
    this.turn = {
      id: `${this.turnIndex}-${Math.floor(this.rng() * 1e9)}`,
      round: Math.floor(this.turnIndex / n) + 1,
      teamId: team.id,
      giverId: this.pickFrom(team, 'giverCursor'),
      checkerId: this.pickFrom(prevTeam, 'checkerCursor'),
      cards: [],
      current: null,
      endsAt: null,
    };
    this.phase = 'ready';
  }

  // Only the checker taps guessed/skip. If their phone drops out, the host
  // hands the job to someone else with reassignChecker.
  requireChecker(by) {
    if (by !== this.turn.checkerId) fail('Only the card checker can do that.');
  }

  // Hands the checker job to someone else (e.g. the assigned checker left).
  // They can't be on the team that's guessing.
  reassignChecker(by, playerId) {
    this.requireHost(by);
    this.requirePhase('ready', 'active', 'review');
    if (!this.players.has(playerId)) fail('Unknown player.');
    if (this.teamOf(playerId)?.id === this.turn.teamId) fail('The checker can’t be on the guessing team.');
    this.turn.checkerId = playerId;
  }

  startTurn(by) {
    this.requirePhase('ready');
    if (by !== this.turn.giverId) fail('Only the clue giver can start the turn.');
    this.turn.current = this.draw();
    if (!this.turn.current) return this.finishGame();
    this.turn.endsAt = this.now() + TURN_SECONDS * 1000;
    this.phase = 'active';
  }

  draw() {
    const card = this.deck.pop() || null;
    if (card) this.usedCards.add(card.text);
    return card;
  }

  mark(by, result) {
    this.requirePhase('active');
    this.requireChecker(by);
    if (result !== 'guessed' && result !== 'skipped') fail('Unknown result.');
    if (this.now() >= this.turn.endsAt) return this.endTurn(this.turn.id);
    this.turn.cards.push({ ...this.turn.current, result });
    this.turn.current = this.draw();
    if (!this.turn.current) this.endTurn(this.turn.id);
  }

  // Called by the server's timer. Safe to call more than once.
  endTurn(turnId) {
    if (this.phase !== 'active' || this.turn?.id !== turnId) return false;
    if (this.turn.current) this.turn.cards.push({ ...this.turn.current, result: 'missed' });
    this.turn.current = null;
    this.phase = 'review';
    return true;
  }

  toggleResult(by, index) {
    this.requirePhase('review');
    this.requireChecker(by);
    const card = this.turn.cards[index];
    if (!card) fail('No such card.');
    card.result = NEXT_RESULT[card.result];
  }

  confirmTurn(by) {
    this.requirePhase('review');
    this.requireChecker(by);
    const points = turnPoints(this.turn.cards);
    const team = this.teams.find((t) => t.id === this.turn.teamId);
    team.score += points;
    this.history.push({
      round: this.turn.round,
      teamId: this.turn.teamId,
      giverId: this.turn.giverId,
      cards: this.turn.cards.map(({ text, result }) => ({ text, result })),
      points,
    });
    this.advance();
  }

  // Host skips a turn entirely (e.g. the clue giver isn't around).
  skipTurn(by) {
    this.requireHost(by);
    this.requirePhase('ready');
    this.advance();
  }

  advance() {
    this.turnIndex++;
    if (this.turnIndex >= this.totalTurns || this.deck.length === 0) return this.finishGame();
    this.setupTurn();
  }

  finishGame() {
    this.turn = null;
    this.phase = 'over';
  }

  endGame(by) {
    this.requireHost(by);
    this.requirePhase('ready', 'active', 'review');
    this.finishGame();
  }

  backToLobby(by) {
    this.requireHost(by);
    this.requirePhase('over');
    this.resetGameState();
    this.phase = 'lobby';
  }

  // ---------- views ----------

  // What one player is allowed to see. The card text only goes to the clue
  // giver and the checker while a turn is live.
  viewFor(viewerId) {
    const players = [...this.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      country: p.country,
      connected: p.connected,
    }));
    const countries = [...this.players.values()].map((p) => p.country);
    const view = {
      code: this.code,
      you: viewerId,
      isHost: viewerId === this.hostId,
      hostConnected: this.hostConnected,
      phase: this.phase,
      settings: { ...this.settings, turnSeconds: TURN_SECONDS },
      players,
      teams: this.teams.map(({ id, name, memberIds, score }) => ({ id, name, memberIds, score })),
      mix: deckMix(countries).map((m) => ({ ...m, label: originLabel(m.source) })),
      totalTurns: this.totalTurns,
      turnNumber: this.turnIndex + 1,
      cardsLeft: this.deck.length,
      history: this.history,
      serverNow: this.now(),
      turn: null,
    };
    if (this.turn) {
      const t = this.turn;
      const isChecker = viewerId === t.checkerId;
      const seesCard = viewerId === t.giverId || isChecker;
      const reviewing = this.phase === 'review';
      view.turn = {
        id: t.id,
        round: t.round,
        teamId: t.teamId,
        giverId: t.giverId,
        checkerId: t.checkerId,
        youCheck: isChecker,
        endsAt: t.endsAt,
        guessed: t.cards.filter((c) => c.result === 'guessed').length,
        skipped: t.cards.filter((c) => c.result === 'skipped').length,
        points: turnPoints(t.cards),
        current: seesCard && t.current ? { text: t.current.text, origin: originLabel(t.current.origin) } : null,
        // Finished cards are public once the turn is over. During the turn
        // only the giver and checker can see the running list.
        cards: seesCard || reviewing ? t.cards.map(({ text, result }) => ({ text, result })) : [],
      };
    }
    return view;
  }
}
