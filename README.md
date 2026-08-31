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

### Tests

`npm run engine-test -w server` runs a deterministic unit test of the rules engine (matching, powers, Cabo-lock, scoring) with no server needed.

With the server running, `npm run smoke-test -w server` drives two simulated players through registering, creating/joining a room, playing a full round, calling Cabo, and scoring, over real sockets.

## Deploying (so you can open it on your phone)

This runs as one Node process (API + Socket.IO + the built client all on one port), which fits comfortably on a free host. [Render](https://render.com) is the easiest option:

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. On Render: **New +** → **Blueprint**, point it at this repo. It will pick up `render.yaml` at the root and configure the build (`npm install && npm run build`) and start (`npm start`) commands, plus generate a random `JWT_SECRET` for you automatically.
3. Deploy. Render gives you a public HTTPS URL (`https://<your-app>.onrender.com`) — open that on your phone.

No `CORS_ORIGIN` env var is needed for this setup since the client is served from the same origin as the API.

**Caveat**: accounts are stored in a JSON file on disk (`server/data/users.json`). Render's free tier has an ephemeral filesystem, so a redeploy or restart wipes registered accounts (in-progress games are already in-memory-only and don't survive restarts either). Fine for casual play; if you want accounts to persist long-term, add a Render persistent disk mounted at `server/data`, or swap in a real database — ask and I can wire that up.

Any other Node-friendly host (Railway, Fly.io, a VPS) works the same way: `npm install && npm run build` to build, `npm start` to run, with `PORT` and `JWT_SECRET` as env vars.

## Rules as implemented

The ruleset below follows a house "Cabo 101" rules sheet exactly (deck, powers, matching, and scoring). It's also available in the app itself — the **Rules** link on the dashboard and inside any room.

- 52-card deck plus both Jokers. Each player gets 4 face-down cards in a 2×2 grid; at the start of a round you privately see your bottom two cards, shown face-up right in your own grid, then flip back down once everyone clicks ready.
- Card values: Joker=-1, King=0 (any suit), Ace=1, 2–10 face value, J=11, Q=12. Lower total is better.
- On your turn: draw from the deck or the discard pile (discard only if the last played card wasn't matched), then either play the drawn card face-up (only if it came from the deck) or keep it and slot it into one of your own positions, sending the displaced card to the discard pile blind.
- **Powers** (only triggered by drawing from the deck and choosing to play that card, never by keeping it):
  - **7 or 8** — peek at one of your own cards.
  - **9 or 10** — peek at one opponent's card.
  - **Jack** — blind swap: swap any two cards on the table, unseen.
  - **Queen** — look & swap: peek at one of your own cards and one of an opponent's, then you *must* swap any one of your cards with any one of theirs.
- **Matching**: the instant any card is played, everyone (including whoever just played it) can race to match it — first to attempt wins the window, whether against their own card or by taking an opponent's card and blindly giving one of their own in exchange. Guess wrong either way and you draw an unseen penalty card. If someone empties their hand this way before Cabo is called, the round ends immediately.
- **Calling Cabo**: at the end of your turn, call Cabo if you think you have the lowest total. Everyone else gets exactly one final turn, then all hands are revealed. Your cards lock immediately — no one (including you) can match, peek, or swap them anymore. A tie for lowest still counts as a loss for the caller.
- **Scoring** (accumulates across rounds to the room's target score): if the caller wins outright, they score -30 and everyone else scores their hand total; if the caller loses, they score +30, the lowest hand(s) split -30, and everyone else scores their hand total. A round ended by an empty hand (no Cabo call) splits -30 among the lowest hand(s) the same way. Lowest cumulative total when someone crosses the target wins the game.

## How the app maps to those rules

- **Login**: username + password, hashed with bcrypt, JWT-based sessions.
- **Rooms**: any logged-in player can create a room and gets a 5-character code to share; anyone with the code can join the lobby. The host starts the game once at least 2 players are in.
- **Hidden information**: the server is authoritative and only privately reveals a card's value to a socket when the rules say that player would see it (initial peek, a power peek, or your own freshly-drawn card). Outside the initial peek, reveals show as a dismissible toast — the app deliberately does *not* keep your peeked cards visible, since remembering them is the point of the game.
- **Matching's first-to-react race**: match attempts are resolved in the exact order the server receives them — whoever's click arrives first wins the window, mirroring the physical "whoever grabs it first" rule (down to ordinary network latency being the tiebreaker on a true simultaneous tap, same as any real-time multiplayer app).
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
