# Cabo

A web app for playing the card game [Cabo](https://treyhunner.com/2015/06/cabo-card-game/) with friends remotely — no physical deck or table required. Log in, create a room, share the code, and play.

## Stack

- **Server**: Node.js, Express, Socket.IO. Users are stored in a small JSON file (`server/data/users.json`); rooms and live game state live in memory (a restart clears in-progress games, but accounts persist).
- **Client**: React + Vite SPA, Socket.IO client.
- No database server or native dependencies required — `npm install` and go.

## Running locally

```bash
npm install                 # installs both workspaces
cp server/.env.example server/.env   # set a real JWT_SECRET for anything beyond local testing
npm run dev                 # runs server (:3001) and client (:5173) together
```

Open `http://localhost:5173`, register an account, and create or join a room.

For a single-process production-style run:

```bash
npm run build                # builds the client into client/dist
npm start                    # server serves the API, sockets, and the built client on one port
```

### Smoke test

With the server running, `npm run smoke-test -w server` drives two simulated players through registering, creating/joining a room, playing a full round, calling Cabo, and scoring, over real sockets.

## Rules as implemented

The original source article wasn't reachable from this environment (network egress restrictions), so the ruleset below was reconstructed from multiple secondary sources describing the same game and implemented as the app's authoritative rules. If it drifts from the house rules you're used to, treat this section as the spec to tweak.

- Standard 52-card deck, no jokers. Each player gets 4 face-down cards; at the start of a round you privately see your two cards closest to you (positions 3 and 4) and must remember them.
- Card values: A=1, 2–10 face value, J=11, Q=12, red K=-1, black K=13. Lower total is better.
- Card powers (only usable if you drew the card from the draw pile and chose to discard it immediately, rather than swapping it into your hand):
  - **7 or 8** — peek at one of your own cards.
  - **9 or 10** — peek at one opponent's card.
  - **J or Q** — blindly swap any two cards on the table (yours, an opponent's, or one of each) without looking at either.
- On your turn: draw from the deck (then swap it into your hand or discard it to use its power) or take the top discard card (must be swapped straight into your hand, no power). Swapping always sends your old card face-up to the discard pile.
- **Matching**: any time nobody is mid-turn, any player may try to discard one of their own cards that they believe matches the rank on top of the discard pile. Correct — the card is gone, leaving an empty slot (worth 0). Wrong — the card returns face-down and you draw a penalty card.
- **Calling Cabo**: on your turn, instead of drawing, you can call Cabo. Everyone else gets exactly one more turn, then all hands are revealed. If the caller doesn't have the strictly lowest hand total, they take a 5-point penalty.
- Round scores accumulate across rounds until a player reaches the room's target score (default 100); the player with the lowest total then wins the game.

Simplifications from some house rules: the match-discard action only targets your own cards (not "dumping" a card onto an opponent by matching one of theirs), and Kings don't carry a look-and-swap power beyond their point value.

## How the app maps to those rules

- **Login**: username + password, hashed with bcrypt, JWT-based sessions.
- **Rooms**: any logged-in player can create a room and gets a 5-character code to share; anyone with the code can join the lobby. The host starts the game once at least 2 players are in.
- **Hidden information**: the server is authoritative and only privately reveals a card's value to a socket when the rules say that player would see it (initial peek, a power peek, or your own freshly-drawn card). The UI shows these as a dismissible toast — the app deliberately does *not* keep your peeked cards visible, since remembering them is the point of the game.
- **Reconnects**: if you drop connection mid-game, rejoining the same room with the same account reattaches you to your seat.

## Project layout

```
server/   Express + Socket.IO API and game engine
  src/game/   deck definitions and the Game state machine
  src/rooms.js, socket.js   room + socket orchestration
client/   React + Vite frontend
  src/pages/    Login, Register, Dashboard, RoomPage
  src/components/  Card, PlayerHand, GameBoard, and round/game-end panels
```
